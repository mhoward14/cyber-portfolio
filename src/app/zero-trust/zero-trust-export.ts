import { reportCsv } from '../share/export-file';
import { DeploymentModel, MATURITY_PILLARS, MATURITY_STAGE_LABELS, MODEL_LABELS, MaturityStage, PROVIDER_LABELS, Provider, ZtPillarId } from './zero-trust-data';

export function zeroTrustCsv(stages: Record<ZtPillarId, MaturityStage>, provider: Provider, model: DeploymentModel): string {
  const counts = (s: MaturityStage) => MATURITY_PILLARS.filter((p) => stages[p.id] === s).length;
  return reportCsv(
    'Zero Trust Architecture Explorer: maturity assessment',
    [
      ['Framework', 'DoD Zero Trust Strategy (seven pillars)'],
      ['Cloud context', `${PROVIDER_LABELS[provider]} ${MODEL_LABELS[model]}`],
      ['Profile', `${counts('advanced')} advanced, ${counts('target')} target, ${counts('not-started')} not started`],
    ],
    ['Pillar', 'Current stage', 'Recommended next step'],
    MATURITY_PILLARS.map((p) => [p.name, MATURITY_STAGE_LABELS[stages[p.id]], p.recommendations[stages[p.id]]]),
  );
}
