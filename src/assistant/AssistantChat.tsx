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
  ArrowRight,
  ArrowUp,
  BookOpen,
  CalendarClock,
  Check,
  CheckCircle2,
  ChevronDown,
  Clipboard,
  FileCode2,
  FileSpreadsheet,
  FileText,
  Image as ImageIcon,
  ImagePlus,
  Layers,
  Loader2,
  Maximize2,
  PanelLeft,
  Paperclip,
  Pencil,
  Plus,
  Presentation,
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
import { useAssistant } from './AssistantContext';
import {
  formatAttachmentMeta,
  PIP_ACCEPTED_FILE_TYPES,
  preparePipAttachment,
  type PipAttachment,
} from './documentAttachments';
import { CHAT_LIMITS, PROVIDERS } from './protocol';
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

export function AssistantChat({ onClose }: { onClose?: () => void }) {
  const floating = !!onClose;
  const app = useApp();
  const assistant = useAssistant();
  const [historyOpen, setHistoryOpen] = useState(() => !floating && assistant.conversations.length > 1);
  const [historyQuery, setHistoryQuery] = useState('');
  const [processingLabel, setProcessingLabel] = useState('');
  const [dragging, setDragging] = useState(false);
  const [copied, setCopied] = useState('');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

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
    }
  }, [assistant.active.messages, historyOpen]);

  useEffect(() => {
    follow.current = true;
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

  // Auto-resize composer textarea cleanly
  useEffect(() => {
    const el = input.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, floating ? 120 : 168)}px`;
  }, [assistant.draft, floating]);

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
    if (event.dataTransfer.files?.length) {
      void attachFiles(event.dataTransfer.files);
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    follow.current = true;
    if (!processing) void assistant.send();
  }

  const starterCards = [
    {
      icon: Upload,
      title: 'Study a PDF or document',
      description: 'Attach PDFs, Word docs, slides, or notes for summaries & quizzes',
      action: () => picker.current?.click(),
    },
    {
      icon: Sparkles,
      title: 'Analyze my week',
      description: 'Review overdue tasks, upcoming exams, and top study priorities',
      action: () => {
        follow.current = true;
        void assistant.send(false, 'Analyze my workload, upcoming exams, and due tasks, and give me a focused study plan.');
      },
    },
    {
      icon: CalendarClock,
      title: 'Schedule next study block',
      description: 'Find an open slot today and book a focused session on your calendar',
      action: () => {
        follow.current = true;
        void assistant.send(false, 'Schedule a 1h study session for my highest-priority subject in my next open slot today.');
      },
    },
    {
      icon: BookOpen,
      title: 'Generate flashcards from notes',
      description: 'Turn your existing StudyFlow notes into active-recall cards',
      action: () => {
        follow.current = true;
        void assistant.send(false, 'Create 6 high-yield flashcards from my study notes and add them to a deck.');
      },
    },
  ];

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

      {/* Clean Studio Header */}
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
          <PetFace mood={assistant.busy ? 'working' : 'ready'} />
          <div className="min-w-0">
            <div className="flex items-baseline gap-2 min-w-0">
              <h2 className="truncate">Pip</h2>
              {!floating && (
                <span className="text-[12px] text-[var(--text-muted)] truncate hidden sm:inline">
                  Study coach &amp; document analyst
                </span>
              )}
            </div>
            <p>
              {configured
                ? `${PROVIDERS[assistant.settings.provider].label} · ${assistant.model}`
                : 'Connect an AI provider to chat'}
            </p>
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
            title="AI settings & usage"
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
                            {Math.ceil(chat.messages.length / 2)} {Math.ceil(chat.messages.length / 2) === 1 ? 'turn' : 'turns'}
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

        {/* Main Chat Canvas + Docked Composer */}
        <div className="pip-chat-content">
          <div
            className="pip-messages"
            ref={scroller}
            onScroll={(event) => {
              const el = event.currentTarget;
              follow.current = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
            }}
          >
            <div className="pip-messages-inner">
              {!assistant.active.messages.length && (
                <div className="pip-welcome">
                  <div className="pip-welcome-head">
                    <PetFace />
                    <h3>What are we studying today?</h3>
                    <p>
                      Attach PDFs, Word docs, lecture slides, or screenshots — or ask Pip to organize your
                      schedule, analyze your week, and build study sets.
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
                              <Icon className="w-4 h-4 shrink-0" style={{ color: 'var(--accent)' }} />
                              <div className="min-w-0">
                                <div className="pip-starter-title">{card.title}</div>
                                {!floating && <div className="pip-starter-desc">{card.description}</div>}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                      <p className="pip-formats-note">
                        Supports PDF, DOCX, DOC, PPTX, Markdown, CSV, TXT, code files, and images · Drag &amp; drop
                        anywhere
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

                return (
                  <article
                    key={message.id}
                    className={`pip-message pip-${message.role}`}
                    aria-label={message.role === 'user' ? 'You' : 'Pip'}
                  >
                    {message.role === 'assistant' && (
                      <div className="pip-message-header">
                        <span className="pip-message-name">Pip</span>
                        {message.state === 'streaming' && (
                          <span className="pip-streaming-hint">Working…</span>
                        )}
                      </div>
                    )}

                    {msgAttachments.length > 0 && (
                      <div className="pip-message-files">
                        {msgAttachments.map((file, idx) => (
                          <div key={`${file.name}-${idx}`} className="pip-message-file-card">
                            <AttachmentKindIcon kind={file.kind} className="w-3.5 h-3.5 shrink-0 text-[var(--accent)]" />
                            <div className="min-w-0">
                              <div className="pip-message-file-name">{file.name}</div>
                              {file.meta && <div className="pip-message-file-meta">{file.meta}</div>}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {message.role === 'user' ? (
                      <p className="pip-user-text">{message.text}</p>
                    ) : message.text ? (
                      <div className="pip-markdown">
                        <Suspense fallback={<p className="pip-muted">Formatting reply…</p>}>
                          <AssistantMarkdown text={message.text} diagrams={message.state === 'complete'} />
                        </Suspense>
                      </div>
                    ) : (
                      <p className={message.state === 'error' ? 'text-rose-600 dark:text-rose-400 text-[12.5px]' : 'pip-muted'}>
                        {message.state === 'streaming'
                          ? 'Reading documents & checking your workspace…'
                          : message.state === 'stopped'
                            ? 'Reply stopped.'
                            : message.errorMessage || 'Reply unavailable.'}
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
                                key={link.route}
                                type="button"
                                className="pip-action-link"
                                onClick={() => {
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
                      <div className="pip-confirm-card">
                        <div className="pip-confirm-title">Confirm workspace change</div>
                        <ul className="pip-confirm-list">
                          {pending.map((item, idx) => (
                            <li key={idx}>{item.title}</li>
                          ))}
                        </ul>
                        <div className="pip-confirm-actions">
                          <button
                            type="button"
                            className="pip-confirm-apply"
                            disabled={assistant.busy}
                            onClick={() => void assistant.applyEdit(message)}
                          >
                            Apply{pending.length > 1 ? ` (${pending.length})` : ''}
                          </button>
                          <button
                            type="button"
                            className="pip-confirm-cancel"
                            disabled={assistant.busy}
                            onClick={() => assistant.cancelEdit(message.id)}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}

                    {message.role === 'assistant' && message.state !== 'streaming' && (
                      <div className="pip-message-meta">
                        {message.tokens && (
                          <span className="font-mono tabular-nums">
                            {message.tokens.total.toLocaleString()} tokens
                          </span>
                        )}
                        {message.text && (
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
                        )}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          </div>

          {/* Docked Composer */}
          <form className="pip-composer" onSubmit={submit}>
            <div className="pip-composer-inner">
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

              {/* Input Box */}
              <div className="pip-input">
                <textarea
                  ref={input}
                  aria-label="Message Pip"
                  placeholder={
                    hasDocuments
                      ? 'Ask a question about your attached document(s), or press Enter to summarize…'
                      : 'Ask Pip anything, attach a PDF/doc, or manage your study schedule…'
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
                      {!floating && <span>Attach PDF / file</span>}
                    </button>

                    <button
                      type="button"
                      className="pip-icon"
                      aria-label="Generate image from message"
                      title={
                        assistant.settings.provider === 'claude'
                          ? 'Choose OpenAI or Gemini to generate images'
                          : 'Generate an image from your message'
                      }
                      disabled={
                        !configured ||
                        assistant.busy ||
                        assistant.cooldown > 0 ||
                        processing ||
                        !assistant.available ||
                        !assistant.draft.trim() ||
                        hasAttachments ||
                        assistant.settings.provider === 'claude'
                      }
                      onClick={() => {
                        follow.current = true;
                        void assistant.send(true);
                      }}
                    >
                      <ImagePlus size={16} />
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
          </form>
        </div>
      </div>
    </section>
  );
}
