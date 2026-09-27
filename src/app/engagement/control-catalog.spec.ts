import { CONTROL_TITLES, frameworkEquivalents, makeControl } from './control-catalog';
import { CROSSWALK_DATA } from '../crosswalk/crosswalk-data';
import { PROVIDERS } from '../cloud-security/cloud-security-data';
import { cloudEngagementControls } from '../cloud-security/cloud-security-engagement';
import { zeroTrustEngagementControls } from '../zero-trust/zero-trust-engagement';
import { MATURITY_PILLARS, MaturityStage, ZtPillarId } from '../zero-trust/zero-trust-data';
import { devopsEngagementControls } from '../devops-pipeline/devops-pipeline-engagement';
import { PIPELINE_STAGES } from '../devops-pipeline/devops-pipeline-data';

describe('control catalog', () => {
  it('takes CIS and ISO equivalents from the Framework Crosswalk when it covers the control', () => {
    const mfa = CROSSWALK_DATA.find((e) => e.frameworks.nist.id === 'IA-2(1)')!;
    expect(frameworkEquivalents('IA-2(1)')).toEqual({ cis: mfa.frameworks.cis.id, iso: mfa.frameworks.iso.id });
  });

  it('matches one control inside a combined Crosswalk entry such as "CM-2 / CM-6"', () => {
    expect(frameworkEquivalents('CM-6').iso).toBe('A.8.9');
  });

  it('rejects controls without an official title', () => {
    expect(() => makeControl({ id: 'XX-1', status: 'planned', sourceTool: 't', sourceKey: 'k', basis: 'b' })).toThrow();
  });
});

describe('Cloud Security controls', () => {
  for (const provider of PROVIDERS) {
    it(`maps every ${provider.shortName} resource to a known control`, () => {
      const controls = cloudEngagementControls(provider, () => false);
      expect(controls.length).toBe(provider.resources.length);
      for (const c of controls) expect(CONTROL_TITLES[c.id]).toBeTruthy();
    });
  }

  it('marks secure resources implemented and the rest planned', () => {
    const provider = PROVIDERS[0];
    const secureId = provider.resources[0].id;
    const controls = cloudEngagementControls(provider, (id) => id === secureId);
    expect(controls.filter((c) => c.status === 'implemented').length).toBe(1);
    expect(controls[0].sourceTool).toBe(`Cloud Security (${provider.shortName})`);
  });
});

describe('Zero Trust controls', () => {
  const stages = (stage: MaturityStage) =>
    Object.fromEntries(MATURITY_PILLARS.map((p) => [p.id, stage])) as Record<ZtPillarId, MaturityStage>;

  it('maps each of the seven pillars to a control', () => {
    expect(zeroTrustEngagementControls(stages('not-started')).length).toBe(7);
  });

  it('counts Target and Advanced as implemented', () => {
    expect(zeroTrustEngagementControls(stages('target')).every((c) => c.status === 'implemented')).toBe(true);
    expect(zeroTrustEngagementControls(stages('not-started')).every((c) => c.status === 'planned')).toBe(true);
  });
});

describe('CI/CD Pipeline controls', () => {
  it('rolls every gate up into a known control', () => {
    const controls = devopsEngagementControls(() => true);
    const gateCount = PIPELINE_STAGES.flatMap((s) => s.gates).length;
    expect(controls.length).toBeLessThan(gateCount);
    for (const c of controls) expect(CONTROL_TITLES[c.id]).toBeTruthy();
    expect(controls.every((c) => c.status === 'implemented')).toBe(true);
  });

  it('keeps a control planned until every gate behind it is secure', () => {
    const controls = devopsEngagementControls((id) => id !== 'dast');
    expect(controls.find((c) => c.id === 'SA-11')!.status).toBe('planned');
    expect(controls.find((c) => c.id === 'RA-5')!.status).toBe('implemented');
  });
});
