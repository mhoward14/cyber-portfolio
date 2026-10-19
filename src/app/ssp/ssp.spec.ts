import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ENGAGEMENT_STORAGE_KEY } from '../engagement/engagement.model';
import { EngagementService } from '../engagement/engagement.service';
import { RMF_STORAGE_KEY } from '../rmf-tracker/rmf-saved';
import { Ssp, loadInput } from './ssp';
import { CONTOSO_INPUT, EMPTY_INPUT } from './ssp-model';

describe('Ssp', () => {
  beforeEach(async () => {
    localStorage.clear();
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({ imports: [Ssp], providers: [provideRouter([])] }).compileComponents();
  });

  const make = async () => {
    const fixture = TestBed.createComponent(Ssp);
    fixture.detectChanges();
    await fixture.whenStable();
    return { fixture, c: fixture.componentInstance, el: fixture.nativeElement as HTMLElement };
  };

  it('has one h1 and labels every form control', async () => {
    const { el } = await make();
    expect(el.querySelectorAll('h1').length).toBe(1);
    for (const control of Array.from(el.querySelectorAll('input, select, textarea'))) {
      expect(el.querySelector(`label[for="${control.id}"]`)).toBeTruthy();
    }
  });

  it('shows a draft with bracketed blanks before anything is entered', async () => {
    const { el } = await make();
    expect(el.querySelector('.ssp-doc-title')?.textContent).toContain('[System name]');
    expect(el.querySelector('.ssp-banner')?.textContent).toContain('Draft.');
  });

  it('loads the Contoso example and puts it in the draft', async () => {
    const { c, fixture, el } = await make();
    c.loadExample();
    fixture.detectChanges();
    expect(el.querySelector('.ssp-doc-title')?.textContent).toContain('Contoso Payments Portal');
    expect(c.overall()).toBe('high');
  });

  it('raises the overall impact to the highest objective', async () => {
    const { c } = await make();
    c.update('confidentiality', 'low');
    c.update('integrity', 'low');
    c.update('availability', 'low');
    expect(c.overall()).toBe('low');
    c.update('integrity', 'high');
    expect(c.overall()).toBe('high');
  });

  it('keeps the description in the browser and restores it', async () => {
    const first = await make();
    first.c.update('name', 'Saved system');
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({ imports: [Ssp], providers: [provideRouter([])] }).compileComponents();
    const second = await make();
    expect(second.c.input().name).toBe('Saved system');
  });

  it('clears the description', async () => {
    const { c } = await make();
    c.loadExample();
    c.clear();
    expect(c.input()).toEqual(EMPTY_INPUT);
    expect(c.hasInput()).toBe(false);
  });

  it('adds the threat, risk and POA&M sections when the engagement has them', async () => {
    TestBed.inject(EngagementService).loadSample();
    const { el, c } = await make();
    expect(c.model().risks.length).toBeGreaterThan(0);
    const tables = Array.from(el.querySelectorAll('.ssp-table-wrap')).map((e) => e.getAttribute('aria-label'));
    expect(tables).toContain('Attack chain table');
    expect(tables).toContain('Risk register table');
    expect(tables).toContain('Vulnerabilities table');
  });

  it('gives every scroll region its own name', async () => {
    TestBed.inject(EngagementService).loadSample();
    const { el } = await make();
    const names = Array.from(el.querySelectorAll('.ssp-table-wrap')).map((e) => e.getAttribute('aria-label'));
    expect(new Set(names).size).toBe(names.length);
  });

  it('uses the tracker\'s saved baseline and notes', async () => {
    localStorage.setItem(RMF_STORAGE_KEY, JSON.stringify({ tier: 'low', statuses: { 'AC-2': 'implemented' }, notes: { 'AC-2': 'Accounts reviewed quarterly.' }, sample: false }));
    const { c } = await make();
    expect(c.model().baseline).toBe('low');
    const ac2 = c.model().families.flatMap((f) => f.rows).find((r) => r.id === 'AC-2');
    expect(ac2?.statement).toContain('Accounts reviewed quarterly.');
  });

  it('downloads without error and names the file after the system', async () => {
    const { c } = await make();
    c.update('name', 'My System');
    const clicks: string[] = [];
    const orig = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = function (this: HTMLAnchorElement) { clicks.push(this.download); };
    URL.createObjectURL = () => 'blob:test';
    URL.revokeObjectURL = () => undefined;
    try {
      c.download();
    } finally {
      HTMLAnchorElement.prototype.click = orig;
    }
    expect(clicks[0]).toMatch(/^ssp-draft-my-system-\d{4}-\d{2}-\d{2}\.md$/);
  });
});

describe('loadInput', () => {
  beforeEach(() => localStorage.clear());

  it('falls back to defaults for anything malformed', () => {
    localStorage.setItem('ssp-input-v1', JSON.stringify({ name: 42, confidentiality: 'extreme', hosting: 'moon', description: { x: 1 } }));
    expect(loadInput()).toEqual(EMPTY_INPUT);
  });

  it('caps stored text and keeps valid fields', () => {
    localStorage.setItem('ssp-input-v1', JSON.stringify({ ...CONTOSO_INPUT, name: 'x'.repeat(500) }));
    const loaded = loadInput();
    expect(loaded.name.length).toBe(80);
    expect(loaded.integrity).toBe('high');
    expect(loaded.hosting).toBe('cloud');
  });

  it('ignores a record that is not an object', () => {
    localStorage.setItem('ssp-input-v1', '"nope"');
    expect(loadInput()).toEqual(EMPTY_INPUT);
    localStorage.setItem(ENGAGEMENT_STORAGE_KEY, 'not json');
    expect(loadInput()).toEqual(EMPTY_INPUT);
  });
});
