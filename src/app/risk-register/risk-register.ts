/* ============================================================
   RISK-REGISTER.TS — RISK REGISTER
   Rate each risk by likelihood and impact on the NIST SP 800-30
   scales, record how it will be treated and what it should look like
   afterward, and see the result on a heat map. Findings from the
   Vulnerability Prioritizer can be drafted into risks. Results can go
   into Engagement Mode or out as a worksheet. Everything runs in the
   browser.
   ============================================================ */

import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { EngagementService } from '../engagement/engagement.service';
import { EngagementRisk, MAX_RISKS, RiskRating, RiskTreatment, ThreatSource } from '../engagement/engagement.model';
import { buildSampleEngagement } from '../engagement/engagement-sample';
import { ExportButton, dateStamp, downloadText, reportCsv } from '../share/export-file';
import { CONTROLS } from '../rmf-tracker/rmf-data';
import { draftRisks, nextRiskId } from './draft';
import {
  IMPACT_HELP, LIKELIHOOD_HELP, RATINGS, RATING_LABEL, THREAT_LABEL, TREATMENT_LABEL, isElevated, ratingRank, riskLevel,
} from './risk-matrix';

const TITLE_MAX = 160;

export type MatrixView = 'current' | 'residual';

function signature(list: EngagementRisk[]): string {
  return list
    .map((r) => [r.title, r.threat, r.likelihood, r.impact, r.treatment, r.controlId ?? '', r.residualLikelihood, r.residualImpact].join('|'))
    .join('\n');
}

@Component({
  selector: 'app-risk-register',
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: true,
  imports: [RouterLink, ExportButton],
  templateUrl: './risk-register.html',
  styleUrl: './risk-register.css',
})
export class RiskRegister {
  readonly engagement = inject(EngagementService);

  readonly ratings = RATINGS;
  readonly ratingLabel = RATING_LABEL;
  readonly likelihoodHelp = LIKELIHOOD_HELP;
  readonly impactHelp = IMPACT_HELP;
  readonly threats = Object.entries(THREAT_LABEL) as [ThreatSource, string][];
  readonly treatments = Object.entries(TREATMENT_LABEL) as [RiskTreatment, string][];
  readonly controls = CONTROLS;
  readonly titleMax = TITLE_MAX;
  readonly maxRisks = MAX_RISKS;
  /** Likelihood rows run from the most to the least likely, top to bottom. */
  readonly rows = [...RATINGS].reverse();

  title = signal('');
  threat = signal<ThreatSource>('adversarial');
  likelihood = signal<RiskRating>('moderate');
  impact = signal<RiskRating>('moderate');
  treatment = signal<RiskTreatment>('mitigate');
  controlId = signal('');
  /** Empty means the treatment is not expected to change the rating. */
  residualLikelihood = signal<RiskRating | ''>('');
  residualImpact = signal<RiskRating | ''>('');
  view = signal<MatrixView>('current');
  notice = signal('');

  /** Start from the visitor's own engagement so a round trip through the report keeps their register. */
  risks = signal<EngagementRisk[]>(this.initialRisks());

  readonly ranked = computed(() =>
    [...this.risks()].sort(
      (a, b) => ratingRank(this.level(b)) - ratingRank(this.level(a)) || a.id.localeCompare(b.id),
    ),
  );
  readonly preview = computed(() => riskLevel(this.likelihood(), this.impact()));
  readonly previewResidual = computed(() =>
    riskLevel(this.residualLikelihood() || this.likelihood(), this.residualImpact() || this.impact()),
  );
  readonly canAdd = computed(() => this.title().trim().length > 0 && this.risks().length < MAX_RISKS);
  readonly elevated = computed(() => this.risks().filter((r) => isElevated(this.level(r))).length);
  readonly elevatedAfter = computed(() => this.risks().filter((r) => isElevated(this.residual(r))).length);

  /** Findings from the visitor's own engagement that are urgent and not yet in the register. */
  readonly drafts = computed(() => {
    const s = this.engagement.state();
    return s && !s.isSample ? draftRisks(s.findings ?? [], this.risks()) : [];
  });

  readonly inEngagement = computed(() => {
    const saved = this.engagement.state();
    return !!saved && !saved.isSample && this.risks().length > 0 && signature(saved.risks ?? []) === signature(this.ranked());
  });

  /** How many risks sit in each likelihood and impact cell, before or after treatment. */
  readonly cells = computed(() => {
    const counts = new Map<string, number>();
    for (const r of this.risks()) {
      const key = this.view() === 'current' ? `${r.likelihood}|${r.impact}` : `${r.residualLikelihood}|${r.residualImpact}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return counts;
  });

  private initialRisks(): EngagementRisk[] {
    const s = this.engagement.state();
    return s && !s.isSample ? [...(s.risks ?? [])] : [];
  }

  level(r: EngagementRisk): RiskRating {
    return riskLevel(r.likelihood, r.impact);
  }

  residual(r: EngagementRisk): RiskRating {
    return riskLevel(r.residualLikelihood, r.residualImpact);
  }

  cellLevel(likelihood: RiskRating, impact: RiskRating): RiskRating {
    return riskLevel(likelihood, impact);
  }

  count(likelihood: RiskRating, impact: RiskRating): number {
    return this.cells().get(`${likelihood}|${impact}`) ?? 0;
  }

  treatmentName(t: RiskTreatment): string {
    return TREATMENT_LABEL[t].split(':')[0];
  }

  addRisk() {
    if (!this.canAdd()) return;
    const risk: EngagementRisk = {
      id: nextRiskId(this.risks()),
      title: this.title().trim().slice(0, TITLE_MAX),
      threat: this.threat(),
      likelihood: this.likelihood(),
      impact: this.impact(),
      treatment: this.treatment(),
      ...(this.controlId() ? { controlId: this.controlId() } : {}),
      residualLikelihood: this.residualLikelihood() || this.likelihood(),
      residualImpact: this.residualImpact() || this.impact(),
    };
    this.risks.update((l) => [...l, risk]);
    this.title.set('');
    this.notice.set(`Added ${risk.id}, rated ${RATING_LABEL[this.level(risk)].toLowerCase()}.`);
  }

  loadExamples() {
    this.risks.set(buildSampleEngagement().risks ?? []);
    this.notice.set('Loaded fictional example risks.');
  }

  draftFromFindings() {
    const added = this.drafts();
    if (!added.length) return;
    this.risks.update((l) => [...l, ...added].slice(0, MAX_RISKS));
    this.notice.set(`Drafted ${added.length} ${added.length === 1 ? 'risk' : 'risks'} from urgent vulnerability findings. Review the ratings.`);
  }

  remove(id: string) {
    this.risks.update((l) => l.filter((r) => r.id !== id));
    this.notice.set(`Removed ${id}.`);
  }

  clear() {
    this.risks.set([]);
    this.notice.set('Cleared the register.');
  }

  sendToEngagement() {
    this.engagement.setRisks(this.ranked());
    this.notice.set('Added to the Engagement Report.');
  }

  downloadCsv() {
    downloadText(`risk-register-${dateStamp()}.csv`, risksCsv(this.ranked()));
  }
}

/** A risk register worksheet. Owner, due date and notes are left to complete. */
export function risksCsv(list: EngagementRisk[]): string {
  return reportCsv(
    'Risk Register: worksheet (draft)',
    [
      ['Risks', list.length],
      ['Scales', 'NIST SP 800-30 Rev. 1 qualitative likelihood, impact and risk levels (five levels)'],
    ],
    ['ID', 'Risk', 'Threat source', 'Likelihood', 'Impact', 'Risk rating', 'Treatment', 'Control', 'Residual likelihood', 'Residual impact', 'Residual rating', 'Risk owner', 'Due date', 'Notes'],
    list.map((r) => [
      r.id,
      r.title,
      r.threat,
      RATING_LABEL[r.likelihood],
      RATING_LABEL[r.impact],
      RATING_LABEL[riskLevel(r.likelihood, r.impact)],
      r.treatment,
      r.controlId ?? '',
      RATING_LABEL[r.residualLikelihood],
      RATING_LABEL[r.residualImpact],
      RATING_LABEL[riskLevel(r.residualLikelihood, r.residualImpact)],
      '',
      '',
      '',
    ]),
  );
}
