import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { provideRouter, withHashLocation } from '@angular/router';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    // This tells Angular: "I'm using Zone.js, please bundle my events together"
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideClientHydration(withEventReplay()),
    // Hash location: the site is a static GitHub Pages build with no
    // server-side rewrites, so deep links must not depend on path routing.
    provideRouter(routes, withHashLocation())
  ]
};