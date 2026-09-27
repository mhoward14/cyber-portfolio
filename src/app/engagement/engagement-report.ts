import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { EngagementService } from './engagement.service';
import { Engagement } from './engagement.model';

export type DetectionTier = 'stealthy' | 'moderate' | 'noisy';

@Component({
  selector: 'app-engagement-report',
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
    const blob = new Blob([engagementToCsv(s)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${slug(s.scenario) || 'engagement'}-report.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
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
    rows.push(['Control', c.id, c.name, `source: ${c.sourceTool}; CIS ${c.cis ?? '-'}; ISO ${c.iso ?? '-'}`, c.status, c.attackIds.join(' ')]);
  }
  for (const p of s.poams) rows.push(['POA&M', p.id, p.weakness, p.milestone, `${p.targetDays} days`, p.controlId]);
  return rows.map((r) => r.map(csvCell).join(',')).join('\r\n');
}

function csvCell(value: string): string {
  // Neutralize spreadsheet formula injection, then quote.
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return `"${safe.replace(/"/g, '""')}"`;
}

function slug(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
}
