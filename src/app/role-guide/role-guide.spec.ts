import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { routes } from '../app.routes';
import { ROLES, RoleGuide } from './role-guide';

describe('RoleGuide', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RoleGuide],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  const render = async () => {
    const fixture = TestBed.createComponent(RoleGuide);
    fixture.detectChanges();
    await fixture.whenStable();
    return { fixture, el: fixture.nativeElement as HTMLElement };
  };

  it('only links to pages that exist', () => {
    const registered = new Set(routes.map((r) => `/${r.path}`));
    const missing = ROLES.flatMap((r) => r.tools).filter((t) => !registered.has(t.route));
    expect(missing).toEqual([]);
  });

  it('gives every role a unique id and at least one tool', () => {
    const ids = ROLES.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const role of ROLES) expect(role.tools.length).toBeGreaterThan(0);
  });

  it('has one h1 and one labelled section per role', async () => {
    const { el } = await render();
    expect(el.querySelectorAll('h1').length).toBe(1);
    expect(el.querySelector('h1')?.textContent).toContain('Find a tool by role');
    const sections = Array.from(el.querySelectorAll('section.rg-role'));
    expect(sections.length).toBe(ROLES.length);
    for (const s of sections) {
      const labelledBy = s.getAttribute('aria-labelledby');
      expect(labelledBy).toBeTruthy();
      expect(el.querySelector(`#${labelledBy}`)).toBeTruthy();
    }
  });

  it('renders every tool as a link', async () => {
    const { el } = await render();
    const total = ROLES.reduce((n, r) => n + r.tools.length, 0);
    expect(el.querySelectorAll('.rg-tool-link').length).toBe(total);
  });
});
