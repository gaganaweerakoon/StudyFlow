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
  pages?: { text: string; image?: string }[];
}
interface PdfPage {
  getViewport(options: {scale: number}): {width:number; height:number};
  render(options: object): {promise: Promise<void>; cancel(): void};
  getTextContent(): Promise<{items: {str?: string; hasEOL?: boolean}[]}>;
  getOperatorList(): Promise<{fnArray: number[]}>;
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

export async function preparePages(doc: PdfDocument, previews = true) {
  const pages: NonNullable<PdfSource['pages']> = [];
  for (let n = 1; n <= doc.numPages; n++) {
    const page = await doc.getPage(n);
    const {items} = await page.getTextContent();
    const text = items.map(item => (item.str ?? '') + (item.hasEOL ? '\n' : ' ')).join('').trim();
    let image: string | undefined;
    if (previews) {
      const width = page.getViewport({scale:1}).width;
      const viewport = page.getViewport({scale:Math.min(1.5,900/width)});
      const canvas = document.createElement('canvas');
      canvas.width=Math.ceil(viewport.width); canvas.height=Math.ceil(viewport.height);
      await page.render({canvas,viewport}).promise;
      image=canvas.toDataURL('image/webp',0.8);
      canvas.width=canvas.height=0;
    }
    pages.push({text,image});
  }
  return pages;
}
