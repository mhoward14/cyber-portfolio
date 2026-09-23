import { IncidentResponse } from './incident-response';
import { SCENARIOS } from './incident-response-data';

describe('IncidentResponse', () => {
  it('starts on the scenario-select screen', () => {
    const cmp = new IncidentResponse();
    expect(cmp.view()).toBe('select');
    expect(cmp.selectedScenario()).toBeNull();
  });

  it('moves to the decision screen on the first phase when a scenario starts', () => {
    const cmp = new IncidentResponse();
    cmp.startScenario(SCENARIOS[0]);
    expect(cmp.view()).toBe('decision');
    expect(cmp.phaseIndex()).toBe(0);
    expect(cmp.currentDecision()).toBe(SCENARIOS[0].decisions[0]);
  });

  it('records a picked option in history and moves to the feedback screen', () => {
    const cmp = new IncidentResponse();
    cmp.startScenario(SCENARIOS[0]);
    const option = cmp.currentDecision()!.options[0];
    cmp.pickOption(option);

    expect(cmp.view()).toBe('feedback');
    expect(cmp.selectedOption()).toBe(option);
    expect(cmp.history().length).toBe(1);
    expect(cmp.history()[0].option).toBe(option);
  });

  it('advances through every phase and reaches the debrief on the last one', () => {
    const cmp = new IncidentResponse();
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
    const cmp = new IncidentResponse();
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
    const cmp = new IncidentResponse();
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
    const cmp = new IncidentResponse();
    cmp.startScenario(SCENARIOS[0]);
    cmp.pickOption(cmp.currentDecision()!.options[0]);
    cmp.restart();

    expect(cmp.view()).toBe('select');
    expect(cmp.selectedScenario()).toBeNull();
    expect(cmp.history().length).toBe(0);
    expect(cmp.phaseIndex()).toBe(0);
  });

  it('tracks step status as done, current, or upcoming relative to phase index', () => {
    const cmp = new IncidentResponse();
    const scenario = SCENARIOS[0];
    cmp.startScenario(scenario);
    const phases = cmp.phaseOrder;

    expect(cmp.stepStatus(phases[0])).toBe('current');
    expect(cmp.stepStatus(phases[phases.length - 1])).toBe('upcoming');
  });
});
