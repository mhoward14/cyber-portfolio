import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { EmailLink, emailAddress } from './email-link';
import { isFramed, refuseFraming } from './frame-guard';

@Component({
  standalone: true,
  imports: [EmailLink],
  template: `<a appEmailLink>Email</a>`,
})
class Host {}

describe('EmailLink', () => {
  it('assembles a well-formed address', () => {
    expect(emailAddress()).toMatch(/^[a-z0-9]+@[a-z]+\.[a-z]+$/);
  });

  it('renders without the address and fills it in when reached', () => {
    const fixture = TestBed.configureTestingModule({ imports: [Host] }).createComponent(Host);
    fixture.detectChanges();
    const a: HTMLAnchorElement = fixture.nativeElement.querySelector('a');
    expect(a.getAttribute('href')).toBe('mailto:');
    expect(fixture.nativeElement.innerHTML).not.toContain('@');

    a.dispatchEvent(new Event('focus'));
    expect(a.getAttribute('href')).toBe(`mailto:${emailAddress()}`);
  });
});

describe('frame guard', () => {
  it('is not framed at the top level', () => {
    expect(isFramed({ self: 1, top: 1 } as unknown as Window)).toBe(false);
  });

  it('is framed when top differs or cannot be read', () => {
    expect(isFramed({ self: 1, top: 2 } as unknown as Window)).toBe(true);
    const crossOrigin = {
      self: 1,
      get top(): never {
        throw new DOMException('Blocked a frame', 'SecurityError');
      },
    };
    expect(isFramed(crossOrigin as unknown as Window)).toBe(true);
  });

  it('replaces the page with a notice and a direct link', () => {
    const doc = document.implementation.createHTMLDocument('framed');
    doc.body.innerHTML = '<app-root></app-root>';
    refuseFraming(doc);
    expect(doc.querySelector('app-root')).toBeNull();
    const link = doc.querySelector('a')!;
    expect(link.target).toBe('_blank');
    expect(link.rel).toContain('noopener');
    expect(doc.body.textContent).toContain('can’t be shown inside another site');
  });
});
