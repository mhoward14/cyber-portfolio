import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./home/home').then((m) => m.Home),
  },
  {
    path: 'crosswalk',
    loadComponent: () => import('./crosswalk/crosswalk').then((m) => m.Crosswalk),
  },
  {
    path: 'rmf-tracker',
    loadComponent: () => import('./rmf-tracker/rmf-tracker').then((m) => m.RmfTracker),
  },
  {
    path: 'zero-trust',
    loadComponent: () => import('./zero-trust/zero-trust').then((m) => m.ZeroTrust),
  },
  {
    path: 'incident-response',
    loadComponent: () => import('./incident-response/incident-response').then((m) => m.IncidentResponse),
  },
  {
    path: 'cloud-security',
    loadComponent: () => import('./cloud-security/cloud-security').then((m) => m.CloudSecurity),
  },
  { path: '**', redirectTo: '' },
];
