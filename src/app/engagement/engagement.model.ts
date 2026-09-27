/* ============================================================
   ENGAGEMENT.MODEL.TS — ENGAGEMENT MODE
   One shared scenario that the portfolio's tools read from and
   write to, so a visitor can follow a single story from attack to
   compliance evidence. Each tool owns one slice of the record:

     techniques  Attack Path Builder
     evidence    Packet Analysis Lab (planned)
     decisions   IR Playbook Simulator
     controls    Zero Trust / Cloud Security / CI/CD Pipeline
     poams       RMF Control Tracker

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
}

export const ENGAGEMENT_STORAGE_KEY = 'engagement-v1';
