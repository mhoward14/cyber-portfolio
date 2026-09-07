import { Component, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CONTROLS, BaselineControl, ControlStatus, STATUS_LABEL, Tier, TIER_ORDER } from './rmf-data';

interface TrackerState {
  tier: Tier | null;
  statuses: Record<string, ControlStatus>;
  notes: Record<string, string>;
  sample: boolean;
}

const STORAGE_KEY = 'rmf-tracker-state';

const PARTIAL_NOTES = [
  'Compensating control in place; full implementation targeted next quarter.',
  'Implemented for production; staging environment still pending.',
  'Manual process today — automation ticket filed for next sprint.',
  'Covers primary data center; DR site remediation in progress.'
];
const NA_NOTES = [
  'N/A — system has no wireless interfaces in its authorization boundary.',
  'N/A — function performed by the cloud service provider under the shared responsibility model; see provider ATO.',
  'N/A — no removable media permitted per system design.'
];
const OPEN_NOTES = [
  'Not yet started — scheduled for next assessment cycle.',
  'Awaiting budget approval for tooling before implementation can begin.',
  'Identified during self-assessment; POA&M item drafted.'
];

function loadState(): { state: TrackerState; fromStorage: boolean } {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (saved) return { state: saved, fromStorage: true };
  } catch {
    /* ignore malformed storage */
  }
  return { state: seedSampleState(), fromStorage: false };
}

/** First-ever visit: seed a plausible in-progress Moderate-baseline assessment
 * so the page opens showing what the tool looks like mid-use, not an all-red
 * empty shell. Deterministic (by index), clearly flagged as sample data, and
 * fully editable — click any control to change it. */
function seedSampleState(): TrackerState {
  const state: TrackerState = { tier: 'moderate', statuses: {}, notes: {}, sample: true };
  let pIdx = 0, nIdx = 0, oIdx = 0;
  CONTROLS.forEach((c, i) => {
    if (TIER_ORDER[c.baseline] > TIER_ORDER.moderate) return;
    const bucket = i % 10;
    if (bucket <= 5) {
      state.statuses[c.id] = 'implemented';
    } else if (bucket <= 7) {
      state.statuses[c.id] = 'partial';
      state.notes[c.id] = PARTIAL_NOTES[pIdx++ % PARTIAL_NOTES.length];
    } else if (bucket === 8) {
      state.statuses[c.id] = 'na';
      state.notes[c.id] = NA_NOTES[nIdx++ % NA_NOTES.length];
    } else {
      state.statuses[c.id] = 'not-implemented';
      state.notes[c.id] = OPEN_NOTES[oIdx++ % OPEN_NOTES.length];
    }
  });
  return state;
}

@Component({
  selector: 'app-rmf-tracker',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './rmf-tracker.html',
  styleUrl: './rmf-tracker.css'
})
export class RmfTracker {
  readonly controls = CONTROLS;
  readonly statusLabel = STATUS_LABEL;
  readonly statusKeys: ControlStatus[] = ['implemented', 'partial', 'not-implemented', 'na'];
  readonly tiers: { key: Tier; label: string; name: string; desc: string }[] = [
    { key: 'low', label: 'Low Baseline', name: 'Low Impact', desc: 'Loss of confidentiality, integrity, or availability would have a limited adverse effect.' },
    { key: 'moderate', label: 'Moderate Baseline', name: 'Moderate Impact', desc: 'Loss would have a serious adverse effect on operations, assets, or individuals.' },
    { key: 'high', label: 'High Baseline', name: 'High Impact', desc: 'Loss would have a severe or catastrophic adverse effect. Superset of Moderate.' }
  ];

  private loaded = loadState();
  tier = signal<Tier | null>(this.loaded.state.tier);
  statuses = signal<Record<string, ControlStatus>>(this.loaded.state.statuses);
  notes = signal<Record<string, string>>(this.loaded.state.notes);
  sample = signal(this.loaded.state.sample);

  query = signal('');
  familyFilter = signal('all');
  statusFilter = signal('all');
  expandedId = signal<string | null>(null);
  poamOpen = signal(false);

  constructor() {
    if (!this.loaded.fromStorage) {
      this.persist();
    }
  }

  activeControls = computed<BaselineControl[]>(() => {
    const tier = this.tier();
    if (!tier) return [];
    const maxOrder = TIER_ORDER[tier];
    return this.controls.filter((c) => TIER_ORDER[c.baseline] <= maxOrder);
  });

  families = computed(() => Array.from(new Set(this.activeControls().map((c) => c.family))));

  filtered = computed(() => {
    const term = this.query().trim().toLowerCase();
    const family = this.familyFilter();
    const status = this.statusFilter();
    return this.activeControls().filter((c) => {
      if (family !== 'all' && c.family !== family) return false;
      if (status !== 'all' && this.statusOf(c.id) !== status) return false;
      if (term && !(c.id.toLowerCase().includes(term) || c.title.toLowerCase().includes(term) || c.family.toLowerCase().includes(term))) {
        return false;
      }
      return true;
    });
  });

  groupedByFamily = computed(() => {
    const groups = new Map<string, BaselineControl[]>();
    for (const c of this.filtered()) {
      const list = groups.get(c.family) ?? [];
      list.push(c);
      groups.set(c.family, list);
    }
    return Array.from(groups.entries()).map(([family, controls]) => ({ family, controls }));
  });

  summary = computed(() => {
    const all = this.activeControls();
    const counts: Record<ControlStatus, number> = { implemented: 0, partial: 0, 'not-implemented': 0, na: 0 };
    all.forEach((c) => counts[this.statusOf(c.id)]++);
    const total = all.length || 1;
    const pct = Math.round((counts.implemented / total) * 100);
    const circumference = 226;
    const offset = circumference - (circumference * pct) / 100;
    return { total: all.length, counts, pct, ringOffset: offset };
  });

  poamText = computed(() => {
    const tier = this.tier();
    if (!tier) return '';
    const items = this.activeControls().filter((c) => {
      const s = this.statusOf(c.id);
      return s === 'partial' || s === 'not-implemented';
    });
    if (items.length === 0) {
      return `No open items — every control in the ${tier} baseline is Implemented or N/A.`;
    }
    const lines = ['PLAN OF ACTION & MILESTONES — DRAFT', `Baseline: ${tier.toUpperCase()}`, `Open items: ${items.length}`, ''];
    items.forEach((c) => {
      lines.push(`${c.id} — ${c.title} [${this.statusLabel[this.statusOf(c.id)]}]`);
      lines.push(`  Family: ${c.family}`);
      lines.push(`  Weakness/Note: ${this.notes()[c.id] || '(no note recorded)'}`);
      lines.push('');
    });
    return lines.join('\n');
  });

  statusOf(id: string): ControlStatus {
    return this.statuses()[id] || 'not-implemented';
  }

  selectTier(tier: Tier) {
    this.tier.set(tier);
    this.expandedId.set(null);
    this.persist();
  }

  setStatus(id: string, status: ControlStatus) {
    this.statuses.update((s) => ({ ...s, [id]: status }));
    this.persist();
  }

  setNote(id: string, note: string) {
    this.notes.update((n) => ({ ...n, [id]: note }));
    this.persist();
  }

  toggleExpand(id: string) {
    this.expandedId.set(this.expandedId() === id ? null : id);
  }

  togglePoam() {
    this.poamOpen.set(!this.poamOpen());
  }

  copyPoam() {
    const text = this.poamText();
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).catch(() => {});
    }
  }

  private persist() {
    const state: TrackerState = {
      tier: this.tier(),
      statuses: this.statuses(),
      notes: this.notes(),
      sample: this.sample()
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* storage unavailable — state just won't persist across reloads */
    }
  }
}
