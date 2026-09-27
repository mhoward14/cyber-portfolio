/* ============================================================
   PACKET-MODEL.TS — PACKET ANALYSIS LAB
   Builds synthetic packets byte-for-byte (Ethernet II, IPv4, TCP/UDP,
   and DNS / TLS / HTTP / FTP payloads) so the packet list, the
   protocol tree, the hex dump, and the display-filter fields all come
   from one source and can never disagree. IPv4 header checksums are
   computed; TCP/UDP checksums are left at zero, as Wireshark shows for
   captures with checksum offload.

   All hosts and domains are fictional: internal hosts use 10.0.0.0/8,
   "external" hosts use the RFC 5737 documentation ranges
   (192.0.2.0/24, 198.51.100.0/24, 203.0.113.0/24), and domain names use
   the reserved .example TLD (RFC 2606).
   ============================================================ */

export type FieldValue = string | number;

export type AppPayload =
  | { type: 'dns-query'; id: number; name: string; qtype: 'A' | 'TXT' }
  | { type: 'dns-response'; id: number; name: string; qtype: 'A' | 'TXT'; answer: string }
  | { type: 'http-request'; method: 'GET' | 'POST'; host: string; uri: string; body?: string; contentType?: string }
  | { type: 'http-response'; status: number; reason: string; body?: string }
  | { type: 'tls-client-hello'; sni: string }
  | { type: 'tls-app-data'; length: number }
  | { type: 'ftp-request'; command: string; arg: string }
  | { type: 'ftp-response'; code: number; text: string };

export interface PacketSpec {
  time: number;
  src: string;
  dst: string;
  transport: 'tcp' | 'udp';
  srcPort: number;
  dstPort: number;
  /** TCP only: any of S, A, F, R, P. */
  flags?: string;
  seq?: number;
  ack?: number;
  app?: AppPayload;
}

export interface LayerField {
  label: string;
  /** Byte range in the frame, [start, end). */
  range?: [number, number];
}

export interface Layer {
  name: string;
  range: [number, number];
  fields: LayerField[];
}

export interface Packet {
  no: number;
  time: number;
  src: string;
  dst: string;
  protocol: string;
  length: number;
  info: string;
  bytes: Uint8Array;
  layers: Layer[];
  /** Display-filter fields. Multi-valued fields (ip.addr, tcp.port) hold every value. */
  fields: Map<string, FieldValue[]>;
}

const TCP_FLAG_BITS: Record<string, number> = { F: 0x01, S: 0x02, R: 0x04, P: 0x08, A: 0x10 };
const TCP_FLAG_NAMES: [string, number][] = [['SYN', 0x02], ['FIN', 0x01], ['RST', 0x04], ['PSH', 0x08], ['ACK', 0x10]];
const GATEWAY_MAC = '00:1b:21:3a:4c:01';

export function isInternal(ip: string): boolean {
  return ip.startsWith('10.');
}

/** Stable locally administered MAC for an internal host; external traffic
 *  crosses the default gateway, so it carries the gateway's MAC. */
export function macFor(ip: string): string {
  if (!isInternal(ip)) return GATEWAY_MAC;
  const o = ip.split('.').map(Number);
  return ['02', '00', ...o.map((n) => n.toString(16).padStart(2, '0'))].slice(0, 6).join(':');
}

// ---------- byte helpers ----------

class Bytes {
  readonly data: number[] = [];
  get length() {
    return this.data.length;
  }
  u8(v: number) {
    this.data.push(v & 0xff);
    return this;
  }
  u16(v: number) {
    return this.u8(v >> 8).u8(v);
  }
  u24(v: number) {
    return this.u8(v >> 16).u8(v >> 8).u8(v);
  }
  u32(v: number) {
    return this.u16(Math.floor(v / 0x10000)).u16(v % 0x10000);
  }
  raw(b: ArrayLike<number>) {
    for (let i = 0; i < b.length; i++) this.u8(b[i]);
    return this;
  }
  ascii(s: string) {
    for (let i = 0; i < s.length; i++) this.u8(s.charCodeAt(i));
    return this;
  }
}

function ipBytes(ip: string): number[] {
  return ip.split('.').map(Number);
}

function macBytes(mac: string): number[] {
  return mac.split(':').map((h) => parseInt(h, 16));
}

function ipChecksum(header: number[]): number {
  let sum = 0;
  for (let i = 0; i < header.length; i += 2) sum += (header[i] << 8) + header[i + 1];
  while (sum > 0xffff) sum = (sum & 0xffff) + (sum >> 16);
  return ~sum & 0xffff;
}

/** Deterministic filler bytes (TLS randoms, encrypted payloads). */
function filler(seed: number, n: number): number[] {
  let x = seed >>> 0 || 1;
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    out.push((x >>> 0) & 0xff);
  }
  return out;
}

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

// ---------- application payloads ----------

interface EncodedApp {
  bytes: number[];
  protocol: string;
  info: string;
  layer: { name: string; fields: string[] };
  fields: [string, FieldValue][];
}

function dnsName(b: Bytes, name: string) {
  for (const label of name.split('.')) b.u8(label.length).ascii(label);
  b.u8(0);
}

export function encodeApp(app: AppPayload): EncodedApp {
  const b = new Bytes();
  switch (app.type) {
    case 'dns-query':
    case 'dns-response': {
      const response = app.type === 'dns-response';
      const qtype = app.qtype === 'A' ? 1 : 16;
      b.u16(app.id).u16(response ? 0x8180 : 0x0100).u16(1).u16(response ? 1 : 0).u16(0).u16(0);
      dnsName(b, app.name);
      b.u16(qtype).u16(1);
      const fields: [string, FieldValue][] = [
        ['dns.id', app.id],
        ['dns.flags.response', response ? 1 : 0],
        ['dns.qry.name', app.name],
        ['dns.qry.type', qtype],
      ];
      let answerText = '';
      if (response) {
        b.u16(0xc00c).u16(qtype).u16(1).u32(300);
        if (app.qtype === 'A') {
          b.u16(4).raw(ipBytes(app.answer));
          fields.push(['dns.a', app.answer]);
        } else {
          b.u16(app.answer.length + 1).u8(app.answer.length).ascii(app.answer);
          fields.push(['dns.txt', app.answer]);
        }
        answerText = ` ${app.qtype} ${app.answer}`;
      }
      const hex = `0x${app.id.toString(16).padStart(4, '0')}`;
      return {
        bytes: b.data,
        protocol: 'DNS',
        info: `Standard query${response ? ' response' : ''} ${hex} ${app.qtype} ${app.name}${answerText}`,
        layer: {
          name: 'Domain Name System (' + (response ? 'response' : 'query') + ')',
          fields: [
            `Transaction ID: ${hex}`,
            `Flags: ${response ? '0x8180 Standard query response, No error' : '0x0100 Standard query'}`,
            `Query: ${app.name}: type ${app.qtype}, class IN`,
            ...(response ? [`Answer: ${app.name}: type ${app.qtype}, class IN, ${app.qtype === 'A' ? 'addr' : 'txt'} ${app.answer}`] : []),
          ],
        },
        fields,
      };
    }
    case 'http-request': {
      const lines = [`${app.method} ${app.uri} HTTP/1.1`, `Host: ${app.host}`, 'User-Agent: Mozilla/5.0'];
      if (app.body !== undefined) {
        lines.push(`Content-Type: ${app.contentType ?? 'application/x-www-form-urlencoded'}`, `Content-Length: ${app.body.length}`);
      }
      const text = lines.join('\r\n') + '\r\n\r\n' + (app.body ?? '');
      b.ascii(text);
      const fields: [string, FieldValue][] = [
        ['http.request', 1],
        ['http.request.method', app.method],
        ['http.request.uri', app.uri],
        ['http.host', app.host],
      ];
      if (app.body) fields.push(['http.file_data', app.body]);
      return {
        bytes: b.data,
        protocol: 'HTTP',
        info: `${app.method} ${app.uri} HTTP/1.1`,
        layer: { name: 'Hypertext Transfer Protocol', fields: [...lines, ...(app.body ? [`File Data: ${app.body}`] : [])] },
        fields,
      };
    }
    case 'http-response': {
      const body = app.body ?? '';
      const lines = [`HTTP/1.1 ${app.status} ${app.reason}`, 'Content-Type: text/html', `Content-Length: ${body.length}`];
      b.ascii(lines.join('\r\n') + '\r\n\r\n' + body);
      return {
        bytes: b.data,
        protocol: 'HTTP',
        info: `HTTP/1.1 ${app.status} ${app.reason}`,
        layer: { name: 'Hypertext Transfer Protocol', fields: lines },
        fields: [
          ['http.response', 1],
          ['http.response.code', app.status],
        ],
      };
    }
    case 'tls-client-hello': {
      const name = app.sni;
      const sniExt = new Bytes().u16(0x0000).u16(name.length + 5).u16(name.length + 3).u8(0).u16(name.length).ascii(name);
      const hello = new Bytes()
        .u16(0x0303)
        .raw(filler(hashString(name), 32))
        .u8(0)
        .u16(4)
        .u16(0x1301)
        .u16(0x1302)
        .u8(1)
        .u8(0)
        .u16(sniExt.length)
        .raw(sniExt.data);
      b.u8(0x16).u16(0x0301).u16(hello.length + 4).u8(1).u24(hello.length).raw(hello.data);
      return {
        bytes: b.data,
        protocol: 'TLSv1.3',
        info: `Client Hello (SNI=${name})`,
        layer: {
          name: 'Transport Layer Security',
          fields: ['Content Type: Handshake (22)', 'Handshake Type: Client Hello (1)', `Extension: server_name (name=${name})`],
        },
        fields: [
          ['tls.record.content_type', 22],
          ['tls.handshake.type', 1],
          ['tls.handshake.extensions_server_name', name],
        ],
      };
    }
    case 'tls-app-data': {
      b.u8(0x17).u16(0x0303).u16(app.length).raw(filler(app.length * 7919, app.length));
      return {
        bytes: b.data,
        protocol: 'TLSv1.3',
        info: 'Application Data',
        layer: { name: 'Transport Layer Security', fields: ['Content Type: Application Data (23)', `Length: ${app.length}`, 'Encrypted Application Data'] },
        fields: [['tls.record.content_type', 23]],
      };
    }
    case 'ftp-request': {
      const line = `${app.command}${app.arg ? ' ' + app.arg : ''}`;
      b.ascii(line + '\r\n');
      return {
        bytes: b.data,
        protocol: 'FTP',
        info: `Request: ${line}`,
        layer: { name: 'File Transfer Protocol (FTP)', fields: [`Request command: ${app.command}`, `Request arg: ${app.arg}`] },
        fields: [
          ['ftp.request', 1],
          ['ftp.request.command', app.command],
          ['ftp.request.arg', app.arg],
        ],
      };
    }
    case 'ftp-response': {
      const line = `${app.code} ${app.text}`;
      b.ascii(line + '\r\n');
      return {
        bytes: b.data,
        protocol: 'FTP',
        info: `Response: ${line}`,
        layer: { name: 'File Transfer Protocol (FTP)', fields: [`Response code: ${app.code}`, `Response arg: ${app.text}`] },
        fields: [
          ['ftp.response', 1],
          ['ftp.response.code', app.code],
        ],
      };
    }
  }
}

function appProtocolKey(app: AppPayload): string {
  if (app.type.startsWith('dns')) return 'dns';
  if (app.type.startsWith('http')) return 'http';
  if (app.type.startsWith('tls')) return 'tls';
  return 'ftp';
}

/** Locate the bytes an application-layer field describes, so selecting it
 *  in the protocol tree highlights just that text in the hex pane. Tries
 *  the whole label (HTTP header lines), then the value after "label: ",
 *  then a "name=value" inside parentheses (TLS SNI). */
function textRange(payload: number[], label: string, offset: number): [number, number] | null {
  const text = String.fromCharCode(...payload);
  const candidates = [label, label.slice(label.indexOf(': ') + 2), /name=([^)]+)/.exec(label)?.[1] ?? ''];
  for (const c of candidates) {
    if (c.length < 2) continue;
    const at = text.indexOf(c);
    if (at >= 0) return [offset + at, offset + at + c.length];
  }
  return null;
}

// ---------- frame assembly ----------

/** Turn specs (sorted by time) into numbered packets with bytes, protocol
 *  tree, and display-filter fields. */
export function buildPackets(specs: PacketSpec[]): Packet[] {
  const sorted = [...specs].sort((a, b) => a.time - b.time);
  const streams = new Map<string, number>();
  const start = sorted[0]?.time ?? 0;

  return sorted.map((spec, i) => {
    const app = spec.app ? encodeApp(spec.app) : null;
    const payload = app?.bytes ?? [];
    const tcp = spec.transport === 'tcp';
    const l4Len = tcp ? 20 : 8;
    const ipLen = 20 + l4Len + payload.length;
    const srcMac = macFor(spec.src);
    const dstMac = macFor(spec.dst);
    const ttl = isInternal(spec.src) ? 128 : 52;
    const ipId = (hashString(`${spec.src}${spec.time}`) & 0xffff) >>> 0;

    const frame = new Bytes();
    frame.raw(macBytes(dstMac)).raw(macBytes(srcMac)).u16(0x0800);
    const ipHeader = new Bytes()
      .u8(0x45)
      .u8(0)
      .u16(ipLen)
      .u16(ipId)
      .u16(0x4000)
      .u8(ttl)
      .u8(tcp ? 6 : 17)
      .u16(0)
      .raw(ipBytes(spec.src))
      .raw(ipBytes(spec.dst));
    const csum = ipChecksum(ipHeader.data);
    ipHeader.data[10] = csum >> 8;
    ipHeader.data[11] = csum & 0xff;
    frame.raw(ipHeader.data);

    let flagByte = 0;
    for (const f of spec.flags ?? '') flagByte |= TCP_FLAG_BITS[f] ?? 0;
    if (tcp) {
      frame
        .u16(spec.srcPort)
        .u16(spec.dstPort)
        .u32(spec.seq ?? 0)
        .u32(spec.ack ?? 0)
        .u8(0x50)
        .u8(flagByte)
        .u16(64240)
        .u16(0)
        .u16(0);
    } else {
      frame.u16(spec.srcPort).u16(spec.dstPort).u16(8 + payload.length).u16(0);
    }
    frame.raw(payload);

    const endpointA = `${spec.src}:${spec.srcPort}`;
    const endpointB = `${spec.dst}:${spec.dstPort}`;
    const streamKey = `${spec.transport}|${[endpointA, endpointB].sort().join('|')}`;
    if (!streams.has(streamKey)) streams.set(streamKey, streams.size);
    const stream = streams.get(streamKey)!;

    const flagNames = TCP_FLAG_NAMES.filter(([, bit]) => flagByte & bit).map(([n]) => n);
    const l4Start = 34;
    const appStart = l4Start + l4Len;
    const time = spec.time - start;
    const protoKeys = ['eth', 'ip', tcp ? 'tcp' : 'udp', ...(spec.app ? [appProtocolKey(spec.app)] : [])];

    const fields = new Map<string, FieldValue[]>();
    const set = (k: string, ...v: FieldValue[]) => fields.set(k, v);
    set('frame', 1);
    set('frame.number', i + 1);
    set('frame.len', frame.length);
    set('frame.time_relative', Number(time.toFixed(6)));
    set('frame.protocols', protoKeys.join(':'));
    for (const p of protoKeys) if (!fields.has(p)) set(p, 1);
    set('eth.src', srcMac);
    set('eth.dst', dstMac);
    set('eth.addr', srcMac, dstMac);
    set('ip.src', spec.src);
    set('ip.dst', spec.dst);
    set('ip.addr', spec.src, spec.dst);
    set('ip.ttl', ttl);
    set('ip.len', ipLen);
    set('ip.proto', tcp ? 6 : 17);
    if (tcp) {
      set('tcp.srcport', spec.srcPort);
      set('tcp.dstport', spec.dstPort);
      set('tcp.port', spec.srcPort, spec.dstPort);
      set('tcp.stream', stream);
      set('tcp.seq', spec.seq ?? 0);
      set('tcp.ack', spec.ack ?? 0);
      set('tcp.len', payload.length);
      set('tcp.flags', flagByte);
      set('tcp.flags.syn', flagByte & 0x02 ? 1 : 0);
      set('tcp.flags.ack', flagByte & 0x10 ? 1 : 0);
      set('tcp.flags.fin', flagByte & 0x01 ? 1 : 0);
      set('tcp.flags.reset', flagByte & 0x04 ? 1 : 0);
      set('tcp.flags.push', flagByte & 0x08 ? 1 : 0);
    } else {
      set('udp.srcport', spec.srcPort);
      set('udp.dstport', spec.dstPort);
      set('udp.port', spec.srcPort, spec.dstPort);
      set('udp.length', 8 + payload.length);
      set('udp.stream', stream);
    }
    for (const [k, v] of app?.fields ?? []) fields.set(k, [...(fields.get(k) ?? []), v]);

    const layers: Layer[] = [
      {
        name: `Frame ${i + 1}: ${frame.length} bytes on wire (${frame.length * 8} bits)`,
        range: [0, frame.length],
        fields: [
          { label: `Time since first frame: ${time.toFixed(6)} seconds` },
          { label: `Frame Length: ${frame.length} bytes` },
          { label: `Protocols in frame: ${protoKeys.join(':')}` },
        ],
      },
      {
        name: `Ethernet II, Src: ${srcMac}, Dst: ${dstMac}`,
        range: [0, 14],
        fields: [
          { label: `Destination: ${dstMac}`, range: [0, 6] },
          { label: `Source: ${srcMac}`, range: [6, 12] },
          { label: 'Type: IPv4 (0x0800)', range: [12, 14] },
        ],
      },
      {
        name: `Internet Protocol Version 4, Src: ${spec.src}, Dst: ${spec.dst}`,
        range: [14, 34],
        fields: [
          { label: 'Version: 4, Header Length: 20 bytes', range: [14, 15] },
          { label: `Total Length: ${ipLen}`, range: [16, 18] },
          { label: `Identification: 0x${ipId.toString(16).padStart(4, '0')}`, range: [18, 20] },
          { label: "Flags: 0x2, Don't fragment", range: [20, 22] },
          { label: `Time to Live: ${ttl}`, range: [22, 23] },
          { label: `Protocol: ${tcp ? 'TCP (6)' : 'UDP (17)'}`, range: [23, 24] },
          { label: `Header Checksum: 0x${csum.toString(16).padStart(4, '0')} [correct]`, range: [24, 26] },
          { label: `Source Address: ${spec.src}`, range: [26, 30] },
          { label: `Destination Address: ${spec.dst}`, range: [30, 34] },
        ],
      },
      tcp
        ? {
            name: `Transmission Control Protocol, Src Port: ${spec.srcPort}, Dst Port: ${spec.dstPort}, Seq: ${spec.seq ?? 0}${flagByte & 0x10 ? `, Ack: ${spec.ack ?? 0}` : ''}, Len: ${payload.length}`,
            range: [l4Start, appStart],
            fields: [
              { label: `Source Port: ${spec.srcPort}`, range: [34, 36] },
              { label: `Destination Port: ${spec.dstPort}`, range: [36, 38] },
              { label: `[Stream index: ${stream}]` },
              { label: `Sequence Number: ${spec.seq ?? 0}`, range: [38, 42] },
              { label: `Acknowledgment Number: ${spec.ack ?? 0}`, range: [42, 46] },
              { label: `Flags: 0x${flagByte.toString(16).padStart(3, '0')} (${flagNames.join(', ') || 'none'})`, range: [46, 48] },
              { label: 'Window: 64240', range: [48, 50] },
              { label: 'Checksum: 0x0000 [unverified]', range: [50, 52] },
            ],
          }
        : {
            name: `User Datagram Protocol, Src Port: ${spec.srcPort}, Dst Port: ${spec.dstPort}`,
            range: [l4Start, appStart],
            fields: [
              { label: `Source Port: ${spec.srcPort}`, range: [34, 36] },
              { label: `Destination Port: ${spec.dstPort}`, range: [36, 38] },
              { label: `Length: ${8 + payload.length}`, range: [38, 40] },
              { label: 'Checksum: 0x0000 [unverified]', range: [40, 42] },
            ],
          },
    ];
    if (app) {
      layers.push({
        name: app.layer.name,
        range: [appStart, frame.length],
        fields: app.layer.fields.map((label) => ({ label, range: textRange(payload, label, appStart) ?? [appStart, frame.length] })),
      });
    }

    const tcpInfo = `${spec.srcPort} → ${spec.dstPort} [${flagNames.join(', ')}] Seq=${spec.seq ?? 0}${flagByte & 0x10 ? ` Ack=${spec.ack ?? 0}` : ''} Win=64240 Len=${payload.length}`;
    return {
      no: i + 1,
      time,
      src: spec.src,
      dst: spec.dst,
      protocol: app?.protocol ?? (tcp ? 'TCP' : 'UDP'),
      length: frame.length,
      info: app?.info ?? (tcp ? tcpInfo : `${spec.srcPort} → ${spec.dstPort} Len=${payload.length}`),
      bytes: Uint8Array.from(frame.data),
      layers,
      fields,
    };
  });
}

// ---------- conversation helpers for building scenarios ----------

/** Tracks relative sequence numbers for one TCP connection so scenario
 *  code can describe traffic as "client sends X, server replies Y". */
export class TcpConversation {
  private cSeq = 0;
  private sSeq = 0;
  constructor(
    private readonly out: PacketSpec[],
    readonly client: string,
    readonly server: string,
    readonly clientPort: number,
    readonly serverPort: number,
  ) {}

  private push(time: number, fromClient: boolean, flags: string, app?: AppPayload): number {
    const len = app ? encodeApp(app).bytes.length : 0;
    this.out.push({
      time,
      src: fromClient ? this.client : this.server,
      dst: fromClient ? this.server : this.client,
      transport: 'tcp',
      srcPort: fromClient ? this.clientPort : this.serverPort,
      dstPort: fromClient ? this.serverPort : this.clientPort,
      flags,
      seq: fromClient ? this.cSeq : this.sSeq,
      ack: flags.includes('A') ? (fromClient ? this.sSeq : this.cSeq) : 0,
      app,
    });
    return len;
  }

  handshake(t: number, rtt = 0.02) {
    this.push(t, true, 'S');
    this.cSeq = 1;
    this.push(t + rtt, false, 'SA');
    this.sSeq = 1;
    this.push(t + rtt + 0.0005, true, 'A');
    return this;
  }

  client_(t: number, app: AppPayload) {
    this.cSeq += this.push(t, true, 'PA', app);
    return this;
  }

  server_(t: number, app: AppPayload) {
    this.sSeq += this.push(t, false, 'PA', app);
    return this;
  }

  close(t: number) {
    this.push(t, true, 'FA');
    this.cSeq += 1;
    this.push(t + 0.02, false, 'FA');
    this.sSeq += 1;
    this.push(t + 0.0205, true, 'A');
    return this;
  }
}

/** Seeded PRNG (mulberry32) so every capture is identical on every visit. */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
