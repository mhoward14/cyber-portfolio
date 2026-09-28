/* ============================================================
   EXPORT-FILE.TS — DOWNLOADABLE RESULTS
   One CSV writer and one download helper for every tool, so each
   export quotes the same way, opens cleanly in Excel (UTF-8 byte order
   mark, CRLF line endings), and neutralizes spreadsheet formula
   injection: a cell starting with = + - @ tab or CR is prefixed with an
   apostrophe so it is shown as text instead of being evaluated.
   ============================================================ */

import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';

export type CsvRow = (string | number | null | undefined)[];

export function csvCell(value: string | number | null | undefined): string {
  const text = value === null || value === undefined ? '' : String(value);
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
}

export function toCsv(rows: CsvRow[]): string {
  return rows.map((row) => row.map(csvCell).join(',')).join('\r\n');
}

/** A report-style CSV: a few "Label, value" lines about the export, a blank
 *  line, then the table. Spreadsheet tools open it as one sheet. */
export function reportCsv(title: string, facts: [string, string | number][], header: string[], rows: CsvRow[]): string {
  return toCsv([[title], ['Generated', dateStamp()], ...facts, [], header, ...rows]);
}

export function dateStamp(d = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function fileSlug(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
}

/** Save text as a file. CSV gets a byte order mark so Excel reads UTF-8
 *  (em dashes, ² and the like) correctly. */
export function downloadText(filename: string, text: string, mime = 'text/csv') {
  if (typeof document === 'undefined') return;
  const body = mime === 'text/csv' ? `﻿${text}` : text;
  const blob = new Blob([body], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoke after the click has been handled (Safari needs the URL briefly).
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Download button styled to sit beside the share button. */
@Component({
  selector: 'app-export-button',
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: true,
  template: `
    <button type="button" class="ex-btn" [style.--ex-accent]="accent()" [disabled]="disabled()" (click)="pressed.emit()">
      <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
        <polyline points="7 10 12 15 17 10"></polyline>
        <line x1="12" y1="15" x2="12" y2="3"></line>
      </svg>
      {{ label() }}
    </button>
  `,
  styles: `
    :host { display: inline-flex; }
    .ex-btn {
      --ex-accent: var(--color-accent);
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.55rem 1rem;
      border: 1px solid var(--ex-accent);
      border-radius: var(--radius-md);
      background: transparent;
      color: var(--color-text);
      font: inherit;
      font-size: 0.82rem;
      font-weight: 700;
      cursor: pointer;
      transition: background-color 0.2s;
    }
    .ex-btn:hover:not(:disabled) { background: color-mix(in srgb, var(--ex-accent) 14%, transparent); }
    .ex-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .ex-btn:focus-visible { outline: 2px solid var(--ex-accent); outline-offset: 2px; }
  `,
})
export class ExportButton {
  readonly label = input('Download CSV');
  readonly accent = input('var(--color-accent)');
  readonly disabled = input(false);
  readonly pressed = output<void>();
}
