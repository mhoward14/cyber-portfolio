/* ============================================================
   SSP.TS — SSP GENERATOR
   Describe a system, and the page drafts a System Security Plan from
   that description plus what the RMF Tracker and Engagement Mode
   already hold. The draft can be printed, saved as a PDF or downloaded
   as Markdown. Everything runs in the browser and inputs stay there.
   ============================================================ */

import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { EngagementService } from '../engagement/engagement.service';
import { loadTrackerState } from '../rmf-tracker/rmf-saved';
import { dateStamp, downloadText, fileSlug } from '../share/export-file';
import { isPlainObject, oneOf, readStored } from '../security/stored-state';
import {
  CONTOSO_INPUT, EMPTY_INPUT, HOSTING_OPTIONS, IMPACTS, IMPACT_LABEL, LIMITS, STATUS_OPTIONS,
  Hosting, Impact, OperationalStatus, SspInput, buildSsp, overallImpact,
} from './ssp-model';
import { sspMarkdown } from './ssp-markdown';
import {
  ActivityId, CODE_LABEL, CODE_SHOWN, EXAMPLE_RACI, RACI_ACTIVITIES, RACI_ROLES, RoleId, codeOf, cycleCell, hasAssignments,
  loads, problemSummary, raciCsv, sanitizeRaci, checkActivity,
} from './raci';

const STORAGE_KEY = 'ssp-input-v1';

const text = (max: number) => (v: unknown, fallback: string) => (typeof v === 'string' ? v.slice(0, max) : fallback);

/** Read the saved description back as untrusted input: every field checked, anything odd replaced by its default. */
export function loadInput(): SspInput {
  const saved = readStored(STORAGE_KEY);
  if (!isPlainObject(saved)) return { ...EMPTY_INPUT };
  const impact = oneOf<Impact>(IMPACTS);
  const pick = <T extends string>(v: unknown, ok: (x: unknown) => x is T, fallback: T): T => (ok(v) ? v : fallback);
  return {
    name: text(LIMITS.name)(saved['name'], ''),
    abbreviation: text(LIMITS.abbreviation)(saved['abbreviation'], ''),
    description: text(LIMITS.description)(saved['description'], ''),
    confidentiality: pick(saved['confidentiality'], impact, EMPTY_INPUT.confidentiality),
    integrity: pick(saved['integrity'], impact, EMPTY_INPUT.integrity),
    availability: pick(saved['availability'], impact, EMPTY_INPUT.availability),
    status: pick(saved['status'], oneOf<OperationalStatus>(Object.keys(STATUS_OPTIONS) as OperationalStatus[]), EMPTY_INPUT.status),
    hosting: pick(saved['hosting'], oneOf<Hosting>(Object.keys(HOSTING_OPTIONS) as Hosting[]), EMPTY_INPUT.hosting),
    boundary: text(LIMITS.boundary)(saved['boundary'], ''),
    raci: sanitizeRaci(saved['raci']),
  };
}

@Component({
  selector: 'app-ssp',
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: true,
  imports: [RouterLink],
  templateUrl: './ssp.html',
  styleUrl: './ssp.css',
})
export class Ssp {
  readonly engagement = inject(EngagementService);

  readonly impacts = IMPACTS;
  readonly impactLabel = IMPACT_LABEL;
  readonly statusOptions = Object.entries(STATUS_OPTIONS) as [OperationalStatus, string][];
  readonly hostingOptions = Object.entries(HOSTING_OPTIONS) as [Hosting, string][];
  readonly limits = LIMITS;
  readonly roles = RACI_ROLES;
  readonly activities = RACI_ACTIVITIES;
  readonly codeLabel = CODE_LABEL;
  readonly codeShown = CODE_SHOWN;

  input = signal<SspInput>(loadInput());
  notice = signal('');

  /** Read once when the page opens; the tracker is another page, so it cannot change underneath this one. */
  private readonly tracker = loadTrackerState().state;

  readonly model = computed(() => buildSsp(this.input(), this.tracker, this.engagement.state()));
  readonly overall = computed(() => overallImpact(this.input()));
  readonly hasInput = computed(() => !!(this.input().name.trim() || this.input().description.trim() || this.input().boundary.trim() || hasAssignments(this.input().raci)));

  readonly raci = computed(() => this.input().raci);
  readonly hasRaci = computed(() => hasAssignments(this.raci()));
  readonly raciLoads = computed(() => loads(this.raci()));
  /** Per-activity problems, for the check chip on each row. */
  readonly rowChecks = computed(() => new Map(RACI_ACTIVITIES.map((a) => [a.id, checkActivity(this.raci(), a.id).map((p) => p.text)])));
  readonly raciSummary = computed(() => problemSummary(this.raci()));
  readonly raciStatus = computed(() => {
    if (!this.hasRaci()) return 'Nothing assigned yet. Press a cell to give a role a part in an activity.';
    return this.raciSummary() ?? 'Every activity has one Accountable role and someone doing the work.';
  });

  readonly sources = computed(() => {
    const e = this.engagement.state();
    const m = this.model();
    return {
      trackerTier: this.tracker.tier,
      trackerSample: this.tracker.sample,
      controls: m.counts.total,
      engagement: e,
      techniques: e?.techniques.length ?? 0,
      controlsInEngagement: e?.controls.length ?? 0,
      poams: e?.poams.length ?? 0,
      findings: e?.findings?.length ?? 0,
      risks: e?.risks?.length ?? 0,
    };
  });

  update<K extends keyof SspInput>(key: K, value: SspInput[K]) {
    this.input.update((i) => ({ ...i, [key]: value }));
    this.save();
  }

  loadExample() {
    this.input.set({ ...CONTOSO_INPUT });
    this.save();
    this.notice.set('Loaded the fictional Contoso Payments Portal and its example RACI matrix.');
  }

  /** The accessible name of a cell: what it is, then what it is set to, so a screen reader hears both. */
  cellLabel(activity: ActivityId, role: RoleId): string {
    const a = RACI_ACTIVITIES.find((x) => x.id === activity)!;
    const r = RACI_ROLES.find((x) => x.id === role)!;
    return `${a.label}, ${r.short}: ${CODE_LABEL[codeOf(this.raci(), activity, role)]}`;
  }

  cellCode(activity: ActivityId, role: RoleId) {
    return codeOf(this.raci(), activity, role);
  }

  /** Step one cell to its next value and say what it became. */
  cycle(activity: ActivityId, role: RoleId) {
    const raci = cycleCell(this.raci(), activity, role);
    this.input.update((i) => ({ ...i, raci }));
    this.save();
    this.notice.set(`${this.cellLabel(activity, role)}.`);
  }

  loadRaciExample() {
    this.input.update((i) => ({ ...i, raci: { ...EXAMPLE_RACI } }));
    this.save();
    this.notice.set('Loaded the example RACI matrix.');
  }

  clearRaci() {
    this.input.update((i) => ({ ...i, raci: {} }));
    this.save();
    this.notice.set('Cleared the RACI matrix.');
  }

  downloadRaci() {
    downloadText(`raci-matrix-${dateStamp()}.csv`, raciCsv(this.raci()), 'text/csv');
  }

  clear() {
    this.input.set({ ...EMPTY_INPUT });
    this.save();
    this.notice.set('Cleared the description.');
  }

  download() {
    const m = this.model();
    downloadText(`ssp-draft-${fileSlug(m.identification.name) || 'system'}-${dateStamp()}.md`, sspMarkdown(m), 'text/markdown');
  }

  print() {
    window.print();
  }

  private save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.input()));
    } catch {
      /* storage unavailable: the description just won't survive a reload */
    }
  }
}
