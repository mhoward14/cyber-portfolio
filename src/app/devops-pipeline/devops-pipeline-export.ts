import { reportCsv } from '../share/export-file';
import { PIPELINE_STAGES } from './devops-pipeline-data';

export function pipelineCsv(settings: Record<string, boolean>): string {
  const gates = PIPELINE_STAGES.flatMap((s) => s.gates);
  const enabled = gates.filter((g) => settings[g.id]).length;
  return reportCsv(
    'Secure CI/CD Pipeline Builder: pipeline gates',
    [
      ['Framework', 'NIST SP 800-218 (Secure Software Development Framework)'],
      ['Shift-left maturity', `${Math.round((enabled / gates.length) * 100)}/100 (${enabled} of ${gates.length} gates enabled)`],
    ],
    ['Stage', 'Gate', 'Setting', 'Current value', 'Status', 'SSDF practice', 'Practice name', 'Why it matters'],
    PIPELINE_STAGES.flatMap((stage) =>
      stage.gates.map((g) => {
        const on = !!settings[g.id];
        return [stage.name, g.name, g.settingLabel, on ? g.secureValue : g.insecureValue, on ? 'Enabled' : 'Gap', g.ssdfPractice, g.ssdfPracticeName, g.explanation];
      }),
    ),
  );
}
