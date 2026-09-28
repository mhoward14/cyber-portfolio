import { TestBed } from '@angular/core/testing';
import { IncidentResponse, recommendScenario } from './incident-response';
import { EngagementService } from '../engagement/engagement.service';
import { sampleTechniques } from '../engagement/engagement-sample';
import { SCENARIOS } from './incident-response-data';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { decodeIrRun } from './incident-response-share';

// IncidentResponse injects EngagementService, so build it in an injection context.
const create = () => TestBed.runInInjectionContext(() => new IncidentResponse());

describe('IncidentResponse', () => {
  it('starts on the scenario-select screen', () => {
    const cmp = create();
    expect(cmp.view()).toBe('select');
    expect(cmp.selectedScenario()).toBeNull();
  });

  it('moves to the decision screen on the first phase when a scenario starts', () => {
    const cmp = create();
    cmp.startScenario(SCENARIOS[0]);
    expect(cmp.view()).toBe('decision');
    expect(cmp.phaseIndex()).toBe(0);
    expect(cmp.currentDecision()).toBe(SCENARIOS[0].decisions[0]);
  });

  it('records a picked option in history and moves to the feedback screen', () => {
    const cmp = create();
    cmp.startScenario(SCENARIOS[0]);
    const option = cmp.currentDecision()!.options[0];
    cmp.pickOption(option);

    expect(cmp.view()).toBe('feedback');
    expect(cmp.selectedOption()).toBe(option);
    expect(cmp.history().length).toBe(1);
    expect(cmp.history()[0].option).toBe(option);
  });

  it('advances through every phase and reaches the debrief on the last one', () => {
    const cmp = create();
    const scenario = SCENARIOS[0];
    cmp.startScenario(scenario);

    for (let i = 0; i < scenario.decisions.length; i++) {
      expect(cmp.view()).toBe('decision');
      cmp.pickOption(cmp.currentDecision()!.options[0]);
      cmp.continueSimulation();
    }
    expect(cmp.view()).toBe('debrief');
    expect(cmp.history().length).toBe(scenario.decisions.length);
  });

  it('rates the response "Strong" when every decision picked is optimal', () => {
    const cmp = create();
    const scenario = SCENARIOS[0];
    cmp.startScenario(scenario);

    for (const decision of scenario.decisions) {
      const optimal = decision.options.find((o) => o.grade === 'optimal')!;
      expect(optimal).toBeDefined();
      cmp.pickOption(optimal);
      cmp.continueSimulation();
    }
    expect(cmp.optimalCount()).toBe(3);
    expect(cmp.ratingGrade()).toBe('optimal');
    expect(cmp.ratingLabel()).toBe('Strong Response');
  });

  it('rates the response "Needs Improvement" when no decision picked is optimal', () => {
    const cmp = create();
    const scenario = SCENARIOS[0];
    cmp.startScenario(scenario);

    for (const decision of scenario.decisions) {
      const nonOptimal = decision.options.find((o) => o.grade !== 'optimal')!;
      expect(nonOptimal).toBeDefined();
      cmp.pickOption(nonOptimal);
      cmp.continueSimulation();
    }
    expect(cmp.optimalCount()).toBe(0);
    expect(cmp.ratingGrade()).toBe('poor');
    expect(cmp.ratingLabel()).toBe('Needs Improvement');
  });

  it('resets fully on restart', () => {
    const cmp = create();
    cmp.startScenario(SCENARIOS[0]);
    cmp.pickOption(cmp.currentDecision()!.options[0]);
    cmp.restart();

    expect(cmp.view()).toBe('select');
    expect(cmp.selectedScenario()).toBeNull();
    expect(cmp.history().length).toBe(0);
    expect(cmp.phaseIndex()).toBe(0);
  });

  it('tracks step status as done, current, or upcoming relative to phase index', () => {
    const cmp = create();
    const scenario = SCENARIOS[0];
    cmp.startScenario(scenario);
    const phases = cmp.phaseOrder;

    expect(cmp.stepStatus(phases[0])).toBe('current');
    expect(cmp.stepStatus(phases[phases.length - 1])).toBe('upcoming');
  });
});

describe('IncidentResponse engagement hand-off', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.resetTestingModule();
  });

  const finish = (cmp: IncidentResponse) => {
    const scenario = SCENARIOS[0];
    cmp.startScenario(scenario);
    for (let i = 0; i < scenario.decisions.length; i++) {
      cmp.pickOption(cmp.currentDecision()!.options[0]);
      cmp.continueSimulation();
    }
  };

  it('writes graded decisions and the scenario name to the engagement', () => {
    const cmp = create();
    finish(cmp);
    cmp.addToEngagement();
    const s = TestBed.inject(EngagementService).state()!;
    expect(s.responseScenario).toBe(SCENARIOS[0].name);
    expect(s.decisions.length).toBe(SCENARIOS[0].decisions.length);
    expect(s.decisions[0].grade).toBe(SCENARIOS[0].decisions[0].options[0].grade);
    expect(cmp.addedToEngagement()).toBe(true);
  });

  it('keeps an existing attack chain when adding decisions', () => {
    const svc = TestBed.inject(EngagementService);
    svc.setTechniques(sampleTechniques(), 60);
    const cmp = create();
    finish(cmp);
    cmp.addToEngagement();
    expect(svc.state()!.techniques.length).toBe(sampleTechniques().length);
    expect(svc.state()!.decisions.length).toBe(SCENARIOS[0].decisions.length);
  });

  it('does nothing before the debrief', () => {
    const cmp = create();
    cmp.startScenario(SCENARIOS[0]);
    cmp.addToEngagement();
    expect(TestBed.inject(EngagementService).state()).toBeNull();
  });

  it('recommends a scenario only for the visitor\'s own engagement', () => {
    const svc = TestBed.inject(EngagementService);
    const cmp = create();
    svc.loadSample();
    expect(cmp.recommended()).toBeNull();
    svc.setTechniques(sampleTechniques(), 60);
    expect(cmp.recommended()?.scenarioId).toBe('ransomware');
  });
});

describe('recommendScenario', () => {
  const t = (attackId: string) => ({
    attackId,
    name: attackId,
    tactic: 'x',
    stealth: 'low' as const,
    defense: { tool: 'x', route: '/', note: 'x' },
  });

  it('lets an encryption impact outrank the initial-access technique', () => {
    expect(recommendScenario([t('T1566'), t('T1486')])?.scenarioId).toBe('ransomware');
  });

  it('falls back to phishing, then insider threat', () => {
    expect(recommendScenario([t('T1566'), t('T1489')])?.scenarioId).toBe('phishing');
    expect(recommendScenario([t('T1078')])?.scenarioId).toBe('insider-threat');
  });

  it('returns null when nothing in the chain maps to a scenario', () => {
    expect(recommendScenario([t('T1190'), t('T1489')])).toBeNull();
  });

  it('only recommends scenarios that exist', () => {
    const ids = new Set(SCENARIOS.map((s) => s.id));
    for (const id of ['T1486', 'T1566', 'T1078']) {
      expect(ids.has(recommendScenario([t(id)])!.scenarioId)).toBe(true);
    }
  });
});

const sharedRoute = (code: string) => ({
  provide: ActivatedRoute,
  useValue: { snapshot: { queryParamMap: convertToParamMap({ s: code }) } },
});

describe('IncidentResponse share links', () => {
  it('should reopen a finished run at its debrief, and leave shared mode on restart', () => {
    const cmp = create();
    const scenario = SCENARIOS[1];
    cmp.startScenario(scenario);
    for (const d of scenario.decisions) {
      cmp.pickOption(d.options[d.options.length - 1]);
      cmp.continueSimulation();
    }
    const code = cmp.shareCode()!;
    expect(decodeIrRun(code)!.scenario).toBe(scenario);
    for (const bad of ['i1.9.000', 'i1.1.00', 'i1.1.999', 'i1.x.000']) expect(decodeIrRun(bad), bad).toBeNull();

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [sharedRoute(code)] });
    const viewer = create();
    expect(viewer.view()).toBe('debrief');
    expect(viewer.ratingLabel()).toBe(cmp.ratingLabel());
    expect(viewer.shareCode()).toBe(code);
    viewer.restart();
    expect(viewer.share.viewing()).toBe(false);
    expect(viewer.view()).toBe('select');
  });
});
