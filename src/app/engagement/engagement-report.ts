import { Component, ChangeDetectionStrategy, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { EngagementService } from './engagement.service';
import { Engagement } from './engagement.model';
import { downloadText, fileSlug, toCsv } from '../share/export-file';

export type DetectionTier = 'stealthy' | 'moderate' | 'noisy';

@Component({
  selector: 'app-engagement-report',
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: true,
  imports: [RouterLink],
  templateUrl: './engagement-report.html',
  styleUrl: './engagement-report.css',
})
export class EngagementReport {
  readonly engagement = inject(EngagementService);
  readonly state = this.engagement.state;

  confirmingEnd = signal(false);

  readonly startedLabel = computed(() => {
    const s = this.state();
    if (!s) return '';
    const d = new Date(s.startedAt);
    return isNaN(d.getTime()) ? '' : d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  });

  readonly detectionTier = computed<DetectionTier | null>(() => {
    const score = this.state()?.detectionScore;
    if (score == null) return null;
    if (score < 40) return 'stealthy';
    if (score < 70) return 'moderate';
    return 'noisy';
  });

  readonly implementedCount = computed(() => this.state()?.controls.filter((c) => c.status === 'implemented').length ?? 0);

  readonly hasLaterSlices = computed(() => {
    const s = this.state();
    return !!s && (s.evidence.length + s.decisions.length + s.controls.length + s.poams.length) > 0;
  });

  loadSample() {
    this.confirmingEnd.set(false);
    this.engagement.loadSample();
  }

  rename(value: string) {
    this.engagement.rename(value);
  }

  endEngagement() {
    this.engagement.end();
    this.confirmingEnd.set(false);
  }

  print() {
    window.print();
  }

  exportCsv() {
    const s = this.state();
    if (!s) return;
    downloadText(`${fileSlug(s.scenario) || 'engagement'}-report.csv`, engagementToCsv(s));
  }
}

/** One row per record, with a Section column, so every slice lands in a
 *  single sheet that sorts and filters cleanly in Excel or Sheets. */
export function engagementToCsv(s: Engagement): string {
  const rows: string[][] = [['Section', 'ID', 'Name', 'Detail', 'Status / Grade', 'Related']];
  for (const t of s.techniques) {
    rows.push(['Technique', t.attackId, t.name, `${t.tactic}; defense: ${t.defense.tool} (${t.defense.note})`, `stealth: ${t.stealth}`, '']);
  }
  for (const e of s.evidence) rows.push(['Evidence', e.kind, e.value, e.detail, '', e.attackId ?? '']);
  for (const d of s.decisions) rows.push(['Decision', d.phase, d.action, d.rationale, d.grade, '']);
  for (const c of s.controls) {
    rows.push(['Control', c.id, c.name, `source: ${c.sourceTool}${c.basis ? `; ${c.basis}` : ''}; CIS ${c.cis ?? '-'}; ISO ${c.iso ?? '-'}`, c.status, c.attackIds.join(' ')]);
  }
  for (const p of s.poams) rows.push(['POA&M', p.id, p.weakness, p.milestone, `${p.targetDays} days`, p.controlId]);
  return toCsv(rows);
}
