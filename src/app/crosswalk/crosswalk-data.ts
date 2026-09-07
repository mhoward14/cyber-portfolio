/**
 * Security Framework Crosswalk — dataset
 *
 * Each entry represents one control "topic" and how it's expressed across
 * three major frameworks: NIST SP 800-53 Rev 5, CIS Controls v8, and
 * ISO/IEC 27001:2022 Annex A.
 *
 * strength:
 *   "strong"  — the mapped controls share essentially the same intent/scope
 *   "partial" — related, but one is broader/narrower or emphasizes something
 *               slightly different than the other(s)
 *
 * This is a curated subset (~20 high-traffic topics), not an exhaustive
 * crosswalk. For the full, authoritative mappings, see:
 *   - CIS Controls v8 -> NIST 800-53 / ISO 27001 mapping (Center for Internet Security)
 *   - NIST's Online Informative References (OLIR) catalog
 *   - The Secure Controls Framework (SCF), which cross-maps 100+ frameworks
 */

export type FrameworkKey = 'nist' | 'cis' | 'iso';

export interface FrameworkRef {
  id: string;
  title: string;
}

export interface CrosswalkEntry {
  id: string;
  family: string;
  strength: 'strong' | 'partial';
  note: string;
  frameworks: Record<FrameworkKey, FrameworkRef>;
}

export const FRAMEWORK_LABELS: Record<FrameworkKey, string> = {
  nist: 'NIST SP 800-53r5',
  cis: 'CIS Controls v8',
  iso: 'ISO/IEC 27001:2022'
};

export const CROSSWALK_DATA: CrosswalkEntry[] = [
  {
    id: 'account-management',
    family: 'Access Control',
    strength: 'strong',
    note: '',
    frameworks: {
      nist: { id: 'AC-2', title: 'Account Management' },
      cis: { id: '5.1', title: 'Establish and Maintain an Inventory of Accounts' },
      iso: { id: 'A.5.16', title: 'Identity Management' }
    }
  },
  {
    id: 'least-privilege',
    family: 'Access Control',
    strength: 'strong',
    note: '',
    frameworks: {
      nist: { id: 'AC-6', title: 'Least Privilege' },
      cis: { id: '6.8', title: 'Define and Maintain Role-Based Access Control' },
      iso: { id: 'A.8.2', title: 'Privileged Access Rights' }
    }
  },
  {
    id: 'mfa',
    family: 'Identification & Authentication',
    strength: 'strong',
    note: '',
    frameworks: {
      nist: { id: 'IA-2(1)', title: 'Multi-Factor Authentication to Privileged Accounts' },
      cis: { id: '6.3 / 6.5', title: 'Require MFA for Externally-Exposed & Administrative Access' },
      iso: { id: 'A.8.5', title: 'Secure Authentication' }
    }
  },
  {
    id: 'authenticator-management',
    family: 'Identification & Authentication',
    strength: 'strong',
    note: '',
    frameworks: {
      nist: { id: 'IA-5', title: 'Authenticator Management' },
      cis: { id: '5.2', title: 'Use Unique Passwords' },
      iso: { id: 'A.5.17', title: 'Authentication Information' }
    }
  },
  {
    id: 'audit-log-collection',
    family: 'Audit & Accountability',
    strength: 'strong',
    note: '',
    frameworks: {
      nist: { id: 'AU-2', title: 'Event Logging' },
      cis: { id: '8.2', title: 'Collect Audit Logs' },
      iso: { id: 'A.8.15', title: 'Logging' }
    }
  },
  {
    id: 'audit-log-review',
    family: 'Audit & Accountability',
    strength: 'partial',
    note: "NIST and CIS both frame this as a recurring review activity; ISO's control is broader and includes real-time monitoring, not just periodic review.",
    frameworks: {
      nist: { id: 'AU-6', title: 'Audit Record Review, Analysis, and Reporting' },
      cis: { id: '8.11', title: 'Conduct Audit Log Reviews' },
      iso: { id: 'A.8.16', title: 'Monitoring Activities' }
    }
  },
  {
    id: 'secure-baseline-config',
    family: 'Configuration Management',
    strength: 'strong',
    note: '',
    frameworks: {
      nist: { id: 'CM-2 / CM-6', title: 'Baseline Configuration / Configuration Settings' },
      cis: { id: '4.1', title: 'Establish and Maintain a Secure Configuration Process' },
      iso: { id: 'A.8.9', title: 'Configuration Management' }
    }
  },
  {
    id: 'asset-inventory',
    family: 'Configuration Management',
    strength: 'strong',
    note: '',
    frameworks: {
      nist: { id: 'CM-8', title: 'System Component Inventory' },
      cis: { id: '1.1 / 2.1', title: 'Establish and Maintain Enterprise/Software Asset Inventory' },
      iso: { id: 'A.5.9', title: 'Inventory of Information and Other Associated Assets' }
    }
  },
  {
    id: 'vulnerability-scanning',
    family: 'Risk Assessment',
    strength: 'strong',
    note: '',
    frameworks: {
      nist: { id: 'RA-5', title: 'Vulnerability Monitoring and Scanning' },
      cis: { id: '7.1 - 7.7', title: 'Continuous Vulnerability Management' },
      iso: { id: 'A.8.8', title: 'Management of Technical Vulnerabilities' }
    }
  },
  {
    id: 'patch-management',
    family: 'System & Information Integrity',
    strength: 'partial',
    note: 'Closely related to vulnerability scanning above, but this topic is specifically about remediating known flaws, not discovering them.',
    frameworks: {
      nist: { id: 'SI-2', title: 'Flaw Remediation' },
      cis: { id: '7.3 / 7.4', title: 'Perform Automated Operating System / Application Patch Management' },
      iso: { id: 'A.8.8', title: 'Management of Technical Vulnerabilities' }
    }
  },
  {
    id: 'malware-protection',
    family: 'System & Information Integrity',
    strength: 'strong',
    note: '',
    frameworks: {
      nist: { id: 'SI-3', title: 'Malicious Code Protection' },
      cis: { id: '10.1', title: 'Deploy and Maintain Anti-Malware Software' },
      iso: { id: 'A.8.7', title: 'Protection Against Malware' }
    }
  },
  {
    id: 'incident-handling',
    family: 'Incident Response',
    strength: 'strong',
    note: '',
    frameworks: {
      nist: { id: 'IR-4', title: 'Incident Handling' },
      cis: { id: '17.1 - 17.3', title: 'Designate Personnel & Establish Incident Handling Process' },
      iso: { id: 'A.5.26', title: 'Response to Information Security Incidents' }
    }
  },
  {
    id: 'incident-response-planning',
    family: 'Incident Response',
    strength: 'partial',
    note: 'NIST treats the written plan as its own control; CIS folds planning into the same control family as handling; ISO separates planning (A.5.24) from response (A.5.26).',
    frameworks: {
      nist: { id: 'IR-8', title: 'Incident Response Plan' },
      cis: { id: '17.1', title: 'Designate Personnel to Manage Incident Handling' },
      iso: { id: 'A.5.24', title: 'Information Security Incident Management Planning and Preparation' }
    }
  },
  {
    id: 'security-awareness-training',
    family: 'Awareness & Training',
    strength: 'strong',
    note: '',
    frameworks: {
      nist: { id: 'AT-2', title: 'Literacy Training and Awareness' },
      cis: { id: '14.1 - 14.9', title: 'Security Awareness and Skills Training Program' },
      iso: { id: 'A.6.3', title: 'Information Security Awareness, Education and Training' }
    }
  },
  {
    id: 'encryption-at-rest',
    family: 'System & Communications Protection',
    strength: 'strong',
    note: '',
    frameworks: {
      nist: { id: 'SC-28', title: 'Protection of Information at Rest' },
      cis: { id: '3.11', title: 'Encrypt Sensitive Data at Rest' },
      iso: { id: 'A.8.24', title: 'Use of Cryptography' }
    }
  },
  {
    id: 'encryption-in-transit',
    family: 'System & Communications Protection',
    strength: 'strong',
    note: 'Shares the same ISO control as encryption at rest — ISO 27001 treats cryptography as one unified control rather than splitting by data state.',
    frameworks: {
      nist: { id: 'SC-8', title: 'Transmission Confidentiality and Integrity' },
      cis: { id: '3.10', title: 'Encrypt Sensitive Data in Transit' },
      iso: { id: 'A.8.24', title: 'Use of Cryptography' }
    }
  },
  {
    id: 'boundary-protection',
    family: 'System & Communications Protection',
    strength: 'strong',
    note: '',
    frameworks: {
      nist: { id: 'SC-7', title: 'Boundary Protection' },
      cis: { id: '12.1 / 12.2', title: 'Ensure Network Infrastructure is Up-to-Date / Establish Secure Network Architecture' },
      iso: { id: 'A.8.20', title: 'Networks Security' }
    }
  },
  {
    id: 'backup-recovery',
    family: 'Contingency Planning',
    strength: 'strong',
    note: '',
    frameworks: {
      nist: { id: 'CP-9', title: 'System Backup' },
      cis: { id: '11.1 - 11.5', title: 'Data Recovery Practices' },
      iso: { id: 'A.8.13', title: 'Information Backup' }
    }
  },
  {
    id: 'supply-chain-risk',
    family: 'Supply Chain Risk Management',
    strength: 'strong',
    note: '',
    frameworks: {
      nist: { id: 'SA-9 / SR-3', title: 'External System Services / Supply Chain Controls and Processes' },
      cis: { id: '15.1', title: 'Establish and Maintain an Inventory of Service Providers' },
      iso: { id: 'A.5.19', title: 'Information Security in Supplier Relationships' }
    }
  },
  {
    id: 'secure-sdlc',
    family: 'System & Services Acquisition',
    strength: 'strong',
    note: '',
    frameworks: {
      nist: { id: 'SA-11', title: 'Developer Testing and Evaluation' },
      cis: { id: '16.1 - 16.11', title: 'Application Software Security Program' },
      iso: { id: 'A.8.25', title: 'Secure Development Life Cycle' }
    }
  }
];
