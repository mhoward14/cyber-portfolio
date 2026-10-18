import { RATINGS, isElevated, ratingRank, riskLevel } from './risk-matrix';

describe('riskLevel', () => {
  it('rates the corners of the matrix', () => {
    expect(riskLevel('very-high', 'very-high')).toBe('very-high');
    expect(riskLevel('very-low', 'very-low')).toBe('very-low');
    expect(riskLevel('very-high', 'very-low')).toBe('very-low');
    expect(riskLevel('very-low', 'very-high')).toBe('low');
  });

  it('rates a likely, serious event high and an unlikely, severe one moderate at most', () => {
    expect(riskLevel('high', 'high')).toBe('high');
    expect(riskLevel('low', 'very-high')).toBe('moderate');
  });

  it('never lowers the rating when likelihood or impact rises', () => {
    for (const l of RATINGS) {
      for (const i of RATINGS) {
        const here = ratingRank(riskLevel(l, i));
        const nextL = RATINGS[RATINGS.indexOf(l) + 1];
        const nextI = RATINGS[RATINGS.indexOf(i) + 1];
        if (nextL) expect(ratingRank(riskLevel(nextL, i))).toBeGreaterThanOrEqual(here);
        if (nextI) expect(ratingRank(riskLevel(l, nextI))).toBeGreaterThanOrEqual(here);
      }
    }
  });

  it('treats high and very high as elevated', () => {
    expect(RATINGS.filter(isElevated)).toEqual(['high', 'very-high']);
  });
});
