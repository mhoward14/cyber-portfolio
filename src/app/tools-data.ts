/* ============================================================
   TOOLS-DATA.TS — THE SECURITY TOOLS
   The one list of interactive tools. The Security Tools page, the
   home page's tools band, the case studies' "related tools" links and
   the sidebar all read from it, so a tool is added or renamed in one
   place. Colors match each tool's sidebar identity color in app.css.
   The three "startHere" tools are the quickest way in for a recruiter.
   ============================================================ */

export type ToolGroupId = 'grc' | 'operations' | 'cloud' | 'devsecops' | 'payments';

export interface Tool {
  name: string;
  route: string;
  color: string;
  /** 1 to 3 for the quick-start tools, in review order; 0 for the rest. */
  startHere: number;
  summary: string;
  standard: string;
  group: ToolGroupId;
}

export interface ToolGroup {
  id: ToolGroupId;
  title: string;
  blurb: string;
  color: string;
  /** Routes in the order they appear. */
  routes: string[];
}

export const TOOLS: Tool[] = [
  { name: 'Attack Path Builder', route: '/attack-path', color: '#0a84ff', startHere: 1, group: 'operations',
    summary: 'Chain MITRE ATT&CK techniques across six attack stages and see where defenses would catch them.',
    standard: 'MITRE ATT&CK' },
  { name: 'Cloud Security Configuration Builder', route: '/cloud-security', color: '#f59e0b', startHere: 2, group: 'cloud',
    summary: 'Configure Azure, AWS, or GCP resources and watch a live posture score react to each setting.',
    standard: 'CIS Benchmarks' },
  { name: 'Incident Response Playbook Simulator', route: '/incident-response', color: '#f43f5e', startHere: 3, group: 'operations',
    summary: 'Work a ransomware, phishing, insider, or DDoS incident with feedback on every decision.',
    standard: 'NIST SP 800-61' },
  { name: 'Zero Trust Architecture Explorer', route: '/zero-trust', color: '#06b6d4', startHere: 0, group: 'cloud',
    summary: 'Trace an identity-to-data request and assess maturity across the seven DoD Zero Trust pillars.',
    standard: 'NIST SP 800-207' },
  { name: 'RMF Control Tracker', route: '/rmf-tracker', color: '#a855f7', startHere: 0, group: 'grc',
    summary: 'Track about 140 controls across all 20 NIST 800-53 families and draft POA&M text for gaps.',
    standard: 'NIST SP 800-53' },
  { name: 'Security Framework Crosswalk', route: '/crosswalk', color: '#6366f1', startHere: 0, group: 'grc',
    summary: 'Map common control topics across NIST 800-53, CIS Controls v8, and ISO/IEC 27001.',
    standard: 'NIST · CIS · ISO' },
  { name: 'Digital Transaction Security Explorer', route: '/transaction-security', color: '#14b8a6', startHere: 0, group: 'payments',
    summary: 'Follow a card or ACH payment from capture to settlement with the controls at each stage.',
    standard: 'PCI DSS · NACHA' },
  { name: 'Secure CI/CD Pipeline Builder', route: '/devops-pipeline', color: '#d946ef', startHere: 0, group: 'devsecops',
    summary: 'Add security gates stage by stage and track a shift-left maturity score as the pipeline hardens.',
    standard: 'NIST SP 800-218' },
  { name: 'Packet Analysis Lab', route: '/packet-lab', color: '#84cc16', startHere: 0, group: 'operations',
    summary: 'Hunt C2 beacons, port scans, DNS tunnels, and cleartext passwords in captures, Wireshark-style.',
    standard: 'MITRE ATT&CK' },
  { name: 'Vulnerability Prioritizer', route: '/vuln-priority', color: '#f97316', startHere: 0, group: 'grc',
    summary: 'Score findings with CVSS v3.1, add exploitation and exposure, and get a ranked fix order.',
    standard: 'CVSS v3.1 · RA-5' },
  { name: 'Risk Register', route: '/risk-register', color: '#ec4899', startHere: 0, group: 'grc',
    summary: 'Rate risks by likelihood and impact, choose a treatment, and see a heat map before and after.',
    standard: 'NIST SP 800-30' },
  { name: 'SSP Generator', route: '/ssp', color: '#10b981', startHere: 0, group: 'grc',
    summary: 'Describe a system and get a draft System Security Plan built from the RMF Tracker and the engagement.',
    standard: 'NIST SP 800-18' },
];

/** The kinds of work the tools show, so a reader hiring for one role finds the right ones. */
export const TOOL_GROUPS: ToolGroup[] = [
  {
    id: 'grc',
    title: 'GRC, RMF and risk',
    blurb: 'Control assessment, risk rating, POA&M tracking and System Security Plans.',
    color: '#a855f7',
    routes: ['/rmf-tracker', '/crosswalk', '/vuln-priority', '/risk-register', '/ssp'],
  },
  {
    id: 'operations',
    title: 'Security operations',
    blurb: 'Attack paths, incident response and traffic analysis.',
    color: '#0a84ff',
    routes: ['/attack-path', '/incident-response', '/packet-lab'],
  },
  {
    id: 'cloud',
    title: 'Cloud and Zero Trust',
    blurb: 'Secure configuration, identity and architecture trade-offs.',
    color: '#06b6d4',
    routes: ['/cloud-security', '/zero-trust'],
  },
  {
    id: 'devsecops',
    title: 'DevSecOps',
    blurb: 'Secure pipelines and shift-left practice.',
    color: '#d946ef',
    routes: ['/devops-pipeline'],
  },
  {
    id: 'payments',
    title: 'Payments',
    blurb: 'Cardholder-data environments, tokenization and fraud controls.',
    color: '#14b8a6',
    routes: ['/transaction-security'],
  },
];

/** The tools in one group, in display order. */
export function toolsInGroup(group: ToolGroup): Tool[] {
  return group.routes.map((route) => TOOLS.find((t) => t.route === route)!);
}

/** The quick-start tools, in review order. */
export const START_HERE: Tool[] = TOOLS.filter((t) => t.startHere > 0).sort((a, b) => a.startHere - b.startHere);
