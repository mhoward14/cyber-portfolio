/* ============================================================
   RACI.TS — WHO DOES WHAT TO KEEP A SYSTEM AUTHORIZED
   A responsibility matrix for the RMF activities, kept to roles and
   never names. Each activity is checked the way a reviewer would:
   exactly one role Accountable, and someone doing the work. The
   starting assignments are an example to edit, not an official table.
   ============================================================ */

import { reportCsv } from '../share/export-file';

export type RoleId = 'so' | 'isso' | 'issm' | 'sa' | 'sca' | 'ao';
export type ActivityId = 'categorize' | 'select' | 'implement' | 'ssp' | 'assess' | 'poam' | 'authorize' | 'monitor' | 'risk';

/** R does the work, A answers for it, AR is both, C is asked, I is told. Empty means not involved. */
export type RaciCode = '' | 'R' | 'A' | 'AR' | 'C' | 'I';

export interface RaciRole {
  id: RoleId;
  short: string;
  name: string;
}

export interface RaciActivity {
  id: ActivityId;
  label: string;
}

export const RACI_ROLES: RaciRole[] = [
  { id: 'so', short: 'SO', name: 'System owner' },
  { id: 'isso', short: 'ISSO', name: 'Information system security officer' },
  { id: 'issm', short: 'ISSM', name: 'Security manager (ISSM / CISO)' },
  { id: 'sa', short: 'SA', name: 'System administrator' },
  { id: 'sca', short: 'SCA', name: 'Security control assessor' },
  { id: 'ao', short: 'AO', name: 'Authorizing official' },
];

export const RACI_ACTIVITIES: RaciActivity[] = [
  { id: 'categorize', label: 'Categorize the system (FIPS 199)' },
  { id: 'select', label: 'Select and tailor controls' },
  { id: 'implement', label: 'Implement controls' },
  { id: 'ssp', label: 'Write and maintain the SSP' },
  { id: 'assess', label: 'Assess controls' },
  { id: 'poam', label: 'Track and close POA&M items' },
  { id: 'authorize', label: 'Authorize the system' },
  { id: 'monitor', label: 'Continuous monitoring' },
  { id: 'risk', label: 'Review and accept residual risk' },
];

/** The order a cell steps through each time it is pressed. */
export const RACI_CYCLE: RaciCode[] = ['', 'R', 'A', 'AR', 'C', 'I'];

export const CODE_LABEL: Record<RaciCode, string> = {
  '': 'Not involved',
  R: 'Responsible',
  A: 'Accountable',
  AR: 'A/R, Accountable and Responsible',
  C: 'Consulted',
  I: 'Informed',
};

/** What a cell shows. */
export const CODE_SHOWN: Record<RaciCode, string> = { '': '·', R: 'R', A: 'A', AR: 'A/R', C: 'C', I: 'I' };

/** Letters for exports, where an empty cell stays empty. */
const CODE_EXPORT: Record<RaciCode, string> = { '': '', R: 'R', A: 'A', AR: 'A/R', C: 'C', I: 'I' };

/** Cells keyed "activity|role"; a missing key means not involved. */
export type Raci = Record<string, RaciCode>;

export const EMPTY_RACI: Raci = {};

const key = (activity: ActivityId, role: RoleId) => `${activity}|${role}`;

export const codeOf = (raci: Raci, activity: ActivityId, role: RoleId): RaciCode => raci[key(activity, role)] ?? '';
export const isAccountable = (c: RaciCode) => c === 'A' || c === 'AR';
export const isResponsible = (c: RaciCode) => c === 'R' || c === 'AR';

export function nextCode(code: RaciCode): RaciCode {
  return RACI_CYCLE[(RACI_CYCLE.indexOf(code) + 1) % RACI_CYCLE.length];
}

/** A copy of the matrix with one cell stepped to its next value. */
export function cycleCell(raci: Raci, activity: ActivityId, role: RoleId): Raci {
  const next = nextCode(codeOf(raci, activity, role));
  const copy = { ...raci };
  if (next === '') delete copy[key(activity, role)];
  else copy[key(activity, role)] = next;
  return copy;
}

/** A clean starting point: every activity has one Accountable role and someone doing the work. */
export const EXAMPLE_RACI: Raci = {
  'categorize|so': 'A', 'categorize|isso': 'R', 'categorize|issm': 'C', 'categorize|ao': 'I',
  'select|so': 'A', 'select|isso': 'R', 'select|issm': 'C', 'select|sa': 'C', 'select|sca': 'I',
  'implement|so': 'A', 'implement|isso': 'C', 'implement|sa': 'R', 'implement|sca': 'I',
  'ssp|so': 'A', 'ssp|isso': 'R', 'ssp|issm': 'C', 'ssp|sa': 'C', 'ssp|ao': 'I',
  'assess|so': 'C', 'assess|isso': 'C', 'assess|issm': 'A', 'assess|sca': 'R', 'assess|ao': 'I',
  'poam|so': 'A', 'poam|isso': 'R', 'poam|issm': 'C', 'poam|sa': 'R', 'poam|ao': 'I',
  'authorize|so': 'C', 'authorize|isso': 'C', 'authorize|issm': 'C', 'authorize|sca': 'I', 'authorize|ao': 'AR',
  'monitor|so': 'C', 'monitor|isso': 'R', 'monitor|issm': 'A', 'monitor|sa': 'R', 'monitor|sca': 'C', 'monitor|ao': 'I',
  'risk|so': 'C', 'risk|isso': 'C', 'risk|issm': 'C', 'risk|ao': 'AR',
};

/** Anything stored is untrusted: keep only known activities, roles and codes. */
export function sanitizeRaci(value: unknown): Raci {
  const out: Raci = {};
  if (!value || typeof value !== 'object' || Array.isArray(value)) return out;
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    const [activity, role, extra] = k.split('|');
    if (extra !== undefined) continue;
    if (!RACI_ACTIVITIES.some((a) => a.id === activity) || !RACI_ROLES.some((r) => r.id === role)) continue;
    if (typeof v === 'string' && v !== '' && (RACI_CYCLE as string[]).includes(v)) out[k] = v as RaciCode;
  }
  return out;
}

export type ProblemKind = 'no-accountable' | 'many-accountable' | 'no-responsible';

export interface RaciProblem {
  activity: ActivityId;
  label: string;
  kind: ProblemKind;
  /** A phrase that completes "<activity> has …". */
  text: string;
}

/** What is wrong with one activity's row, if anything. */
export function checkActivity(raci: Raci, activity: ActivityId): RaciProblem[] {
  const label = RACI_ACTIVITIES.find((a) => a.id === activity)!.label;
  const codes = RACI_ROLES.map((r) => codeOf(raci, activity, r.id));
  const accountable = codes.filter(isAccountable).length;
  const problems: RaciProblem[] = [];
  if (accountable === 0) problems.push({ activity, label, kind: 'no-accountable', text: 'no one Accountable' });
  if (accountable > 1) problems.push({ activity, label, kind: 'many-accountable', text: `${accountable} roles Accountable` });
  if (!codes.some(isResponsible)) problems.push({ activity, label, kind: 'no-responsible', text: 'no one Responsible' });
  return problems;
}

export function checkRaci(raci: Raci): RaciProblem[] {
  return RACI_ACTIVITIES.flatMap((a) => checkActivity(raci, a.id));
}

/** True once any cell has been filled in. */
export const hasAssignments = (raci: Raci): boolean => Object.keys(raci).length > 0;

/** The matrix's problems in one sentence, or null when every row is sound. */
export function problemSummary(raci: Raci): string | null {
  const problems = checkRaci(raci);
  if (problems.length === 0) return null;
  const rows = new Map<string, string[]>();
  for (const p of problems) rows.set(p.label, [...(rows.get(p.label) ?? []), p.text]);
  const parts = [...rows].map(([label, texts]) => `“${label}” has ${texts.join(' and ')}`);
  return `${rows.size} ${rows.size === 1 ? 'activity needs' : 'activities need'} fixing: ${parts.join('; ')}.`;
}

/** How much each role carries, so one overloaded role stands out. */
export function loads(raci: Raci): Record<RoleId, { responsible: number; accountable: number }> {
  const out = {} as Record<RoleId, { responsible: number; accountable: number }>;
  for (const role of RACI_ROLES) {
    const codes = RACI_ACTIVITIES.map((a) => codeOf(raci, a.id, role.id));
    out[role.id] = { responsible: codes.filter(isResponsible).length, accountable: codes.filter(isAccountable).length };
  }
  return out;
}

/** The role's line in the SSP's identification table. */
export function roleSummary(raci: Raci, role: RoleId, placeholder: string): string {
  const info = RACI_ROLES.find((r) => r.id === role)!;
  const codes = RACI_ACTIVITIES.map((a) => codeOf(raci, a.id, role));
  if (codes.every((c) => c === '')) return placeholder;
  const { accountable, responsible } = loads(raci)[role];
  const parts: string[] = [];
  if (accountable) parts.push(`Accountable for ${accountable} of ${codes.length} activities`);
  if (responsible) parts.push(`Responsible for ${responsible} ${responsible === 1 ? 'activity' : 'activities'}`);
  if (!parts.length) parts.push('Consulted or informed only');
  return `${info.name}: ${parts.join('; ')}`;
}

/** The roles in a control row's "Responsible role" cell: who does it, who answers for it, who is asked. */
export function responsibleText(raci: Raci, activity: ActivityId, placeholder: string): string {
  const parts: string[] = [];
  for (const role of RACI_ROLES) {
    const code = codeOf(raci, activity, role.id);
    if (code === 'R' || code === 'A' || code === 'AR' || code === 'C') parts.push(`${role.short} (${CODE_EXPORT[code]})`);
  }
  const order = (s: string) => (/\((R|A\/R)\)/.test(s) ? 0 : /\(A\)/.test(s) ? 1 : 2);
  return parts.length ? parts.sort((a, b) => order(a) - order(b)).join('; ') : placeholder;
}

/** The roles that do an activity's work, for the POA&M owner column. */
export function ownerText(raci: Raci, activity: ActivityId, placeholder: string): string {
  const owners = RACI_ROLES.filter((r) => isResponsible(codeOf(raci, activity, r.id))).map((r) => r.short);
  return owners.length ? owners.join(', ') : placeholder;
}

/** The matrix as a worksheet. */
export function raciCsv(raci: Raci): string {
  const problems = checkRaci(raci);
  return reportCsv(
    'SSP Generator: RACI matrix (draft)',
    [
      ['Key', 'R = Responsible, A = Accountable, A/R = both, C = Consulted, I = Informed'],
      ['Checks', problems.length ? `${problems.length} to fix` : 'Every activity has one Accountable role and someone doing the work'],
    ],
    ['Activity', ...RACI_ROLES.map((r) => r.name), 'Check'],
    RACI_ACTIVITIES.map((a) => [
      a.label,
      ...RACI_ROLES.map((r) => CODE_EXPORT[codeOf(raci, a.id, r.id)]),
      checkActivity(raci, a.id).map((p) => p.text).join('; ') || 'OK',
    ]),
  );
}
