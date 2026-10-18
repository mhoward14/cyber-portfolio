import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { CONTROL_GROUPS, KNOWN_LIMITS, REPO_URL, SiteSecurity, VERIFY_COMMANDS } from './site-security';

describe('SiteSecurity', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SiteSecurity],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  const render = async () => {
    const fixture = TestBed.createComponent(SiteSecurity);
    fixture.detectChanges();
    await fixture.whenStable();
    return { fixture, el: fixture.nativeElement as HTMLElement };
  };

  it('has one h1 and a heading for each group plus verification and limits', async () => {
    const { el } = await render();
    expect(el.querySelectorAll('h1').length).toBe(1);
    expect(el.querySelector('h1')?.textContent).toContain('How this site is secured');
    // Each group, plus "Verify it yourself" and "Known limits".
    expect(el.querySelectorAll('h2').length).toBe(CONTROL_GROUPS.length + 2);
  });

  it('shows every control with a way to check it', async () => {
    const { el } = await render();
    const total = CONTROL_GROUPS.reduce((sum, g) => sum + g.controls.length, 0);
    expect(el.querySelectorAll('.ss-card').length).toBe(total);
    for (const group of CONTROL_GROUPS) {
      for (const control of group.controls) {
        expect(control.name).toBeTruthy();
        expect(control.what).toBeTruthy();
        expect(control.stops).toBeTruthy();
        expect(control.evidence.length).toBeGreaterThan(0);
      }
    }
  });

  it('only links to files and folders that exist in this repository', () => {
    const missing: string[] = [];
    for (const group of CONTROL_GROUPS) {
      for (const control of group.controls) {
        for (const e of control.evidence) {
          if (e.path && !existsSync(resolve(process.cwd(), e.path))) missing.push(`${control.name}: ${e.path}`);
        }
      }
    }
    expect(missing).toEqual([]);
  });

  it('gives every piece of evidence a path or an https address, never both or neither', () => {
    for (const group of CONTROL_GROUPS) {
      for (const control of group.controls) {
        for (const e of control.evidence) {
          expect(Boolean(e.path) !== Boolean(e.url)).toBe(true);
          if (e.url) expect(e.url.startsWith('https://')).toBe(true);
        }
      }
    }
  });

  it('links files as blobs and folders as trees on the main branch', () => {
    const c = TestBed.createComponent(SiteSecurity).componentInstance;
    expect(c.href({ label: 'f', path: 'src/index.html' })).toBe(`${REPO_URL}/blob/master/src/index.html`);
    expect(c.href({ label: 'd', path: '.github/workflows' })).toBe(`${REPO_URL}/tree/master/.github/workflows`);
    expect(c.href({ label: 'u', url: 'https://example.com/x' })).toBe('https://example.com/x');
  });

  it('opens every outside link safely and lists the known limits', async () => {
    const { el } = await render();
    for (const a of Array.from(el.querySelectorAll<HTMLAnchorElement>('a[target="_blank"]'))) {
      expect(a.rel).toContain('noopener');
    }
    expect(el.querySelectorAll('.ss-limits li').length).toBe(KNOWN_LIMITS.length);
  });

  it('shows the commands for checking the published build', async () => {
    const { el } = await render();
    expect(el.querySelector('.ss-code')?.textContent).toContain('gh attestation verify');
    expect(VERIFY_COMMANDS).toContain('--repo mhoward14/cyber-portfolio');
  });
});
