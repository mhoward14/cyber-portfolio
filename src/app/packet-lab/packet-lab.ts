import { Component, ChangeDetectionStrategy, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { EngagementService } from '../engagement/engagement.service';
import { compileFilter } from './display-filter';
import { dissect } from './dissect';
import { huntEvidence, huntSourceKey, recommendHunt } from './packet-lab-engagement';
import { HUNTS, Hunt, HuntId } from './packet-lab-scenarios';
import { Packet } from './packet-types';
import { CaptureError, MAX_FRAMES, readCapture, writePcap } from './pcap';

/** The packet list renders at most this many rows; filters still search everything. */
export const ROW_LIMIT = 2000;
export const MAX_FILE_BYTES = 100 * 1024 * 1024;
/** Hunt captures are stamped as if taken on this date when downloaded. */
const HUNT_EPOCH = Date.UTC(2026, 2, 2, 14, 5, 0) / 1000;

export interface OpenedFile {
  name: string;
  size: number;
  format: 'pcap' | 'pcapng';
  truncated: boolean;
  unsupportedLinkTypes: number[];
}

export interface CaptureSummary {
  duration: number;
  bytes: number;
  protocols: { key: string; label: string; count: number }[];
  hosts: { address: string; filter: string; count: number }[];
}

/** Protocols the summary counts, with their display names. */
const SUMMARY_PROTOCOLS: [string, string][] = [
  ['ip', 'IPv4'],
  ['ipv6', 'IPv6'],
  ['arp', 'ARP'],
  ['vlan', '802.1Q VLAN'],
  ['tcp', 'TCP'],
  ['udp', 'UDP'],
  ['icmp', 'ICMP'],
  ['icmpv6', 'ICMPv6'],
  ['tls', 'TLS'],
  ['http', 'HTTP'],
  ['dns', 'DNS'],
  ['ftp', 'FTP'],
  ['_ws.malformed', 'Malformed'],
];

/** Protocol counts (packets containing each protocol, so a count always
 *  equals what filtering on that protocol shows) and busiest hosts. */
export function summarize(packets: Packet[]): CaptureSummary {
  const protocols = new Map<string, { key: string; label: string; count: number }>();
  const hosts = new Map<string, { address: string; filter: string; count: number }>();
  let bytes = 0;
  for (const p of packets) {
    bytes += p.length;
    for (const [key, label] of SUMMARY_PROTOCOLS) {
      if (!p.fields.has(key)) continue;
      const entry = protocols.get(key) ?? { key, label, count: 0 };
      entry.count++;
      protocols.set(key, entry);
    }
    for (const [field, values] of [['ip.addr', p.fields.get('ip.addr')], ['ipv6.addr', p.fields.get('ipv6.addr')]] as const) {
      for (const v of new Set(values ?? [])) {
        const address = String(v);
        const h = hosts.get(address) ?? { address, filter: `${field} == ${address}`, count: 0 };
        h.count++;
        hosts.set(address, h);
      }
    }
  }
  const byCount = <T extends { count: number }>(a: T, b: T) => b.count - a.count;
  return {
    duration: packets.at(-1)?.time ?? 0,
    bytes,
    protocols: [...protocols.values()].sort(byCount).slice(0, 10),
    hosts: [...hosts.values()].sort(byCount).slice(0, 6),
  };
}

export interface HexRow {
  offset: string;
  cells: { hex: string; ascii: string; index: number }[];
}

/** Wireshark-style coloring rule for a packet-list row. */
export function rowClass(p: Packet): string {
  if (p.fields.get('tcp.flags.reset')?.[0] === 1) return 'row-rst';
  if (p.fields.has('http')) return 'row-http';
  if (p.fields.has('ftp')) return 'row-ftp';
  if (p.fields.has('dns')) return 'row-dns';
  if (p.fields.has('tls')) return 'row-tls';
  if (p.fields.get('tcp.flags.syn')?.[0] === 1 || p.fields.get('tcp.flags.fin')?.[0] === 1) return 'row-syn';
  return 'row-tcp';
}

export function hexRows(bytes: Uint8Array): HexRow[] {
  const rows: HexRow[] = [];
  for (let off = 0; off < bytes.length; off += 16) {
    const cells = [];
    for (let i = off; i < Math.min(off + 16, bytes.length); i++) {
      const b = bytes[i];
      cells.push({ hex: b.toString(16).padStart(2, '0'), ascii: b >= 0x20 && b < 0x7f ? String.fromCharCode(b) : '.', index: i });
    }
    rows.push({ offset: off.toString(16).padStart(4, '0'), cells });
  }
  return rows;
}

@Component({
  selector: 'app-packet-lab',
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: true,
  imports: [RouterLink],
  templateUrl: './packet-lab.html',
  styleUrl: './packet-lab.css',
})
export class PacketLab {
  readonly engagement = inject(EngagementService);
  readonly hunts = HUNTS;
  readonly rowLimit = ROW_LIMIT;
  readonly maxFrames = MAX_FRAMES;

  hunt = signal<Hunt | null>(null);
  /** A capture the visitor opened from disk (mutually exclusive with `hunt`). */
  file = signal<OpenedFile | null>(null);
  fileError = signal('');
  loading = signal(false);
  dragOver = signal(false);
  packets = signal<Packet[]>([]);

  /** True once this hunt's findings have been written to the engagement. */
  addedToEngagement = signal(false);

  /** Hunt matching the active engagement's attack chain, if any. */
  recommended = computed(() => {
    const s = this.engagement.state();
    if (!s || s.isSample) return null;
    return recommendHunt(s.techniques);
  });

  summary = computed(() => (this.file() ? summarize(this.packets()) : null));

  /** Text in the filter bar, validated as the visitor types. */
  filterText = signal('');
  /** The filter currently applied to the packet list. */
  appliedFilter = signal('');

  selectedNo = signal<number | null>(null);
  /** Byte range highlighted in the hex pane, [start, end). */
  highlight = signal<[number, number] | null>(null);
  collapsed = signal<Set<number>>(new Set());

  /** Index of the chosen option per question; absent until answered. */
  answers = signal<Record<number, number>>({});

  filterCheck = computed(() => compileFilter(this.filterText()));

  displayed = computed(() => {
    const f = compileFilter(this.appliedFilter());
    const all = this.packets();
    return f.ok ? all.filter(f.test) : all;
  });

  rows = computed(() => this.displayed().slice(0, ROW_LIMIT));

  selected = computed(() => this.packets().find((p) => p.no === this.selectedNo()) ?? null);

  hex = computed(() => {
    const p = this.selected();
    return p ? hexRows(p.bytes) : [];
  });

  answeredCount = computed(() => Object.keys(this.answers()).length);

  score = computed(() => {
    const h = this.hunt();
    if (!h) return 0;
    const a = this.answers();
    return h.questions.filter((q, i) => a[i] !== undefined && q.options[a[i]].correct).length;
  });

  complete = computed(() => {
    const h = this.hunt();
    return !!h && this.answeredCount() === h.questions.length;
  });

  readonly rowClass = rowClass;

  start(id: HuntId) {
    const h = this.hunts.find((x) => x.id === id)!;
    this.hunt.set(h);
    this.file.set(null);
    this.fileError.set('');
    this.addedToEngagement.set(false);
    this.packets.set(h.build());
    this.filterText.set('');
    this.appliedFilter.set('');
    this.answers.set({});
    this.collapsed.set(new Set());
    this.select(1);
    if (typeof window !== 'undefined') window.scrollTo({ top: 0 });
  }

  backToHunts() {
    this.hunt.set(null);
    this.file.set(null);
    this.packets.set([]);
    this.selectedNo.set(null);
  }

  onFileInput(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) this.openFile(file);
    input.value = '';
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    this.dragOver.set(false);
    const file = event.dataTransfer?.files?.[0];
    if (file) this.openFile(file);
  }

  /** Read and dissect a capture entirely in the browser. */
  async openFile(file: File) {
    this.fileError.set('');
    if (file.size > MAX_FILE_BYTES) {
      this.fileError.set(`That file is ${(file.size / 1048576).toFixed(0)} MB. The lab opens captures up to ${MAX_FILE_BYTES / 1048576} MB; trim it in Wireshark (File > Export Specified Packets) first.`);
      return;
    }
    this.loading.set(true);
    try {
      const buffer = await file.arrayBuffer();
      // Let the "Opening…" state paint before the synchronous parse.
      await new Promise((r) => setTimeout(r));
      const capture = readCapture(buffer);
      const packets = dissect(capture.frames);
      this.hunt.set(null);
      this.answers.set({});
      this.packets.set(packets);
      this.file.set({
        name: file.name,
        size: file.size,
        format: capture.format,
        truncated: capture.truncated,
        unsupportedLinkTypes: capture.unsupportedLinkTypes,
      });
      this.filterText.set('');
      this.appliedFilter.set('');
      this.collapsed.set(new Set());
      this.select(1);
    } catch (e) {
      if (!(e instanceof CaptureError)) console.error(e);
      this.fileError.set(e instanceof CaptureError ? e.message : 'The lab could not read that file. It may be corrupt or use an unsupported format.');
    } finally {
      this.loading.set(false);
    }
  }

  /** Save the current hunt's capture as a .pcap that opens in Wireshark. */
  downloadCapture() {
    const h = this.hunt();
    if (!h || typeof document === 'undefined') return;
    const blob = new Blob([writePcap(this.packets(), HUNT_EPOCH) as BlobPart], { type: 'application/vnd.tcpdump.pcap' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `packet-lab-${h.id}.pcap`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  addToEngagement() {
    const h = this.hunt();
    if (!h || !this.complete()) return;
    this.engagement.setEvidence(huntSourceKey(h.id), huntEvidence(h, this.packets()));
    this.addedToEngagement.set(true);
  }

  formatBytes(n: number) {
    if (n < 1024) return `${n} B`;
    if (n < 1048576) return `${(n / 1024).toFixed(1)} KB`;
    return `${(n / 1048576).toFixed(1)} MB`;
  }

  onFilterInput(value: string) {
    this.filterText.set(value);
  }

  applyFilter(text = this.filterText()) {
    this.filterText.set(text);
    if (!compileFilter(text).ok) return;
    this.appliedFilter.set(text);
    const shown = this.displayed();
    if (!shown.some((p) => p.no === this.selectedNo())) this.select(shown[0]?.no ?? null);
  }

  clearFilter() {
    this.applyFilter('');
  }

  select(no: number | null) {
    this.selectedNo.set(no);
    this.highlight.set(null);
  }

  /** Arrow keys move through the displayed packets, as in Wireshark. */
  onListKey(event: KeyboardEvent) {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    event.preventDefault();
    const shown = this.displayed();
    const i = shown.findIndex((p) => p.no === this.selectedNo());
    const next = shown[Math.max(0, Math.min(shown.length - 1, i + (event.key === 'ArrowDown' ? 1 : -1)))];
    if (next) {
      this.select(next.no);
      if (typeof document !== 'undefined') {
        document.getElementById(`pkt-${next.no}`)?.scrollIntoView({ block: 'nearest' });
      }
    }
  }

  toggleLayer(i: number, range: [number, number]) {
    const next = new Set(this.collapsed());
    if (next.has(i)) next.delete(i);
    else next.add(i);
    this.collapsed.set(next);
    this.highlight.set(range);
  }

  highlightRange(range: [number, number] | undefined) {
    if (range) this.highlight.set(range);
  }

  isHighlighted(index: number) {
    const h = this.highlight();
    return !!h && index >= h[0] && index < h[1];
  }

  answer(q: number, option: number) {
    if (this.answers()[q] !== undefined) return;
    this.answers.set({ ...this.answers(), [q]: option });
  }

  restart() {
    const h = this.hunt();
    if (h) this.start(h.id);
  }

  formatTime(t: number) {
    return t.toFixed(6);
  }
}
