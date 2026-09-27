import { Engagement, EngagementControl, EngagementPoam } from '../engagement/engagement.model';
import { BaselineControl, CONTROLS, ControlStatus, Tier, TIER_ORDER } from './rmf-data';

/* Engagement Mode for the RMF Control Tracker: import the controls other
   tools added to the engagement, then turn the open ones into draft
   POA&M items for the Engagement Report. */

/** The tracker lists base controls only, so IA-2(1) is tracked as IA-2. */
export function baseControlId(id: string): string {
  return id.replace(/\(\d+\)$/, '').trim();
}

export interface ImportedControl {
  id: string;
  status: ControlStatus;
  note: string;
}

/** Combine every tool's report of a control into one tracker status:
 *  implemented everywhere -> Implemented, planned everywhere -> Not
 *  Implemented, mixed -> Partial. Controls the tracker doesn't list are
 *  skipped. */
export function importEngagementControls(controls: EngagementControl[]): ImportedControl[] {
  const groups = new Map<string, EngagementControl[]>();
  for (const c of controls) {
    const id = baseControlId(c.id);
    if (!CONTROLS.some((k) => k.id === id)) continue;
    groups.set(id, [...(groups.get(id) ?? []), c]);
  }
  return [...groups.entries()].map(([id, list]) => {
    const implemented = list.filter((c) => c.status === 'implemented').length;
    const status: ControlStatus =
      implemented === list.length ? 'implemented' : implemented === 0 ? 'not-implemented' : 'partial';
    const sources = list.map((c) => `${c.sourceTool}${c.basis ? ` (${c.basis})` : ''}`).join('; ');
    return { id, status, note: `From engagement: ${sources}.` };
  });
}

/** Lowest baseline that includes every imported control. */
export function requiredTier(ids: string[]): Tier {
  let tier: Tier = 'low';
  for (const id of ids) {
    const c = CONTROLS.find((k) => k.id === id);
    if (c && TIER_ORDER[c.baseline] > TIER_ORDER[tier]) tier = c.baseline;
  }
  return tier;
}

const MILESTONES: Record<string, string> = {
  'AC-3': 'Block public access on storage by default and require explicit, reviewed grants for any public resource.',
  'AC-6': 'Replace broad standing permissions with per-request, least-privilege authorization and review grants quarterly.',
  'AU-6': 'Centralize identity, endpoint, and network logs and define a weekly review and alert-triage procedure.',
  'CM-6': 'Publish hardened configuration baselines and enforce them automatically with policy-as-code and IaC scanning.',
  'CM-8': 'Generate an SBOM for every build and keep a current inventory of system and software components.',
  'IA-2': 'Enforce phishing-resistant MFA for all privileged and remote access.',
  'IA-5': 'Remove hard-coded secrets, enforce secret scanning, and move deployment credentials to short-lived federated tokens.',
  'IR-4': 'Automate containment playbooks for the highest-impact incident types and validate them in a tabletop exercise.',
  'RA-5': 'Scan dependencies, images, and running systems on a defined schedule and track findings to closure.',
  'SA-11': 'Require peer review plus SAST and DAST gates before merge and release.',
  'SC-7': 'Restrict management ports to known ranges and enforce default-deny traffic at external and internal boundaries.',
  'SC-12': 'Enable key deletion protection and automatic key rotation under a documented key management policy.',
  'SC-28': 'Encrypt all data at rest with managed keys and verify coverage in configuration scans.',
  'SI-2': 'Set remediation timelines by severity and track every flaw from discovery through a verified fix.',
  'SI-7': 'Sign build artifacts and verify signatures before every deployment.',
};

/** Days to remediate: 30 when the control counters a technique in the
 *  engagement's own attack chain, otherwise 90. */
export const PRIORITY_DAYS = 30;
export const STANDARD_DAYS = 90;

/** Draft one POA&M item per engagement control the tracker still shows as
 *  Partial or Not Implemented. Items that counter a technique in the
 *  engagement's attack chain come first; otherwise the order the controls
 *  were added is kept. */
export function buildEngagementPoams(
  engagement: Engagement,
  statusOf: (id: string) => ControlStatus,
): EngagementPoam[] {
  const chain = new Map(engagement.techniques.map((t) => [t.attackId, t.name]));
  const byId = new Map<string, EngagementControl[]>();
  for (const c of engagement.controls) {
    const id = baseControlId(c.id);
    byId.set(id, [...(byId.get(id) ?? []), c]);
  }

  const items: EngagementPoam[] = [];
  for (const [id, list] of byId) {
    const status = statusOf(id);
    if (status !== 'partial' && status !== 'not-implemented') continue;
    const control: BaselineControl | undefined = CONTROLS.find((k) => k.id === id);
    const gaps = list.filter((c) => c.status === 'planned');
    const described = (gaps.length ? gaps : list).map((c) => `${c.sourceTool}${c.basis ? `: ${c.basis}` : ''}`);
    const countered = [...new Set(list.flatMap((c) => c.attackIds))].filter((a) => chain.has(a));
    const exposure = countered.length
      ? ` Leaves ${countered.map((a) => `${chain.get(a)} (${a})`).join(', ')} in the modeled attack chain without this defense.`
      : '';
    items.push({
      id: '',
      controlId: id,
      weakness: `${control?.title ?? id} is ${status === 'partial' ? 'partially' : 'not'} implemented. ${described.join('; ')}.${exposure}`,
      milestone: MILESTONES[id] ?? `Implement ${control?.title ?? id} and verify it in the next assessment.`,
      targetDays: countered.length ? PRIORITY_DAYS : STANDARD_DAYS,
    });
  }
  // Array.prototype.sort is stable, so equal-priority items keep their order.
  return items
    .sort((a, b) => a.targetDays - b.targetDays)
    .map((item, i) => ({ ...item, id: `POA&M-${String(i + 1).padStart(2, '0')}` }));
}
