/* ============================================================
   PACKET-MODEL.TS — PACKET ANALYSIS LAB
   Builds the hunts' synthetic captures byte-for-byte (Ethernet II,
   IPv4, TCP/UDP, and DNS / TLS / HTTP / FTP payloads). The bytes are
   then decoded by the same dissector (dissect.ts) that decodes a
   visitor's own pcap, so the packet list, protocol tree, hex dump,
   and filter fields all come from one decoder. IPv4 header checksums
   are computed; TCP/UDP checksums are left at zero, as Wireshark
   shows for captures with checksum offload.

   All hosts and domains are fictional: internal hosts use 10.0.0.0/8,
   "external" hosts use the RFC 5737 documentation ranges
   (192.0.2.0/24, 198.51.100.0/24, 203.0.113.0/24), and domain names use
   the reserved .example TLD (RFC 2606).
   ============================================================ */

import { LINKTYPE, dissect } from './dissect';
import { Packet, RawFrame } from './packet-types';

export type { FieldValue, Layer, LayerField, Packet } from './packet-types';

export type AppPayload =
  | { type: 'dns-query'; id: number; name: string; qtype: 'A' | 'TXT' }
  | { type: 'dns-response'; id: number; name: string; qtype: 'A' | 'TXT'; answer: string }
  | { type: 'http-request'; method: 'GET' | 'POST'; host: string; uri: string; body?: string; contentType?: string }
  | { type: 'http-response'; status: number; reason: string; body?: string }
  | { type: 'tls-client-hello'; sni: string }
  | { type: 'tls-server-hello'; seed: number }
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

const TCP_FLAG_BITS: Record<string, number> = { F: 0x01, S: 0x02, R: 0x04, P: 0x08, A: 0x10 };
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

function dnsName(b: Bytes, name: string) {
  for (const label of name.split('.')) b.u8(label.length).ascii(label);
  b.u8(0);
}

/** Wire bytes for an application payload. */
export function encodeApp(app: AppPayload): number[] {
  const b = new Bytes();
  switch (app.type) {
    case 'dns-query':
    case 'dns-response': {
      const response = app.type === 'dns-response';
      const qtype = app.qtype === 'A' ? 1 : 16;
      b.u16(app.id).u16(response ? 0x8180 : 0x0100).u16(1).u16(response ? 1 : 0).u16(0).u16(0);
      dnsName(b, app.name);
      b.u16(qtype).u16(1);
      if (response) {
        b.u16(0xc00c).u16(qtype).u16(1).u32(300);
        if (app.qtype === 'A') b.u16(4).raw(ipBytes(app.answer));
        else b.u16(app.answer.length + 1).u8(app.answer.length).ascii(app.answer);
      }
      return b.data;
    }
    case 'http-request': {
      const lines = [`${app.method} ${app.uri} HTTP/1.1`, `Host: ${app.host}`, 'User-Agent: Mozilla/5.0'];
      if (app.body !== undefined) {
        lines.push(`Content-Type: ${app.contentType ?? 'application/x-www-form-urlencoded'}`, `Content-Length: ${app.body.length}`);
      }
      return b.ascii(lines.join('\r\n') + '\r\n\r\n' + (app.body ?? '')).data;
    }
    case 'http-response': {
      const body = app.body ?? '';
      const lines = [`HTTP/1.1 ${app.status} ${app.reason}`, 'Content-Type: text/html', `Content-Length: ${body.length}`];
      return b.ascii(lines.join('\r\n') + '\r\n\r\n' + body).data;
    }
    case 'tls-client-hello': {
      const name = app.sni;
      const extensions = new Bytes()
        // server_name
        .u16(0x0000).u16(name.length + 5).u16(name.length + 3).u8(0).u16(name.length).ascii(name)
        // supported_versions: TLS 1.3, TLS 1.2
        .u16(0x002b).u16(5).u8(4).u16(0x0304).u16(0x0303);
      const hello = new Bytes()
        .u16(0x0303)
        .raw(filler(hashString(name), 32))
        .u8(0)
        .u16(4)
        .u16(0x1301)
        .u16(0x1302)
        .u8(1)
        .u8(0)
        .u16(extensions.length)
        .raw(extensions.data);
      return b.u8(0x16).u16(0x0301).u16(hello.length + 4).u8(1).u24(hello.length).raw(hello.data).data;
    }
    case 'tls-server-hello': {
      // Server Hello selecting TLS 1.3, then Change Cipher Spec and the
      // first encrypted handshake record, as one segment (typical of TLS 1.3).
      const extensions = new Bytes().u16(0x002b).u16(2).u16(0x0304);
      const hello = new Bytes()
        .u16(0x0303)
        .raw(filler(app.seed, 32))
        .u8(0)
        .u16(0x1301)
        .u8(0)
        .u16(extensions.length)
        .raw(extensions.data);
      b.u8(0x16).u16(0x0303).u16(hello.length + 4).u8(2).u24(hello.length).raw(hello.data);
      b.u8(0x14).u16(0x0303).u16(1).u8(1);
      return b.u8(0x17).u16(0x0303).u16(64).raw(filler(app.seed ^ 0x5a5a, 64)).data;
    }
    case 'tls-app-data':
      return b.u8(0x17).u16(0x0303).u16(app.length).raw(filler(app.length * 7919, app.length)).data;
    case 'ftp-request':
      return b.ascii(`${app.command}${app.arg ? ' ' + app.arg : ''}\r\n`).data;
    case 'ftp-response':
      return b.ascii(`${app.code} ${app.text}\r\n`).data;
  }
}

// ---------- frame assembly ----------

/** Turn specs into Ethernet frames, sorted by time. */
export function buildFrames(specs: PacketSpec[]): RawFrame[] {
  const sorted = [...specs].sort((a, b) => a.time - b.time);
  return sorted.map((spec) => {
    const payload = spec.app ? encodeApp(spec.app) : [];
    const tcp = spec.transport === 'tcp';
    const ipLen = 20 + (tcp ? 20 : 8) + payload.length;
    const ipHeader = new Bytes()
      .u8(0x45)
      .u8(0)
      .u16(ipLen)
      .u16(hashString(`${spec.src}${spec.time}`) & 0xffff)
      .u16(0x4000)
      .u8(isInternal(spec.src) ? 128 : 52)
      .u8(tcp ? 6 : 17)
      .u16(0)
      .raw(ipBytes(spec.src))
      .raw(ipBytes(spec.dst));
    const csum = ipChecksum(ipHeader.data);
    ipHeader.data[10] = csum >> 8;
    ipHeader.data[11] = csum & 0xff;

    const frame = new Bytes().raw(macBytes(macFor(spec.dst))).raw(macBytes(macFor(spec.src))).u16(0x0800).raw(ipHeader.data);
    if (tcp) {
      let flags = 0;
      for (const f of spec.flags ?? '') flags |= TCP_FLAG_BITS[f] ?? 0;
      frame.u16(spec.srcPort).u16(spec.dstPort).u32(spec.seq ?? 0).u32(spec.ack ?? 0).u8(0x50).u8(flags).u16(64240).u16(0).u16(0);
    } else {
      frame.u16(spec.srcPort).u16(spec.dstPort).u16(8 + payload.length).u16(0);
    }
    frame.raw(payload);
    return { time: spec.time, data: Uint8Array.from(frame.data), linkType: LINKTYPE.ETHERNET };
  });
}

/** Build and dissect a synthetic capture. */
export function buildPackets(specs: PacketSpec[]): Packet[] {
  return dissect(buildFrames(specs));
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
    const len = app ? encodeApp(app).length : 0;
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
