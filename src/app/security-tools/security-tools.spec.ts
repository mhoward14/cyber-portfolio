import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { routes } from '../app.routes';
import { START_HERE, TOOLS, TOOL_GROUPS, toolsInGroup } from '../tools-data';
import { SecurityTools } from './security-tools';

describe('tools data', () => {
  it('gives every tool a unique route that exists in the app', () => {
    const registered = new Set(routes.map((r) => `/${r.path}`));
    const missing = TOOLS.filter((t) => !registered.has(t.route)).map((t) => t.route);
    expect(missing).toEqual([]);
    expect(new Set(TOOLS.map((t) => t.route)).size).toBe(TOOLS.length);
  });

  it('puts every tool in exactly one group', () => {
    const listed = TOOL_GROUPS.flatMap((g) => g.routes);
    expect(new Set(listed).size).toBe(listed.length);
    expect([...listed].sort()).toEqual(TOOLS.map((t) => t.route).sort());
    for (const group of TOOL_GROUPS) {
      for (const tool of toolsInGroup(group)) expect(tool.group, tool.name).toBe(group.id);
    }
  });

  it('has three quick-start tools, numbered one to three', () => {
    expect(START_HERE.map((t) => t.startHere)).toEqual([1, 2, 3]);
    expect(START_HERE.map((t) => t.route)).toEqual(['/attack-path', '/cloud-security', '/incident-response']);
  });
});

describe('SecurityTools', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [SecurityTools], providers: [provideRouter([])] }).compileComponents();
  });

  const render = async () => {
    const fixture = TestBed.createComponent(SecurityTools);
    fixture.detectChanges();
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  };

  it('has one h1, a scope note, and a labelled section for each group', async () => {
    const el = await render();
    expect(el.querySelectorAll('h1').length).toBe(1);
    expect(el.querySelector('h1')?.textContent).toContain('Security Tools');
    expect(el.querySelector('.st-scope')?.textContent).toContain('academic and simulated');
    const sections = Array.from(el.querySelectorAll('section.st-group'));
    expect(sections.length).toBe(TOOL_GROUPS.length);
    for (const s of sections) {
      const id = s.getAttribute('aria-labelledby');
      expect(id && el.querySelector(`#${id}`)).toBeTruthy();
    }
  });

  it('shows every tool once, linked to its route, with three marked "Start here"', async () => {
    const el = await render();
    const cards = Array.from(el.querySelectorAll('.tool-card'));
    expect(cards.length).toBe(TOOLS.length);
    expect(new Set(cards.map((c) => c.getAttribute('href'))).size).toBe(TOOLS.length);
    expect(cards.filter((c) => c.querySelector('.tool-start')).length).toBe(3);
  });
});
