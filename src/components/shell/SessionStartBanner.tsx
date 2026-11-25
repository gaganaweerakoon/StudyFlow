import React from 'react';
import { BellRing, Clock, Play, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { computeSwitchElapsedMinutes, formatHoursMinutesCompact } from '../../utils/focusTimerLogic';
import { formatTimerSeconds } from '../../utils/studyLogic';

export const SessionStartBanner: React.FC = () => {
  const {
    pendingSessionPrompt,
    switchToPendingSession,
    dismissPendingSessionPrompt,
    subjects,
    focusTimer,
  } = useApp();

  if (!pendingSessionPrompt) return null;

  const { session, remainingSeconds } = pendingSessionPrompt;
  const subject = subjects.find((s) => s.id === session.subjectId);
  const outgoingMinutes = computeSwitchElapsedMinutes(focusTimer);

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="fixed top-4 right-4 z-50 w-[min(390px,calc(100vw-2rem))] rounded-2xl p-4 space-y-3"
      style={{
        backgroundColor: 'var(--bg-elevated)',
        border: '1px solid var(--accent-border)',
        boxShadow: 'var(--shadow-floating)',
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5 min-w-0">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{
              backgroundColor: 'var(--accent-soft)',
              color: 'var(--accent)',
            }}
          >
            <BellRing className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-[11.5px] font-semibold uppercase tracking-wide" style={{ color: 'var(--accent)' }}>
              <span>Planned session starting</span>
              {subject && (
                <>
                  <span className="text-[var(--text-muted)]">·</span>
                  <span className="inline-flex items-center gap-1 text-[var(--text-secondary)] normal-case">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: subject.color }} />
                    {subject.code}
                  </span>
                </>
              )}
            </div>
            <div className="font-display text-[14.5px] font-semibold text-[var(--text-primary)] leading-snug mt-0.5 truncate">
              {session.title}
            </div>
            <div className="flex items-center gap-1.5 text-[12px] text-[var(--text-secondary)] mt-1">
              <Clock className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />
              <span className="font-mono-num font-medium text-[var(--text-primary)]">
                {formatTimerSeconds(remainingSeconds)}
              </span>
              <span className="text-[var(--text-muted)]">
                ({formatHoursMinutesCompact(remainingSeconds)} left)
              </span>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={dismissPendingSessionPrompt}
          aria-label="Dismiss session notification"
          className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] transition-colors shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <p className="text-[11.5px] text-[var(--text-muted)] leading-relaxed">
        {outgoingMinutes >= 1
          ? `Switching will log ${outgoingMinutes} min from your current timer and start this session immediately.`
          : 'Switch now to start this scheduled session with its exact subject and remaining time.'}
      </p>

      <div className="flex items-center gap-2 pt-0.5">
        <button
          type="button"
          onClick={switchToPendingSession}
          className="flex-1 h-9 px-3.5 rounded-xl inline-flex items-center justify-center gap-1.5 text-[12.5px] font-semibold transition-opacity hover:opacity-90"
          style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' }}
        >
          <Play className="w-3.5 h-3.5" />
          Switch & Start
        </button>
        <button
          type="button"
          onClick={dismissPendingSessionPrompt}
          className="h-9 px-3 rounded-xl text-[12.5px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] transition-colors"
          style={{ border: '1px solid var(--border-subtle)' }}
        >
          Stay on Current
        </button>
      </div>
    </div>
  );
};
