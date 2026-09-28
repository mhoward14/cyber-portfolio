/* ============================================================
   DISSECT.TS — PACKET ANALYSIS LAB
   A small protocol dissector: raw frames in, packets out, with the
   packet-list columns, the protocol tree (with byte ranges for the
   hex pane), and the display-filter fields. It decodes:

     link       Ethernet II (+ 802.1Q VLAN), raw IP, Linux cooked
                capture v1/v2, BSD loopback
     network    IPv4, IPv6 (extension headers skipped), ARP
     transport  TCP (relative sequence numbers, stream index), UDP,
                ICMP, ICMPv6
     app        DNS, TLS (record/handshake, SNI), HTTP/1.x, FTP

   The lab's own hunts are built as raw bytes and dissected here too,
   so a visitor's capture and the hunts are decoded identically. No
   TCP reassembly: each segment is dissected on its own, which is
   what Wireshark shows with reassembly turned off.
   ============================================================ */

import { FieldValue, Layer, LayerField, Packet, RawFrame } from './packet-types';

export const LINKTYPE = {
  NULL: 0,
  ETHERNET: 1,
  RAW: 101,
  LOOP: 108,
  LINUX_SLL: 113,
  IPV4: 228,
  IPV6: 229,
  LINUX_SLL2: 276,
} as const;

export const SUPPORTED_LINKTYPES: ReadonlySet<number> = new Set(Object.values(LINKTYPE));

class Malformed extends Error {}

const hex = (n: number, width: number) => `0x${n.toString(16).padStart(width, '0')}`;

function need(d: Uint8Array, end: number) {
  if (end > d.length) throw new Malformed();
}
function be16(d: Uint8Array, o: number) {
  need(d, o + 2);
  return (d[o] << 8) | d[o + 1];
}
function be32(d: Uint8Array, o: number) {
  need(d, o + 4);
  return ((d[o] << 24) | (d[o + 1] << 16) | (d[o + 2] << 8) | d[o + 3]) >>> 0;
}
function mac(d: Uint8Array, o: number) {
  need(d, o + 6);
  return Array.from(d.subarray(o, o + 6), (b) => b.toString(16).padStart(2, '0')).join(':');
}
function ipv4(d: Uint8Array, o: number) {
  need(d, o + 4);
  return `${d[o]}.${d[o + 1]}.${d[o + 2]}.${d[o + 3]}`;
}
function ascii(d: Uint8Array, start: number, end: number) {
  let s = '';
  for (let i = start; i < end; i++) s += String.fromCharCode(d[i]);
  return s;
}

/** RFC 5952 text form: lowercase, leading zeros dropped, the longest run
 *  of two or more zero groups collapsed to "::". */
export function formatIpv6(b: ArrayLike<number>): string {
  const groups: number[] = [];
  for (let i = 0; i < 16; i += 2) groups.push((b[i] << 8) | b[i + 1]);
  let bestStart = -1;
  let bestLen = 0;
  for (let i = 0; i < 8; ) {
    if (groups[i] !== 0) {
      i++;
      continue;
    }
    let j = i;
    while (j < 8 && groups[j] === 0) j++;
    if (j - i > bestLen && j - i >= 2) {
      bestStart = i;
      bestLen = j - i;
    }
    i = j;
  }
  const text = groups.map((g) => g.toString(16));
  if (bestStart < 0) return text.join(':');
  return `${text.slice(0, bestStart).join(':')}::${text.slice(bestStart + bestLen).join(':')}`;
}

function ipv6(d: Uint8Array, o: number) {
  need(d, o + 16);
  return formatIpv6(d.subarray(o, o + 16));
}

function ipChecksumOk(d: Uint8Array, o: number, len: number) {
  let sum = 0;
  for (let i = o; i < o + len; i += 2) sum += (d[i] << 8) + d[i + 1];
  while (sum > 0xffff) sum = (sum & 0xffff) + (sum >> 16);
  return sum === 0xffff;
}

const IP_PROTOCOLS: Record<number, string> = { 2: 'IGMP', 47: 'GRE', 50: 'ESP', 51: 'AH', 89: 'OSPF', 103: 'PIM', 112: 'VRRP', 132: 'SCTP' };
const DNS_TYPES: Record<number, string> = { 1: 'A', 2: 'NS', 5: 'CNAME', 6: 'SOA', 12: 'PTR', 15: 'MX', 16: 'TXT', 28: 'AAAA', 33: 'SRV', 65: 'HTTPS', 255: 'ANY' };
const DNS_RCODES: Record<number, string> = { 1: 'Format error', 2: 'Server failure', 3: 'No such name', 4: 'Not implemented', 5: 'Refused' };
const TLS_HANDSHAKES: Record<number, string> = {
  0: 'Hello Request',
  1: 'Client Hello',
  2: 'Server Hello',
  4: 'New Session Ticket',
  8: 'Encrypted Extensions',
  11: 'Certificate',
  12: 'Server Key Exchange',
  13: 'Certificate Request',
  14: 'Server Hello Done',
  15: 'Certificate Verify',
  16: 'Client Key Exchange',
  20: 'Finished',
};
const TLS_CONTENT: Record<number, string> = { 20: 'Change Cipher Spec', 21: 'Alert', 22: 'Handshake', 23: 'Application Data' };
const TLS_ALERTS: Record<number, string> = {
  0: 'Close Notify',
  10: 'Unexpected Message',
  20: 'Bad Record MAC',
  40: 'Handshake Failure',
  42: 'Bad Certificate',
  46: 'Certificate Unknown',
  48: 'Unknown CA',
  70: 'Protocol Version',
  80: 'Internal Error',
  112: 'Unrecognized Name',
};
const TLS_VERSIONS: Record<number, string> = { 0x0300: 'SSLv3', 0x0301: 'TLSv1', 0x0302: 'TLSv1.1', 0x0303: 'TLSv1.2', 0x0304: 'TLSv1.3' };
const ICMP_TYPES: Record<number, string> = {
  0: 'Echo (ping) reply',
  3: 'Destination unreachable',
  5: 'Redirect',
  8: 'Echo (ping) request',
  11: 'Time-to-live exceeded',
};
const ICMP_UNREACHABLE: Record<number, string> = {
  0: 'Network unreachable',
  1: 'Host unreachable',
  2: 'Protocol unreachable',
  3: 'Port unreachable',
  4: 'Fragmentation needed',
  9: 'Network administratively prohibited',
  10: 'Host administratively prohibited',
  13: 'Communication administratively filtered',
};
const ICMPV6_TYPES: Record<number, string> = {
  1: 'Destination Unreachable',
  3: 'Time Exceeded',
  128: 'Echo (ping) request',
  129: 'Echo (ping) reply',
  133: 'Router Solicitation',
  134: 'Router Advertisement',
  135: 'Neighbor Solicitation',
  136: 'Neighbor Advertisement',
};
/** Wireshark's order for flag names in the Info column. */
const TCP_FLAGS: [string, number][] = [
  ['FIN', 0x001],
  ['SYN', 0x002],
  ['RST', 0x004],
  ['PSH', 0x008],
  ['ACK', 0x010],
  ['URG', 0x020],
  ['ECE', 0x040],
  ['CWR', 0x080],
];
const HTTP_START = /^(GET|POST|PUT|DELETE|HEAD|OPTIONS|PATCH|CONNECT|TRACE) \S/;

/** Accumulates one packet's columns, tree, and fields. */
class Dissection {
  readonly fields = new Map<string, FieldValue[]>();
  readonly layers: Layer[] = [];
  readonly keys: string[] = [];
  info = '';
  protocol = '';
  src = '';
  dst = '';

  add(key: string, value: FieldValue) {
    const values = this.fields.get(key);
    if (values) values.push(value);
    else this.fields.set(key, [value]);
  }

  proto(key: string, label: string) {
    if (!this.fields.has(key)) this.fields.set(key, [1]);
    this.keys.push(key);
    this.protocol = label;
  }

  layer(name: string, range: [number, number], fields: LayerField[]) {
    this.layers.push({ name, range, fields });
  }
}

interface TcpStream {
  index: number;
  /** Initial sequence number per direction ("ip:port"). */
  isn: Map<string, number>;
  /** Window-scale shift per direction from its SYN; -1 when the SYN had none. */
  windowShift: Map<string, number>;
  tls13: boolean;
}

export class Dissector {
  private readonly tcpStreams = new Map<string, TcpStream>();
  private readonly udpStreams = new Map<string, number>();
  private start: number | null = null;

  dissect(frames: RawFrame[]): Packet[] {
    return frames.map((f, i) => this.frame(f, i + 1));
  }

  private frame(f: RawFrame, no: number): Packet {
    const d = f.data;
    const x = new Dissection();
    if (this.start === null) this.start = f.time;
    const time = Math.max(0, f.time - this.start);
    const wire = Math.max(f.origLen ?? d.length, d.length);

    x.add('frame.number', no);
    x.add('frame.len', wire);
    x.add('frame.cap_len', d.length);
    x.add('frame.time_relative', Number(time.toFixed(6)));
    x.fields.set('frame', [1]);

    try {
      this.link(f.linkType, d, x);
    } catch (e) {
      if (!(e instanceof Malformed)) throw e;
      x.proto('_ws.malformed', x.protocol || 'Malformed');
      x.info = `${x.info ? x.info + ' ' : ''}[Malformed Packet]`;
    }
    if (!x.protocol) x.protocol = 'Frame';
    if (!x.info) x.info = x.protocol;
    if (wire > d.length) x.info += ` [Packet size limited during capture]`;

    const protocols = x.keys.filter((k) => !k.startsWith('_')).join(':');
    x.add('frame.protocols', protocols);
    x.layers.unshift({
      name: `Frame ${no}: ${wire} bytes on wire (${wire * 8} bits), ${d.length} bytes captured (${d.length * 8} bits)`,
      range: [0, d.length],
      fields: [
        { label: `Time since first frame: ${time.toFixed(6)} seconds` },
        { label: `Frame Length: ${wire} bytes` },
        { label: `Capture Length: ${d.length} bytes` },
        { label: `Protocols in frame: ${protocols}` },
      ],
    });

    return {
      no,
      time,
      src: x.src,
      dst: x.dst,
      protocol: x.protocol,
      length: wire,
      info: x.info,
      bytes: d,
      layers: x.layers,
      fields: x.fields,
    };
  }

  // ---------- link layer ----------

  private link(linkType: number, d: Uint8Array, x: Dissection) {
    switch (linkType) {
      case LINKTYPE.ETHERNET:
        return this.ethernet(d, x);
      case LINKTYPE.RAW:
      case LINKTYPE.IPV4:
      case LINKTYPE.IPV6: {
        need(d, 1);
        const version = d[0] >> 4;
        if (version === 4) return this.ipv4(d, 0, x);
        if (version === 6) return this.ipv6(d, 0, x);
        throw new Malformed();
      }
      case LINKTYPE.NULL:
      case LINKTYPE.LOOP: {
        need(d, 4);
        // NULL stores the address family in host byte order; accept either.
        const beFamily = be32(d, 0);
        const leFamily = ((d[3] << 24) | (d[2] << 16) | (d[1] << 8) | d[0]) >>> 0;
        const family = [2, 24, 28, 30].includes(beFamily) ? beFamily : leFamily;
        x.proto('null', 'Null/Loopback');
        x.layer(`Null/Loopback, Family: ${family === 2 ? 'IP' : family}`, [0, 4], [{ label: `Family: ${family}`, range: [0, 4] }]);
        if (family === 2) return this.ipv4(d, 4, x);
        if ([24, 28, 30].includes(family)) return this.ipv6(d, 4, x);
        x.info = `Null/Loopback family ${family}`;
        return;
      }
      case LINKTYPE.LINUX_SLL: {
        const proto = be16(d, 14);
        x.proto('sll', 'SLL');
        x.layer('Linux cooked capture v1', [0, 16], [{ label: `Protocol: ${hex(proto, 4)}`, range: [14, 16] }]);
        return this.ethertype(d, 16, proto, x);
      }
      case LINKTYPE.LINUX_SLL2: {
        const proto = be16(d, 0);
        need(d, 20);
        x.proto('sll', 'SLL');
        x.layer('Linux cooked capture v2', [0, 20], [{ label: `Protocol: ${hex(proto, 4)}`, range: [0, 2] }]);
        return this.ethertype(d, 20, proto, x);
      }
      default:
        x.info = `Link-layer type ${linkType} is not decoded by this lab`;
    }
  }

  private ethernet(d: Uint8Array, x: Dissection) {
    const dst = mac(d, 0);
    const src = mac(d, 6);
    let type = be16(d, 12);
    x.proto('eth', 'Ethernet');
    x.add('eth.dst', dst);
    x.add('eth.src', src);
    x.add('eth.addr', src);
    x.add('eth.addr', dst);
    x.src = src;
    x.dst = dst === 'ff:ff:ff:ff:ff:ff' ? 'Broadcast' : dst;
    const fields: LayerField[] = [
      { label: `Destination: ${dst}`, range: [0, 6] },
      { label: `Source: ${src}`, range: [6, 12] },
    ];
    x.layer(`Ethernet II, Src: ${src}, Dst: ${dst}`, [0, 14], fields);
    let o = 14;
    while (type === 0x8100 || type === 0x88a8) {
      const vid = be16(d, o) & 0x0fff;
      const inner = be16(d, o + 2);
      x.proto('vlan', '802.1Q');
      x.add('vlan.id', vid);
      x.layer(`802.1Q Virtual LAN, ID: ${vid}`, [o, o + 4], [
        { label: `ID: ${vid}`, range: [o, o + 2] },
        { label: `Type: ${hex(inner, 4)}`, range: [o + 2, o + 4] },
      ]);
      type = inner;
      o += 4;
    }
    x.add('eth.type', type);
    fields.push({ label: `Type: ${ETHERTYPE_NAMES[type] ?? 'Unknown'} (${hex(type, 4)})`, range: [o - 2, o] });
    this.ethertype(d, o, type, x);
  }

  private ethertype(d: Uint8Array, o: number, type: number, x: Dissection) {
    if (type === 0x0800) return this.ipv4(d, o, x);
    if (type === 0x86dd) return this.ipv6(d, o, x);
    if (type === 0x0806) return this.arp(d, o, x);
    x.protocol = ETHERTYPE_NAMES[type] ?? hex(type, 4);
    x.info = `Ethernet II, type ${hex(type, 4)}`;
  }

  // ---------- network layer ----------

  private arp(d: Uint8Array, o: number, x: Dissection) {
    const op = be16(d, o + 6);
    const sha = mac(d, o + 8);
    const spa = ipv4(d, o + 14);
    const tha = mac(d, o + 18);
    const tpa = ipv4(d, o + 24);
    x.proto('arp', 'ARP');
    x.add('arp.opcode', op);
    x.add('arp.src.hw_mac', sha);
    x.add('arp.src.proto_ipv4', spa);
    x.add('arp.dst.hw_mac', tha);
    x.add('arp.dst.proto_ipv4', tpa);
    const opName = op === 1 ? 'request' : op === 2 ? 'reply' : `opcode ${op}`;
    x.info =
      op === 1 ? (spa === tpa ? `Gratuitous ARP for ${spa} (Request)` : `Who has ${tpa}? Tell ${spa}`) : op === 2 ? `${spa} is at ${sha}` : `ARP ${opName}`;
    x.layer(`Address Resolution Protocol (${opName})`, [o, o + 28], [
      { label: `Opcode: ${opName} (${op})`, range: [o + 6, o + 8] },
      { label: `Sender MAC address: ${sha}`, range: [o + 8, o + 14] },
      { label: `Sender IP address: ${spa}`, range: [o + 14, o + 18] },
      { label: `Target MAC address: ${tha}`, range: [o + 18, o + 24] },
      { label: `Target IP address: ${tpa}`, range: [o + 24, o + 28] },
    ]);
  }

  private ipv4(d: Uint8Array, o: number, x: Dissection) {
    need(d, o + 20);
    const ihl = (d[o] & 0x0f) * 4;
    if (d[o] >> 4 !== 4 || ihl < 20) throw new Malformed();
    need(d, o + ihl);
    const total = be16(d, o + 2);
    const id = be16(d, o + 4);
    const ff = be16(d, o + 6);
    const fragOffset = (ff & 0x1fff) * 8;
    const ttl = d[o + 8];
    const p = d[o + 9];
    const csum = be16(d, o + 10);
    const src = ipv4(d, o + 12);
    const dst = ipv4(d, o + 16);
    const end = total >= ihl ? Math.min(o + total, d.length) : d.length;

    x.proto('ip', 'IPv4');
    x.src = src;
    x.dst = dst;
    x.add('ip.src', src);
    x.add('ip.dst', dst);
    x.add('ip.addr', src);
    x.add('ip.addr', dst);
    x.add('ip.ttl', ttl);
    x.add('ip.len', total);
    x.add('ip.id', id);
    x.add('ip.proto', p);
    x.add('ip.flags.df', ff & 0x4000 ? 1 : 0);
    x.add('ip.flags.mf', ff & 0x2000 ? 1 : 0);
    x.add('ip.frag_offset', fragOffset);
    const flagText = ff & 0x4000 ? ", Don't fragment" : ff & 0x2000 ? ', More fragments' : '';
    x.layer(`Internet Protocol Version 4, Src: ${src}, Dst: ${dst}`, [o, o + ihl], [
      { label: `Version: 4, Header Length: ${ihl} bytes`, range: [o, o + 1] },
      { label: `Total Length: ${total}`, range: [o + 2, o + 4] },
      { label: `Identification: ${hex(id, 4)}`, range: [o + 4, o + 6] },
      { label: `Flags: ${hex(ff >> 13, 1)}${flagText}`, range: [o + 6, o + 8] },
      { label: `Time to Live: ${ttl}`, range: [o + 8, o + 9] },
      { label: `Protocol: ${PROTO_LABEL[p] ?? IP_PROTOCOLS[p] ?? p} (${p})`, range: [o + 9, o + 10] },
      { label: `Header Checksum: ${hex(csum, 4)} [${ipChecksumOk(d, o, ihl) ? 'correct' : 'incorrect'}]`, range: [o + 10, o + 12] },
      { label: `Source Address: ${src}`, range: [o + 12, o + 16] },
      { label: `Destination Address: ${dst}`, range: [o + 16, o + 20] },
    ]);
    if (fragOffset > 0) {
      x.info = `Fragmented IP protocol (proto=${PROTO_LABEL[p] ?? p}, off=${fragOffset}, ID=${hex(id, 4)})`;
      return;
    }
    this.transport(d, o + ihl, end, p, src, dst, x);
  }

  private ipv6(d: Uint8Array, o: number, x: Dissection) {
    need(d, o + 40);
    if (d[o] >> 4 !== 6) throw new Malformed();
    const plen = be16(d, o + 4);
    const nxt = d[o + 6];
    const hlim = d[o + 7];
    const src = ipv6(d, o + 8);
    const dst = ipv6(d, o + 24);
    const end = plen ? Math.min(o + 40 + plen, d.length) : d.length;

    x.proto('ipv6', 'IPv6');
    x.src = src;
    x.dst = dst;
    x.add('ipv6.src', src);
    x.add('ipv6.dst', dst);
    x.add('ipv6.addr', src);
    x.add('ipv6.addr', dst);
    x.add('ipv6.plen', plen);
    x.add('ipv6.nxt', nxt);
    x.add('ipv6.hlim', hlim);
    x.layer(`Internet Protocol Version 6, Src: ${src}, Dst: ${dst}`, [o, o + 40], [
      { label: `Payload Length: ${plen}`, range: [o + 4, o + 6] },
      { label: `Next Header: ${PROTO_LABEL[nxt] ?? nxt} (${nxt})`, range: [o + 6, o + 7] },
      { label: `Hop Limit: ${hlim}`, range: [o + 7, o + 8] },
      { label: `Source Address: ${src}`, range: [o + 8, o + 24] },
      { label: `Destination Address: ${dst}`, range: [o + 24, o + 40] },
    ]);

    let p = nxt;
    let q = o + 40;
    while (p === 0 || p === 43 || p === 60 || p === 44) {
      need(d, q + 8);
      const next = d[q];
      if (p === 44) {
        if (be16(d, q + 2) >> 3) {
          x.info = `IPv6 fragment (nxt=${next})`;
          return;
        }
        q += 8;
      } else {
        q += (d[q + 1] + 1) * 8;
      }
      p = next;
    }
    this.transport(d, q, end, p, src, dst, x);
  }

  private transport(d: Uint8Array, o: number, end: number, p: number, src: string, dst: string, x: Dissection) {
    switch (p) {
      case 6:
        return this.tcp(d, o, end, src, dst, x);
      case 17:
        return this.udp(d, o, end, src, dst, x);
      case 1:
        return this.icmp(d, o, end, x, false);
      case 58:
        return this.icmp(d, o, end, x, true);
      default:
        x.protocol = IP_PROTOCOLS[p] ?? `IP proto ${p}`;
        x.info = x.protocol;
    }
  }

  // ---------- transport layer ----------

  private icmp(d: Uint8Array, o: number, end: number, x: Dissection, v6: boolean) {
    need(d, o + 4);
    const type = d[o];
    const code = d[o + 1];
    const key = v6 ? 'icmpv6' : 'icmp';
    x.proto(key, v6 ? 'ICMPv6' : 'ICMP');
    x.add(`${key}.type`, type);
    x.add(`${key}.code`, code);
    const name = (v6 ? ICMPV6_TYPES : ICMP_TYPES)[type] ?? `Type ${type}`;
    const echo = v6 ? type === 128 || type === 129 : type === 0 || type === 8;
    const fields: LayerField[] = [
      { label: `Type: ${type} (${name})`, range: [o, o + 1] },
      { label: `Code: ${code}`, range: [o + 1, o + 2] },
    ];
    x.info = name;
    if (!v6 && type === 3) x.info += ` (${ICMP_UNREACHABLE[code] ?? `code ${code}`})`;
    else if (!v6 && type === 11) x.info += code ? ' (Fragment reassembly time exceeded)' : ' (Time to live exceeded in transit)';
    else if (v6 && type === 1) x.info += ` (${['no route to destination', 'administratively prohibited', 'beyond scope of source address', 'address unreachable', 'port unreachable'][code] ?? `code ${code}`})`;
    if (echo && end >= o + 8) {
      const id = be16(d, o + 4);
      const seq = be16(d, o + 6);
      x.add(`${key}.ident`, id);
      x.add(`${key}.seq`, seq);
      x.info += ` id=${hex(id, 4)}, seq=${seq}`;
      fields.push({ label: `Identifier: ${hex(id, 4)}`, range: [o + 4, o + 6] }, { label: `Sequence Number: ${seq}`, range: [o + 6, o + 8] });
    }
    x.layer(v6 ? 'Internet Control Message Protocol v6' : 'Internet Control Message Protocol', [o, end], fields);
  }

  private tcp(d: Uint8Array, o: number, end: number, src: string, dst: string, x: Dissection) {
    need(d, o + 20);
    const sp = be16(d, o);
    const dp = be16(d, o + 2);
    const seq = be32(d, o + 4);
    const ackRaw = be32(d, o + 8);
    const hdr = (d[o + 12] >> 4) * 4;
    const flags = ((d[o + 12] & 0x01) << 8) | d[o + 13];
    const win = be16(d, o + 14);
    const csum = be16(d, o + 16);
    if (hdr < 20) throw new Malformed();
    need(d, o + hdr);
    const payloadStart = o + hdr;
    const len = Math.max(0, end - payloadStart);

    const self = `${src}|${sp}`;
    const peer = `${dst}|${dp}`;
    const key = [self, peer].sort().join('||');
    let stream = this.tcpStreams.get(key);
    if (!stream) {
      stream = { index: this.tcpStreams.size, isn: new Map(), windowShift: new Map(), tls13: false };
      this.tcpStreams.set(key, stream);
    }
    // A direction first seen mid-stream (no SYN) counts from Seq=1, as in Wireshark.
    if (flags & 0x002) stream.isn.set(self, seq);
    else if (!stream.isn.has(self)) stream.isn.set(self, (seq - 1) >>> 0);
    const hasAck = !!(flags & 0x010);
    if (hasAck && !stream.isn.has(peer)) stream.isn.set(peer, (ackRaw - 1) >>> 0);
    const relSeq = (seq - stream.isn.get(self)!) >>> 0;
    const relAck = hasAck ? (ackRaw - stream.isn.get(peer)!) >>> 0 : 0;
    const names = TCP_FLAGS.filter(([, bit]) => flags & bit).map(([n]) => n);

    x.proto('tcp', 'TCP');
    x.add('tcp.srcport', sp);
    x.add('tcp.dstport', dp);
    x.add('tcp.port', sp);
    x.add('tcp.port', dp);
    x.add('tcp.stream', stream.index);
    x.add('tcp.seq', relSeq);
    x.add('tcp.seq_raw', seq);
    x.add('tcp.ack', relAck);
    x.add('tcp.ack_raw', ackRaw);
    x.add('tcp.len', len);
    x.add('tcp.hdr_len', hdr);
    x.add('tcp.flags', flags);
    x.add('tcp.flags.fin', flags & 0x001 ? 1 : 0);
    x.add('tcp.flags.syn', flags & 0x002 ? 1 : 0);
    x.add('tcp.flags.reset', flags & 0x004 ? 1 : 0);
    x.add('tcp.flags.push', flags & 0x008 ? 1 : 0);
    x.add('tcp.flags.ack', hasAck ? 1 : 0);
    x.add('tcp.flags.urg', flags & 0x020 ? 1 : 0);
    // Options, listed in the Info column in wire order as Wireshark does.
    const options: string[] = [];
    const optionTree: LayerField[] = [];
    let shift = -1;
    for (let p = o + 20; p < o + hdr; ) {
      const kind = d[p];
      if (kind === 0) break;
      if (kind === 1) {
        p++;
        continue;
      }
      const olen = d[p + 1];
      if (olen < 2 || p + olen > o + hdr) break;
      let text = `Kind ${kind}`;
      if (kind === 2 && olen === 4) {
        const mss = be16(d, p + 2);
        x.add('tcp.options.mss_val', mss);
        text = `MSS=${mss}`;
      } else if (kind === 3 && olen === 3) {
        shift = Math.min(d[p + 2], 14);
        text = `WS=${2 ** shift}`;
      } else if (kind === 4) {
        text = 'SACK_PERM';
      } else if (kind === 5) {
        const base = stream.isn.get(peer) ?? 0;
        const blocks: string[] = [];
        for (let b = p + 2; b + 8 <= p + olen; b += 8) blocks.push(`SLE=${(be32(d, b) - base) >>> 0} SRE=${(be32(d, b + 4) - base) >>> 0}`);
        text = blocks.join(' ');
      } else if (kind === 8 && olen === 10) {
        text = `TSval=${be32(d, p + 2)} TSecr=${be32(d, p + 6)}`;
      }
      options.push(text);
      optionTree.push({ label: `Option: ${text}`, range: [p, p + olen] });
      p += olen;
    }
    if (flags & 0x002) stream.windowShift.set(self, shift);
    // Wireshark scales the window only once it has seen both SYNs offer scaling.
    const own = stream.windowShift.get(self);
    const other = stream.windowShift.get(peer);
    const window = !(flags & 0x002) && own !== undefined && other !== undefined && own >= 0 && other >= 0 ? win * 2 ** own : win;
    x.add('tcp.window_size_value', win);
    x.add('tcp.window_size', window);
    x.info = `${sp} → ${dp} [${names.join(', ')}] Seq=${relSeq}${hasAck ? ` Ack=${relAck}` : ''} Win=${window} Len=${len}${options.length ? ' ' + options.join(' ') : ''}`;
    x.layer(
      `Transmission Control Protocol, Src Port: ${sp}, Dst Port: ${dp}, Seq: ${relSeq}${hasAck ? `, Ack: ${relAck}` : ''}, Len: ${len}`,
      [o, payloadStart],
      [
        { label: `Source Port: ${sp}`, range: [o, o + 2] },
        { label: `Destination Port: ${dp}`, range: [o + 2, o + 4] },
        { label: `[Stream index: ${stream.index}]` },
        { label: `Sequence Number: ${relSeq} (relative)`, range: [o + 4, o + 8] },
        { label: `Sequence Number (raw): ${seq}`, range: [o + 4, o + 8] },
        { label: `Acknowledgment Number: ${relAck}${hasAck ? ' (relative)' : ''}`, range: [o + 8, o + 12] },
        { label: `Header Length: ${hdr} bytes`, range: [o + 12, o + 13] },
        { label: `Flags: ${hex(flags, 3)} (${names.join(', ') || 'none'})`, range: [o + 12, o + 14] },
        { label: `Window: ${win}`, range: [o + 14, o + 16] },
        { label: `Checksum: ${hex(csum, 4)} [unverified]`, range: [o + 16, o + 18] },
        ...optionTree,
      ],
    );
    if (len > 0) this.tcpPayload(d, payloadStart, end, sp, dp, stream, x);
  }

  private udp(d: Uint8Array, o: number, end: number, src: string, dst: string, x: Dissection) {
    need(d, o + 8);
    const sp = be16(d, o);
    const dp = be16(d, o + 2);
    const ulen = be16(d, o + 4);
    const csum = be16(d, o + 6);
    const payloadEnd = ulen >= 8 ? Math.min(o + ulen, end) : end;
    const key = [`${src}|${sp}`, `${dst}|${dp}`].sort().join('||');
    if (!this.udpStreams.has(key)) this.udpStreams.set(key, this.udpStreams.size);

    x.proto('udp', 'UDP');
    x.add('udp.srcport', sp);
    x.add('udp.dstport', dp);
    x.add('udp.port', sp);
    x.add('udp.port', dp);
    x.add('udp.length', ulen);
    x.add('udp.stream', this.udpStreams.get(key)!);
    x.info = `${sp} → ${dp} Len=${Math.max(0, payloadEnd - o - 8)}`;
    x.layer(`User Datagram Protocol, Src Port: ${sp}, Dst Port: ${dp}`, [o, o + 8], [
      { label: `Source Port: ${sp}`, range: [o, o + 2] },
      { label: `Destination Port: ${dp}`, range: [o + 2, o + 4] },
      { label: `Length: ${ulen}`, range: [o + 4, o + 6] },
      { label: `Checksum: ${hex(csum, 4)} [unverified]`, range: [o + 6, o + 8] },
    ]);
    if ([53, 5353].includes(sp) || [53, 5353].includes(dp)) this.dns(d, o + 8, payloadEnd, x);
  }

  // ---------- application layer ----------

  private tcpPayload(d: Uint8Array, s: number, end: number, sp: number, dp: number, stream: TcpStream, x: Dissection) {
    if (end - s >= 5 && d[s] >= 20 && d[s] <= 23 && d[s + 1] === 3 && d[s + 2] <= 4) return this.tls(d, s, end, stream, x);
    const start = ascii(d, s, Math.min(end, s + 16));
    if (HTTP_START.test(start) || start.startsWith('HTTP/1.')) return this.http(d, s, end, x);
    if (sp === 21 || dp === 21) return this.ftp(d, s, end, dp === 21, x);
  }

  private dns(d: Uint8Array, s: number, end: number, x: Dissection) {
    if (end - s < 12) return;
    const id = be16(d, s);
    const flags = be16(d, s + 2);
    const qd = be16(d, s + 4);
    const an = be16(d, s + 6);
    const response = flags >> 15;
    const rcode = flags & 0x0f;

    const readName = (pos: number): { name: string; next: number } => {
      const labels: string[] = [];
      let next = -1;
      for (let jumps = 0; jumps < 64; jumps++) {
        need(d, pos + 1);
        const len = d[pos];
        if (len === 0) {
          if (next < 0) next = pos + 1;
          return { name: labels.join('.') || '<Root>', next };
        }
        if ((len & 0xc0) === 0xc0) {
          if (next < 0) next = pos + 2;
          // Compression pointers are offsets from the start of the DNS message.
          pos = s + (be16(d, pos) & 0x3fff);
          continue;
        }
        need(d, pos + 1 + len);
        labels.push(ascii(d, pos + 1, pos + 1 + len));
        pos += 1 + len;
      }
      throw new Malformed();
    };

    x.proto('dns', 'DNS');
    x.add('dns.id', id);
    x.add('dns.flags.response', response);
    x.add('dns.flags.rcode', rcode);
    x.add('dns.count.answers', an);
    const tree: LayerField[] = [
      { label: `Transaction ID: ${hex(id, 4)}`, range: [s, s + 2] },
      { label: `Flags: ${hex(flags, 4)} ${response ? 'Standard query response' : 'Standard query'}${response ? `, ${DNS_RCODES[rcode] ?? 'No error'}` : ''}`, range: [s + 2, s + 4] },
    ];
    let p = s + 12;
    let summary = '';
    for (let i = 0; i < qd; i++) {
      const { name, next } = readName(p);
      const qtype = be16(d, next);
      const typeName = DNS_TYPES[qtype] ?? `TYPE${qtype}`;
      x.add('dns.qry.name', name);
      x.add('dns.qry.type', qtype);
      tree.push({ label: `Query: ${name}: type ${typeName}, class IN`, range: [p, next + 4] });
      if (i === 0) summary = ` ${typeName} ${name}`;
      p = next + 4;
    }
    for (let i = 0; i < an; i++) {
      const { name, next } = readName(p);
      const type = be16(d, next);
      const rdlen = be16(d, next + 8);
      const r = next + 10;
      need(d, r + rdlen);
      const typeName = DNS_TYPES[type] ?? `TYPE${type}`;
      let value = '';
      if (type === 1 && rdlen === 4) {
        value = ipv4(d, r);
        x.add('dns.a', value);
      } else if (type === 28 && rdlen === 16) {
        value = ipv6(d, r);
        x.add('dns.aaaa', value);
      } else if (type === 5 || type === 12 || type === 2) {
        value = readName(r).name;
        x.add(type === 5 ? 'dns.cname' : type === 12 ? 'dns.ptr.domain_name' : 'dns.ns', value);
      } else if (type === 16) {
        const parts: string[] = [];
        for (let q = r; q < r + rdlen; q += 1 + d[q]) parts.push(ascii(d, q + 1, Math.min(q + 1 + d[q], r + rdlen)));
        value = parts.join('');
        x.add('dns.txt', value);
      }
      tree.push({ label: `Answer: ${name}: type ${typeName}, class IN${value ? `, ${typeName === 'A' || typeName === 'AAAA' ? 'addr' : typeName.toLowerCase()} ${value}` : ''}`, range: [p, r + rdlen] });
      // Wireshark leaves TXT data out of the Info column.
      summary += ` ${typeName}${value && type !== 16 ? ' ' + value : ''}`;
      p = r + rdlen;
    }
    x.info = `Standard query${response ? ' response' : ''} ${hex(id, 4)}${response && rcode ? ` ${DNS_RCODES[rcode] ?? `rcode ${rcode}`}` : ''}${summary}`;
    x.layer(`Domain Name System (${response ? 'response' : 'query'})`, [s, end], tree);
  }

  private tls(d: Uint8Array, s: number, end: number, stream: TcpStream, x: Dissection) {
    const descriptions: string[] = [];
    const tree: LayerField[] = [];
    let version = 0;
    let q = s;
    while (q + 5 <= end) {
      const ct = d[q];
      const ver = be16(d, q + 1);
      const len = be16(d, q + 3);
      if (ct < 20 || ct > 23 || d[q + 1] !== 3) break;
      const recEnd = Math.min(q + 5 + len, end);
      version = Math.max(version, ver);
      x.add('tls.record.content_type', ct);
      x.add('tls.record.version', ver);
      tree.push({ label: `Content Type: ${TLS_CONTENT[ct]} (${ct})`, range: [q, q + 1] }, { label: `Length: ${len}`, range: [q + 3, q + 5] });
      if (ct === 22) {
        let h = q + 5;
        while (h + 4 <= recEnd) {
          const ht = d[h];
          const hl = (d[h + 1] << 16) | (d[h + 2] << 8) | d[h + 3];
          const name = TLS_HANDSHAKES[ht];
          if (!name || h + 4 + hl > recEnd) {
            descriptions.push('Encrypted Handshake Message');
            break;
          }
          x.add('tls.handshake.type', ht);
          tree.push({ label: `Handshake Type: ${name} (${ht})`, range: [h, h + 4] });
          if (ht === 1 || ht === 2) {
            const hello = this.tlsHello(d, h + 4, h + 4 + hl, ht === 1, tree);
            // Only the server's choice decides the session version.
            if (ht === 2 && hello.tls13) stream.tls13 = true;
            if (hello.sni) x.add('tls.handshake.extensions_server_name', hello.sni);
            descriptions.push(hello.sni ? `${name} (SNI=${hello.sni})` : name);
          } else {
            descriptions.push(name);
          }
          h += 4 + hl;
        }
      } else {
        if (ct === 21) {
          // A readable alert is two bytes; anything else was encrypted.
          descriptions.push(
            len === 2
              ? `Alert (Level: ${d[q + 5] === 2 ? 'Fatal' : 'Warning'}, Description: ${TLS_ALERTS[d[q + 6]] ?? d[q + 6]})`
              : 'Encrypted Alert',
          );
        } else {
          descriptions.push(TLS_CONTENT[ct]);
        }
        if (ct === 23) tree.push({ label: 'Encrypted Application Data', range: [q + 5, recEnd] });
      }
      q += 5 + len;
    }
    if (!descriptions.length) return;
    x.proto('tls', stream.tls13 ? 'TLSv1.3' : (TLS_VERSIONS[version] ?? 'TLS'));
    x.info = descriptions.join(', ');
    x.layer('Transport Layer Security', [s, end], tree);
  }

  private tlsHello(d: Uint8Array, h: number, end: number, client: boolean, tree: LayerField[]) {
    const out = { version: 0, tls13: false, sni: '' };
    try {
      out.version = be16(d, h);
      let p = h + 34;
      p += 1 + d[p];
      if (client) {
        p += 2 + be16(d, p);
        p += 1 + d[p];
      } else {
        p += 3;
      }
      if (p + 2 > end) return out;
      const extEnd = Math.min(p + 2 + be16(d, p), end);
      p += 2;
      while (p + 4 <= extEnd) {
        const type = be16(d, p);
        const len = be16(d, p + 2);
        const body = p + 4;
        if (type === 0x0000 && client) {
          const nameLen = be16(d, body + 3);
          need(d, body + 5 + nameLen);
          out.sni = ascii(d, body + 5, body + 5 + nameLen);
          tree.push({ label: `Extension: server_name (name=${out.sni})`, range: [body + 5, body + 5 + nameLen] });
        } else if (type === 0x002b) {
          const versions: number[] = [];
          if (client) for (let v = body + 1; v + 1 < body + 1 + d[body]; v += 2) versions.push(be16(d, v));
          else versions.push(be16(d, body));
          if (versions.includes(0x0304)) out.tls13 = true;
          tree.push({ label: `Extension: supported_versions (${versions.map((v) => TLS_VERSIONS[v] ?? hex(v, 4)).join(', ')})`, range: [p, body + len] });
        }
        p = body + len;
      }
    } catch (e) {
      if (!(e instanceof Malformed)) throw e;
    }
    return out;
  }

  private http(d: Uint8Array, s: number, end: number, x: Dissection) {
    const text = ascii(d, s, end);
    const headerEnd = text.indexOf('\r\n\r\n');
    const head = headerEnd >= 0 ? text.slice(0, headerEnd) : text;
    const body = headerEnd >= 0 ? text.slice(headerEnd + 4) : '';
    const lines = head.split('\r\n');
    const first = lines[0];
    x.proto('http', 'HTTP');
    const status = /^HTTP\/1\.\d (\d{3}) ?(.*)$/.exec(first);
    if (status) {
      x.add('http.response', 1);
      x.add('http.response.code', Number(status[1]));
      x.add('http.response.phrase', status[2]);
    } else {
      const [method, uri] = first.split(' ');
      x.add('http.request', 1);
      x.add('http.request.method', method);
      x.add('http.request.uri', uri ?? '');
    }
    const tree: LayerField[] = [];
    let offset = s;
    for (const line of lines) {
      tree.push({ label: line, range: [offset, offset + line.length] });
      const colon = line.indexOf(':');
      if (colon > 0) {
        const name = line.slice(0, colon).toLowerCase();
        const value = line.slice(colon + 1).trim();
        if (name === 'host') x.add('http.host', value);
        else if (name === 'user-agent') x.add('http.user_agent', value);
        else if (name === 'content-type') x.add('http.content_type', value);
      }
      offset += line.length + 2;
    }
    if (body) {
      x.add('http.file_data', body);
      tree.push({ label: `File Data: ${body.length > 120 ? body.slice(0, 120) + '…' : body}`, range: [s + headerEnd + 4, end] });
    }
    // Wireshark's Info: the first line, then the body's media type if any.
    const contentType = x.fields.get('http.content_type')?.[0];
    x.info = `${first} ${body && contentType ? ` (${contentType})` : ''}`;
    x.layer('Hypertext Transfer Protocol', [s, end], tree);
  }

  private ftp(d: Uint8Array, s: number, end: number, request: boolean, x: Dissection) {
    const text = ascii(d, s, end);
    const line = text.split(/\r?\n/)[0];
    if (!line || /[^\x20-\x7e]/.test(line)) return;
    x.proto('ftp', 'FTP');
    const tree: LayerField[] = [];
    if (request) {
      const space = line.indexOf(' ');
      const command = space < 0 ? line : line.slice(0, space);
      const arg = space < 0 ? '' : line.slice(space + 1);
      x.add('ftp.request', 1);
      x.add('ftp.request.command', command.toUpperCase());
      tree.push({ label: `Request command: ${command}`, range: [s, s + command.length] });
      if (arg) {
        x.add('ftp.request.arg', arg);
        tree.push({ label: `Request arg: ${arg}`, range: [s + space + 1, s + line.length] });
      }
      x.info = `Request: ${line}`;
    } else {
      const code = Number(line.slice(0, 3));
      x.add('ftp.response', 1);
      if (!Number.isNaN(code)) x.add('ftp.response.code', code);
      tree.push({ label: `Response code: ${line.slice(0, 3)}`, range: [s, s + 3] }, { label: `Response arg: ${line.slice(4)}`, range: [s + 4, s + line.length] });
      x.info = `Response: ${line}`;
    }
    x.layer('File Transfer Protocol (FTP)', [s, end], tree);
  }
}

const ETHERTYPE_NAMES: Record<number, string> = {
  0x0800: 'IPv4',
  0x0806: 'ARP',
  0x86dd: 'IPv6',
  0x8100: '802.1Q',
  0x88cc: 'LLDP',
  0x888e: 'EAPOL',
  0x8847: 'MPLS',
};
const PROTO_LABEL: Record<number, string> = { 1: 'ICMP', 6: 'TCP', 17: 'UDP', 58: 'ICMPv6' };

/** Dissect a whole capture, in order, with shared stream state. */
export function dissect(frames: RawFrame[]): Packet[] {
  return new Dissector().dissect(frames);
}
