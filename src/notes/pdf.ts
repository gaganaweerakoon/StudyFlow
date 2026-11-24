import { invoke } from '@tauri-apps/api/core';
import {
  extractPageMarkdown,
  type PdfFigure,
  type PdfTextRun,
  type PdfTextStyle,
} from './pdfMarkdown';

interface PdfViewport {
  width: number;
  height: number;
  convertToViewportPoint(x: number, y: number): number[];
}

export interface PdfMark {
  page: number;
  kind: 'ink' | 'highlight' | 'text';
  points: number[][];
  text?: string;
}

export interface PdfPageData {
  text: string;
  image?: string;
  figures?: PdfFigure[];
  structured?: boolean;
  hasText?: boolean;
  ocrComplete?: boolean;
  fontFamily?: string;
}

export interface PdfSource {
  name: string;
  data: string;
  marks: PdfMark[];
  originalFont?: string;
  viewer?: { page: number; zoom: number; rotation: number };
  pages?: PdfPageData[];
}

interface PdfPage {
  getViewport(options: { scale: number }): PdfViewport;
  render(options: object): { promise: Promise<void>; cancel(): void };
  getTextContent(): Promise<{ items: PdfTextRun[]; styles?: Record<string, PdfTextStyle> }>;
  getOperatorList(): Promise<{ fnArray: number[]; argsArray: (number[] | [number[] | null, unknown] | null)[] }>;
  commonObjs?: {
    has?: (name: string) => boolean;
    get?: (name: string) => { name?: string; loadedName?: string } | undefined;
  };
}

export interface PdfDocument {
  numPages: number;
  getPage(n: number): Promise<PdfPage>;
  destroy(): Promise<void>;
}

export async function openPdf(data: string): Promise<PdfDocument> {
  const api = await import('../vendor/pdf.min.mjs');
  api.GlobalWorkerOptions.workerSrc = '/pdfjs/pdf.worker.min.mjs';
  return api.getDocument({
    data: Uint8Array.from(atob(data), (ch) => ch.charCodeAt(0)),
    isEvalSupported: false,
  }).promise;
}

export async function readFileData(file: File) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += 8192) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 8192));
  }
  return btoa(binary);
}

function resolvePageFontNames(
  page: PdfPage,
  items: PdfTextRun[],
): Map<string, string> {
  const resolved = new Map<string, string>();
  const objs = page.commonObjs;
  if (!objs?.get) return resolved;

  const uniqueFontKeys = new Set<string>();
  for (const item of items) {
    if (item.fontName) uniqueFontKeys.add(item.fontName);
  }

  for (const key of uniqueFontKeys) {
    try {
      if (objs.has && !objs.has(key)) continue;
      const fontObj = objs.get(key);
      if (fontObj?.name) {
        resolved.set(key, fontObj.name);
      }
    } catch {
      // Ignore uninitialized font objects safely
    }
  }
  return resolved;
}

async function extractFigures(
  page: PdfPage,
  canvas: HTMLCanvasElement,
  viewport: PdfViewport,
  scale: number,
  pageNumber: number,
) {
  const { OPS } = await import('../vendor/pdf.min.mjs');
  const { fnArray, argsArray } = await page.getOperatorList();
  let matrix = new DOMMatrix();
  const saved: DOMMatrix[] = [];
  const figures: PdfFigure[] = [];
  for (const [index, operation] of fnArray.entries()) {
    if (figures.length >= 24) break;
    const args = argsArray[index];
    if (operation === OPS.save || operation === OPS.paintFormXObjectBegin) {
      saved.push(matrix);
      if (operation === OPS.paintFormXObjectBegin && Array.isArray(args?.[0])) {
        matrix = matrix.multiply(new DOMMatrix(args[0]));
      }
    } else if (operation === OPS.restore || operation === OPS.paintFormXObjectEnd) {
      matrix = saved.pop() ?? new DOMMatrix();
    } else if (operation === OPS.transform && args?.length === 6) {
      matrix = matrix.multiply(new DOMMatrix(args as number[]));
    } else if (operation === OPS.paintImageXObject || operation === OPS.paintInlineImageXObject) {
      const corners = [
        [0, 0],
        [0, 1],
        [1, 0],
        [1, 1],
      ].map(([x, y]) => {
        const point = matrix.transformPoint(new DOMPoint(x, y));
        return viewport.convertToViewportPoint(point.x, point.y);
      });
      const left = Math.max(0, Math.floor(Math.min(...corners.map((point) => point[0]))));
      const top = Math.max(0, Math.floor(Math.min(...corners.map((point) => point[1]))));
      const right = Math.min(canvas.width, Math.ceil(Math.max(...corners.map((point) => point[0]))));
      const bottom = Math.min(canvas.height, Math.ceil(Math.max(...corners.map((point) => point[1]))));
      const width = right - left;
      const height = bottom - top;
      if (width < 24 * scale || height < 24 * scale || width * height >= canvas.width * canvas.height * 0.9) continue;
      if (figures.some((figure) => figure.id === `figure-${left}-${top}-${width}-${height}`)) continue;
      const crop = document.createElement('canvas');
      crop.width = width;
      crop.height = height;
      crop.getContext('2d')?.drawImage(canvas, left, top, width, height, 0, 0, width, height);
      const topUnscaled = top / scale;
      const heightUnscaled = height / scale;
      const pageHeightUnscaled = canvas.height / scale;
      const pageWidthUnscaled = canvas.width / scale;
      const topRatio = pageHeightUnscaled > 0 ? topUnscaled / pageHeightUnscaled : 0.5;
      const bottomRatio =
        pageHeightUnscaled > 0 ? (topUnscaled + heightUnscaled) / pageHeightUnscaled : 0.5;
      const positionHint: PdfFigure['positionHint'] =
        bottomRatio <= 0.17 ? 'header' : topRatio >= 0.83 ? 'footer' : 'body';
      figures.push({
        id: `figure-${left}-${top}-${width}-${height}`,
        image: crop.toDataURL('image/webp', 0.85),
        top: topUnscaled,
        left: left / scale,
        width: width / scale,
        height: heightUnscaled,
        pageWidth: pageWidthUnscaled,
        pageHeight: pageHeightUnscaled,
        pageNumber,
        positionHint,
      });
    }
  }
  return figures;
}

export async function recognizePage(doc: PdfDocument, pageNumber: number): Promise<string> {
  const page = await doc.getPage(pageNumber);
  const original = page.getViewport({ scale: 1 });
  const scale = Math.min(3, 2600 / Math.max(original.width, original.height));
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);
  try {
    await page.render({ canvas, viewport }).promise;
    const png = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('Could not prepare the page image.'))),
        'image/png',
      ),
    );
    return (await invoke<string>('recognize_pdf_page', await png.arrayBuffer())).trim();
  } finally {
    canvas.width = canvas.height = 0;
  }
}

export async function preparePages(
  doc: PdfDocument,
  previews = true,
  onProgress?: (page: number, total: number) => void,
) {
  const pages: PdfPageData[] = [];
  for (let n = 1; n <= doc.numPages; n++) {
    onProgress?.(n, doc.numPages);
    const page = await doc.getPage(n);
    const { items, styles } = await page.getTextContent();
    const originalViewport = page.getViewport({ scale: 1 });
    let figures: PdfFigure[] = [];
    let image: string | undefined;
    if (previews) {
      const scale = Math.min(1.5, 900 / originalViewport.width);
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement('canvas');
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      await page.render({ canvas, viewport }).promise;
      image = canvas.toDataURL('image/webp', 0.8);
      figures = await extractFigures(page, canvas, viewport, scale, n);
      canvas.width = canvas.height = 0;
    }
    const resolvedFonts = resolvePageFontNames(page, items);
    const hasText = items.some((item) => item.str?.trim());
    const extracted = hasText
      ? extractPageMarkdown(items, originalViewport, figures, styles, resolvedFonts)
      : { markdown: '', detectedFont: undefined };
    pages.push({
      text: extracted.markdown,
      image,
      figures,
      structured: true,
      hasText,
      fontFamily: extracted.detectedFont,
    });
  }
  return pages;
}

export function detectDominantPdfFont(pages?: PdfPageData[]): string | undefined {
  if (!pages?.length) return undefined;
  const counts = new Map<string, number>();
  for (const page of pages) {
    if (!page.fontFamily) continue;
    counts.set(page.fontFamily, (counts.get(page.fontFamily) ?? 0) + Math.max(1, page.text.length));
  }
  let best: string | undefined;
  let bestScore = 0;
  for (const [font, score] of counts.entries()) {
    if (score > bestScore) {
      bestScore = score;
      best = font;
    }
  }
  return best;
}

export function combinePdfPagesMarkdown(pages?: PdfPageData[], fileName?: string): string {
  if (!pages?.length) return '';
  const nonEmpty = pages
    .map((p, idx) => ({ text: p.text.trim(), pageNumber: idx + 1 }))
    .filter((item) => item.text.length > 0);
  if (nonEmpty.length === 0) return '';
  if (nonEmpty.length === 1) {
    return nonEmpty[0].text;
  }
  const title = fileName ? `# ${fileName.replace(/\.pdf$/i, '')}\n\n` : '';
  return (
    title +
    nonEmpty
      .map((item) => `<!-- Page ${item.pageNumber} -->\n\n${item.text}`)
      .join('\n\n---\n\n')
  ).trim();
}
