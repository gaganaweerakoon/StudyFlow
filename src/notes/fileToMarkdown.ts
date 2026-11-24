import JSZip from '../vendor/jszip.mjs';
import type { NoteAttachment } from '../types/studyflow';
import {
  combinePdfPagesMarkdown,
  detectDominantPdfFont,
  openPdf,
  preparePages,
  readFileData,
  type PdfSource,
} from './pdf';
import { cleanDocumentFontName } from './unicodeFonts';
import { readWordBinary } from './wordBinary';

export interface ConvertedUploadResult {
  attachment: NoteAttachment;
  markdown: string;
  originalFont?: string;
  pdfSource?: PdfSource;
  pageCount?: number;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(bytes < 10 * 1024 ? 1 : 0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function inferAttachmentType(fileName: string): NoteAttachment['type'] {
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.pdf')) return 'pdf';
  if (/\.(?:docx?|rtf|odt)$/.test(lower)) return 'doc';
  if (/\.(?:md|markdown)$/.test(lower)) return 'markdown';
  if (/\.(?:txt|log)$/.test(lower)) return 'text';
  if (/\.(?:pptx?|key)$/.test(lower)) return 'slide';
  if (/\.(?:xlsx?|csv|tsv)$/.test(lower)) return 'sheet';
  if (/\.(?:png|jpe?g|webp|gif|svg)$/.test(lower)) return 'image';
  return 'file';
}

function getWordAttr(el: Element | null, localName: string): string | null {
  if (!el) return null;
  for (const attr of Array.from(el.attributes)) {
    if (attr.localName === localName) return attr.value;
  }
  return null;
}

function firstChildByLocalName(el: Element, localName: string): Element | null {
  for (const child of Array.from(el.children)) {
    if (child.localName === localName) return child;
  }
  return null;
}

function extractDocxRunMarkdown(run: Element, fontWeights: Map<string, number>): string {
  const rPr = firstChildByLocalName(run, 'rPr');
  let bold = false;
  let italic = false;
  let strike = false;
  let mono = false;

  if (rPr) {
    const bEl = firstChildByLocalName(rPr, 'b');
    if (bEl && getWordAttr(bEl, 'val') !== '0' && getWordAttr(bEl, 'val') !== 'false') bold = true;

    const iEl = firstChildByLocalName(rPr, 'i');
    if (iEl && getWordAttr(iEl, 'val') !== '0' && getWordAttr(iEl, 'val') !== 'false') italic = true;

    const sEl = firstChildByLocalName(rPr, 'strike');
    if (sEl && getWordAttr(sEl, 'val') !== '0' && getWordAttr(sEl, 'val') !== 'false') strike = true;

    const rFonts = firstChildByLocalName(rPr, 'rFonts');
    if (rFonts) {
      const candidates = [
        getWordAttr(rFonts, 'cs'),
        getWordAttr(rFonts, 'eastAsia'),
        getWordAttr(rFonts, 'ascii'),
        getWordAttr(rFonts, 'hAnsi'),
      ].filter(Boolean) as string[];
      for (const rawFont of candidates) {
        if (/mono|courier|consolas|menlo|fira\s?code|jetbrains/i.test(rawFont)) mono = true;
        const cleaned = cleanDocumentFontName(rawFont);
        if (cleaned) {
          fontWeights.set(cleaned, (fontWeights.get(cleaned) ?? 0) + 1);
        }
      }
    }
  }

  let raw = '';
  for (const node of Array.from(run.childNodes)) {
    if (node.nodeType !== 1) continue;
    const child = node as Element;
    if (child.localName === 't') {
      raw += child.textContent ?? '';
    } else if (child.localName === 'tab') {
      raw += '  ';
    } else if (child.localName === 'br' || child.localName === 'cr') {
      raw += '\n';
    }
  }

  raw = raw.normalize('NFC');
  if (!raw) return '';

  // Weight font frequency by actual text length
  if (rPr) {
    const rFonts = firstChildByLocalName(rPr, 'rFonts');
    const chosen =
      getWordAttr(rFonts, 'cs') ||
      getWordAttr(rFonts, 'eastAsia') ||
      getWordAttr(rFonts, 'ascii') ||
      getWordAttr(rFonts, 'hAnsi');
    const cleaned = cleanDocumentFontName(chosen ?? undefined);
    if (cleaned) {
      fontWeights.set(cleaned, (fontWeights.get(cleaned) ?? 0) + raw.trim().length);
    }
  }

  if (!raw.trim()) return raw;
  const lead = raw.match(/^\s*/)?.[0] ?? '';
  const trail = raw.match(/\s*$/)?.[0] ?? '';
  const core = raw.slice(lead.length, raw.length - trail.length);
  if (!core) return raw;

  if (mono) return `${lead}\`${core.replace(/`/g, '\\`')}\`${trail}`;
  let formatted = core;
  if (bold && italic) formatted = `***${formatted}***`;
  else if (bold) formatted = `**${formatted}**`;
  else if (italic) formatted = `*${formatted}*`;
  if (strike) formatted = `~~${formatted}~~`;
  return `${lead}${formatted}${trail}`;
}

async function convertDocxToMarkdown(file: File): Promise<{ markdown: string; originalFont?: string }> {
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const docXml = await zip.file('word/document.xml')?.async('string');
  if (!docXml) {
    throw new Error('This Word document has no readable document body.');
  }

  const fontWeights = new Map<string, number>();

  // Check word/styles.xml for the document's default font
  const stylesXml = await zip.file('word/styles.xml')?.async('string');
  const styleNames = new Map<string, string>();
  if (stylesXml) {
    const stylesDom = new DOMParser().parseFromString(stylesXml, 'application/xml');
    for (const rFonts of Array.from(stylesDom.getElementsByTagNameNS('*', 'rFonts'))) {
      const f =
        getWordAttr(rFonts, 'cs') ||
        getWordAttr(rFonts, 'eastAsia') ||
        getWordAttr(rFonts, 'ascii') ||
        getWordAttr(rFonts, 'hAnsi');
      const cleaned = cleanDocumentFontName(f ?? undefined);
      if (cleaned) {
        fontWeights.set(cleaned, (fontWeights.get(cleaned) ?? 0) + 5);
      }
    }
    for (const styleEl of Array.from(stylesDom.getElementsByTagNameNS('*', 'style'))) {
      const id = getWordAttr(styleEl, 'styleId');
      const nameEl = firstChildByLocalName(styleEl, 'name');
      const nameVal = getWordAttr(nameEl, 'val');
      if (id && nameVal) styleNames.set(id, nameVal);
    }
  }

  // Check numbering.xml to differentiate bullet vs ordered lists
  const numFormats = new Map<string, 'bullet' | 'ordered'>();
  const numberingXml = await zip.file('word/numbering.xml')?.async('string');
  if (numberingXml) {
    const numDom = new DOMParser().parseFromString(numberingXml, 'application/xml');
    const abstractFormats = new Map<string, 'bullet' | 'ordered'>();
    for (const abs of Array.from(numDom.getElementsByTagNameNS('*', 'abstractNum'))) {
      const absId = getWordAttr(abs, 'abstractNumId');
      const lvl = abs.getElementsByTagNameNS('*', 'lvl')[0];
      const numFmt = lvl ? firstChildByLocalName(lvl, 'numFmt') : null;
      const fmtVal = getWordAttr(numFmt, 'val') ?? '';
      if (absId) {
        abstractFormats.set(absId, /bullet/i.test(fmtVal) ? 'bullet' : 'ordered');
      }
    }
    for (const num of Array.from(numDom.getElementsByTagNameNS('*', 'num'))) {
      const numId = getWordAttr(num, 'numId');
      const absRef = firstChildByLocalName(num, 'abstractNumId');
      const absId = getWordAttr(absRef, 'val');
      if (numId && absId && abstractFormats.has(absId)) {
        numFormats.set(numId, abstractFormats.get(absId)!);
      }
    }
  }

  const dom = new DOMParser().parseFromString(docXml, 'application/xml');
  const body = dom.getElementsByTagNameNS('*', 'body')[0];
  if (!body) {
    throw new Error('Could not locate body content in this Word document.');
  }

  const blocks: { kind: 'list' | 'block'; text: string }[] = [];

  const paragraphToText = (p: Element, allowHeading: boolean): { text: string; isList: boolean } => {
    const pPr = firstChildByLocalName(p, 'pPr');
    const pStyleEl = pPr ? firstChildByLocalName(pPr, 'pStyle') : null;
    const styleId = getWordAttr(pStyleEl, 'val') ?? '';
    const styleLabel = `${styleId} ${styleNames.get(styleId) ?? ''}`.toLowerCase();

    const parts: string[] = [];
    for (const child of Array.from(p.children)) {
      if (child.localName === 'r') {
        parts.push(extractDocxRunMarkdown(child, fontWeights));
      } else if (child.localName === 'hyperlink') {
        const inner = Array.from(child.children)
          .filter((c) => c.localName === 'r')
          .map((r) => extractDocxRunMarkdown(r, fontWeights))
          .join('');
        parts.push(inner);
      }
    }

    const joined = parts.join('').replace(/[ \t]{2,}/g, ' ').trim();
    if (!joined) return { text: '', isList: false };

    if (allowHeading) {
      const headingMatch = styleLabel.match(/heading\s*([1-6])|title|subtitle/);
      if (headingMatch) {
        const plainHeading = joined.replace(/\*\*\*/g, '').replace(/\*\*/g, '');
        if (headingMatch[1]) {
          return { text: `${'#'.repeat(Number(headingMatch[1]))} ${plainHeading}`, isList: false };
        }
        if (styleLabel.includes('subtitle')) {
          return { text: `## ${plainHeading}`, isList: false };
        }
        return { text: `# ${plainHeading}`, isList: false };
      }
    }

    const numPr = pPr ? firstChildByLocalName(pPr, 'numPr') : null;
    if (numPr) {
      const ilvlEl = firstChildByLocalName(numPr, 'ilvl');
      const numIdEl = firstChildByLocalName(numPr, 'numId');
      const level = Math.min(4, Number(getWordAttr(ilvlEl, 'val') ?? '0') || 0);
      const numId = getWordAttr(numIdEl, 'val') ?? '';
      const listKind = numFormats.get(numId) ?? (/listbullet/i.test(styleLabel) ? 'bullet' : 'bullet');
      const indent = '  '.repeat(level);
      const marker = listKind === 'ordered' ? '1.' : '-';
      return { text: `${indent}${marker} ${joined}`, isList: true };
    }

    if (/quote|blockquote/.test(styleLabel)) {
      return { text: `> ${joined}`, isList: false };
    }

    return { text: joined, isList: false };
  };

  for (const child of Array.from(body.children)) {
    if (child.localName === 'p') {
      const res = paragraphToText(child, true);
      if (res.text) {
        blocks.push({ kind: res.isList ? 'list' : 'block', text: res.text });
      }
    } else if (child.localName === 'tbl') {
      const tableRows: string[][] = [];
      for (const tr of Array.from(child.children).filter((c) => c.localName === 'tr')) {
        const cells = Array.from(tr.children)
          .filter((c) => c.localName === 'tc')
          .map((tc) => {
            const cellParagraphs = Array.from(tc.children)
              .filter((c) => c.localName === 'p')
              .map((p) => paragraphToText(p, false).text)
              .filter(Boolean);
            return cellParagraphs.join(' ').replace(/\|/g, '\\|').trim();
          });
        if (cells.length > 0) tableRows.push(cells);
      }
      if (tableRows.length > 0) {
        const cols = Math.max(...tableRows.map((r) => r.length));
        const padRow = (r: string[]) => Array.from({ length: cols }, (_, i) => r[i] ?? '');
        const formatRow = (r: string[]) => `| ${padRow(r).join(' | ')} |`;
        const mdTable = [
          formatRow(tableRows[0]),
          `| ${Array.from({ length: cols }, () => '---').join(' | ')} |`,
          ...tableRows.slice(1).map(formatRow),
        ].join('\n');
        blocks.push({ kind: 'block', text: mdTable });
      }
    }
  }

  let originalFont: string | undefined;
  let bestWeight = 0;
  for (const [font, weight] of fontWeights.entries()) {
    if (weight > bestWeight) {
      bestWeight = weight;
      originalFont = font;
    }
  }

  // Join consecutive list items with single newline, separate normal blocks with blank line
  const output: string[] = [];
  for (let i = 0; i < blocks.length; i++) {
    const cur = blocks[i];
    const prev = blocks[i - 1];
    if (i === 0) {
      output.push(cur.text);
    } else if (cur.kind === 'list' && prev?.kind === 'list') {
      output.push(`\n${cur.text}`);
    } else {
      output.push(`\n\n${cur.text}`);
    }
  }

  return { markdown: output.join('').trim(), originalFont };
}

function structurePlainTextToMarkdown(rawText: string, fileName: string): string {
  const normalized = rawText.replace(/\r\n?/g, '\n').normalize('NFC').trim();
  if (!normalized) return '';

  const lines = normalized.split('\n');
  const blocks: { kind: 'list' | 'block'; text: string }[] = [];
  let paragraphBuf: string[] = [];

  const flushParagraph = () => {
    if (paragraphBuf.length > 0) {
      blocks.push({ kind: 'block', text: paragraphBuf.join(' ').trim() });
      paragraphBuf = [];
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      flushParagraph();
      continue;
    }

    const bullet = line.match(/^(?:[•◦▪▫‣●○–—*-])\s+(.*)$/);
    if (bullet) {
      flushParagraph();
      blocks.push({ kind: 'list', text: `- ${bullet[1].trim()}` });
      continue;
    }

    const ordered = line.match(/^(\d{1,3})[.)]\s+(.*)$/);
    if (ordered) {
      flushParagraph();
      blocks.push({ kind: 'list', text: `${ordered[1]}. ${ordered[2].trim()}` });
      continue;
    }

    // Short standalone line with no trailing sentence punctuation after blank line -> subheading
    if (
      paragraphBuf.length === 0 &&
      line.length <= 72 &&
      !/[.!?,;]$/.test(line) &&
      (line === line.toUpperCase() && /[A-Z]/.test(line))
    ) {
      blocks.push({ kind: 'block', text: `## ${line}` });
      continue;
    }

    paragraphBuf.push(line);
  }
  flushParagraph();

  const joined = blocks
    .map((b, i) => (i === 0 ? b.text : b.kind === 'list' && blocks[i - 1]?.kind === 'list' ? `\n${b.text}` : `\n\n${b.text}`))
    .join('')
    .trim();

  if (!/^#\s/m.test(joined) && fileName) {
    const baseTitle = fileName.replace(/\.[^.]+$/, '');
    return `# ${baseTitle}\n\n${joined}`;
  }
  return joined;
}

function convertDelimitedToMarkdownTable(rawText: string, delimiter: ',' | '\t'): string {
  const lines = rawText
    .replace(/\r\n?/g, '\n')
    .normalize('NFC')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return '';

  const parseLine = (line: string): string[] => {
    if (delimiter === '\t') return line.split('\t').map((c) => c.trim().replace(/\|/g, '\\|'));
    const cells: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === ',' && !inQuotes) {
        cells.push(current.trim().replace(/\|/g, '\\|'));
        current = '';
      } else {
        current += ch;
      }
    }
    cells.push(current.trim().replace(/\|/g, '\\|'));
    return cells;
  };

  const rows = lines.slice(0, 200).map(parseLine);
  const cols = Math.max(...rows.map((r) => r.length));
  const fmt = (r: string[]) => `| ${Array.from({ length: cols }, (_, i) => r[i] ?? '').join(' | ')} |`;

  return [
    fmt(rows[0]),
    `| ${Array.from({ length: cols }, () => '---').join(' | ')} |`,
    ...rows.slice(1).map(fmt),
  ].join('\n');
}

export async function convertUploadedFileToMarkdown(
  file: File,
  onProgress?: (status: string) => void,
): Promise<ConvertedUploadResult> {
  const lower = file.name.toLowerCase();
  const type = inferAttachmentType(file.name);
  const size = formatFileSize(file.size);
  const baseAttachment: NoteAttachment = {
    id: `att-${crypto.randomUUID()}`,
    name: file.name,
    type,
    size,
    uploadedAt: 'Just now',
  };

  // 1. PDF -> full PdfSource + structured auto-Markdown + original font detection
  if (lower.endsWith('.pdf') || file.type === 'application/pdf') {
    onProgress?.('Reading PDF…');
    const data = await readFileData(file);
    const doc = await openPdf(data);
    try {
      const pages = await preparePages(doc, true, (cur, total) => {
        onProgress?.(`Converting page ${cur} of ${total} to Markdown…`);
      });
      const originalFont = detectDominantPdfFont(pages);
      const markdown = combinePdfPagesMarkdown(pages, file.name);
      const pdfSource: PdfSource = {
        name: file.name,
        data,
        marks: [],
        originalFont,
        pages,
      };
      return {
        attachment: { ...baseAttachment, markdown, originalFont },
        markdown,
        originalFont,
        pdfSource,
        pageCount: doc.numPages,
      };
    } finally {
      await doc.destroy();
    }
  }

  // 2. DOCX -> proper Markdown with headings, bold/italic, lists, tables, and original font
  if (lower.endsWith('.docx')) {
    onProgress?.('Converting Word document to Markdown…');
    const { markdown, originalFont } = await convertDocxToMarkdown(file);
    return {
      attachment: { ...baseAttachment, markdown, originalFont },
      markdown,
      originalFont,
    };
  }

  // 3. Legacy binary .DOC -> UTF-16LE / Windows-1252 extraction into structured Markdown
  if (lower.endsWith('.doc')) {
    onProgress?.('Extracting Word document text…');
    const buffer = await file.arrayBuffer();
    let extracted = '';
    if (new Uint8Array(buffer)[0] === 0xd0) {
      extracted = readWordBinary(buffer);
    } else {
      const raw = new TextDecoder('utf-8').decode(buffer);
      if (/^\s*<(?:!doctype|html)/i.test(raw)) {
        extracted = new DOMParser().parseFromString(raw, 'text/html').body.textContent ?? '';
      } else {
        extracted = raw;
      }
    }
    const markdown = structurePlainTextToMarkdown(extracted, file.name);
    return {
      attachment: { ...baseAttachment, markdown },
      markdown,
    };
  }

  // 4. Markdown files -> direct UTF-8 preservation
  if (lower.endsWith('.md') || lower.endsWith('.markdown')) {
    onProgress?.('Importing Markdown…');
    const raw = (await file.text()).replace(/\r\n?/g, '\n').normalize('NFC').trim();
    return {
      attachment: { ...baseAttachment, markdown: raw },
      markdown: raw,
    };
  }

  // 5. CSV / TSV -> proper GFM Markdown table
  if (lower.endsWith('.csv') || lower.endsWith('.tsv')) {
    onProgress?.('Converting table to Markdown…');
    const raw = await file.text();
    const tableMd = convertDelimitedToMarkdownTable(raw, lower.endsWith('.tsv') ? '\t' : ',');
    const title = file.name.replace(/\.[^.]+$/, '');
    const markdown = tableMd ? `# ${title}\n\n${tableMd}` : '';
    return {
      attachment: { ...baseAttachment, markdown },
      markdown,
    };
  }

  // 6. Plain text -> structured Markdown
  if (lower.endsWith('.txt') || file.type.startsWith('text/')) {
    onProgress?.('Converting text file to Markdown…');
    const raw = await file.text();
    const markdown = structurePlainTextToMarkdown(raw, file.name);
    return {
      attachment: { ...baseAttachment, markdown },
      markdown,
    };
  }

  // 7. Images -> embed as clean Markdown image reference with data URL
  if (file.type.startsWith('image/') || /\.(?:png|jpe?g|webp|gif)$/i.test(lower)) {
    onProgress?.('Attaching image…');
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? ''));
      reader.onerror = () => reject(new Error('Could not read image file.'));
      reader.readAsDataURL(file);
    });
    const label = file.name.replace(/\.[^.]+$/, '');
    const markdown = `![${label}](${dataUrl})`;
    return {
      attachment: { ...baseAttachment, markdown },
      markdown,
    };
  }

  // Other files: attach metadata without markdown conversion
  return {
    attachment: baseAttachment,
    markdown: '',
  };
}
