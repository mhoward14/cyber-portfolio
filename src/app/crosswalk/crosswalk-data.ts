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
 * Each framework reference carries an original plain-English `summary` of
 * what the control requires, written from scratch rather than quoted from
 * any framework's text — NIST SP 800-53 is U.S. government work and is
 * public domain, but CIS Controls and ISO/IEC 27001 are both copyrighted by
 * their publishers, so nothing here reproduces their control language
 * verbatim. `sourceUrl` links to the authoritative publisher for the exact
 * official wording.
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
  summary: string;
  sourceUrl: string;
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

export const FRAMEWORK_SOURCE_NAMES: Record<FrameworkKey, string> = {
  nist: 'NIST SP 800-53 Rev. 5 (public domain, U.S. government work)',
  cis: 'CIS Controls v8 (© Center for Internet Security)',
  iso: 'ISO/IEC 27001:2022 (© ISO/IEC — licensed standard)'
};

const NIST_URL = 'https://csrc.nist.gov/pubs/sp/800/53/r5/upd1/final';
const CIS_URL = 'https://www.cisecurity.org/controls/cis-controls-navigator';
const ISO_URL = 'https://www.iso.org/standard/27001';

export const CROSSWALK_DATA: CrosswalkEntry[] = [
  {
    id: 'account-management',
    family: 'Access Control',
    strength: 'strong',
    note: '',
    frameworks: {
      nist: { id: 'AC-2', title: 'Account Management', sourceUrl: NIST_URL,
        summary: 'Requires defining the types of accounts a system allows, assigning account managers, and running a full lifecycle process for creating, enabling, reviewing, disabling, and removing accounts — including periodic review of who still needs access.' },
      cis: { id: '5.1', title: 'Establish and Maintain an Inventory of Accounts', sourceUrl: CIS_URL,
        summary: 'Requires keeping a current, accurate inventory of every account — user, admin, and service — including owner, department, and whether it is active, reviewed at least quarterly.' },
      iso: { id: 'A.5.16', title: 'Identity Management', sourceUrl: ISO_URL,
        summary: 'Requires a formal process for managing the full lifecycle of user identities, from provisioning through deactivation, so only authorized identities can access systems.' }
    }
  },
  {
    id: 'least-privilege',
    family: 'Access Control',
    strength: 'strong',
    note: '',
    frameworks: {
      nist: { id: 'AC-6', title: 'Least Privilege', sourceUrl: NIST_URL,
        summary: 'Requires granting users and processes only the access necessary to do their assigned job, with explicit, separate authorization required for any elevated or security-relevant functions.' },
      cis: { id: '6.8', title: 'Define and Maintain Role-Based Access Control', sourceUrl: CIS_URL,
        summary: 'Requires defining access permissions around job roles rather than granting them ad hoc, so what an account can do maps back to a documented role.' },
      iso: { id: 'A.8.2', title: 'Privileged Access Rights', sourceUrl: ISO_URL,
        summary: 'Requires tightly restricting and managing privileged (administrative) access rights, since misuse of elevated accounts is a leading cause of security incidents.' }
    }
  },
  {
    id: 'mfa',
    family: 'Identification & Authentication',
    strength: 'strong',
    note: '',
    frameworks: {
      nist: { id: 'IA-2(1)', title: 'Multi-Factor Authentication to Privileged Accounts', sourceUrl: NIST_URL,
        summary: 'Requires multi-factor authentication for every privileged (administrative) account on the system, so a stolen password alone can never grant elevated access.' },
      cis: { id: '6.3 / 6.5', title: 'Require MFA for Externally-Exposed & Administrative Access', sourceUrl: CIS_URL,
        summary: 'Requires MFA wherever it is supported for externally facing applications, and for all administrative access, including local admin accounts on individual machines.' },
      iso: { id: 'A.8.5', title: 'Secure Authentication', sourceUrl: ISO_URL,
        summary: 'Requires authentication procedures — including MFA where the risk warrants it — that are appropriate to how sensitive the information being accessed is.' }
    }
  },
  {
    id: 'authenticator-management',
    family: 'Identification & Authentication',
    strength: 'strong',
    note: '',
    frameworks: {
      nist: { id: 'IA-5', title: 'Authenticator Management', sourceUrl: NIST_URL,
        summary: 'Requires managing the full lifecycle of authenticators — passwords, tokens, certificates — covering issuance, strength requirements, protection in storage/transit, periodic change, and revocation.' },
      cis: { id: '5.2', title: 'Use Unique Passwords', sourceUrl: CIS_URL,
        summary: 'Requires every account to have a unique, sufficiently complex password rather than shared, default, or reused credentials.' },
      iso: { id: 'A.5.17', title: 'Authentication Information', sourceUrl: ISO_URL,
        summary: 'Requires controlling how authentication secrets are allocated, distributed, and protected throughout their lifecycle.' }
    }
  },
  {
    id: 'audit-log-collection',
    family: 'Audit & Accountability',
    strength: 'strong',
    note: '',
    frameworks: {
      nist: { id: 'AU-2', title: 'Event Logging', sourceUrl: NIST_URL,
        summary: 'Requires defining which events a system must log — logons, privileged actions, policy changes — and confirming the system actually captures them.' },
      cis: { id: '8.2', title: 'Collect Audit Logs', sourceUrl: CIS_URL,
        summary: 'Requires collecting audit logs from every in-scope enterprise asset so security-relevant activity can be reconstructed later.' },
      iso: { id: 'A.8.15', title: 'Logging', sourceUrl: ISO_URL,
        summary: 'Requires producing, retaining, and protecting logs of user activity, exceptions, faults, and other security-relevant events.' }
    }
  },
  {
    id: 'audit-log-review',
    family: 'Audit & Accountability',
    strength: 'partial',
    note: "NIST and CIS both frame this as a recurring review activity; ISO's control is broader and includes real-time monitoring, not just periodic review.",
    frameworks: {
      nist: { id: 'AU-6', title: 'Audit Record Review, Analysis, and Reporting', sourceUrl: NIST_URL,
        summary: 'Requires regularly reviewing and analyzing audit records for signs of inappropriate or unusual activity, and reporting findings to the appropriate personnel.' },
      cis: { id: '8.11', title: 'Conduct Audit Log Reviews', sourceUrl: CIS_URL,
        summary: 'Requires a documented, periodic review of audit logs specifically to detect anomalies or irregularities.' },
      iso: { id: 'A.8.16', title: 'Monitoring Activities', sourceUrl: ISO_URL,
        summary: 'Requires actively monitoring networks, systems, and applications for anomalous behavior on an ongoing basis, not just reviewing logs after the fact.' }
    }
  },
  {
    id: 'secure-baseline-config',
    family: 'Configuration Management',
    strength: 'strong',
    note: '',
    frameworks: {
      nist: { id: 'CM-2 / CM-6', title: 'Baseline Configuration / Configuration Settings', sourceUrl: NIST_URL,
        summary: 'Requires establishing and documenting a secure baseline configuration for systems, and setting security configuration options to the most restrictive value consistent with operational needs.' },
      cis: { id: '4.1', title: 'Establish and Maintain a Secure Configuration Process', sourceUrl: CIS_URL,
        summary: 'Requires a documented, standardized process for securely configuring enterprise assets and software.' },
      iso: { id: 'A.8.9', title: 'Configuration Management', sourceUrl: ISO_URL,
        summary: 'Requires defining, documenting, and monitoring standard secure configuration templates for hardware, software, and network devices.' }
    }
  },
  {
    id: 'asset-inventory',
    family: 'Configuration Management',
    strength: 'strong',
    note: '',
    frameworks: {
      nist: { id: 'CM-8', title: 'System Component Inventory', sourceUrl: NIST_URL,
        summary: 'Requires maintaining an accurate, current inventory of system components with enough detail to support accountability for each one.' },
      cis: { id: '1.1 / 2.1', title: 'Establish and Maintain Enterprise/Software Asset Inventory', sourceUrl: CIS_URL,
        summary: 'Requires a detailed, current inventory of all enterprise hardware and licensed software.' },
      iso: { id: 'A.5.9', title: 'Inventory of Information and Other Associated Assets', sourceUrl: ISO_URL,
        summary: 'Requires an inventory of information and other associated assets, each with a clearly identified owner.' }
    }
  },
  {
    id: 'vulnerability-scanning',
    family: 'Risk Assessment',
    strength: 'strong',
    note: '',
    frameworks: {
      nist: { id: 'RA-5', title: 'Vulnerability Monitoring and Scanning', sourceUrl: NIST_URL,
        summary: 'Requires regularly scanning systems for vulnerabilities, analyzing the results, and remediating legitimate findings within an organization-defined timeframe.' },
      cis: { id: '7.1 - 7.7', title: 'Continuous Vulnerability Management', sourceUrl: CIS_URL,
        summary: 'Requires a documented vulnerability management process, including regular automated scanning plus tracking and remediating what is found.' },
      iso: { id: 'A.8.8', title: 'Management of Technical Vulnerabilities', sourceUrl: ISO_URL,
        summary: 'Requires obtaining timely information about technical vulnerabilities, evaluating the organization’s exposure, and taking appropriate action.' }
    }
  },
  {
    id: 'patch-management',
    family: 'System & Information Integrity',
    strength: 'partial',
    note: 'Closely related to vulnerability scanning above, but this topic is specifically about remediating known flaws, not discovering them.',
    frameworks: {
      nist: { id: 'SI-2', title: 'Flaw Remediation', sourceUrl: NIST_URL,
        summary: 'Requires identifying, reporting, and correcting system flaws, and testing and installing updates in a timely, risk-based manner.' },
      cis: { id: '7.3 / 7.4', title: 'Perform Automated Operating System / Application Patch Management', sourceUrl: CIS_URL,
        summary: 'Requires automated patch management for operating systems and applications so known fixes are applied promptly and consistently.' },
      iso: { id: 'A.8.8', title: 'Management of Technical Vulnerabilities', sourceUrl: ISO_URL,
        summary: 'Shares the same ISO control as vulnerability scanning above — ISO treats finding and fixing technical vulnerabilities as one combined obligation rather than two separate controls.' }
    }
  },
  {
    id: 'malware-protection',
    family: 'System & Information Integrity',
    strength: 'strong',
    note: '',
    frameworks: {
      nist: { id: 'SI-3', title: 'Malicious Code Protection', sourceUrl: NIST_URL,
        summary: 'Requires deploying and maintaining malicious-code protection at appropriate points in the system, and keeping it updated as new releases become available.' },
      cis: { id: '10.1', title: 'Deploy and Maintain Anti-Malware Software', sourceUrl: CIS_URL,
        summary: 'Requires deploying and centrally managing anti-malware software across every applicable enterprise asset.' },
      iso: { id: 'A.8.7', title: 'Protection Against Malware', sourceUrl: ISO_URL,
        summary: 'Requires implementing detection, prevention, and recovery controls against malware, paired with user awareness.' }
    }
  },
  {
    id: 'incident-handling',
    family: 'Incident Response',
    strength: 'strong',
    note: '',
    frameworks: {
      nist: { id: 'IR-4', title: 'Incident Handling', sourceUrl: NIST_URL,
        summary: 'Requires an incident-handling capability covering preparation, detection and analysis, containment, eradication, and recovery — with lessons learned fed back into the process afterward.' },
      cis: { id: '17.1 - 17.3', title: 'Designate Personnel & Establish Incident Handling Process', sourceUrl: CIS_URL,
        summary: 'Requires naming the people responsible for incident response and documenting the process they follow, including reporting contacts and triggers.' },
      iso: { id: 'A.5.26', title: 'Response to Information Security Incidents', sourceUrl: ISO_URL,
        summary: 'Requires responding to security incidents according to documented procedures, restoring normal operations, and capturing lessons learned.' }
    }
  },
  {
    id: 'incident-response-planning',
    family: 'Incident Response',
    strength: 'partial',
    note: 'NIST treats the written plan as its own control; CIS folds planning into the same control family as handling; ISO separates planning (A.5.24) from response (A.5.26).',
    frameworks: {
      nist: { id: 'IR-8', title: 'Incident Response Plan', sourceUrl: NIST_URL,
        summary: 'Requires a formal, approved incident response plan defining resources, roles, and strategy — reviewed and updated on a set schedule.' },
      cis: { id: '17.1', title: 'Designate Personnel to Manage Incident Handling', sourceUrl: CIS_URL,
        summary: 'Overlaps with the personnel-designation safeguard above — CIS does not separate "planning" from "handling" into its own distinct safeguard the way NIST and ISO do.' },
      iso: { id: 'A.5.24', title: 'Information Security Incident Management Planning and Preparation', sourceUrl: ISO_URL,
        summary: 'Requires planning and preparing for incident management in advance, including defining roles, responsibilities, and procedures before an incident ever occurs.' }
    }
  },
  {
    id: 'security-awareness-training',
    family: 'Awareness & Training',
    strength: 'strong',
    note: '',
    frameworks: {
      nist: { id: 'AT-2', title: 'Literacy Training and Awareness', sourceUrl: NIST_URL,
        summary: 'Requires giving all users security literacy training at onboarding and periodically afterward, including how to recognize and report threats like phishing.' },
      cis: { id: '14.1 - 14.9', title: 'Security Awareness and Skills Training Program', sourceUrl: CIS_URL,
        summary: 'Requires a structured awareness and skills-training program covering specific topics such as social engineering, authentication, and data handling.' },
      iso: { id: 'A.6.3', title: 'Information Security Awareness, Education and Training', sourceUrl: ISO_URL,
        summary: 'Requires an ongoing awareness and training program tailored to each person’s role, kept current as policies and risks change.' }
    }
  },
  {
    id: 'encryption-at-rest',
    family: 'System & Communications Protection',
    strength: 'strong',
    note: '',
    frameworks: {
      nist: { id: 'SC-28', title: 'Protection of Information at Rest', sourceUrl: NIST_URL,
        summary: 'Requires protecting the confidentiality and/or integrity of information stored on a system, typically through encryption at rest.' },
      cis: { id: '3.11', title: 'Encrypt Sensitive Data at Rest', sourceUrl: CIS_URL,
        summary: 'Requires encrypting sensitive data on end-user devices and servers wherever it is technically feasible to do so.' },
      iso: { id: 'A.8.24', title: 'Use of Cryptography', sourceUrl: ISO_URL,
        summary: 'Requires a defined policy governing when and how cryptography is used to protect information.' }
    }
  },
  {
    id: 'encryption-in-transit',
    family: 'System & Communications Protection',
    strength: 'strong',
    note: 'Shares the same ISO control as encryption at rest — ISO 27001 treats cryptography as one unified control rather than splitting by data state.',
    frameworks: {
      nist: { id: 'SC-8', title: 'Transmission Confidentiality and Integrity', sourceUrl: NIST_URL,
        summary: 'Requires protecting the confidentiality and integrity of information while it is being transmitted, typically via encrypted communication channels.' },
      cis: { id: '3.10', title: 'Encrypt Sensitive Data in Transit', sourceUrl: CIS_URL,
        summary: 'Requires encrypting sensitive data as it moves across networks.' },
      iso: { id: 'A.8.24', title: 'Use of Cryptography', sourceUrl: ISO_URL,
        summary: 'Same underlying cryptography-use policy as encryption at rest above — ISO does not split "data in transit" from "data at rest" into separate controls the way NIST and CIS do.' }
    }
  },
  {
    id: 'boundary-protection',
    family: 'System & Communications Protection',
    strength: 'strong',
    note: '',
    frameworks: {
      nist: { id: 'SC-7', title: 'Boundary Protection', sourceUrl: NIST_URL,
        summary: 'Requires monitoring and controlling communications at external and key internal network boundaries, restricting connections to what is explicitly authorized.' },
      cis: { id: '12.1 / 12.2', title: 'Ensure Network Infrastructure is Up-to-Date / Establish Secure Network Architecture', sourceUrl: CIS_URL,
        summary: 'Requires keeping network infrastructure current and designing a secure network architecture with appropriate segmentation.' },
      iso: { id: 'A.8.20', title: 'Networks Security', sourceUrl: ISO_URL,
        summary: 'Requires managing and controlling networks to protect information flowing through systems and applications from unauthorized access.' }
    }
  },
  {
    id: 'backup-recovery',
    family: 'Contingency Planning',
    strength: 'strong',
    note: '',
    frameworks: {
      nist: { id: 'CP-9', title: 'System Backup', sourceUrl: NIST_URL,
        summary: 'Requires performing and protecting backups of user- and system-level information consistent with the organization’s recovery objectives.' },
      cis: { id: '11.1 - 11.5', title: 'Data Recovery Practices', sourceUrl: CIS_URL,
        summary: 'Requires establishing and testing a data recovery process, including automated backups that are regularly verified to actually work.' },
      iso: { id: 'A.8.13', title: 'Information Backup', sourceUrl: ISO_URL,
        summary: 'Requires maintaining and regularly testing backup copies of information, software, and systems according to an agreed policy.' }
    }
  },
  {
    id: 'supply-chain-risk',
    family: 'Supply Chain Risk Management',
    strength: 'strong',
    note: '',
    frameworks: {
      nist: { id: 'SA-9 / SR-3', title: 'External System Services / Supply Chain Controls and Processes', sourceUrl: NIST_URL,
        summary: 'Requires assessing and managing security risk from external service providers and the broader supply chain, including contractual security requirements.' },
      cis: { id: '15.1', title: 'Establish and Maintain an Inventory of Service Providers', sourceUrl: CIS_URL,
        summary: 'Requires maintaining an inventory of service providers with access to sensitive data, along with their contact and risk information.' },
      iso: { id: 'A.5.19', title: 'Information Security in Supplier Relationships', sourceUrl: ISO_URL,
        summary: 'Requires defining information security requirements for supplier relationships to reduce risk introduced through third-party access.' }
    }
  },
  {
    id: 'secure-sdlc',
    family: 'System & Services Acquisition',
    strength: 'strong',
    note: '',
    frameworks: {
      nist: { id: 'SA-11', title: 'Developer Testing and Evaluation', sourceUrl: NIST_URL,
        summary: 'Requires developers to create and execute a security testing and evaluation plan — static/dynamic analysis and the like — before software is delivered.' },
      cis: { id: '16.1 - 16.11', title: 'Application Software Security Program', sourceUrl: CIS_URL,
        summary: 'Requires a full application-security program spanning secure-coding training, vulnerability tracking, and testing throughout the development lifecycle.' },
      iso: { id: 'A.8.25', title: 'Secure Development Life Cycle', sourceUrl: ISO_URL,
        summary: 'Requires applying secure development rules to software and systems throughout their entire lifecycle, from design through deployment.' }
    }
  }
];
