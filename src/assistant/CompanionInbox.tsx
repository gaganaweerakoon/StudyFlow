import { lazy, Suspense, useEffect, useRef, useState, type FormEvent } from 'react';
import {
  AlertCircle,
  ArrowUp,
  BookOpen,
  CalendarClock,
  Check,
  Clock,
  Loader2,
  Pencil,
  Play,
  RotateCcw,
  Square,
  X,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useAssistant } from './AssistantContext';
import {
  formatTimeLabel,
  getEffectiveClock,
  type CompanionFollowUp,
  type CompanionMessage,
  type CompanionSuggestion,
} from './companion';

const AssistantMarkdown = lazy(() => import('./AssistantMarkdown'));

function formatDayHeading(dateStr: string, todayStr: string): string {
  if (dateStr === todayStr) return 'Today';
  const [y, m, d] = dateStr.split('-').map(Number);
  if (!y || !m || !d) return dateStr;
  const parsed = new Date(y, m - 1, d);
  return parsed.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

interface CompanionInboxProps {
  floating?: boolean;
  onAcceptSuggestion?: (
    message: CompanionMessage,
    suggestion: CompanionSuggestion,
    actionOverride?: 'focus' | 'note',
  ) => void;
  onDismissSuggestion?: (message: CompanionMessage) => void;
  onAcceptFollowUpOffer?: (message: CompanionMessage) => void;
  onDismissFollowUpOffer?: (message: CompanionMessage) => void;
  upcomingFollowUps?: CompanionFollowUp[];
  onRescheduleFollowUp?: (id: string, dueDate: string, dueTime: string) => void;
  onCancelFollowUp?: (id: string) => void;
}

export function CompanionInbox({
  floating = false,
  onAcceptSuggestion,
  onDismissSuggestion,
  onAcceptFollowUpOffer,
  onDismissFollowUpOffer,
  upcomingFollowUps = [],
  onRescheduleFollowUp,
  onCancelFollowUp,
}: CompanionInboxProps) {
  const app = useApp();
  const assistant = useAssistant();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { clock } = getEffectiveClock(assistant.settings.timezone);
  const messages = assistant.companionThread.messages;

  // Scroll to highlighted deep-linked message or bottom on new messages
  useEffect(() => {
    const container = scrollerRef.current;
    if (!container) return;
    if (assistant.highlightedCompanionMessageId) {
      const target = container.querySelector<HTMLElement>(
        `[data-companion-message-id="${CSS.escape(assistant.highlightedCompanionMessageId)}"]`,
      );
      if (target) {
        target.scrollIntoView({
          block: 'center',
          behavior: app.preferences.reducedMotion ? 'auto' : 'smooth',
        });
        return;
      }
    }
    container.scrollTo({
      top: container.scrollHeight,
      behavior: app.preferences.reducedMotion ? 'auto' : 'smooth',
    });
  }, [messages.length, assistant.highlightedCompanionMessageId, app.preferences.reducedMotion]);

  // Auto-resize composer textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 128)}px`;
  }, [assistant.companionDraft]);

  function handleSubmit(e?: FormEvent) {
    e?.preventDefault();
    if (!assistant.companionDraft.trim() || assistant.companionBusy) return;
    void assistant.sendCompanionMessage();
  }

  const outreachEnabled = Boolean(app.preferences.pipCheckIns?.enabled);
  const activeFollowUps = upcomingFollowUps.filter((f) => f.status === 'scheduled');

  return (
    <div className="flex flex-1 flex-col min-h-0 bg-[var(--bg-surface)]">
      {/* Upcoming Agreed Follow-ups Strip (only when scheduled follow-ups exist) */}
      {activeFollowUps.length > 0 && (
        <div
          className="px-4 py-2 shrink-0 space-y-1.5"
          style={{
            backgroundColor: 'var(--bg-surface-subtle)',
            borderBottom: '1px solid var(--border-subtle)',
          }}
        >
          <div className="flex items-center justify-between text-[11.5px] font-medium text-[var(--text-secondary)]">
            <span className="inline-flex items-center gap-1.5">
              <CalendarClock className="w-3.5 h-3.5 text-[var(--accent)]" />
              Upcoming follow-ups ({activeFollowUps.length})
            </span>
          </div>
          <div className="space-y-1.5">
            {activeFollowUps.map((item) => (
              <FollowUpRow
                key={item.id}
                item={item}
                onReschedule={onRescheduleFollowUp}
                onCancel={onCancelFollowUp}
              />
            ))}
          </div>
        </div>
      )}

      {/* Conversation Stream */}
      <div
        ref={scrollerRef}
        className={`flex-1 overflow-y-auto px-4 ${floating ? 'py-3' : 'py-5'} space-y-3`}
        role="log"
        aria-label="Pip Companion messages"
        aria-live="polite"
      >
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-4 py-8 max-w-md mx-auto space-y-3">
            <h3 className="font-display text-[15px] font-semibold text-[var(--text-primary)]">
              Pip Companion
            </h3>
            <p className="text-[13px] leading-relaxed text-[var(--text-secondary)]">
              A separate, casual space to say hello, unpack a long day, or check in on what you’re working on—without turning every chat into study coaching.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
              {['Long day today', 'Hey Pip, quick break', 'How’s my evening looking?'].map((starter) => (
                <button
                  key={starter}
                  type="button"
                  onClick={() => void assistant.sendCompanionMessage(starter)}
                  disabled={assistant.companionBusy}
                  className="px-3 py-1.5 rounded-lg text-[12.5px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] transition-colors"
                  style={{
                    backgroundColor: 'var(--bg-surface-subtle)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  {starter}
                </button>
              ))}
            </div>
            {!outreachEnabled && (
              <p className="text-[11.5px] text-[var(--text-muted)] pt-2">
                Want Pip to text first occasionally while StudyFlow is open?{' '}
                <button
                  type="button"
                  onClick={assistant.openSettings}
                  className="font-medium underline underline-offset-2 hover:text-[var(--text-primary)]"
                  style={{ color: 'var(--accent)' }}
                >
                  Turn on Companion check-ins
                </button>
              </p>
            )}
          </div>
        ) : (
          <div className={`mx-auto w-full ${floating ? '' : 'max-w-[740px]'} space-y-2.5`}>
            {messages.map((msg, idx) => {
              const prev = idx > 0 ? messages[idx - 1] : null;
              const showDayDivider = !prev || prev.date !== msg.date;
              const isUser = msg.role === 'user';
              const isHighlighted = assistant.highlightedCompanionMessageId === msg.id;
              const isStreamingEmpty = msg.state === 'streaming' && !msg.text.trim();

              return (
                <div key={msg.id} className="space-y-2">
                  {showDayDivider && (
                    <div className="flex items-center gap-3 py-1.5">
                      <div className="h-px flex-1 bg-[var(--border-subtle)]" />
                      <span className="text-[11px] font-medium text-[var(--text-muted)] font-mono-num">
                        {formatDayHeading(msg.date, clock.date)}
                      </span>
                      <div className="h-px flex-1 bg-[var(--border-subtle)]" />
                    </div>
                  )}

                  <div
                    data-companion-message-id={msg.id}
                    data-companion-role={msg.role}
                    className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`max-w-[84%] rounded-2xl px-3.5 py-2.5 text-[13.5px] leading-relaxed transition-shadow ${
                        isHighlighted ? 'ring-2 ring-[var(--accent)] ring-offset-2 ring-offset-[var(--bg-surface)]' : ''
                      }`}
                      style={
                        isUser
                          ? {
                              backgroundColor: 'var(--accent)',
                              color: 'var(--accent-fg)',
                              borderBottomRightRadius: '6px',
                            }
                          : {
                              backgroundColor: 'var(--bg-surface-subtle)',
                              color: 'var(--text-primary)',
                              border: '1px solid var(--border-subtle)',
                              borderBottomLeftRadius: '6px',
                            }
                      }
                    >
                      {isStreamingEmpty ? (
                        <span className="inline-flex items-center gap-1.5 text-[12.5px] text-[var(--text-muted)]">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          Pip is typing…
                        </span>
                      ) : isUser ? (
                        <div className="whitespace-pre-wrap break-words">{msg.text}</div>
                      ) : (
                        <Suspense fallback={<div className="whitespace-pre-wrap break-words">{msg.text}</div>}>
                          <div className="pip-companion-markdown">
                            <AssistantMarkdown text={msg.text} dirAuto />
                          </div>
                        </Suspense>
                      )}
                    </div>

                    {/* Actionable Suggestion Controls (Phase 3) */}
                    {!isUser && msg.suggestion && !msg.suggestion.dismissed && (
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        {msg.suggestion.accepted ? (
                          <span className="inline-flex items-center gap-1 text-[11.5px] text-[var(--text-muted)]">
                            <Check className="w-3.5 h-3.5 text-[var(--accent)]" />
                            Started
                          </span>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => onAcceptSuggestion?.(msg, msg.suggestion!)}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[12px] font-medium transition-colors"
                              style={{
                                backgroundColor: 'var(--accent-soft)',
                                border: '1px solid var(--accent-border)',
                                color: 'var(--accent)',
                              }}
                            >
                              {msg.suggestion.kind === 'note' ? (
                                <BookOpen className="w-3.5 h-3.5" />
                              ) : (
                                <Play className="w-3.5 h-3.5" />
                              )}
                              <span>{msg.suggestion.label}</span>
                            </button>
                            {msg.suggestion.kind !== 'note' && msg.suggestion.noteId && (
                              <button
                                type="button"
                                onClick={() => onAcceptSuggestion?.(msg, msg.suggestion!, 'note')}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[12px] text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)] transition-colors"
                                style={{ border: '1px solid var(--border-subtle)' }}
                              >
                                <BookOpen className="w-3.5 h-3.5" />
                                <span>Open note</span>
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => onDismissSuggestion?.(msg)}
                              className="px-2.5 py-1 rounded-lg text-[12px] text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)] transition-colors"
                              style={{ border: '1px solid var(--border-subtle)' }}
                            >
                              Later
                            </button>
                          </>
                        )}
                      </div>
                    )}

                    {/* One-Time Follow-up Offer Controls (Phase 3) */}
                    {!isUser && msg.followUpOffer && !msg.followUpOffer.dismissed && (
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        {msg.followUpOffer.accepted ? (
                          <span className="inline-flex items-center gap-1 text-[11.5px] text-[var(--text-muted)]">
                            <Check className="w-3.5 h-3.5 text-[var(--accent)]" />
                            Follow-up set for {msg.followUpOffer.dueLabel}
                          </span>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => onAcceptFollowUpOffer?.(msg)}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[12px] font-medium transition-colors"
                              style={{
                                backgroundColor: 'var(--accent-soft)',
                                border: '1px solid var(--accent-border)',
                                color: 'var(--accent)',
                              }}
                            >
                              <Clock className="w-3.5 h-3.5" />
                              <span>Check in · {msg.followUpOffer.dueLabel}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => onDismissFollowUpOffer?.(msg)}
                              className="px-2.5 py-1 rounded-lg text-[12px] text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)] transition-colors"
                              style={{ border: '1px solid var(--border-subtle)' }}
                            >
                              No thanks
                            </button>
                          </>
                        )}
                      </div>
                    )}

                    {/* Individual Bubble Timestamp */}
                    <div className="mt-1 px-1 flex items-center gap-1.5 text-[11px] text-[var(--text-muted)] font-mono-num">
                      <time dateTime={new Date(msg.createdAt).toISOString()}>
                        {formatTimeLabel(msg.timeLabel)}
                      </time>
                      {msg.state === 'stopped' && <span>· Stopped</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Notice / Recoverable Failed Reply Bar */}
      {(assistant.companionNotice || assistant.companionFailedReply) && (
        <div
          className="px-4 py-2 shrink-0 space-y-1.5"
          style={{ borderTop: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-surface-subtle)' }}
        >
          {assistant.companionNotice && (
            <div className="text-[12px] text-[var(--text-secondary)] flex items-center justify-between gap-2">
              <span>{assistant.companionNotice}</span>
              <button
                type="button"
                onClick={() => assistant.setCompanionNotice('')}
                className="p-0.5 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                aria-label="Dismiss notice"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {assistant.companionFailedReply && (
            <div
              role="alert"
              className="rounded-lg p-2.5 flex flex-wrap items-center justify-between gap-2 text-[12px]"
              style={{
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div className="min-w-0 flex-1 space-y-0.5">
                <div className="flex items-center gap-1.5 font-medium text-[var(--text-primary)]">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
                  <span>Unsent reply saved</span>
                </div>
                <p className="text-[var(--text-secondary)] truncate">
                  “{assistant.companionFailedReply.text}”
                </p>
                <p className="text-[11.5px] text-[var(--text-muted)]">
                  {assistant.companionFailedReply.errorMessage}
                </p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={assistant.retryCompanionFailedReply}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[12px] font-medium"
                  style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' }}
                >
                  <RotateCcw className="w-3 h-3" />
                  Retry
                </button>
                <button
                  type="button"
                  onClick={assistant.editCompanionFailedReply}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[12px] text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)]"
                  style={{ border: '1px solid var(--border-subtle)' }}
                >
                  <Pencil className="w-3 h-3" />
                  Edit
                </button>
                <button
                  type="button"
                  onClick={assistant.dismissCompanionFailedReply}
                  className="p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  aria-label="Discard failed reply"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Composer */}
      <form
        onSubmit={handleSubmit}
        className="px-4 py-3 shrink-0"
        style={{ borderTop: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-surface)' }}
      >
        <div
          className={`mx-auto flex items-end gap-2 rounded-xl px-3 py-2 ${floating ? '' : 'max-w-[740px]'}`}
          style={{
            backgroundColor: 'var(--bg-surface-subtle)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <textarea
            ref={textareaRef}
            rows={1}
            value={assistant.companionDraft}
            onChange={(e) => assistant.setCompanionDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            placeholder="Say hi to Pip, or reply to a check-in…"
            aria-label="Message Pip Companion"
            disabled={assistant.companionBusy}
            className="flex-1 resize-none bg-transparent text-[13.5px] leading-relaxed text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none max-h-32"
          />
          {assistant.companionBusy ? (
            <button
              type="button"
              onClick={assistant.stopCompanion}
              aria-label="Stop reply"
              className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0 transition-colors"
              style={{ backgroundColor: 'var(--bg-surface-hover)', color: 'var(--text-primary)' }}
            >
              <Square className="w-3.5 h-3.5 fill-current" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={!assistant.companionDraft.trim() || !assistant.available}
              aria-label="Send Companion message"
              className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0 transition-opacity disabled:opacity-40"
              style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' }}
            >
              <ArrowUp className="w-4 h-4" strokeWidth={2.2} />
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

function FollowUpRow({
  item,
  onReschedule,
  onCancel,
}: {
  item: CompanionFollowUp;
  onReschedule?: (id: string, dueDate: string, dueTime: string) => void;
  onCancel?: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [dateDraft, setDateDraft] = useState(item.dueDate);
  const [timeDraft, setTimeDraft] = useState(item.dueTime);

  if (editing) {
    return (
      <form
        className="flex flex-wrap items-center gap-1.5 text-[12px]"
        onSubmit={(e) => {
          e.preventDefault();
          if (dateDraft && timeDraft) {
            onReschedule?.(item.id, dateDraft, timeDraft);
          }
          setEditing(false);
        }}
      >
        <span className="truncate font-medium text-[var(--text-primary)] max-w-[160px]">{item.topic}</span>
        <input
          type="date"
          value={dateDraft}
          onChange={(e) => setDateDraft(e.target.value)}
          aria-label="Follow-up date"
          className="px-1.5 py-0.5 rounded border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] font-mono-num text-[11.5px]"
        />
        <input
          type="time"
          value={timeDraft}
          onChange={(e) => setTimeDraft(e.target.value)}
          aria-label="Follow-up time"
          className="px-1.5 py-0.5 rounded border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] font-mono-num text-[11.5px]"
        />
        <button
          type="submit"
          className="px-2 py-0.5 rounded text-[11.5px] font-medium"
          style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' }}
        >
          Save
        </button>
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="px-1.5 py-0.5 rounded text-[11.5px] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
        >
          Cancel
        </button>
      </form>
    );
  }

  return (
    <div className="flex items-center justify-between gap-2 text-[12px]">
      <div className="min-w-0 flex items-center gap-2">
        <span className="truncate text-[var(--text-primary)]">{item.topic}</span>
        <span className="shrink-0 font-mono-num text-[11px] text-[var(--text-muted)]">
          {item.dueDate} · {formatTimeLabel(item.dueTime)}
        </span>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        {onReschedule && (
          <button
            type="button"
            onClick={() => {
              setDateDraft(item.dueDate);
              setTimeDraft(item.dueTime);
              setEditing(true);
            }}
            className="text-[11.5px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] underline-offset-2 hover:underline"
          >
            Reschedule
          </button>
        )}
        {onCancel && (
          <button
            type="button"
            onClick={() => onCancel(item.id)}
            className="text-[11.5px] text-[var(--text-muted)] hover:text-rose-600 dark:hover:text-rose-400"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}
