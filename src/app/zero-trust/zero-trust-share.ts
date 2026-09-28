import { packValues, splitCode, unpackValues } from '../share/share-link';
import { DeploymentModel, MATURITY_PILLARS, MaturityStage, Provider, ZtPillarId } from './zero-trust-data';

export type ZtShareTab = 'flow' | 'attack-path' | 'maturity';

export interface ZeroTrustShare {
  provider: Provider;
  model: DeploymentModel;
  tab: ZtShareTab;
  stages: Record<ZtPillarId, MaturityStage>;
}

const PROVIDERS: Provider[] = ['aws', 'azure', 'gcp'];
const MODELS: DeploymentModel[] = ['iaas', 'paas', 'saas'];
const TABS: ZtShareTab[] = ['flow', 'attack-path', 'maturity'];
const STAGES: MaturityStage[] = ['not-started', 'target', 'advanced'];

/** "z1.<provider><model><tab>.<two bits per pillar>" */
export function encodeZeroTrust(s: ZeroTrustShare): string {
  const head = `${PROVIDERS.indexOf(s.provider)}${MODELS.indexOf(s.model)}${TABS.indexOf(s.tab)}`;
  return `z1.${head}.${packValues(MATURITY_PILLARS.map((p) => STAGES.indexOf(s.stages[p.id])), 2)}`;
}

export function decodeZeroTrust(code: string): ZeroTrustShare | null {
  const parts = splitCode(code, 'z1', 2);
  if (!parts || !/^[0-2]{3}$/.test(parts[0])) return null;
  const values = unpackValues(parts[1], 2, MATURITY_PILLARS.length);
  if (!values || values.some((v) => v > 2)) return null;
  return {
    provider: PROVIDERS[Number(parts[0][0])],
    model: MODELS[Number(parts[0][1])],
    tab: TABS[Number(parts[0][2])],
    stages: Object.fromEntries(MATURITY_PILLARS.map((p, i) => [p.id, STAGES[values[i]]])) as Record<ZtPillarId, MaturityStage>,
  };
}
