import { makeControl } from '../engagement/control-catalog';
import { EngagementControl } from '../engagement/engagement.model';
import { MATURITY_PILLARS, MATURITY_STAGE_LABELS, MaturityStage, ZtPillarId } from './zero-trust-data';

/* Each DoD Zero Trust pillar maps to the NIST SP 800-53 control that best
   represents its core capability. A pillar at Target or Advanced level
   counts as implemented; Not Started counts as planned. */
const PILLAR_CONTROLS: Record<ZtPillarId, { id: string; attackIds: string[] }> = {
  user: { id: 'IA-2(1)', attackIds: ['T1566', 'T1078'] },
  device: { id: 'CM-6', attackIds: ['T1547.001'] },
  network: { id: 'SC-7', attackIds: ['T1021.004', 'T1570'] },
  apps: { id: 'AC-6', attackIds: ['T1548'] },
  data: { id: 'SC-28', attackIds: [] },
  automation: { id: 'IR-4', attackIds: [] },
  visibility: { id: 'AU-6', attackIds: ['T1055', 'T1053.005'] },
};

export function zeroTrustEngagementControls(stages: Record<ZtPillarId, MaturityStage>): EngagementControl[] {
  return MATURITY_PILLARS.map((pillar) => {
    const stage = stages[pillar.id];
    const mapping = PILLAR_CONTROLS[pillar.id];
    return makeControl({
      id: mapping.id,
      status: stage === 'not-started' ? 'planned' : 'implemented',
      sourceTool: 'Zero Trust',
      sourceKey: 'zero-trust',
      basis: `${pillar.name} pillar: ${MATURITY_STAGE_LABELS[stage]}`,
      attackIds: mapping.attackIds,
    });
  });
}
