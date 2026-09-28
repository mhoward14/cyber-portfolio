import { reportCsv } from '../share/export-file';
import { CrosswalkEntry } from './crosswalk-data';

/** The mappings currently shown (after search and family filters). */
export function crosswalkCsv(entries: CrosswalkEntry[], filter: { query: string; family: string }): string {
  return reportCsv(
    'Security Framework Crosswalk: mappings',
    [
      ['Filter', `${filter.family === 'all' ? 'All families' : filter.family}${filter.query.trim() ? `; search "${filter.query.trim()}"` : ''}`],
      ['Note', 'Curated demonstration mapping, not an authoritative or exhaustive crosswalk.'],
    ],
    ['Family', 'Relationship', 'NIST SP 800-53r5', 'NIST title', 'CIS Controls v8', 'CIS title', 'ISO/IEC 27001:2022', 'ISO title', 'Mapping note'],
    entries.map((e) => [
      e.family,
      e.strength === 'strong' ? 'Strong' : 'Partial',
      e.frameworks.nist.id,
      e.frameworks.nist.title,
      e.frameworks.cis.id,
      e.frameworks.cis.title,
      e.frameworks.iso.id,
      e.frameworks.iso.title,
      e.note,
    ]),
  );
}
