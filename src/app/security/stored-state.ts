/* ============================================================
   STORED-STATE.TS — VALIDATED BROWSER STORAGE
   Saved tool state is read back as untrusted input: storage can be
   edited by hand, left behind by an older version of a tool, or
   written by other pages on the same github.io origin. Each reader
   keeps only the keys the tool knows, with values of the expected
   type, and fills anything missing from the tool's defaults, so a bad
   entry can never break a page or smuggle in unexpected data.
   ============================================================ */

const MAX_STORED_CHARS = 1_000_000;

/** Parse a stored JSON value, or null when absent, oversized, or malformed. */
export function readStored(key: string, storage: Storage | undefined = globalThis.localStorage): unknown {
  try {
    const raw = storage?.getItem(key);
    if (!raw || raw.length > MAX_STORED_CHARS) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Overlay the saved values on `defaults`, keeping only the keys defaults
 *  has and only values that pass `accept`. Null when `saved` isn't an object. */
export function mergeKnown<T>(saved: unknown, defaults: Record<string, T>, accept: (value: unknown) => value is T): Record<string, T> | null {
  if (!isPlainObject(saved)) return null;
  const out: Record<string, T> = { ...defaults };
  for (const key of Object.keys(defaults)) {
    if (Object.hasOwn(saved, key) && accept(saved[key])) out[key] = saved[key] as T;
  }
  return out;
}

/** Keep only entries whose key is in `keys` and whose value passes `accept`. */
export function pickKnown<T>(saved: unknown, keys: ReadonlySet<string>, accept: (value: unknown) => value is T): Record<string, T> {
  const out: Record<string, T> = {};
  if (!isPlainObject(saved)) return out;
  for (const [key, value] of Object.entries(saved)) {
    if (keys.has(key) && accept(value)) out[key] = value;
  }
  return out;
}

export const isBoolean = (value: unknown): value is boolean => typeof value === 'boolean';

export function oneOf<T extends string>(allowed: readonly T[]) {
  return (value: unknown): value is T => typeof value === 'string' && (allowed as readonly string[]).includes(value);
}

export function shortText(maxLength: number) {
  return (value: unknown): value is string => typeof value === 'string' && value.length <= maxLength;
}

/** Load a Record<string, boolean> tool state: saved values over the seed. */
export function loadBooleanState(key: string, seed: () => Record<string, boolean>) {
  const defaults = seed();
  const state = mergeKnown(readStored(key), defaults, isBoolean);
  return state ? { state, fromStorage: true } : { state: defaults, fromStorage: false };
}
