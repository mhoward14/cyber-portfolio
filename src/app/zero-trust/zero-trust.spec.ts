import { TestBed } from '@angular/core/testing';
import { ZeroTrust } from './zero-trust';

const create = () => TestBed.runInInjectionContext(() => new ZeroTrust());
import { MATURITY_PILLARS } from './zero-trust-data';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { decodeZeroTrust } from './zero-trust-share';
import { zeroTrustCsv } from './zero-trust-export';

describe('ZeroTrust', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('defaults to the AWS/IaaS flow view with no node selected', () => {
    const cmp = create();
    expect(cmp.provider()).toBe('aws');
    expect(cmp.model()).toBe('iaas');
    expect(cmp.selectedNode()).toBeNull();
    expect(cmp.activeTab()).toBe('flow');
  });

  it('reorders the provider tabs so the selected provider comes first', () => {
    const cmp = create();
    cmp.setProvider('gcp');
    expect(cmp.orderedProviders()[0]).toBe('gcp');
    expect(cmp.orderedProviders().length).toBe(3);
  });

  it('opens and closes a node detail panel', () => {
    const cmp = create();
    const node = cmp.nodes[0];
    cmp.openNode(node);
    expect(cmp.selectedNode()).toBe(node);
    cmp.closeNode();
    expect(cmp.selectedNode()).toBeNull();
  });

  it('looks up node responsibility for the currently selected deployment model', () => {
    const cmp = create();
    const node = cmp.nodes[0];
    cmp.setModel('saas');
    expect(cmp.responsibilityOf(node)).toBe(node.responsibilityByModel.saas);
  });

  it('seeds a maturity profile covering every pillar on first load', () => {
    const cmp = create();
    expect(Object.keys(cmp.maturityStages()).length).toBe(MATURITY_PILLARS.length);
    for (const pillar of MATURITY_PILLARS) {
      expect(cmp.stageOf(pillar)).toBeDefined();
    }
  });

  it('excludes advanced pillars from nextSteps and includes everything else', () => {
    const cmp = create();
    for (const pillar of MATURITY_PILLARS) {
      cmp.setStage(pillar, 'advanced');
    }
    expect(cmp.nextSteps().length).toBe(0);

    const pillar = MATURITY_PILLARS[0];
    cmp.setStage(pillar, 'not-started');
    expect(cmp.nextSteps().some((s) => s.pillar.id === pillar.id)).toBe(true);
  });

  it('counts maturity stages correctly in the profile summary', () => {
    const cmp = create();
    for (const pillar of MATURITY_PILLARS) {
      cmp.setStage(pillar, 'target');
    }
    const summary = cmp.maturityProfileSummary();
    expect(summary.target).toBe(MATURITY_PILLARS.length);
    expect(summary['not-started']).toBe(0);
    expect(summary.advanced).toBe(0);
  });

  it('persists maturity stage changes to localStorage across instantiations', () => {
    const first = create();
    const pillar = MATURITY_PILLARS[0];
    first.setStage(pillar, 'advanced');

    const second = create();
    expect(second.stageOf(pillar)).toBe('advanced');
  });

  it('switches between the flow, attack-path, and maturity tabs', () => {
    const cmp = create();
    cmp.setTab('maturity');
    expect(cmp.activeTab()).toBe('maturity');
    cmp.setTab('attack-path');
    expect(cmp.activeTab()).toBe('attack-path');
  });
});

describe('ZeroTrust focus from an Attack Path link', () => {
  it('opens the matching maturity pillar', () => {
    const zt = create();
    zt.focusFromTechnique({ attackId: 'T1021.004', name: '', tactic: '', note: '' });
    expect(zt.activeTab()).toBe('maturity');
    expect(zt.highlightedPillar()).toBe('network');
  });

  it('ignores techniques with no Zero Trust pillar', () => {
    const zt = create();
    zt.focusFromTechnique({ attackId: 'T1486', name: '', tactic: '', note: '' });
    expect(zt.highlightedPillar()).toBeNull();
  });
});

const sharedRoute = (code: string) => ({
  provide: ActivatedRoute,
  useValue: { snapshot: { queryParamMap: convertToParamMap({ s: code }) } },
});

describe('ZeroTrust share links', () => {
  beforeEach(() => localStorage.clear());

  it('should round-trip provider, model, tab, and maturity, and reject bad codes', () => {
    const cmp = create();
    cmp.setProvider('gcp');
    cmp.setModel('saas');
    cmp.setTab('maturity');
    cmp.setStage(MATURITY_PILLARS[3], 'advanced');
    const decoded = decodeZeroTrust(cmp.shareCode())!;
    expect(decoded).toEqual({ provider: 'gcp', model: 'saas', tab: 'maturity', stages: cmp.maturityStages() });
    for (const bad of ['z1.300.AAA', 'z1.000.A', 'z1.000.____', 'z2.000.AAA']) expect(decodeZeroTrust(bad), bad).toBeNull();
  });

  it('should open a shared assessment on its tab without overwriting saved maturity', () => {
    const own = create();
    const saved = localStorage.getItem('zero-trust-maturity-state');
    const other = create();
    for (const p of MATURITY_PILLARS) other.setStage(p, 'advanced');
    other.setTab('maturity');
    const code = other.shareCode();
    localStorage.setItem('zero-trust-maturity-state', saved!);

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [sharedRoute(code)] });
    const viewer = create();
    expect(viewer.activeTab()).toBe('maturity');
    expect(viewer.nextSteps().length).toBe(0);
    viewer.setStage(MATURITY_PILLARS[0], 'not-started');
    expect(localStorage.getItem('zero-trust-maturity-state')).toBe(saved);
    viewer.discardShared();
    expect(viewer.maturityStages()).toEqual(own.maturityStages());
  });
});

describe('ZeroTrust CSV export', () => {
  it('should export each pillar with its stage and the matching next step', () => {
    localStorage.clear();
    const zt = create();
    const csv = zeroTrustCsv(zt.maturityStages(), zt.provider(), zt.model());
    for (const p of MATURITY_PILLARS) {
      expect(csv).toContain(p.recommendations[zt.maturityStages()[p.id]].replace(/"/g, '""'));
    }
    expect(csv).toContain('AWS IaaS');
  });
});
