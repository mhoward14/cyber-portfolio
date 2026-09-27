import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { ArrivedFromBanner, ArrivedTechnique, findArrivedTechnique } from './arrived-from';
import { TACTIC_STAGES } from '../attack-path/attack-path-data';

describe('findArrivedTechnique', () => {
  it('prefers the entry whose defense points at the current tool', () => {
    // T1078 appears under Initial Access (Zero Trust) and Persistence (RMF Tracker).
    expect(findArrivedTechnique('T1078', '/rmf-tracker')!.tactic).toBe('Persistence');
    expect(findArrivedTechnique('T1078', '/zero-trust')!.tactic).toBe('Initial Access');
  });

  it('rejects malformed or unknown IDs', () => {
    expect(findArrivedTechnique('<script>', '/zero-trust')).toBeNull();
    expect(findArrivedTechnique('T9999', '/zero-trust')).toBeNull();
    expect(findArrivedTechnique(null, '/zero-trust')).toBeNull();
  });

  it('finds every technique the Attack Path links to its own defense route', () => {
    for (const stage of TACTIC_STAGES) {
      for (const t of stage.techniques) {
        expect(findArrivedTechnique(t.attackId, t.defense.route)?.note, t.id).toBe(t.defense.note);
      }
    }
  });
});

describe('ArrivedFromBanner', () => {
  const render = async (from: string | null) => {
    await TestBed.configureTestingModule({
      imports: [ArrivedFromBanner],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { queryParamMap: of(convertToParamMap(from ? { from } : {})) } },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(ArrivedFromBanner);
    fixture.componentRef.setInput('route', '/zero-trust');
    const emitted: ArrivedTechnique[] = [];
    fixture.componentInstance.arrived.subscribe((t) => emitted.push(t));
    fixture.detectChanges();
    return { el: fixture.nativeElement as HTMLElement, emitted };
  };

  it('shows the technique and emits it once', async () => {
    const { el, emitted } = await render('T1566');
    expect(el.textContent).toContain('Phishing');
    expect(el.querySelector('a.af-back')).toBeTruthy();
    expect(emitted.map((t) => t.attackId)).toEqual(['T1566']);
  });

  it('renders nothing without a from parameter', async () => {
    const { el, emitted } = await render(null);
    expect(el.querySelector('.af')).toBeNull();
    expect(emitted.length).toBe(0);
  });
});
