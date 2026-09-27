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

  it('should render a card for each of the eight tools', async () => {
    const fixture = TestBed.createComponent(Home);
    fixture.detectChanges();
    await fixture.whenStable();
    const cards = (fixture.nativeElement as HTMLElement).querySelectorAll('.tool-card');
    expect(cards.length).toBe(8);
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
    expect(new Set(hrefs).size).toBe(8);
  });
});
