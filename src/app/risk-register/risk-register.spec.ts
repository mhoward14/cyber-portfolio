import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ENGAGEMENT_STORAGE_KEY } from '../engagement/engagement.model';
import { EngagementService } from '../engagement/engagement.service';
import { buildFinding } from '../vuln-priority/finding';
import { parseVector } from '../vuln-priority/cvss';
import { RiskRegister, risksCsv } from './risk-register';

describe('RiskRegister', () => {
  beforeEach(async () => {
    localStorage.removeItem(ENGAGEMENT_STORAGE_KEY);
    await TestBed.configureTestingModule({
      imports: [RiskRegister],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  const make = async () => {
    const fixture = TestBed.createComponent(RiskRegister);
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

  it('previews the rating from likelihood and impact', async () => {
    const { c } = await make();
    c.likelihood.set('very-high');
    c.impact.set('very-low');
    expect(c.preview()).toBe('very-low');
    c.impact.set('very-high');
    expect(c.preview()).toBe('very-high');
  });

  it('adds a risk, defaulting the treatment result to unchanged', async () => {
    const { c } = await make();
    expect(c.canAdd()).toBe(false);
    c.title.set('  Backup tapes are lost in transit  ');
    c.likelihood.set('low');
    c.impact.set('high');
    c.addRisk();
    const r = c.risks()[0];
    expect(r.title).toBe('Backup tapes are lost in transit');
    expect(r.id).toBe('RISK-01');
    expect(r.residualLikelihood).toBe('low');
    expect(r.residualImpact).toBe('high');
    expect(r.controlId).toBeUndefined();
    expect(c.title()).toBe('');
  });

  it('keeps the control only when one is chosen', async () => {
    const { c } = await make();
    c.title.set('X');
    c.controlId.set('CP-9');
    c.addRisk();
    expect(c.risks()[0].controlId).toBe('CP-9');
  });

  it('counts risks on the heat map before and after treatment', async () => {
    const { c, fixture, el } = await make();
    c.loadExamples();
    fixture.detectChanges();
    const total = () => Array.from(el.querySelectorAll('.rr-count')).reduce((n, e) => n + Number(e.textContent || 0), 0);
    expect(total()).toBe(c.risks().length);
    c.view.set('residual');
    fixture.detectChanges();
    expect(total()).toBe(c.risks().length);
    expect(c.elevatedAfter()).toBeLessThan(c.elevated());
  });

  it('ranks the highest current rating first', async () => {
    const { c } = await make();
    c.loadExamples();
    const ranks = c.ranked().map((r) => c.level(r));
    expect(ranks[0]).toBe('very-high');
    expect(ranks.at(-1)).toBe('very-low');
  });

  it('drafts risks from urgent findings in the visitor\'s own engagement, once', async () => {
    const engagement = TestBed.inject(EngagementService);
    engagement.setFindings([
      buildFinding({
        id: 'VULN-01', title: 'RCE in the VPN', asset: 'VPN gateway', metrics: parseVector('CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H')!,
        exploitation: 'active', exposure: 'internet', criticality: 'high',
      }),
    ]);
    const { c } = await make();
    expect(c.drafts()).toHaveLength(1);
    c.draftFromFindings();
    expect(c.risks()).toHaveLength(1);
    expect(c.drafts()).toHaveLength(0);
  });

  it('sends the register to the engagement and recognizes it as saved', async () => {
    const { c, fixture, el } = await make();
    c.loadExamples();
    expect(c.inEngagement()).toBe(false);
    c.sendToEngagement();
    fixture.detectChanges();
    expect(TestBed.inject(EngagementService).state()!.risks).toHaveLength(c.risks().length);
    expect(c.inEngagement()).toBe(true);
    expect(el.querySelector('.rr-done')).toBeTruthy();
    c.remove('RISK-01');
    expect(c.inEngagement()).toBe(false);
  });

  it('starts from the risks already in the visitor\'s engagement', async () => {
    const first = await make();
    first.c.loadExamples();
    first.c.sendToEngagement();
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({ imports: [RiskRegister], providers: [provideRouter([])] }).compileComponents();
    const second = await make();
    expect(second.c.risks()).toHaveLength(first.c.risks().length);
  });

  it('writes a worksheet CSV that neutralizes spreadsheet formulas', async () => {
    const { c } = await make();
    c.title.set('=SUM(A1)');
    c.addRisk();
    const csv = risksCsv(c.risks());
    expect(csv).toContain(`"'=SUM(A1)"`);
    expect(csv).toContain('Risk owner');
  });
});
