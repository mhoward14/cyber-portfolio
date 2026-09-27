import { TestBed } from '@angular/core/testing';
import { baseControlId, buildEngagementPoams, importEngagementControls, PRIORITY_DAYS, requiredTier, STANDARD_DAYS } from './rmf-engagement';
import { RmfTracker } from './rmf-tracker';
import { makeControl } from '../engagement/control-catalog';
import { EngagementService } from '../engagement/engagement.service';
import { Engagement, EngagementControl } from '../engagement/engagement.model';
import { sampleTechniques } from '../engagement/engagement-sample';

const ctrl = (id: string, status: 'implemented' | 'planned', sourceKey = 'zero-trust', attackIds: string[] = []) =>
  makeControl({ id, status, sourceTool: sourceKey, sourceKey, basis: `${id} basis`, attackIds });

const engagementWith = (controls: EngagementControl[]): Engagement => ({
  version: 1,
  scenario: 'Test',
  startedAt: new Date().toISOString(),
  isSample: false,
  techniques: sampleTechniques(),
  detectionScore: 60,
  evidence: [],
  decisions: [],
  controls,
  poams: [],
});

describe('RMF engagement import', () => {
  it('tracks control enhancements as their base control', () => {
    expect(baseControlId('IA-2(1)')).toBe('IA-2');
    expect(baseControlId('SC-7')).toBe('SC-7');
  });

  it('combines tools into implemented, partial, or not implemented', () => {
    const imported = importEngagementControls([
      ctrl('SC-7', 'implemented', 'zero-trust'),
      ctrl('SC-7', 'planned', 'cloud-security'),
      ctrl('IA-2(1)', 'implemented', 'zero-trust'),
      ctrl('IA-2(1)', 'implemented', 'cloud-security'),
      ctrl('SI-2', 'planned', 'devops-pipeline'),
    ]);
    const byId = Object.fromEntries(imported.map((i) => [i.id, i.status]));
    expect(byId).toEqual({ 'SC-7': 'partial', 'IA-2': 'implemented', 'SI-2': 'not-implemented' });
    expect(imported.find((i) => i.id === 'SC-7')!.note).toContain('cloud-security');
  });

  it('picks the lowest baseline that covers every control', () => {
    expect(requiredTier(['SC-7', 'IA-2'])).toBe('low');
    expect(requiredTier(['SC-7', 'SA-11'])).toBe('moderate');
  });
});

describe('RMF engagement POA&M', () => {
  it('drafts items only for open controls and prioritizes ones that counter the attack chain', () => {
    const e = engagementWith([
      ctrl('IA-2(1)', 'planned', 'zero-trust', ['T1566']),
      ctrl('SC-28', 'planned', 'zero-trust'),
      ctrl('SC-7', 'implemented', 'zero-trust'),
    ]);
    const statuses: Record<string, 'implemented' | 'not-implemented'> = {
      'IA-2': 'not-implemented',
      'SC-28': 'not-implemented',
      'SC-7': 'implemented',
    };
    const poams = buildEngagementPoams(e, (id) => statuses[id]);
    expect(poams.map((p) => p.controlId)).toEqual(['IA-2', 'SC-28']);
    expect(poams[0].id).toBe('POA&M-01');
    expect(poams[0].targetDays).toBe(PRIORITY_DAYS);
    expect(poams[0].weakness).toContain('Phishing (T1566)');
    expect(poams[1].targetDays).toBe(STANDARD_DAYS);
  });
});

describe('RMF engagement POA&M ordering', () => {
  it('lists attack-chain priorities first and renumbers', () => {
    const e = engagementWith([
      ctrl('SC-28', 'planned', 'zero-trust'),
      ctrl('SC-7', 'planned', 'zero-trust', ['T1570']),
      ctrl('AC-6', 'planned', 'zero-trust'),
    ]);
    const poams = buildEngagementPoams(e, () => 'not-implemented');
    expect(poams.map((p) => p.controlId)).toEqual(['SC-7', 'SC-28', 'AC-6']);
    expect(poams.map((p) => p.id)).toEqual(['POA&M-01', 'POA&M-02', 'POA&M-03']);
  });
});

describe('RmfTracker engagement flow', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.resetTestingModule();
  });

  it('imports engagement controls, raises the baseline, and sends POA&M to the engagement', () => {
    localStorage.setItem('rmf-tracker-state', JSON.stringify({ tier: 'low', statuses: {}, notes: {}, sample: false }));
    const svc = TestBed.inject(EngagementService);
    svc.setTechniques(sampleTechniques(), 60);
    svc.setControls('devops-pipeline', [ctrl('SA-11', 'planned', 'devops-pipeline'), ctrl('SI-2', 'implemented', 'devops-pipeline')]);
    const cmp = TestBed.runInInjectionContext(() => new RmfTracker());

    expect(cmp.importInSync()).toBe(false);
    cmp.importFromEngagement();
    expect(cmp.tier()).toBe('moderate');
    expect(cmp.tierRaisedTo()).toBe('moderate');
    expect(cmp.statusOf('SA-11')).toBe('not-implemented');
    expect(cmp.statusOf('SI-2')).toBe('implemented');
    expect(cmp.importInSync()).toBe(true);

    expect(cmp.engagementPoams().map((p) => p.controlId)).toEqual(['SA-11']);
    cmp.sendPoamsToEngagement();
    expect(svc.state()!.poams.map((p) => p.controlId)).toEqual(['SA-11']);
    expect(cmp.poamsInSync()).toBe(true);
  });

  it('ignores the sample engagement', () => {
    const svc = TestBed.inject(EngagementService);
    svc.loadSample();
    const cmp = TestBed.runInInjectionContext(() => new RmfTracker());
    expect(cmp.ownEngagement()).toBe(false);
    expect(cmp.engagementImport().length).toBe(0);
  });
});
