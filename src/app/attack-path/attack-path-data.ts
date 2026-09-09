/* ============================================================
   ATTACK-PATH-DATA.TS — ATTACK PATH BUILDER
   Grounded in the MITRE ATT&CK® Enterprise Matrix. Every tactic and
   technique ID below (TA00xx / T1xxx) was checked against the live
   attack.mitre.org pages before writing this file, rather than
   quoted from memory. A handful of techniques (Valid Accounts,
   Scheduled Task/Job, Registry Run Keys) are genuinely tagged under
   more than one ATT&CK tactic — where that's the case here, it's
   intentional, not a duplicate.

   The kill chain is curated to 6 of ATT&CK's 14 Enterprise tactics
   (Initial Access, Execution, Persistence, Privilege Escalation,
   Lateral Movement, Impact) with 2-3 techniques each — illustrative
   breadth, not exhaustive coverage, same convention as Crosswalk's
   ~20 topics or IR Simulator's 4 scenarios.

   Each technique carries an original "Stealth" rating (Low/Medium/
   High) and a "defense" mapping that cross-references one of the
   portfolio's OTHER tools by name — this is the piece that ties the
   whole site together thematically (offense -> defense) instead of
   sitting off on its own. These stealth ratings and defense mappings
   are this tool's own original, illustrative content, not transcribed
   from any official ATT&CK mitigation or detection-strategy page —
   say so plainly in the UI disclaimer.
   ============================================================ */

export type TacticId =
  | 'initial-access'
  | 'execution'
  | 'persistence'
  | 'privilege-escalation'
  | 'lateral-movement'
  | 'impact';

export type Stealth = 'low' | 'medium' | 'high';
export type TechniqueIcon =
  | 'mail'
  | 'globe'
  | 'key'
  | 'terminal'
  | 'cursor'
  | 'clock'
  | 'folder'
  | 'syringe'
  | 'arrow-up'
  | 'copy'
  | 'lock'
  | 'undo'
  | 'power';

export interface DefenseMapping {
  tool: string;
  route: string;
  note: string;
}

export interface Technique {
  id: string;
  attackId: string;
  name: string;
  icon: TechniqueIcon;
  stealth: Stealth;
  description: string;
  defense: DefenseMapping;
}

export interface TacticStage {
  id: TacticId;
  attackTacticId: string;
  name: string;
  techniques: Technique[];
}

export const MITRE_ATTACK_URL = 'https://attack.mitre.org/';

export const STEALTH_DETECTION_WEIGHT: Record<Stealth, number> = {
  low: 85,
  medium: 55,
  high: 25,
};

export const STEALTH_LABELS: Record<Stealth, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
};

export const TACTIC_STAGES: TacticStage[] = [
  {
    id: 'initial-access',
    attackTacticId: 'TA0001',
    name: 'Initial Access',
    techniques: [
      {
        id: 'phishing',
        attackId: 'T1566',
        name: 'Phishing',
        icon: 'mail',
        stealth: 'medium',
        description: 'Send a crafted email to get a user to click a link or open an attachment.',
        defense: {
          tool: 'Zero Trust',
          route: '/zero-trust',
          note: 'phishing-resistant MFA and conditional access stop a harvested credential from being reused.',
        },
      },
      {
        id: 'exploit-public-app',
        attackId: 'T1190',
        name: 'Exploit Public-Facing Application',
        icon: 'globe',
        stealth: 'low',
        description: 'Exploit a vulnerability in an internet-facing app or service to gain a foothold.',
        defense: {
          tool: 'Cloud Security',
          route: '/cloud-security',
          note: "restricting public exposure on internet-facing resources shrinks what's reachable to exploit.",
        },
      },
      {
        id: 'valid-accounts-initial',
        attackId: 'T1078',
        name: 'Valid Accounts',
        icon: 'key',
        stealth: 'high',
        description: 'Log in directly with a credential obtained beforehand, blending in as legitimate access.',
        defense: {
          tool: 'Zero Trust',
          route: '/zero-trust',
          note: 'continuous verification flags a "valid" login that doesn\'t match the expected device or context.',
        },
      },
    ],
  },
  {
    id: 'execution',
    attackTacticId: 'TA0002',
    name: 'Execution',
    techniques: [
      {
        id: 'powershell',
        attackId: 'T1059.001',
        name: 'PowerShell',
        icon: 'terminal',
        stealth: 'low',
        description: 'Run attacker commands through PowerShell, a built-in Windows scripting engine.',
        defense: {
          tool: 'IR Simulator',
          route: '/incident-response',
          note: 'script-block and module logging surface this kind of activity fast during Detection & Analysis.',
        },
      },
      {
        id: 'user-execution',
        attackId: 'T1204',
        name: 'User Execution',
        icon: 'cursor',
        stealth: 'medium',
        description: 'Get the user to open a malicious file delivered in the initial-access step.',
        defense: {
          tool: 'Zero Trust',
          route: '/zero-trust',
          note: 'device trust and endpoint posture checks make a freshly-compromised endpoint stand out.',
        },
      },
    ],
  },
  {
    id: 'persistence',
    attackTacticId: 'TA0003',
    name: 'Persistence',
    techniques: [
      {
        id: 'scheduled-task',
        attackId: 'T1053.005',
        name: 'Scheduled Task/Job',
        icon: 'clock',
        stealth: 'medium',
        description: 'Create a scheduled task that re-launches the payload on a timer, surviving a reboot.',
        defense: {
          tool: 'IR Simulator',
          route: '/incident-response',
          note: 'an unexpected scheduled task is a classic persistence indicator caught during Detection & Analysis.',
        },
      },
      {
        id: 'valid-accounts-persistence',
        attackId: 'T1078',
        name: 'Valid Accounts',
        icon: 'key',
        stealth: 'high',
        description: 'Keep using the same compromised credential to log back in over time.',
        defense: {
          tool: 'RMF Tracker',
          route: '/rmf-tracker',
          note: "the Monitor step's continuous access review catches a credential still active long after it should have been rotated.",
        },
      },
      {
        id: 'registry-run-key',
        attackId: 'T1547.001',
        name: 'Registry Run Keys / Startup Folder',
        icon: 'folder',
        stealth: 'low',
        description: 'Add a startup entry that relaunches the payload at logon.',
        defense: {
          tool: 'Zero Trust',
          route: '/zero-trust',
          note: 'restricting local write access to autorun locations closes off this path.',
        },
      },
    ],
  },
  {
    id: 'privilege-escalation',
    attackTacticId: 'TA0004',
    name: 'Privilege Escalation',
    techniques: [
      {
        id: 'process-injection',
        attackId: 'T1055',
        name: 'Process Injection',
        icon: 'syringe',
        stealth: 'high',
        description: 'Inject code into a legitimate, already-trusted process to run with its permissions.',
        defense: {
          tool: 'IR Simulator',
          route: '/incident-response',
          note: 'unexpected memory regions and parent/child process mismatches get flagged during Detection & Analysis.',
        },
      },
      {
        id: 'abuse-elevation-control',
        attackId: 'T1548',
        name: 'Abuse Elevation Control Mechanism',
        icon: 'arrow-up',
        stealth: 'medium',
        description: 'Bypass or trick a built-in permission prompt to run with higher privileges.',
        defense: {
          tool: 'Zero Trust',
          route: '/zero-trust',
          note: "least-privilege enforcement means there's no standing elevated permission left to abuse.",
        },
      },
    ],
  },
  {
    id: 'lateral-movement',
    attackTacticId: 'TA0008',
    name: 'Lateral Movement',
    techniques: [
      {
        id: 'remote-services-ssh',
        attackId: 'T1021.004',
        name: 'Remote Services: SSH',
        icon: 'terminal',
        stealth: 'medium',
        description: 'Use SSH with a captured credential to reach another host on the network.',
        defense: {
          tool: 'Zero Trust',
          route: '/zero-trust',
          note: 'network segmentation and per-connection verification stop a reused credential from reaching other segments.',
        },
      },
      {
        id: 'alternate-auth-material',
        attackId: 'T1550',
        name: 'Use Alternate Authentication Material',
        icon: 'key',
        stealth: 'high',
        description: 'Reuse a stolen session token, ticket, or hash instead of a plaintext password.',
        defense: {
          tool: 'Zero Trust',
          route: '/zero-trust',
          note: 'short-lived, continuously re-verified sessions limit how long a stolen token stays useful.',
        },
      },
      {
        id: 'lateral-tool-transfer',
        attackId: 'T1570',
        name: 'Lateral Tool Transfer',
        icon: 'copy',
        stealth: 'low',
        description: 'Copy attacker tools from one compromised host to another over the network.',
        defense: {
          tool: 'IR Simulator',
          route: '/incident-response',
          note: 'unexpected file transfers between hosts are exactly the signal Detection & Analysis is built to catch.',
        },
      },
    ],
  },
  {
    id: 'impact',
    attackTacticId: 'TA0040',
    name: 'Impact',
    techniques: [
      {
        id: 'data-encrypted',
        attackId: 'T1486',
        name: 'Data Encrypted for Impact',
        icon: 'lock',
        stealth: 'low',
        description: 'Encrypt files across compromised systems and demand payment for the key.',
        defense: {
          tool: 'Cloud Security',
          route: '/cloud-security',
          note: 'immutable, versioned backups mean encrypted data can be restored instead of paid for.',
        },
      },
      {
        id: 'inhibit-recovery',
        attackId: 'T1490',
        name: 'Inhibit System Recovery',
        icon: 'undo',
        stealth: 'medium',
        description: "Delete backups and shadow copies so the encrypted data can't simply be restored.",
        defense: {
          tool: 'Cloud Security',
          route: '/cloud-security',
          note: "access-restricted, immutable backups can't be deleted or disabled by a compromised account.",
        },
      },
      {
        id: 'service-stop',
        attackId: 'T1489',
        name: 'Service Stop',
        icon: 'power',
        stealth: 'low',
        description: 'Stop security and backup services before the final payload runs.',
        defense: {
          tool: 'IR Simulator',
          route: '/incident-response',
          note: 'the Containment, Eradication & Recovery phase is built around exactly this kind of business-impacting failure.',
        },
      },
    ],
  },
];
