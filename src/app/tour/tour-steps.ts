/* ============================================================
   TOUR-STEPS.TS — GUIDED TOUR
   About 90 seconds through the three "Start here" tools, ending at the
   Engagement Report. Each step names a route and the element to
   spotlight (the first selector found wins); a step with no target
   shows its card centered.
   ============================================================ */

export interface TourStep {
  route: string;
  /** Selectors to try in order; every element matching the first one that
   *  matches anything is spotlighted together. */
  targets: string[];
  title: string;
  body: string;
  /** Accent for the spotlight and card, matching the tool's color. */
  accent: string;
}

export const TOUR_STEPS: TourStep[] = [
  {
    route: '/',
    targets: [],
    title: 'A 90-second tour',
    body: 'Four stops: the tools, an attack chain, a cloud configuration, and an incident response, ending at the report that ties them together. Use the buttons or arrow keys; Esc ends the tour at any time.',
    accent: '#3b82f6',
  },
  {
    route: '/',
    targets: ['.tool-card.is-start'],
    title: 'Nine hands-on tools',
    body: 'Each one runs entirely in your browser. The three marked "Start here" are the quickest way in, and this tour visits them in order.',
    accent: '#3b82f6',
  },
  {
    route: '/attack-path',
    targets: ['.ap-options', '.ap-stepper'],
    title: '1 · Attack Path Builder',
    body: 'Pick one MITRE ATT&CK technique per stage, from initial access to impact. Each choice changes how detectable the chain is.',
    accent: '#0a84ff',
  },
  {
    route: '/attack-path',
    targets: ['.ap-side-panel'],
    title: 'Where each move gets caught',
    body: 'As the chain grows, this panel scores detection likelihood and maps every technique to the defense, in another tool, that would catch it.',
    accent: '#0a84ff',
  },
  {
    route: '/cloud-security',
    targets: ['.cs-resource-card:first-child'],
    title: '2 · Cloud Security Configuration Builder',
    body: "Flip a setting on an Azure, AWS, or Google Cloud resource. Every setting maps to that provider's CIS Foundations Benchmark.",
    accent: '#f59e0b',
  },
  {
    route: '/cloud-security',
    targets: ['.cs-score-panel'],
    title: 'The posture score reacts',
    body: 'The score and findings update as you change settings. The same settings become NIST SP 800-53 controls you can add to an engagement, download as CSV, or share as a link.',
    accent: '#f59e0b',
  },
  {
    route: '/incident-response',
    targets: ['.ir-scenario-grid'],
    title: '3 · Incident Response Playbook Simulator',
    body: 'Work a ransomware, phishing, insider-threat, or DDoS incident. Every decision is graded against NIST SP 800-61, with a debrief at the end.',
    accent: '#f43f5e',
  },
  {
    route: '/report',
    targets: ['.er-empty', '.er-report-head'],
    title: 'Engagement Mode ties it together',
    body: "Results from each tool flow into one report: the attack chain, evidence, response decisions, controls, and a POA&M. Load the sample engagement to see a complete one.",
    accent: '#3b82f6',
  },
  {
    route: '/report',
    targets: [],
    title: "That's the tour",
    body: 'Still to explore in the sidebar: the Packet Analysis Lab, Zero Trust Explorer, RMF Control Tracker, Framework Crosswalk, and more.',
    accent: '#3b82f6',
  },
];
