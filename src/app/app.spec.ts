import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';

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
});
