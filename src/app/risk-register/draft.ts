/* ============================================================
   DRAFT.TS — RISKS FROM VULNERABILITY FINDINGS
   Turns the urgent findings from the Vulnerability Prioritizer into
   draft risk statements. The mapping is simple and printed on the
   page, so a reader can see why a finding became the risk it did and
   adjust it.
   ============================================================ */

import { EngagementFinding, EngagementRisk, RiskRating } from '../engagement/engagement.model';

/** How likely the flaw is to be used against the system. */
export function likelihoodOf(f: Pick<EngagementFinding, 'exploitation' | 'exposure'>): RiskRating {
  const internet = f.exposure === 'internet';
  if (f.exploitation === 'active') return internet ? 'very-high' : 'high';
  if (f.exploitation === 'public') return internet ? 'high' : 'moderate';
  return internet ? 'moderate' : 'low';
}

/** How much it would matter if it were. */
export function impactOf(f: Pick<EngagementFinding, 'criticality' | 'severity'>): RiskRating {
  if (f.criticality === 'high') return f.severity === 'critical' ? 'very-high' : 'high';
  if (f.criticality === 'moderate') return 'moderate';
  return 'low';
}

export function nextRiskId(existing: { id: string }[]): string {
  const highest = existing.reduce((n, r) => Math.max(n, Number(/^RISK-(\d+)$/.exec(r.id)?.[1] ?? 0)), 0);
  return `RISK-${String(highest + 1).padStart(2, '0')}`;
}

/** Draft risks for findings at P1 or P2 that the register does not cover yet. */
export function draftRisks(findings: EngagementFinding[], existing: EngagementRisk[]): EngagementRisk[] {
  const covered = new Set(existing.map((r) => r.title));
  const out: EngagementRisk[] = [];
  for (const f of findings) {
    if (f.priority !== 'P1' && f.priority !== 'P2') continue;
    const title = `Exploitation of "${f.title}" on ${f.asset} compromises the system`.slice(0, 160);
    if (covered.has(title)) continue;
    const likelihood = likelihoodOf(f);
    const impact = impactOf(f);
    out.push({
      id: nextRiskId([...existing, ...out]),
      title,
      threat: 'adversarial',
      likelihood,
      impact,
      treatment: 'mitigate',
      controlId: 'SI-2',
      // Patching removes most of the likelihood; the impact if it happened is unchanged.
      residualLikelihood: 'low',
      residualImpact: impact,
    });
  }
  return out;
}
