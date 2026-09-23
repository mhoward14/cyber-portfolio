import { RmfTracker } from './rmf-tracker';
import { CONTROLS, TIER_ORDER } from './rmf-data';

describe('RmfTracker', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('shows no active controls until a baseline tier is selected', () => {
    localStorage.setItem('rmf-tracker-state', JSON.stringify({ tier: null, statuses: {}, notes: {}, sample: false }));
    const cmp = new RmfTracker();
    expect(cmp.tier()).toBeNull();
    expect(cmp.activeControls().length).toBe(0);
  });

  it('includes only low-baseline controls under the Low tier, and progressively more under Moderate/High', () => {
    const cmp = new RmfTracker();
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
    const cmp = new RmfTracker();
    const control = cmp.activeControls()[0];
    expect(cmp.statusOf(control.id)).toBe('not-implemented');

    cmp.setStatus(control.id, 'implemented');
    expect(cmp.statusOf(control.id)).toBe('implemented');
  });

  it('seeds a plausible sample assessment (not an empty one) on a first-ever visit', () => {
    const cmp = new RmfTracker();
    expect(cmp.sample()).toBe(true);
    expect(cmp.tier()).toBe('moderate');
    expect(Object.keys(cmp.statuses()).length).toBeGreaterThan(0);
  });

  it('computes the completion summary from implemented controls out of the active baseline', () => {
    const cmp = new RmfTracker();
    cmp.selectTier('low');
    for (const control of cmp.activeControls()) {
      cmp.setStatus(control.id, 'implemented');
    }
    expect(cmp.summary().pct).toBe(100);
    expect(cmp.summary().counts.implemented).toBe(cmp.activeControls().length);
  });

  it('filters by search term, family, and status together', () => {
    const cmp = new RmfTracker();
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
    const cmp = new RmfTracker();
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
    const cmp = new RmfTracker();
    cmp.selectTier('low');
    for (const c of cmp.activeControls()) {
      cmp.setStatus(c.id, 'implemented');
    }
    expect(cmp.poamText()).toContain('No open items');
  });

  it('persists tier and statuses to localStorage across instantiations', () => {
    const first = new RmfTracker();
    first.selectTier('moderate');
    const control = first.activeControls()[0];
    first.setStatus(control.id, 'implemented');

    const second = new RmfTracker();
    expect(second.tier()).toBe('moderate');
    expect(second.statusOf(control.id)).toBe('implemented');
  });
});
