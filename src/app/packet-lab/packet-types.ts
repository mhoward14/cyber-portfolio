/* ============================================================
   PACKET-TYPES.TS — PACKET ANALYSIS LAB
   The dissected-packet shape shared by the dissector, the display
   filter, and the workbench UI.
   ============================================================ */

export type FieldValue = string | number;

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
  /** Seconds since the first frame in the capture. */
  time: number;
  src: string;
  dst: string;
  protocol: string;
  /** Length on the wire (may exceed the captured bytes). */
  length: number;
  info: string;
  bytes: Uint8Array;
  layers: Layer[];
  /** Display-filter fields. Multi-valued fields (ip.addr, tcp.port) hold every value. */
  fields: Map<string, FieldValue[]>;
}

/** One captured frame before dissection. */
export interface RawFrame {
  /** Capture timestamp in seconds (absolute or relative; only differences matter). */
  time: number;
  data: Uint8Array;
  /** Original length on the wire, when the capture was truncated by a snaplen. */
  origLen?: number;
  /** pcap LINKTYPE_* value for the interface the frame came from. */
  linkType: number;
}
