/* ============================================================
   ENGAGEMENT.MODEL.TS — ENGAGEMENT MODE
   One shared scenario that the portfolio's tools read from and
   write to, so a visitor can follow a single story from attack to
   compliance evidence. Each tool owns one slice of the record:

     techniques  Attack Path Builder
     evidence    Packet Analysis Lab
     decisions   IR Playbook Simulator
     controls    Zero Trust / Cloud Security / CI/CD Pipeline
     poams       RMF Control Tracker
     findings    Vulnerability Prioritizer
     risks       Risk Register

   Slices a tool has not written yet stay empty, and the report only
   renders the slices that have data.
   ============================================================ */

export type Stealth = 'low' | 'medium' | 'high';

export interface EngagementTechnique {
  attackId: string;
  name: string;
  tactic: string;
  stealth: Stealth;
  defense: { tool: string; route: string; note: string };
}

export interface EngagementEvidence {
  kind: string;
  value: string;
  detail: string;
  attackId?: string;
  /** Stable key of the source that wrote this row (a Packet Lab hunt);
   *  re-adding from the same source replaces only its own rows. */
  sourceKey?: string;
}

export type DecisionGrade = 'optimal' | 'suboptimal' | 'poor';

export interface EngagementDecision {
  phase: string;
  action: string;
  grade: DecisionGrade;
  rationale: string;
}

export type ControlStatus = 'implemented' | 'planned';

export interface EngagementControl {
  id: string;
  name: string;
  status: ControlStatus;
  sourceTool: string;
  /** Stable key of the tool that wrote this control; a tool replaces only its own rows. */
  sourceKey?: string;
  /** The settings behind the control, e.g. "Pipeline gates: SAST, DAST". */
  basis?: string;
  cis?: string;
  iso?: string;
  attackIds: string[];
}

export interface EngagementPoam {
  id: string;
  controlId: string;
  weakness: string;
  milestone: string;
  targetDays: number;
}

export type FindingPriority = 'P1' | 'P2' | 'P3' | 'P4';

/** A scored vulnerability, kept with the facts behind its priority so the
 *  report can show why it ranks where it does. */
export interface EngagementFinding {
  id: string;
  title: string;
  asset: string;
  /** CVSS v3.1 base vector and the score computed from it. */
  vector: string;
  score: number;
  severity: string;
  exploitation: 'none' | 'public' | 'active';
  exposure: 'internal' | 'internet';
  criticality: 'low' | 'moderate' | 'high';
  priority: FindingPriority;
  targetDays: number;
}

export type RiskRating = 'very-low' | 'low' | 'moderate' | 'high' | 'very-high';
export type RiskTreatment = 'mitigate' | 'accept' | 'transfer' | 'avoid';
export type ThreatSource = 'adversarial' | 'accidental' | 'structural' | 'environmental';

const RATINGS = ['very-low', 'low', 'moderate', 'high', 'very-high'];

/** A risk statement rated on the NIST SP 800-30 likelihood and impact scales.
 *  Only the inputs are stored; the risk level is worked out from them, so a
 *  saved record can never disagree with the matrix. */
export interface EngagementRisk {
  id: string;
  title: string;
  threat: ThreatSource;
  likelihood: RiskRating;
  impact: RiskRating;
  treatment: RiskTreatment;
  /** NIST SP 800-53 control the treatment relies on, if any. */
  controlId?: string;
  /** Likelihood and impact expected once the treatment is in place. */
  residualLikelihood: RiskRating;
  residualImpact: RiskRating;
}

export interface Engagement {
  version: 1;
  scenario: string;
  startedAt: string;
  isSample: boolean;
  techniques: EngagementTechnique[];
  detectionScore: number | null;
  evidence: EngagementEvidence[];
  decisions: EngagementDecision[];
  /** IR Simulator scenario the decisions came from, if any. */
  responseScenario?: string;
  controls: EngagementControl[];
  poams: EngagementPoam[];
  /** Absent in records saved before the Vulnerability Prioritizer existed. */
  findings?: EngagementFinding[];
  /** Absent in records saved before the Risk Register existed. */
  risks?: EngagementRisk[];
}

export const MAX_FINDINGS = 50;
export const MAX_RISKS = 50;

/** Strict check for a finding read back from storage, which is untrusted input. */
export function isFinding(x: unknown): x is EngagementFinding {
  if (!x || typeof x !== 'object') return false;
  const f = x as Record<string, unknown>;
  const text = (v: unknown, max: number) => typeof v === 'string' && v.length > 0 && v.length <= max;
  return (
    text(f['id'], 20) &&
    text(f['title'], 120) &&
    text(f['asset'], 80) &&
    text(f['vector'], 60) &&
    typeof f['score'] === 'number' && f['score'] >= 0 && f['score'] <= 10 &&
    text(f['severity'], 10) &&
    ['none', 'public', 'active'].includes(f['exploitation'] as string) &&
    ['internal', 'internet'].includes(f['exposure'] as string) &&
    ['low', 'moderate', 'high'].includes(f['criticality'] as string) &&
    ['P1', 'P2', 'P3', 'P4'].includes(f['priority'] as string) &&
    typeof f['targetDays'] === 'number' && Number.isInteger(f['targetDays']) && f['targetDays'] > 0 && f['targetDays'] <= 3650
  );
}

/** Strict check for a risk read back from storage, which is untrusted input. */
export function isRisk(x: unknown): x is EngagementRisk {
  if (!x || typeof x !== 'object') return false;
  const r = x as Record<string, unknown>;
  const text = (v: unknown, max: number) => typeof v === 'string' && v.length > 0 && v.length <= max;
  return (
    text(r['id'], 20) &&
    text(r['title'], 160) &&
    ['adversarial', 'accidental', 'structural', 'environmental'].includes(r['threat'] as string) &&
    RATINGS.includes(r['likelihood'] as string) &&
    RATINGS.includes(r['impact'] as string) &&
    ['mitigate', 'accept', 'transfer', 'avoid'].includes(r['treatment'] as string) &&
    (r['controlId'] === undefined || (typeof r['controlId'] === 'string' && /^[A-Z]{2}-\d{1,2}$/.test(r['controlId']))) &&
    RATINGS.includes(r['residualLikelihood'] as string) &&
    RATINGS.includes(r['residualImpact'] as string)
  );
}

export const ENGAGEMENT_STORAGE_KEY = 'engagement-v1';
