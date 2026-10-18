import { DEFAULT_METRICS, baseScore, parseVector, roundUp, severityOf, toVector } from './cvss';

const score = (v: string) => baseScore(parseVector(v)!);

describe('CVSS v3.1 base score', () => {
  // Reference scores published by FIRST / NVD for well-known vectors.
  it.each([
    ['CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H', 9.8],
    ['CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:C/C:H/I:H/A:H', 10.0],
    ['CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N', 7.5],
    ['CVSS:3.1/AV:L/AC:L/PR:L/UI:N/S:U/C:H/I:H/A:H', 7.8],
    ['CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:C/C:L/I:L/A:N', 6.1],
    ['CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:N/A:N', 6.5],
    ['CVSS:3.1/AV:P/AC:H/PR:H/UI:R/S:U/C:L/I:N/A:N', 1.6],
    ['CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:N', 0],
  ])('scores %s as %s', (vector, expected) => {
    expect(score(vector)).toBe(expected);
  });

  it('rounds up to one decimal as the specification defines', () => {
    expect(roundUp(4.02)).toBe(4.1);
    expect(roundUp(4.0)).toBe(4.0);
    expect(roundUp(0.1 + 0.2)).toBe(0.3);
  });

  it('rates scores on the qualitative scale', () => {
    expect([0, 0.1, 3.9, 4, 6.9, 7, 8.9, 9, 10].map(severityOf)).toEqual([
      'none', 'low', 'low', 'medium', 'medium', 'high', 'high', 'critical', 'critical',
    ]);
  });

  it('round-trips a vector', () => {
    const v = 'CVSS:3.1/AV:A/AC:H/PR:L/UI:R/S:C/C:L/I:H/A:N';
    expect(toVector(parseVector(v)!)).toBe(v);
    expect(toVector(DEFAULT_METRICS)).toBe('CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H');
  });

  it.each([
    '',
    'AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H',
    'CVSS:3.0/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H',
    'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H',
    'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H/A:H',
    'CVSS:3.1/AV:X/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H',
    'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/E:H',
    'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H:H',
  ])('rejects the malformed vector %j', (v) => {
    expect(parseVector(v)).toBeNull();
  });
});
