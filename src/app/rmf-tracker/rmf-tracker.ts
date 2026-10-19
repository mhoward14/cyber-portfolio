import { Component, ChangeDetectionStrategy, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ShareBanner, ShareButton, ShareSession } from '../share/share-link';
import { decodeRmf, encodeRmf } from './rmf-share';
import { rmfAssessmentCsv, rmfPoamCsv } from './rmf-export';
import { ExportButton, dateStamp, downloadText } from '../share/export-file';
import { ArrivedFromBanner } from '../engagement/arrived-from';
import { CONTROLS, BaselineControl, ControlStatus, STATUS_LABEL, Tier, TIER_ORDER } from './rmf-data';
import { EngagementService } from '../engagement/engagement.service';
import { EngagementPoam } from '../engagement/engagement.model';
import { buildEngagementPoams, importEngagementControls, requiredTier } from './rmf-engagement';
import { RMF_STORAGE_KEY, TrackerState, loadTrackerState } from './rmf-saved';

@Component({
  selector: 'app-rmf-tracker',
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ArrivedFromBanner, ShareBanner, ShareButton, ExportButton],
  templateUrl: './rmf-tracker.html',
  styleUrl: './rmf-tracker.css'
})
export class RmfTracker {
  readonly engagement = inject(EngagementService);
  readonly controls = CONTROLS;
  readonly statusLabel = STATUS_LABEL;
  readonly statusKeys: ControlStatus[] = ['implemented', 'partial', 'not-implemented', 'na'];
  readonly tiers: { key: Tier; label: string; name: string; desc: string }[] = [
    { key: 'low', label: 'Low Baseline', name: 'Low Impact', desc: 'Loss of confidentiality, integrity, or availability would have a limited adverse effect.' },
    { key: 'moderate', label: 'Moderate Baseline', name: 'Moderate Impact', desc: 'Loss would have a serious adverse effect on operations, assets, or individuals.' },
    { key: 'high', label: 'High Baseline', name: 'High Impact', desc: 'Loss would have a severe or catastrophic adverse effect. Superset of Moderate.' }
  ];

  private loaded = loadTrackerState();
  tier = signal<Tier | null>(this.loaded.state.tier);
  statuses = signal<Record<string, ControlStatus>>(this.loaded.state.statuses);
  notes = signal<Record<string, string>>(this.loaded.state.notes);
  sample = signal(this.loaded.state.sample);

  query = signal('');
  familyFilter = signal('all');
  statusFilter = signal('all');
  expandedId = signal<string | null>(null);
  poamOpen = signal(false);

  readonly share = new ShareSession();
  /** Tier and statuses only: notes are free text and never leave the browser. */
  shareCode = computed(() => (this.tier() ? encodeRmf({ tier: this.tier(), statuses: this.statuses() }) : null));

  constructor() {
    if (!this.loaded.fromStorage) {
      this.persist();
    }
    this.share.open((code) => {
      const shared = decodeRmf(code);
      if (!shared) return false;
      this.tier.set(shared.tier);
      this.statuses.set(shared.statuses);
      this.notes.set({});
      this.sample.set(false);
      return true;
    });
  }

  keepShared() {
    this.share.close();
    this.persist();
  }

  discardShared() {
    this.share.close();
    const own = loadTrackerState().state;
    this.tier.set(own.tier);
    this.statuses.set(own.statuses);
    this.notes.set(own.notes);
    this.sample.set(own.sample);
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

  // ---- Engagement Mode ----

  /** True when the visitor has their own (non-sample) engagement. */
  ownEngagement = computed(() => {
    const s = this.engagement.state();
    return !!s && !s.isSample;
  });

  /** Tracker statuses implied by the controls other tools added. */
  engagementImport = computed(() =>
    this.ownEngagement() ? importEngagementControls(this.engagement.state()!.controls) : [],
  );

  importCounts = computed(() => {
    const counts: Record<ControlStatus, number> = { implemented: 0, partial: 0, 'not-implemented': 0, na: 0 };
    for (const i of this.engagementImport()) counts[i.status]++;
    return counts;
  });

  importInSync = computed(() => {
    const items = this.engagementImport();
    const tier = this.tier();
    if (items.length === 0 || !tier) return false;
    const inScope = TIER_ORDER[requiredTier(items.map((i) => i.id))] <= TIER_ORDER[tier];
    return inScope && items.every((i) => this.statusOf(i.id) === i.status);
  });

  /** Baseline the last import had to raise, if any, so the page can say so. */
  tierRaisedTo = signal<Tier | null>(null);

  /** Draft POA&M items for engagement controls still open in the tracker. */
  engagementPoams = computed<EngagementPoam[]>(() =>
    this.ownEngagement() ? buildEngagementPoams(this.engagement.state()!, (id) => this.statusOf(id)) : [],
  );

  poamsInSync = computed(() => {
    const saved = this.engagement.state()?.poams ?? [];
    return poamSignature(saved) === poamSignature(this.engagementPoams());
  });

  importFromEngagement() {
    const items = this.engagementImport();
    if (items.length === 0) return;
    const needed = requiredTier(items.map((i) => i.id));
    const current = this.tier();
    if (!current || TIER_ORDER[needed] > TIER_ORDER[current]) {
      this.tier.set(needed);
      this.tierRaisedTo.set(needed);
    } else {
      this.tierRaisedTo.set(null);
    }
    this.statuses.update((st) => ({ ...st, ...Object.fromEntries(items.map((i) => [i.id, i.status])) }));
    this.notes.update((n) => ({ ...n, ...Object.fromEntries(items.map((i) => [i.id, i.note])) }));
    this.persist();
  }

  sendPoamsToEngagement() {
    this.engagement.setPoams(this.engagementPoams());
  }

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

  /** Result of the last copy, shown next to the button. */
  poamCopyStatus = signal('');

  async copyPoam() {
    try {
      await navigator.clipboard.writeText(this.poamText());
      this.poamCopyStatus.set('Copied');
    } catch {
      this.poamCopyStatus.set('Copy failed. Select the text above and copy it manually.');
    }
  }

  private exportInput() {
    const tier = this.tier();
    return tier ? { tier, controls: this.activeControls(), statusOf: (id: string) => this.statusOf(id), notes: this.notes() } : null;
  }

  downloadAssessment() {
    const x = this.exportInput();
    if (x) downloadText(`rmf-assessment-${x.tier}-${dateStamp()}.csv`, rmfAssessmentCsv(x));
  }

  downloadPoam() {
    const x = this.exportInput();
    if (x) downloadText(`poam-draft-${x.tier}-${dateStamp()}.csv`, rmfPoamCsv(x));
  }

  private persist() {
    if (this.share.viewing()) return;
    const state: TrackerState = {
      tier: this.tier(),
      statuses: this.statuses(),
      notes: this.notes(),
      sample: this.sample()
    };
    try {
      localStorage.setItem(RMF_STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* storage unavailable — state just won't persist across reloads */
    }
  }
}

function poamSignature(poams: EngagementPoam[]): string {
  return poams.map((p) => `${p.controlId}|${p.targetDays}|${p.weakness}|${p.milestone}`).join('\n');
}
