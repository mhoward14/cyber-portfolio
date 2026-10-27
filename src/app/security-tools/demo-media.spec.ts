import { existsSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { SecurityTools } from '../security-tools/security-tools';

const file = (p: string) => resolve(process.cwd(), p);
const head = (p: string, n: number) => readFileSync(file(p)).subarray(0, n);
const MB = 1024 * 1024;

describe('Engagement Mode demo media', () => {
  it('ships real files of the right kind, within a size budget', () => {
    for (const p of ['public/media/engagement-mode.webm', 'public/media/engagement-mode-poster.png', 'docs/engagement-mode.gif']) {
      expect(existsSync(file(p))).toBe(true);
    }
    // WebM starts with the EBML header, PNG with its signature, GIF with its tag.
    expect([...head('public/media/engagement-mode.webm', 4)]).toEqual([0x1a, 0x45, 0xdf, 0xa3]);
    expect([...head('public/media/engagement-mode-poster.png', 4)]).toEqual([0x89, 0x50, 0x4e, 0x47]);
    expect(head('docs/engagement-mode.gif', 6).toString('ascii')).toBe('GIF89a');
    // The video ships with the site, so it stays small; the README GIF is under GitHub's 10 MB image limit.
    expect(statSync(file('public/media/engagement-mode.webm')).size).toBeLessThan(3 * MB);
    expect(statSync(file('public/media/engagement-mode-poster.png')).size).toBeLessThan(0.5 * MB);
    expect(statSync(file('docs/engagement-mode.gif')).size).toBeLessThan(8 * MB);
  });
});

describe('Security Tools demo video', () => {
  const render = async () => {
    await TestBed.configureTestingModule({ imports: [SecurityTools], providers: [provideRouter([])] }).compileComponents();
    const fixture = TestBed.createComponent(SecurityTools);
    fixture.detectChanges();
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  };

  it('starts only when the visitor presses play, and says what it shows', async () => {
    const el = await render();
    const video = el.querySelector<HTMLVideoElement>('video.demo-video')!;
    expect(video).toBeTruthy();
    expect(video.hasAttribute('controls')).toBe(true);
    expect(video.hasAttribute('autoplay')).toBe(false);
    expect(video.hasAttribute('loop')).toBe(false);
    expect(video.getAttribute('preload')).toBe('none');
    expect(video.getAttribute('poster')).toBe('media/engagement-mode-poster.png');
    expect(video.querySelector('source')?.getAttribute('src')).toBe('media/engagement-mode.webm');
    // A text description and a one-line summary the video points at.
    expect(el.querySelector(`#${video.getAttribute('aria-describedby')}`)?.textContent).toContain('screen recording');
    expect(el.querySelectorAll('.demo-text li').length).toBe(5);
  });
});
