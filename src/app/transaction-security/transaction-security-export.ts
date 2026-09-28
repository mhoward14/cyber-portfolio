import { reportCsv } from '../share/export-file';
import { TRANSACTION_TYPES } from './transaction-security-data';

/** Every stage of all three transaction types, with its current setting. */
export function transactionSecurityCsv(settings: Record<string, boolean>): string {
  const facts: [string, string][] = TRANSACTION_TYPES.map((t) => {
    const secure = t.stages.filter((s) => settings[`${t.id}:${s.id}`]).length;
    return [`${t.shortName} posture`, `${Math.round((secure / t.stages.length) * 100)}/100 (${secure} of ${t.stages.length} stages secure)`];
  });
  const rows = TRANSACTION_TYPES.flatMap((t) =>
    t.stages.map((s) => {
      const secure = !!settings[`${t.id}:${s.id}`];
      return [t.name, s.name, s.settingLabel, secure ? s.secureValue : s.insecureValue, s.secureValue, secure ? 'Secure' : 'Finding', `${t.standardName}: ${s.controlReference}`, s.explanation];
    }),
  );
  return reportCsv(
    'Digital Transaction Security Explorer: configuration',
    facts,
    ['Transaction type', 'Stage', 'Setting', 'Current value', 'Secure value', 'Status', 'Control reference', 'Why it matters'],
    rows,
  );
}
