import { isDestructiveEdit, reviewSelection } from './reviewPolicy';
import {
  lazy,
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
  type FormEvent,
} from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowDown,
  ArrowRight,
  ArrowUp,
  BookOpen,
  CalendarClock,
  Check,
  CheckCircle2,
  ChevronDown,
  Clipboard,
  FileCode2,
  FilePlus2,
  FileSpreadsheet,
  FileText,
  GraduationCap,
  Image as ImageIcon,
  Layers,
  Loader2,
  Maximize2,
  PanelLeft,
  Paperclip,
  Pencil,
  Plus,
  Presentation,
  RefreshCw,
  RotateCcw,
  Search,
  Settings2,
  Sparkles,
  Square,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../firebase/AuthContext';
import { useAssistant, type ChatMessage } from './AssistantContext';
import type { WorkspaceEdit } from './workspaceEdit';
import {
  formatAttachmentMeta,
  PIP_ACCEPTED_FILE_TYPES,
  preparePipAttachment,
  type PipAttachment,
} from './documentAttachments';
import { CHAT_LIMITS, GEMINI_CHAT_MODELS, isModelId } from './protocol';
import './assistant.css';

export function PetFace({ mood = 'ready' }: { mood?: 'ready' | 'working' | 'focus' | 'break' }) {
  const { preferences } = useApp();
  return (
    <span
      className="pip-pet"
      data-mood={mood}
      data-motion={preferences.reducedMotion ? 'off' : undefined}
      aria-hidden="true"
    >
      <span className="pip-ear pip-ear-left" />
      <span className="pip-ear pip-ear-right" />
      <span className="pip-face">
        <span className="pip-eyes">
          <i />
          <i />
        </span>
        <span className="pip-beak" />
      </span>
    </span>
  );
}

function getSafePhotoUrl(url?: string | null): string | null {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  return /^https?:\/\//i.test(trimmed) ? trimmed : null;
}

function computeInitials(name?: string | null): string {
  const clean = (name ?? '').trim();
  if (!clean) return 'U';
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ''}${parts[parts.length - 1][0] ?? ''}`.toUpperCase() || 'U';
}

function UserChatAvatar({
  photoUrl,
  displayName,
}: {
  photoUrl: string | null;
  displayName: string;
}) {
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    setImgFailed(false);
  }, [photoUrl]);

  if (photoUrl && !imgFailed) {
    return (
      <span className="pip-avatar pip-avatar-user" title={displayName}>
        <img
          src={photoUrl}
          alt={displayName}
          referrerPolicy="no-referrer"
          onError={() => setImgFailed(true)}
        />
      </span>
    );
  }

  return (
    <span className="pip-avatar pip-avatar-user pip-avatar-initials" title={displayName} aria-label={displayName}>
      {computeInitials(displayName)}
    </span>
  );
}

function PipChatAvatar({ working = false }: { working?: boolean }) {
  return (
    <span className="pip-avatar pip-avatar-assistant" aria-hidden="true">
      <span className="pip-avatar-pet-scale">
        <PetFace mood={working ? 'working' : 'ready'} />
      </span>
    </span>
  );
}

function AttachmentKindIcon({ kind, className = 'w-4 h-4' }: { kind: PipAttachment['kind']; className?: string }) {
  switch (kind) {
    case 'image':
      return <ImageIcon className={className} />;
    case 'slide':
      return <Presentation className={className} />;
    case 'sheet':
      return <FileSpreadsheet className={className} />;
    case 'code':
      return <FileCode2 className={className} />;
    default:
      return <FileText className={className} />;
  }
}

const DOC_QUICK_ACTIONS = [
  {
    label: 'Summarize key points',
    prompt: 'Summarize the key concepts, main definitions, and essential takeaways from the attached document(s).',
  },
  {
    label: 'Make flashcards',
    prompt: 'Create 8 high-yield study flashcards from the attached document(s) and save them into a flashcard deck in StudyFlow.',
  },
  {
    label: 'Create practice quiz',
    prompt: 'Generate a 6-question multiple-choice practice test from the attached document(s) and add it to StudyFlow.',
  },
  {
    label: 'Save as note',
    prompt: 'Turn the attached document(s) into a clean, well-structured StudyFlow Markdown note with tables and formulas.',
  },
];

const AssistantMarkdown = lazy(() => import('./AssistantMarkdown'));

function PendingReviewCard({
  message,
  pending,
  busy,
  onApprove,
  onCancel,
}: {
  message: ChatMessage;
  pending: WorkspaceEdit[];
  busy: boolean;
  onApprove: (selection?: Record<number, string[] | boolean>) => void;
  onCancel: () => void;
}) {
  const isDestructive = pending.some(isDestructiveEdit);
  const hasDelete = pending.some((item) => item.action.startsWith('delete_'));
  const isApproval = pending.some((item) => item.reviewKind === 'approval' || Boolean(item.reviewItems?.length)) || pending.length >= 2;
  const [selection, setSelection] = useState<Record<number, string[] | boolean>>(() => reviewSelection(pending));

  const totalItems = useMemo(
    () => pending.reduce((sum, edit) => sum + (edit.reviewItems?.length || 1), 0),
    [pending],
  );

  const selectedCount = useMemo(() => {
    let count = 0;
    pending.forEach((edit, idx) => {
      const val = selection[idx];
      if (edit.reviewItems?.length) {
        count += Array.isArray(val) ? val.length : 0;
      } else if (val !== false) {
        count += 1;
      }
    });
    return count;
  }, [pending, selection]);

  function setAll(checked: boolean) {
    setSelection(reviewSelection(pending, checked));
  }

  function toggleTopLevel(idx: number) {
    setSelection((prev) => ({ ...prev, [idx]: prev[idx] === false }));
  }

  function toggleSubItem(editIdx: number, itemId: string) {
    setSelection((prev) => {
      const current = Array.isArray(prev[editIdx]) ? (prev[editIdx] as string[]) : [];
      const exists = current.includes(itemId);
      return {
        ...prev,
        [editIdx]: exists ? current.filter((id) => id !== itemId) : [...current, itemId],
      };
    });
  }

  if (isApproval) {
    return (
      <div
        className="pip-confirm-card pip-confirm-card-approval"
        role="region"
        aria-label="Review and approve proposed changes"
      >
        <div className="pip-confirm-head">
          <CheckCircle2 size={15} className="shrink-0 mt-0.5 text-[var(--accent)]" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <div className="pip-confirm-title">{isDestructive ? "Review additions and sensitive changes" : "Review & approve additions"}</div>
            <div className="pip-confirm-subtitle">
              {isDestructive ? "Sensitive changes start unchecked and require explicit selection. Select all only selects non-destructive items." : "Nothing has been added yet. Uncheck any items you want to skip before approving."}
            </div>
          </div>
        </div>

        <div className="pip-review-select-bar">
          <span className="tabular-nums">
            {selectedCount} of {totalItems} selected
          </span>
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => setAll(true)}>
              {isDestructive ? "Select safe items" : "Select all"}
            </button>
            <button type="button" onClick={() => setAll(false)}>
              Clear
            </button>
          </div>
        </div>

        <div className="pip-review-checklist">
          {pending.map((edit, editIdx) => {
            if (edit.reviewItems?.length) {
              const checkedIds = new Set(
                Array.isArray(selection[editIdx]) ? (selection[editIdx] as string[]) : [],
              );
              return (
                <div key={`${message.id}-${editIdx}`} className="grid gap-1.5">
                  <div className="text-[11.5px] font-semibold text-[var(--text-secondary)] px-0.5">
                    {edit.title}
                  </div>
                  {edit.reviewItems.map((item) => (
                    <label key={item.id} className="pip-review-item">
                      <input
                        type="checkbox"
                        checked={checkedIds.has(item.id)}
                        onChange={() => toggleSubItem(editIdx, item.id)}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="pip-review-item-label">{item.label}</div>
                        {item.meta && <div className="pip-review-item-meta">{item.meta}</div>}
                      </div>
                    </label>
                  ))}
                </div>
              );
            }

            const checked = selection[editIdx] !== false;
            return (
              <label key={`${message.id}-${editIdx}`} className="pip-review-item">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleTopLevel(editIdx)}
                />
                <div className="min-w-0 flex-1">
                  <div className="pip-review-item-label">{isDestructiveEdit(edit) ? "Sensitive: " : ""}{edit.title}</div>
                  {edit.details?.length ? (
                    <div className="pip-review-item-meta">{edit.details.slice(0, 3).join(' · ')}</div>
                  ) : null}
                </div>
              </label>
            );
          })}
        </div>

        <div className="pip-confirm-actions">
          <button
            type="button"
            className="pip-confirm-apply whitespace-nowrap"
            disabled={busy || selectedCount === 0}
            onClick={() => onApprove(selection)}
          >
            {isDestructive && pending.some((edit, i) => isDestructiveEdit(edit) && selection[i] === true) ? "Confirm sensitive & apply selected" : "Approve Selected"} ({selectedCount})
          </button>
          <button
            type="button"
            className="pip-confirm-cancel whitespace-nowrap"
            disabled={busy}
            onClick={onCancel}
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`pip-confirm-card${isDestructive ? ' pip-confirm-card-destructive' : ''}`}
      role="region"
      aria-label={isDestructive ? 'Confirm destructive action' : 'Confirm workspace change'}
    >
      <div className="pip-confirm-head">
        {isDestructive && (
          <AlertTriangle
            size={15}
            className="shrink-0 mt-0.5 text-rose-600 dark:text-rose-400"
            aria-hidden="true"
          />
        )}
        <div className="min-w-0">
          <div className="pip-confirm-title">
            {hasDelete
              ? 'Confirm deletion'
              : isDestructive
                ? 'Confirm sensitive change'
                : 'Confirm workspace change'}
          </div>
          <div className="pip-confirm-subtitle">
            {isDestructive
              ? 'Nothing has been removed or changed yet. Review before proceeding.'
              : 'Review these workspace updates before applying.'}
          </div>
        </div>
      </div>
      <ul className="pip-confirm-list">
        {pending.map((item, idx) => (
          <li key={idx}>
            <span>{item.title}</span>
            {Boolean(item.details?.length) && (
              <ul className="pip-confirm-details">
                {item.details!.slice(0, 8).map((detail, detailIdx) => (
                  <li key={detailIdx}>{detail}</li>
                ))}
                {item.details!.length > 8 && (
                  <li className="pip-confirm-more">
                    +{item.details!.length - 8} more item
                    {item.details!.length - 8 === 1 ? '' : 's'}
                  </li>
                )}
              </ul>
            )}
          </li>
        ))}
      </ul>
      <div className="pip-confirm-actions">
        <button
          type="button"
          className={`pip-confirm-apply${isDestructive ? ' pip-confirm-apply-destructive' : ''}`}
          disabled={busy}
          onClick={() => onApprove()}
        >
          {hasDelete ? 'Confirm & Delete' : 'Confirm & Apply'}
          {pending.length > 1 ? ` (${pending.length})` : ''}
        </button>
        <button
          type="button"
          className="pip-confirm-cancel"
          disabled={busy}
          onClick={onCancel}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

export function AssistantChat({ onClose }: { onClose?: () => void }) {
  const floating = !!onClose;
  const app = useApp();
  const { user, cloudProfile } = useAuth();
  const assistant = useAssistant();

  const [historyOpen, setHistoryOpen] = useState(() => !floating && assistant.conversations.length > 1);
  const [historyQuery, setHistoryQuery] = useState('');
  const [processingLabel, setProcessingLabel] = useState('');
  const [dragging, setDragging] = useState(false);
  const [copied, setCopied] = useState('');
  const [savedNoteMsgId, setSavedNoteMsgId] = useState('');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingMessageDraft, setEditingMessageDraft] = useState('');
  const [showScrollBottom, setShowScrollBottom] = useState(false);

  const picker = useRef<HTMLInputElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const follow = useRef(true);
  const fileRequest = useRef(0);
  const dragDepth = useRef(0);

  const configured = assistant.configured.includes(assistant.settings.provider);
  const processing = Boolean(processingLabel);
  const hasAttachments = assistant.attachments.length > 0;
  const hasDocuments = assistant.attachments.some((item) => item.kind !== 'image');
  const hasImage = assistant.attachments.some((item) => item.kind === 'image');

  const userPhotoUrl = useMemo(
    () =>
      getSafePhotoUrl(
        user?.photoURL || cloudProfile?.photoURL || app.preferences.googleAccount?.photoURL,
      ),
    [user?.photoURL, cloudProfile?.photoURL, app.preferences.googleAccount?.photoURL],
  );
  const userDisplayName =
    user?.displayName ||
    cloudProfile?.displayName ||
    app.preferences.googleAccount?.name ||
    app.preferences.name ||
    'You';

  const activeFailedAttempts = useMemo(
    () => assistant.failedAttempts.filter((item) => item.conversationId === assistant.activeId),
    [assistant.failedAttempts, assistant.activeId],
  );

  const filteredConversations = useMemo(() => {
    const q = historyQuery.trim().toLowerCase();
    if (!q) return assistant.conversations;
    return assistant.conversations.filter(
      (chat) =>
        chat.title.toLowerCase().includes(q) ||
        chat.messages.some((m) => m.text.toLowerCase().includes(q)),
    );
  }, [assistant.conversations, historyQuery]);

  useEffect(() => {
    if (scroller.current && follow.current) {
      scroller.current.scrollTop = scroller.current.scrollHeight;
      setShowScrollBottom(false);
    }
  }, [assistant.active.messages, historyOpen]);

  useEffect(() => {
    follow.current = true;
    setEditingMessageId(null);
    setShowScrollBottom(false);
    if (scroller.current) scroller.current.scrollTop = scroller.current.scrollHeight;
    fileRequest.current++;
    setProcessingLabel('');
    return () => {
      fileRequest.current++;
    };
  }, [assistant.activeId]);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(''), 1800);
    return () => window.clearTimeout(timer);
  }, [copied]);

  useEffect(() => {
    if (!savedNoteMsgId) return;
    const timer = window.setTimeout(() => setSavedNoteMsgId(''), 2200);
    return () => window.clearTimeout(timer);
  }, [savedNoteMsgId]);

  // Auto-resize composer textarea cleanly
  useEffect(() => {
    const el = input.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, floating ? 120 : 168)}px`;
  }, [assistant.draft, floating]);

  function scrollToBottom() {
    follow.current = true;
    setShowScrollBottom(false);
    scroller.current?.scrollTo({
      top: scroller.current.scrollHeight,
      behavior: app.preferences.reducedMotion ? 'auto' : 'smooth',
    });
  }

  async function attachFiles(fileList?: FileList | File[] | null) {
    if (!fileList || assistant.busy || !configured || !assistant.available) return;
    const files = Array.from(fileList).filter(Boolean);
    if (!files.length) return;

    const request = ++fileRequest.current;
    assistant.setNotice('');

    let existingDocs = assistant.attachments.filter((item) => item.kind !== 'image').length;
    const errors: string[] = [];

    for (const file of files) {
      if (request !== fileRequest.current) return;
      const isImg = file.type.startsWith('image/') || /\.(?:png|jpe?g|webp)$/i.test(file.name);
      if (!isImg && existingDocs >= CHAT_LIMITS.maxDocuments) {
        errors.push(`You can attach up to ${CHAT_LIMITS.maxDocuments} documents per message.`);
        break;
      }
      setProcessingLabel(`Preparing ${file.name}…`);
      try {
        const prepared = await preparePipAttachment(file, assistant.detail, (status) => {
          if (request === fileRequest.current) setProcessingLabel(status);
        });
        if (request !== fileRequest.current) return;
        assistant.addAttachment(prepared);
        if (prepared.kind !== 'image') existingDocs++;
      } catch (error) {
        errors.push(error instanceof Error ? error.message : `Could not attach "${file.name}".`);
      }
    }

    if (request === fileRequest.current) {
      setProcessingLabel('');
      if (errors.length) assistant.setNotice(errors[0]);
      input.current?.focus();
    }
  }

  function handleDragEnter(event: DragEvent) {
    if (!configured || assistant.busy || !assistant.available) return;
    if (!event.dataTransfer.types.includes('Files')) return;
    event.preventDefault();
    dragDepth.current++;
    setDragging(true);
  }

  function handleDragOver(event: DragEvent) {
    if (!configured || assistant.busy || !assistant.available) return;
    if (!event.dataTransfer.types.includes('Files')) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  }

  function handleDragLeave(event: DragEvent) {
    if (!event.dataTransfer.types.includes('Files')) return;
    event.preventDefault();
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) setDragging(false);
  }

  function handleDrop(event: DragEvent) {
    event.preventDefault();
    dragDepth.current = 0;
    setDragging(false);
    if (!configured || assistant.busy || !assistant.available) return;
    void attachFiles(event.dataTransfer.files);
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    follow.current = true;
    if (!processing) void assistant.send();
  }

  const starterCards = useMemo(() => {
    const nextExam = [...app.exams]
      .filter((e) => Boolean(e.date))
      .sort((a, b) => a.date.localeCompare(b.date))[0];
    const activeNote =
      app.notes.find((n) => n.id === app.selectedNoteId && (n.content.trim() || n.pdf?.pages?.length)) ??
      app.notes.find((n) => n.content.trim() || n.pdf?.pages?.length);
    const urgentTask =
      app.tasks.find((t) => t.status !== 'done' && t.priority === 'high') ??
      app.tasks.find((t) => t.status !== 'done');

    return [
      {
        icon: Upload,
        title: 'Study a PDF or document',
        description: 'Drop PDFs, Word docs, slides, or images for summaries & quizzes',
        action: () => picker.current?.click(),
      },
      nextExam
        ? {
            icon: GraduationCap,
            title: `Prep for ${nextExam.title}`,
            description: `Target weak syllabus topics and build a prep plan for ${nextExam.date}`,
            action: () => {
              follow.current = true;
              void assistant.send(
                false,
                `Build a focused exam prep plan for "${nextExam.title}" (${nextExam.date}) using my weak syllabus topics, open calendar slots, and create 5 targeted practice questions.`,
              );
            },
          }
        : {
            icon: Sparkles,
            title: 'Analyze my week',
            description: 'Review overdue tasks, upcoming exams, and top study priorities',
            action: () => {
              follow.current = true;
              void assistant.send(
                false,
                'Analyze my workload, upcoming exams, and due tasks, and give me a focused study plan.',
              );
            },
          },
      activeNote
        ? {
            icon: BookOpen,
            title: `Quiz me on ${activeNote.title.length > 26 ? `${activeNote.title.slice(0, 26)}…` : activeNote.title}`,
            description: 'Turn your note into high-yield flashcards or exam-style questions',
            action: () => {
              follow.current = true;
              void assistant.send(
                false,
                `From my note "${activeNote.title}", summarize the core concepts concisely and create 6 high-yield flashcards in a matching deck.`,
              );
            },
          }
        : {
            icon: BookOpen,
            title: 'Generate flashcards from notes',
            description: 'Turn your StudyFlow notes into active-recall cards',
            action: () => {
              follow.current = true;
              void assistant.send(
                false,
                'Create 6 high-yield flashcards from my study notes and add them to a deck.',
              );
            },
          },
      urgentTask
        ? {
            icon: CalendarClock,
            title: `Schedule "${urgentTask.title.length > 24 ? `${urgentTask.title.slice(0, 24)}…` : urgentTask.title}"`,
            description: 'Book a focused block in your next open slot today',
            action: () => {
              follow.current = true;
              void assistant.send(
                false,
                `Find my next open calendar slot today and schedule a focused study session to complete "${urgentTask.title}".`,
              );
            },
          }
        : {
            icon: CalendarClock,
            title: 'Schedule next study block',
            description: 'Find an open slot today and book a focused session on your calendar',
            action: () => {
              follow.current = true;
              void assistant.send(
                false,
                'Schedule a 1h study session for my highest-priority subject in my next open slot today.',
              );
            },
          },
    ];
  }, [app.exams, app.notes, app.selectedNoteId, app.tasks, assistant]);

  function saveReplyAsNote(messageId: string, markdown: string) {
    const clean = markdown.trim();
    if (!clean) return;
    const headingMatch = clean.match(/^#{1,3}\s+(.+)$/m);
    const firstLine = clean.split('\n').find((line) => line.trim().length > 0) ?? 'Pip Study Note';
    const rawTitle = (headingMatch?.[1] ?? firstLine)
      .replace(/[*_`[\]()#]/g, '')
      .trim()
      .slice(0, 72);
    const title = rawTitle || 'Pip Study Note';
    const selectedNote = app.notes.find((n) => n.id === app.selectedNoteId);
    const subjectId = selectedNote?.subjectId || app.subjects[0]?.id || '';
    const folderId =
      app.folders.find((f) => f.subjectId && f.subjectId === subjectId)?.id ??
      app.folders[0]?.id ??
      'fld-all';
    app.createNote(subjectId, folderId, {
      title,
      content: clean,
      tags: ['Pip'],
    });
    setSavedNoteMsgId(messageId);
  }

  const headerTitle =
    assistant.active.messages.length > 0 && assistant.active.title
      ? assistant.active.title
      : 'Pip';

  return (
    <section
      className={`pip-chat ${floating ? 'pip-chat-floating' : 'pip-chat-page'}`}
      aria-label="StudyFlow Assistant"
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drag-and-Drop Overlay */}
      {dragging && (
        <div className="pip-dropzone" aria-live="polite">
          <div className="pip-dropzone-inner">
            <Upload className="w-6 h-6" style={{ color: 'var(--accent)' }} />
            <div className="font-display text-[15px] font-semibold text-[var(--text-primary)]">
              Drop files to study with Pip
            </div>
            <p className="text-[12px] text-[var(--text-muted)]">
              PDF, Word (.docx/.doc), PowerPoint (.pptx), Markdown, CSV, TXT, code, or images
            </p>
          </div>
        </div>
      )}

      {/* Minimal Airy Studio Header */}
      <header className="pip-header">
        <div className="pip-header-id">
          <button
            type="button"
            className={`pip-icon ${historyOpen ? 'pip-icon-active' : ''}`}
            aria-expanded={historyOpen}
            onClick={() => setHistoryOpen((open) => !open)}
            aria-label="Toggle chat history"
            title="Chat history"
          >
            <PanelLeft size={16} />
          </button>
          <div className="min-w-0 flex items-center gap-2.5">
            <PetFace mood={assistant.busy ? 'working' : 'ready'} />
            <div className="min-w-0">
              <h2 className="truncate" title={headerTitle}>
                {headerTitle}
              </h2>
              {!floating && assistant.active.messages.length === 0 && (
                <p>Study coach &amp; workspace assistant</p>
              )}
            </div>
          </div>
        </div>

        <div className="pip-actions">
          <button
            type="button"
            aria-pressed={assistant.includeContext}
            onClick={() => assistant.setIncludeContext(!assistant.includeContext)}
            title={
              assistant.includeContext
                ? 'Workspace access enabled — Pip can read your schedule, notes, and run actions'
                : 'Workspace access paused — Pip only reads this conversation and attached files'
            }
            className={`pip-toggle-btn ${assistant.includeContext ? 'pip-toggle-active' : ''}`}
          >
            <Layers size={14} className="shrink-0" />
            {!floating && <span>Workspace</span>}
          </button>

          <button
            type="button"
            className="pip-icon"
            onClick={assistant.newChat}
            disabled={assistant.busy || !assistant.active.messages.length}
            aria-label="New chat"
            title="New chat"
          >
            <Plus size={16} />
          </button>

          <button
            type="button"
            className="pip-icon"
            onClick={assistant.openSettings}
            aria-label="AI settings"
            title="AI settings"
          >
            <Settings2 size={16} />
          </button>

          {floating && (
            <>
              <button
                type="button"
                className="pip-icon pip-maximize"
                onClick={() => {
                  assistant.openFullChat();
                  assistant.setPetOpen(false);
                }}
                aria-label="Open full assistant"
                title="Open full workspace"
              >
                <Maximize2 size={15} />
              </button>
              <button
                type="button"
                className="pip-icon"
                onClick={onClose}
                aria-label="Close chat"
                title="Close chat"
              >
                <X size={17} />
              </button>
            </>
          )}
        </div>
      </header>

      <div className={`pip-chat-body${historyOpen ? ' pip-history-open' : ''}`}>
        {/* Threads Sidebar */}
        {historyOpen && (
          <aside className="pip-history" aria-label="Chat history">
            <div className="pip-history-top">
              <button
                type="button"
                className="pip-new-thread-btn"
                disabled={assistant.busy || !assistant.active.messages.length}
                onClick={() => {
                  assistant.newChat();
                  if (floating) setHistoryOpen(false);
                }}
              >
                <Plus size={14} />
                <span>New conversation</span>
              </button>
              {floating && (
                <button
                  type="button"
                  className="pip-icon"
                  onClick={() => setHistoryOpen(false)}
                  aria-label="Close chat history"
                >
                  <X size={15} />
                </button>
              )}
            </div>

            {assistant.conversations.length > 3 && (
              <div className="pip-history-search">
                <Search size={13} className="text-[var(--text-muted)] shrink-0" />
                <input
                  type="search"
                  value={historyQuery}
                  onChange={(e) => setHistoryQuery(e.target.value)}
                  placeholder="Search threads…"
                  aria-label="Search conversations"
                />
              </div>
            )}

            <ul className="pip-history-list">
              {filteredConversations.map((chat) => (
                <li key={chat.id} data-active={chat.id === assistant.activeId}>
                  {renamingId === chat.id ? (
                    <form
                      className="flex flex-1 items-center gap-1 px-1"
                      onSubmit={(e) => {
                        e.preventDefault();
                        assistant.renameChat(chat.id, renameDraft);
                        setRenamingId(null);
                      }}
                    >
                      <input
                        type="text"
                        value={renameDraft}
                        onChange={(e) => setRenameDraft(e.target.value)}
                        aria-label="Rename conversation"
                        autoFocus
                        className="min-w-0 flex-1 rounded border border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] px-1.5 py-0.5 text-[12px] text-[var(--text-primary)] outline-none"
                      />
                      <button type="submit" className="pip-icon" aria-label="Save name" title="Save">
                        <Check size={13} />
                      </button>
                      <button
                        type="button"
                        className="pip-icon"
                        onClick={() => setRenamingId(null)}
                        aria-label="Cancel rename"
                      >
                        <X size={13} />
                      </button>
                    </form>
                  ) : confirmDeleteId === chat.id ? (
                    <div className="flex flex-1 items-center justify-between gap-1 px-2 text-[11.5px]">
                      <span className="truncate text-[var(--text-secondary)]">Delete thread?</span>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          className="rounded px-1.5 py-0.5 text-[11px] font-semibold text-rose-600 dark:text-rose-400 hover:bg-[var(--bg-surface-hover)]"
                          onClick={() => {
                            assistant.removeChat(chat.id);
                            setConfirmDeleteId(null);
                          }}
                        >
                          Delete
                        </button>
                        <button
                          type="button"
                          className="rounded px-1.5 py-0.5 text-[11px] text-[var(--text-muted)] hover:bg-[var(--bg-surface-hover)]"
                          onClick={() => setConfirmDeleteId(null)}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <button
                        type="button"
                        className="pip-history-thread"
                        aria-current={chat.id === assistant.activeId ? 'true' : undefined}
                        disabled={assistant.busy}
                        title={chat.title}
                        onClick={() => {
                          assistant.switchChat(chat.id);
                          if (floating) setHistoryOpen(false);
                        }}
                      >
                        <span className="pip-history-title">{chat.title}</span>
                        {chat.messages.length > 0 && (
                          <span className="pip-history-count tabular-nums">
                            {Math.ceil(chat.messages.length / 2)}{' '}
                            {Math.ceil(chat.messages.length / 2) === 1 ? 'turn' : 'turns'}
                          </span>
                        )}
                      </button>
                      {chat.messages.length > 0 && (
                        <div className="pip-history-row-actions">
                          <button
                            type="button"
                            className="pip-icon"
                            disabled={assistant.busy}
                            aria-label={`Rename ${chat.title}`}
                            title="Rename chat"
                            onClick={() => {
                              setConfirmDeleteId(null);
                              setRenamingId(chat.id);
                              setRenameDraft(chat.title);
                            }}
                          >
                            <Pencil size={12} />
                          </button>
                          <button
                            type="button"
                            className="pip-icon"
                            disabled={assistant.busy}
                            aria-label={`Delete ${chat.title}`}
                            title="Delete chat"
                            onClick={() => {
                              setRenamingId(null);
                              setConfirmDeleteId(chat.id);
                            }}
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </li>
              ))}
            </ul>
          </aside>
        )}

        {/* Main Chat Canvas + Floating Jump + Dismissible Failed Tray + Docked Composer */}
        <div className="pip-chat-content">
          <div
            className="pip-messages"
            ref={scroller}
            onScroll={(event) => {
              const el = event.currentTarget;
              const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
              follow.current = distanceFromBottom < 90;
              setShowScrollBottom(distanceFromBottom > 140);
            }}
          >
            <div className="pip-messages-inner">
              {!assistant.active.messages.length && (
                <div className="pip-welcome">
                  <div className="pip-welcome-head">
                    <PetFace />
                    <h3>What are we studying today?</h3>
                    <p>
                      Attach PDFs, Word docs, lecture slides, or screenshots — or ask Pip to explain concepts with
                      diagrams, build study sets, and organize your week.
                    </p>
                  </div>

                  {!assistant.available ? (
                    <p className="pip-muted">
                      Open StudyFlow at <strong>localhost</strong> to use the assistant.
                    </p>
                  ) : !configured ? (
                    <button type="button" className="pip-connect-btn" onClick={assistant.openSettings}>
                      Configure AI provider
                    </button>
                  ) : (
                    <>
                      <div className={`pip-starter-grid ${floating ? 'pip-starter-grid-compact' : ''}`}>
                        {starterCards.map((card) => {
                          const Icon = card.icon;
                          return (
                            <button
                              key={card.title}
                              type="button"
                              className="pip-starter-card"
                              onClick={card.action}
                            >
                              <Icon className="w-4 h-4 shrink-0 mt-0.5" style={{ color: 'var(--accent)' }} />
                              <div className="min-w-0">
                                <div className="pip-starter-title">{card.title}</div>
                                {!floating && <div className="pip-starter-desc">{card.description}</div>}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                      <p className="pip-formats-note">
                        PDF, DOCX, PPTX, Markdown, CSV, TXT, code &amp; images · Drag &amp; drop anywhere
                      </p>
                    </>
                  )}
                </div>
              )}

              {assistant.active.messages.map((message) => {
                const pending = message.pendingEdits?.length
                  ? message.pendingEdits
                  : message.edit
                    ? [message.edit]
                    : [];
                const msgAttachments = message.attachments?.length
                  ? message.attachments
                  : message.attachment
                    ? [{ name: message.attachment, kind: 'image' as const }]
                    : [];
                const isEditingThisUser = message.role === 'user' && editingMessageId === message.id;

                if (message.role === 'user') {
                  return (
                    <div key={message.id} className="pip-row pip-row-user">
                      <div className="pip-user-column">
                        <article className="pip-message pip-user" aria-label={userDisplayName}>
                          {msgAttachments.length > 0 && (
                            <div className="pip-message-files">
                              {msgAttachments.map((file, idx) => (
                                <div key={`${file.name}-${idx}`} className="pip-message-file-card">
                                  <AttachmentKindIcon
                                    kind={file.kind}
                                    className="w-3.5 h-3.5 shrink-0 text-[var(--accent)]"
                                  />
                                  <div className="min-w-0">
                                    <div className="pip-message-file-name">{file.name}</div>
                                    {file.meta && <div className="pip-message-file-meta">{file.meta}</div>}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {isEditingThisUser ? (
                            <form
                              className="pip-edit-form"
                              onSubmit={(e) => {
                                e.preventDefault();
                                const next = editingMessageDraft.trim();
                                if (!next) return;
                                setEditingMessageId(null);
                                follow.current = true;
                                assistant.editAndResendMessage(message.id, next);
                              }}
                            >
                              <textarea
                                value={editingMessageDraft}
                                onChange={(e) => setEditingMessageDraft(e.target.value)}
                                rows={Math.min(6, Math.max(2, editingMessageDraft.split('\n').length))}
                                autoFocus
                                aria-label="Edit your message"
                                onKeyDown={(e) => {
                                  if (e.key === 'Escape') {
                                    setEditingMessageId(null);
                                  } else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                                    e.preventDefault();
                                    const next = editingMessageDraft.trim();
                                    if (!next) return;
                                    setEditingMessageId(null);
                                    follow.current = true;
                                    assistant.editAndResendMessage(message.id, next);
                                  }
                                }}
                              />
                              <div className="pip-edit-actions">
                                <button
                                  type="button"
                                  className="pip-confirm-cancel"
                                  onClick={() => setEditingMessageId(null)}
                                >
                                  Cancel
                                </button>
                                <button
                                  type="submit"
                                  className="pip-confirm-apply"
                                  disabled={assistant.busy || !editingMessageDraft.trim()}
                                >
                                  Save &amp; Resend
                                </button>
                              </div>
                            </form>
                          ) : (
                            <p className="pip-user-text">{message.text}</p>
                          )}
                        </article>

                        {!isEditingThisUser && !assistant.busy && (
                          <div className="pip-user-actions">
                            <button
                              type="button"
                              className="pip-copy-btn"
                              aria-label="Edit message"
                              title="Edit and resend message"
                              onClick={() => {
                                setEditingMessageId(message.id);
                                setEditingMessageDraft(message.text);
                              }}
                            >
                              <Pencil size={11} />
                              <span>Edit</span>
                            </button>
                          </div>
                        )}
                      </div>

                      <UserChatAvatar photoUrl={userPhotoUrl} displayName={userDisplayName} />
                    </div>
                  );
                }

                return (
                  <div key={message.id} className="pip-row pip-row-assistant">
                    <PipChatAvatar working={message.state === 'streaming'} />

                    <article className="pip-message pip-assistant" aria-label="Pip">
                      <div className="pip-message-header">
                        <span className="pip-message-name">Pip</span>
                        {message.state === 'streaming' && (
                          <span className="pip-streaming-hint">Thinking…</span>
                        )}
                      </div>

                      {message.text ? (
                        <div className="pip-markdown">
                          <Suspense fallback={<p className="pip-muted">Formatting reply…</p>}>
                            <AssistantMarkdown
                              text={message.text}
                              diagrams={message.state !== 'streaming'}
                            />
                          </Suspense>
                        </div>
                      ) : (
                        <p className="pip-muted">
                          {message.state === 'streaming'
                            ? 'Reading your context & preparing a reply…'
                            : 'Reply stopped.'}
                        </p>
                      )}

                      {message.generatedImage && (
                        <a
                          className="block"
                          href={`data:${message.generatedImage.mime};base64,${message.generatedImage.base64}`}
                          download={`studyflow-image.${message.generatedImage.mime.split('/')[1]}`}
                        >
                          <img
                            className="mt-2.5 max-h-96 max-w-full rounded-xl object-contain"
                            alt="AI-generated image. Click to download."
                            src={`data:${message.generatedImage.mime};base64,${message.generatedImage.base64}`}
                          />
                        </a>
                      )}

                      {message.suggestedTask && <button className="pip-action-link" disabled={app.focusTimer.running} onClick={() => {
                        const task = message.suggestedTask!;
                        if (app.focusTimer.running || !app.tasks.some(t => t.title === task.title && t.subjectId === task.subjectId && t.status !== 'done')) return;
                        app.setFocusDuration(0, 10);
                        app.setFocusContext(task.subjectId, task.title);
                        app.toggleFocusRunning();
                      }}>Start 10 min</button>}
                      {Boolean(message.appliedActions?.length) && (
                        <div className="pip-action-card" role="status">
                          <div className="pip-action-card-list">
                            {message.appliedActions!.map((summary, idx) => (
                              <div key={idx} className="pip-action-card-row">
                                <CheckCircle2 size={14} className="shrink-0 text-emerald-500 mt-0.5" />
                                <span>{summary}</span>
                              </div>
                            ))}
                          </div>
                          {Boolean(message.actionLinks?.length) && (
                            <div className="pip-action-card-links">
                              {message.actionLinks!.map((link) => (
                                <button
                                  key={link.itemId ?? link.route}
                                  type="button"
                                  className="pip-action-link"
                                  onClick={() => {
                                    if (link.route === 'notes' && link.itemId) {
                                      const note = app.notes.find(item => item.id === link.itemId);
                                      if (!note) { app.pushToast('This note is no longer available.'); return; }
                                      app.setNotesSyllabusScope({ subjectId: note.subjectId, unitId: note.syllabusLinks?.unitIds?.[0] });
                                      app.setSelectedNoteId(note.id);
                                    }
                                    app.setRoute(link.route);
                                    if (onClose) onClose();
                                  }}
                                >
                                  {link.label} <ArrowRight size={12} />
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {pending.length > 0 && (
                        <PendingReviewCard
                          key={message.id}
                          message={message}
                          pending={pending}
                          busy={assistant.busy}
                          onApprove={(selection) => void assistant.applyEdit(message, selection)}
                          onCancel={() => assistant.cancelEdit(message.id)}
                        />
                      )}

                      {message.state !== 'streaming' && (
                        <div className="pip-message-meta">
                          {message.text && (
                            <>
                              <button
                                type="button"
                                className="pip-copy-btn"
                                aria-label="Copy reply"
                                title="Copy reply"
                                onClick={async () => {
                                  try {
                                    await navigator.clipboard.writeText(message.text);
                                    setCopied(message.id);
                                  } catch {
                                    assistant.setNotice(
                                      'Could not copy the reply. You can select its text and copy it.',
                                    );
                                  }
                                }}
                              >
                                {copied === message.id ? <Check size={12} /> : <Clipboard size={12} />}
                                <span>{copied === message.id ? 'Copied' : 'Copy'}</span>
                              </button>
                              <button
                                type="button"
                                className="pip-copy-btn"
                                aria-label="Save reply as note"
                                title="Save reply to StudyFlow Notes"
                                onClick={() => saveReplyAsNote(message.id, message.text)}
                              >
                                {savedNoteMsgId === message.id ? (
                                  <Check size={12} />
                                ) : (
                                  <FilePlus2 size={12} />
                                )}
                                <span>{savedNoteMsgId === message.id ? 'Saved to Notes' : 'Save to Notes'}</span>
                              </button>
                            </>
                          )}
                          <button
                            type="button"
                            className="pip-copy-btn"
                            disabled={assistant.busy}
                            aria-label="Regenerate reply"
                            title="Regenerate this reply"
                            onClick={() => {
                              follow.current = true;
                              assistant.regenerateMessage(message.id);
                            }}
                          >
                            <RefreshCw size={12} />
                            <span>Regenerate</span>
                          </button>
                        </div>
                      )}
                    </article>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Floating Scroll-to-Bottom Button */}
          {showScrollBottom && (
            <div className="pip-scroll-bottom-wrap">
              <button
                type="button"
                className="pip-scroll-bottom-btn"
                onClick={scrollToBottom}
                aria-label="Scroll to latest message"
                title="Jump to latest message"
              >
                <ArrowDown size={14} />
                <span>Latest</span>
              </button>
            </div>
          )}

          {/* Docked Composer + Dismissible Failed-Attempt Tray */}
          <form className="pip-composer" onSubmit={submit}>
            <div className="pip-composer-inner">
              {/* Dismissible Failed Messages Tray (never saved in chat history) */}
              {activeFailedAttempts.length > 0 && (
                <div className="pip-failed-tray" aria-live="polite" aria-label="Failed messages">
                  {activeFailedAttempts.map((item) => (
                    <div key={item.id} className="pip-failed-card" role="alert">
                      <AlertCircle size={15} className="shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
                      <div className="min-w-0 flex-1">
                        <div className="pip-failed-error">{item.errorMessage}</div>
                        <div className="pip-failed-prompt" title={item.prompt}>
                          {item.prompt}
                          {item.attachments.length > 0 && (
                            <span className="pip-failed-files">
                              {' '}· {item.attachments.length}{' '}
                              {item.attachments.length === 1 ? 'file' : 'files'}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="pip-failed-actions">
                        <button
                          type="button"
                          className="pip-failed-btn pip-failed-btn-primary"
                          disabled={assistant.busy || assistant.cooldown > 0}
                          onClick={() => {
                            follow.current = true;
                            assistant.retryFailedAttempt(item.id);
                          }}
                        >
                          <RefreshCw size={12} />
                          <span>Retry</span>
                        </button>
                        <button
                          type="button"
                          className="pip-failed-btn"
                          disabled={assistant.busy}
                          onClick={() => {
                            assistant.editFailedAttempt(item.id);
                            input.current?.focus();
                          }}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="pip-icon"
                          aria-label="Dismiss failed message"
                          title="Dismiss"
                          onClick={() => assistant.dismissFailedAttempt(item.id)}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {assistant.cooldown > 0 && (
                <p className="pip-notice" role="status">
                  Provider cooling down — try again in {assistant.cooldown}s.
                </p>
              )}
              {assistant.notice && (
                <p className="pip-notice" role="status">
                  {assistant.notice}
                </p>
              )}

              {/* Quick Document Actions when PDF/docs are attached */}
              {hasDocuments && !assistant.draft.trim() && !assistant.busy && !processing && (
                <div className="pip-doc-actions" aria-label="Quick document actions">
                  {DOC_QUICK_ACTIONS.map((item) => (
                    <button
                      key={item.label}
                      type="button"
                      className="pip-doc-action-btn"
                      onClick={() => {
                        follow.current = true;
                        void assistant.send(false, item.prompt);
                      }}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              )}

              {/* Attached Files Strip */}
              {hasAttachments && (
                <div className="pip-attachments-strip">
                  {assistant.attachments.map((item) => (
                    <div key={item.id} className="pip-attachment-tile">
                      {item.image ? (
                        <img
                          alt={item.name}
                          src={`data:${item.image.mime};base64,${item.image.base64}`}
                          className="pip-attachment-thumb"
                        />
                      ) : (
                        <span className="pip-attachment-icon">
                          <AttachmentKindIcon kind={item.kind} className="w-4 h-4" />
                        </span>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="pip-attachment-name" title={item.name}>
                          {item.name}
                        </div>
                        <div className="pip-attachment-meta">{formatAttachmentMeta(item)}</div>
                      </div>
                      <button
                        type="button"
                        className="pip-icon"
                        onClick={() => assistant.removeAttachment(item.id)}
                        aria-label={`Remove ${item.name}`}
                        title="Remove attachment"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Elevated Studio Composer Card */}
              <div className="pip-input">
                <textarea
                  ref={input}
                  aria-label="Message Pip"
                  placeholder={
                    hasDocuments
                      ? 'Ask a question about your attached document(s), or press Enter to summarize…'
                      : 'Ask Pip anything, request a diagram, attach a PDF, or plan your week…'
                  }
                  rows={1}
                  value={assistant.draft}
                  maxLength={CHAT_LIMITS.prompt}
                  onChange={(event) => assistant.setDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                      event.preventDefault();
                      if (!assistant.busy && !processing) {
                        follow.current = true;
                        void assistant.send();
                      }
                    }
                  }}
                  onPaste={(event) => {
                    const files = Array.from(event.clipboardData.files);
                    if (files.length && configured && assistant.available && !assistant.busy) {
                      event.preventDefault();
                      void attachFiles(files);
                    }
                  }}
                />

                <div className="pip-input-bar">
                  <div className="pip-actions">
                    <input
                      ref={picker}
                      type="file"
                      accept={PIP_ACCEPTED_FILE_TYPES}
                      multiple
                      hidden
                      onChange={(event) => {
                        void attachFiles(event.target.files);
                        event.target.value = '';
                      }}
                    />
                    <button
                      type="button"
                      className="pip-attach-btn"
                      title="Attach PDF, Word doc, PowerPoint, Markdown, CSV, TXT, code, or image"
                      aria-label="Attach PDF, document, or image"
                      disabled={!configured || assistant.busy || processing || !assistant.available}
                      onClick={() => picker.current?.click()}
                    >
                      <Paperclip size={15} />
                      {!floating && <span>Attach</span>}
                    </button>

                    {hasImage && (
                      <select
                        aria-label="Image detail"
                        value={assistant.detail}
                        onChange={(event) =>
                          assistant.setDetail(event.target.value === 'high' ? 'high' : 'standard')
                        }
                        disabled={assistant.busy || processing}
                      >
                        <option value="standard">Standard detail</option>
                        <option value="high">Fine text detail</option>
                      </select>
                    )}

                    <span role="status" className="pip-muted">{configured ? 'Gemini configured' : assistant.keyStorage === 'loading' || assistant.serverStatus === 'checking' ? 'Checking Gemini…' : 'Gemini needs setup'}</span>
                    {assistant.includeContext && !floating && (
                      <details className="pip-context-popover">
                        <summary title="Inspect StudyFlow context sent with your message">
                          <span>{assistant.context.label}</span>
                          <ChevronDown size={12} />
                        </summary>
                        <pre>
                          {assistant.context.text || 'Type a message to preview matching workspace records.'}
                        </pre>
                      </details>
                    )}

                    {assistant.previousAttachments.length > 0 &&
                      !hasAttachments &&
                      !assistant.busy &&
                      !processing && (
                        <button
                          type="button"
                          className="pip-reuse-btn"
                          onClick={assistant.reusePreviousAttachments}
                        >
                          <RotateCcw size={12} />
                          <span>
                            Reuse {assistant.previousAttachments.length === 1 ? 'file' : 'files'}
                          </span>
                        </button>
                      )}

                    {processing && (
                      <span className="pip-processing" role="status">
                        <Loader2 size={13} className="animate-spin shrink-0" />
                        <span>{processingLabel}</span>
                      </span>
                    )}
                  </div>

                  {/* Right Cluster: Compact Model Selector beside Send/Stop */}
                  <div className="pip-send-cluster">
                    {configured && (
                      <select
                        aria-label="Select Gemini chat model"
                        title="Select Gemini chat model"
                        value={assistant.model}
                        disabled={assistant.busy}
                        onChange={(event) => {
                          const nextModel = event.target.value;
                          if (isModelId(nextModel)) {
                            assistant.updateSettings({
                              ...assistant.settings,
                              models: { ...assistant.settings.models, gemini: nextModel },
                            });
                          }
                        }}
                        className="pip-model-select"
                      >
                        {GEMINI_CHAT_MODELS.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.id}
                            {item.tier === 'paid' ? ' (Paid)' : ''}
                          </option>
                        ))}
                      </select>
                    )}

                    {assistant.busy ? (
                      <button
                        type="button"
                        className="pip-send"
                        onClick={assistant.stop}
                        aria-label="Stop reply"
                        title="Stop reply"
                      >
                        <Square size={13} />
                      </button>
                    ) : (
                      <button
                        type="submit"
                        className="pip-send"
                        disabled={
                          !assistant.available ||
                          assistant.cooldown > 0 ||
                          processing ||
                          (!assistant.draft.trim() && !hasAttachments)
                        }
                        aria-label="Send message"
                        title="Send message"
                      >
                        <ArrowUp size={17} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}
