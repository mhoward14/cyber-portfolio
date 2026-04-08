import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';

export const appConfig: ApplicationConfig = {
  providers: [
    // This tells Angular: "I'm using Zone.js, please bundle my events together"
    provideZoneChangeDetection({ eventCoalescing: true }), 
    provideClientHydration(withEventReplay())
  ]
};