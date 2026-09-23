import { ZeroTrust } from './zero-trust';
import { MATURITY_PILLARS } from './zero-trust-data';

describe('ZeroTrust', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('defaults to the AWS/IaaS flow view with no node selected', () => {
    const cmp = new ZeroTrust();
    expect(cmp.provider()).toBe('aws');
    expect(cmp.model()).toBe('iaas');
    expect(cmp.selectedNode()).toBeNull();
    expect(cmp.activeTab()).toBe('flow');
  });

  it('reorders the provider tabs so the selected provider comes first', () => {
    const cmp = new ZeroTrust();
    cmp.setProvider('gcp');
    expect(cmp.orderedProviders()[0]).toBe('gcp');
    expect(cmp.orderedProviders().length).toBe(3);
  });

  it('opens and closes a node detail panel', () => {
    const cmp = new ZeroTrust();
    const node = cmp.nodes[0];
    cmp.openNode(node);
    expect(cmp.selectedNode()).toBe(node);
    cmp.closeNode();
    expect(cmp.selectedNode()).toBeNull();
  });

  it('looks up node responsibility for the currently selected deployment model', () => {
    const cmp = new ZeroTrust();
    const node = cmp.nodes[0];
    cmp.setModel('saas');
    expect(cmp.responsibilityOf(node)).toBe(node.responsibilityByModel.saas);
  });

  it('seeds a maturity profile covering every pillar on first load', () => {
    const cmp = new ZeroTrust();
    expect(Object.keys(cmp.maturityStages()).length).toBe(MATURITY_PILLARS.length);
    for (const pillar of MATURITY_PILLARS) {
      expect(cmp.stageOf(pillar)).toBeDefined();
    }
  });

  it('excludes advanced pillars from nextSteps and includes everything else', () => {
    const cmp = new ZeroTrust();
    for (const pillar of MATURITY_PILLARS) {
      cmp.setStage(pillar, 'advanced');
    }
    expect(cmp.nextSteps().length).toBe(0);

    const pillar = MATURITY_PILLARS[0];
    cmp.setStage(pillar, 'not-started');
    expect(cmp.nextSteps().some((s) => s.pillar.id === pillar.id)).toBe(true);
  });

  it('counts maturity stages correctly in the profile summary', () => {
    const cmp = new ZeroTrust();
    for (const pillar of MATURITY_PILLARS) {
      cmp.setStage(pillar, 'target');
    }
    const summary = cmp.maturityProfileSummary();
    expect(summary.target).toBe(MATURITY_PILLARS.length);
    expect(summary['not-started']).toBe(0);
    expect(summary.advanced).toBe(0);
  });

  it('persists maturity stage changes to localStorage across instantiations', () => {
    const first = new ZeroTrust();
    const pillar = MATURITY_PILLARS[0];
    first.setStage(pillar, 'advanced');

    const second = new ZeroTrust();
    expect(second.stageOf(pillar)).toBe('advanced');
  });

  it('switches between the flow, attack-path, and maturity tabs', () => {
    const cmp = new ZeroTrust();
    cmp.setTab('maturity');
    expect(cmp.activeTab()).toBe('maturity');
    cmp.setTab('attack-path');
    expect(cmp.activeTab()).toBe('attack-path');
  });
});
