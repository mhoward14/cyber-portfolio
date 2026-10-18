import { EngagementFinding } from '../engagement/engagement.model';
import { CvssMetrics, baseScore, severityOf, toVector } from './cvss';
import { Criticality, Exploitation, Exposure, TARGET_DAYS, prioritize } from './priority';

export interface FindingInput {
  id: string;
  title: string;
  asset: string;
  metrics: CvssMetrics;
  exploitation: Exploitation;
  exposure: Exposure;
  criticality: Criticality;
}

/** Score a finding and rank it. The one place a finding record is built,
 *  so the tool, the sample and the tests always agree. */
export function buildFinding(i: FindingInput): EngagementFinding {
  const score = baseScore(i.metrics);
  const severity = severityOf(score);
  const { priority } = prioritize({ severity, exploitation: i.exploitation, exposure: i.exposure, criticality: i.criticality });
  return {
    id: i.id,
    title: i.title,
    asset: i.asset,
    vector: toVector(i.metrics),
    score,
    severity,
    exploitation: i.exploitation,
    exposure: i.exposure,
    criticality: i.criticality,
    priority,
    targetDays: TARGET_DAYS[priority],
  };
}

const PRIORITY_ORDER = { P1: 0, P2: 1, P3: 2, P4: 3 } as const;

/** Most urgent first; higher CVSS breaks ties within a priority. */
export function sortFindings<T extends Pick<EngagementFinding, 'priority' | 'score'>>(list: T[]): T[] {
  return [...list].sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority] || b.score - a.score);
}
