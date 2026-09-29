import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    title: 'Matthew Howard | Cybersecurity Portfolio',
    loadComponent: () => import('./home/home').then((m) => m.Home),
  },
  {
    path: 'crosswalk',
    title: 'Security Framework Crosswalk | Matthew Howard',
    loadComponent: () => import('./crosswalk/crosswalk').then((m) => m.Crosswalk),
  },
  {
    path: 'rmf-tracker',
    title: 'NIST 800-53 / RMF Control Tracker | Matthew Howard',
    loadComponent: () => import('./rmf-tracker/rmf-tracker').then((m) => m.RmfTracker),
  },
  {
    path: 'zero-trust',
    title: 'Zero Trust Cloud Architecture Explorer | Matthew Howard',
    loadComponent: () => import('./zero-trust/zero-trust').then((m) => m.ZeroTrust),
  },
  {
    path: 'incident-response',
    title: 'Incident Response Playbook Simulator | Matthew Howard',
    loadComponent: () => import('./incident-response/incident-response').then((m) => m.IncidentResponse),
  },
  {
    path: 'cloud-security',
    title: 'Cloud Security Configuration Builder | Matthew Howard',
    loadComponent: () => import('./cloud-security/cloud-security').then((m) => m.CloudSecurity),
  },
  {
    path: 'attack-path',
    title: 'Attack Path Builder | Matthew Howard',
    loadComponent: () => import('./attack-path/attack-path').then((m) => m.AttackPath),
  },
  {
    path: 'transaction-security',
    title: 'Digital Transaction Security Explorer | Matthew Howard',
    loadComponent: () => import('./transaction-security/transaction-security').then((m) => m.TransactionSecurity),
  },
  {
    path: 'devops-pipeline',
    title: 'Secure CI/CD Pipeline Builder | Matthew Howard',
    loadComponent: () => import('./devops-pipeline/devops-pipeline').then((m) => m.DevopsPipeline),
  },
  {
    path: 'packet-lab',
    title: 'Packet Analysis Lab | Matthew Howard',
    loadComponent: () => import('./packet-lab/packet-lab').then((m) => m.PacketLab),
  },
  {
    path: 'report',
    title: 'Engagement Report | Matthew Howard',
    loadComponent: () => import('./engagement/engagement-report').then((m) => m.EngagementReport),
  },
  { path: '**', redirectTo: '' },
];
