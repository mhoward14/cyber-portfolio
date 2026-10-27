import {
  EXAMPLE_RACI, RACI_ACTIVITIES, RACI_CYCLE, RACI_ROLES, Raci, checkActivity, checkRaci, codeOf, cycleCell, hasAssignments,
  loads, nextCode, ownerText, problemSummary, raciCsv, responsibleText, roleSummary, sanitizeRaci,
} from './raci';

describe('RACI cells', () => {
  it('steps through the codes in order and wraps back to empty', () => {
    expect(RACI_CYCLE).toEqual(['', 'R', 'A', 'AR', 'C', 'I']);
    let code = nextCode('');
    const seen = [code];
    while (code !== '') {
      code = nextCode(code);
      seen.push(code);
    }
    expect(seen).toEqual(['R', 'A', 'AR', 'C', 'I', '']);
  });

  it('changes only the cell pressed, and removes a cell that returns to empty', () => {
    const first = cycleCell({}, 'categorize', 'so');
    expect(first).toEqual({ 'categorize|so': 'R' });
    expect(codeOf(first, 'categorize', 'isso')).toBe('');
    let raci: Raci = first;
    for (let i = 0; i < 5; i++) raci = cycleCell(raci, 'categorize', 'so');
    expect(raci).toEqual({});
    expect(first).toEqual({ 'categorize|so': 'R' }); // the original is untouched
  });
});

describe('checking a matrix', () => {
  it('passes the example: one Accountable and someone doing the work on every row', () => {
    expect(checkRaci(EXAMPLE_RACI)).toEqual([]);
    expect(problemSummary(EXAMPLE_RACI)).toBeNull();
  });

  it('flags a row with no one Accountable and no one Responsible', () => {
    const problems = checkActivity({ 'assess|so': 'C' }, 'assess').map((p) => p.kind);
    expect(problems).toEqual(['no-accountable', 'no-responsible']);
  });

  it('flags two Accountable roles, counting A/R as Accountable', () => {
    const raci: Raci = { 'assess|issm': 'A', 'assess|ao': 'AR', 'assess|sca': 'R' };
    const problems = checkActivity(raci, 'assess');
    expect(problems.map((p) => p.kind)).toEqual(['many-accountable']);
    expect(problems[0].text).toBe('2 roles Accountable');
  });

  it('accepts A/R as both Accountable and Responsible', () => {
    expect(checkActivity({ 'authorize|ao': 'AR' }, 'authorize')).toEqual([]);
  });

  it('wants an Accountable role to be backed by someone Responsible when it is only A', () => {
    expect(checkActivity({ 'authorize|ao': 'A' }, 'authorize').map((p) => p.kind)).toEqual(['no-responsible']);
  });

  it('summarizes the problems in one sentence naming each activity', () => {
    const text = problemSummary({ 'monitor|issm': 'A', 'monitor|so': 'A', 'monitor|sa': 'R' })!;
    expect(text).toContain('“Continuous monitoring” has 2 roles Accountable');
    expect(text).toContain('activities need fixing');
  });
});

describe('what the matrix feeds into the plan', () => {
  it('counts what each role carries', () => {
    const l = loads(EXAMPLE_RACI);
    expect(l.so.accountable).toBe(5);
    expect(l.ao).toEqual({ responsible: 2, accountable: 2 });
    expect(l.sca.responsible).toBe(1);
  });

  it('describes a role for the identification table, or leaves the placeholder', () => {
    expect(roleSummary(EXAMPLE_RACI, 'so', '[x]')).toBe('System owner: Accountable for 5 of 9 activities');
    expect(roleSummary(EXAMPLE_RACI, 'ao', '[x]')).toBe('Authorizing official: Accountable for 2 of 9 activities; Responsible for 2 activities');
    expect(roleSummary({}, 'so', '[x]')).toBe('[x]');
    expect(roleSummary({ 'categorize|ao': 'I' }, 'ao', '[x]')).toBe('Authorizing official: Consulted or informed only');
  });

  it('lists who is Responsible, Accountable and Consulted for an activity, doers first', () => {
    expect(responsibleText(EXAMPLE_RACI, 'implement', '[x]')).toBe('SA (R); SO (A); ISSO (C)');
    expect(responsibleText({}, 'implement', '[x]')).toBe('[x]');
  });

  it('names the roles that do the work as POA&M owners', () => {
    expect(ownerText(EXAMPLE_RACI, 'poam', '[y]')).toBe('ISSO, SA');
    expect(ownerText({ 'poam|so': 'A' }, 'poam', '[y]')).toBe('[y]');
  });
});

describe('stored matrices', () => {
  it('keeps valid cells and drops everything else', () => {
    const clean = sanitizeRaci({
      'categorize|so': 'A',
      'categorize|nobody': 'R',
      'unknown|so': 'R',
      'select|isso': 'Z',
      'select|sa': '',
      'implement|sa': 7,
      'a|b|c': 'R',
    });
    expect(clean).toEqual({ 'categorize|so': 'A' });
  });

  it('ignores a value that is not an object', () => {
    expect(sanitizeRaci(null)).toEqual({});
    expect(sanitizeRaci('R')).toEqual({});
    expect(sanitizeRaci([['categorize|so', 'A']])).toEqual({});
  });

  it('knows when anything has been assigned', () => {
    expect(hasAssignments({})).toBe(false);
    expect(hasAssignments({ 'categorize|so': 'A' })).toBe(true);
  });
});

describe('the example and its export', () => {
  it('covers every activity and uses only known roles', () => {
    for (const activity of RACI_ACTIVITIES) {
      expect(RACI_ROLES.some((r) => codeOf(EXAMPLE_RACI, activity.id, r.id) !== ''), activity.id).toBe(true);
    }
    expect(sanitizeRaci(EXAMPLE_RACI)).toEqual(EXAMPLE_RACI);
  });

  it('writes one row per activity with its check', () => {
    const csv = raciCsv({ 'monitor|issm': 'A', 'monitor|so': 'A', 'monitor|sa': 'R' });
    const lines = csv.split('\r\n');
    expect(lines.some((l) => l.includes('"Continuous monitoring"') && l.includes('2 roles Accountable'))).toBe(true);
    expect(lines.filter((l) => RACI_ACTIVITIES.some((a) => l.startsWith(`"${a.label}"`))).length).toBe(RACI_ACTIVITIES.length);
    expect(raciCsv(EXAMPLE_RACI)).toContain('Every activity has one Accountable role');
  });
});
