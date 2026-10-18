/* ============================================================
   VULN-PRIORITY.TS — VULNERABILITY PRIORITIZER
   Score a finding with CVSS v3.1, add the facts CVSS leaves out
   (is it being exploited, can it be reached, how much does the system
   matter) and get a ranked remediation order. Results can go into
   Engagement Mode as remediation items under RA-5 and SI-2, or out
   as a POA&M-style worksheet. Everything runs in the browser.
   ============================================================ */

import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { EngagementService } from '../engagement/engagement.service';
import { EngagementFinding, MAX_FINDINGS } from '../engagement/engagement.model';
import { ExportButton, dateStamp, downloadText, reportCsv } from '../share/export-file';
import {
  CvssMetrics, DEFAULT_METRICS, METRICS, MetricKey, Severity, baseScore, parseVector, severityOf, toVector,
} from './cvss';
import { PRIORITY_LABEL, Criticality, Exploitation, Exposure, TARGET_DAYS, prioritize } from './priority';
import { buildFinding, sortFindings } from './finding';

const TITLE_MAX = 120;
const ASSET_MAX = 80;

export const EXAMPLE_FINDINGS: { title: string; asset: string; vector: string; exploitation: Exploitation; exposure: Exposure; criticality: Criticality }[] = [
  { title: 'Remote code execution in the VPN appliance', asset: 'VPN gateway', vector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H', exploitation: 'active', exposure: 'internet', criticality: 'high' },
  { title: 'Local privilege escalation on the file server', asset: 'FS-02', vector: 'CVSS:3.1/AV:L/AC:L/PR:L/UI:N/S:U/C:H/I:H/A:H', exploitation: 'public', exposure: 'internal', criticality: 'high' },
  { title: 'Information disclosure in the customer API', asset: 'Customer API', vector: 'CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:N/A:N', exploitation: 'none', exposure: 'internet', criticality: 'high' },
  { title: 'Reflected cross-site scripting in the intranet portal', asset: 'Intranet portal', vector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:C/C:L/I:L/A:N', exploitation: 'none', exposure: 'internal', criticality: 'low' },
  { title: 'Denial of service in a lab print server', asset: 'Lab print server', vector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:H', exploitation: 'none', exposure: 'internal', criticality: 'low' },
];

/** The same facts in the same order mean the engagement already holds this list. */
function signature(list: EngagementFinding[]): string {
  return list
    .map((f) => [f.title, f.asset, f.vector, f.exploitation, f.exposure, f.criticality].join('|'))
    .join('\n');
}

@Component({
  selector: 'app-vuln-priority',
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: true,
  imports: [RouterLink, ExportButton],
  templateUrl: './vuln-priority.html',
  styleUrl: './vuln-priority.css',
})
export class VulnPriority {
  readonly engagement = inject(EngagementService);

  readonly metricDefs = METRICS;
  readonly titleMax = TITLE_MAX;
  readonly assetMax = ASSET_MAX;
  readonly maxFindings = MAX_FINDINGS;
  readonly priorityLabel = PRIORITY_LABEL;
  readonly targetDays = TARGET_DAYS;

  title = signal('');
  asset = signal('');
  metrics = signal<CvssMetrics>({ ...DEFAULT_METRICS });
  exploitation = signal<Exploitation>('none');
  exposure = signal<Exposure>('internal');
  criticality = signal<Criticality>('moderate');
  vectorText = signal('');
  vectorError = signal('');
  notice = signal('');

  /** Start from the visitor's own engagement so a round trip through the report keeps their list. */
  findings = signal<EngagementFinding[]>(this.initialFindings());

  readonly ranked = computed(() => sortFindings(this.findings()));
  readonly score = computed(() => baseScore(this.metrics()));
  readonly severity = computed<Severity>(() => severityOf(this.score()));
  readonly vector = computed(() => toVector(this.metrics()));
  readonly preview = computed(() =>
    prioritize({ severity: this.severity(), exploitation: this.exploitation(), exposure: this.exposure(), criticality: this.criticality() }),
  );
  readonly canAdd = computed(() => this.title().trim().length > 0 && this.findings().length < MAX_FINDINGS);

  readonly inEngagement = computed(() => {
    const saved = this.engagement.state();
    return !!saved && !saved.isSample && signature(saved.findings ?? []) === signature(this.ranked()) && this.ranked().length > 0;
  });

  private initialFindings(): EngagementFinding[] {
    const s = this.engagement.state();
    return s && !s.isSample ? [...(s.findings ?? [])] : [];
  }

  setMetric(key: MetricKey, value: string) {
    this.metrics.update((m) => ({ ...m, [key]: value }));
    this.vectorText.set('');
    this.vectorError.set('');
  }

  applyVector(text: string) {
    this.vectorText.set(text);
    if (!text.trim()) {
      this.vectorError.set('');
      return;
    }
    const parsed = parseVector(text);
    if (!parsed) {
      this.vectorError.set('Not a valid CVSS:3.1 base vector. Use all eight metrics, for example CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H.');
      return;
    }
    this.vectorError.set('');
    this.metrics.set(parsed);
  }

  addFinding() {
    if (!this.canAdd()) return;
    const finding = buildFinding({
      id: this.nextId(),
      title: this.title().trim().slice(0, TITLE_MAX),
      asset: this.asset().trim().slice(0, ASSET_MAX) || 'Unspecified',
      metrics: this.metrics(),
      exploitation: this.exploitation(),
      exposure: this.exposure(),
      criticality: this.criticality(),
    });
    this.findings.update((l) => [...l, finding]);
    this.title.set('');
    this.asset.set('');
    this.notice.set(`Added ${finding.id} as ${finding.priority}.`);
  }

  loadExamples() {
    this.findings.set(
      EXAMPLE_FINDINGS.map((e, i) =>
        buildFinding({ id: `VULN-${String(i + 1).padStart(2, '0')}`, title: e.title, asset: e.asset, metrics: parseVector(e.vector)!, exploitation: e.exploitation, exposure: e.exposure, criticality: e.criticality }),
      ),
    );
    this.notice.set(`Loaded ${EXAMPLE_FINDINGS.length} fictional example findings.`);
  }

  remove(id: string) {
    this.findings.update((l) => l.filter((f) => f.id !== id));
    this.notice.set(`Removed ${id}.`);
  }

  clear() {
    this.findings.set([]);
    this.notice.set('Cleared the list.');
  }

  reasonsFor(f: EngagementFinding): string[] {
    return prioritize({ severity: f.severity as Severity, exploitation: f.exploitation, exposure: f.exposure, criticality: f.criticality }).reasons;
  }

  sendToEngagement() {
    this.engagement.setFindings(this.ranked());
    this.notice.set('Added to the Engagement Report.');
  }

  downloadCsv() {
    downloadText(`vulnerability-priorities-${dateStamp()}.csv`, findingsCsv(this.ranked()));
  }

  private nextId(): string {
    const highest = this.findings().reduce((n, f) => Math.max(n, Number(/^VULN-(\d+)$/.exec(f.id)?.[1] ?? 0)), 0);
    return `VULN-${String(highest + 1).padStart(2, '0')}`;
  }
}

/** A remediation worksheet. Owner, resources, completion date and milestones are left to complete. */
export function findingsCsv(list: EngagementFinding[]): string {
  return reportCsv(
    'Vulnerability Prioritizer: remediation worksheet (draft)',
    [
      ['Findings', list.length],
      ['Scoring', 'CVSS v3.1 base score plus exploitation, exposure and system importance (see the tool page for the rule)'],
    ],
    ['ID', 'Finding', 'Asset', 'CVSS v3.1 vector', 'CVSS score', 'Rating', 'Exploitation', 'Exposure', 'System importance', 'Priority', 'Target (days)', 'Controls', 'Point of contact', 'Scheduled completion date', 'Milestones'],
    list.map((f) => [f.id, f.title, f.asset, f.vector, f.score.toFixed(1), f.severity, f.exploitation, f.exposure, f.criticality, f.priority, f.targetDays, 'RA-5; SI-2', '', '', '']),
  );
}
