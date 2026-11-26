import { excerptFromSelection, type NoteExcerpt } from '../utils/noteSelection';
import { isTauri } from '@tauri-apps/api/core';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  FilePlus2,
  FileText,
  Highlighter,
  Loader2,
  PenTool,
  RefreshCw,
  RotateCw,
  Search,
  Trash2,
  Type,
  Undo2,
  Upload,
  X,
} from 'lucide-react';
import AssistantMarkdown from '../assistant/AssistantMarkdown';
import {
  combinePdfPagesMarkdown,
  detectDominantPdfFont,
  openPdf,
  preparePages,
  recognizePage,
  type PdfDocument,
  type PdfMark,
  type PdfSource,
} from './pdf';

type ViewerState = NonNullable<PdfSource['viewer']>;

interface PdfPanelProps {
  source?: PdfSource;
  save: (next: PdfSource | undefined) => void;
  onUploadFiles: (files: FileList | File[]) => Promise<void>;
  onInsertMarkdown: (markdown: string, label?: string, detectedFont?: string) => void;
  uploadingStatus?: string;
  noteFontFamily: string;
  onSelectExcerpt?: (excerpt: NoteExcerpt | undefined) => void;
}

function PageThumbnail({ doc, page }: { doc: PdfDocument; page: number }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    let active = true;
    let task: { cancel(): void } | undefined;
    void doc
      .getPage(page)
      .then((pdfPage) => {
        if (!active || !canvas.current) return;
        const target = canvas.current;
        const width = pdfPage.getViewport({ scale: 1 }).width;
        const viewport = pdfPage.getViewport({ scale: 84 / width });
        target.width = Math.ceil(viewport.width);
        target.height = Math.ceil(viewport.height);
        const rendering = pdfPage.render({ canvas: target, viewport });
        task = rendering;
        return rendering.promise;
      })
      .catch(() => {});
    return () => {
      active = false;
      task?.cancel();
    };
  }, [doc, page]);
  return <canvas ref={canvas} className="mx-auto max-h-24 max-w-full rounded bg-white" aria-hidden="true" />;
}

export function PdfPanel({
  source,
  save,
  onUploadFiles,
  onInsertMarkdown,
  uploadingStatus,
  noteFontFamily,
  onSelectExcerpt,
}: PdfPanelProps) {
  const [working, setWorking] = useState(false);
  const [progressText, setProgressText] = useState('');
  const [doc, setDoc] = useState<PdfDocument>();
  const [viewer, setViewer] = useState<ViewerState>(source?.viewer ?? { page: 1, zoom: 0, rotation: 0 });
  const { page, zoom, rotation } = viewer;
  const [readerOpen, setReaderOpen] = useState(false);
  const [showMarkdown, setShowMarkdown] = useState(true);
  const [mdViewMode, setMdViewMode] = useState<'preview' | 'raw'>('preview');
  const [selectedMdPage, setSelectedMdPage] = useState<'all' | number>('all');
  const [copied, setCopied] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const reader = useRef<HTMLDivElement>(null);
  const [readerWidth, setReaderWidth] = useState(650);
  const [query, setQuery] = useState('');
  const [matches, setMatches] = useState<number[]>();
  const [searching, setSearching] = useState(false);
  const searchSequence = useRef(0);
  const textCache = useRef(new Map<number, string>());
  const [tool, setTool] = useState<PdfMark['kind']>('ink');
  const [pendingTextPoint, setPendingTextPoint] = useState<number[] | null>(null);
  const [pendingTextValue, setPendingTextValue] = useState('');
  const [error, setError] = useState('');
  const [size, setSize] = useState({ width: 600, height: 800 });
  const latest = useRef(source);
  latest.current = source;
  const canvas = useRef<HTMLCanvasElement>(null);
  const [stroke, setStroke] = useState<number[][]>([]);
  const points = useRef<number[][]>([]);

  useEffect(() => {
    if (!source) {
      setDoc(undefined);
      return;
    }
    let active = true;
    let opened: PdfDocument | undefined;
    openPdf(source.data)
      .then((result) => {
        if (!active) {
          void result.destroy();
          return;
        }
        opened = result;
        textCache.current.clear();
        setDoc(result);
        const saved = latest.current?.viewer ?? { page: 1, zoom: 0, rotation: 0 };
        setViewer({ ...saved, page: Math.min(result.numPages, Math.max(1, saved.page)) });
      })
      .catch((e) => active && setError(String(e)));
    return () => {
      active = false;
      void opened?.destroy();
    };
  }, [source?.data]);

  useEffect(() => {
    if (!readerOpen || !dialog.current || !reader.current) return;
    const panel = dialog.current;
    const surface = reader.current;
    panel.showModal();
    const resize = new ResizeObserver((entries) =>
      setReaderWidth(Math.max(100, entries[0].contentRect.width - 32)),
    );
    resize.observe(surface);
    return () => {
      resize.disconnect();
      if (panel.open) panel.close();
    };
  }, [readerOpen]);

  useEffect(() => {
    if (!readerOpen || !doc || !canvas.current) return;
    let active = true;
    let task: { cancel(): void } | undefined;
    doc
      .getPage(page)
      .then(async (pdfPage) => {
        if (!active || !canvas.current) return;
        const original = pdfPage.getViewport({ scale: 1 });
        setSize(original);
        const viewport = pdfPage.getViewport({
          scale: Math.min(3, window.devicePixelRatio * Math.max(1, zoom)),
        });
        const target = canvas.current;
        target.width = Math.ceil(viewport.width);
        target.height = Math.ceil(viewport.height);
        const render = pdfPage.render({ canvas: target, viewport });
        task = render;
        await render.promise;
      })
      .catch((e) => active && setError(String(e)));
    return () => {
      active = false;
      task?.cancel();
    };
  }, [doc, page, readerOpen, zoom]);

  const [ocrStatus, setOcrStatus] = useState('');
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const scanned = source?.pages?.flatMap((p, i) => (!p.text && !p.ocrComplete ? [i] : [])) ?? [];

  const allFigures = useMemo(
    () => source?.pages?.flatMap((p) => p.figures ?? []) ?? [],
    [source?.pages],
  );

  const combinedMarkdown = useMemo(
    () => combinePdfPagesMarkdown(source?.pages, source?.name),
    [source?.pages, source?.name],
  );

  const activeMarkdownSlice = useMemo(() => {
    if (!source?.pages?.length) return '';
    if (selectedMdPage === 'all') return combinedMarkdown;
    return source.pages[selectedMdPage - 1]?.text ?? '';
  }, [source?.pages, selectedMdPage, combinedMarkdown]);

  async function rebuildMarkdown() {
    if (!doc || working) return;
    setWorking(true);
    setError('');
    try {
      const pages = await preparePages(doc, true, (cur, total) => {
        setProgressText(`Converting page ${cur} of ${total} to Markdown…`);
      });
      const originalFont = detectDominantPdfFont(pages) ?? latest.current?.originalFont;
      if (mounted.current && latest.current) {
        save({ ...latest.current, pages, originalFont });
      }
    } catch (err) {
      if (mounted.current) setError(String(err));
    } finally {
      if (mounted.current) {
        setWorking(false);
        setProgressText('');
      }
    }
  }

  async function recognizeScans() {
    if (!doc || !source?.pages || working) return;
    setWorking(true);
    setError('');
    let pageNumber = 0;
    try {
      for (const index of scanned) {
        if (!mounted.current || latest.current?.data !== source.data) break;
        pageNumber = index + 1;
        setOcrStatus(`Reading page ${pageNumber} of ${doc.numPages}…`);
        const text = await recognizePage(doc, pageNumber);
        const current = latest.current;
        if (!mounted.current || current?.data !== source.data || !current.pages) break;
        const pages = current.pages.map((p, i) => (i === index ? { ...p, text, ocrComplete: true } : p));
        save({ ...current, pages });
      }
    } catch (err) {
      if (mounted.current) setError(`Page ${pageNumber}: ${String(err)}`);
    } finally {
      if (mounted.current) {
        setWorking(false);
        setOcrStatus('');
      }
    }
  }

  function changeViewer(patch: Partial<ViewerState>) {
    const next = { ...viewer, ...patch };
    setViewer(next);
    const current = latest.current;
    if (current) save({ ...current, viewer: next });
  }

  async function search(searchText: string) {
    const sequence = ++searchSequence.current;
    const needle = searchText.trim().toLocaleLowerCase();
    if (!doc || !needle) {
      setMatches(undefined);
      setSearching(false);
      return;
    }
    setSearching(true);
    try {
      const found: number[] = [];
      for (let number = 1; number <= doc.numPages; number++) {
        if (sequence !== searchSequence.current) return;
        let text = textCache.current.get(number);
        if (text === undefined) {
          text =
            latest.current?.pages?.[number - 1]?.text ||
            (await (await doc.getPage(number)).getTextContent()).items
              .map((item) => item.str ?? '')
              .join(' ');
          textCache.current.set(number, text);
        }
        if (text.toLocaleLowerCase().includes(needle)) found.push(number);
      }
      if (sequence === searchSequence.current) setMatches(found);
    } catch {
      if (sequence === searchSequence.current) setError('Could not search this document.');
    } finally {
      if (sequence === searchSequence.current) setSearching(false);
    }
  }

  function position(event: React.PointerEvent<SVGSVGElement>) {
    const transform = event.currentTarget.getScreenCTM();
    if (!transform) return [0, 0];
    const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(transform.inverse());
    return [Math.max(0, Math.min(size.width, point.x)), Math.max(0, Math.min(size.height, point.y))];
  }

  function add(mark: PdfMark) {
    const current = latest.current;
    if (current) save({ ...current, marks: [...current.marks, mark] });
  }

  async function handleCopyMarkdown(text: string) {
    if (!text.trim()) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard blocked in restricted context
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    setError('');
    try {
      await onUploadFiles(files);
    } catch (err) {
      setError(String(err));
    } finally {
      e.target.value = '';
    }
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(false);
    if (!e.dataTransfer.files?.length) return;
    setError('');
    try {
      await onUploadFiles(e.dataTransfer.files);
    } catch (err) {
      setError(String(err));
    }
  };

  const sideways = rotation % 180 !== 0;
  const scale = zoom || readerWidth / (sideways ? size.height : size.width);
  const width = size.width * scale;
  const height = size.height * scale;
  const toolsClass =
    'inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 py-1.5 text-[12px] font-medium text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] disabled:opacity-40 whitespace-nowrap shrink-0 transition-colors';
  const nearby = doc
    ? Array.from(
        { length: Math.min(doc.numPages, 7) },
        (_, index) => Math.max(1, Math.min(page - 3, doc.numPages - 6)) + index,
      )
    : [];

  const busyMessage = uploadingStatus || progressText || ocrStatus;
  const detectedFont = source?.originalFont || detectDominantPdfFont(source?.pages);

  return (
    <div
      className="flex-1 overflow-y-auto p-3.5 space-y-3.5 text-[12.5px]"
      onDragOver={(e) => {
        e.preventDefault();
        setDragActive(true);
      }}
      onDragLeave={() => setDragActive(false)}
      onDrop={handleDrop}
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".pdf,.docx,.doc,.md,.markdown,.txt,.csv,.tsv,application/pdf,image/*"
        onChange={handleFileChange}
        className="hidden"
        aria-label="Upload document or PDF"
      />

      {/* Conversion / OCR progress banner */}
      {busyMessage && (
        <div
          role="status"
          className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-[12px]"
          style={{
            backgroundColor: 'var(--accent-soft)',
            border: '1px solid var(--accent-border)',
            color: 'var(--accent)',
          }}
        >
          <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
          <span className="truncate font-medium">{busyMessage}</span>
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="rounded-lg px-3 py-2 text-[12px] text-rose-600 dark:text-rose-400"
          style={{
            backgroundColor: 'rgba(244, 63, 94, 0.08)',
            border: '1px solid rgba(244, 63, 94, 0.25)',
          }}
        >
          {error}
        </div>
      )}

      {/* EMPTY STATE: Apparent Drag & Drop Upload Zone */}
      {!source && (
        <div
          className="rounded-xl p-5 text-center transition-colors"
          style={{
            backgroundColor: dragActive ? 'var(--accent-soft)' : 'var(--bg-surface)',
            border: dragActive
              ? '1.5px dashed var(--accent)'
              : '1.5px dashed var(--border-strong)',
          }}
        >
          <div
            className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl"
            style={{
              backgroundColor: 'var(--bg-surface-subtle)',
              color: 'var(--accent)',
            }}
          >
            <Upload className="h-5 w-5" />
          </div>
          <div className="text-[13.5px] font-semibold text-[var(--text-primary)]">
            Drop or upload study files
          </div>
          <p className="mt-1 text-[11.5px] leading-relaxed text-[var(--text-muted)]">
            PDF, DOCX, DOC, MD, TXT, or CSV automatically convert to clean Markdown while preserving Unicode &amp; original fonts.
          </p>
          <button
            type="button"
            disabled={Boolean(busyMessage)}
            onClick={() => fileInputRef.current?.click()}
            className="mt-3.5 inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-[12px] font-medium transition-opacity hover:opacity-95 disabled:opacity-50 whitespace-nowrap"
            style={{
              backgroundColor: 'var(--accent)',
              color: 'var(--accent-fg)',
            }}
          >
            <FilePlus2 className="h-3.5 w-3.5" />
            Add File
          </button>
        </div>
      )}

      {/* POPULATED STATE: Active PDF Source Card + Controls + Live Markdown */}
      {source && (
        <>
          <div
            className="rounded-xl p-3 space-y-3"
            style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2.5 min-w-0">
                <div
                  className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                  style={{
                    backgroundColor: 'var(--accent-soft)',
                    color: 'var(--accent)',
                  }}
                >
                  <FileText className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <div className="truncate text-[13px] font-semibold text-[var(--text-primary)]" title={source.name}>
                    {source.name}
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-[var(--text-muted)]">
                    <span className="tabular-nums">
                      {doc?.numPages ?? source.pages?.length ?? '…'}{' '}
                      {(doc?.numPages ?? source.pages?.length) === 1 ? 'page' : 'pages'}
                    </span>
                    {source.marks.length > 0 && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="tabular-nums">{source.marks.length} marks</span>
                      </>
                    )}
                    {detectedFont && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span title={`Detected original font: ${detectedFont}`}>Font: {detectedFont}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => save(undefined)}
                aria-label="Remove attached PDF"
                title="Remove PDF"
                className="p-1.5 rounded-md text-[var(--text-muted)] opacity-60 hover:opacity-100 hover:text-rose-500 hover:bg-[var(--bg-surface-hover)] transition-all shrink-0"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setReaderOpen(true)}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-[12px] font-medium transition-opacity hover:opacity-95 whitespace-nowrap"
                style={{
                  backgroundColor: 'var(--accent)',
                  color: 'var(--accent-fg)',
                }}
              >
                <BookOpen className="h-3.5 w-3.5" />
                Open Reader
              </button>
              <button
                type="button"
                disabled={!combinedMarkdown}
                onClick={() => onInsertMarkdown(combinedMarkdown, source.name, detectedFont)}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-[12px] font-medium transition-colors hover:bg-[var(--bg-surface-hover)] disabled:opacity-45 whitespace-nowrap"
                style={{
                  backgroundColor: 'var(--bg-surface-subtle)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-primary)',
                }}
              >
                <FilePlus2 className="h-3.5 w-3.5" />
                Add / AI Order
              </button>
            </div>

            <div className="flex items-center justify-between gap-2 pt-1 border-t border-[var(--border-subtle)]">
              <button
                type="button"
                disabled={Boolean(busyMessage)}
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 text-[11.5px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors whitespace-nowrap"
              >
                <Upload className="h-3 w-3" />
                Replace or add file
              </button>
              <button
                type="button"
                disabled={working || !doc}
                onClick={rebuildMarkdown}
                className="inline-flex items-center gap-1 text-[11.5px] font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] disabled:opacity-40 transition-colors whitespace-nowrap"
                title="Re-extract structured Markdown from this PDF"
              >
                <RefreshCw className={`h-3 w-3 ${working ? 'animate-spin' : ''}`} />
                {source.pages ? 'Rebuild MD' : 'Convert to MD'}
              </button>
            </div>
          </div>

          {/* Scanned PDF OCR prompt */}
          {scanned.length > 0 && (
            <div
              className="rounded-lg p-3 text-[11.5px] space-y-2"
              style={{
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-secondary)',
              }}
            >
              <div>
                {scanned.length} image-only {scanned.length === 1 ? 'page' : 'pages'} without embedded text.
              </div>
              {isTauri() ? (
                <button
                  type="button"
                  className={toolsClass}
                  disabled={working || !doc}
                  onClick={recognizeScans}
                >
                  Recognize scanned text ({scanned.length})
                </button>
              ) : (
                <div className="text-[11px] text-[var(--text-muted)]">
                  Open this note in the desktop app to run offline OCR on scanned pages.
                </div>
              )}
            </div>
          )}

          {/* Extracted Markdown Section */}
          {source.pages && source.pages.length > 0 && (
            <div
              className="rounded-xl overflow-hidden"
              style={{
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div
                className="px-3 py-2 flex items-center justify-between gap-2"
                style={{ borderBottom: '1px solid var(--border-subtle)' }}
              >
                <div className="flex items-center gap-1 p-0.5 rounded-lg" style={{ backgroundColor: 'var(--bg-surface-subtle)' }}>
                  <button
                    type="button"
                    onClick={() => setMdViewMode('preview')}
                    className="px-2 py-1 rounded-md text-[11px] font-medium transition-colors"
                    style={{
                      backgroundColor: mdViewMode === 'preview' ? 'var(--bg-surface)' : 'transparent',
                      color: mdViewMode === 'preview' ? 'var(--text-primary)' : 'var(--text-muted)',
                    }}
                  >
                    Markdown
                  </button>
                  <button
                    type="button"
                    onClick={() => setMdViewMode('raw')}
                    className="px-2 py-1 rounded-md text-[11px] font-medium transition-colors"
                    style={{
                      backgroundColor: mdViewMode === 'raw' ? 'var(--bg-surface)' : 'transparent',
                      color: mdViewMode === 'raw' ? 'var(--text-primary)' : 'var(--text-muted)',
                    }}
                  >
                    Source
                  </button>
                </div>

                <div className="flex items-center gap-1.5">
                  {source.pages.length > 1 && (
                    <select
                      aria-label="Select extracted Markdown page"
                      value={selectedMdPage === 'all' ? 'all' : String(selectedMdPage)}
                      onChange={(e) =>
                        setSelectedMdPage(e.target.value === 'all' ? 'all' : Number(e.target.value))
                      }
                      className="h-7 rounded-md px-2 text-[11px]"
                      style={{
                        backgroundColor: 'var(--bg-surface-subtle)',
                        border: '1px solid var(--border-subtle)',
                        color: 'var(--text-primary)',
                      }}
                    >
                      <option value="all">All ({source.pages.length})</option>
                      {source.pages.map((_, idx) => (
                        <option key={idx} value={String(idx + 1)}>
                          Page {idx + 1}
                        </option>
                      ))}
                    </select>
                  )}
                  <button
                    type="button"
                    onClick={() => void handleCopyMarkdown(activeMarkdownSlice)}
                    disabled={!activeMarkdownSlice}
                    title="Copy Markdown"
                    aria-label="Copy extracted Markdown"
                    className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] disabled:opacity-40 transition-colors"
                  >
                    {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>

              <div
                className="p-3 max-h-[380px] overflow-y-auto"
                tabIndex={0}
                onMouseUp={e=>onSelectExcerpt?.(excerptFromSelection(window.getSelection(),e.currentTarget,`${source.name} — ${selectedMdPage === 'all' ? 'extracted text' : `page ${selectedMdPage}`}`))}
                onKeyUp={e=>onSelectExcerpt?.(excerptFromSelection(window.getSelection(),e.currentTarget,`${source.name} — ${selectedMdPage === 'all' ? 'extracted text' : `page ${selectedMdPage}`}`))}
                style={{ '--note-font-family': noteFontFamily } as React.CSSProperties}
              >
                {activeMarkdownSlice ? (
                  mdViewMode === 'preview' ? (
                    <div className="note-markdown text-[12.5px]">
                      <AssistantMarkdown
                      noteDiagrams
                        text={activeMarkdownSlice}
                        figures={allFigures}
                        dirAuto
                      />
                    </div>
                  ) : (
                    <pre
                      dir="auto"
                      className="whitespace-pre-wrap break-words text-[11.5px] leading-relaxed text-[var(--text-secondary)]"
                      style={{ fontFamily: noteFontFamily }}
                    >
                      {activeMarkdownSlice}
                    </pre>
                  )
                ) : (
                  <p className="text-[12px] text-[var(--text-muted)]">
                    No selectable text found on {selectedMdPage === 'all' ? 'this document' : `page ${selectedMdPage}`}.
                  </p>
                )}
              </div>

              {selectedMdPage !== 'all' && source.pages[selectedMdPage - 1]?.image && (
                <details className="border-t border-[var(--border-subtle)] px-3 py-2 text-[11.5px] text-[var(--text-muted)]">
                  <summary className="cursor-pointer font-medium hover:text-[var(--text-primary)]">
                    Original page {selectedMdPage} image
                  </summary>
                  <img
                    src={source.pages[selectedMdPage - 1].image}
                    alt={`Original page ${selectedMdPage}`}
                    className="mt-2 w-full rounded-lg border border-[var(--border-subtle)]"
                  />
                </details>
              )}
            </div>
          )}

          {/* FULL PDF READER MODAL */}
          {readerOpen && (
            <dialog
              ref={dialog}
              aria-label="PDF reader"
              onClose={() => {
                setReaderOpen(false);
                setPendingTextPoint(null);
                searchSequence.current++;
                setSearching(false);
              }}
              className="fixed inset-0 m-auto h-[min(92dvh,1000px)] w-[min(96vw,1280px)] overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] backdrop:bg-black/60"
            >
              <div className="flex h-full flex-col">
                <header className="flex flex-wrap items-center gap-2 border-b border-[var(--border-subtle)] px-4 py-2.5">
                  <strong className="mr-auto max-w-64 truncate text-[13.5px] font-semibold">
                    {source.name}
                  </strong>
                  <button
                    type="button"
                    className={toolsClass}
                    disabled={page <= 1}
                    onClick={() => changeViewer({ page: page - 1 })}
                  >
                    <ChevronLeft className="h-3.5 w-3.5" /> Prev
                  </button>
                  <label className="flex items-center gap-1.5 text-[12px] text-[var(--text-secondary)]">
                    Page
                    <select
                      aria-label="Page"
                      className={toolsClass}
                      value={page}
                      onChange={(event) => changeViewer({ page: Number(event.target.value) })}
                    >
                      {Array.from({ length: doc?.numPages ?? 1 }, (_, index) => (
                        <option key={index} value={index + 1}>
                          {index + 1}
                        </option>
                      ))}
                    </select>
                    <span className="tabular-nums">/ {doc?.numPages ?? '…'}</span>
                  </label>
                  <button
                    type="button"
                    className={toolsClass}
                    disabled={!doc || page >= doc.numPages}
                    onClick={() => changeViewer({ page: page + 1 })}
                  >
                    Next <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                  <select
                    aria-label="PDF zoom"
                    className={toolsClass}
                    value={zoom}
                    onChange={(event) => changeViewer({ zoom: Number(event.target.value) })}
                  >
                    <option value={0}>Fit width</option>
                    {[0.75, 1, 1.25, 1.5, 2].map((value) => (
                      <option key={value} value={value}>
                        {value * 100}%
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className={toolsClass}
                    onClick={() => changeViewer({ rotation: (rotation + 90) % 360 })}
                  >
                    <RotateCw className="h-3.5 w-3.5" /> Rotate
                  </button>
                  <button
                    type="button"
                    className={toolsClass}
                    onClick={() => dialog.current?.close()}
                  >
                    <X className="h-3.5 w-3.5" /> Close
                  </button>
                </header>

                <div className="flex flex-wrap items-center gap-2 border-b border-[var(--border-subtle)] px-4 py-2">
                  <div
                    className="inline-flex items-center gap-0.5 rounded-lg p-0.5"
                    style={{ backgroundColor: 'var(--bg-surface-subtle)', border: '1px solid var(--border-subtle)' }}
                  >
                    {[
                      { id: 'ink' as const, label: 'Pen', icon: PenTool },
                      { id: 'highlight' as const, label: 'Highlight', icon: Highlighter },
                      { id: 'text' as const, label: 'Text', icon: Type },
                    ].map((t) => {
                      const Icon = t.icon;
                      const active = tool === t.id;
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => {
                            setTool(t.id);
                            setPendingTextPoint(null);
                          }}
                          className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-[11.5px] font-medium transition-colors"
                          style={{
                            backgroundColor: active ? 'var(--bg-surface)' : 'transparent',
                            color: active ? 'var(--text-primary)' : 'var(--text-muted)',
                          }}
                        >
                          <Icon className="h-3.5 w-3.5" />
                          {t.label}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    className={toolsClass}
                    disabled={!source.marks.length}
                    onClick={() => save({ ...source, marks: source.marks.slice(0, -1) })}
                  >
                    <Undo2 className="h-3.5 w-3.5" /> Undo
                  </button>

                  <form
                    className="flex min-w-0 flex-wrap items-center gap-1.5"
                    onSubmit={(event) => {
                      event.preventDefault();
                      void search(query);
                    }}
                  >
                    <div className="relative">
                      <Search className="h-3.5 w-3.5 text-[var(--text-muted)] absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="search"
                        aria-label="Find in PDF"
                        placeholder="Find in PDF…"
                        value={query}
                        className="h-8 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] pl-8 pr-2.5 text-[12px] text-[var(--text-primary)]"
                        onChange={(event) => {
                          searchSequence.current++;
                          setSearching(false);
                          setMatches(undefined);
                          setQuery(event.target.value);
                        }}
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={!doc || searching || !query.trim()}
                      className={toolsClass}
                    >
                      {searching ? 'Searching…' : 'Search'}
                    </button>
                  </form>

                  {matches &&
                    (matches.length ? (
                      <select
                        className={toolsClass}
                        aria-label="Search results"
                        value={matches.includes(page) ? page : ''}
                        onChange={(event) => changeViewer({ page: Number(event.target.value) })}
                      >
                        <option value="" disabled>
                          {matches.length} matching {matches.length === 1 ? 'page' : 'pages'}
                        </option>
                        {matches.map((number) => (
                          <option key={number} value={number}>
                            Page {number}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <p role="status" className="text-[12px] text-[var(--text-muted)]">
                        No matching text.
                      </p>
                    ))}

                  {source.pages && (
                    <button
                      type="button"
                      className={`${toolsClass} ml-auto`}
                      aria-pressed={showMarkdown}
                      onClick={() => setShowMarkdown((value) => !value)}
                    >
                      {showMarkdown ? 'Hide Markdown' : 'Show Markdown'}
                    </button>
                  )}
                </div>

                {/* Inline text annotation bar (replaces window.prompt safely) */}
                {pendingTextPoint && (
                  <form
                    className="flex items-center gap-2 border-b border-[var(--border-subtle)] px-4 py-2"
                    style={{ backgroundColor: 'var(--bg-surface-subtle)' }}
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (pendingTextValue.trim()) {
                        add({
                          kind: 'text',
                          page,
                          points: [pendingTextPoint],
                          text: pendingTextValue.trim(),
                        });
                      }
                      setPendingTextPoint(null);
                      setPendingTextValue('');
                    }}
                  >
                    <span className="text-[12px] font-medium text-[var(--text-secondary)] whitespace-nowrap">
                      Text annotation:
                    </span>
                    <input
                      autoFocus
                      dir="auto"
                      type="text"
                      value={pendingTextValue}
                      onChange={(e) => setPendingTextValue(e.target.value)}
                      placeholder="Type annotation note…"
                      className="min-w-0 flex-1 h-8 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 text-[12px] text-[var(--text-primary)]"
                    />
                    <button
                      type="submit"
                      className="rounded-lg px-3 py-1.5 text-[12px] font-medium"
                      style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' }}
                    >
                      Place Text
                    </button>
                    <button
                      type="button"
                      className={toolsClass}
                      onClick={() => {
                        setPendingTextPoint(null);
                        setPendingTextValue('');
                      }}
                    >
                      Cancel
                    </button>
                  </form>
                )}

                <div className="flex min-h-0 flex-1">
                  {doc && (
                    <nav
                      aria-label="Page thumbnails"
                      className="hidden w-28 shrink-0 overflow-y-auto border-r border-[var(--border-subtle)] p-2 sm:block"
                    >
                      {nearby.map((number) => (
                        <button
                          type="button"
                          key={number}
                          aria-current={number === page ? 'page' : undefined}
                          className="my-1 grid w-full justify-items-center gap-1 rounded-lg border border-[var(--border-subtle)] p-2 text-[11px] aria-[current=page]:border-[var(--accent)]"
                          onClick={() => changeViewer({ page: number })}
                        >
                          <PageThumbnail doc={doc} page={number} />
                          <span className="tabular-nums">Page {number}</span>
                        </button>
                      ))}
                    </nav>
                  )}

                  <div ref={reader} className="min-w-0 flex-1 overflow-auto bg-[var(--bg-canvas)] p-4">
                    <div
                      className="relative mx-auto"
                      style={{ width: sideways ? height : width, height: sideways ? width : height }}
                    >
                      <div
                        className="absolute left-1/2 top-1/2 bg-white shadow-sm"
                        style={{
                          width,
                          height,
                          transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
                        }}
                      >
                        <canvas className="block size-full" ref={canvas} />
                        <svg
                          className="absolute inset-0 w-full h-full touch-none"
                          viewBox={`0 0 ${size.width} ${size.height}`}
                          onPointerDown={(e) => {
                            const pt = position(e);
                            if (tool === 'text') {
                              setPendingTextPoint(pt);
                              setPendingTextValue('');
                              return;
                            }
                            e.currentTarget.setPointerCapture(e.pointerId);
                            points.current = [pt];
                            setStroke([pt]);
                          }}
                          onPointerMove={(e) => {
                            if (points.current.length) {
                              points.current.push(position(e));
                              setStroke([...points.current]);
                            }
                          }}
                          onPointerCancel={() => {
                            points.current = [];
                            setStroke([]);
                          }}
                          onPointerUp={() => {
                            if (points.current.length) {
                              add({ kind: tool, page, points: points.current });
                              points.current = [];
                              setStroke([]);
                            }
                          }}
                        >
                          {[...source.marks.filter((m) => m.page === page), { page, kind: tool, points: stroke, text: '' }]
                            .filter((m) => m.points.length)
                            .map((m, i) =>
                              m.kind === 'text' ? (
                                <text key={i} x={m.points[0][0]} y={m.points[0][1]} fill="#273998" fontSize="14">
                                  {m.text}
                                </text>
                              ) : (
                                <polyline
                                  key={i}
                                  points={m.points.map((p) => p.join(',')).join(' ')}
                                  fill="none"
                                  stroke={m.kind === 'ink' ? '#2843ac' : '#ffd025'}
                                  opacity={m.kind === 'ink' ? 1 : 0.45}
                                  strokeWidth={m.kind === 'ink' ? 2 : 15}
                                  strokeLinecap="round"
                                />
                              ),
                            )}
                        </svg>
                      </div>
                    </div>
                  </div>

                  {showMarkdown && source.pages && (
                    <aside
                      className="w-1/3 min-w-64 max-w-md shrink-0 flex flex-col border-l border-[var(--border-subtle)] bg-[var(--bg-surface)]"
                      style={{ '--note-font-family': noteFontFamily } as React.CSSProperties}
                    >
                      <div className="flex items-center justify-between gap-2 border-b border-[var(--border-subtle)] px-3.5 py-2.5">
                        <h3 className="text-[12.5px] font-semibold text-[var(--text-primary)]">
                          Page {page} Markdown
                        </h3>
                        <button
                          type="button"
                          disabled={!source.pages[page - 1]?.text}
                          onClick={() => {
                            const pageMd = source.pages?.[page - 1]?.text;
                            if (pageMd) {
                              onInsertMarkdown(pageMd, `${source.name} — Page ${page}`, detectedFont);
                            }
                          }}
                          className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-[11.5px] font-medium disabled:opacity-40"
                          style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' }}
                        >
                          <FilePlus2 className="h-3 w-3" /> Insert Page
                        </button>
                      </div>
                      <div className="flex-1 overflow-auto p-4">
                        {source.pages[page - 1]?.text ? (
                          <div className="note-markdown text-[13px]">
                            <AssistantMarkdown
                      noteDiagrams
                              text={source.pages[page - 1].text}
                              figures={source.pages[page - 1].figures}
                              dirAuto
                            />
                          </div>
                        ) : (
                          <p className="text-[12px] text-[var(--text-muted)]">
                            No text is available for this page.
                          </p>
                        )}
                      </div>
                    </aside>
                  )}
                </div>
              </div>
            </dialog>
          )}
        </>
      )}
    </div>
  );
}
