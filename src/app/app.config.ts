import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideClientHydration, withEventReplay, withNoIncrementalHydration } from '@angular/platform-browser';
import { provideRouter, withHashLocation, withInMemoryScrolling } from '@angular/router';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    // This tells Angular: "I'm using Zone.js, please bundle my events together"
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideClientHydration(withEventReplay(), withNoIncrementalHydration()),
    // Hash location: the site is a static GitHub Pages build with no
    // server-side rewrites, so deep links must not depend on path routing.
    // Scroll to the top on each navigation and restore the previous position
    // on back/forward, so a page never opens mid-way down.
    provideRouter(routes, withHashLocation(), withInMemoryScrolling({ scrollPositionRestoration: 'enabled' }))
  ]
};