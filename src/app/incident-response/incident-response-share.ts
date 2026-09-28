import { splitCode } from '../share/share-link';
import { DecisionOption, SCENARIOS, Scenario } from './incident-response-data';

export interface IrShare {
  scenario: Scenario;
  choices: DecisionOption[];
}

/** "i1.<scenario>.<one digit per decision: the option chosen>" — a finished run. */
export function encodeIrRun(scenario: Scenario, choices: DecisionOption[]): string {
  const s = SCENARIOS.indexOf(scenario);
  return `i1.${s}.${choices.map((c, i) => scenario.decisions[i].options.indexOf(c)).join('')}`;
}

export function decodeIrRun(code: string): IrShare | null {
  const parts = splitCode(code, 'i1', 2);
  if (!parts || !/^\d$/.test(parts[0]) || !/^\d+$/.test(parts[1])) return null;
  const scenario = SCENARIOS[Number(parts[0])];
  if (!scenario || parts[1].length !== scenario.decisions.length) return null;
  const choices = scenario.decisions.map((d, i) => d.options[Number(parts[1][i])]);
  return choices.every(Boolean) ? { scenario, choices } : null;
}
