import { splitCode } from '../share/share-link';
import { TACTIC_STAGES } from './attack-path-data';
import type { PathPick } from './attack-path';

/** "a1.0120" — one digit per stage: the chosen technique's position in that stage. */
export function encodeAttackPath(picks: PathPick[]): string {
  return `a1.${picks.map((p) => p.stage.techniques.indexOf(p.technique)).join('')}`;
}

export function decodeAttackPath(code: string): PathPick[] | null {
  const parts = splitCode(code, 'a1', 1);
  if (!parts || !/^\d{1,6}$/.test(parts[0]) || parts[0].length > TACTIC_STAGES.length) return null;
  const picks: PathPick[] = [];
  for (let i = 0; i < parts[0].length; i++) {
    const stage = TACTIC_STAGES[i];
    const technique = stage.techniques[Number(parts[0][i])];
    if (!technique) return null;
    picks.push({ stage, technique });
  }
  return picks;
}
