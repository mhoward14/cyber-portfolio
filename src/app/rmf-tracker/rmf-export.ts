import { reportCsv } from '../share/export-file';
import { BaselineControl, ControlStatus, STATUS_LABEL, Tier } from './rmf-data';

export interface RmfExportInput {
  tier: Tier;
  controls: BaselineControl[];
  statusOf: (id: string) => ControlStatus;
  notes: Record<string, string>;
}

/** Every control in the selected baseline with its status and note. */
export function rmfAssessmentCsv(x: RmfExportInput): string {
  const count = (s: ControlStatus) => x.controls.filter((c) => x.statusOf(c.id) === s).length;
  return reportCsv(
    'RMF Control Tracker: control assessment',
    [
      ['Baseline', `${x.tier[0].toUpperCase()}${x.tier.slice(1)} (NIST SP 800-53 Rev. 5 curated subset)`],
      ['Summary', `${count('implemented')} implemented, ${count('partial')} partial, ${count('not-implemented')} not implemented, ${count('na')} not applicable`],
    ],
    ['Control', 'Title', 'Family', 'Lowest baseline', 'Status', 'Note'],
    x.controls.map((c) => [c.id, c.title, c.family, c.baseline, STATUS_LABEL[x.statusOf(c.id)], x.notes[c.id] ?? '']),
  );
}

/** Open items (Partial or Not Implemented) laid out as a POA&M worksheet.
 *  Weakness, status, and source are filled in; point of contact,
 *  resources, dates, and milestones are left blank to complete. */
export function rmfPoamCsv(x: RmfExportInput): string {
  const open = x.controls.filter((c) => ['partial', 'not-implemented'].includes(x.statusOf(c.id)));
  return reportCsv(
    'RMF Control Tracker: Plan of Action & Milestones (draft)',
    [
      ['Baseline', `${x.tier[0].toUpperCase()}${x.tier.slice(1)}`],
      ['Open items', open.length],
    ],
    ['POA&M ID', 'Control', 'Control title', 'Family', 'Weakness description', 'Status', 'Source', 'Point of contact', 'Resources required', 'Scheduled completion date', 'Milestones'],
    open.map((c, i) => [
      `POAM-${String(i + 1).padStart(3, '0')}`,
      c.id,
      c.title,
      c.family,
      x.notes[c.id] || `${c.title} is ${STATUS_LABEL[x.statusOf(c.id)].toLowerCase()}.`,
      STATUS_LABEL[x.statusOf(c.id)],
      'Self-assessment (RMF Control Tracker)',
      '',
      '',
      '',
      '',
    ]),
  );
}
