import { csvCell, dateStamp, downloadText, fileSlug, reportCsv, toCsv } from './export-file';

/** Minimal RFC 4180 parser for checking our own output. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') {
      row.push(cell);
      cell = '';
    } else if (c === '\r' && text[i + 1] === '\n') {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
      i++;
    } else cell += c;
  }
  row.push(cell);
  rows.push(row);
  return rows;
}

describe('CSV export helpers', () => {
  it('should quote every cell and double embedded quotes', () => {
    expect(csvCell('a "b", c')).toBe('"a ""b"", c"');
    expect(csvCell(42)).toBe('"42"');
    expect(csvCell(null)).toBe('""');
  });

  it('should neutralize values a spreadsheet would run as formulas', () => {
    for (const v of ['=HYPERLINK("x")', '+1', '-2+3', '@SUM(A1)', '\tx', '\rx']) {
      expect(csvCell(v).startsWith(`"'`), JSON.stringify(v)).toBe(true);
    }
    expect(csvCell('T1566')).toBe('"T1566"');
  });

  it('should round-trip through a CSV parser, including commas, quotes, and line breaks', () => {
    const rows = [['a', 'b,c', 'say "hi"'], ['line\nbreak', '', 'ü²—']];
    expect(parseCsv(toCsv(rows))).toEqual(rows);
  });

  it('should lay out a report: title, generated date, facts, blank line, header, rows', () => {
    const parsed = parseCsv(reportCsv('Tool: thing', [['Score', 80]], ['H1', 'H2'], [['x', 'y']]));
    expect(parsed[0]).toEqual(['Tool: thing']);
    expect(parsed[1][0]).toBe('Generated');
    expect(parsed[1][1]).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(parsed[2]).toEqual(['Score', '80']);
    expect(parsed[3]).toEqual(['']);
    expect(parsed[4]).toEqual(['H1', 'H2']);
    expect(parsed[5]).toEqual(['x', 'y']);
  });

  it('should format dates and slugs for file names', () => {
    expect(dateStamp(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(fileSlug('Q3 Red Team: Contoso!')).toBe('q3-red-team-contoso');
  });

  it('should download CSV with a UTF-8 byte order mark for Excel', async () => {
    let blob: Blob | null = null;
    let name = '';
    const create = URL.createObjectURL;
    URL.createObjectURL = (b: Blob) => ((blob = b), 'blob:x');
    const click = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = function () {
      name = this.download;
    };
    try {
      downloadText('report.csv', 'a,b');
    } finally {
      URL.createObjectURL = create;
      HTMLAnchorElement.prototype.click = click;
    }
    expect(name).toBe('report.csv');
    const bytes = new Uint8Array(await blob!.arrayBuffer());
    expect(Array.from(bytes.slice(0, 3))).toEqual([0xef, 0xbb, 0xbf]);
    expect(blob!.type).toBe('text/csv;charset=utf-8');
  });
});
