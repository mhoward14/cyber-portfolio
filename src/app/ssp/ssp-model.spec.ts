import { buildSsp, CONTOSO_INPUT, EMPTY_INPUT, implementationStatement, overallImpact } from './ssp-model';
import { sspMarkdown, cell } from './ssp-markdown';
import { buildSampleEngagement } from '../engagement/engagement-sample';
import { seedSampleState } from '../rmf-tracker/rmf-saved';
import { CONTROLS, TIER_ORDER } from '../rmf-tracker/rmf-data';
import { TrackerState } from '../rmf-tracker/rmf-saved';

const tracker = (over: Partial<TrackerState> = {}): TrackerState => ({ tier: 'moderate', statuses: {}, notes: {}, sample: false, ...over });
const NOW = new Date(2026, 9, 19);

describe('overallImpact', () => {
  it('takes the highest of the three objectives', () => {
    expect(overallImpact({ confidentiality: 'low', integrity: 'low', availability: 'low' })).toBe('low');
    expect(overallImpact({ confidentiality: 'low', integrity: 'high', availability: 'moderate' })).toBe('high');
    expect(overallImpact({ confidentiality: 'moderate', integrity: 'low', availability: 'moderate' })).toBe('moderate');
  });
});

describe('implementationStatement', () => {
  it('uses the visitor\'s note and flags a missing one', () => {
    expect(implementationStatement('implemented', 'Account Management', 'Accounts are reviewed quarterly.', [])).toBe(
      'Account Management is implemented. Accounts are reviewed quarterly.',
    );
    expect(implementationStatement('implemented', 'Account Management', '', [])).toContain('[Describe how');
  });

  it('points open controls at the plan of action and not-applicable ones at a justification', () => {
    expect(implementationStatement('partial', 'X', '', [])).toContain('plan of action');
    expect(implementationStatement('not-implemented', 'X', '', [])).toContain('plan of action');
    expect(implementationStatement('na', 'X', '', [])).toContain('justification is required');
  });
});

describe('buildSsp', () => {
  it('limits the control list to the tracker baseline and counts statuses', () => {
    const m = buildSsp(CONTOSO_INPUT, tracker({ tier: 'low', statuses: { 'AC-2': 'implemented', 'AC-3': 'na' } }), null, NOW);
    const ids = m.families.flatMap((f) => f.rows.map((r) => r.id));
    expect(ids.length).toBe(CONTROLS.filter((c) => TIER_ORDER[c.baseline] <= 0).length);
    expect(m.counts.total).toBe(ids.length);
    expect(m.counts.implemented).toBe(1);
    expect(m.counts.na).toBe(1);
    expect(m.counts.implemented + m.counts.partial + m.counts['not-implemented'] + m.counts.na).toBe(m.counts.total);
  });

  it('warns when the tracker baseline is below what the categorization requires', () => {
    const m = buildSsp(CONTOSO_INPUT, tracker({ tier: 'low' }), null, NOW);
    expect(m.categorization.overall).toBe('high');
    expect(m.baselineWarning).toContain('requires the High baseline');
    expect(buildSsp(CONTOSO_INPUT, tracker({ tier: 'high' }), null, NOW).baselineWarning).toBeNull();
  });

  it('falls back to the categorization baseline and says so when there is no tracker data', () => {
    const m = buildSsp(EMPTY_INPUT, null, null, NOW);
    expect(m.hasTracker).toBe(false);
    expect(m.baseline).toBe('moderate');
    expect(m.isSample).toBe(true);
    expect(m.counts['not-implemented']).toBe(m.counts.total);
  });

  it('leaves bracketed blanks instead of inventing text', () => {
    const m = buildSsp(EMPTY_INPUT, tracker(), null, NOW);
    expect(m.identification.name).toBe('[System name]');
    expect(m.identification.description).toContain('[Describe');
    expect(m.title).toContain('[System name]');
  });

  it('draws on the engagement and flags sample data', () => {
    const e = buildSampleEngagement(NOW);
    const m = buildSsp(CONTOSO_INPUT, seedSampleState(), e, NOW);
    expect(m.isSample).toBe(true);
    expect(m.sampleReasons).toHaveLength(2);
    expect(m.threats.length).toBe(e.techniques.length);
    expect(m.risks.length).toBe(e.risks!.length);
    expect(m.risks[0].level).toBe('Very high');
    expect(m.findings.length).toBe(e.findings!.length);
    const cm7 = m.families.flatMap((f) => f.rows).find((r) => r.id === 'CM-7');
    expect(cm7?.statement).toContain('Configuration evidence in the engagement');
  });

  it('lists engagement POA&M items first and adds tracker gaps without inventing dates', () => {
    const e = buildSampleEngagement(NOW);
    const m = buildSsp(CONTOSO_INPUT, tracker({ statuses: { 'AC-2': 'not-implemented', 'AC-3': 'partial' } }), e, NOW);
    expect(m.openItems.slice(0, e.poams.length).every((o) => o.source === 'engagement')).toBe(true);
    const fromTracker = m.openItems.filter((o) => o.source === 'tracker');
    expect(fromTracker.length).toBeGreaterThan(0);
    expect(fromTracker.every((o) => o.targetDays === null)).toBe(true);
    const ids = m.openItems.map((o) => o.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('reports no open items when every control is implemented or not applicable', () => {
    const all: Record<string, 'implemented'> = {};
    for (const c of CONTROLS) all[c.id] = 'implemented';
    expect(buildSsp(CONTOSO_INPUT, tracker({ statuses: all }), null, NOW).openItems).toEqual([]);
  });
});

describe('sspMarkdown', () => {
  it('has the numbered sections, the draft banner and a table row per control', () => {
    const m = buildSsp(CONTOSO_INPUT, seedSampleState(), buildSampleEngagement(NOW), NOW);
    const md = sspMarkdown(m);
    for (const h of ['## 1. System identification', '## 2. Security categorization (FIPS 199)', '## 3. System environment and boundary', '## 4. Risk assessment summary', '## 5. Security control implementation', '## 6. Plan of action and milestones', '## 7. Document control']) {
      expect(md).toContain(h);
    }
    expect(md).toContain('**DRAFT.** Generated 2026-10-19');
    for (const row of m.families.flatMap((f) => f.rows)) expect(md).toContain(`| ${row.id} ${row.title} |`);
  });

  it('keeps pipes and line breaks in user text from breaking tables', () => {
    expect(cell('a | b\nc')).toBe('a \\| b c');
    const m = buildSsp(CONTOSO_INPUT, tracker({ statuses: { 'AC-2': 'implemented' }, notes: { 'AC-2': 'one | two\nthree' } }), null, NOW);
    const md = sspMarkdown(m);
    const line = md.split('\n').find((l) => l.startsWith('| AC-2 '))!;
    expect(line).toContain('one \\| two three');
    expect(line.split(/(?<!\\)\|/).length).toBe(6);
  });

  it('keeps the risk section and says when there is no risk data', () => {
    const md = sspMarkdown(buildSsp(CONTOSO_INPUT, tracker(), null, NOW));
    expect(md).toContain('## 4. Risk assessment summary');
    expect(md).toContain('No risk assessment data was available');
  });
});
