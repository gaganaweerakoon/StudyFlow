import { invoke } from '@tauri-apps/api/core';
import { pageMarkdown, type PdfFigure, type PdfTextRun } from './pdfMarkdown';

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
export interface PdfSource {
  name: string;
  data: string;
  marks: PdfMark[];
  viewer?: { page: number; zoom: number; rotation: number };
  pages?: { text: string; image?: string; figures?: PdfFigure[]; structured?: boolean; hasText?: boolean; ocrComplete?: boolean }[];
}
interface PdfPage {
  getViewport(options: {scale: number}): PdfViewport;
  render(options: object): {promise: Promise<void>; cancel(): void};
  getTextContent(): Promise<{items: PdfTextRun[]}>;
  getOperatorList(): Promise<{fnArray: number[]; argsArray: (number[] | [number[] | null, unknown] | null)[]}>;
}
export interface PdfDocument {
  numPages: number;
  getPage(n: number): Promise<PdfPage>;
  destroy(): Promise<void>;
}
export async function openPdf(data: string): Promise<PdfDocument> {
  const api = await import('../vendor/pdf.min.mjs');
  api.GlobalWorkerOptions.workerSrc = '/pdfjs/pdf.worker.min.mjs';
  return api.getDocument({ data: Uint8Array.from(atob(data), ch => ch.charCodeAt(0)), isEvalSupported: false }).promise;
}
export async function readFileData(file: File) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += 8192) binary += String.fromCharCode(...bytes.subarray(offset, offset + 8192));
  return btoa(binary);
}

async function extractFigures(page: PdfPage, canvas: HTMLCanvasElement, viewport: PdfViewport, scale: number) {
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
      const corners = [[0, 0], [0, 1], [1, 0], [1, 1]].map(([x, y]) => {
        const point = matrix.transformPoint(new DOMPoint(x, y));
        return viewport.convertToViewportPoint(point.x, point.y);
      });
      const left = Math.max(0, Math.floor(Math.min(...corners.map(point => point[0]))));
      const top = Math.max(0, Math.floor(Math.min(...corners.map(point => point[1]))));
      const right = Math.min(canvas.width, Math.ceil(Math.max(...corners.map(point => point[0]))));
      const bottom = Math.min(canvas.height, Math.ceil(Math.max(...corners.map(point => point[1]))));
      const width = right - left;
      const height = bottom - top;
      if (width < 24 * scale || height < 24 * scale || width * height >= canvas.width * canvas.height * 0.9) continue;
      if (figures.some(figure => figure.id === `figure-${left}-${top}-${width}-${height}`)) continue;
      const crop = document.createElement('canvas');
      crop.width = width;
      crop.height = height;
      crop.getContext('2d')?.drawImage(canvas, left, top, width, height, 0, 0, width, height);
      figures.push({
        id: `figure-${left}-${top}-${width}-${height}`,
        image: crop.toDataURL('image/webp', 0.85),
        top: top / scale,
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
    const png = await new Promise<Blob>((resolve, reject) => canvas.toBlob(
      blob => blob ? resolve(blob) : reject(new Error('Could not prepare the page image.')), 'image/png',
    ));
    return (await invoke<string>('recognize_pdf_page', await png.arrayBuffer())).trim();
  } finally {
    canvas.width = canvas.height = 0;
  }
}

export async function preparePages(doc: PdfDocument, previews = true) {
  const pages: NonNullable<PdfSource['pages']> = [];
  for (let n = 1; n <= doc.numPages; n++) {
    const page = await doc.getPage(n);
    const {items} = await page.getTextContent();
    const originalViewport = page.getViewport({ scale: 1 });
    let figures: PdfFigure[] = [];
    let image: string | undefined;
    if (previews) {
      const scale = Math.min(1.5, 900 / originalViewport.width);
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement('canvas');
      canvas.width=Math.ceil(viewport.width); canvas.height=Math.ceil(viewport.height);
      await page.render({canvas,viewport}).promise;
      image=canvas.toDataURL('image/webp',0.8);
      figures = await extractFigures(page, canvas, viewport, scale);
      canvas.width=canvas.height=0;
    }
    const hasText = items.some(item => item.str?.trim());
    const text = hasText ? pageMarkdown(items, originalViewport, figures) : '';
    pages.push({ text, image, figures, structured: true, hasText });
  }
  return pages;
}
