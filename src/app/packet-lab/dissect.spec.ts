import { compileFilter } from './display-filter';
import { LINKTYPE, dissect, formatIpv6 } from './dissect';
import { HUNTS } from './packet-lab-scenarios';
import { Packet } from './packet-types';
import { CaptureError, readCapture, writePcap } from './pcap';

const bytes = (...parts: (number | number[] | string)[]) =>
  Uint8Array.from(parts.flatMap((p) => (typeof p === 'number' ? [p] : typeof p === 'string' ? [...p].map((c) => c.charCodeAt(0)) : p)));
const u16 = (n: number) => [n >> 8, n & 0xff];
const u32 = (n: number) => [...u16(Math.floor(n / 0x10000)), ...u16(n & 0xffff)];

function match(packets: Packet[], text: string) {
  const f = compileFilter(text);
  if (!f.ok) throw new Error(`${text}: ${f.error}`);
  return packets.filter(f.test);
}

const MAC_A = [0x02, 0, 0, 0, 0, 0x0a];
const MAC_B = [0x02, 0, 0, 0, 0, 0x0b];
const BROADCAST = [0xff, 0xff, 0xff, 0xff, 0xff, 0xff];

/** ARP who-has 10.0.0.1 from 10.0.0.2. */
const arpFrame = bytes(BROADCAST, MAC_A, u16(0x0806), u16(1), u16(0x0800), 6, 4, u16(1), MAC_A, [10, 0, 0, 2], [0, 0, 0, 0, 0, 0], [10, 0, 0, 1]);

/** IPv6 ICMPv6 echo request 2001:db8::1 -> 2001:db8::2. */
const v6src = [0x20, 0x01, 0x0d, 0xb8, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1];
const v6dst = [0x20, 0x01, 0x0d, 0xb8, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2];
const icmp6 = [128, 0, 0, 0, ...u16(0x42), ...u16(7)];
const pingFrame = bytes(MAC_B, MAC_A, u16(0x86dd), 0x60, 0, 0, 0, u16(icmp6.length), 58, 64, v6src, v6dst, icmp6);

/** VLAN-tagged IPv4 UDP DNS response for example.com AAAA. */
function dnsAaaaFrame() {
  const q = [7, ...'example'.split('').map((c) => c.charCodeAt(0)), 3, ...'com'.split('').map((c) => c.charCodeAt(0)), 0];
  const dns = [...u16(0xbeef), ...u16(0x8180), ...u16(1), ...u16(1), ...u16(0), ...u16(0), ...q, ...u16(28), ...u16(1),
    ...u16(0xc00c), ...u16(28), ...u16(1), ...u32(60), ...u16(16), ...v6dst];
  const udp = [...u16(53), ...u16(40000), ...u16(8 + dns.length), ...u16(0), ...dns];
  const ip = [0x45, 0, ...u16(20 + udp.length), ...u16(1), ...u16(0), 64, 17, 0, 0, 192, 0, 2, 53, 192, 0, 2, 10];
  return bytes(MAC_B, MAC_A, u16(0x8100), u16(0x0064), u16(0x0800), ip, udp);
}

function pcapng(frames: Uint8Array[], tsresol = 9) {
  const le32 = (n: number) => [n & 0xff, (n >> 8) & 0xff, (n >> 16) & 0xff, (n >>> 24) & 0xff];
  const le16 = (n: number) => [n & 0xff, (n >> 8) & 0xff];
  const block = (type: number, body: number[]) => {
    while (body.length % 4) body.push(0);
    const len = body.length + 12;
    return [...le32(type), ...le32(len), ...body, ...le32(len)];
  };
  const out = [
    ...block(0x0a0d0d0a, [...le32(0x1a2b3c4d), ...le16(1), ...le16(0), 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff]),
    ...block(1, [...le16(1), 0, 0, ...le32(65535), ...le16(9), ...le16(1), tsresol, 0, 0, 0, 0, 0, 0, 0]),
  ];
  frames.forEach((f, i) => {
    const ts = 1_700_000_000 * 10 ** tsresol + i * 1_500_000_000;
    const high = Math.floor(ts / 2 ** 32);
    const low = ts - high * 2 ** 32;
    out.push(...block(6, [...le32(0), ...le32(high), ...le32(low), ...le32(f.length), ...le32(f.length), ...f]));
  });
  return Uint8Array.from(out).buffer;
}

describe('Dissector', () => {
  it('should format IPv6 addresses per RFC 5952', () => {
    expect(formatIpv6(v6src)).toBe('2001:db8::1');
    expect(formatIpv6(new Array(16).fill(0))).toBe('::');
    expect(formatIpv6([0xfe, 0x80, ...new Array(12).fill(0), 0, 1])).toBe('fe80::1');
    expect(formatIpv6([0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1])).toBe('1:0:1::1:1');
  });

  it('should decode ARP, IPv6 ICMPv6, and VLAN-tagged DNS AAAA', () => {
    const [arp, ping, dns] = dissect([
      { time: 0, data: arpFrame, linkType: LINKTYPE.ETHERNET },
      { time: 0.5, data: pingFrame, linkType: LINKTYPE.ETHERNET },
      { time: 1, data: dnsAaaaFrame(), linkType: LINKTYPE.ETHERNET },
    ]);
    expect(arp.protocol).toBe('ARP');
    expect(arp.info).toBe('Who has 10.0.0.1? Tell 10.0.0.2');
    expect(arp.dst).toBe('Broadcast');

    expect(ping.protocol).toBe('ICMPv6');
    expect(ping.src).toBe('2001:db8::1');
    expect(ping.info).toBe('Echo (ping) request id=0x0042, seq=7');

    expect(dns.protocol).toBe('DNS');
    expect(dns.fields.get('vlan.id')).toEqual([100]);
    expect(dns.info).toBe('Standard query response 0xbeef AAAA example.com AAAA 2001:db8::2');
    expect(dns.time).toBe(1);

    const all = [arp, ping, dns];
    expect(match(all, 'arp.src.proto_ipv4 == 10.0.0.2').length).toBe(1);
    expect(match(all, 'ipv6.addr == 2001:0db8:0000::0001').length).toBe(1);
    expect(match(all, 'dns.aaaa == 2001:db8::2').length).toBe(1);
    expect(match(all, 'vlan.id == 100 && udp.srcport == 53').length).toBe(1);
  });

  it('should flag short and truncated frames without throwing', () => {
    const [short, snapped] = dissect([
      { time: 0, data: bytes(MAC_B, MAC_A, u16(0x0800), 0x45, 0), linkType: LINKTYPE.ETHERNET },
      { time: 1, data: arpFrame, origLen: 60, linkType: LINKTYPE.ETHERNET },
    ]);
    expect(short.info).toContain('[Malformed Packet]');
    expect(match([short], '_ws.malformed').length).toBe(1);
    expect(snapped.length).toBe(60);
    expect(snapped.info).toContain('[Packet size limited during capture]');
  });

  it('should decode raw IP and Linux cooked captures', () => {
    const ip = dnsAaaaFrame().slice(18);
    const sll = bytes(new Array(14).fill(0), u16(0x0800), [...ip]);
    const [raw, cooked] = dissect([
      { time: 0, data: ip, linkType: LINKTYPE.RAW },
      { time: 0, data: sll, linkType: LINKTYPE.LINUX_SLL },
    ]);
    expect(raw.protocol).toBe('DNS');
    expect(cooked.protocol).toBe('DNS');
    expect(cooked.src).toBe('192.0.2.53');
  });

  it('should label TLS by record version until the Server Hello selects TLS 1.3, as Wireshark does', () => {
    const packets = HUNTS.find((h) => h.id === 'beaconing')!.build();
    const hellos = match(packets, 'tls.handshake.type == 1');
    expect(hellos.every((p) => p.protocol === 'TLSv1')).toBe(true);
    const serverHellos = match(packets, 'tls.handshake.type == 2');
    expect(serverHellos.length).toBe(hellos.length);
    expect(serverHellos.every((p) => p.protocol === 'TLSv1.3' && p.info === 'Server Hello, Change Cipher Spec, Application Data')).toBe(true);
    expect(match(packets, 'tls.record.content_type == 23 && !tls.handshake.type').every((p) => p.protocol === 'TLSv1.3')).toBe(true);
  });

  it('should use relative sequence numbers', () => {
    const packets = HUNTS.find((h) => h.id === 'port-scan')!.build();
    const probes = match(packets, 'ip.src == 10.20.9.50 && tcp.flags.syn == 1');
    expect(probes.every((p) => p.fields.get('tcp.seq')![0] === 0)).toBe(true);
    expect(probes.some((p) => p.fields.get('tcp.seq_raw')![0] !== 0)).toBe(true);
    const synAcks = match(packets, 'ip.dst == 10.20.9.50 && tcp.flags.syn == 1 && tcp.flags.ack == 1');
    expect(synAcks.every((p) => p.fields.get('tcp.ack')![0] === 1)).toBe(true);
  });
});

describe('pcap files', () => {
  it('should round-trip every hunt through pcap and decode identically', () => {
    for (const hunt of HUNTS) {
      const original = hunt.build();
      const file = writePcap(original, 1_772_460_300);
      const capture = readCapture(file.buffer as ArrayBuffer);
      expect(capture.format).toBe('pcap');
      const reread = dissect(capture.frames);
      expect(reread.map((p) => p.info)).toEqual(original.map((p) => p.info));
      expect(reread.at(-1)!.time).toBeCloseTo(original.at(-1)!.time, 5);
    }
  });

  it('should read big-endian, nanosecond pcap files', () => {
    const header = [0xa1, 0xb2, 0x3c, 0x4d, ...u16(2), ...u16(4), ...u32(0), ...u32(0), ...u32(65535), ...u32(1)];
    const rec = (sec: number, ns: number, f: Uint8Array) => [...u32(sec), ...u32(ns), ...u32(f.length), ...u32(f.length), ...f];
    const file = Uint8Array.from([...header, ...rec(100, 0, arpFrame), ...rec(100, 250_000_000, arpFrame)]);
    const capture = readCapture(file.buffer);
    const packets = dissect(capture.frames);
    expect(packets.length).toBe(2);
    expect(packets[1].time).toBeCloseTo(0.25, 6);
  });

  it('should read pcapng with a nanosecond interface', () => {
    const capture = readCapture(pcapng([arpFrame, pingFrame, dnsAaaaFrame()]));
    expect(capture.format).toBe('pcapng');
    const packets = dissect(capture.frames);
    expect(packets.map((p) => p.protocol)).toEqual(['ARP', 'ICMPv6', 'DNS']);
    expect(packets[2].time).toBeCloseTo(3, 6);
  });

  it('should mark a file that ends mid-record as truncated', () => {
    const file = writePcap(HUNTS[0].build().slice(0, 3), 0);
    const capture = readCapture(file.slice(0, file.length - 10).buffer);
    expect(capture.truncated).toBe(true);
    expect(capture.frames.length).toBe(2);
  });

  it('should explain files it cannot open', () => {
    const attempt = (data: number[]) => {
      try {
        readCapture(Uint8Array.from(data).buffer);
        return '';
      } catch (e) {
        expect(e).toBeInstanceOf(CaptureError);
        return (e as Error).message;
      }
    };
    expect(attempt([1, 2, 3])).toContain('too small');
    expect(attempt([0x1f, 0x8b, ...new Array(30).fill(0)])).toContain('gzip');
    expect(attempt(new Array(40).fill(0x41))).toContain('not a pcap');
    const empty = [0xd4, 0xc3, 0xb2, 0xa1, 2, 0, 4, 0, ...new Array(12).fill(0), 1, 0, 0, 0];
    expect(attempt(empty)).toContain('no packets');
    const usb = [0xd4, 0xc3, 0xb2, 0xa1, 2, 0, 4, 0, ...new Array(12).fill(0), 189, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0];
    expect(attempt(usb)).toContain('link-layer type 189');
  });
});
