/* ============================================================
   SSP-MODEL.TS — SYSTEM SECURITY PLAN DRAFT
   Builds a draft System Security Plan, laid out after NIST SP 800-18
   Rev. 1, from what the visitor entered and what the other tools
   already hold: the RMF Tracker's baseline, statuses and notes, and
   the Engagement's techniques, controls, POA&M items, findings and
   risks. Nothing is invented. Where the tools hold no answer the
   draft says so and leaves a bracketed blank, so a reader can tell
   what was derived from what was filled in by hand.
   ============================================================ */

import { Engagement, EngagementControl, EngagementFinding, EngagementPoam, EngagementRisk, EngagementTechnique } from '../engagement/engagement.model';
import { baseControlId } from '../rmf-tracker/rmf-engagement';
import { CONTROLS, ControlStatus, STATUS_LABEL, Tier, TIER_ORDER } from '../rmf-tracker/rmf-data';
import { TrackerState } from '../rmf-tracker/rmf-saved';
import { RATING_LABEL, riskLevel, ratingRank } from '../risk-register/risk-matrix';

export type Impact = 'low' | 'moderate' | 'high';
export type OperationalStatus = 'operational' | 'development' | 'modification';
export type Hosting = 'on-premises' | 'cloud' | 'hybrid' | 'other';

export const IMPACTS: Impact[] = ['low', 'moderate', 'high'];
export const IMPACT_LABEL: Record<Impact, string> = { low: 'Low', moderate: 'Moderate', high: 'High' };
export const STATUS_OPTIONS: Record<OperationalStatus, string> = {
  operational: 'Operational',
  development: 'Under development',
  modification: 'Undergoing a major modification',
};
export const HOSTING_OPTIONS: Record<Hosting, string> = {
  'on-premises': 'On premises',
  cloud: 'Commercial cloud',
  hybrid: 'Hybrid',
  other: 'Other',
};

export const LIMITS = { name: 80, abbreviation: 20, description: 1200, boundary: 1200 } as const;

export interface SspInput {
  name: string;
  abbreviation: string;
  description: string;
  confidentiality: Impact;
  integrity: Impact;
  availability: Impact;
  status: OperationalStatus;
  hosting: Hosting;
  boundary: string;
}

export const EMPTY_INPUT: SspInput = {
  name: '',
  abbreviation: '',
  description: '',
  confidentiality: 'moderate',
  integrity: 'moderate',
  availability: 'moderate',
  status: 'operational',
  hosting: 'cloud',
  boundary: '',
};

/** A fictional system, so a visitor can see a finished draft without typing. */
export const CONTOSO_INPUT: SspInput = {
  name: 'Contoso Payments Portal',
  abbreviation: 'CPP',
  description:
    'A fictional web application that lets Contoso Financial customers view statements and schedule ACH payments. It is used here only to show what the generator produces.',
  confidentiality: 'moderate',
  integrity: 'high',
  availability: 'moderate',
  status: 'operational',
  hosting: 'cloud',
  boundary:
    'The boundary covers the portal web tier, the payments API, its managed database and the identity provider integration. The corporate network, the card processor and the customer devices are outside it.',
};

export const PLACEHOLDER = {
  name: '[System name]',
  description: '[Describe the purpose of the system, who uses it and what information it handles.]',
  boundary: '[Describe what is inside the authorization boundary and what is outside it.]',
  role: '[Responsible role]',
} as const;

/** FIPS 199 high-water mark: the system's overall impact is its highest of the three. */
export function overallImpact(i: Pick<SspInput, 'confidentiality' | 'integrity' | 'availability'>): Impact {
  const order = (x: Impact) => TIER_ORDER[x as Tier];
  return [i.confidentiality, i.integrity, i.availability].reduce((a, b) => (order(b) > order(a) ? b : a));
}

export interface ControlRow {
  id: string;
  title: string;
  status: ControlStatus;
  statusLabel: string;
  statement: string;
  support: string[];
}

export interface FamilySection {
  family: string;
  rows: ControlRow[];
}

export interface OpenItem {
  id: string;
  controlId: string;
  weakness: string;
  milestone: string;
  /** Null when no target has been set, so the draft never invents a date. */
  targetDays: number | null;
  source: 'engagement' | 'tracker';
}

export interface SspModel {
  title: string;
  generated: string;
  isSample: boolean;
  sampleReasons: string[];
  identification: {
    name: string;
    abbreviation: string;
    description: string;
    status: string;
    hosting: string;
    boundary: string;
  };
  categorization: { confidentiality: Impact; integrity: Impact; availability: Impact; overall: Impact };
  baseline: Tier;
  /** Set when the tracker's baseline is lower than the categorization requires. */
  baselineWarning: string | null;
  hasTracker: boolean;
  counts: Record<ControlStatus, number> & { total: number };
  families: FamilySection[];
  threats: EngagementTechnique[];
  findings: EngagementFinding[];
  risks: (EngagementRisk & { level: string; residual: string })[];
  openItems: OpenItem[];
  scenario: string | null;
}

/** A sentence for the "how is this control implemented" field. It restates
 *  what the tracker records and flags what still needs a human answer. */
export function implementationStatement(
  status: ControlStatus,
  title: string,
  note: string,
  supporting: EngagementControl[],
): string {
  const cleaned = note.trim();
  const support = supporting.length
    ? ` Configuration evidence in the engagement: ${supporting.map((c) => `${c.sourceTool}${c.basis ? ` (${c.basis})` : ''}`).join('; ')}.`
    : '';
  switch (status) {
    case 'implemented':
      return `${title} is implemented.${cleaned ? ` ${cleaned}` : ' [Describe how, by whom and where it is documented.]'}${support}`;
    case 'partial':
      return `${title} is partially implemented.${cleaned ? ` ${cleaned}` : ' [Describe what is in place and what is missing.]'} The gap is tracked as a plan of action item.${support}`;
    case 'not-implemented':
      return `${title} is not yet implemented.${cleaned ? ` ${cleaned}` : ' [Describe the planned approach.]'} The gap is tracked as a plan of action item.${support}`;
    case 'na':
      return `${title} is not applicable.${cleaned ? ` ${cleaned}` : ' [A justification is required.]'}`;
  }
}

function today(now: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function buildSsp(
  input: SspInput,
  tracker: TrackerState | null,
  engagement: Engagement | null,
  now = new Date(),
): SspModel {
  const overall = overallImpact(input);
  const trackerTier = tracker?.tier ?? null;
  const baseline: Tier = trackerTier ?? overall;

  let baselineWarning: string | null = null;
  if (trackerTier && TIER_ORDER[trackerTier] < TIER_ORDER[overall]) {
    baselineWarning = `The categorization requires the ${IMPACT_LABEL[overall]} baseline, but the RMF Tracker is set to ${IMPACT_LABEL[trackerTier]}. Controls that only the ${IMPACT_LABEL[overall]} baseline requires are missing from this draft until the tracker is raised.`;
  }

  const statuses = tracker?.statuses ?? {};
  const notes = tracker?.notes ?? {};
  const engagementControls = engagement?.controls ?? [];
  const byBase = new Map<string, EngagementControl[]>();
  for (const c of engagementControls) {
    const id = baseControlId(c.id);
    byBase.set(id, [...(byBase.get(id) ?? []), c]);
  }

  const counts = { implemented: 0, partial: 0, 'not-implemented': 0, na: 0, total: 0 };
  const families: FamilySection[] = [];
  const inBaseline = CONTROLS.filter((c) => TIER_ORDER[c.baseline] <= TIER_ORDER[baseline]);
  for (const control of inBaseline) {
    // The tracker treats a control it holds no status for as not implemented.
    const status: ControlStatus = statuses[control.id] ?? 'not-implemented';
    const supporting = byBase.get(control.id) ?? [];
    const row: ControlRow = {
      id: control.id,
      title: control.title,
      status,
      statusLabel: STATUS_LABEL[status],
      statement: implementationStatement(status, control.title, notes[control.id] ?? '', supporting),
      support: supporting.map((c) => c.sourceTool),
    };
    counts[status]++;
    counts.total++;
    let section = families.find((f) => f.family === control.family);
    if (!section) families.push((section = { family: control.family, rows: [] }));
    section.rows.push(row);
  }

  // Open items: the engagement's drafted POA&M items first, then any other
  // control the tracker shows as open that those items do not cover.
  const poams: EngagementPoam[] = engagement?.poams ?? [];
  const open: OpenItem[] = poams.map((p) => ({
    id: p.id,
    controlId: p.controlId,
    weakness: p.weakness,
    milestone: p.milestone,
    targetDays: p.targetDays,
    source: 'engagement',
  }));
  const covered = new Set(open.map((o) => o.controlId));
  let n = poams.length;
  for (const family of families) {
    for (const row of family.rows) {
      if ((row.status === 'partial' || row.status === 'not-implemented') && !covered.has(row.id)) {
        n++;
        open.push({
          id: `POA&M-${String(n).padStart(2, '0')}`,
          controlId: row.id,
          weakness: `${row.title} is ${row.status === 'partial' ? 'partially' : 'not'} implemented.`,
          milestone: '[Define the milestones that close this gap.]',
          targetDays: null,
          source: 'tracker',
        });
      }
    }
  }

  const risks = [...(engagement?.risks ?? [])]
    .sort((a, b) => ratingRank(riskLevel(b.likelihood, b.impact)) - ratingRank(riskLevel(a.likelihood, a.impact)))
    .map((r) => ({
      ...r,
      level: RATING_LABEL[riskLevel(r.likelihood, r.impact)],
      residual: RATING_LABEL[riskLevel(r.residualLikelihood, r.residualImpact)],
    }));

  const sampleReasons: string[] = [];
  if (tracker?.sample) sampleReasons.push('the RMF Tracker is showing its sample assessment');
  if (engagement?.isSample) sampleReasons.push('the engagement is the fictional Contoso Financial sample');
  if (!tracker?.tier) sampleReasons.push('no RMF Tracker baseline has been chosen, so every control shows as not implemented');

  return {
    title: `System Security Plan: ${input.name.trim() || PLACEHOLDER.name}`,
    generated: today(now),
    isSample: sampleReasons.length > 0,
    sampleReasons,
    identification: {
      name: input.name.trim() || PLACEHOLDER.name,
      abbreviation: input.abbreviation.trim(),
      description: input.description.trim() || PLACEHOLDER.description,
      status: STATUS_OPTIONS[input.status],
      hosting: HOSTING_OPTIONS[input.hosting],
      boundary: input.boundary.trim() || PLACEHOLDER.boundary,
    },
    categorization: {
      confidentiality: input.confidentiality,
      integrity: input.integrity,
      availability: input.availability,
      overall,
    },
    baseline,
    baselineWarning,
    hasTracker: !!tracker?.tier,
    counts,
    families,
    threats: engagement?.techniques ?? [],
    findings: engagement?.findings ?? [],
    risks,
    openItems: open,
    scenario: engagement?.scenario ?? null,
  };
}
