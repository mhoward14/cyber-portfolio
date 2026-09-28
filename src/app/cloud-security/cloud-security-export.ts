import { reportCsv } from '../share/export-file';
import { CATEGORY_LABELS, PROVIDERS } from './cloud-security-data';

/** Every resource across all three providers, with its current setting. */
export function cloudSecurityCsv(settings: Record<string, boolean>): string {
  const facts: [string, string][] = PROVIDERS.map((p) => {
    const secure = p.resources.filter((r) => settings[`${p.id}:${r.id}`]).length;
    return [`${p.shortName} posture`, `${Math.round((secure / p.resources.length) * 100)}/100 (${secure} of ${p.resources.length} resources secure)`];
  });
  const rows = PROVIDERS.flatMap((p) =>
    p.resources.map((r) => {
      const secure = !!settings[`${p.id}:${r.id}`];
      return [p.shortName, r.name, CATEGORY_LABELS[r.category], r.settingLabel, secure ? r.secureValue : r.insecureValue, r.secureValue, secure ? 'Secure' : 'Finding', p.benchmarkName, r.explanation];
    }),
  );
  return reportCsv(
    'Cloud Security Configuration Builder: configuration',
    facts,
    ['Provider', 'Resource', 'Category', 'Setting', 'Current value', 'Secure value', 'Status', 'Benchmark', 'Why it matters'],
    rows,
  );
}
