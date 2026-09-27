import { TestBed } from '@angular/core/testing';
import { DEFAULT_SCENARIO, EngagementService } from './engagement.service';
import { ENGAGEMENT_STORAGE_KEY, EngagementTechnique } from './engagement.model';
import { buildSampleEngagement } from './engagement-sample';
import { TACTIC_STAGES } from '../attack-path/attack-path-data';

const technique: EngagementTechnique = {
  attackId: 'T1566',
  name: 'Phishing',
  tactic: 'Initial Access',
  stealth: 'medium',
  defense: { tool: 'Zero Trust', route: '/zero-trust', note: 'MFA' },
};

describe('EngagementService', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.resetTestingModule();
  });

  const service = () => TestBed.inject(EngagementService);

  it('starts with no engagement when nothing is saved', () => {
    expect(service().state()).toBeNull();
    expect(service().active()).toBe(false);
    expect(service().entryCount()).toBe(0);
  });

  it('persists a started engagement and restores it in a new instance', () => {
    service().start('Test scenario');
    expect(JSON.parse(localStorage.getItem(ENGAGEMENT_STORAGE_KEY)!).scenario).toBe('Test scenario');
    TestBed.resetTestingModule();
    expect(TestBed.inject(EngagementService).state()?.scenario).toBe('Test scenario');
  });

  it('starts an engagement when techniques are set with none active', () => {
    service().setTechniques([technique], 55);
    const s = service().state()!;
    expect(s.scenario).toBe(DEFAULT_SCENARIO);
    expect(s.isSample).toBe(false);
    expect(s.techniques.map((t) => t.attackId)).toEqual(['T1566']);
    expect(s.detectionScore).toBe(55);
  });

  it('replaces a sample with the visitor\'s own record when techniques are set', () => {
    service().loadSample();
    expect(service().state()!.isSample).toBe(true);
    service().setTechniques([technique], 55);
    const s = service().state()!;
    expect(s.isSample).toBe(false);
    expect(s.evidence.length).toBe(0);
    expect(s.controls.length).toBe(0);
  });

  it('keeps the scenario name when an existing engagement gets a new chain', () => {
    service().start('Named');
    service().setTechniques([technique], 55);
    expect(service().state()!.scenario).toBe('Named');
  });

  it('falls back to the default name when renamed to blank', () => {
    service().start('Named');
    service().rename('   ');
    expect(service().state()!.scenario).toBe(DEFAULT_SCENARIO);
  });

  it('records IR decisions without touching the attack chain', () => {
    service().setTechniques([technique], 55);
    service().setDecisions([{ phase: 'Containment', action: 'Isolate host', grade: 'optimal', rationale: 'r' }], 'Ransomware Attack');
    const s = service().state()!;
    expect(s.techniques.length).toBe(1);
    expect(s.decisions.map((d) => d.action)).toEqual(['Isolate host']);
    expect(s.responseScenario).toBe('Ransomware Attack');
  });

  it('replaces one tool\'s controls and keeps the others', () => {
    const c = (id: string, key: string) => ({ id, name: id, status: 'planned' as const, sourceTool: key, attackIds: [] });
    service().setControls('zero-trust', [c('SC-7', 'zero-trust'), c('AC-6', 'zero-trust')]);
    service().setControls('cloud-security', [c('AC-3', 'cloud-security')]);
    service().setControls('zero-trust', [c('IR-4', 'zero-trust')]);
    expect(service().state()!.controls.map((x) => x.id).sort()).toEqual(['AC-3', 'IR-4']);
  });

  it('replaces POA&M items', () => {
    const p = (id: string) => ({ id, controlId: 'SC-7', weakness: 'w', milestone: 'm', targetDays: 30 });
    service().setPoams([p('POA&M-01'), p('POA&M-02')]);
    service().setPoams([p('POA&M-01')]);
    expect(service().state()!.poams.length).toBe(1);
  });

  it('clears state and storage when ended', () => {
    service().start();
    service().end();
    expect(service().state()).toBeNull();
    expect(localStorage.getItem(ENGAGEMENT_STORAGE_KEY)).toBeNull();
  });

  it('ignores malformed or incompatible saved data', () => {
    localStorage.setItem(ENGAGEMENT_STORAGE_KEY, '{not json');
    expect(TestBed.inject(EngagementService).state()).toBeNull();
    TestBed.resetTestingModule();
    localStorage.setItem(ENGAGEMENT_STORAGE_KEY, JSON.stringify({ version: 2, scenario: 'x' }));
    expect(TestBed.inject(EngagementService).state()).toBeNull();
  });
});

describe('sample engagement', () => {
  it('uses techniques that exist in the Attack Path Builder data', () => {
    const known = new Set(TACTIC_STAGES.flatMap((s) => s.techniques.map((t) => t.attackId)));
    for (const t of buildSampleEngagement().techniques) {
      expect(known.has(t.attackId), t.attackId).toBe(true);
    }
  });

  it('links every POA&M item to a planned control', () => {
    const s = buildSampleEngagement();
    for (const p of s.poams) {
      expect(s.controls.find((c) => c.id === p.controlId)?.status, p.id).toBe('planned');
    }
  });
});
