/* ============================================================
   PCAP.TS — PACKET ANALYSIS LAB
   Reads classic pcap (either byte order, micro- or nanosecond
   timestamps) and pcapng (SHB/IDB/EPB/SPB, per-interface link types
   and timestamp resolution), and writes classic pcap so a hunt's
   capture can be opened in Wireshark. Everything runs in the
   browser; files are never uploaded.
   ============================================================ */

import { SUPPORTED_LINKTYPES } from './dissect';
import { Packet, RawFrame } from './packet-types';

export class CaptureError extends Error {}

export interface Capture {
  format: 'pcap' | 'pcapng';
  frames: RawFrame[];
  /** True when the file ended mid-record or hit the frame limit. */
  truncated: boolean;
  /** Link types seen in the file that the dissector does not decode. */
  unsupportedLinkTypes: number[];
}

export const MAX_FRAMES = 100_000;
const MAX_RECORD = 256 * 1024;

export function readCapture(buffer: ArrayBuffer, maxFrames = MAX_FRAMES): Capture {
  const view = new DataView(buffer);
  if (buffer.byteLength < 24) throw new CaptureError('This file is too small to be a packet capture.');
  const magicBE = view.getUint32(0, false);
  let capture: Capture;
  if (magicBE === 0x0a0d0d0a) capture = readPcapng(view, maxFrames);
  else if ([0xa1b2c3d4, 0xd4c3b2a1, 0xa1b23c4d, 0x4d3cb2a1].includes(magicBE)) capture = readPcap(view, magicBE, maxFrames);
  else if (view.getUint16(0, false) === 0x1f8b) throw new CaptureError('This capture is gzip-compressed. Decompress it first, then open the .pcap or .pcapng file.');
  else throw new CaptureError('This is not a pcap or pcapng file. Save the capture from Wireshark or tcpdump in one of those formats.');

  if (!capture.frames.length) throw new CaptureError('The capture contains no packets.');
  if (capture.frames.every((f) => !SUPPORTED_LINKTYPES.has(f.linkType))) {
    throw new CaptureError(
      `This capture uses link-layer type ${capture.unsupportedLinkTypes.join(', ')}, which the lab does not decode. ` +
        'Supported: Ethernet, raw IP, Linux cooked capture, and BSD loopback.',
    );
  }
  return capture;
}

function bytesAt(view: DataView, offset: number, length: number) {
  return new Uint8Array(view.buffer, view.byteOffset + offset, length).slice();
}

function readPcap(view: DataView, magicBE: number, maxFrames: number): Capture {
  const little = magicBE === 0xd4c3b2a1 || magicBE === 0x4d3cb2a1;
  const nano = magicBE === 0xa1b23c4d || magicBE === 0x4d3cb2a1;
  const linkType = view.getUint32(20, little) & 0x0fffffff;
  const frames: RawFrame[] = [];
  let truncated = false;
  let o = 24;
  while (o < view.byteLength) {
    if (frames.length >= maxFrames) {
      truncated = true;
      break;
    }
    if (o + 16 > view.byteLength) {
      truncated = true;
      break;
    }
    const sec = view.getUint32(o, little);
    const frac = view.getUint32(o + 4, little);
    const incl = view.getUint32(o + 8, little);
    const orig = view.getUint32(o + 12, little);
    if (incl > MAX_RECORD) throw new CaptureError(`Record ${frames.length + 1} claims ${incl} bytes, so the file looks corrupt.`);
    if (o + 16 + incl > view.byteLength) {
      truncated = true;
      break;
    }
    frames.push({ time: sec + frac / (nano ? 1e9 : 1e6), data: bytesAt(view, o + 16, incl), origLen: orig, linkType });
    o += 16 + incl;
  }
  return { format: 'pcap', frames, truncated, unsupportedLinkTypes: SUPPORTED_LINKTYPES.has(linkType) ? [] : [linkType] };
}

interface Interface {
  linkType: number;
  /** Timestamp units per second. */
  units: number;
}

function readPcapng(view: DataView, maxFrames: number): Capture {
  const frames: RawFrame[] = [];
  const unsupported = new Set<number>();
  let interfaces: Interface[] = [];
  let little = true;
  let truncated = false;
  let lastTime = 0;
  let o = 0;
  while (o + 12 <= view.byteLength) {
    if (frames.length >= maxFrames) {
      truncated = true;
      break;
    }
    const typeBE = view.getUint32(o, false);
    if (typeBE === 0x0a0d0d0a) {
      const bom = view.getUint32(o + 8, true);
      if (bom === 0x1a2b3c4d) little = true;
      else if (bom === 0x4d3c2b1a) little = false;
      else throw new CaptureError('The pcapng section header is corrupt.');
      interfaces = [];
    }
    const type = view.getUint32(o, little);
    const len = view.getUint32(o + 4, little);
    if (len < 12 || len % 4 !== 0) throw new CaptureError('A pcapng block has an invalid length, so the file looks corrupt.');
    if (o + len > view.byteLength) {
      truncated = true;
      break;
    }
    const body = o + 8;
    if (type === 0x00000001) {
      const linkType = view.getUint16(body, little);
      let units = 1e6;
      // Options start after linktype(2) + reserved(2) + snaplen(4).
      for (let p = body + 8; p + 4 <= o + len - 4; ) {
        const code = view.getUint16(p, little);
        const olen = view.getUint16(p + 2, little);
        if (code === 0) break;
        if (code === 9 && olen >= 1) {
          const r = view.getUint8(p + 4);
          units = r & 0x80 ? 2 ** (r & 0x7f) : 10 ** r;
        }
        p += 4 + Math.ceil(olen / 4) * 4;
      }
      interfaces.push({ linkType, units });
      if (!SUPPORTED_LINKTYPES.has(linkType)) unsupported.add(linkType);
    } else if (type === 0x00000006 || type === 0x00000002) {
      const enhanced = type === 0x00000006;
      const ifIndex = enhanced ? view.getUint32(body, little) : view.getUint16(body, little);
      const iface = interfaces[ifIndex];
      if (!iface) throw new CaptureError('A packet refers to an interface the file never describes.');
      const high = view.getUint32(body + 4, little);
      const low = view.getUint32(body + 8, little);
      const capLen = view.getUint32(body + 12, little);
      const origLen = view.getUint32(body + 16, little);
      if (capLen > MAX_RECORD || body + 20 + capLen > o + len) throw new CaptureError('A packet block is larger than its container, so the file looks corrupt.');
      lastTime = (high * 2 ** 32 + low) / iface.units;
      frames.push({ time: lastTime, data: bytesAt(view, body + 20, capLen), origLen, linkType: iface.linkType });
    } else if (type === 0x00000003) {
      const iface = interfaces[0];
      if (!iface) throw new CaptureError('A packet refers to an interface the file never describes.');
      const origLen = view.getUint32(body, little);
      const capLen = Math.min(origLen, len - 16);
      frames.push({ time: lastTime, data: bytesAt(view, body + 4, capLen), origLen, linkType: iface.linkType });
    }
    o += len;
  }
  return { format: 'pcapng', frames, truncated, unsupportedLinkTypes: [...unsupported] };
}

/** Classic little-endian pcap with microsecond timestamps, Ethernet link type. */
export function writePcap(packets: Packet[], baseEpochSeconds: number): Uint8Array {
  const size = 24 + packets.reduce((n, p) => n + 16 + p.bytes.length, 0);
  const out = new Uint8Array(size);
  const view = new DataView(out.buffer);
  view.setUint32(0, 0xa1b2c3d4, true);
  view.setUint16(4, 2, true);
  view.setUint16(6, 4, true);
  view.setUint32(16, 262144, true);
  view.setUint32(20, 1, true);
  let o = 24;
  for (const p of packets) {
    const t = baseEpochSeconds + p.time;
    let sec = Math.floor(t);
    let usec = Math.round((t - sec) * 1e6);
    if (usec >= 1e6) {
      sec += 1;
      usec -= 1e6;
    }
    view.setUint32(o, sec, true);
    view.setUint32(o + 4, usec, true);
    view.setUint32(o + 8, p.bytes.length, true);
    view.setUint32(o + 12, p.length, true);
    out.set(p.bytes, o + 16);
    o += 16 + p.bytes.length;
  }
  return out;
}
