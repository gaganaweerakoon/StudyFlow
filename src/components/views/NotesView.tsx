import { buildExcerptPrompt, excerptFromSelection, excerptFromText, MAX_NOTE_EXCERPT, selectionActions, type NoteExcerpt, type SelectionAction } from '../../utils/noteSelection';
import { SyllabusLinkPicker } from '../syllabus/SyllabusLinkPicker';
import { chapterNumber, groupedChapters, matchesSyllabusScope, syllabusLinkLabels } from '../../utils/syllabusHierarchy';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Bold,
  BookOpen,
  Check,
  CheckSquare,
  Code,
  Columns2,
  Eye,
  ExternalLink,
  FileCode2,
  FilePlus2,
  FileSpreadsheet,
  FileText,
  FlaskConical,
  Folder,
  Heading2,
  Image as ImageIcon,
  Italic,
  Link2,
  List,
  ListTodo,
  Loader2,
  MessageSquare,
  PanelRightClose,
  PanelRightOpen,
  Paperclip,
  PenTool,
  Pencil,
  Pin,
  Plus,
  Quote,
  Search,
  Sparkles,
  Layers,
  ClipboardCheck,
  Table,
  Trash2,
  Type,
  Undo2,
  Upload,
  Wand2,
  X,
} from 'lucide-react';
import AssistantMarkdown from '../../assistant/AssistantMarkdown';
import { useAssistant } from '../../assistant/AssistantContext';
import { useApp } from '../../context/AppContext';
import { convertUploadedFileToMarkdown } from '../../notes/fileToMarkdown';
import {
  MarkdownImportModal,
  type MarkdownDestination,
  type PendingMarkdownImport,
} from '../../notes/MarkdownImportModal';
import { PdfPanel } from '../../notes/PdfPanel';
import {
  detectUnicodeScripts,
  ensureUnicodeFontsForText,
  resolveNoteFontFamily,
  type NoteFontMode,
} from '../../notes/unicodeFonts';
import type { NoteAttachment } from '../../types/studyflow';

type EditorViewMode = 'preview' | 'edit' | 'split';

function attachmentIcon(type: NoteAttachment['type']) {
  switch (type) {
    case 'pdf':
    case 'doc':
      return FileText;
    case 'markdown':
    case 'text':
      return FileCode2;
    case 'sheet':
      return FileSpreadsheet;
    case 'image':
      return ImageIcon;
    default:
      return Paperclip;
  }
}

export const NotesView: React.FC = () => {
  const {
    folders,
    notes,
    selectedNoteId,
    setSelectedNoteId,
    notesSyllabusScope, setNotesSyllabusScope,
    updateNote,
    createNote,
    deleteNote,
    subjects,
    pushToast,
    openStudyLab,
  } = useApp();
  const { askPip, restructureMarkdown, busy: aiBusy } = useAssistant();

  const [activeFolderId, setActiveFolderId] = useState<string>('fld-all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<EditorViewMode>('preview');
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [rightTab, setRightTab] = useState<'pdf' | 'resources'>('pdf');
  const [saveState, setSaveState] = useState<'Saved' | 'Saving...'>('Saved');
  const [pendingImport, setPendingImport] = useState<PendingMarkdownImport | null>(null);
  const [uploadingStatus, setUploadingStatus] = useState('');
  const [addingLink, setAddingLink] = useState(false);
  const [linkUrlInput, setLinkUrlInput] = useState('');
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [rightDragActive, setRightDragActive] = useState(false);
  const [aiAction, setAiAction] = useState<'polish' | 'summary' | null>(null);
  const [undoAiBackup, setUndoAiBackup] = useState<{
    noteId: string;
    content: string;
    label: string;
  } | null>(null);
  const [selectedExcerpt, setSelectedExcerpt] = useState<NoteExcerpt>();

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const rightFileInputRef = useRef<HTMLInputElement>(null);

  const scopeSubject = subjects.find(subject => subject.id === notesSyllabusScope.subjectId);
  const groups = scopeSubject ? groupedChapters(scopeSubject) : [];
  const filteredNotes = notes
    .filter((n) => {
      if (activeFolderId !== 'fld-all' && n.folderId !== activeFolderId) return false;
      if (!matchesSyllabusScope(n, subjects.find(subject=>subject.id===n.subjectId), notesSyllabusScope)) return false;
      if (
        searchQuery.trim() &&
        !n.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !n.content.toLowerCase().includes(searchQuery.toLowerCase())
      ) {
        return false;
      }
      return true;
    })
    .sort((a, b) => Number(b.pinned) - Number(a.pinned));

  const activeNote = filteredNotes.find((n) => n.id === selectedNoteId) ?? filteredNotes[0];
  const activeSubject = subjects.find((s) => s.id === activeNote?.subjectId);
  function createScopedNote() {
    const subjectId = notesSyllabusScope.subjectId || activeSubject?.id || subjects[0]?.id || '';
    const syllabusLinks = notesSyllabusScope.chapterId ? {chapterIds:[notesSyllabusScope.chapterId]} : notesSyllabusScope.unitId ? {unitIds:[notesSyllabusScope.unitId]} : undefined;
    createNote(subjectId, activeFolderId, {syllabusLinks});
    setSearchQuery('');
    setViewMode('edit');
  }

  // If a brand-new empty note is opened, switch straight to Edit mode so typing works immediately
  useEffect(() => {
    setSelectedExcerpt(undefined);
    if (activeNote && !activeNote.content.trim()) {
      setViewMode('edit');
    }
  }, [activeNote?.id]);

  // Dismiss delete modal on Escape
  useEffect(() => {
    if (!deleteConfirmOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDeleteConfirmOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [deleteConfirmOpen]);

  // Dynamically load Unicode Noto fonts when non-Latin scripts appear in the note
  const noteFullText = `${activeNote?.title ?? ''}\n${activeNote?.content ?? ''}\n${
    activeNote?.pdf?.pages?.map((p) => p.text).join('\n') ?? ''
  }`;
  const detectedScripts = useMemo(() => detectUnicodeScripts(noteFullText), [noteFullText]);
  useEffect(() => {
    ensureUnicodeFontsForText(noteFullText);
  }, [noteFullText]);

  const effectiveFontMode: NoteFontMode = activeNote?.fontMode ?? 'original';
  const originalFontName = activeNote?.originalFont || activeNote?.pdf?.originalFont;
  const noteFontFamily = useMemo(
    () => resolveNoteFontFamily(effectiveFontMode, originalFontName, noteFullText),
    [effectiveFontMode, originalFontName, noteFullText],
  );

  const allPdfFigures = useMemo(
    () => activeNote?.pdf?.pages?.flatMap((p) => p.figures ?? []) ?? [],
    [activeNote?.pdf?.pages],
  );

  const wordCount = useMemo(() => {
    const cleaned = (activeNote?.content ?? '').trim();
    if (!cleaned) return 0;
    return cleaned.split(/\s+/).filter(Boolean).length;
  }, [activeNote?.content]);

  const handleContentChange = (nextContent: string) => {
    if (!activeNote) return;
    setSaveState('Saving...');
    updateNote(activeNote.id, { content: nextContent, updatedAt: 'Just now' });
    window.setTimeout(() => setSaveState('Saved'), 450);
  };

  const handleSyncSelection = () => {
    const ta = textareaRef.current;
    if (!ta || !activeNote) return;
    setSelectedExcerpt(excerptFromText(activeNote.content.slice(ta.selectionStart, ta.selectionEnd), 'Markdown editor'));
  };
  const capturePreviewSelection = (event: React.SyntheticEvent<HTMLElement>) => {
    setSelectedExcerpt(excerptFromSelection(window.getSelection(),event.currentTarget,'Note preview'));
  };
  const handleAskSelection = (action: SelectionAction) => {
    if (!activeNote || !selectedExcerpt) return;
    const prompt = buildExcerptPrompt(selectedExcerpt,activeNote.title,syllabusLinkLabels(activeSubject,activeNote.syllabusLinks),action,activeNote.id);
    if (!prompt) { pushToast(`Select up to ${MAX_NOTE_EXCERPT.toLocaleString()} characters to ask Pip.`); return; }
    askPip(prompt,{openFloating:true,draftOnly:true,excerptOnly:true});
  };

  const handleAiTransform = async (mode: 'polish' | 'summary') => {
    if (!activeNote || aiBusy || aiAction) return;
    const originalContent = activeNote.content;
    if (!originalContent.trim()) {
      if (mode === 'summary' && activeNote.pdf?.pages?.length) {
        askPip(
          `Create a concise exam cheat sheet (key definitions, formulas, and 3 quick self-check questions) from my note "${activeNote.title}" and its attached PDF.`,
          { openFloating: true },
        );
      }
      return;
    }

    const noteId = activeNote.id;
    const label = mode === 'polish' ? 'AI Polish' : 'Cheat Sheet';
    setUndoAiBackup({ noteId, content: originalContent, label });
    setAiAction(mode);
    setSaveState('Saving...');

    const instructions =
      mode === 'polish'
        ? 'Organize headings cleanly, tighten formatting, preserve every fact, equation, and example verbatim, convert tabular data into GFM Markdown tables, format chemical formulas with Unicode subscripts/superscripts, and keep KaTeX math clean.'
        : 'Prepend a concise "## Key Takeaways & Exam Cheat Sheet" section at the very top with: (1) core definitions/concepts, (2) essential formulas or rules, and (3) 3 quick active-recall self-check questions. Then place a horizontal rule (---) and preserve the full original note intact below it.';

    try {
      const result = await restructureMarkdown(originalContent, {
        instructions,
        filterUnwantedImages: false,
        onStream: (streamed) => {
          if (streamed.trim()) {
            updateNote(noteId, { content: streamed, updatedAt: 'Just now' });
          }
        },
      });
      updateNote(noteId, { content: result.markdown, updatedAt: 'Just now' });
      if (viewMode === 'edit') setViewMode('split');
      setSaveState('Saved');
      pushToast(
        mode === 'polish'
          ? 'Note polished with AI — click Undo AI to revert'
          : 'Exam cheat sheet inserted — click Undo AI to revert',
      );
    } catch (err) {
      updateNote(noteId, { content: originalContent, updatedAt: 'Just now' });
      setUndoAiBackup(null);
      setSaveState('Saved');
      pushToast(
        err instanceof Error ? err.message : 'AI note update failed. Check your connection and try again.',
      );
    } finally {
      setAiAction(null);
    }
  };

  const handleUndoAi = () => {
    if (!activeNote || !undoAiBackup || undoAiBackup.noteId !== activeNote.id) return;
    updateNote(activeNote.id, { content: undoAiBackup.content, updatedAt: 'Just now' });
    pushToast(`Reverted ${undoAiBackup.label}`);
    setUndoAiBackup(null);
  };

  const applyMarkdownFormatting = (
    action: 'h2' | 'bold' | 'italic' | 'list' | 'checklist' | 'quote' | 'code' | 'table',
  ) => {
    if (!activeNote) return;
    if (viewMode === 'preview') setViewMode('edit');

    const ta = textareaRef.current;
    const content = activeNote.content;
    const start = ta ? ta.selectionStart : content.length;
    const end = ta ? ta.selectionEnd : content.length;
    const selected = content.slice(start, end);

    let replacement = '';
    switch (action) {
      case 'h2':
        replacement = `\n## ${selected || 'Section Heading'}\n`;
        break;
      case 'bold':
        replacement = `**${selected || 'key concept'}**`;
        break;
      case 'italic':
        replacement = `*${selected || 'emphasis'}*`;
        break;
      case 'list':
        replacement = selected
          ? selected
              .split('\n')
              .map((line) => `- ${line}`)
              .join('\n')
          : '\n- Key takeaway item';
        break;
      case 'checklist':
        replacement = selected
          ? selected
              .split('\n')
              .map((line) => `- [ ] ${line}`)
              .join('\n')
          : '\n- [ ] Review proof step';
        break;
      case 'quote':
        replacement = selected
          ? selected
              .split('\n')
              .map((line) => `> ${line}`)
              .join('\n')
          : '\n> Important quote or definition';
        break;
      case 'code':
        replacement = selected.includes('\n')
          ? `\n\`\`\`\n${selected}\n\`\`\`\n`
          : `\`${selected || 'code'}\``;
        break;
      case 'table':
        replacement =
          '\n| Concept | Notes |\n| --- | --- |\n| Item 1 | Key detail |\n';
        break;
    }

    const next = content.slice(0, start) + replacement + content.slice(end);
    handleContentChange(next);
    window.requestAnimationFrame(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        const cursorPos = start + replacement.length;
        textareaRef.current.setSelectionRange(cursorPos, cursorPos);
      }
    });
  };

  const openMarkdownImportPrompt = (
    markdown: string,
    sourceLabel?: string,
    detectedFont?: string,
  ) => {
    if (!markdown.trim()) return;
    const label = sourceLabel || activeNote?.pdf?.name || 'Extracted Markdown';
    const suggestedTitle = label.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim();
    setPendingImport({
      sourceLabel: label,
      suggestedTitle: suggestedTitle || 'Imported Study Note',
      markdown: markdown.trim(),
      originalFont: detectedFont || originalFontName,
      figures: allPdfFigures,
    });
  };

  const handleUploadFiles = async (fileInput: FileList | File[]) => {
    const files = Array.from(fileInput);
    if (files.length === 0) return;

    const uploadedAttachments: NoteAttachment[] = [];
    const markdownChunks: string[] = [];
    let latestPdf = undefined as PendingMarkdownImport['pdfSource'];
    let latestOriginalFont: string | undefined;

    try {
      for (const file of files) {
        setUploadingStatus(`Processing ${file.name}…`);
        const result = await convertUploadedFileToMarkdown(file, (msg) =>
          setUploadingStatus(msg),
        );
        uploadedAttachments.push(result.attachment);
        if (result.pdfSource) {
          latestPdf = result.pdfSource;
        }
        if (result.originalFont) {
          latestOriginalFont = result.originalFont;
        }
        if (result.markdown.trim()) {
          markdownChunks.push(result.markdown.trim());
        }
      }

      const combinedMarkdown = markdownChunks.join('\n\n---\n\n').trim();

      if (combinedMarkdown) {
        const label =
          files.length === 1 ? files[0].name : `${files.length} uploaded files`;
        const suggestedTitle =
          files.length === 1
            ? files[0].name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim()
            : 'Imported Study Notes';
        const figures = [
          ...allPdfFigures,
          ...(latestPdf?.pages?.flatMap((p) => p.figures ?? []) ?? []),
        ];
        setPendingImport({
          sourceLabel: label,
          suggestedTitle: suggestedTitle || 'Imported Study Note',
          markdown: combinedMarkdown,
          originalFont: latestOriginalFont,
          attachments: uploadedAttachments,
          pdfSource: latestPdf,
          figures,
        });
      } else if (activeNote) {
        // Non-text binary or scanned image-only PDF: attach directly so PDF reader / OCR is immediately usable
        let mergedAttachments = [...activeNote.attachments];
        for (const att of uploadedAttachments) {
          const idx = mergedAttachments.findIndex(
            (a) => a.name.toLowerCase() === att.name.toLowerCase(),
          );
          if (idx >= 0) mergedAttachments[idx] = att;
          else mergedAttachments = [att, ...mergedAttachments];
        }
        updateNote(activeNote.id, {
          attachments: mergedAttachments,
          pdf: latestPdf ?? activeNote.pdf,
          updatedAt: 'Just now',
        });
        pushToast(
          latestPdf
            ? `Attached ${latestPdf.name} (no selectable text — open PDF reader or run OCR)`
            : files.length === 1
              ? `Attached ${files[0].name}`
              : `Attached ${files.length} files`,
        );
      }
    } catch (err) {
      pushToast(`Upload error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setUploadingStatus('');
    }
  };

  const handleConfirmMarkdownImport = async (destination: MarkdownDestination) => {
    if (!pendingImport) return;

    if (destination.mode === 'clipboard') {
      try {
        await navigator.clipboard.writeText(destination.markdown);
        pushToast('Markdown copied to clipboard');
      } catch {
        pushToast('Could not access clipboard. Use Copy Markdown or Edit Source to copy manually.');
        return;
      }
      setPendingImport(null);
      return;
    }

    if (destination.mode === 'new_note') {
      const updatedAttachments = (pendingImport.attachments ?? []).map((att) =>
        pendingImport.attachments?.length === 1
          ? { ...att, markdown: destination.markdown }
          : att,
      );
      createNote(destination.subjectId, destination.folderId, {
        title: destination.title,
        content: destination.markdown,
        attachments: updatedAttachments,
        pdf: pendingImport.pdfSource,
        originalFont: pendingImport.originalFont,
        fontMode: 'original',
        tags: ['Imported'],
      });
      setViewMode('preview');
      setPendingImport(null);
      return;
    }

    // Existing note (append or replace)
    const target = notes.find((n) => n.id === destination.noteId);
    if (!target) {
      setPendingImport(null);
      return;
    }

    let mergedAttachments = [...target.attachments];
    for (const att of pendingImport.attachments ?? []) {
      const nextAtt =
        pendingImport.attachments?.length === 1
          ? { ...att, markdown: destination.markdown }
          : att;
      const idx = mergedAttachments.findIndex(
        (a) => a.name.toLowerCase() === nextAtt.name.toLowerCase(),
      );
      if (idx >= 0) mergedAttachments[idx] = nextAtt;
      else mergedAttachments = [nextAtt, ...mergedAttachments];
    }

    const currentTrimmed = target.content.trim();
    const nextContent =
      destination.placement === 'replace' || !currentTrimmed
        ? destination.markdown.trim()
        : `${currentTrimmed}\n\n---\n\n${destination.markdown.trim()}`;

    const patch: Parameters<typeof updateNote>[1] = {
      content: nextContent,
      attachments: mergedAttachments,
      updatedAt: 'Just now',
    };
    if (pendingImport.pdfSource) {
      patch.pdf = pendingImport.pdfSource;
    }
    if (pendingImport.originalFont && !target.originalFont) {
      patch.originalFont = pendingImport.originalFont;
      if (!target.fontMode) patch.fontMode = 'original';
    }

    updateNote(target.id, patch);
    setSelectedNoteId(target.id);
    setViewMode('preview');
    setPendingImport(null);
    pushToast(
      destination.placement === 'replace'
        ? `Replaced content in “${target.title || 'Untitled Note'}”`
        : `Added Markdown to “${target.title || 'Untitled Note'}”`,
    );
  };

  const handleRemoveAttachment = (attId: string) => {
    if (!activeNote) return;
    const removed = activeNote.attachments.find((a) => a.id === attId);
    const nextAttachments = activeNote.attachments.filter((a) => a.id !== attId);
    const patch: Parameters<typeof updateNote>[1] = {
      attachments: nextAttachments,
      updatedAt: 'Just now',
    };
    if (removed && activeNote.pdf && removed.name === activeNote.pdf.name) {
      patch.pdf = undefined;
    }
    updateNote(activeNote.id, patch);
    pushToast('Removed attachment');
  };

  const handleAddLinkSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeNote) return;
    const raw = linkUrlInput.trim();
    if (!raw) return;
    try {
      const normalizedUrl = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
      const url = new URL(normalizedUrl);
      if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        pushToast('Enter an HTTP or HTTPS address.');
        return;
      }
      updateNote(activeNote.id, {
        linkedResources: [...new Set([...activeNote.linkedResources, url.href])],
        updatedAt: 'Just now',
      });
      setLinkUrlInput('');
      setAddingLink(false);
      pushToast('Resource link saved');
    } catch {
      pushToast('Please enter a valid URL.');
    }
  };

  const handleRemoveLink = (urlToRemove: string) => {
    if (!activeNote) return;
    updateNote(activeNote.id, {
      linkedResources: activeNote.linkedResources.filter((r) => r !== urlToRemove),
      updatedAt: 'Just now',
    });
  };

  const normalizedPreviewMarkdown = useMemo(() => {
    return activeNote?.content?.trim() ?? '';
  }, [activeNote?.content]);

  const totalResourceCount =
    (activeNote?.attachments.length ?? 0) + (activeNote?.linkedResources.length ?? 0);

  return (
    <div
      className="rounded-xl overflow-hidden flex flex-col lg:flex-row lg:h-[calc(100vh-88px)] min-h-[580px]"
      style={{
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--border-subtle)',
      }}
    >
      {/* PANEL 1: Folders + Notes List */}
      <div
        className="w-full lg:w-64 xl:w-72 shrink-0 flex flex-col max-h-64 lg:max-h-none"
        style={{
          backgroundColor: 'var(--bg-sidebar)',
          borderRight: '1px solid var(--border-subtle)',
        }}
      >
        <div className="p-3 space-y-2.5" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <div className="flex items-center justify-between gap-2">
            <h1 className="font-display text-[15px] font-semibold text-[var(--text-primary)]">
              Notes
            </h1>
            <button
              type="button"
              onClick={() => {
                createScopedNote();
              }}
              aria-label="Create new note"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11.5px] font-medium transition-opacity hover:opacity-95 whitespace-nowrap shrink-0"
              style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' }}
            >
              <Plus className="w-3.5 h-3.5" /> New Note
            </button>
          </div>
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[var(--text-muted)] absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search notes…"
              aria-label="Search notes"
              className="w-full h-8 pl-8 pr-7 rounded-lg text-[12px]"
              style={{
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-primary)',
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <div className="space-y-1">
            <select aria-label="Filter notes by subject" value={notesSyllabusScope.subjectId} onChange={e=>setNotesSyllabusScope({subjectId:e.target.value})} className="w-full text-xs rounded px-2 py-1.5 bg-[var(--bg-surface)] border border-[var(--border-subtle)]"><option value="">All subjects</option>{subjects.map(subject=><option key={subject.id} value={subject.id}>{subject.name}</option>)}</select>
            {scopeSubject && <select aria-label="Filter notes by unit" value={notesSyllabusScope.unitId ?? ''} onChange={e=>setNotesSyllabusScope({subjectId:scopeSubject.id,unitId:e.target.value || undefined})} className="w-full text-xs rounded px-2 py-1.5 bg-[var(--bg-surface)] border border-[var(--border-subtle)]"><option value="">All units</option>{groups.map(({unit,number})=><option key={unit.id} value={unit.id}>{number}. {unit.title}</option>)}</select>}
            {scopeSubject && <select aria-label="Filter notes by chapter" value={notesSyllabusScope.chapterId ?? ''} onChange={e=>setNotesSyllabusScope({...notesSyllabusScope,chapterId:e.target.value || undefined})} className="w-full text-xs rounded px-2 py-1.5 bg-[var(--bg-surface)] border border-[var(--border-subtle)]"><option value="">All chapters</option>{groups.filter(({unit})=>!notesSyllabusScope.unitId || unit.id===notesSyllabusScope.unitId).flatMap(({chapters})=>chapters.map(ch=><option key={ch.id} value={ch.id}>{chapterNumber(scopeSubject,ch.id)} {ch.title}</option>))}</select>}
          </div>
        </div>

        {/* Folder Navigation */}
        <div className="px-2 py-2 space-y-0.5" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          {folders.map((fld) => {
            const active = activeFolderId === fld.id;
            const count =
              fld.id === 'fld-all'
                ? notes.length
                : notes.filter((n) => n.folderId === fld.id).length;
            return (
              <button
                key={fld.id}
                type="button"
                onClick={() => setActiveFolderId(fld.id)}
                className="w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-[12px] font-medium text-left transition-colors"
                style={{
                  backgroundColor: active ? 'var(--accent-soft)' : 'transparent',
                  color: active ? 'var(--accent)' : 'var(--text-secondary)',
                }}
              >
                <span className="flex items-center gap-2 min-w-0">
                  <Folder className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{fld.name}</span>
                </span>
                <span className="tabular-nums text-[11px] opacity-70 shrink-0">{count}</span>
              </button>
            );
          })}
        </div>

        {/* Notes List */}
        <div className="flex-1 overflow-y-auto divide-y divide-[var(--border-subtle)]">
          {filteredNotes.length === 0 ? (
            <div className="p-5 text-center space-y-2">
              <div className="text-[12.5px] font-medium text-[var(--text-secondary)]">
                No matching notes
              </div>
              <p className="text-[11.5px] text-[var(--text-muted)]">
                Try clearing the search or create a fresh note.
              </p>
            </div>
          ) : (
            filteredNotes.map((n) => {
              const active = activeNote?.id === n.id;
              const sub = subjects.find((s) => s.id === n.subjectId);
              const fileCount = n.attachments.length + (n.pdf && !n.attachments.some((a) => a.name === n.pdf?.name) ? 1 : 0);
              return (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => setSelectedNoteId(n.id)}
                  className="w-full p-3 text-left transition-colors hover:bg-[var(--bg-surface-hover)]"
                  style={{
                    backgroundColor: active ? 'var(--bg-surface)' : 'transparent',
                  }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className="inline-flex items-center gap-1.5 text-[11px] font-medium truncate"
                      style={{ color: sub?.color ?? 'var(--text-muted)' }}
                    >
                      {sub && (
                        <span
                          className="w-1.5 h-1.5 rounded-full shrink-0"
                          style={{ backgroundColor: sub.color }}
                        />
                      )}
                      {sub?.code ?? 'General'}
                    </span>
                    <span className="flex items-center gap-1.5 shrink-0">
                      {fileCount > 0 && (
                        <span className="inline-flex items-center gap-0.5 text-[10.5px] text-[var(--text-muted)] tabular-nums">
                          <Paperclip className="w-3 h-3" />
                          {fileCount}
                        </span>
                      )}
                      {n.pinned && <Pin className="w-3 h-3 text-[var(--accent)]" />}
                    </span>
                  </div>
                  <div
                    dir="auto"
                    className="text-[12.5px] font-semibold text-[var(--text-primary)] line-clamp-1 mt-0.5"
                  >
                    {n.title || 'Untitled Note'}
                  </div>
                  <div className="text-[11px] text-[var(--text-muted)] mt-0.5 truncate">{syllabusLinkLabels(sub,n.syllabusLinks).join(' · ') || n.updatedAt}</div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* PANEL 2: Markdown Editor & Preview */}
      {activeNote ? (
        <div className="flex-1 flex flex-col min-w-0 min-h-[480px] lg:min-h-0">
          {/* Top Workspace Toolbar */}
          <div
            className="px-2 h-12 shrink-0 flex items-center gap-2 min-w-0"
            style={{ borderBottom: '1px solid var(--border-subtle)' }}
          >
            <div className="flex-1 min-w-0 h-full flex items-center gap-3 overflow-x-auto">
            <div className="flex items-center gap-2.5 shrink-0">
              {/* Segmented Preview / Edit / Split Switch */}
              <div
                className="inline-flex items-center gap-0.5 p-0.5 rounded-lg"
                style={{
                  backgroundColor: 'var(--bg-surface-subtle)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                {[
                  { id: 'preview' as const, label: 'Preview', icon: Eye },
                  { id: 'edit' as const, label: 'Edit', icon: Pencil },
                  { id: 'split' as const, label: 'Split', icon: Columns2 },
                ].map((mode) => {
                  const Icon = mode.icon;
                  const active = viewMode === mode.id;
                  return (
                    <button
                      key={mode.id}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setViewMode(mode.id)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11.5px] font-medium transition-colors whitespace-nowrap ${
                        mode.id === 'split' ? 'hidden xl:inline-flex' : ''
                      }`}
                      style={{
                        backgroundColor: active ? 'var(--bg-surface)' : 'transparent',
                        color: active ? 'var(--text-primary)' : 'var(--text-muted)',
                      }}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {mode.label}
                    </button>
                  );
                })}
              </div>

              {/* Markdown Formatting Controls (active in Edit / Split) */}
              {viewMode !== 'preview' && (
                <div
                  className="flex items-center gap-0.5 pl-2.5"
                  style={{ borderLeft: '1px solid var(--border-subtle)' }}
                >
                  {[
                    { id: 'h2' as const, label: 'Heading', icon: Heading2 },
                    { id: 'bold' as const, label: 'Bold', icon: Bold },
                    { id: 'italic' as const, label: 'Italic', icon: Italic },
                    { id: 'list' as const, label: 'Bullet List', icon: List },
                    { id: 'checklist' as const, label: 'Checklist', icon: CheckSquare },
                    { id: 'quote' as const, label: 'Quote', icon: Quote },
                    { id: 'code' as const, label: 'Code', icon: Code },
                    { id: 'table' as const, label: 'Table', icon: Table },
                  ].map((tool) => {
                    const Icon = tool.icon;
                    return (
                      <button
                        key={tool.id}
                        type="button"
                        onClick={() => applyMarkdownFormatting(tool.id)}
                        aria-label={`Insert ${tool.label}`}
                        title={tool.label}
                        className="p-1.5 rounded-md text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] transition-colors"
                      >
                        <Icon className="w-3.5 h-3.5" />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Right Toolbar Utilities: AI Assist, Font Preservation, Save State, Pin, Delete, Panel Toggle */}
            <div className="flex items-center gap-2 shrink-0 text-[11.5px]">


              <button
                type="button"
                disabled={!activeNote.content.trim() || aiBusy || Boolean(aiAction)}
                onClick={() => void handleAiTransform('polish')}
                className="inline-flex items-center gap-1 rounded-lg px-2.5 h-7 text-[11.5px] font-medium text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] disabled:opacity-40 transition-colors whitespace-nowrap"
                style={{
                  backgroundColor: 'var(--bg-surface-subtle)',
                  border: '1px solid var(--border-subtle)',
                }}
                title="Cleanly structure headings, tables, formulas, and Markdown in-place with AI"
              >
                {aiAction === 'polish' ? (
                  <Loader2 className="w-3 h-3 animate-spin shrink-0" style={{ color: 'var(--accent)' }} />
                ) : (
                  <Wand2 className="w-3 h-3 shrink-0" style={{ color: 'var(--accent)' }} />
                )}
                {aiAction === 'polish' ? 'Polishing…' : 'AI Polish'}
              </button>

              <button
                type="button"
                onClick={() =>
                  openStudyLab({
                    tab: 'playground',
                    targetNoteId: activeNote.id,
                    title: activeNote.title || 'Note Snippet',
                  })
                }
                className="inline-flex items-center gap-1 rounded-lg px-2.5 h-7 text-[11.5px] font-medium text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] transition-colors whitespace-nowrap"
                style={{
                  backgroundColor: 'var(--bg-surface-subtle)',
                  border: '1px solid var(--border-subtle)',
                }}
                title="Open Math & Code Playground linked to this note"
              >
                <FlaskConical className="w-3 h-3 shrink-0" style={{ color: 'var(--accent)' }} />
                Lab
              </button>

              <button
                type="button"
                onClick={() =>
                  openStudyLab({
                    tab: 'whiteboard',
                    targetNoteId: activeNote.id,
                    title: activeNote.title || 'Note Diagram',
                  })
                }
                className="inline-flex items-center gap-1 rounded-lg px-2.5 h-7 text-[11.5px] font-medium text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] transition-colors whitespace-nowrap"
                style={{
                  backgroundColor: 'var(--bg-surface-subtle)',
                  border: '1px solid var(--border-subtle)',
                }}
                title="Draw or generate an SVG diagram and insert it into this note"
              >
                <PenTool className="w-3 h-3 shrink-0" style={{ color: 'var(--accent)' }} />
                Diagram
              </button>

              {undoAiBackup?.noteId === activeNote.id && !aiAction && (
                <button
                  type="button"
                  onClick={handleUndoAi}
                  className="inline-flex items-center gap-1 rounded-lg px-2 h-7 text-[11.5px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] transition-colors whitespace-nowrap"
                  style={{
                    backgroundColor: 'var(--bg-surface-subtle)',
                    border: '1px solid var(--border-subtle)',
                  }}
                  title={`Revert ${undoAiBackup.label}`}
                >
                  <Undo2 className="w-3 h-3 shrink-0" />
                  Undo AI
                </button>
              )}

              {/* Font Preservation Selector */}
              <div
                className="inline-flex items-center gap-1 rounded-lg px-2 h-7"
                style={{
                  backgroundColor: 'var(--bg-surface-subtle)',
                  border: '1px solid var(--border-subtle)',
                }}
                title="Preserve original document font & Unicode script rendering"
              >
                <Type className="w-3 h-3 text-[var(--text-muted)] shrink-0" />
                <select
                  aria-label="Note font"
                  value={effectiveFontMode}
                  onChange={(e) =>
                    updateNote(activeNote.id, {
                      fontMode: e.target.value as NoteFontMode,
                    })
                  }
                  className="bg-transparent text-[11.5px] font-medium text-[var(--text-primary)] focus:outline-none max-w-[140px] truncate"
                >
                  <option value="original">
                    {originalFontName ? `Original (${originalFontName})` : 'Original / Unicode'}
                  </option>
                  <option value="unicode">System Unicode</option>
                  <option value="sans">UI Sans</option>
                  <option value="serif">Serif</option>
                  <option value="mono">Monospace</option>
                </select>
              </div>

              <span className="hidden sm:inline-flex items-center gap-1 text-[var(--text-muted)] whitespace-nowrap">
                <Check className="w-3 h-3 text-emerald-500" />
                {saveState}
              </span>

              <button
                type="button"
                onClick={() => updateNote(activeNote.id, { pinned: !activeNote.pinned })}
                aria-label={activeNote.pinned ? 'Unpin note' : 'Pin note'}
                title={activeNote.pinned ? 'Unpin note' : 'Pin note'}
                className="p-1.5 rounded-md hover:bg-[var(--bg-surface-hover)] transition-colors"
                style={{ color: activeNote.pinned ? 'var(--accent)' : 'var(--text-muted)' }}
              >
                <Pin className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => setDeleteConfirmOpen(true)}
                aria-label="Delete note"
                title="Delete note"
                className="p-1.5 rounded-md text-[var(--text-muted)] opacity-60 hover:opacity-100 hover:text-rose-500 hover:bg-[var(--bg-surface-hover)] transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
            </div>
              <button
                type="button"
                onClick={() => setRightPanelOpen((o) => !o)}
                aria-label={rightPanelOpen ? 'Hide files & PDF panel' : 'Show files & PDF panel'}
                aria-expanded={rightPanelOpen}
                aria-controls="note-right-panel"
                title={rightPanelOpen ? 'Hide files & PDF panel' : 'Show files & PDF panel'}
                className="shrink-0 inline-flex items-center gap-1.5 px-2 py-1.5 rounded-md text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] transition-colors whitespace-nowrap"
              >
                {rightPanelOpen ? (
                  <PanelRightClose className="w-4 h-4" />
                ) : (
                  <>
                    <PanelRightOpen className="w-4 h-4" />
                    <span className="text-[11.5px] font-medium">Files</span>
                  </>
                )}
              </button>
          </div>

          {/* Document Header */}
          <div
            className="px-6 pt-5 pb-3.5 shrink-0 space-y-2"
            style={{ borderBottom: '1px solid var(--border-subtle)' }}
          >
            <input
              type="text"
              dir="auto"
              value={activeNote.title}
              onChange={(e) =>
                updateNote(activeNote.id, { title: e.target.value, updatedAt: 'Just now' })
              }
              placeholder="Note title…"
              aria-label="Note title"
              className="w-full bg-transparent text-[22px] font-semibold tracking-tight text-[var(--text-primary)] focus:outline-none"
              style={{ fontFamily: noteFontFamily }}
            />

            {activeSubject && <SyllabusLinkPicker key={activeNote.id + activeSubject.id} subject={activeSubject} links={activeNote.syllabusLinks} onChange={syllabusLinks=>updateNote(activeNote.id,{syllabusLinks})}/>}
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[12px] text-[var(--text-muted)]">
              <select
                aria-label="Note subject"
                value={activeNote.subjectId}
                onChange={(e) => updateNote(activeNote.id, { subjectId: e.target.value })}
                className="h-7 rounded-md px-2 text-[12px] font-medium text-[var(--text-secondary)]"
                style={{
                  backgroundColor: 'var(--bg-surface-subtle)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <option value="">No subject</option>
                {subjects.map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.code} — {sub.name}
                  </option>
                ))}
              </select>

              <span aria-hidden="true">·</span>
              <span className="tabular-nums">{wordCount} {wordCount === 1 ? 'word' : 'words'}</span>

              {activeNote.tags.length > 0 && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>{activeNote.tags.join(' / ')}</span>
                </>
              )}

              {originalFontName && effectiveFontMode === 'original' && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>Font: {originalFontName}</span>
                </>
              )}

              {detectedScripts.length > 0 && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>Unicode: {detectedScripts.map((s) => s.label).join(', ')}</span>
                </>
              )}

              <span aria-hidden="true">·</span>
              <span>Updated {activeNote.updatedAt}</span>
            </div>
          </div>

          {selectedExcerpt && <div className="shrink-0 flex flex-wrap items-center gap-2 px-4 py-2 border-b border-[var(--border-subtle)] text-xs bg-[var(--bg-surface-subtle)]">
            <span className="flex-1 min-w-0 truncate" title={selectedExcerpt.text}>{selectedExcerpt.text.length > MAX_NOTE_EXCERPT ? `Select up to ${MAX_NOTE_EXCERPT.toLocaleString()} characters` : `${selectedExcerpt.source}: ${selectedExcerpt.text}`}</span>
            <select aria-label="Ask Pip about selected text" value="" onChange={e=>{if(e.target.value) handleAskSelection(e.target.value as SelectionAction);}} className="rounded-lg px-2 h-7 text-xs bg-[var(--accent-soft)] text-[var(--accent)] border border-[var(--accent)]" disabled={selectedExcerpt.text.length > MAX_NOTE_EXCERPT}>
              <option value="">Ask Pip about selection</option>
              {selectionActions.map(action=><option key={action} value={action}>{action}</option>)}
            </select>
            <button type="button" onClick={()=>setSelectedExcerpt(undefined)} aria-label="Clear selected excerpt" title="Clear selection" className="px-2 text-[var(--text-muted)]">×</button>
          </div>}

          {/* Document Body: Preview, Edit, or Split */}
          <div
            className="flex-1 min-h-0 flex"
            style={{ '--note-font-family': noteFontFamily } as React.CSSProperties}
          >
            {(viewMode === 'edit' || viewMode === 'split') && (
              <div
                className={`flex-1 min-w-0 flex flex-col ${
                  viewMode === 'split' ? 'border-r border-[var(--border-subtle)]' : ''
                }`}
              >
                <textarea
                  ref={textareaRef}
                  dir="auto"
                  value={activeNote.content}
                  onChange={(e) => handleContentChange(e.target.value)}
                  onSelect={handleSyncSelection}
                  onKeyUp={handleSyncSelection}
                  onMouseUp={handleSyncSelection}
                  placeholder="Write in Markdown, or drop a PDF, DOCX, TXT, or MD file in the right pane to auto-convert…"
                  aria-label="Note markdown editor"
                  className="flex-1 w-full resize-none bg-transparent px-6 py-5 text-[14px] leading-[1.75] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none"
                  style={{ fontFamily: noteFontFamily }}
                />
              </div>
            )}

            {(viewMode === 'preview' || viewMode === 'split') && (
              <div className="flex-1 min-w-0 overflow-y-auto px-6 py-5">
                {normalizedPreviewMarkdown ? (
                  <article
                    className="note-markdown max-w-[74ch]"
                    aria-label="Note preview"
                    tabIndex={0}
                    onMouseUp={capturePreviewSelection}
                    onKeyUp={capturePreviewSelection}
                  >
                    <AssistantMarkdown
                      noteDiagrams
                      text={normalizedPreviewMarkdown}
                      figures={allPdfFigures}
                      allowDataImages
                      dirAuto
                    />
                  </article>
                ) : (
                  <div className="max-w-md py-10 space-y-3">
                    <div className="text-[14px] font-semibold text-[var(--text-primary)]">
                      This note is empty
                    </div>
                    <p className="text-[12.5px] leading-relaxed text-[var(--text-muted)]">
                      Switch to Edit to write Markdown directly, or upload a PDF, Word document, or text file in the right pane to convert it automatically.
                    </p>
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setViewMode('edit')}
                        className="inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-[12px] font-medium"
                        style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' }}
                      >
                        <Pencil className="w-3.5 h-3.5" /> Start Writing
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setRightPanelOpen(true);
                          rightFileInputRef.current?.click();
                        }}
                        className="inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-[12px] font-medium text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)]"
                        style={{
                          backgroundColor: 'var(--bg-surface-subtle)',
                          border: '1px solid var(--border-subtle)',
                        }}
                      >
                        <Upload className="w-3.5 h-3.5" /> Upload File to Markdown
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-3">
          <div className="text-[15px] font-semibold text-[var(--text-primary)]">{notes.length ? 'No matching notes' : 'No notes yet'}</div>
          <p className="text-[12.5px] text-[var(--text-muted)] max-w-sm">
            Create your first note to start writing in Markdown or importing PDF and Word documents.
          </p>
          <button
            type="button"
            onClick={() => {
              createScopedNote();
            }}
            className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-[12.5px] font-medium"
            style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' }}
          >
            <Plus className="w-4 h-4" /> Create First Note
          </button>
        </div>
      )}

      {/* PANEL 3: Right Pane — Apparent File Upload, PDF Reader, Auto-Markdown & Resources */}
      {rightPanelOpen && activeNote && (
        <aside
          id="note-right-panel"
          className="w-full lg:w-[min(32%,340px)] xl:w-[min(33%,390px)] min-w-0 min-h-[400px] lg:min-h-0 max-h-[70vh] lg:max-h-none shrink-0 flex flex-col overflow-hidden"
          style={{
            backgroundColor: 'var(--bg-surface-subtle)',
            borderLeft: '1px solid var(--border-subtle)',
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setRightDragActive(true);
          }}
          onDragLeave={() => setRightDragActive(false)}
          onDrop={(e) => {
            e.preventDefault();
            setRightDragActive(false);
            if (e.dataTransfer.files?.length) {
              void handleUploadFiles(e.dataTransfer.files);
            }
          }}
        >
          <input
            ref={rightFileInputRef}
            type="file"
            multiple
            accept=".pdf,.docx,.doc,.md,.markdown,.txt,.csv,.tsv,application/pdf,image/*"
            onChange={(e) => {
              if (e.target.files?.length) {
                void handleUploadFiles(e.target.files);
                e.target.value = '';
              }
            }}
            className="hidden"
            aria-label="Add files to note"
          />

          {/* Right Pane Header with Apparent Tabs + Direct Upload CTA */}
          <div
            className="px-3 py-2 shrink-0 flex flex-wrap items-center justify-between gap-2"
            style={{ borderBottom: '1px solid var(--border-subtle)' }}
          >
            <div
              className="flex items-center gap-0.5 p-0.5 rounded-lg text-[11.5px]"
              style={{
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <button
                type="button"
                onClick={() => setRightTab('pdf')}
                className="px-2.5 py-1 rounded-md font-medium transition-colors whitespace-nowrap"
                style={{
                  backgroundColor: rightTab === 'pdf' ? 'var(--accent-soft)' : 'transparent',
                  color: rightTab === 'pdf' ? 'var(--accent)' : 'var(--text-muted)',
                }}
              >
                PDF &amp; MD
              </button>
              <button
                type="button"
                onClick={() => setRightTab('resources')}
                className="px-2.5 py-1 rounded-md font-medium transition-colors whitespace-nowrap tabular-nums"
                style={{
                  backgroundColor: rightTab === 'resources' ? 'var(--accent-soft)' : 'transparent',
                  color: rightTab === 'resources' ? 'var(--accent)' : 'var(--text-muted)',
                }}
              >
                Files ({totalResourceCount})
              </button>
            </div>

            <button
              type="button"
              disabled={Boolean(uploadingStatus)}
              onClick={() => rightFileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11.5px] font-medium transition-opacity hover:opacity-95 disabled:opacity-50 whitespace-nowrap shrink-0"
              style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' }}
              title="Upload PDF, DOCX, MD, TXT, or CSV (auto-converts to Markdown)"
            >
              {uploadingStatus ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Upload className="w-3.5 h-3.5" />
              )}
              Add File
            </button>
          </div>

          {/* Persistent Study with Pip Quick Actions */}
          <div
            className="px-3 py-2.5 shrink-0 space-y-2"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderBottom: '1px solid var(--border-subtle)',
            }}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-[var(--text-primary)]">
                <Sparkles className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} />
                Study with Pip
              </span>
              <span className="text-[10.5px] text-[var(--text-muted)]">From this note</span>
            </div>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-1.5">
              <button
                type="button"
                disabled={!activeNote.content.trim() && !activeNote.pdf?.pages?.length}
                aria-label="Generate Flashcards from Note"
                title="Create high-yield flashcards from this note with Pip"
                onClick={() =>
                  askPip(
                    `Create 6 high-yield flashcards with concise active-recall hints from my note "${activeNote.title}" and save them to a matching subject deck (or create a new deck for this note).`,
                    { openFloating: true },
                  )
                }
                className="inline-flex items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-[11.5px] font-medium text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] disabled:opacity-40 transition-colors whitespace-nowrap"
                style={{
                  backgroundColor: 'var(--bg-surface-subtle)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <Layers className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--accent)' }} />
                Flashcards
              </button>
              <button
                type="button"
                disabled={!activeNote.content.trim() && !activeNote.pdf?.pages?.length}
                aria-label="Generate Practice Test"
                title="Generate an exam-style practice test from this note with Pip"
                onClick={() =>
                  askPip(
                    `Create a 6-question exam-style mixed practice test (MCQs and short-answer) from my note "${activeNote.title}" with clear explanations, and save it to Practice Tests.`,
                    { openFloating: true },
                  )
                }
                className="inline-flex items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-[11.5px] font-medium text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] disabled:opacity-40 transition-colors whitespace-nowrap"
                style={{
                  backgroundColor: 'var(--bg-surface-subtle)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <ClipboardCheck className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--accent)' }} />
                Practice Quiz
              </button>
              <button
                type="button"
                disabled={(!activeNote.content.trim() && !activeNote.pdf?.pages?.length) || aiBusy || Boolean(aiAction)}
                aria-label="Insert Exam Cheat Sheet"
                title="Insert a concise exam cheat sheet & self-check questions at the top of this note"
                onClick={() => void handleAiTransform('summary')}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-[11.5px] font-medium text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] disabled:opacity-40 transition-colors whitespace-nowrap"
                style={{
                  backgroundColor: 'var(--bg-surface-subtle)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                {aiAction === 'summary' ? (
                  <Loader2 className="w-3.5 h-3.5 shrink-0 animate-spin" style={{ color: 'var(--accent)' }} />
                ) : (
                  <BookOpen className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--accent)' }} />
                )}
                {aiAction === 'summary' ? 'Summarizing…' : 'Cheat Sheet'}
              </button>
              <button
                type="button"
                disabled={!activeNote.content.trim() && !activeNote.pdf?.pages?.length}
                aria-label="Extract Study Tasks"
                title="Extract follow-up tasks, problem sets, and review items from this note into StudyFlow Tasks"
                onClick={() =>
                  askPip(
                    `Read my note "${activeNote.title}", extract concrete follow-up study tasks, practice problems, or weak areas to review, add them as tasks in StudyFlow under the matching subject, and suggest where they fit in my open schedule.`,
                    { openFloating: true },
                  )
                }
                className="inline-flex items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-[11.5px] font-medium text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] disabled:opacity-40 transition-colors whitespace-nowrap"
                style={{
                  backgroundColor: 'var(--bg-surface-subtle)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <ListTodo className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--accent)' }} />
                Extract Tasks
              </button>
            </div>
          </div>

          {rightTab === 'pdf' ? (
            <div className="flex-1 min-h-0 flex flex-col">
              <PdfPanel
                key={activeNote.id}
                source={activeNote.pdf}
                save={(pdf) => updateNote(activeNote.id, { pdf, updatedAt: 'Just now' })}
                onUploadFiles={handleUploadFiles}
                onInsertMarkdown={openMarkdownImportPrompt}
                uploadingStatus={uploadingStatus}
                noteFontFamily={noteFontFamily}
                onSelectExcerpt={setSelectedExcerpt}
              />
            </div>
          ) : (
            <div className="flex-1 min-h-0 overflow-y-auto p-3.5 space-y-4">
              {/* Apparent Top Action Controls */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={Boolean(uploadingStatus)}
                  onClick={() => rightFileInputRef.current?.click()}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-[12px] font-medium transition-opacity hover:opacity-95 disabled:opacity-50 whitespace-nowrap"
                  style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' }}
                >
                  <FilePlus2 className="w-3.5 h-3.5" />
                  Upload File
                </button>
                <button
                  type="button"
                  onClick={() => setAddingLink((prev) => !prev)}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-[12px] font-medium transition-colors hover:bg-[var(--bg-surface-hover)] whitespace-nowrap"
                  style={{
                    backgroundColor: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-primary)',
                  }}
                >
                  <Link2 className="w-3.5 h-3.5" />
                  Add Link
                </button>
              </div>

              {/* Inline Add Link Form */}
              {addingLink && (
                <form
                  onSubmit={handleAddLinkSubmit}
                  className="rounded-xl p-3 space-y-2"
                  style={{
                    backgroundColor: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <label className="block text-[11.5px] font-medium text-[var(--text-primary)]">
                    Resource URL
                  </label>
                  <input
                    autoFocus
                    required
                    type="text"
                    value={linkUrlInput}
                    onChange={(e) => setLinkUrlInput(e.target.value)}
                    placeholder="https://example.edu/lecture-notes"
                    className="w-full h-8 rounded-lg px-2.5 text-[12px]"
                    style={{
                      backgroundColor: 'var(--bg-surface-subtle)',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--text-primary)',
                    }}
                  />
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setAddingLink(false);
                        setLinkUrlInput('');
                      }}
                      className="px-2.5 py-1 text-[11.5px] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="rounded-lg px-3 py-1 text-[11.5px] font-medium"
                      style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' }}
                    >
                      Save Link
                    </button>
                  </div>
                </form>
              )}

              {/* Upload progress */}
              {uploadingStatus && (
                <div
                  role="status"
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-[12px]"
                  style={{
                    backgroundColor: 'var(--accent-soft)',
                    border: '1px solid var(--accent-border)',
                    color: 'var(--accent)',
                  }}
                >
                  <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                  <span className="truncate font-medium">{uploadingStatus}</span>
                </div>
              )}

              {/* Attached Files Section */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
                    <Paperclip className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                    Attached Files
                  </span>
                  <span className="tabular-nums text-[11px] text-[var(--text-muted)]">
                    {activeNote.attachments.length}
                  </span>
                </div>

                {activeNote.attachments.length === 0 ? (
                  <div
                    className="rounded-xl p-4 text-center space-y-1.5 transition-colors"
                    style={{
                      backgroundColor: rightDragActive ? 'var(--accent-soft)' : 'var(--bg-surface)',
                      border: rightDragActive
                        ? '1.5px dashed var(--accent)'
                        : '1.5px dashed var(--border-strong)',
                    }}
                  >
                    <div className="text-[12px] font-medium text-[var(--text-secondary)]">
                      Drop files here or click Upload File
                    </div>
                    <div className="text-[11px] text-[var(--text-muted)]">
                      PDF, DOCX, DOC, MD, TXT, CSV, or images
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {activeNote.attachments.map((att) => {
                      const Icon = attachmentIcon(att.type);
                      const isActivePdf = activeNote.pdf && activeNote.pdf.name === att.name;
                      return (
                        <div
                          key={att.id}
                          className="group rounded-xl p-2.5 space-y-2"
                          style={{
                            backgroundColor: 'var(--bg-surface)',
                            border: '1px solid var(--border-subtle)',
                          }}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-start gap-2 min-w-0">
                              <Icon className="w-4 h-4 text-[var(--accent)] shrink-0 mt-0.5" />
                              <div className="min-w-0">
                                <div
                                  className="truncate text-[12px] font-medium text-[var(--text-primary)]"
                                  title={att.name}
                                >
                                  {att.name}
                                </div>
                                <div className="flex flex-wrap items-center gap-1.5 text-[10.5px] text-[var(--text-muted)] mt-0.5">
                                  <span className="font-mono-num">{att.size}</span>
                                  {att.markdown && (
                                    <>
                                      <span aria-hidden="true">·</span>
                                      <span>Markdown ready</span>
                                    </>
                                  )}
                                  {att.originalFont && (
                                    <>
                                      <span aria-hidden="true">·</span>
                                      <span>{att.originalFont}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveAttachment(att.id)}
                              aria-label={`Remove ${att.name}`}
                              title="Remove file"
                              className="p-1 rounded-md text-[var(--text-muted)] opacity-50 group-hover:opacity-90 hover:!opacity-100 hover:text-rose-500 transition-all shrink-0"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {(att.markdown || isActivePdf) && (
                            <div className="flex items-center gap-1.5 pt-1 border-t border-[var(--border-subtle)]">
                              {att.markdown && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    openMarkdownImportPrompt(att.markdown!, att.name, att.originalFont)
                                  }
                                  className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium transition-colors hover:bg-[var(--bg-surface-hover)]"
                                  style={{
                                    backgroundColor: 'var(--bg-surface-subtle)',
                                    color: 'var(--text-primary)',
                                  }}
                                >
                                  <FilePlus2 className="w-3 h-3" /> Add / AI Order
                                </button>
                              )}
                              {isActivePdf && (
                                <button
                                  type="button"
                                  onClick={() => setRightTab('pdf')}
                                  className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium transition-colors hover:bg-[var(--bg-surface-hover)]"
                                  style={{
                                    backgroundColor: 'var(--bg-surface-subtle)',
                                    color: 'var(--accent)',
                                  }}
                                >
                                  <BookOpen className="w-3 h-3" /> Open PDF
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Linked Study Resources Section */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
                    <Link2 className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                    Linked Resources
                  </span>
                  <span className="tabular-nums text-[11px] text-[var(--text-muted)]">
                    {activeNote.linkedResources.length}
                  </span>
                </div>

                {activeNote.linkedResources.length === 0 ? (
                  <p className="text-[11.5px] text-[var(--text-muted)]">
                    Save reference articles, lecture videos, or documentation URLs for this note.
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {activeNote.linkedResources.map((res) => (
                      <div
                        key={res}
                        className="group p-2.5 rounded-lg flex items-center justify-between gap-2 text-[12px]"
                        style={{
                          backgroundColor: 'var(--bg-surface)',
                          border: '1px solid var(--border-subtle)',
                        }}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <ExternalLink className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />
                          {/^https?:\/\//i.test(res) ? (
                            <a
                              href={res}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="truncate text-[var(--accent)] hover:underline"
                            >
                              {res}
                            </a>
                          ) : (
                            <span className="truncate text-[var(--text-secondary)]">{res}</span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveLink(res)}
                          aria-label="Remove link"
                          className="p-1 rounded-md text-[var(--text-muted)] opacity-50 group-hover:opacity-90 hover:!opacity-100 hover:text-rose-500 transition-all shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </aside>
      )}

      {/* Review, On-Demand AI Restructure & Destination Prompt Modal */}
      {pendingImport && (
        <MarkdownImportModal
          pending={pendingImport}
          notes={notes}
          activeNoteId={activeNote?.id}
          subjects={subjects}
          folders={folders}
          defaultSubjectId={activeSubject?.id ?? subjects[0]?.id ?? ''}
          defaultFolderId={activeFolderId}
          onConfirm={handleConfirmMarkdownImport}
          onClose={() => setPendingImport(null)}
        />
      )}

      {/* In-App Delete Note Confirmation Modal (no window.confirm) */}
      {deleteConfirmOpen && activeNote && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-[2px]"
          onClick={() => setDeleteConfirmOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Delete note confirmation"
            className="w-full max-w-sm rounded-xl p-5 space-y-4"
            style={{
              backgroundColor: 'var(--bg-elevated)',
              border: '1px solid var(--border-subtle)',
              boxShadow: 'var(--shadow-floating)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-1.5">
              <h2 className="font-display text-[15px] font-semibold text-[var(--text-primary)]">
                Delete note?
              </h2>
              <p className="text-[12.5px] leading-relaxed text-[var(--text-secondary)]">
                Permanently delete <strong className="text-[var(--text-primary)]">{activeNote.title || 'Untitled Note'}</strong> along with its attached files and annotations?
              </p>
            </div>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmOpen(false)}
                className="px-3.5 py-2 rounded-lg text-[12px] font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)] transition-colors"
                style={{ border: '1px solid var(--border-subtle)' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const id = activeNote.id;
                  setDeleteConfirmOpen(false);
                  deleteNote(id);
                  pushToast('Note deleted');
                }}
                className="px-3.5 py-2 rounded-lg text-[12px] font-medium text-white bg-rose-600 hover:bg-rose-700 transition-colors"
              >
                Delete Note
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
