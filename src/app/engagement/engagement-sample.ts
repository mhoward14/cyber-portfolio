import { STEALTH_DETECTION_WEIGHT, TACTIC_STAGES } from '../attack-path/attack-path-data';
import { Engagement, EngagementTechnique } from './engagement.model';

/* Fictional sample engagement ("Contoso Financial") used to show a fully
   populated report before a visitor has built their own. The attack chain
   is drawn from the Attack Path Builder's own data so IDs, names, and
   defense mappings always match the tool. Hosts are fictional and
   203.0.113.0/24 is a reserved documentation range (RFC 5737). The NIST
   800-53, CIS Controls v8, and ISO/IEC 27001:2022 identifiers are real. */

const SAMPLE_CHAIN = [
  'phishing',
  'powershell',
  'scheduled-task',
  'process-injection',
  'lateral-tool-transfer',
  'data-encrypted',
];

export function sampleTechniques(): EngagementTechnique[] {
  return SAMPLE_CHAIN.map((id) => {
    const stage = TACTIC_STAGES.find((s) => s.techniques.some((t) => t.id === id));
    const technique = stage?.techniques.find((t) => t.id === id);
    if (!stage || !technique) throw new Error(`Sample technique "${id}" is missing from the Attack Path data`);
    return {
      attackId: technique.attackId,
      name: technique.name,
      tactic: stage.name,
      stealth: technique.stealth,
      defense: { ...technique.defense },
    };
  });
}

export function buildSampleEngagement(now = new Date()): Engagement {
  const techniques = sampleTechniques();
  const score = Math.round(
    techniques.reduce((sum, t) => sum + STEALTH_DETECTION_WEIGHT[t.stealth], 0) / techniques.length,
  );
  return {
    version: 1,
    scenario: 'Contoso Financial: phishing to ransomware',
    startedAt: now.toISOString(),
    isSample: true,
    techniques,
    detectionScore: score,
    evidence: [
      { kind: 'Host', value: 'WS-FIN-017 (10.20.4.17)', detail: 'Finance workstation that opened the phishing attachment.', attackId: 'T1566' },
      { kind: 'C2 server', value: '203.0.113.47', detail: 'HTTPS beacon every 60 seconds after initial execution.', attackId: 'T1059.001' },
      { kind: 'Tool transfer', value: 'SMB to FS-02', detail: 'Payload copied to the file server over SMB shortly before encryption.', attackId: 'T1570' },
      { kind: 'Impact', value: 'FS-02 file shares', detail: '412 file writes in 30 seconds with new extensions.', attackId: 'T1486' },
    ],
    decisions: [
      { phase: 'Containment', action: 'Isolate WS-FIN-017 with EDR network containment', grade: 'optimal', rationale: 'Stops spread while keeping memory intact for forensics.' },
      { phase: 'Containment', action: 'Block 203.0.113.47 at the egress firewall', grade: 'optimal', rationale: 'Cuts the command channel for every host, not just the one found.' },
      { phase: 'Eradication', action: 'Reimage the host before capturing memory', grade: 'poor', rationale: 'Destroys volatile evidence needed to scope the incident. Recorded as a lesson learned.' },
    ],
    controls: [
      { id: 'IA-2(1)', name: 'Multi-factor authentication', status: 'implemented', sourceTool: 'Zero Trust', cis: '6.5', iso: 'A.8.5', attackIds: ['T1566'] },
      { id: 'CM-7', name: 'Least functionality (script restriction)', status: 'planned', sourceTool: 'Zero Trust', cis: '2.7', iso: 'A.8.19', attackIds: ['T1059.001', 'T1053.005'] },
      { id: 'SI-4', name: 'System monitoring (EDR to SIEM)', status: 'implemented', sourceTool: 'Zero Trust', cis: '13.1', iso: 'A.8.16', attackIds: ['T1055', 'T1570'] },
      { id: 'SC-7', name: 'Boundary protection (default-deny egress)', status: 'implemented', sourceTool: 'Cloud Security', cis: '13.4', iso: 'A.8.20', attackIds: ['T1059.001'] },
      { id: 'CP-9', name: 'System backup (immutable copies)', status: 'planned', sourceTool: 'Cloud Security', cis: '11.2', iso: 'A.8.13', attackIds: ['T1486'] },
      { id: 'AT-2', name: 'Security awareness training', status: 'implemented', sourceTool: 'RMF Tracker', cis: '14.1', iso: 'A.6.3', attackIds: ['T1566'] },
    ],
    poams: [
      { id: 'POA&M-01', controlId: 'CM-7', weakness: 'Unsigned PowerShell ran on a finance workstation (T1059.001).', milestone: 'Enforce Constrained Language Mode and signed-script policy on the finance OU.', targetDays: 30 },
      { id: 'POA&M-02', controlId: 'CP-9', weakness: 'Network-reachable backups were exposed to encryption (T1486).', milestone: 'Move to immutable, offline backup copies and test a full restore.', targetDays: 60 },
    ],
  };
}
