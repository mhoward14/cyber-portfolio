/* ============================================================
   PRIORITY.TS — RISK-BASED PRIORITY
   CVSS says how bad a flaw could be in general. It does not say
   whether anyone is using it, whether the system can be reached, or
   how much the system matters. This rule adds those three facts to
   the CVSS rating and gives a plain P1 to P4 order of work. It is a
   transparent teaching rule, not an official standard: every point
   it adds is listed so a reader can disagree with a specific one.
   ============================================================ */

import { Severity } from './cvss';

export type Exploitation = 'none' | 'public' | 'active';
export type Exposure = 'internal' | 'internet';
export type Criticality = 'low' | 'moderate' | 'high';
export type Priority = 'P1' | 'P2' | 'P3' | 'P4';

export interface PriorityInput {
  severity: Severity;
  exploitation: Exploitation;
  exposure: Exposure;
  criticality: Criticality;
}

export interface PriorityResult {
  priority: Priority;
  points: number;
  /** One line per factor that moved the result, in plain language. */
  reasons: string[];
}

const SEVERITY_POINTS: Record<Severity, number> = { none: 0, low: 1, medium: 2, high: 3, critical: 4 };

/** Illustrative remediation targets in days; real ones come from an organization's policy. */
export const TARGET_DAYS: Record<Priority, number> = { P1: 7, P2: 30, P3: 90, P4: 180 };

export const PRIORITY_LABEL: Record<Priority, string> = {
  P1: 'Fix now',
  P2: 'Fix this month',
  P3: 'Schedule',
  P4: 'Track',
};

export function prioritize(i: PriorityInput): PriorityResult {
  const reasons = [`CVSS rating ${i.severity}: ${SEVERITY_POINTS[i.severity]}`];
  let points = SEVERITY_POINTS[i.severity];

  if (i.exploitation === 'active') {
    points += 2;
    reasons.push('Exploited in the wild: +2');
  } else if (i.exploitation === 'public') {
    points += 1;
    reasons.push('Public exploit code exists: +1');
  }
  if (i.exposure === 'internet') {
    points += 1;
    reasons.push('Reachable from the internet: +1');
  }
  if (i.criticality === 'high') {
    points += 1;
    reasons.push('Business-critical system: +1');
  } else if (i.criticality === 'low') {
    points -= 1;
    reasons.push('Low-importance system: −1');
  }

  // A flaw with no impact at all never needs urgent work, whatever else is true.
  const priority: Priority =
    i.severity === 'none' ? 'P4' : points >= 7 ? 'P1' : points >= 5 ? 'P2' : points >= 3 ? 'P3' : 'P4';
  return { priority, points, reasons };
}
