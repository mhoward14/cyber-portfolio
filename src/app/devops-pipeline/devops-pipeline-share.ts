import { packValues, splitCode, unpackValues } from '../share/share-link';
import { PIPELINE_STAGES } from './devops-pipeline-data';

const ALL = PIPELINE_STAGES.flatMap((s) => s.gates.map((g) => g.id));

/** "d1.<one bit per gate>" */
export function encodePipeline(settings: Record<string, boolean>): string {
  return `d1.${packValues(ALL.map((id) => (settings[id] ? 1 : 0)), 1)}`;
}

export function decodePipeline(code: string): Record<string, boolean> | null {
  const parts = splitCode(code, 'd1', 1);
  const bits = parts && unpackValues(parts[0], 1, ALL.length);
  if (!bits) return null;
  return Object.fromEntries(ALL.map((id, i) => [id, bits[i] === 1]));
}
