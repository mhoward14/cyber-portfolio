import { TestBed } from '@angular/core/testing';
import { Component } from '@angular/core';
import { Router, provideRouter } from '@angular/router';
import { App } from './app';

@Component({ template: '' })
class Blank {}

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render the shared nav shell', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.sidebar')).toBeTruthy();
  });

  it('should link the résumé PDF from the top nav', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const link = (fixture.nativeElement as HTMLElement).querySelector('.top-nav a.resume-btn');
    expect(link?.getAttribute('href')).toBe('Matthew_Howard_Resume.pdf');
    expect(link?.getAttribute('rel')).toContain('noopener');
  });
  it('offers a skip link that moves focus to the main content', async () => {
    const fixture = TestBed.createComponent(App);
    document.body.appendChild(fixture.nativeElement);
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;
    const skip = root.querySelector('a.skip-link') as HTMLAnchorElement;
    expect(skip.textContent).toContain('Skip to main content');
    const click = new MouseEvent('click', { bubbles: true, cancelable: true });
    skip.dispatchEvent(click);
    expect(click.defaultPrevented).toBe(true); // hash routing: never change the URL hash
    expect(document.activeElement).toBe(root.querySelector('#main-content'));
    fixture.nativeElement.remove();
  });

  it('marks the sidebar and top bar as distinct navigation landmarks', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const navs = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('nav'));
    expect(navs.map((n) => n.getAttribute('aria-label')).sort()).toEqual(['Profile links', 'Site navigation']);
  });

  it('keeps the individual tools folded away until asked, and toggles them from a labelled button', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const list = root.querySelector('#sidebar-tools-list') as HTMLElement;
    const toggle = root.querySelector('.sidebar-group-toggle') as HTMLButtonElement;
    expect(list.hidden).toBe(true);
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(toggle.getAttribute('aria-label')).toBe('Show the individual tools');
    toggle.click();
    fixture.detectChanges();
    expect(list.hidden).toBe(false);
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(toggle.getAttribute('aria-label')).toBe('Hide the individual tools');
    expect(root.querySelector('.sidebar-link-tools')?.getAttribute('href')).toBe('/security-tools');
  });

  it('opens the tools list when the visitor is inside a tool', async () => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([{ path: 'attack-path', component: Blank }, { path: '', component: Blank }])],
    }).compileComponents();
    const fixture = TestBed.createComponent(App);
    await TestBed.inject(Router).navigateByUrl('/attack-path?s=x');
    await fixture.whenStable();
    expect(fixture.componentInstance.toolsOpen()).toBe(true);
  });

  it('links the Engagement Report from inside the tools list', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    fixture.detectChanges();
    const link = (fixture.nativeElement as HTMLElement).querySelector('#sidebar-tools-list a[href="/report"]');
    expect(link).toBeTruthy();
  });
});
