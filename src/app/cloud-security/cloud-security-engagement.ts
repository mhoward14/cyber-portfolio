import { makeControl } from '../engagement/control-catalog';
import { EngagementControl } from '../engagement/engagement.model';
import { ProviderConfig, ResourceCategory } from './cloud-security-data';

/* Each resource category maps to the NIST SP 800-53 control its setting
   implements. The mapping is provider-agnostic: Azure, AWS, and GCP each
   have one resource per category. */
const CATEGORY_CONTROLS: Record<ResourceCategory, { id: string; attackIds: string[] }> = {
  storage: { id: 'AC-3', attackIds: ['T1530'] },
  compute: { id: 'SC-28', attackIds: [] },
  network: { id: 'SC-7', attackIds: ['T1190', 'T1021.004'] },
  identity: { id: 'IA-2(1)', attackIds: ['T1078', 'T1566'] },
  secrets: { id: 'SC-12', attackIds: ['T1552'] },
};

export function cloudEngagementControls(
  provider: ProviderConfig,
  isSecure: (resourceId: string) => boolean,
): EngagementControl[] {
  return provider.resources.map((r) => {
    const secure = isSecure(r.id);
    const mapping = CATEGORY_CONTROLS[r.category];
    return makeControl({
      id: mapping.id,
      status: secure ? 'implemented' : 'planned',
      sourceTool: `Cloud Security (${provider.shortName})`,
      sourceKey: 'cloud-security',
      basis: `${r.name}: ${r.settingLabel.toLowerCase()} ${(secure ? r.secureValue : r.insecureValue).toLowerCase()}`,
      attackIds: mapping.attackIds,
    });
  });
}
