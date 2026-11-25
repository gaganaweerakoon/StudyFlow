import JSZip from '../vendor/jszip.mjs';
import { convertUploadedFileToMarkdown, formatFileSize } from '../notes/fileToMarkdown';
import { prepareImage } from './chatClient';
import {
  CHAT_LIMITS,
  type ChatDocument,
  type ChatDocumentKind,
  type ChatImage,
} from './protocol';

export interface PipAttachment {
  id: string;
  name: string;
  sizeBytes: number;
  sizeLabel: string;
  kind: 'image' | ChatDocumentKind;
  mime: string;
  pageCount?: number;
  slideCount?: number;
  charCount?: number;
  nativePdf?: boolean;
  image?: ChatImage;
  document?: ChatDocument;
}

export interface ChatMessageAttachmentBadge {
  name: string;
  kind: PipAttachment['kind'];
  meta?: string;
}

export const PIP_ACCEPTED_FILE_TYPES = [
  '.pdf',
  '.docx',
  '.doc',
  '.pptx',
  '.md',
  '.markdown',
  '.txt',
  '.csv',
  '.tsv',
  '.json',
  '.xml',
  '.html',
  '.css',
  '.js',
  '.jsx',
  '.ts',
  '.tsx',
  '.py',
  '.java',
  '.c',
  '.cpp',
  '.h',
  '.cs',
  '.go',
  '.rs',
  '.sql',
  '.yaml',
  '.yml',
  'image/png',
  'image/jpeg',
  'image/webp',
].join(',');

const CODE_EXTENSIONS = new Set([
  'js', 'jsx', 'ts', 'tsx', 'py', 'java', 'c', 'cpp', 'h', 'hpp', 'cs', 'go', 'rs',
  'sql', 'json', 'xml', 'html', 'htm', 'css', 'scss', 'yaml', 'yml', 'sh', 'rb', 'php', 'swift', 'kt',
]);

const MAX_DOCUMENT_FILE_BYTES = 20_000_000;

export function inferPipDocumentKind(fileName: string, mimeType = ''): 'image' | ChatDocumentKind | null {
  const lower = fileName.toLowerCase();
  const ext = lower.includes('.') ? lower.slice(lower.lastIndexOf('.') + 1) : '';
  if (mimeType.startsWith('image/') || ['png', 'jpg', 'jpeg', 'webp'].includes(ext)) return 'image';
  if (ext === 'pdf' || mimeType === 'application/pdf') return 'pdf';
  if (ext === 'docx' || ext === 'doc') return 'doc';
  if (ext === 'pptx') return 'slide';
  if (ext === 'csv' || ext === 'tsv') return 'sheet';
  if (ext === 'md' || ext === 'markdown') return 'markdown';
  if (CODE_EXTENSIONS.has(ext)) return 'code';
  if (ext === 'txt' || ext === 'log' || ext === 'rtf' || mimeType.startsWith('text/')) return 'text';
  return null;
}

export function formatAttachmentMeta(att: Pick<PipAttachment, 'kind' | 'sizeLabel' | 'pageCount' | 'slideCount' | 'nativePdf'>): string {
  const parts: string[] = [];
  if (att.kind === 'pdf' && att.pageCount) {
    parts.push(`${att.pageCount} ${att.pageCount === 1 ? 'page' : 'pages'}`);
  } else if (att.kind === 'slide' && att.slideCount) {
    parts.push(`${att.slideCount} ${att.slideCount === 1 ? 'slide' : 'slides'}`);
  } else if (att.kind === 'image') {
    parts.push('Image');
  } else {
    const labelMap: Record<ChatDocumentKind, string> = {
      pdf: 'PDF',
      doc: 'Word Doc',
      slide: 'Slides',
      sheet: 'Table',
      markdown: 'Markdown',
      text: 'Text',
      code: 'Code',
    };
    parts.push(labelMap[att.kind]);
  }
  if (att.sizeLabel) parts.push(att.sizeLabel);
  if (att.nativePdf) parts.push('Direct PDF');
  return parts.join(' · ');
}

function uint8ToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 8192) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  }
  return btoa(binary);
}

async function extractPptxSlides(file: File): Promise<{ text: string; slideCount: number }> {
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const slidePaths = Object.keys(zip.files)
    .filter((name) => /^ppt\/slides\/slide\d+\.xml$/i.test(name))
    .sort((a, b) => {
      const numA = Number(a.match(/slide(\d+)\.xml/i)?.[1] ?? 0);
      const numB = Number(b.match(/slide(\d+)\.xml/i)?.[1] ?? 0);
      return numA - numB;
    });

  if (!slidePaths.length) {
    throw new Error('Could not find readable slides inside this PowerPoint file.');
  }

  const sections: string[] = [];
  for (let i = 0; i < slidePaths.length; i++) {
    const xml = await zip.file(slidePaths[i])?.async('string');
    if (!xml) continue;
    const dom = new DOMParser().parseFromString(xml, 'application/xml');
    const paragraphs: string[] = [];
    for (const p of Array.from(dom.getElementsByTagNameNS('*', 'p'))) {
      const line = Array.from(p.getElementsByTagNameNS('*', 't'))
        .map((node) => node.textContent ?? '')
        .join('')
        .replace(/\s+/g, ' ')
        .trim();
      if (line) paragraphs.push(line);
    }
    if (paragraphs.length) {
      sections.push(`## Slide ${i + 1}\n${paragraphs.join('\n')}`);
    }
  }

  return {
    text: sections.join('\n\n').trim(),
    slideCount: slidePaths.length,
  };
}

function truncateDocumentText(raw: string): string {
  return raw.trim();
}

export async function preparePipAttachment(
  file: File,
  imageDetail: ChatImage['detail'],
  onProgress?: (label: string) => void,
): Promise<PipAttachment> {
  if (!file.size) {
    throw new Error(`"${file.name}" appears to be empty.`);
  }

  const kind = inferPipDocumentKind(file.name, file.type);
  if (!kind) {
    throw new Error(
      `Unsupported file type for "${file.name}". Attach PDF, DOCX, DOC, PPTX, Markdown, TXT, CSV, code files, or PNG/JPEG/WebP images.`,
    );
  }

  const id = crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const sizeLabel = formatFileSize(file.size);

  // 1. Images
  if (kind === 'image') {
    onProgress?.(`Preparing image ${file.name}…`);
    const prepared = await prepareImage(file, imageDetail);
    return {
      id,
      name: prepared.name,
      sizeBytes: file.size,
      sizeLabel,
      kind: 'image',
      mime: prepared.image.mime,
      image: prepared.image,
    };
  }

  if (file.size > MAX_DOCUMENT_FILE_BYTES) {
    throw new Error(`"${file.name}" is over 20 MB. Please attach a smaller document.`);
  }

  // 2. PDF -> Send native PDF inline bytes (when <= 6 MB) AND extract structured text/page count
  if (kind === 'pdf') {
    onProgress?.(`Reading PDF ${file.name}…`);
    const rawBytes = new Uint8Array(await file.arrayBuffer());
    const hasPdfSignature =
      rawBytes.length >= 5 &&
      rawBytes[0] === 0x25 &&
      rawBytes[1] === 0x50 &&
      rawBytes[2] === 0x44 &&
      rawBytes[3] === 0x46 &&
      rawBytes[4] === 0x2d;

    if (!hasPdfSignature) {
      throw new Error(`"${file.name}" is not a valid PDF document.`);
    }

    let extractedText = '';
    let pageCount: number | undefined;
    try {
      const converted = await convertUploadedFileToMarkdown(file, onProgress);
      extractedText = truncateDocumentText(converted.markdown);
      pageCount = converted.pageCount;
    } catch {
      // Scanned or protected PDFs may fail text extraction; native PDF bytes still work for Gemini!
    }

    const canSendNativePdf = rawBytes.length <= CHAT_LIMITS.pdfBytes;
    const pdfBase64 = canSendNativePdf ? uint8ToBase64(rawBytes) : undefined;

    if (!pdfBase64 && !extractedText) {
      throw new Error(
        `"${file.name}" is larger than 6 MB and contains no extractable text. Try splitting the PDF into fewer pages.`,
      );
    }

    return {
      id,
      name: file.name,
      sizeBytes: file.size,
      sizeLabel,
      kind: 'pdf',
      mime: 'application/pdf',
      pageCount,
      charCount: extractedText.length,
      nativePdf: Boolean(pdfBase64),
      document: {
        name: file.name.slice(0, 180),
        kind: 'pdf',
        mime: 'application/pdf',
        sizeBytes: file.size,
        pageCount,
        text: extractedText || undefined,
        pdfBase64,
      },
    };
  }

  // 3. PowerPoint (.pptx)
  if (kind === 'slide') {
    onProgress?.(`Extracting slides from ${file.name}…`);
    const { text, slideCount } = await extractPptxSlides(file);
    const trimmed = truncateDocumentText(text);
    if (!trimmed) {
      throw new Error(`No readable slide text was found in "${file.name}".`);
    }
    return {
      id,
      name: file.name,
      sizeBytes: file.size,
      sizeLabel,
      kind: 'slide',
      mime: file.type || 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      slideCount,
      charCount: trimmed.length,
      document: {
        name: file.name.slice(0, 180),
        kind: 'slide',
        mime: file.type || 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        sizeBytes: file.size,
        pageCount: slideCount,
        text: trimmed,
      },
    };
  }

  // 4. Code & JSON files -> keep exact verbatim code fence
  if (kind === 'code') {
    onProgress?.(`Reading ${file.name}…`);
    const raw = await file.text();
    const trimmed = truncateDocumentText(raw);
    if (!trimmed) {
      throw new Error(`"${file.name}" contains no readable text.`);
    }
    return {
      id,
      name: file.name,
      sizeBytes: file.size,
      sizeLabel,
      kind: 'code',
      mime: file.type || 'text/plain',
      charCount: trimmed.length,
      document: {
        name: file.name.slice(0, 180),
        kind: 'code',
        mime: file.type || 'text/plain',
        sizeBytes: file.size,
        text: trimmed,
      },
    };
  }

  // 5. DOCX, DOC, MD, CSV, TSV, TXT -> reuse StudyFlow's rich Markdown converter
  onProgress?.(`Extracting ${file.name}…`);
  const converted = await convertUploadedFileToMarkdown(file, onProgress);
  const trimmed = truncateDocumentText(converted.markdown);
  if (!trimmed) {
    throw new Error(`Could not extract readable text from "${file.name}".`);
  }

  return {
    id,
    name: file.name,
    sizeBytes: file.size,
    sizeLabel,
    kind,
    mime: file.type || 'text/plain',
    charCount: trimmed.length,
    document: {
      name: file.name.slice(0, 180),
      kind,
      mime: file.type || 'text/plain',
      sizeBytes: file.size,
      text: trimmed,
    },
  };
}
