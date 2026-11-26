import React, { useEffect, useMemo, useState } from 'react';
import {
  Check,
  Copy,
  Eye,
  FilePlus2,
  FileText,
  ImageOff,
  Languages,
  Loader2,
  Pencil,
  RotateCcw,
  Square,
  Wand2,
  X,
} from 'lucide-react';
import AssistantMarkdown from '../assistant/AssistantMarkdown';
import { useAssistant } from '../assistant/AssistantContext';
import type { NoteAttachment, NoteFolder, NoteItem, Subject } from '../types/studyflow';
import type { PdfSource } from './pdf';
import type { PdfFigure } from './pdfMarkdown';
import { detectUnicodeScripts, ensureUnicodeFontsForText, resolveNoteFontFamily } from './unicodeFonts';

export interface PendingMarkdownImport {
  sourceLabel: string;
  suggestedTitle: string;
  markdown: string;
  originalFont?: string;
  attachments?: NoteAttachment[];
  pdfSource?: PdfSource;
  figures?: PdfFigure[];
}

export type MarkdownDestination =
  | {
      mode: 'new_note';
      title: string;
      subjectId: string;
      folderId: string;
      markdown: string;
    }
  | {
      mode: 'existing_note';
      noteId: string;
      placement: 'append' | 'replace';
      markdown: string;
    }
  | {
      mode: 'clipboard';
      markdown: string;
    };

interface MarkdownImportModalProps {
  pending: PendingMarkdownImport;
  notes: NoteItem[];
  activeNoteId?: string;
  subjects: Subject[];
  folders: NoteFolder[];
  defaultSubjectId: string;
  defaultFolderId: string;
  onConfirm: (destination: MarkdownDestination) => Promise<void> | void;
  onClose: () => void;
}

const TARGET_LANGUAGES = [
  { value: 'auto', label: 'Auto-detect & convert to proper language' },
  { value: 'English', label: 'Convert to English' },
  { value: 'Sinhala', label: 'Convert to Sinhala (සිංහල)' },
  { value: 'Tamil', label: 'Convert to Tamil (தமிழ்)' },
  { value: 'Hindi', label: 'Convert to Hindi (हिन्दी)' },
  { value: 'Arabic', label: 'Convert to Arabic (العربية)' },
  { value: 'Japanese', label: 'Convert to Japanese (日本語)' },
  { value: 'Chinese', label: 'Convert to Chinese (中文)' },
  { value: 'French', label: 'Convert to French' },
  { value: 'Spanish', label: 'Convert to Spanish' },
];

export const MarkdownImportModal: React.FC<MarkdownImportModalProps> = ({
  pending,
  notes,
  activeNoteId,
  subjects,
  folders,
  defaultSubjectId,
  defaultFolderId,
  onConfirm,
  onClose,
}) => {
  const { restructureMarkdown, stop, cooldown } = useAssistant();

  const initialScripts = useMemo(() => detectUnicodeScripts(pending.markdown), [pending.markdown]);
  const availableFigures = useMemo(
    () => (pending.figures ?? []).filter((fig) => pending.markdown.includes(fig.id)),
    [pending.figures, pending.markdown],
  );

  const [markdown, setMarkdown] = useState(pending.markdown);
  const [hasRestructured, setHasRestructured] = useState(false);
  const [restructuring, setRestructuring] = useState(false);
  const [aiInstructions, setAiInstructions] = useState('');
  const [normalizeLanguage, setNormalizeLanguage] = useState(initialScripts.length > 0);
  const [targetLanguage, setTargetLanguage] = useState('auto');
  const [filterUnwantedImages, setFilterUnwantedImages] = useState(true);
  const [aiMeta, setAiMeta] = useState<{
    detectedLanguage?: string;
    removedFigures: string[];
    keptFigures: string[];
  } | null>(null);
  const [aiError, setAiError] = useState('');
  const [previewTab, setPreviewTab] = useState<'preview' | 'source'>('preview');
  const [quickCopied, setQuickCopied] = useState(false);

  const [destMode, setDestMode] = useState<'new_note' | 'existing_note' | 'clipboard'>(
    notes.length > 0 ? 'existing_note' : 'new_note',
  );
  const [newTitle, setNewTitle] = useState(pending.suggestedTitle || 'Imported Study Note');
  const [newSubjectId, setNewSubjectId] = useState(defaultSubjectId);
  const [newFolderId, setNewFolderId] = useState(
    defaultFolderId === 'fld-all' ? folders[0]?.id ?? 'fld-all' : defaultFolderId,
  );
  const [targetNoteId, setTargetNoteId] = useState(activeNoteId ?? notes[0]?.id ?? '');
  const [placement, setPlacement] = useState<'append' | 'replace'>('append');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !restructuring) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, restructuring]);

  const detectedScripts = useMemo(() => detectUnicodeScripts(markdown), [markdown]);
  useEffect(() => {
    ensureUnicodeFontsForText(markdown);
  }, [markdown]);

  const fontFamily = useMemo(
    () => resolveNoteFontFamily('original', pending.originalFont, markdown),
    [pending.originalFont, markdown],
  );

  const wordCount = useMemo(() => {
    const trimmed = markdown.trim();
    return trimmed ? trimmed.split(/\s+/).filter(Boolean).length : 0;
  }, [markdown]);

  const handleRestructure = async () => {
    if (restructuring || !markdown.trim()) return;
    setRestructuring(true);
    setAiError('');
    const sourceBeforeRun = markdown;
    try {
      const result = await restructureMarkdown(sourceBeforeRun, {
        instructions: aiInstructions,
        normalizeLanguage,
        targetLanguage,
        filterUnwantedImages,
        figures: pending.figures,
        onStream: (partial) => {
          if (partial) setMarkdown(partial);
        },
        onMeta: (meta) => setAiMeta(meta),
      });
      setMarkdown(result.markdown);
      setAiMeta({
        detectedLanguage: result.detectedLanguage,
        removedFigures: result.removedFigures,
        keptFigures: result.keptFigures,
      });
      setHasRestructured(true);
    } catch (err) {
      setMarkdown(sourceBeforeRun);
      setAiError(err instanceof Error ? err.message : String(err));
    } finally {
      setRestructuring(false);
    }
  };

  const handleRevert = () => {
    setMarkdown(pending.markdown);
    setHasRestructured(false);
    setAiMeta(null);
    setAiError('');
  };

  const handleQuickCopy = async () => {
    if (!markdown.trim()) return;
    try {
      await navigator.clipboard.writeText(markdown);
      setQuickCopied(true);
      window.setTimeout(() => setQuickCopied(false), 1800);
    } catch {
      setAiError('Clipboard access was blocked by the browser.');
    }
  };

  const handleConfirm = async () => {
    if (!markdown.trim() || restructuring) return;
    if (destMode === 'new_note') {
      await onConfirm({
        mode: 'new_note',
        title: newTitle.trim() || pending.suggestedTitle || 'Imported Study Note',
        subjectId: newSubjectId,
        folderId: newFolderId,
        markdown,
      });
    } else if (destMode === 'existing_note') {
      const chosenId = targetNoteId || activeNoteId || notes[0]?.id;
      if (!chosenId) return;
      await onConfirm({
        mode: 'existing_note',
        noteId: chosenId,
        placement,
        markdown,
      });
    } else {
      await onConfirm({
        mode: 'clipboard',
        markdown,
      });
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/55 backdrop-blur-[2px]"
      onClick={() => {
        if (!restructuring) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Review and add Markdown"
        className="w-full max-w-3xl max-h-[92vh] rounded-2xl flex flex-col overflow-hidden"
        style={{
          backgroundColor: 'var(--bg-elevated)',
          border: '1px solid var(--border-subtle)',
          boxShadow: 'var(--shadow-floating)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          className="px-5 py-3.5 shrink-0 flex items-start justify-between gap-3"
          style={{ borderBottom: '1px solid var(--border-subtle)' }}
        >
          <div className="min-w-0">
            <h2 className="font-display text-[15.5px] font-semibold text-[var(--text-primary)]">
              Review &amp; Add Markdown
            </h2>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11.5px] text-[var(--text-muted)]">
              <span className="truncate max-w-[260px] font-medium text-[var(--text-secondary)]">
                {pending.sourceLabel}
              </span>
              <span aria-hidden="true">·</span>
              <span className="tabular-nums">
                {wordCount} {wordCount === 1 ? 'word' : 'words'}
              </span>
              {pending.originalFont && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>Font: {pending.originalFont}</span>
                </>
              )}
              {detectedScripts.length > 0 && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>Unicode: {detectedScripts.map((s) => s.label).join(', ')}</span>
                </>
              )}
            </div>
          </div>
          <button
            type="button"
            disabled={restructuring}
            onClick={onClose}
            aria-label="Close review dialog"
            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] disabled:opacity-40 transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 min-h-0 overflow-y-auto p-5 space-y-4">
          {/* On-Demand Gemini AI Restructuring & Unicode Language Panel */}
          <div
            className="rounded-xl p-3.5 space-y-3"
            style={{
              backgroundColor: 'var(--bg-surface-subtle)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0 flex-wrap">
                <div
                  className="inline-flex items-center gap-0.5 p-0.5 rounded-lg"
                  style={{
                    backgroundColor: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setPreviewTab('preview')}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11.5px] font-medium transition-colors whitespace-nowrap"
                    style={{
                      backgroundColor: previewTab === 'preview' ? 'var(--accent-soft)' : 'transparent',
                      color: previewTab === 'preview' ? 'var(--accent)' : 'var(--text-muted)',
                    }}
                  >
                    <Eye className="w-3.5 h-3.5" /> Preview
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewTab('source')}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11.5px] font-medium transition-colors whitespace-nowrap"
                    style={{
                      backgroundColor: previewTab === 'source' ? 'var(--accent-soft)' : 'transparent',
                      color: previewTab === 'source' ? 'var(--accent)' : 'var(--text-muted)',
                    }}
                  >
                    <Pencil className="w-3.5 h-3.5" /> Edit Source
                  </button>
                </div>

                {hasRestructured && !restructuring && (
                  <div className="flex flex-wrap items-center gap-x-2 text-[11.5px] text-[var(--text-secondary)]">
                    <span className="inline-flex items-center gap-1 font-medium text-emerald-600 dark:text-emerald-400">
                      <Check className="w-3.5 h-3.5" /> AI ordered
                    </span>
                    {aiMeta?.detectedLanguage && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span>Language: {aiMeta.detectedLanguage}</span>
                      </>
                    )}
                    {aiMeta && aiMeta.removedFigures.length > 0 && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="tabular-nums">
                          Removed {aiMeta.removedFigures.length} unwanted{' '}
                          {aiMeta.removedFigures.length === 1 ? 'image' : 'images'}
                        </span>
                      </>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {hasRestructured && !restructuring && (
                  <button
                    type="button"
                    onClick={handleRevert}
                    className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11.5px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] transition-colors whitespace-nowrap"
                    style={{
                      backgroundColor: 'var(--bg-surface)',
                      border: '1px solid var(--border-subtle)',
                    }}
                  >
                    <RotateCcw className="w-3 h-3" /> Revert Original
                  </button>
                )}

                {restructuring ? (
                  <button
                    type="button"
                    onClick={() => stop()}
                    className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-medium text-rose-600 dark:text-rose-400 transition-colors whitespace-nowrap"
                    style={{
                      backgroundColor: 'var(--bg-surface)',
                      border: '1px solid rgba(244, 63, 94, 0.35)',
                    }}
                  >
                    <Square className="w-3 h-3 fill-current" /> Stop AI
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={!markdown.trim() || cooldown > 0}
                    onClick={handleRestructure}
                    className="inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-[12px] font-medium transition-opacity hover:opacity-95 disabled:opacity-45 whitespace-nowrap"
                    style={{
                      backgroundColor: 'var(--accent)',
                      color: 'var(--accent-fg)',
                    }}
                  >
                    <Wand2 className="w-3.5 h-3.5" />
                    {cooldown > 0
                      ? `Retry in ${cooldown}s`
                      : hasRestructured
                        ? 'Restructure Again'
                        : 'Restructure with Gemini'}
                  </button>
                )}
              </div>
            </div>

            {/* Smart AI Options: Unicode Language Conversion + Unwanted Image Filtering */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-0.5">
              <div
                className="rounded-lg px-3 py-2 space-y-2"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={normalizeLanguage}
                    disabled={restructuring}
                    onChange={(e) => setNormalizeLanguage(e.target.checked)}
                    className="rounded accent-[var(--accent)]"
                  />
                  <Languages className="w-3.5 h-3.5 text-[var(--accent)] shrink-0" />
                  <span className="text-[12px] font-medium text-[var(--text-primary)]">
                    Recognize Unicode &amp; convert to proper language
                  </span>
                </label>
                {normalizeLanguage && (
                  <select
                    aria-label="Target language conversion mode"
                    value={targetLanguage}
                    disabled={restructuring}
                    onChange={(e) => setTargetLanguage(e.target.value)}
                    className="w-full h-7 rounded-md px-2 text-[11.5px]"
                    style={{
                      backgroundColor: 'var(--bg-surface-subtle)',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--text-primary)',
                    }}
                  >
                    {TARGET_LANGUAGES.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div
                className="rounded-lg px-3 py-2 flex flex-col justify-center gap-1"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={filterUnwantedImages}
                    disabled={restructuring}
                    onChange={(e) => setFilterUnwantedImages(e.target.checked)}
                    className="rounded accent-[var(--accent)]"
                  />
                  <ImageOff className="w-3.5 h-3.5 text-[var(--accent)] shrink-0" />
                  <span className="text-[12px] font-medium text-[var(--text-primary)]">
                    Remove unwanted images (footers, headers, logos)
                  </span>
                </label>
                <div className="pl-6 text-[11px] text-[var(--text-muted)]">
                  {availableFigures.length > 0
                    ? `Inspects ${availableFigures.length} extracted ${availableFigures.length === 1 ? 'image' : 'images'} — keeps diagrams & charts.`
                    : 'Keeps study diagrams & charts while dropping boilerplate graphics.'}
                </div>
              </div>
            </div>

            {/* Optional custom ordering instructions */}
            <input
              type="text"
              dir="auto"
              value={aiInstructions}
              disabled={restructuring}
              onChange={(e) => setAiInstructions(e.target.value)}
              placeholder="Optional ordering instruction (e.g. group by chapter, fix multi-column layout, keep equations)…"
              aria-label="Optional AI restructuring instruction"
              className="w-full h-8 rounded-lg px-2.5 text-[12px]"
              style={{
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-primary)',
              }}
            />

            {restructuring && (
              <div
                role="status"
                className="flex items-center gap-2 text-[11.5px] font-medium"
                style={{ color: 'var(--accent)' }}
              >
                <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                <span>
                  Gemini is ordering sections
                  {normalizeLanguage ? ', recognizing & fixing Unicode language' : ''}
                  {filterUnwantedImages && availableFigures.length > 0
                    ? ', and filtering header/footer images'
                    : ''}
                  …
                </span>
              </div>
            )}

            {aiError && (
              <div
                role="alert"
                className="rounded-lg px-3 py-2 text-[11.5px] text-rose-600 dark:text-rose-400"
                style={{
                  backgroundColor: 'rgba(244, 63, 94, 0.08)',
                  border: '1px solid rgba(244, 63, 94, 0.25)',
                }}
              >
                {aiError}
              </div>
            )}
          </div>

          {/* Markdown Preview / Editable Source Box */}
          <div
            className="rounded-xl overflow-hidden"
            style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              '--note-font-family': fontFamily,
            } as React.CSSProperties}
          >
            {previewTab === 'preview' ? (
              <div className="p-4 max-h-[40vh] min-h-[180px] overflow-y-auto">
                {markdown.trim() ? (
                  <div className="note-markdown text-[13.5px]">
                    <AssistantMarkdown
                      noteDiagrams
                      text={markdown}
                      figures={pending.figures}
                      allowDataImages
                      dirAuto
                    />
                  </div>
                ) : (
                  <p className="text-[12.5px] text-[var(--text-muted)]">No Markdown content.</p>
                )}
              </div>
            ) : (
              <textarea
                dir="auto"
                value={markdown}
                disabled={restructuring}
                onChange={(e) => setMarkdown(e.target.value)}
                aria-label="Edit imported Markdown source"
                className="w-full h-[40vh] min-h-[180px] resize-y bg-transparent p-4 text-[13px] leading-relaxed text-[var(--text-primary)] focus:outline-none"
                style={{ fontFamily }}
              />
            )}
          </div>

          {/* Destination Chooser */}
          <div className="space-y-3">
            <div className="text-[12.5px] font-semibold text-[var(--text-primary)]">
              Where should this Markdown be added?
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {[
                {
                  id: 'new_note' as const,
                  label: 'New Note',
                  desc: 'Create a fresh note',
                  icon: FilePlus2,
                },
                {
                  id: 'existing_note' as const,
                  label: 'Existing Note',
                  desc: 'Append or replace',
                  icon: FileText,
                  disabled: notes.length === 0,
                },
                {
                  id: 'clipboard' as const,
                  label: 'Copy to Clipboard',
                  desc: 'Copy without saving',
                  icon: Copy,
                },
              ].map((opt) => {
                const Icon = opt.icon;
                const active = destMode === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    disabled={opt.disabled}
                    onClick={() => setDestMode(opt.id)}
                    className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-left transition-colors disabled:opacity-40"
                    style={{
                      backgroundColor: active ? 'var(--accent-soft)' : 'var(--bg-surface)',
                      border: active
                        ? '1.5px solid var(--accent)'
                        : '1px solid var(--border-subtle)',
                    }}
                  >
                    <Icon
                      className="w-4 h-4 shrink-0"
                      style={{ color: active ? 'var(--accent)' : 'var(--text-muted)' }}
                    />
                    <div className="min-w-0">
                      <div
                        className="text-[12.5px] font-semibold truncate"
                        style={{ color: active ? 'var(--accent)' : 'var(--text-primary)' }}
                      >
                        {opt.label}
                      </div>
                      <div className="text-[11px] text-[var(--text-muted)] truncate">
                        {opt.desc}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Destination-specific fields */}
            {destMode === 'new_note' && (
              <div
                className="rounded-xl p-3.5 grid grid-cols-1 sm:grid-cols-2 gap-3"
                style={{
                  backgroundColor: 'var(--bg-surface-subtle)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <div className="sm:col-span-2 space-y-1">
                  <label className="block text-[11.5px] font-medium text-[var(--text-secondary)]">
                    New Note Title
                  </label>
                  <input
                    type="text"
                    dir="auto"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="Enter note title…"
                    className="w-full h-9 rounded-lg px-3 text-[12.5px]"
                    style={{
                      backgroundColor: 'var(--bg-surface)',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--text-primary)',
                      fontFamily,
                    }}
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[11.5px] font-medium text-[var(--text-secondary)]">
                    Subject
                  </label>
                  <select
                    value={newSubjectId}
                    onChange={(e) => setNewSubjectId(e.target.value)}
                    className="w-full h-9 rounded-lg px-2.5 text-[12.5px]"
                    style={{
                      backgroundColor: 'var(--bg-surface)',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--text-primary)',
                    }}
                  >
                    <option value="">No subject</option>
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.code} — {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="block text-[11.5px] font-medium text-[var(--text-secondary)]">
                    Folder
                  </label>
                  <select
                    value={newFolderId}
                    onChange={(e) => setNewFolderId(e.target.value)}
                    className="w-full h-9 rounded-lg px-2.5 text-[12.5px]"
                    style={{
                      backgroundColor: 'var(--bg-surface)',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--text-primary)',
                    }}
                  >
                    {folders.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {destMode === 'existing_note' && notes.length > 0 && (
              <div
                className="rounded-xl p-3.5 grid grid-cols-1 sm:grid-cols-2 gap-3"
                style={{
                  backgroundColor: 'var(--bg-surface-subtle)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <div className="space-y-1">
                  <label className="block text-[11.5px] font-medium text-[var(--text-secondary)]">
                    Select Note
                  </label>
                  <select
                    value={targetNoteId}
                    onChange={(e) => setTargetNoteId(e.target.value)}
                    className="w-full h-9 rounded-lg px-2.5 text-[12.5px]"
                    style={{
                      backgroundColor: 'var(--bg-surface)',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--text-primary)',
                    }}
                  >
                    {notes.map((n) => (
                      <option key={n.id} value={n.id}>
                        {n.title || 'Untitled Note'}
                        {n.id === activeNoteId ? ' (Current)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="block text-[11.5px] font-medium text-[var(--text-secondary)]">
                    Placement
                  </label>
                  <div
                    className="grid grid-cols-2 gap-1 p-1 rounded-lg h-9"
                    style={{
                      backgroundColor: 'var(--bg-surface)',
                      border: '1px solid var(--border-subtle)',
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setPlacement('append')}
                      className="rounded-md text-[12px] font-medium transition-colors"
                      style={{
                        backgroundColor: placement === 'append' ? 'var(--accent-soft)' : 'transparent',
                        color: placement === 'append' ? 'var(--accent)' : 'var(--text-muted)',
                      }}
                    >
                      Append
                    </button>
                    <button
                      type="button"
                      onClick={() => setPlacement('replace')}
                      className="rounded-md text-[12px] font-medium transition-colors"
                      style={{
                        backgroundColor: placement === 'replace' ? 'var(--accent-soft)' : 'transparent',
                        color: placement === 'replace' ? 'var(--accent)' : 'var(--text-muted)',
                      }}
                    >
                      Replace
                    </button>
                  </div>
                </div>
              </div>
            )}

            {destMode === 'clipboard' && (
              <div
                className="rounded-xl px-3.5 py-2.5 text-[12px] text-[var(--text-secondary)]"
                style={{
                  backgroundColor: 'var(--bg-surface-subtle)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                The Markdown above will be copied directly to your clipboard without creating or modifying any note.
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div
          className="px-5 py-3.5 shrink-0 flex flex-wrap items-center justify-between gap-2"
          style={{ borderTop: '1px solid var(--border-subtle)' }}
        >
          <button
            type="button"
            disabled={!markdown.trim() || restructuring}
            onClick={() => void handleQuickCopy()}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-[12px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] disabled:opacity-40 transition-colors whitespace-nowrap"
            style={{ border: '1px solid var(--border-subtle)' }}
          >
            {quickCopied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-500" /> Copied
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" /> Copy Markdown
              </>
            )}
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={restructuring}
              onClick={onClose}
              className="rounded-lg px-3.5 py-2 text-[12px] font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)] disabled:opacity-40 transition-colors whitespace-nowrap"
              style={{ border: '1px solid var(--border-subtle)' }}
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!markdown.trim() || restructuring}
              onClick={() => void handleConfirm()}
              className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-[12px] font-medium transition-opacity hover:opacity-95 disabled:opacity-45 whitespace-nowrap"
              style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' }}
            >
              {destMode === 'new_note' && (
                <>
                  <FilePlus2 className="w-3.5 h-3.5" /> Create New Note
                </>
              )}
              {destMode === 'existing_note' && (
                <>
                  <FileText className="w-3.5 h-3.5" />{' '}
                  {placement === 'replace' ? 'Replace Note Content' : 'Add to Selected Note'}
                </>
              )}
              {destMode === 'clipboard' && (
                <>
                  <Copy className="w-3.5 h-3.5" /> Copy to Clipboard
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
