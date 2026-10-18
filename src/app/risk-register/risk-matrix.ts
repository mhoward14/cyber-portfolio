/* ============================================================
   RISK-MATRIX.TS — LIKELIHOOD x IMPACT
   Five-level likelihood and impact scales combined into a five-level
   risk rating, laid out like the qualitative risk matrix in NIST SP
   800-30 Rev. 1 (Appendix I). A threat that is very likely but would
   barely matter, or would matter greatly but is very unlikely, is not
   treated like one that is both.
   ============================================================ */

import { RiskRating, RiskTreatment, ThreatSource } from '../engagement/engagement.model';

export const RATINGS: RiskRating[] = ['very-low', 'low', 'moderate', 'high', 'very-high'];

export const RATING_LABEL: Record<RiskRating, string> = {
  'very-low': 'Very low',
  low: 'Low',
  moderate: 'Moderate',
  high: 'High',
  'very-high': 'Very high',
};

/** Rows are likelihood and columns are impact, both from very low to very high. */
const MATRIX: RiskRating[][] = [
  ['very-low', 'very-low', 'very-low', 'low', 'low'],
  ['very-low', 'low', 'low', 'low', 'moderate'],
  ['very-low', 'low', 'moderate', 'moderate', 'high'],
  ['very-low', 'low', 'moderate', 'high', 'very-high'],
  ['very-low', 'low', 'moderate', 'high', 'very-high'],
];

export function riskLevel(likelihood: RiskRating, impact: RiskRating): RiskRating {
  return MATRIX[RATINGS.indexOf(likelihood)][RATINGS.indexOf(impact)];
}

/** 0 (very low) to 4 (very high), for sorting. */
export function ratingRank(r: RiskRating): number {
  return RATINGS.indexOf(r);
}

export const LIKELIHOOD_HELP: Record<RiskRating, string> = {
  'very-low': 'Highly unlikely to happen, or to succeed if tried',
  low: 'Unlikely',
  moderate: 'Could well happen',
  high: 'Likely',
  'very-high': 'Almost certain, or already happening',
};

export const IMPACT_HELP: Record<RiskRating, string> = {
  'very-low': 'Negligible effect',
  low: 'Limited effect on operations, assets or people',
  moderate: 'Serious effect that the organization can absorb',
  high: 'Severe effect on operations, assets or people',
  'very-high': 'Catastrophic effect, such as loss of the mission',
};

export const TREATMENT_LABEL: Record<RiskTreatment, string> = {
  mitigate: 'Mitigate: reduce it with controls',
  accept: 'Accept: knowingly live with it',
  transfer: 'Transfer: share it, such as by insurance or contract',
  avoid: 'Avoid: stop the activity that causes it',
};

export const THREAT_LABEL: Record<ThreatSource, string> = {
  adversarial: 'Adversarial: an attacker, insider or group',
  accidental: 'Accidental: a mistake by someone with access',
  structural: 'Structural: failure of equipment, software or process',
  environmental: 'Environmental: fire, flood, power or other event',
};

/** The risk levels that call for action rather than monitoring. */
export function isElevated(level: RiskRating): boolean {
  return level === 'high' || level === 'very-high';
}
