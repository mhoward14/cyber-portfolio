import { bootstrapApplication } from '@angular/platform-browser';
import { App } from './app/app'; // Make sure this says App, not AppComponent
import { appConfig } from './app/app.config';

bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));
