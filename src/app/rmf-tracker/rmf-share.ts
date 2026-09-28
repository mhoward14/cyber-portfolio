import { packValues, splitCode, unpackValues } from '../share/share-link';
import { CONTROLS, ControlStatus, Tier } from './rmf-data';

export interface RmfShare {
  tier: Tier | null;
  statuses: Record<string, ControlStatus>;
}

const TIERS: (Tier | null)[] = [null, 'low', 'moderate', 'high'];
/** Index 0 is "not assessed yet". */
const STATUSES: (ControlStatus | null)[] = [null, 'implemented', 'partial', 'not-implemented', 'na'];

/** "r1.<tier>.<three bits per control>". Notes are free text and stay private. */
export function encodeRmf(s: RmfShare): string {
  return `r1.${TIERS.indexOf(s.tier)}.${packValues(CONTROLS.map((c) => STATUSES.indexOf(s.statuses[c.id] ?? null)), 3)}`;
}

export function decodeRmf(code: string): RmfShare | null {
  const parts = splitCode(code, 'r1', 2);
  if (!parts || !/^[0-3]$/.test(parts[0])) return null;
  const values = unpackValues(parts[1], 3, CONTROLS.length);
  if (!values || values.some((v) => v >= STATUSES.length)) return null;
  const statuses: Record<string, ControlStatus> = {};
  CONTROLS.forEach((c, i) => {
    const s = STATUSES[values[i]];
    if (s) statuses[c.id] = s;
  });
  return { tier: TIERS[Number(parts[0])], statuses };
}
