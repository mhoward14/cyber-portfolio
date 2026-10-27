import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Home } from './home';

describe('Home', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Home],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('shows the three quick-start tools in review order, and points to the Security Tools page', async () => {
    const fixture = TestBed.createComponent(Home);
    fixture.detectChanges();
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    const chips = Array.from(el.querySelectorAll('.tools-band-chip')).map((c) => c.getAttribute('href'));
    expect(chips).toEqual(['/attack-path', '/cloud-security', '/incident-response']);
    expect(el.querySelector('.tools-band-cta')?.getAttribute('href')).toBe('/security-tools');
    // The tools themselves live on their own page; the home page is the academic portfolio.
    expect(el.querySelectorAll('.tool-card').length).toBe(0);
    expect(el.querySelector('video')).toBeNull();
  });

  it('puts the projects before the tools band', async () => {
    const fixture = TestBed.createComponent(Home);
    fixture.detectChanges();
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    const grid = el.querySelector('.project-grid')!;
    const band = el.querySelector('.tools-band')!;
    expect(grid.compareDocumentPosition(band) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('should map every case study to at least one existing tool', () => {
    const home = TestBed.createComponent(Home).componentInstance;
    for (const project of home.projects()) {
      const related = home.relatedTools(project.title);
      expect(related.length, project.title).toBeGreaterThan(0);
    }
  });

  it('should show related-tool links when a case study is expanded', async () => {
    const fixture = TestBed.createComponent(Home);
    fixture.detectChanges();
    fixture.componentInstance.toggleProject('Penetration Testing');
    fixture.detectChanges();
    await fixture.whenStable();
    const links = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('.project-tile.is-expanded .related-tool'),
    ).map((a) => a.getAttribute('href'));
    expect(links).toEqual(['/attack-path', '/packet-lab']);
  });
});

describe('Home case-study metrics', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [Home], providers: [provideRouter([])] }).compileComponents();
  });

  it('should keep each tile short and at most three per case study', () => {
    const home = TestBed.createComponent(Home).componentInstance;
    for (const project of home.projects()) {
      expect(project.metrics.length, project.title).toBeLessThanOrEqual(3);
      for (const m of project.metrics) {
        expect(m.value.length, `${project.title}: ${m.value}`).toBeLessThanOrEqual(6);
        expect(m.label.trim().length, project.title).toBeGreaterThan(0);
      }
    }
  });

  it('should render metric tiles on collapsed case-study tiles', async () => {
    const fixture = TestBed.createComponent(Home);
    fixture.detectChanges();
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    const withMetrics = fixture.componentInstance.projects().filter((p) => p.metrics.length).length;
    expect(el.querySelectorAll('.project-summary .metric-row').length).toBe(withMetrics);
    expect(el.querySelector('.metric-value')!.textContent!.trim()).toBe('500');
  });
});
