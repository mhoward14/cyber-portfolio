import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ModalDialog, tabStops, trapTarget } from './modal-dialog';

@Component({
  standalone: true,
  imports: [ModalDialog],
  template: `
    <button id="opener" type="button" (click)="open.set(true)">Open</button>
    @if (open()) {
      <div id="dlg" appModalDialog="dlg-title" (dismissed)="open.set(false)">
        <h2 id="dlg-title">Details</h2>
        <button class="close-btn" type="button">Close</button>
        <a id="link" href="https://example.com">Link</a>
        <button id="last" type="button">Last</button>
        <button id="off" type="button" disabled>Disabled</button>
        <button id="gone" type="button" hidden>Hidden</button>
      </div>
    }
  `,
})
class Host {
  open = signal(false);
}

async function openDialog() {
  const fixture = TestBed.createComponent(Host);
  document.body.appendChild(fixture.nativeElement);
  await fixture.whenStable();
  const opener = fixture.nativeElement.querySelector('#opener') as HTMLButtonElement;
  opener.focus();
  opener.click();
  fixture.detectChanges();
  await fixture.whenStable();
  return { fixture, opener, dialog: fixture.nativeElement.querySelector('#dlg') as HTMLElement };
}

const press = (el: Element, key: string, shiftKey = false) => {
  const event = new KeyboardEvent('keydown', { key, shiftKey, bubbles: true, cancelable: true });
  el.dispatchEvent(event);
  return event;
};

describe('ModalDialog', () => {
  afterEach(() => (document.body.innerHTML = ''));

  it('is announced as a modal dialog named by its title', async () => {
    const { dialog } = await openDialog();
    expect(dialog.getAttribute('role')).toBe('dialog');
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog.getAttribute('aria-labelledby')).toBe('dlg-title');
  });

  it('moves focus into the dialog when it opens', async () => {
    const { dialog } = await openDialog();
    expect(document.activeElement).toBe(dialog.querySelector('.close-btn'));
  });

  it('keeps Tab inside the dialog, wrapping at both ends', async () => {
    const { dialog } = await openDialog();
    (dialog.querySelector('#last') as HTMLElement).focus();
    expect(press(dialog, 'Tab').defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(dialog.querySelector('.close-btn'));

    expect(press(dialog, 'Tab', true).defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(dialog.querySelector('#last'));
  });

  it('lets Tab move normally between the ends', async () => {
    const { dialog } = await openDialog();
    (dialog.querySelector('#link') as HTMLElement).focus();
    expect(press(dialog, 'Tab').defaultPrevented).toBe(false);
  });

  it('closes on Escape and returns focus to what opened it', async () => {
    const { fixture, opener } = await openDialog();
    press(document.body, 'Escape');
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('#dlg')).toBeNull();
    expect(document.activeElement).toBe(opener);
  });

  it('ignores disabled and hidden controls', async () => {
    const { dialog } = await openDialog();
    expect(tabStops(dialog).map((el) => el.id || el.className)).toEqual(['close-btn', 'link', 'last']);
  });
});

describe('trapTarget', () => {
  const make = () => {
    const dialog = document.createElement('div');
    const [a, b, c] = ['a', 'b', 'c'].map(() => document.createElement('button'));
    return { dialog, a, b, c, stops: [a, b, c] };
  };

  it('wraps forward from the last stop and backward from the first', () => {
    const { dialog, a, b, c, stops } = make();
    expect(trapTarget(stops, c, false, dialog)).toBe(a);
    expect(trapTarget(stops, a, true, dialog)).toBe(c);
    expect(trapTarget(stops, dialog, true, dialog)).toBe(c);
    expect(trapTarget(stops, b, false, dialog)).toBeNull();
  });

  it('keeps focus on the dialog when it has nothing focusable', () => {
    const { dialog } = make();
    expect(trapTarget([], null, false, dialog)).toBe(dialog);
  });
});
