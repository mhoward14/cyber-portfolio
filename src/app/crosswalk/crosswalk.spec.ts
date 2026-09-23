import { Crosswalk } from './crosswalk';
import { CROSSWALK_DATA } from './crosswalk-data';

describe('Crosswalk', () => {
  it('lists every entry when there is no search term or family filter', () => {
    const cmp = new Crosswalk();
    expect(cmp.filtered().length).toBe(CROSSWALK_DATA.length);
  });

  it('filters entries by a search term matched against any framework id or title', () => {
    const cmp = new Crosswalk();
    const entry = CROSSWALK_DATA[0];
    cmp.query.set(entry.frameworks.nist.id);
    expect(cmp.filtered().some((e) => e === entry)).toBe(true);
    expect(cmp.filtered().length).toBeLessThanOrEqual(CROSSWALK_DATA.length);
  });

  it('filters entries by family', () => {
    const cmp = new Crosswalk();
    const family = CROSSWALK_DATA[0].family;
    cmp.family.set(family);
    expect(cmp.filtered().every((e) => e.family === family)).toBe(true);
    expect(cmp.filtered().length).toBeGreaterThan(0);
  });

  it('combines search and family filters', () => {
    const cmp = new Crosswalk();
    const entry = CROSSWALK_DATA[0];
    cmp.family.set(entry.family);
    cmp.query.set('a string that will not match anything at all xyz123');
    expect(cmp.filtered().length).toBe(0);
  });

  it('reorders framework keys so the anchor framework is first', () => {
    const cmp = new Crosswalk();
    cmp.setAnchor('cis');
    expect(cmp.orderedKeys()[0]).toBe('cis');
    expect(cmp.orderedKeys().length).toBe(3);
  });

  it('opens and closes the detail panel for a selected entry', () => {
    const cmp = new Crosswalk();
    const entry = CROSSWALK_DATA[0];
    cmp.openDetail(entry, 'iso');
    expect(cmp.selectedEntry()).toBe(entry);
    expect(cmp.selectedFramework()).toBe('iso');
    expect(cmp.detailOrderedKeys()[0]).toBe('iso');

    cmp.closeDetail();
    expect(cmp.selectedEntry()).toBeNull();
  });

  it('lists every family present in the dataset, sorted', () => {
    const cmp = new Crosswalk();
    const expected = Array.from(new Set(CROSSWALK_DATA.map((d) => d.family))).sort();
    expect(cmp.families()).toEqual(expected);
  });
});
