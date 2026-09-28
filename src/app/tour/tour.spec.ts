import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { TOUR_STEPS } from './tour-steps';
import { TourService } from './tour.service';
import { placeCard } from './tour-overlay';

describe('TourService', () => {
  let visited: string[];
  let url: string;
  const setup = () => {
    visited = [];
    url = '/';
    TestBed.configureTestingModule({
      providers: [{ provide: Router, useValue: { get url() { return url; }, navigateByUrl: (u: string) => { visited.push(u); url = u; return Promise.resolve(true); } } }],
    });
    return TestBed.inject(TourService);
  };

  it('should walk every step in order, navigating only when the route changes', () => {
    const tour = setup();
    tour.start();
    expect(tour.index()).toBe(0);
    for (let i = 1; i < TOUR_STEPS.length; i++) tour.next();
    expect(tour.isLast()).toBe(true);
    const routeChanges = TOUR_STEPS.map((s) => s.route).filter((r, i, all) => i === 0 ? r !== '/' : r !== all[i - 1]);
    expect(visited).toEqual(routeChanges);
    tour.next();
    expect(tour.active()).toBe(false);
  });

  it('should go back, never before the first step, and end on request', () => {
    const tour = setup();
    tour.start();
    tour.back();
    expect(tour.index()).toBe(0);
    tour.next();
    tour.next();
    tour.back();
    expect(tour.index()).toBe(1);
    tour.end();
    expect(tour.step()).toBeNull();
  });

  it('should visit the three "Start here" tools and end at the report', () => {
    const routes = TOUR_STEPS.map((s) => s.route);
    expect(routes).toContain('/attack-path');
    expect(routes).toContain('/cloud-security');
    expect(routes).toContain('/incident-response');
    expect(routes.at(-1)).toBe('/report');
    expect(TOUR_STEPS.length).toBeLessThanOrEqual(10);
  });
});

describe('placeCard', () => {
  const vp = { width: 1440, height: 900 };

  it('should center the card when there is no target', () => {
    expect(placeCard(null, vp, 200).mode).toBe('center');
  });

  it('should prefer below, then above, then inside the viewport', () => {
    expect(placeCard({ top: 100, left: 300, width: 400, height: 200 }, vp, 200).mode).toBe('below');
    expect(placeCard({ top: 600, left: 300, width: 400, height: 250 }, vp, 200).mode).toBe('above');
    expect(placeCard({ top: 20, left: 300, width: 1100, height: 860 }, vp, 200).mode).toBe('inside');
  });

  it('should sit beside tall targets when there is room', () => {
    expect(placeCard({ top: 60, left: 1090, width: 330, height: 800 }, vp, 200).mode).toBe('left');
    expect(placeCard({ top: 60, left: 260, width: 400, height: 800 }, vp, 200).mode).toBe('right');
  });

  it('should keep the card on screen horizontally', () => {
    const p = placeCard({ top: 100, left: 1300, width: 120, height: 40 }, vp, 200);
    expect(p.left + 360).toBeLessThanOrEqual(vp.width - 16);
  });

  it('should use a bottom sheet on phones', () => {
    expect(placeCard({ top: 100, left: 20, width: 300, height: 100 }, { width: 390, height: 800 }, 200).mode).toBe('sheet');
  });
});
