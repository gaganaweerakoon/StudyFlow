import { cleanDocumentFontName } from './unicodeFonts';

export interface PdfTextRun {
  str?: string;
  dir?: string;
  transform?: number[];
  width?: number;
  height?: number;
  fontName?: string;
  hasEOL?: boolean;
}

export interface PdfTextStyle {
  fontFamily?: string;
  ascent?: number;
  descent?: number;
  vertical?: boolean;
}

export interface PdfFigure {
  id: string;
  image: string;
  top: number;
  left?: number;
  width?: number;
  height?: number;
  pageWidth?: number;
  pageHeight?: number;
  pageNumber?: number;
  positionHint?: 'header' | 'body' | 'footer';
}

interface PositionedRun {
  text: string;
  leadingSpace: boolean;
  trailingSpace: boolean;
  x: number;
  y: number;
  width: number;
  size: number;
  bold: boolean;
  italic: boolean;
  mono: boolean;
  rtl: boolean;
  fontLabel?: string;
}

interface StyledSpan {
  text: string;
  bold: boolean;
  italic: boolean;
  mono: boolean;
}

interface RowCell {
  x: number;
  end: number;
  spans: StyledSpan[];
  plainText: string;
}

interface VisualRow {
  y: number;
  x: number;
  end: number;
  size: number;
  boldRatio: number;
  monoRatio: number;
  cells: RowCell[];
  plainText: string;
  formattedText: string;
}

export interface PageMarkdownResult {
  markdown: string;
  detectedFont?: string;
}

const COMBINING_OR_JOINER_START = /^[\p{M}\u200C\u200D]/u;
const JOINER_END = /[\u200C\u200D]$/;
const NO_SPACE_BEFORE = /^[.,;:!?)\]}%»”’]/;
const NO_SPACE_AFTER = /[(\[{«“‘/]$/;
const CJK_OR_THAI = /[\u3040-\u30FF\u4E00-\u9FFF\u0E00-\u0E7F]/;

const BULLET_PREFIX = /^(?:[•◦▪▫‣●○■□➢➤➔–—*-])\s+(.*)$/;
const ORDERED_PREFIX = /^(\d{1,3})[.)]\s+(.*)$/;

function escapeTableCell(text: string): string {
  return text.replace(/\|/g, '\\|').replace(/\r?\n/g, ' ').trim();
}

function escapeInline(text: string): string {
  // Only escape characters that would accidentally create unintended Markdown syntax,
  // preserving Unicode scripts, math symbols, and clean readability.
  return text.replace(/([\\`])/g, '\\$1');
}

function formatSpans(spans: StyledSpan[], allowEmphasis: boolean): string {
  const merged: StyledSpan[] = [];
  for (const span of spans) {
    if (!span.text) continue;
    const prev = merged.at(-1);
    if (prev && prev.bold === span.bold && prev.italic === span.italic && prev.mono === span.mono) {
      prev.text += span.text;
    } else {
      merged.push({ ...span });
    }
  }

  return merged
    .map((span) => {
      const raw = span.text;
      if (!raw.trim()) return raw;
      const lead = raw.match(/^\s*/)?.[0] ?? '';
      const trail = raw.match(/\s*$/)?.[0] ?? '';
      const core = raw.slice(lead.length, raw.length - trail.length);
      if (!core) return raw;

      if (span.mono && allowEmphasis) {
        return `${lead}\`${core.replace(/`/g, '\\`')}\`${trail}`;
      }
      const safe = escapeInline(core);
      if (!allowEmphasis) return `${lead}${safe}${trail}`;
      if (span.bold && span.italic) return `${lead}***${safe}***${trail}`;
      if (span.bold) return `${lead}**${safe}**${trail}`;
      if (span.italic) return `${lead}*${safe}*${trail}`;
      return `${lead}${safe}${trail}`;
    })
    .join('')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function needsSpaceBetween(
  prevText: string,
  nextText: string,
  prevTrailingSpace: boolean,
  nextLeadingSpace: boolean,
  gap: number,
  fontSize: number,
): boolean {
  if (!prevText || !nextText) return false;
  if (COMBINING_OR_JOINER_START.test(nextText) || JOINER_END.test(prevText)) return false;
  if (prevTrailingSpace || nextLeadingSpace) return true;
  if (NO_SPACE_BEFORE.test(nextText) || NO_SPACE_AFTER.test(prevText)) return false;
  if (gap >= Math.max(1.2, fontSize * 0.16)) return true;
  return false;
}

function joinWrappedLine(prev: string, next: string): string {
  const a = prev.trimEnd();
  const b = next.trimStart();
  if (!a) return b;
  if (!b) return a;
  // Rejoin hyphenated Latin word breaks across lines (e.g., "algo-" + "rithm")
  if (/[A-Za-z]-$/.test(a) && /^[a-z]/.test(b)) {
    return a.slice(0, -1) + b;
  }
  // CJK & Thai don't use spaces between wrapped lines
  if (CJK_OR_THAI.test(a.slice(-1)) && CJK_OR_THAI.test(b[0])) {
    return a + b;
  }
  if (COMBINING_OR_JOINER_START.test(b) || JOINER_END.test(a)) {
    return a + b;
  }
  return `${a} ${b}`;
}

export function extractPageMarkdown(
  items: PdfTextRun[],
  viewport: { convertToViewportPoint(x: number, y: number): number[] },
  figures: PdfFigure[],
  styles?: Record<string, PdfTextStyle>,
  resolvedFontNames?: Map<string, string>,
): PageMarkdownResult {
  const runs: PositionedRun[] = [];
  const fontWeights = new Map<string, number>();

  for (const item of items) {
    if (!item.str || !item.transform) continue;
    const normalized = item.str.normalize('NFC');
    const trimmed = normalized.replace(/^[ \t]+|[ \t]+$/g, '');
    if (!trimmed) continue;

    const [x, y] = viewport.convertToViewportPoint(item.transform[4], item.transform[5]);
    const scaleY = Math.hypot(item.transform[2] ?? 0, item.transform[3] ?? 0);
    const scaleX = Math.hypot(item.transform[0] ?? 0, item.transform[1] ?? 0);
    const size = item.height && item.height > 0 ? item.height : Math.max(scaleY, scaleX) || 10;

    const style = item.fontName ? styles?.[item.fontName] : undefined;
    const rawFont = (item.fontName ? resolvedFontNames?.get(item.fontName) : undefined) || item.fontName || style?.fontFamily || '';
    const descriptor = `${rawFont} ${style?.fontFamily ?? ''}`;

    const bold = /(?:bold|black|heavy|semibold|demibold|extrabold|[-,]b\b)/i.test(descriptor);
    const italic = /(?:italic|oblique|[-,]i\b)/i.test(descriptor);
    const mono =
      style?.fontFamily === 'monospace' ||
      /(?:mono|courier|consolas|menlo|fira\s?code|jetbrains|inconsolata|source\s?code)/i.test(descriptor);

    const fontLabel = cleanDocumentFontName(rawFont) ?? cleanDocumentFontName(style?.fontFamily);
    if (fontLabel) {
      fontWeights.set(fontLabel, (fontWeights.get(fontLabel) ?? 0) + trimmed.length);
    }

    runs.push({
      text: trimmed,
      leadingSpace: /^[ \t]/.test(normalized),
      trailingSpace: /[ \t]$/.test(normalized),
      x,
      y,
      width: item.width ?? 0,
      size,
      bold,
      italic,
      mono,
      rtl: item.dir === 'rtl',
      fontLabel,
    });
  }

  let detectedFont: string | undefined;
  let maxWeight = 0;
  for (const [font, weight] of fontWeights.entries()) {
    if (weight > maxWeight) {
      maxWeight = weight;
      detectedFont = font;
    }
  }

  if (runs.length === 0) {
    const figureOnly = figures
      .slice()
      .sort((a, b) => a.top - b.top)
      .map((fig, i) => `![Figure ${i + 1}](${fig.id})`)
      .join('\n\n');
    return { markdown: figureOnly, detectedFont };
  }

  // Compute character-weighted median body font size
  const weightedSizes: number[] = [];
  for (const run of runs) {
    const rounded = Math.round(run.size * 2) / 2;
    const count = Math.min(20, Math.max(1, Math.ceil(run.text.length / 4)));
    for (let i = 0; i < count; i++) weightedSizes.push(rounded);
  }
  weightedSizes.sort((a, b) => a - b);
  const bodySize = weightedSizes[Math.floor(weightedSizes.length / 2)] || 10;

  runs.sort((a, b) => a.y - b.y || a.x - b.x);

  // Group into visual lines
  const lines: { y: number; size: number; runs: PositionedRun[] }[] = [];
  for (const run of runs) {
    const line = lines.at(-1);
    const tolerance = Math.max(2.5, Math.min(run.size, line?.size ?? run.size) * 0.45);
    if (line && Math.abs(run.y - line.y) <= tolerance) {
      line.runs.push(run);
      line.size = Math.max(line.size, run.size);
    } else {
      lines.push({ y: run.y, size: run.size, runs: [run] });
    }
  }

  // Build cells & styled runs per visual line
  const rows: VisualRow[] = lines.map((line) => {
    const rtlCount = line.runs.filter((r) => r.rtl).length;
    const isRtlLine = rtlCount > line.runs.length / 2;
    const ordered = line.runs.slice().sort((a, b) => (isRtlLine ? b.x - a.x : a.x - b.x));

    const cells: RowCell[] = [];
    let prevRun: PositionedRun | undefined;
    for (const run of ordered) {
      const previous = cells.at(-1);
      const gap = previous ? (isRtlLine ? previous.x - (run.x + run.width) : run.x - previous.end) : 0;
      const columnSplitThreshold = Math.max(16, bodySize * 1.9);

      if (!previous || gap > columnSplitThreshold) {
        cells.push({
          x: run.x,
          end: run.x + run.width,
          spans: [{ text: run.text, bold: run.bold, italic: run.italic, mono: run.mono }],
          plainText: run.text,
        });
      } else {
        const insertSpace = needsSpaceBetween(
          previous.plainText,
          run.text,
          Boolean(prevRun?.trailingSpace),
          run.leadingSpace,
          gap,
          Math.min(run.size, bodySize),
        );
        const sep = insertSpace ? ' ' : '';
        previous.spans.push({ text: sep + run.text, bold: run.bold, italic: run.italic, mono: run.mono });
        previous.plainText += sep + run.text;
        previous.x = Math.min(previous.x, run.x);
        previous.end = Math.max(previous.end, run.x + run.width);
      }
      prevRun = run;
    }

    const totalChars = ordered.reduce((acc, r) => acc + r.text.length, 0) || 1;
    const boldChars = ordered.reduce((acc, r) => acc + (r.bold ? r.text.length : 0), 0);
    const monoChars = ordered.reduce((acc, r) => acc + (r.mono ? r.text.length : 0), 0);

    const plainText = cells.map((c) => c.plainText.trim()).join('  ').trim();
    const formattedText = cells.map((c) => formatSpans(c.spans, true)).join('  ').trim();

    return {
      y: line.y,
      x: Math.min(...cells.map((c) => c.x)),
      end: Math.max(...cells.map((c) => c.end)),
      size: line.size,
      boldRatio: boldChars / totalChars,
      monoRatio: monoChars / totalChars,
      cells,
      plainText,
      formattedText,
    };
  });

  const blocks: { y: number; markdown: string }[] = [];

  const headingLevelForRow = (row: VisualRow, isFirstBlock: boolean): number => {
    if (row.cells.length !== 1) return 0;
    const plain = row.plainText;
    if (!plain || plain.length > 130) return 0;
    if (BULLET_PREFIX.test(plain) || ORDERED_PREFIX.test(plain)) return 0;
    const ratio = row.size / bodySize;
    const looksSentence = /[.!?。]\s*$/.test(plain) && plain.length > 55;
    if (ratio >= 1.72 || (isFirstBlock && ratio >= 1.48 && !looksSentence)) return 1;
    if (ratio >= 1.32 || (ratio >= 1.18 && row.boldRatio >= 0.8 && !looksSentence)) return 2;
    if ((ratio >= 1.12 && row.boldRatio >= 0.85 && !looksSentence) || (row.boldRatio >= 0.95 && plain.length <= 72 && !looksSentence && !plain.includes(':'))) {
      return 3;
    }
    return 0;
  };

  for (let index = 0; index < rows.length; ) {
    const row = rows[index];

    // 1. GFM Table detection (2+ aligned columns across 2+ rows)
    if (row.cells.length >= 2) {
      const tableRows = [row];
      for (const next of rows.slice(index + 1)) {
        const previous = tableRows.at(-1)!;
        if (
          next.y - previous.y > bodySize * 3.2 ||
          next.cells.length !== row.cells.length ||
          !next.cells.every((cell, col) => Math.abs(cell.x - row.cells[col].x) < Math.max(18, bodySize * 1.8))
        ) {
          break;
        }
        tableRows.push(next);
      }

      if (tableRows.length >= 2) {
        const formatRow = (cells: string[]) => `| ${cells.join(' | ')} |`;
        const header = tableRows[0].cells.map((c) => escapeTableCell(formatSpans(c.spans, false)));
        const separator = header.map(() => '---');
        const body = tableRows.slice(1).map((r) =>
          formatRow(r.cells.map((c) => escapeTableCell(formatSpans(c.spans, true)))),
        );
        blocks.push({
          y: row.y,
          markdown: [formatRow(header), formatRow(separator), ...body].join('\n'),
        });
        index += tableRows.length;
        continue;
      }
    }

    // 2. Monospace Code Block detection (2+ consecutive mono lines)
    if (row.monoRatio >= 0.85) {
      const codeLines = [row.plainText];
      let nextIdx = index + 1;
      while (
        nextIdx < rows.length &&
        rows[nextIdx].monoRatio >= 0.85 &&
        rows[nextIdx].y - rows[nextIdx - 1].y <= bodySize * 2.1
      ) {
        codeLines.push(rows[nextIdx].plainText);
        nextIdx++;
      }
      if (codeLines.length >= 2) {
        blocks.push({
          y: row.y,
          markdown: `\`\`\`\n${codeLines.join('\n')}\n\`\`\``,
        });
        index = nextIdx;
        continue;
      }
    }

    // 3. Heading detection (merges wrapped multi-line headings of same size)
    const headingLevel = headingLevelForRow(row, blocks.length === 0);
    if (headingLevel > 0) {
      let headingText = formatSpans(row.cells[0].spans, false);
      let nextIdx = index + 1;
      while (
        nextIdx < rows.length &&
        rows[nextIdx].cells.length === 1 &&
        Math.abs(rows[nextIdx].size - row.size) <= 1.2 &&
        rows[nextIdx].y - rows[nextIdx - 1].y <= row.size * 1.55 &&
        headingText.length < 160
      ) {
        headingText = joinWrappedLine(headingText, formatSpans(rows[nextIdx].cells[0].spans, false));
        nextIdx++;
      }
      blocks.push({
        y: row.y,
        markdown: `${'#'.repeat(headingLevel)} ${headingText}`,
      });
      index = nextIdx;
      continue;
    }

    // 4. Bullet / Ordered List detection (groups consecutive list items & continuation lines)
    const isBullet = BULLET_PREFIX.test(row.plainText);
    const isOrdered = !isBullet && ORDERED_PREFIX.test(row.plainText);
    if (isBullet || isOrdered) {
      const listItems: string[] = [];
      let nextIdx = index;
      while (nextIdx < rows.length) {
        const cur = rows[nextIdx];
        const prev = nextIdx > index ? rows[nextIdx - 1] : undefined;
        if (prev && cur.y - prev.y > bodySize * 2.4) break;

        const bulletMatch = cur.formattedText.match(BULLET_PREFIX) || cur.plainText.match(BULLET_PREFIX);
        const orderedMatch = !bulletMatch
          ? cur.formattedText.match(ORDERED_PREFIX) || cur.plainText.match(ORDERED_PREFIX)
          : null;

        if (bulletMatch) {
          listItems.push(`- ${bulletMatch[1].trim()}`);
          nextIdx++;
        } else if (orderedMatch) {
          listItems.push(`${orderedMatch[1]}. ${orderedMatch[2].trim()}`);
          nextIdx++;
        } else if (
          listItems.length > 0 &&
          prev &&
          cur.y - prev.y <= bodySize * 1.65 &&
          cur.x >= row.x - 4 &&
          headingLevelForRow(cur, false) === 0
        ) {
          // Wrapped continuation line of the current list item
          listItems[listItems.length - 1] = joinWrappedLine(listItems[listItems.length - 1], cur.formattedText);
          nextIdx++;
        } else {
          break;
        }
      }

      blocks.push({
        y: row.y,
        markdown: listItems.join('\n'),
      });
      index = nextIdx;
      continue;
    }

    // 5. Flowing Paragraph grouping
    let paragraph = row.formattedText;
    let nextIdx = index + 1;
    while (nextIdx < rows.length) {
      const cur = rows[nextIdx];
      const prev = rows[nextIdx - 1];
      const gapY = cur.y - prev.y;

      // Stop paragraph on big vertical break, heading, list item, code block, or table
      if (gapY > bodySize * 1.72) break;
      if (cur.cells.length >= 2) break;
      if (cur.monoRatio >= 0.85) break;
      if (headingLevelForRow(cur, false) > 0) break;
      if (BULLET_PREFIX.test(cur.plainText) || ORDERED_PREFIX.test(cur.plainText)) break;
      // Indented new paragraph start
      if (cur.x - prev.x > bodySize * 1.6 && /[.!?。:]$/.test(prev.plainText)) break;

      paragraph = joinWrappedLine(paragraph, cur.formattedText);
      nextIdx++;
    }

    // Avoid accidental Markdown heading/blockquote interpretation at line start
    const safeParagraph = paragraph.replace(/^([#>])(?=\s)/, '\\$1');
    blocks.push({ y: row.y, markdown: safeParagraph });
    index = nextIdx;
  }

  for (const [figIndex, figure] of figures.entries()) {
    blocks.push({ y: figure.top, markdown: `![Figure ${figIndex + 1}](${figure.id})` });
  }

  const markdown = blocks
    .sort((a, b) => a.y - b.y)
    .map((block) => block.markdown)
    .filter(Boolean)
    .join('\n\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return { markdown, detectedFont };
}

export function pageMarkdown(
  items: PdfTextRun[],
  viewport: { convertToViewportPoint(x: number, y: number): number[] },
  figures: PdfFigure[],
  styles?: Record<string, PdfTextStyle>,
  resolvedFontNames?: Map<string, string>,
): string {
  return extractPageMarkdown(items, viewport, figures, styles, resolvedFontNames).markdown;
}
