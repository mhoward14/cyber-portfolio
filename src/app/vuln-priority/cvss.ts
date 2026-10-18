/* ============================================================
   CVSS.TS — CVSS v3.1 BASE SCORE
   The base-score equations from the FIRST CVSS v3.1 specification
   (section 7.1), including its Roundup function. A vector string is
   parsed strictly: every base metric exactly once, known values only.
   ============================================================ */

export type MetricKey = 'AV' | 'AC' | 'PR' | 'UI' | 'S' | 'C' | 'I' | 'A';

export interface MetricOption {
  value: string;
  label: string;
}

export interface MetricDef {
  key: MetricKey;
  name: string;
  options: MetricOption[];
}

/** The eight base metrics, in vector-string order. */
export const METRICS: MetricDef[] = [
  { key: 'AV', name: 'Attack vector', options: [
    { value: 'N', label: 'Network' }, { value: 'A', label: 'Adjacent' }, { value: 'L', label: 'Local' }, { value: 'P', label: 'Physical' } ] },
  { key: 'AC', name: 'Attack complexity', options: [
    { value: 'L', label: 'Low' }, { value: 'H', label: 'High' } ] },
  { key: 'PR', name: 'Privileges required', options: [
    { value: 'N', label: 'None' }, { value: 'L', label: 'Low' }, { value: 'H', label: 'High' } ] },
  { key: 'UI', name: 'User interaction', options: [
    { value: 'N', label: 'None' }, { value: 'R', label: 'Required' } ] },
  { key: 'S', name: 'Scope', options: [
    { value: 'U', label: 'Unchanged' }, { value: 'C', label: 'Changed' } ] },
  { key: 'C', name: 'Confidentiality impact', options: [
    { value: 'N', label: 'None' }, { value: 'L', label: 'Low' }, { value: 'H', label: 'High' } ] },
  { key: 'I', name: 'Integrity impact', options: [
    { value: 'N', label: 'None' }, { value: 'L', label: 'Low' }, { value: 'H', label: 'High' } ] },
  { key: 'A', name: 'Availability impact', options: [
    { value: 'N', label: 'None' }, { value: 'L', label: 'Low' }, { value: 'H', label: 'High' } ] },
];

export type CvssMetrics = Record<MetricKey, string>;

const AV: Record<string, number> = { N: 0.85, A: 0.62, L: 0.55, P: 0.2 };
const AC: Record<string, number> = { L: 0.77, H: 0.44 };
const UI: Record<string, number> = { N: 0.85, R: 0.62 };
const CIA: Record<string, number> = { H: 0.56, L: 0.22, N: 0 };
const PR_UNCHANGED: Record<string, number> = { N: 0.85, L: 0.62, H: 0.27 };
const PR_CHANGED: Record<string, number> = { N: 0.85, L: 0.68, H: 0.5 };

export const DEFAULT_METRICS: CvssMetrics = { AV: 'N', AC: 'L', PR: 'N', UI: 'N', S: 'U', C: 'H', I: 'H', A: 'H' };

/** Smallest number, to one decimal place, that is equal to or higher than the input
 *  (spec Appendix A). Integer math avoids floating-point error. */
export function roundUp(input: number): number {
  const int = Math.round(input * 100000);
  return int % 10000 === 0 ? int / 100000 : (Math.floor(int / 10000) + 1) / 10;
}

export function baseScore(m: CvssMetrics): number {
  const changed = m.S === 'C';
  const iss = 1 - (1 - CIA[m.C]) * (1 - CIA[m.I]) * (1 - CIA[m.A]);
  const impact = changed ? 7.52 * (iss - 0.029) - 3.25 * Math.pow(iss - 0.02, 15) : 6.42 * iss;
  const exploitability = 8.22 * AV[m.AV] * AC[m.AC] * (changed ? PR_CHANGED : PR_UNCHANGED)[m.PR] * UI[m.UI];
  if (impact <= 0) return 0;
  return changed ? roundUp(Math.min(1.08 * (impact + exploitability), 10)) : roundUp(Math.min(impact + exploitability, 10));
}

export type Severity = 'none' | 'low' | 'medium' | 'high' | 'critical';

/** Qualitative rating scale (spec section 5). */
export function severityOf(score: number): Severity {
  if (score === 0) return 'none';
  if (score < 4) return 'low';
  if (score < 7) return 'medium';
  if (score < 9) return 'high';
  return 'critical';
}

export function toVector(m: CvssMetrics): string {
  return `CVSS:3.1/${METRICS.map((d) => `${d.key}:${m[d.key]}`).join('/')}`;
}

/** Parse a CVSS:3.1 base vector. Returns null for anything malformed:
 *  wrong prefix, missing, repeated or unknown metrics, unknown values. */
export function parseVector(text: string): CvssMetrics | null {
  const parts = text.trim().split('/');
  if (parts.length !== METRICS.length + 1 || parts[0] !== 'CVSS:3.1') return null;
  const seen = new Map<string, string>();
  for (const part of parts.slice(1)) {
    const [key, value, ...rest] = part.split(':');
    if (rest.length || !key || !value || seen.has(key)) return null;
    seen.set(key, value);
  }
  const out = {} as CvssMetrics;
  for (const d of METRICS) {
    const v = seen.get(d.key);
    if (!v || !d.options.some((o) => o.value === v)) return null;
    out[d.key] = v;
  }
  return out;
}
