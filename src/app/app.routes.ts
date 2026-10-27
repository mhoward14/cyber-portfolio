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
    path: 'vuln-priority',
    title: 'Vulnerability Prioritizer | Matthew Howard',
    loadComponent: () => import('./vuln-priority/vuln-priority').then((m) => m.VulnPriority),
  },
  {
    path: 'risk-register',
    title: 'Risk Register | Matthew Howard',
    loadComponent: () => import('./risk-register/risk-register').then((m) => m.RiskRegister),
  },
  {
    path: 'ssp',
    title: 'SSP Generator | Matthew Howard',
    loadComponent: () => import('./ssp/ssp').then((m) => m.Ssp),
  },
  {
    path: 'report',
    title: 'Engagement Report | Matthew Howard',
    loadComponent: () => import('./engagement/engagement-report').then((m) => m.EngagementReport),
  },
  {
    path: 'security-tools',
    title: 'Security Tools | Matthew Howard',
    loadComponent: () => import('./security-tools/security-tools').then((m) => m.SecurityTools),
  },
  // The role guide became the grouped Security Tools page; keep old links working.
  { path: 'role-guide', redirectTo: 'security-tools' },
  {
    path: 'site-security',
    title: 'How This Site Is Secured | Matthew Howard',
    loadComponent: () => import('./site-security/site-security').then((m) => m.SiteSecurity),
  },
  {
    path: 'notes',
    title: 'Engineering Notes | Matthew Howard',
    loadComponent: () => import('./notes/notes').then((m) => m.Notes),
  },
  { path: '**', redirectTo: '' },
];
