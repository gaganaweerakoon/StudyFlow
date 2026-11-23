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
  const path = '/pdfjs/pdf.min.mjs';
  const api = await import(/* @vite-ignore */ path);
  api.GlobalWorkerOptions.workerSrc = '/pdfjs/pdf.worker.min.mjs';
  return api.getDocument({ data: Uint8Array.from(atob(data), ch => ch.charCodeAt(0)), isEvalSupported: false }).promise;
}
export async function readFileData(file: File) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += 8192) binary += String.fromCharCode(...bytes.subarray(offset, offset + 8192));
  return btoa(binary);
}
