/* ============================================================
   SSP-MARKDOWN.TS — THE DRAFT AS A MARKDOWN FILE
   Markdown opens in any editor and pastes cleanly into Word or an
   authorization package. Table cells are escaped so a pipe or a line
   break in someone's text cannot break the table.
   ============================================================ */

import { IMPACT_LABEL, SspModel } from './ssp-model';
import { THREAT_LABEL } from '../risk-register/risk-matrix';

export function cell(text: string | number | null | undefined): string {
  return String(text ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/\|/g, '\\|')
    .replace(/\r?\n+/g, ' ')
    .trim();
}

function table(header: string[], rows: (string | number | null | undefined)[][]): string {
  return [
    `| ${header.join(' | ')} |`,
    `| ${header.map(() => '---').join(' | ')} |`,
    ...rows.map((r) => `| ${r.map(cell).join(' | ')} |`),
  ].join('\n');
}

export function sspMarkdown(m: SspModel): string {
  const out: string[] = [`# ${m.title.replace(/[\r\n]+/g, ' ')}`, ''];
  out.push(`**DRAFT.** Generated ${m.generated}. Review every statement before use. This is not an authorization document.`, '');
  if (m.isSample) {
    out.push(`> Sample data: ${m.sampleReasons.join('; ')}.`, '');
  }

  out.push('## 1. System identification', '');
  out.push(
    table(['Field', 'Value'], [
      ['System name', m.identification.name],
      ['Abbreviation', m.identification.abbreviation || '[Abbreviation]'],
      ['Operational status', m.identification.status],
      ['System owner', m.identification.owner],
      ['Information system security officer', m.identification.isso],
      ['Authorizing official', m.identification.ao],
    ]),
    '',
    m.identification.description,
    '',
  );

  out.push('## 2. Security categorization (FIPS 199)', '');
  out.push(
    table(['Security objective', 'Impact'], [
      ['Confidentiality', IMPACT_LABEL[m.categorization.confidentiality]],
      ['Integrity', IMPACT_LABEL[m.categorization.integrity]],
      ['Availability', IMPACT_LABEL[m.categorization.availability]],
      ['Overall (highest of the three)', IMPACT_LABEL[m.categorization.overall]],
    ]),
    '',
    `Control baseline used in this draft: **${IMPACT_LABEL[m.baseline]}** (NIST SP 800-53 Rev. 5, curated subset of ${m.counts.total} controls).`,
    '',
  );
  if (m.baselineWarning) out.push(`> Warning: ${m.baselineWarning}`, '');

  out.push('## 3. System environment and boundary', '');
  out.push(`Hosting: ${m.identification.hosting}.`, '', m.identification.boundary, '');

  out.push('## 4. Roles and responsibilities', '');
  if (!m.raci.filled) {
    out.push('[No responsibilities were assigned. Fill in the RACI matrix in the SSP Generator, or complete this section by hand.]', '');
  } else {
    out.push('R = Responsible, A = Accountable, A/R = both, C = Consulted, I = Informed.', '');
    out.push(
      table(['Activity', ...m.raci.roles.map((r) => r.name)], m.raci.rows.map((r) => [r.activity.label, ...r.cells.map((c) => c.shown)])),
      '',
    );
    if (m.raci.summary) out.push(`> Warning: ${m.raci.summary}`, '');
  }

  out.push('## 5. Risk assessment summary', '');
  if (!m.threats.length && !m.risks.length && !m.findings.length) {
    out.push('[No risk assessment data was available. Complete this section by hand, or build an attack chain, prioritize vulnerabilities and add risks in the portfolio tools first.]', '');
  } else {
    if (m.scenario) out.push(`Source: engagement "${m.scenario.replace(/[\r\n]+/g, ' ')}".`, '');
    if (m.threats.length) {
      out.push('### Modeled attack chain', '');
      out.push(
        table(['ATT&CK', 'Technique', 'Tactic', 'Mapped defense'], m.threats.map((t) => [t.attackId, t.name, t.tactic, `${t.defense.tool}: ${t.defense.note}`])),
        '',
      );
    }
    if (m.findings.length) {
      out.push('### Prioritized vulnerabilities', '');
      out.push(
        table(['ID', 'Finding', 'System', 'CVSS v3.1', 'Priority'], m.findings.map((f) => [f.id, f.title, f.asset, `${f.score.toFixed(1)} ${f.severity}`, f.priority])),
        '',
      );
    }
    if (m.risks.length) {
      out.push('### Risk register', '');
      out.push(
        table(['ID', 'Risk', 'Threat source', 'Rating', 'After treatment', 'Treatment', 'Control'], m.risks.map((r) => [
          r.id, r.title, THREAT_LABEL[r.threat].split(':')[0], r.level, r.residual, r.treatment, r.controlId ?? '',
        ])),
        '',
      );
    }
  }

  out.push('## 6. Security control implementation', '');
  out.push(
    `${m.counts.total} controls in the ${IMPACT_LABEL[m.baseline]} baseline: ${m.counts.implemented} implemented, ${m.counts.partial} partial, ${m.counts['not-implemented']} not implemented, ${m.counts.na} not applicable.`,
    '',
  );
  for (const f of m.families) {
    out.push(`### ${f.family}`, '');
    out.push(table(['Control', 'Status', 'Implementation statement', 'Responsible role'], f.rows.map((r) => [`${r.id} ${r.title}`, r.statusLabel, r.statement, r.responsible])), '');
  }

  out.push('## 7. Plan of action and milestones', '');
  if (m.openItems.length === 0) {
    out.push('No open items: every control in the baseline is implemented or not applicable.', '');
  } else {
    out.push(
      table(['ID', 'Control', 'Weakness', 'Milestone', 'Owner', 'Target'], m.openItems.map((o) => [
        o.id, o.controlId, o.weakness, o.milestone, o.owner, o.targetDays === null ? '[Set a target date]' : `${o.targetDays} days`,
      ])),
      '',
    );
  }

  out.push('## 8. Document control', '');
  out.push(table(['Role', 'Name', 'Date'], [['Prepared by', '', ''], ['Reviewed by', '', ''], ['Approved by', '', '']]), '');
  return out.join('\n');
}
