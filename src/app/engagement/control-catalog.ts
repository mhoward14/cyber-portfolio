import { CROSSWALK_DATA } from '../crosswalk/crosswalk-data';
import { ControlStatus, EngagementControl } from './engagement.model';

/* NIST SP 800-53 Rev. 5 controls the portfolio's control tools can report
   into an engagement. Titles are the official 800-53 control names. CIS
   Controls v8 and ISO/IEC 27001:2022 equivalents come from the Framework
   Crosswalk's own dataset, so the two tools can never disagree; the few
   controls the Crosswalk doesn't cover list their equivalents here, or
   none where there is no clean one-to-one match. */

export const CONTROL_TITLES: Record<string, string> = {
  'AC-3': 'Access Enforcement',
  'AC-6': 'Least Privilege',
  'AU-6': 'Audit Record Review, Analysis, and Reporting',
  'CM-6': 'Configuration Settings',
  'CM-8': 'System Component Inventory',
  'IA-2(1)': 'Multi-Factor Authentication to Privileged Accounts',
  'IA-5': 'Authenticator Management',
  'IR-4': 'Incident Handling',
  'RA-5': 'Vulnerability Monitoring and Scanning',
  'SA-11': 'Developer Testing and Evaluation',
  'SC-7': 'Boundary Protection',
  'SC-12': 'Cryptographic Key Establishment and Management',
  'SC-28': 'Protection of Information at Rest',
  'SI-2': 'Flaw Remediation',
  'SI-7': 'Software, Firmware, and Information Integrity',
};

const EXTRA_EQUIVALENTS: Record<string, { cis?: string; iso?: string }> = {
  'AC-3': { cis: '3.3', iso: 'A.8.3' },
  'SC-12': { iso: 'A.8.24' },
  'SI-7': {},
};

export function frameworkEquivalents(controlId: string): { cis?: string; iso?: string } {
  const entry = CROSSWALK_DATA.find((e) =>
    e.frameworks.nist.id.split('/').map((part) => part.trim()).includes(controlId),
  );
  if (entry) return { cis: entry.frameworks.cis.id, iso: entry.frameworks.iso.id };
  return EXTRA_EQUIVALENTS[controlId] ?? {};
}

export function makeControl(opts: {
  id: string;
  status: ControlStatus;
  sourceTool: string;
  sourceKey: string;
  basis: string;
  attackIds?: string[];
}): EngagementControl {
  const title = CONTROL_TITLES[opts.id];
  if (!title) throw new Error(`Unknown control ${opts.id}: add it to CONTROL_TITLES`);
  return {
    id: opts.id,
    name: title,
    status: opts.status,
    sourceTool: opts.sourceTool,
    sourceKey: opts.sourceKey,
    basis: opts.basis,
    attackIds: opts.attackIds ?? [],
    ...frameworkEquivalents(opts.id),
  };
}
