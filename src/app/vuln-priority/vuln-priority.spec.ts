import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ENGAGEMENT_STORAGE_KEY } from '../engagement/engagement.model';
import { EngagementService } from '../engagement/engagement.service';
import { EXAMPLE_FINDINGS, VulnPriority, findingsCsv } from './vuln-priority';

describe('VulnPriority', () => {
  beforeEach(async () => {
    localStorage.removeItem(ENGAGEMENT_STORAGE_KEY);
    await TestBed.configureTestingModule({
      imports: [VulnPriority],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  const make = async () => {
    const fixture = TestBed.createComponent(VulnPriority);
    fixture.detectChanges();
    await fixture.whenStable();
    return { fixture, c: fixture.componentInstance, el: fixture.nativeElement as HTMLElement };
  };

  it('has one h1 and labels every form control', async () => {
    const { el } = await make();
    expect(el.querySelectorAll('h1').length).toBe(1);
    for (const control of Array.from(el.querySelectorAll('input, select'))) {
      expect(el.querySelector(`label[for="${control.id}"]`)).toBeTruthy();
    }
  });

  it('shows the score for the chosen metrics', async () => {
    const { c, fixture, el } = await make();
    expect(c.score()).toBe(9.8);
    c.setMetric('S', 'C');
    fixture.detectChanges();
    expect(el.querySelector('.vp-score-value')?.textContent).toBe('10.0');
  });

  it('accepts a pasted vector and rejects a malformed one', async () => {
    const { c } = await make();
    c.applyVector('CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:C/C:L/I:L/A:N');
    expect(c.score()).toBe(6.1);
    expect(c.vectorError()).toBe('');
    c.applyVector('CVSS:3.1/AV:N');
    expect(c.vectorError()).not.toBe('');
    expect(c.score()).toBe(6.1);
  });

  it('adds a finding, trims it and clears the form', async () => {
    const { c } = await make();
    expect(c.canAdd()).toBe(false);
    c.title.set('  Open SMB share  ');
    c.addFinding();
    expect(c.findings()).toHaveLength(1);
    expect(c.findings()[0].title).toBe('Open SMB share');
    expect(c.findings()[0].asset).toBe('Unspecified');
    expect(c.findings()[0].id).toBe('VULN-01');
    expect(c.title()).toBe('');
  });

  it('ranks by context, not just by CVSS score', async () => {
    const { c } = await make();
    c.loadExamples();
    const ranked = c.ranked();
    expect(ranked).toHaveLength(EXAMPLE_FINDINGS.length);
    expect(ranked[0].priority).toBe('P1');
    const order = ranked.map((f) => f.priority);
    expect(order).toEqual([...order].sort());
    // Context beats raw score: a 7.5 internet-facing leak on a critical system
    // outranks a 7.8 internal escalation on a critical system with no exploit.
    const api = ranked.find((f) => f.asset === 'Customer API')!;
    const quiet = { ...ranked.find((f) => f.asset === 'FS-02')!, exploitation: 'none' as const };
    expect(api.score).toBeLessThan(quiet.score);
  });

  it('numbers new findings after the highest existing id', async () => {
    const { c } = await make();
    c.loadExamples();
    c.remove('VULN-02');
    c.title.set('New');
    c.addFinding();
    expect(c.findings().at(-1)?.id).toBe('VULN-06');
  });

  it('sends the ranked list to the engagement and recognizes it as saved', async () => {
    const { c, fixture, el } = await make();
    c.loadExamples();
    expect(c.inEngagement()).toBe(false);
    c.sendToEngagement();
    fixture.detectChanges();
    const saved = TestBed.inject(EngagementService).state()!;
    expect(saved.findings).toHaveLength(EXAMPLE_FINDINGS.length);
    expect(c.inEngagement()).toBe(true);
    expect(el.querySelector('.vp-done')).toBeTruthy();
    c.remove('VULN-01');
    expect(c.inEngagement()).toBe(false);
  });

  it('writes a worksheet CSV that neutralizes spreadsheet formulas', async () => {
    const { c } = await make();
    c.title.set('=HYPERLINK("http://example.com")');
    c.addFinding();
    const csv = findingsCsv(c.findings());
    expect(csv).toContain(`"'=HYPERLINK(""http://example.com"")"`);
    expect(csv).toContain('RA-5; SI-2');
  });
});
