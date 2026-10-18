/* ============================================================
   ROLE-GUIDE.TS — FIND A TOOL BY ROLE
   A reviewer hiring for one kind of role shouldn't have to open nine
   tools to find the relevant one. Each role lists the tools that show
   that work and what the visitor will see in each. A unit test checks
   that every linked route exists.
   ============================================================ */

import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

export interface RoleTool {
  name: string;
  route: string;
  sees: string;
}

export interface Role {
  id: string;
  title: string;
  focus: string;
  tools: RoleTool[];
}

export const ROLES: Role[] = [
  {
    id: 'grc',
    title: 'ISSO, GRC or RMF analyst',
    focus: 'Control assessment, POA&M tracking, framework translation and audit-ready reporting.',
    tools: [
      {
        name: 'RMF Control Tracker',
        route: '/rmf-tracker',
        sees: 'Track roughly 140 controls across all 20 NIST SP 800-53 families and draft POA&M text for the open ones.',
      },
      {
        name: 'Security Framework Crosswalk',
        route: '/crosswalk',
        sees: 'Translate a control topic between NIST SP 800-53, CIS Controls v8 and ISO/IEC 27001.',
      },
      {
        name: 'Engagement Report',
        route: '/report',
        sees: 'Choose “Load a sample engagement” to see controls, evidence, response decisions and POA&M items in one report.',
      },
    ],
  },
  {
    id: 'soc',
    title: 'SOC or security analyst',
    focus: 'Detection, traffic analysis, threat hunting and incident response.',
    tools: [
      {
        name: 'Packet Analysis Lab',
        route: '/packet-lab',
        sees: 'Hunt four threats in synthetic captures with Wireshark-style filters, or open your own capture locally.',
      },
      {
        name: 'Attack Path Builder',
        route: '/attack-path',
        sees: 'Chain MITRE ATT&CK techniques and watch the detection-likelihood assessment change.',
      },
      {
        name: 'Incident Response Playbook Simulator',
        route: '/incident-response',
        sees: 'Make containment and recovery decisions in four scenarios and get graded feedback.',
      },
    ],
  },
  {
    id: 'cloud',
    title: 'Cloud or Zero Trust security',
    focus: 'Secure configuration, identity, shared responsibility and architecture trade-offs.',
    tools: [
      {
        name: 'Cloud Security Configuration Builder',
        route: '/cloud-security',
        sees: 'Configure Azure, AWS and GCP resources and watch a live posture score react to each setting.',
      },
      {
        name: 'Zero Trust Architecture Explorer',
        route: '/zero-trust',
        sees: 'Follow an identity-to-data request flow and assess maturity across the seven DoD Zero Trust pillars.',
      },
    ],
  },
  {
    id: 'devsecops',
    title: 'DevSecOps or application security',
    focus: 'Secure pipelines, supply-chain controls and shift-left practice.',
    tools: [
      {
        name: 'Secure CI/CD Pipeline Builder',
        route: '/devops-pipeline',
        sees: 'Assemble pipeline security gates stage by stage, each mapped to a NIST SP 800-218 practice.',
      },
      {
        name: 'How this site is secured',
        route: '/site-security',
        sees: 'The real controls and pipeline behind this site, each linked to the file that implements it.',
      },
    ],
  },
  {
    id: 'payments',
    title: 'Payments and compliance',
    focus: 'Cardholder-data environments, tokenization and fraud controls.',
    tools: [
      {
        name: 'Digital Transaction Security Explorer',
        route: '/transaction-security',
        sees: 'Walk a payment through its lifecycle and see each stage mapped to PCI DSS or the NACHA rules.',
      },
    ],
  },
];

@Component({
  selector: 'app-role-guide',
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: true,
  imports: [RouterLink],
  templateUrl: './role-guide.html',
  styleUrl: './role-guide.css',
})
export class RoleGuide {
  readonly roles = ROLES;
}
