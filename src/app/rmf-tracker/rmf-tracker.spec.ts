import { TestBed } from '@angular/core/testing';
import { RmfTracker } from './rmf-tracker';
import { CONTROLS, TIER_ORDER } from './rmf-data';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { decodeRmf, encodeRmf } from './rmf-share';

// RmfTracker injects EngagementService, so build it in an injection context.
const create = () => TestBed.runInInjectionContext(() => new RmfTracker());

describe('RmfTracker', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('shows no active controls until a baseline tier is selected', () => {
    localStorage.setItem('rmf-tracker-state', JSON.stringify({ tier: null, statuses: {}, notes: {}, sample: false }));
    const cmp = create();
    expect(cmp.tier()).toBeNull();
    expect(cmp.activeControls().length).toBe(0);
  });

  it('includes only low-baseline controls under the Low tier, and progressively more under Moderate/High', () => {
    const cmp = create();
    cmp.selectTier('low');
    const lowCount = cmp.activeControls().length;
    expect(cmp.activeControls().every((c) => c.baseline === 'low')).toBe(true);

    cmp.selectTier('moderate');
    const moderateCount = cmp.activeControls().length;
    expect(moderateCount).toBeGreaterThan(lowCount);
    expect(cmp.activeControls().every((c) => TIER_ORDER[c.baseline] <= TIER_ORDER['moderate'])).toBe(true);

    cmp.selectTier('high');
    expect(cmp.activeControls().length).toBe(CONTROLS.length);
  });

  it('defaults an unset control to Not Implemented, and setStatus overrides it', () => {
    localStorage.setItem('rmf-tracker-state', JSON.stringify({ tier: 'high', statuses: {}, notes: {}, sample: false }));
    const cmp = create();
    const control = cmp.activeControls()[0];
    expect(cmp.statusOf(control.id)).toBe('not-implemented');

    cmp.setStatus(control.id, 'implemented');
    expect(cmp.statusOf(control.id)).toBe('implemented');
  });

  it('seeds a plausible sample assessment (not an empty one) on a first-ever visit', () => {
    const cmp = create();
    expect(cmp.sample()).toBe(true);
    expect(cmp.tier()).toBe('moderate');
    expect(Object.keys(cmp.statuses()).length).toBeGreaterThan(0);
  });

  it('computes the completion summary from implemented controls out of the active baseline', () => {
    const cmp = create();
    cmp.selectTier('low');
    for (const control of cmp.activeControls()) {
      cmp.setStatus(control.id, 'implemented');
    }
    expect(cmp.summary().pct).toBe(100);
    expect(cmp.summary().counts.implemented).toBe(cmp.activeControls().length);
  });

  it('filters by search term, family, and status together', () => {
    const cmp = create();
    cmp.selectTier('high');
    const control = cmp.activeControls()[0];
    cmp.setStatus(control.id, 'implemented');

    cmp.query.set(control.title.slice(0, 4));
    expect(cmp.filtered().some((c) => c.id === control.id)).toBe(true);

    cmp.query.set('');
    cmp.statusFilter.set('implemented');
    expect(cmp.filtered().every((c) => cmp.statusOf(c.id) === 'implemented')).toBe(true);

    cmp.familyFilter.set(control.family);
    expect(cmp.filtered().every((c) => c.family === control.family)).toBe(true);
  });

  it('drafts a POA&M listing only partial and not-implemented controls', () => {
    const cmp = create();
    cmp.selectTier('low');
    const controls = cmp.activeControls();
    cmp.setStatus(controls[0].id, 'partial');
    cmp.setStatus(controls[1].id, 'not-implemented');
    for (const c of controls.slice(2)) {
      cmp.setStatus(c.id, 'implemented');
    }

    const poam = cmp.poamText();
    expect(poam).toContain(controls[0].id);
    expect(poam).toContain(controls[1].id);
    expect(poam).not.toContain(`${controls[2].id} —`);
  });

  it('reports every control implemented when there are no open items', () => {
    const cmp = create();
    cmp.selectTier('low');
    for (const c of cmp.activeControls()) {
      cmp.setStatus(c.id, 'implemented');
    }
    expect(cmp.poamText()).toContain('No open items');
  });

  it('persists tier and statuses to localStorage across instantiations', () => {
    const first = create();
    first.selectTier('moderate');
    const control = first.activeControls()[0];
    first.setStatus(control.id, 'implemented');

    const second = create();
    expect(second.tier()).toBe('moderate');
    expect(second.statusOf(control.id)).toBe('implemented');
  });
});

const sharedRoute = (code: string) => ({
  provide: ActivatedRoute,
  useValue: { snapshot: { queryParamMap: convertToParamMap({ s: code }) } },
});

describe('RmfTracker share links', () => {
  beforeEach(() => localStorage.clear());

  it('should round-trip tier and every status, leaving notes out', () => {
    const cmp = create();
    cmp.setStatus(CONTROLS[0].id, 'na');
    cmp.setNote(CONTROLS[0].id, 'private note');
    const code = cmp.shareCode()!;
    expect(code).not.toContain('private');
    const decoded = decodeRmf(code)!;
    expect(decoded.tier).toBe(cmp.tier());
    expect(decoded.statuses).toEqual(cmp.statuses());
    expect(encodeRmf(decoded)).toBe(code);
    for (const bad of ['r1.4.' + code.split('.')[2], 'r1.2.AAAA', 'r1.2']) expect(decodeRmf(bad), bad).toBeNull();
  });

  it('should show a shared assessment without its notes or the sample banner, and restore on discard', () => {
    const own = create();
    const code = encodeRmf({ tier: 'high', statuses: { [CONTROLS[1].id]: 'implemented' } });
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [sharedRoute(code)] });
    const viewer = create();
    expect(viewer.tier()).toBe('high');
    expect(viewer.statuses()).toEqual({ [CONTROLS[1].id]: 'implemented' });
    expect(viewer.notes()).toEqual({});
    expect(viewer.sample()).toBe(false);
    viewer.setStatus(CONTROLS[2].id, 'partial');
    expect(JSON.parse(localStorage.getItem('rmf-tracker-state') ?? 'null')?.tier ?? own.tier()).toBe(own.tier());
    viewer.discardShared();
    expect(viewer.statuses()).toEqual(own.statuses());
    expect(viewer.notes()).toEqual(own.notes());
  });
});
