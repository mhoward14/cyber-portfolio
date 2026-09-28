import { isBoolean, loadBooleanState, mergeKnown, oneOf, pickKnown, readStored, shortText } from './stored-state';

function memoryStorage(entries: Record<string, string>): Storage {
  return { getItem: (k: string) => entries[k] ?? null } as Storage;
}

describe('stored state', () => {
  afterEach(() => localStorage.clear());

  it('reads JSON, and returns null for absent, malformed, or oversized entries', () => {
    const store = memoryStorage({ ok: '{"a":1}', bad: '{not json', huge: `"${'x'.repeat(1_000_001)}"` });
    expect(readStored('ok', store)).toEqual({ a: 1 });
    expect(readStored('missing', store)).toBeNull();
    expect(readStored('bad', store)).toBeNull();
    expect(readStored('huge', store)).toBeNull();
  });

  it('keeps only known keys with valid values, filling the rest from defaults', () => {
    const saved = JSON.parse('{"a": true, "b": "yes", "extra": true, "__proto__": {"polluted": true}}');
    const merged = mergeKnown(saved, { a: false, b: false, c: false }, isBoolean)!;
    expect(merged).toEqual({ a: true, b: false, c: false });
    expect(Object.keys(merged)).not.toContain('extra');
    expect(({} as Record<string, unknown>)['polluted']).toBeUndefined();
    expect(mergeKnown('nope', { a: false }, isBoolean)).toBeNull();
    expect(mergeKnown([true], { a: false }, isBoolean)).toBeNull();
  });

  it('picks allowed entries from open-ended records', () => {
    const keys = new Set(['AC-1', 'AC-2']);
    const status = oneOf(['implemented', 'partial'] as const);
    expect(pickKnown({ 'AC-1': 'implemented', 'AC-2': 'bogus', 'ZZ-9': 'partial' }, keys, status)).toEqual({ 'AC-1': 'implemented' });
    expect(pickKnown({ 'AC-1': 'x'.repeat(11), 'AC-2': 'fine' }, keys, shortText(10))).toEqual({ 'AC-2': 'fine' });
    expect(pickKnown(null, keys, status)).toEqual({});
  });

  it('loads boolean tool state over its seed', () => {
    const seed = () => ({ mfa: false, logging: false });
    expect(loadBooleanState('t', seed)).toEqual({ state: { mfa: false, logging: false }, fromStorage: false });
    localStorage.setItem('t', JSON.stringify({ mfa: true, logging: 'on', rogue: true }));
    expect(loadBooleanState('t', seed)).toEqual({ state: { mfa: true, logging: false }, fromStorage: true });
    localStorage.setItem('t', '"a string"');
    expect(loadBooleanState('t', seed).fromStorage).toBe(false);
  });
});
