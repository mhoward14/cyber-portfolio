import { focusPageHeading, pagePath } from './route-focus';

describe('route focus', () => {
  afterEach(() => (document.body.innerHTML = ''));

  it('treats only the path as the page', () => {
    expect(pagePath('/attack-path?s=c1.0.EAs')).toBe('/attack-path');
    expect(pagePath('/crosswalk#top')).toBe('/crosswalk');
    expect(pagePath('/')).toBe('/');
  });

  it('moves focus to the main heading and makes it focusable', () => {
    document.body.innerHTML = '<a id="link" href="#">Tool</a><main><h1>Attack Path Builder</h1><h2>Sub</h2></main>';
    document.getElementById('link')!.focus();
    expect(focusPageHeading()).toBe(true);
    const h1 = document.querySelector('h1')!;
    expect(document.activeElement).toBe(h1);
    expect(h1.getAttribute('tabindex')).toBe('-1');
  });

  it('ignores headings outside <main>', () => {
    document.body.innerHTML = '<h1>Not the page</h1><main></main>';
    expect(focusPageHeading(document, 0)).toBe(false);
    expect(document.activeElement).toBe(document.body);
  });

  it('keeps an existing tabindex', () => {
    document.body.innerHTML = '<main><h1 tabindex="0">Title</h1></main>';
    focusPageHeading();
    expect(document.querySelector('h1')!.getAttribute('tabindex')).toBe('0');
  });

  it('waits for a lazily rendered heading', async () => {
    document.body.innerHTML = '<main></main>';
    expect(focusPageHeading(document, 5)).toBe(false);
    document.querySelector('main')!.innerHTML = '<h1>Late page</h1>';
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(document.activeElement).toBe(document.querySelector('h1'));
  });
});
