import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { NOTES, Notes } from './notes';
import { REPO_URL } from '../site-security/site-security';

describe('Notes', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Notes],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('has one h1 and one labelled article per note', async () => {
    const fixture = TestBed.createComponent(Notes);
    fixture.detectChanges();
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelectorAll('h1').length).toBe(1);
    const articles = Array.from(el.querySelectorAll('article.note'));
    expect(articles.length).toBe(NOTES.length);
    for (const a of articles) {
      const id = a.getAttribute('aria-labelledby');
      expect(id && el.querySelector(`#${id}`)).toBeTruthy();
    }
  });

  it('gives every note a unique id, sections and at least one link', () => {
    const ids = NOTES.map((n) => n.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const n of NOTES) {
      expect(n.sections.length).toBeGreaterThan(0);
      expect(n.links.length).toBeGreaterThan(0);
    }
  });

  it('only links to files that exist, and commits that look like commits', () => {
    const bad: string[] = [];
    for (const n of NOTES) {
      for (const l of n.links) {
        if (l.commit) {
          if (!/^[0-9a-f]{7,40}$/.test(l.ref)) bad.push(`${n.id}: ${l.ref}`);
        } else if (!existsSync(resolve(process.cwd(), l.ref))) bad.push(`${n.id}: ${l.ref}`);
      }
    }
    expect(bad).toEqual([]);
  });

  it('links commits, files and folders on the main branch', () => {
    const c = TestBed.createComponent(Notes).componentInstance;
    expect(c.href({ label: 'c', ref: 'abc1234', commit: true })).toBe(`${REPO_URL}/commit/abc1234`);
    expect(c.href({ label: 'f', ref: 'src/index.html' })).toBe(`${REPO_URL}/blob/master/src/index.html`);
    expect(c.href({ label: 'd', ref: '.github/workflows' })).toBe(`${REPO_URL}/tree/master/.github/workflows`);
  });

  it('opens outside links safely', () => {
    const fixture = TestBed.createComponent(Notes);
    fixture.detectChanges();
    const links = (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLAnchorElement>('a[target="_blank"]');
    expect(links.length).toBeGreaterThan(0);
    for (const a of Array.from(links)) expect(a.rel).toContain('noopener');
  });
});
