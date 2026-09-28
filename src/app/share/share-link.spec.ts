import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { ShareButton, ShareSession, packValues, shareUrl, splitCode, unpackValues } from './share-link';

describe('share codes', () => {
  it('should round-trip packed values of any bit width', () => {
    for (const bits of [1, 2, 3, 5]) {
      const values = Array.from({ length: 37 }, (_, i) => (i * 7) % (1 << bits));
      const text = packValues(values, bits);
      expect(text).toMatch(/^[A-Za-z0-9_-]+$/);
      expect(unpackValues(text, bits, values.length)).toEqual(values);
    }
  });

  it('should reject packed text of the wrong length or alphabet', () => {
    const text = packValues([1, 0, 1, 1, 0, 1, 0, 0], 1);
    expect(unpackValues(text, 1, 20)).toBeNull();
    expect(unpackValues(text + 'A', 1, 8)).toBeNull();
    expect(unpackValues('!!', 1, 8)).toBeNull();
  });

  it('should split versioned codes and reject the wrong prefix, part count, or excessive length', () => {
    expect(splitCode('c1.0.2.AB', 'c1', 3)).toEqual(['0', '2', 'AB']);
    expect(splitCode('c2.0.2.AB', 'c1', 3)).toBeNull();
    expect(splitCode('c1.0.2', 'c1', 3)).toBeNull();
    expect(splitCode('c1.' + 'A'.repeat(500), 'c1', 1)).toBeNull();
  });

  it('should build a hash-route link on the current page', () => {
    const url = shareUrl('/cloud-security', 'c1.0.0.AA');
    expect(url.startsWith(location.origin)).toBe(true);
    expect(url).toContain('#/cloud-security?s=c1.0.0.AA');
  });
});

describe('ShareSession', () => {
  const open = (code: string | null, apply: (c: string) => boolean) => {
    TestBed.configureTestingModule({
      providers: [{ provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap(code ? { s: code } : {}) } } }],
    });
    const session = TestBed.runInInjectionContext(() => new ShareSession());
    session.open(apply);
    return session;
  };

  it('should enter shared mode only when the decoder accepts the code', () => {
    expect(open('x1.ok', () => true).viewing()).toBe(true);
    TestBed.resetTestingModule();
    const bad = open('x1.bad', () => false);
    expect(bad.viewing()).toBe(false);
    expect(bad.invalid()).toBe(true);
    bad.close();
    expect(bad.invalid()).toBe(false);
  });

  it('should do nothing without a code', () => {
    let called = false;
    const s = open(null, () => (called = true));
    expect(called).toBe(false);
    expect(s.viewing()).toBe(false);
  });

  it('should work without a router (outside a routed page)', () => {
    const session = TestBed.runInInjectionContext(() => new ShareSession());
    expect(session.incoming).toBeNull();
    session.close();
  });
});

describe('ShareButton', () => {
  it('should copy the link, or fall back to a field when the clipboard is unavailable', async () => {
    const fixture = TestBed.createComponent(ShareButton);
    fixture.componentRef.setInput('route', '/devops-pipeline');
    fixture.componentRef.setInput('code', 'd1.AA');
    const writes: string[] = [];
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async (t: string) => void writes.push(t) } });
    await fixture.componentInstance.copy();
    expect(writes[0]).toContain('#/devops-pipeline?s=d1.AA');
    expect(fixture.componentInstance.status()).toBe('Link copied');

    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async () => Promise.reject(new Error('denied')) } });
    await fixture.componentInstance.copy();
    expect(fixture.componentInstance.fallback()).toBe(true);
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('input')!.value).toContain('?s=d1.AA');
  });

  it('should be disabled without a code', () => {
    const fixture = TestBed.createComponent(ShareButton);
    fixture.componentRef.setInput('route', '/attack-path');
    fixture.componentRef.setInput('code', null);
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('button')!.disabled).toBe(true);
  });
});
