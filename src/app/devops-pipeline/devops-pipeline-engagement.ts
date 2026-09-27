import { makeControl } from '../engagement/control-catalog';
import { EngagementControl } from '../engagement/engagement.model';
import { PIPELINE_STAGES } from './devops-pipeline-data';

/* Pipeline gates roll up to the NIST SP 800-53 control they implement.
   A control counts as implemented only when every gate behind it is
   configured securely. */
const GATE_CONTROLS: Record<string, string> = {
  'branch-protection': 'SA-11',
  sast: 'SA-11',
  dast: 'SA-11',
  sca: 'RA-5',
  'image-scanning': 'RA-5',
  'runtime-monitoring': 'RA-5',
  'incident-playbook': 'SI-2',
  'hardened-build': 'CM-6',
  'iac-scan': 'CM-6',
  'secrets-scanning': 'IA-5',
  'deploy-creds': 'IA-5',
  sbom: 'CM-8',
  'artifact-signing': 'SI-7',
};

const CONTROL_ATTACK_IDS: Record<string, string[]> = {
  'RA-5': ['T1190'],
  'SI-2': ['T1190'],
  'IA-5': ['T1552'],
  'SI-7': ['T1195'],
};

export function devopsEngagementControls(isSecure: (gateId: string) => boolean): EngagementControl[] {
  const groups = new Map<string, { names: string[]; practices: Set<string>; allSecure: boolean }>();
  for (const stage of PIPELINE_STAGES) {
    for (const gate of stage.gates) {
      const id = GATE_CONTROLS[gate.id];
      if (!id) throw new Error(`Pipeline gate "${gate.id}" has no 800-53 mapping`);
      const g = groups.get(id) ?? { names: [], practices: new Set<string>(), allSecure: true };
      g.names.push(gate.name);
      g.practices.add(gate.ssdfPractice);
      g.allSecure = g.allSecure && isSecure(gate.id);
      groups.set(id, g);
    }
  }
  return [...groups.entries()].map(([id, g]) =>
    makeControl({
      id,
      status: g.allSecure ? 'implemented' : 'planned',
      sourceTool: 'CI/CD Pipeline',
      sourceKey: 'devops-pipeline',
      basis: `Gates: ${g.names.join(', ')} (SSDF ${[...g.practices].sort().join(', ')})`,
      attackIds: CONTROL_ATTACK_IDS[id] ?? [],
    }),
  );
}
