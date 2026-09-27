import { Component, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { compileFilter } from './display-filter';
import { HUNTS, Hunt, HuntId } from './packet-lab-scenarios';
import { Packet } from './packet-model';

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
  standalone: true,
  imports: [RouterLink],
  templateUrl: './packet-lab.html',
  styleUrl: './packet-lab.css',
})
export class PacketLab {
  readonly hunts = HUNTS;

  hunt = signal<Hunt | null>(null);
  packets = signal<Packet[]>([]);

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
    this.packets.set([]);
    this.selectedNo.set(null);
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
