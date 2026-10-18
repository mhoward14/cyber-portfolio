import { PriorityInput, prioritize } from './priority';

const base: PriorityInput = { severity: 'high', exploitation: 'none', exposure: 'internal', criticality: 'moderate' };

describe('prioritize', () => {
  it('puts an exploited, internet-facing, critical-severity flaw on a critical system first', () => {
    expect(prioritize({ severity: 'critical', exploitation: 'active', exposure: 'internet', criticality: 'high' }).priority).toBe('P1');
  });

  it('lets context raise a medium-severity flaw above a high-severity one', () => {
    const exploited = prioritize({ ...base, severity: 'medium', exploitation: 'active', exposure: 'internet' });
    const quiet = prioritize({ ...base, severity: 'high' });
    expect(exploited.points).toBeGreaterThan(quiet.points);
    expect(exploited.priority).toBe('P2');
    expect(quiet.priority).toBe('P3');
  });

  it('lowers a flaw on a low-importance system', () => {
    expect(prioritize({ ...base, criticality: 'low' }).points).toBe(prioritize(base).points - 1);
  });

  it('never makes a no-impact finding urgent', () => {
    expect(prioritize({ severity: 'none', exploitation: 'active', exposure: 'internet', criticality: 'high' }).priority).toBe('P4');
  });

  it('lists a reason for each factor that changed the result', () => {
    const r = prioritize({ severity: 'high', exploitation: 'public', exposure: 'internet', criticality: 'high' });
    expect(r.reasons).toHaveLength(4);
    expect(prioritize(base).reasons).toHaveLength(1);
  });
});
