import { reportCsv } from '../share/export-file';
import type { PathPick } from './attack-path';

export function attackPathCsv(picks: PathPick[], score: number, tierLabel: string): string {
  return reportCsv(
    'Attack Path Builder: attack chain',
    [['Detection likelihood', `${score}/100 (${tierLabel})`]],
    ['Stage', 'Technique', 'ATT&CK ID', 'Stealth', 'Caught by (tool)', 'Where it gets caught', 'ATT&CK reference'],
    picks.map((p) => [
      p.stage.name,
      p.technique.name,
      p.technique.attackId,
      p.technique.stealth,
      p.technique.defense.tool,
      p.technique.defense.note,
      `https://attack.mitre.org/techniques/${p.technique.attackId.replace('.', '/')}/`,
    ]),
  );
}
