import { mergeApplicationConfig, ApplicationConfig } from '@angular/core';
import { provideServerRendering } from '@angular/platform-server';
import { appConfig } from './app.config';

const serverConfig: ApplicationConfig = {
  providers: [
    provideServerRendering() // This tells Angular "You are on a server"
  ]
};

export const config = mergeApplicationConfig(appConfig, serverConfig);