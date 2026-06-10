export type TableData = string[][];

/**
 * Converts a 2D string array into a GitHub-flavored Markdown table.
 */
export function tableToMarkdown(table: TableData): string {
  if (table.length === 0) return '';

  const normalized = table.map((row) =>
    row.map((cell) => cell.replace(/\|/g, '\\|').replace(/\n/g, ' ').trim())
  );

  const colCount = Math.max(...normalized.map((r) => r.length));
  const padded = normalized.map((row) => {
    const copy = [...row];
    while (copy.length < colCount) copy.push('');
    return copy;
  });

  const header = padded[0];
  const separator = header.map(() => '---');
  const body = padded.slice(1);

  const formatRow = (row: string[]) => `| ${row.join(' | ')} |`;

  return [formatRow(header), formatRow(separator), ...body.map(formatRow)].join('\n');
}

/**
 * Converts a table into a JSON array of row objects (first row as headers).
 */
export function tableToJson(table: TableData): string {
  if (table.length === 0) return '[]';

  const headers = table[0].map((h, i) => h.trim() || `column_${i + 1}`);
  const rows = table.slice(1).map((row) => {
    const obj: Record<string, string> = {};
    headers.forEach((header, i) => {
      obj[header] = row[i] !== undefined ? row[i].trim() : '';
    });
    return obj;
  });

  return JSON.stringify(rows, null, 2);
}

/**
 * Builds searchable chunk text for a structured table.
 */
export function formatTableChunkContent(
  table: TableData,
  pageNumber: number,
  tableIndex: number
): string {
  const markdown = tableToMarkdown(table);
  const json = tableToJson(table);

  return [
    `[Structured Table — Page ${pageNumber}, Table ${tableIndex + 1}]`,
    '',
    'Markdown:',
    markdown,
    '',
    'JSON:',
    json,
  ].join('\n');
}

/**
 * Extracts HTML tables from mammoth DOCX output.
 */
export function extractTablesFromHtml(html: string): TableData[] {
  const tables: TableData[] = [];
  const tableRegex = /<table[^>]*>([\s\S]*?)<\/table>/gi;
  let tableMatch: RegExpExecArray | null;

  while ((tableMatch = tableRegex.exec(html)) !== null) {
    const tableHtml = tableMatch[1];
    const rows: TableData = [];
    const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    let rowMatch: RegExpExecArray | null;

    while ((rowMatch = rowRegex.exec(tableHtml)) !== null) {
      const cells: string[] = [];
      const cellRegex = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;
      let cellMatch: RegExpExecArray | null;

      while ((cellMatch = cellRegex.exec(rowMatch[1])) !== null) {
        cells.push(stripHtml(cellMatch[1]).trim());
      }

      if (cells.length > 0) rows.push(cells);
    }

    if (rows.length > 0) tables.push(rows);
  }

  return tables;
}

const NUMERIC_TOKEN = /^-?\d+\.?\d*$/;

function splitTableRow(line: string): string[] {
  if (line.includes('\t')) {
    return line.split(/\t+/).map((c) => c.trim()).filter(Boolean);
  }
  if (/\s{2,}/.test(line)) {
    return line.split(/\s{2,}/).map((c) => c.trim()).filter(Boolean);
  }
  const tokens = line.trim().split(/\s+/).filter(Boolean);
  const numericRatio =
    tokens.filter((t) => NUMERIC_TOKEN.test(t)).length / Math.max(tokens.length, 1);
  if (tokens.length >= 3 && numericRatio >= 0.6) {
    return tokens;
  }
  return line.split(/\s{2,}/).map((c) => c.trim()).filter(Boolean);
}

function isNumericRow(tokens: string[]): boolean {
  if (tokens.length < 2) return false;
  const numericCount = tokens.filter((t) => NUMERIC_TOKEN.test(t)).length;
  return numericCount / tokens.length >= 0.6;
}

/**
 * Detects tabular blocks in plain text (space/tab aligned columns).
 */
export function detectTextTables(lines: string[]): TableData[] {
  const tables: TableData[] = [];
  let currentBlock: string[] = [];

  const flushBlock = () => {
    if (currentBlock.length < 2) {
      currentBlock = [];
      return;
    }

    const parsed = currentBlock.map((line) => splitTableRow(line));
    const colCounts = parsed.map((r) => r.length);
    const maxCols = Math.max(...colCounts);
    if (maxCols < 2) {
      currentBlock = [];
      return;
    }

    const consistent = colCounts.filter((c) => c === maxCols).length / colCounts.length >= 0.6;
    const mostlyNumeric = parsed.filter(isNumericRow).length / parsed.length >= 0.5;
    if (consistent && parsed.length >= 2 && (mostlyNumeric || maxCols >= 3)) {
      tables.push(parsed);
    }
    currentBlock = [];
  };

  for (const line of lines) {
    const trimmed = line.trim();
    const tokens = trimmed.split(/\s+/).filter(Boolean);
    const looksTabular =
      trimmed.includes('\t') ||
      (/\s{2,}/.test(trimmed) && trimmed.split(/\s{2,}/).length >= 2) ||
      isNumericRow(tokens);

    if (looksTabular && trimmed.length > 0) {
      currentBlock.push(trimmed);
    } else {
      flushBlock();
    }
  }
  flushBlock();

  return tables;
}

export type ContentSegment =
  | { kind: 'text'; text: string }
  | { kind: 'table'; table: TableData };

/**
 * Parses ML confusion-matrix text flattened by PDF extractors.
 */
export function tryParseConfusionMatrix(text: string): {
  before: string;
  table: TableData;
  after: string;
} | null {
  const predictedMatch = /predicted\s+labels?/i.exec(text);
  const trueMatch = /true\s+labels?/i.exec(text);
  if (!predictedMatch || !trueMatch || trueMatch.index <= predictedMatch.index) {
    return null;
  }

  const before = text.slice(0, predictedMatch.index).trim();
  const midSection = text
    .slice(predictedMatch.index + predictedMatch[0].length, trueMatch.index)
    .trim();
  const colLabels = midSection.split(/\s+/).filter(Boolean);
  if (colLabels.length < 2) return null;

  const n = colLabels.length;
  const afterTrue = text.slice(trueMatch.index + trueMatch[0].length).trim();
  const tokens = afterTrue.split(/\s+/).filter(Boolean);
  const isDataToken = (token: string) => /^-?\d+(?:\.\d+)?$/.test(token);

  const dataRows: string[][] = [];
  let i = 0;
  while (i < tokens.length) {
    let rowLabel = '';
    if (/^[A-Z]$/i.test(tokens[i]) && i + 1 < tokens.length && isDataToken(tokens[i + 1])) {
      rowLabel = tokens[i];
      i++;
    } else if (!isDataToken(tokens[i])) {
      break;
    }

    const nums: string[] = [];
    for (let c = 0; c < n && i < tokens.length; c++) {
      if (isDataToken(tokens[i])) {
        nums.push(tokens[i]);
        i++;
      } else {
        break;
      }
    }

    if (nums.length === n) {
      dataRows.push(rowLabel ? [rowLabel, ...nums] : nums);
    } else {
      break;
    }
  }

  if (dataRows.length < 2) {
    const decimals = afterTrue.match(/-?\d+\.\d+/g) || [];
    if (decimals.length >= n * 2 && decimals.length % n === 0) {
      for (let j = 0; j < decimals.length; j += n) {
        dataRows.push(decimals.slice(j, j + n));
      }
    }
  }

  if (dataRows.length < 2) return null;

  const rowLabelMatch = before.match(/(?:^|\s)((?:[A-Z]\s+){1,}[A-Z])\s*$/i);
  const rowLabels = rowLabelMatch ? rowLabelMatch[1].trim().split(/\s+/) : [];

  const headerRow = ['', ...colLabels];
  const bodyRows = dataRows.map((row, idx) => {
    if (row.length === n + 1) return row;
    if (row.length === n) {
      const label = rowLabels[idx] || String.fromCharCode(65 + idx);
      return [label, ...row];
    }
    return row;
  });

  const after = tokens.slice(i).join(' ').trim();
  return { before, table: [headerRow, ...bodyRows], after };
}

/**
 * Detects a dense inline grid of decimal values (common in PDF text dumps).
 */
export function tryParseInlineNumericGrid(text: string): {
  before: string;
  table: TableData;
  after: string;
} | null {
  const matches = [...text.matchAll(/-?\d+(?:\.\d+)?/g)];
  const decimalMatches = matches.filter((m) => m[0].includes('.'));
  if (decimalMatches.length < 9) return null;

  const values = decimalMatches.map((m) => m[0]);
  const firstIdx = decimalMatches[0].index ?? 0;
  const lastMatch = decimalMatches[decimalMatches.length - 1];
  const lastIdx = (lastMatch.index ?? 0) + lastMatch[0].length;

  const preferredCols = [11, 10, 9, 8, 12, 7, 6, 13, 14, 15, 5, 16];
  for (const cols of preferredCols) {
    if (values.length % cols !== 0 || values.length / cols < 2) continue;
    const rows: string[][] = [];
    for (let i = 0; i < values.length; i += cols) {
      rows.push(values.slice(i, i + cols));
    }
    const header = ['', ...Array.from({ length: cols }, (_, i) => String.fromCharCode(65 + i))];
    return {
      before: text.slice(0, firstIdx).trim(),
      table: [header, ...rows],
      after: text.slice(lastIdx).trim(),
    };
  }

  return null;
}

/**
 * Splits mixed prose + table content for viewer display and ingest.
 */
export function segmentTextWithTables(text: string): ContentSegment[] {
  const trimmed = text.trim();
  if (!trimmed) return [];

  const confusion = tryParseConfusionMatrix(trimmed);
  if (confusion) {
    const segments: ContentSegment[] = [];
    if (confusion.before) segments.push({ kind: 'text', text: confusion.before });
    segments.push({ kind: 'table', table: confusion.table });
    if (confusion.after) segments.push({ kind: 'text', text: confusion.after });
    return segments;
  }

  const lines = trimmed.split(/\r?\n/);
  if (lines.length > 1) {
    const lineTables = detectTextTables(lines.map((l) => l.trim()).filter(Boolean));
    if (lineTables.length > 0) {
      const segments: ContentSegment[] = [];
      let cursor = 0;
      for (const table of lineTables) {
        const needle = table[0].join(' ').slice(0, 40);
        const idx = trimmed.indexOf(needle, cursor);
        if (idx > cursor) {
          segments.push({ kind: 'text', text: trimmed.slice(cursor, idx).trim() });
        }
        segments.push({ kind: 'table', table });
        cursor = idx >= 0 ? idx + needle.length : cursor;
      }
      if (cursor < trimmed.length) {
        segments.push({ kind: 'text', text: trimmed.slice(cursor).trim() });
      }
      if (segments.some((s) => s.kind === 'table')) {
        return segments.filter((s) => s.kind !== 'text' || s.text.length > 0);
      }
    }
  }

  const inline = tryParseInlineNumericGrid(trimmed);
  if (inline) {
    const segments: ContentSegment[] = [];
    if (inline.before) segments.push({ kind: 'text', text: inline.before });
    segments.push({ kind: 'table', table: inline.table });
    if (inline.after) segments.push({ kind: 'text', text: inline.after });
    return segments;
  }

  return [{ kind: 'text', text: trimmed }];
}

/**
 * Returns only the prose portions of text after removing detected tables.
 */
export function stripDetectedTablesFromText(text: string): string {
  return segmentTextWithTables(text)
    .filter((s): s is { kind: 'text'; text: string } => s.kind === 'text')
    .map((s) => s.text)
    .join('\n\n')
    .trim();
}

/**
 * Parses a GitHub-flavored Markdown table string into a 2D array.
 */
export function parseMarkdownTable(markdown: string): TableData | null {
  const lines = markdown
    .trim()
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length < 2) return null;

  const parseRow = (line: string): string[] => {
    const cells = line
      .replace(/^\|/, '')
      .replace(/\|$/, '')
      .split('|')
      .map((c) => c.replace(/\\\|/g, '|').trim());
    return cells;
  };

  const header = parseRow(lines[0]);
  if (header.length < 2) return null;

  const separator = lines[1];
  if (!/^[\|\s:\-]+$/.test(separator)) return null;

  const body = lines.slice(2).map(parseRow).filter((row) => row.length > 0);
  return [header, ...body];
}

/**
 * Extracts table markdown/json from indexed chunk content text.
 */
export function extractTableFromChunkContent(content: string): {
  markdown: string;
  json?: string;
} | null {
  if (!/\[Structured Table/i.test(content)) return null;

  const markdownMatch = content.match(/Markdown:\s*\n([\s\S]*?)(?:\n\nJSON:|\s*$)/i);
  const jsonMatch = content.match(/JSON:\s*\n([\s\S]*)$/i);

  const markdown = markdownMatch?.[1]?.trim();
  if (!markdown) return null;

  return {
    markdown,
    json: jsonMatch?.[1]?.trim(),
  };
}

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}
