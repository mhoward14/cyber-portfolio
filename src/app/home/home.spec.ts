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

  it('should render a card for each of the nine tools', async () => {
    const fixture = TestBed.createComponent(Home);
    fixture.detectChanges();
    await fixture.whenStable();
    const cards = (fixture.nativeElement as HTMLElement).querySelectorAll('.tool-card');
    expect(cards.length).toBe(9);
  });

  it('should lead with the three "Start here" tools in review order', async () => {
    const fixture = TestBed.createComponent(Home);
    fixture.detectChanges();
    await fixture.whenStable();
    const cards = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('.tool-card'));
    const hrefs = cards.slice(0, 3).map((c) => c.getAttribute('href'));
    expect(hrefs).toEqual(['/attack-path', '/cloud-security', '/incident-response']);
    expect(cards.filter((c) => c.querySelector('.tool-start')).length).toBe(3);
  });

  it('should link every tool card to a distinct route', async () => {
    const fixture = TestBed.createComponent(Home);
    fixture.detectChanges();
    await fixture.whenStable();
    const hrefs = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('.tool-card')).map((c) =>
      c.getAttribute('href'),
    );
    expect(new Set(hrefs).size).toBe(9);
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
