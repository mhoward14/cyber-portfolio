import { EngagementFinding } from '../engagement/engagement.model';
import { buildFinding } from '../vuln-priority/finding';
import { parseVector } from '../vuln-priority/cvss';
import { draftRisks, impactOf, likelihoodOf, nextRiskId } from './draft';

const finding = (over: Partial<Parameters<typeof buildFinding>[0]> = {}): EngagementFinding =>
  buildFinding({
    id: 'VULN-01', title: 'RCE in the VPN', asset: 'VPN gateway',
    metrics: parseVector('CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H')!,
    exploitation: 'active', exposure: 'internet', criticality: 'high', ...over,
  });

describe('draftRisks', () => {
  it('maps exploitation and exposure to likelihood', () => {
    expect(likelihoodOf({ exploitation: 'active', exposure: 'internet' })).toBe('very-high');
    expect(likelihoodOf({ exploitation: 'public', exposure: 'internal' })).toBe('moderate');
    expect(likelihoodOf({ exploitation: 'none', exposure: 'internal' })).toBe('low');
  });

  it('maps system importance and severity to impact', () => {
    expect(impactOf({ criticality: 'high', severity: 'critical' })).toBe('very-high');
    expect(impactOf({ criticality: 'high', severity: 'high' })).toBe('high');
    expect(impactOf({ criticality: 'low', severity: 'critical' })).toBe('low');
  });

  it('drafts risks only for P1 and P2 findings', () => {
    const urgent = finding();
    const minor = finding({ id: 'VULN-02', exploitation: 'none', exposure: 'internal', criticality: 'low' });
    expect(['P3', 'P4']).toContain(minor.priority);
    const drafted = draftRisks([urgent, minor], []);
    expect(drafted).toHaveLength(1);
    expect(drafted[0].likelihood).toBe('very-high');
    expect(drafted[0].controlId).toBe('SI-2');
  });

  it('does not draft the same risk twice and keeps ids unique', () => {
    const first = draftRisks([finding()], []);
    expect(draftRisks([finding()], first)).toEqual([]);
    const second = draftRisks([finding({ id: 'VULN-03', title: 'Another flaw' })], first);
    expect(second[0].id).toBe('RISK-02');
    expect(nextRiskId([...first, ...second])).toBe('RISK-03');
  });
});
