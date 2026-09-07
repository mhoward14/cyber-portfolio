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
  { path: '**', redirectTo: '' },
];
