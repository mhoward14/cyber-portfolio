import { packValues, splitCode, unpackValues } from '../share/share-link';
import { TRANSACTION_TYPES, TransactionTypeId } from './transaction-security-data';

export interface TransactionShare {
  typeId: TransactionTypeId;
  /** `${typeId}:${stageId}` -> secure */
  settings: Record<string, boolean>;
}

const ALL = TRANSACTION_TYPES.flatMap((t) => t.stages.map((s) => `${t.id}:${s.id}`));

/** "t1.<type>.<one bit per stage across all types>" */
export function encodeTransaction(s: TransactionShare): string {
  const t = TRANSACTION_TYPES.findIndex((x) => x.id === s.typeId);
  return `t1.${t}.${packValues(ALL.map((k) => (s.settings[k] ? 1 : 0)), 1)}`;
}

export function decodeTransaction(code: string): TransactionShare | null {
  const parts = splitCode(code, 't1', 2);
  if (!parts || !/^\d$/.test(parts[0])) return null;
  const type = TRANSACTION_TYPES[Number(parts[0])];
  const bits = unpackValues(parts[1], 1, ALL.length);
  if (!type || !bits) return null;
  return { typeId: type.id, settings: Object.fromEntries(ALL.map((k, i) => [k, bits[i] === 1])) };
}
