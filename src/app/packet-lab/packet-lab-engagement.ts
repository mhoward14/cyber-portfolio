/* ============================================================
   PACKET-LAB-ENGAGEMENT.TS — PACKET ANALYSIS LAB
   Connects the lab to Engagement Mode: turns a finished hunt into
   Evidence rows for the report, and picks the hunt that best matches
   an engagement's attack chain.
   ============================================================ */

import { EngagementEvidence, EngagementTechnique } from '../engagement/engagement.model';
import { compileFilter } from './display-filter';
import { HUNTS, Hunt, HuntId } from './packet-lab-scenarios';
import { Packet } from './packet-model';

export const huntSourceKey = (id: HuntId) => `packet-lab:${id}`;

/** Evidence rows for a hunt: its findings, plus the display filter that
 *  reproduces them with the packet counts it matches in this capture. */
export function huntEvidence(hunt: Hunt, packets: Packet[]): EngagementEvidence[] {
  const f = compileFilter(hunt.evidenceFilter);
  const matched = f.ok ? packets.filter(f.test).length : 0;
  return [
    ...hunt.findings.map((x) => ({ ...x, attackId: hunt.technique.id })),
    {
      kind: 'Display filter',
      value: hunt.evidenceFilter,
      detail: `Packet Lab, ${hunt.name}: isolates ${matched} of ${packets.length} packets in the capture.`,
      attackId: hunt.technique.id,
    },
  ];
}

export interface HuntRecommendation {
  huntId: HuntId;
  attackId: string;
  techniqueName: string;
  reason: string;
}

/** The first hunt (in page order) whose traffic usually accompanies a
 *  technique in the attack chain, or null when none does. */
export function recommendHunt(techniques: EngagementTechnique[]): HuntRecommendation | null {
  for (const h of HUNTS) {
    const hit = techniques.find((t) => h.relatedTo.attackIds.includes(t.attackId));
    if (hit) return { huntId: h.id, attackId: hit.attackId, techniqueName: hit.name, reason: h.relatedTo.reason };
  }
  return null;
}
