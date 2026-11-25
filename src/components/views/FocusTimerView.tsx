import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Coffee,
  Maximize2,
  Minimize2,
  Pause,
  PictureInPicture2,
  Play,
  RotateCcw,
  Star,
  X,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatHourLabel, formatTimerSeconds } from '../../utils/studyLogic';
import {
  clampBreakMinutes,
  clampFocusHoursMinutes,
  currentStudySessionRemaining,
  formatHoursMinutesCompact,
  MAX_BREAK_MINUTES,
  MAX_FOCUS_HOURS,
  MIN_BREAK_MINUTES,
  splitMinutesToHoursMinutes,
} from '../../utils/focusTimerLogic';

const MODES = ['Scheduled', 'Pomodoro', 'Custom'] as const;
const CUSTOM_PRESETS = [
  { label: '25m', hours: 0, minutes: 25 },
  { label: '45m', hours: 0, minutes: 45 },
  { label: '1h', hours: 1, minutes: 0 },
  { label: '2h', hours: 2, minutes: 0 },
] as const;
const BREAK_PRESETS = [5, 10, 15, 20, 30] as const;

export const FocusTimerView: React.FC = () => {
  const {
    focusTimer,
    setFocusMode,
    setFocusDuration,
    startCurrentSessionFocus,
    useCurrentSessionRemainder,
    toggleFocusRunning,
    takeFocusBreak,
    endFocusBreak,
    resetFocusTimer,
    setFocusContext,
    setMiniTimerVisible,
    triggerCompleteFocusSession,
    focusHistory,
    subjects,
    sessions,
    tasks,
    preferences,
    updatePreferences,
    setRoute,
    pushToast,
  } = useApp();

  const initialSplit = splitMinutesToHoursMinutes(Math.round(focusTimer.totalSeconds / 60));
  const [customHours, setCustomHours] = useState(initialSplit.hours);
  const [customMinutes, setCustomMinutes] = useState(initialSplit.minutes);
  const [fullScreenMode, setFullScreenMode] = useState(false);
  const [breakPopupOpen, setBreakPopupOpen] = useState(false);
  const [selectedBreakMin, setSelectedBreakMin] = useState(() =>
    clampBreakMinutes(preferences.pomodoroBreakMin ?? 5),
  );

  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const isIdle =
    !focusTimer.running &&
    focusTimer.elapsedSeconds === 0 &&
    !focusTimer.pausedFocus &&
    focusTimer.phase === 'focus' &&
    (focusTimer.mode === 'Stopwatch' || focusTimer.secondsLeft === focusTimer.totalSeconds);

  const activeSessionInfo = currentStudySessionRemaining(sessions, now);

  // When a scheduled session is currently active and the timer is idle, default directly to it
  // with one-click Start and zero time/mode adjustment clutter.
  const showingCurrentSessionOneClick = isIdle && Boolean(activeSessionInfo) && !focusTimer.manualDurationOverride;

  // Normalize any legacy Countdown/Stopwatch mode into Pomodoro/Custom when no session is active
  const visibleIdleMode: 'Scheduled' | 'Pomodoro' | 'Custom' =
    showingCurrentSessionOneClick ? 'Scheduled' : focusTimer.mode === 'Custom' || focusTimer.mode === 'Countdown' ? 'Custom' : 'Pomodoro';

  const focusSubject =
    showingCurrentSessionOneClick && activeSessionInfo
      ? activeSessionInfo.session.subjectId
      : focusTimer.subjectId;
  const focusTitle =
    showingCurrentSessionOneClick && activeSessionInfo
      ? activeSessionInfo.session.title
      : focusTimer.taskTitle;
  const activeSubject = subjects.find((subject) => subject.id === focusSubject);

  const effectiveTotalSeconds =
    showingCurrentSessionOneClick && activeSessionInfo
      ? activeSessionInfo.remainingSeconds
      : focusTimer.totalSeconds;
  const effectiveSecondsLeft =
    showingCurrentSessionOneClick && activeSessionInfo
      ? activeSessionInfo.remainingSeconds
      : focusTimer.secondsLeft;

  const displayTime =
    !showingCurrentSessionOneClick && focusTimer.phase === 'focus' && focusTimer.mode === 'Stopwatch'
      ? formatTimerSeconds(focusTimer.elapsedSeconds)
      : formatTimerSeconds(effectiveSecondsLeft);

  const progressRatio =
    !showingCurrentSessionOneClick && focusTimer.phase === 'focus' && focusTimer.mode === 'Stopwatch'
      ? Math.min(1, focusTimer.elapsedSeconds / 36000)
      : Math.min(
          1,
          Math.max(0, (effectiveTotalSeconds - effectiveSecondsLeft) / Math.max(1, effectiveTotalSeconds)),
        );

  const radius = 122;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - progressRatio);

  const canTakeMidBreak =
    focusTimer.phase === 'focus' && (focusTimer.running || focusTimer.elapsedSeconds > 0);
  const isBreakPhase = focusTimer.phase === 'break';
  const hasPausedSession = Boolean(focusTimer.pausedFocus);

  const totalLoggedMinutes = useMemo(
    () => focusHistory.reduce((acc, item) => acc + (Number(item.durationMinutes) || 0), 0),
    [focusHistory],
  );

  const dayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const todayKey = dayKey(now);
  const todayHistory = focusHistory.filter(item => item.completedAt === todayKey || (item.endedAtMs && dayKey(new Date(item.endedAtMs)) === todayKey));
  const todayMinutes = todayHistory.reduce((sum, item) => sum + (Number(item.durationMinutes) || 0), 0);
  const goalMinutes = Math.max(1, preferences.dailyGoalHours * 60);
  const todaySessions = sessions.filter(s => s.date === todayKey && s.countsTowardStudy !== false && s.blockType !== 'sleep' && s.blockType !== 'free').sort((a,b) => a.startHour - b.startHour);
  const week = Array.from({length:7}, (_, i) => {
    const date = new Date(now); date.setDate(date.getDate() - 6 + i);
    const key = dayKey(date);
    return { key, label: date.toLocaleDateString(undefined, { weekday: 'short' }), minutes: focusHistory.filter(h => h.completedAt === key || (h.endedAtMs && dayKey(new Date(h.endedAtMs)) === key)).reduce((sum,h) => sum + (Number(h.durationMinutes) || 0),0) };
  });
  const weekMax = Math.max(1, ...week.map(d => d.minutes));

  const applyHoursMinutes = (nextH: number, nextM: number) => {
    const clamped = clampFocusHoursMinutes(nextH, nextM);
    setCustomHours(clamped.hours);
    setCustomMinutes(clamped.minutes);
    setFocusDuration(clamped.hours, clamped.minutes, 'Custom');
  };

  const openBreakPopup = () => {
    setSelectedBreakMin(clampBreakMinutes(preferences.pomodoroBreakMin ?? 5));
    setBreakPopupOpen(true);
  };

  const confirmStartBreak = (minutes: number) => {
    const clean = clampBreakMinutes(minutes);
    updatePreferences({ pomodoroBreakMin: clean });
    setBreakPopupOpen(false);
    takeFocusBreak(clean);
  };

  const handlePrimaryClick = () => {
    if (showingCurrentSessionOneClick) {
      startCurrentSessionFocus();
      return;
    }
    toggleFocusRunning();
  };

  // Keyboard shortcuts: Escape closes popup or full-screen; Space toggles play/pause when not in inputs
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (breakPopupOpen) {
          setBreakPopupOpen(false);
        } else if (fullScreenMode) {
          setFullScreenMode(false);
        }
        return;
      }
      if (e.key === ' ' && !breakPopupOpen) {
        const tag = (e.target as HTMLElement | null)?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || tag === 'BUTTON') return;
        e.preventDefault();
        if (showingCurrentSessionOneClick) {
          startCurrentSessionFocus();
        } else {
          toggleFocusRunning();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [breakPopupOpen, fullScreenMode, showingCurrentSessionOneClick, startCurrentSessionFocus, toggleFocusRunning]);

  const surfaceStyle: React.CSSProperties = {
    backgroundColor: 'var(--bg-surface)',
    border: '1px solid var(--border-subtle)',
  };

  const primaryButtonLabel = isBreakPhase
    ? focusTimer.running
      ? 'Pause Break'
      : focusTimer.secondsLeft < focusTimer.totalSeconds
        ? 'Resume Break'
        : 'Start Break'
    : focusTimer.running
      ? 'Pause'
      : focusTimer.elapsedSeconds > 0
        ? 'Resume'
        : showingCurrentSessionOneClick && activeSessionInfo
          ? `Start Focus (${formatHoursMinutesCompact(activeSessionInfo.remainingSeconds)})`
          : 'Start Focus';

  const breakDurationPopup = breakPopupOpen && (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(15, 23, 42, 0.55)', backdropFilter: 'blur(3px)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) setBreakPopupOpen(false);
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="break-popup-title"
        className="w-full max-w-sm rounded-2xl p-5 space-y-4 shadow-xl"
        style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2
              id="break-popup-title"
              className="font-display text-[16px] font-semibold text-[var(--text-primary)]"
            >
              Choose break duration
            </h2>
            <p className="text-[12.5px] text-[var(--text-muted)] mt-0.5">
              Your focus session pauses and waits until you resume.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setBreakPopupOpen(false)}
            aria-label="Close break duration popup"
            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-5 gap-1.5">
          {BREAK_PRESETS.map((minutes) => {
            const active = selectedBreakMin === minutes;
            return (
              <button
                key={minutes}
                type="button"
                onClick={() => setSelectedBreakMin(minutes)}
                className="h-9 rounded-lg font-mono-num text-[12.5px] font-medium transition-colors whitespace-nowrap"
                style={{
                  backgroundColor: active ? 'var(--accent-soft)' : 'var(--bg-surface-subtle)',
                  color: active ? 'var(--accent)' : 'var(--text-primary)',
                  border: active ? '1px solid var(--accent)' : '1px solid var(--border-subtle)',
                }}
              >
                {minutes}m
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-between gap-3 pt-1">
          <label htmlFor="popup-break-minutes" className="text-[12.5px] text-[var(--text-secondary)]">
            Custom minutes
          </label>
          <div className="inline-flex items-center gap-1.5">
            <input
              id="popup-break-minutes"
              type="number"
              min={MIN_BREAK_MINUTES}
              max={MAX_BREAK_MINUTES}
              value={selectedBreakMin}
              onChange={(e) => setSelectedBreakMin(clampBreakMinutes(Number(e.target.value)))}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  confirmStartBreak(selectedBreakMin);
                }
              }}
              className="w-20 h-9 px-2.5 rounded-lg font-mono-num text-center text-[13px]"
              style={{
                backgroundColor: 'var(--bg-surface-subtle)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-primary)',
              }}
            />
            <span className="text-[12px] text-[var(--text-muted)]">min</span>
          </div>
        </div>

        <div
          className="flex items-center justify-end gap-2 pt-3"
          style={{ borderTop: '1px solid var(--border-subtle)' }}
        >
          <button
            type="button"
            onClick={() => setBreakPopupOpen(false)}
            className="h-9 px-3.5 rounded-lg text-[12.5px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] transition-colors whitespace-nowrap"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => confirmStartBreak(selectedBreakMin)}
            className="h-9 px-4 rounded-lg inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-white transition-opacity hover:opacity-90 whitespace-nowrap"
            style={{ backgroundColor: '#10B981' }}
          >
            <Coffee className="w-3.5 h-3.5" />
            Start Break
          </button>
        </div>
      </div>
    </div>
  );

  const timerContent = (
    <div className="flex flex-col items-center justify-center min-h-[430px] py-9 px-5">
      {/* Scheduled session clean unboxed metadata kicker */}
      {showingCurrentSessionOneClick && activeSessionInfo && (
        <div className="mb-6 flex flex-wrap items-center justify-center gap-2 text-[12.5px] text-[var(--text-secondary)]">
          <Clock className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--accent)' }} />
          <span className="font-medium text-[var(--text-primary)]">Scheduled now</span>
          <span aria-hidden="true" className="text-[var(--text-muted)]">·</span>
          <span className="font-mono-num font-semibold" style={{ color: 'var(--accent)' }}>
            {formatHoursMinutesCompact(activeSessionInfo.remainingSeconds)} remaining
          </span>
        </div>
      )}

      {/* Idle Mode Switcher (Pomodoro / Custom) when no scheduled session is active */}
      {isIdle && (
        <div className="flex flex-col items-center gap-3.5 mb-7 w-full max-w-sm">
          <div
            className="inline-flex items-center p-1 rounded-xl text-[12.5px]"
            style={{ backgroundColor: 'var(--bg-surface-subtle)', border: '1px solid var(--border-subtle)' }}
            role="tablist"
            aria-label="Focus timer modes"
          >
            {MODES.filter(m => m !== 'Scheduled' || activeSessionInfo).map((m) => {
              const selected = visibleIdleMode === m;
              return (
                <button
                  key={m}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => {
                    if (m === 'Scheduled') {
                      useCurrentSessionRemainder();
                    } else if (m === 'Custom') {
                      const split = splitMinutesToHoursMinutes(customHours * 60 + customMinutes || 45);
                      setCustomHours(split.hours);
                      setCustomMinutes(split.minutes);
                      setFocusDuration(split.hours, split.minutes, 'Custom');
                    } else {
                      setFocusMode('Pomodoro');
                    }
                  }}
                  className="px-4 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap"
                  style={{
                    backgroundColor: selected ? 'var(--bg-surface)' : 'transparent',
                    color: selected ? 'var(--text-primary)' : 'var(--text-muted)',
                    boxShadow: selected ? 'var(--shadow-subtle)' : 'none',
                  }}
                >
                  {m}
                </button>
              );
            })}
          </div>

          {visibleIdleMode === 'Custom' && (
            <div className="flex flex-col items-center gap-2.5 w-full">
              <div className="flex flex-wrap items-center justify-center gap-1.5">
                {CUSTOM_PRESETS.map((preset) => {
                  const active = customHours === preset.hours && customMinutes === preset.minutes;
                  return (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => applyHoursMinutes(preset.hours, preset.minutes)}
                      className="h-7 px-2.5 rounded-lg font-mono-num text-[11.5px] font-medium transition-colors whitespace-nowrap"
                      style={{
                        backgroundColor: active ? 'var(--accent-soft)' : 'var(--bg-surface-subtle)',
                        color: active ? 'var(--accent)' : 'var(--text-secondary)',
                        border: active ? '1px solid var(--accent-border)' : '1px solid var(--border-subtle)',
                      }}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center justify-center gap-2 text-[12.5px]">
                <div className="inline-flex items-center gap-1.5">
                  <label htmlFor="focus-duration-hours" className="text-[var(--text-muted)]">
                    Hr
                  </label>
                  <input
                    id="focus-duration-hours"
                    type="number"
                    min={0}
                    max={MAX_FOCUS_HOURS}
                    value={customHours}
                    onChange={(e) => {
                      const nextH = Math.max(0, Math.min(MAX_FOCUS_HOURS, Number(e.target.value) || 0));
                      const nextM = nextH >= MAX_FOCUS_HOURS ? 0 : customMinutes;
                      applyHoursMinutes(nextH, nextM);
                    }}
                    className="w-15 h-8 px-2 rounded-lg font-mono-num text-center text-[13px]"
                    style={{
                      backgroundColor: 'var(--bg-surface-subtle)',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--text-primary)',
                    }}
                  />
                </div>

                <span className="text-[var(--text-muted)] font-mono-num">:</span>

                <div className="inline-flex items-center gap-1.5">
                  <label htmlFor="focus-duration-minutes" className="text-[var(--text-muted)]">
                    Min
                  </label>
                  <input
                    id="focus-duration-minutes"
                    type="number"
                    min={0}
                    max={customHours >= MAX_FOCUS_HOURS ? 0 : 59}
                    value={customHours >= MAX_FOCUS_HOURS ? 0 : customMinutes}
                    onChange={(e) => {
                      const rawM = Math.max(0, Math.min(59, Number(e.target.value) || 0));
                      applyHoursMinutes(customHours, customHours >= MAX_FOCUS_HOURS ? 0 : rawM);
                    }}
                    className="w-15 h-8 px-2 rounded-lg font-mono-num text-center text-[13px]"
                    style={{
                      backgroundColor: 'var(--bg-surface-subtle)',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--text-primary)',
                    }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Mid-session break notice */}
      {isBreakPhase && hasPausedSession && focusTimer.pausedFocus && (
        <div
          role="status"
          className="mb-5 px-3.5 py-2 rounded-xl text-[12px] flex flex-wrap items-center justify-center gap-2"
          style={{
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.25)',
            color: 'var(--text-primary)',
          }}
        >
          <Coffee className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
          <span>
            Session paused with{' '}
            <strong className="font-mono-num">{formatTimerSeconds(focusTimer.pausedFocus.secondsLeft)}</strong>{' '}
            left · stays paused until you resume
          </span>
        </div>
      )}

      {/* Central Circular Progress Timer */}
      <div className="relative w-64 h-64 sm:w-80 sm:h-80 flex items-center justify-center">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 272 272" aria-hidden="true">
          <circle
            cx="136"
            cy="136"
            r={radius}
            fill="none"
            stroke="var(--bg-surface-hover)"
            strokeWidth="6"
          />
          <circle
            cx="136"
            cy="136"
            r={radius}
            fill="none"
            stroke={isBreakPhase ? '#10B981' : activeSubject?.color ?? 'var(--accent)'}
            strokeWidth="6.5"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            className="transition-[stroke-dashoffset] duration-500"
          />
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-7">
          <div className="text-[12px] font-medium text-[var(--text-muted)] flex items-center gap-1.5">
            {isBreakPhase ? (
              <>
                <Coffee className="w-3.5 h-3.5 text-emerald-500" />
                <span>{hasPausedSession ? 'Mid-Session Break' : 'Break'}</span>
              </>
            ) : (
              <span>
                {activeSubject?.code ?? 'Focus'} · {showingCurrentSessionOneClick ? 'Current Session' : visibleIdleMode}
              </span>
            )}
          </div>
          <div
            data-testid="focus-timer-readout"
            className="font-mono-num text-[44px] sm:text-[50px] font-semibold tracking-tight text-[var(--text-primary)] leading-none my-2.5"
          >
            {displayTime}
          </div>
          <div className="text-[12.5px] text-[var(--text-secondary)] truncate max-w-[200px]">
            {focusTitle || 'Ready to focus'}
          </div>
        </div>
      </div>

      {/* Primary Controls */}
      <div className="mt-8 flex flex-wrap items-center justify-center gap-2.5">
        {!showingCurrentSessionOneClick && (
          <button
            type="button"
            onClick={resetFocusTimer}
            aria-label="Reset focus timer"
            title="Reset timer"
            className="h-10 w-10 rounded-xl flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] transition-colors"
            style={{ border: '1px solid var(--border-subtle)' }}
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        )}

        <button
          type="button"
          onClick={handlePrimaryClick}
          className="h-11 px-7 rounded-xl inline-flex items-center gap-2 text-[14px] font-semibold transition-opacity hover:opacity-90 whitespace-nowrap"
          style={{
            backgroundColor: isBreakPhase ? '#10B981' : 'var(--accent)',
            color: '#FFFFFF',
          }}
        >
          {focusTimer.running ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          {primaryButtonLabel}
        </button>

        {canTakeMidBreak && (
          <button
            type="button"
            onClick={openBreakPopup}
            aria-label="Take a break without ending session"
            title="Pause session and choose a break duration"
            className="h-10 px-4 rounded-xl inline-flex items-center gap-1.5 text-[12.5px] font-medium text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] transition-colors whitespace-nowrap"
            style={{
              backgroundColor: 'var(--bg-surface-subtle)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <Coffee className="w-4 h-4 text-emerald-500" />
            Take Break
          </button>
        )}

        {isBreakPhase && (
          <button
            type="button"
            onClick={endFocusBreak}
            aria-label="Return to paused focus session"
            className="h-10 px-4 rounded-xl inline-flex items-center gap-1.5 text-[12.5px] font-medium text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] transition-colors whitespace-nowrap"
            style={{
              backgroundColor: 'var(--bg-surface-subtle)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <ArrowLeft className="w-4 h-4" />
            {hasPausedSession ? 'Return to Session' : 'Skip Break'}
          </button>
        )}

        {!showingCurrentSessionOneClick && (
          <button
            type="button"
            onClick={triggerCompleteFocusSession}
            aria-label="Complete session and rate focus"
            title="Finish & rate session"
            className="h-10 px-3.5 rounded-xl inline-flex items-center gap-1.5 text-[12.5px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] transition-colors whitespace-nowrap"
            style={{ border: '1px solid var(--border-subtle)' }}
          >
            <CheckCircle2 className="w-4 h-4" />
            Complete
          </button>
        )}
      </div>
    </div>
  );

  if (fullScreenMode) {
    return (
      <div
        className="fixed inset-0 z-50 flex flex-col items-center justify-center p-6"
        style={{ backgroundColor: 'var(--bg-canvas)' }}
      >
        <div className="absolute top-5 right-5 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setFullScreenMode(false)}
            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg text-[12.5px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] transition-colors whitespace-nowrap"
            style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}
          >
            <Minimize2 className="w-3.5 h-3.5" /> Exit Full-Screen
          </button>
        </div>
        {timerContent}
        {breakDurationPopup}
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-[20px] font-semibold tracking-tight text-[var(--text-primary)]">
          Focus Timer
        </h1>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setMiniTimerVisible(true);
              setRoute('dashboard');
              pushToast('Floating mini-timer docked');
            }}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[12.5px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] transition-colors whitespace-nowrap"
            style={surfaceStyle}
          >
            <PictureInPicture2 className="w-3.5 h-3.5" /> Mini-Timer
          </button>
          <button
            type="button"
            onClick={() => setFullScreenMode(true)}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[12.5px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] transition-colors whitespace-nowrap"
            style={surfaceStyle}
          >
            <Maximize2 className="w-3.5 h-3.5" /> Full-Screen
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          {label: "Today's focus", value: formatHoursMinutesCompact(todayMinutes * 60), detail: "Completed focus time"},
          {label: 'Daily target', value: `${Math.round(todayMinutes / goalMinutes * 100)}%`, detail: `${preferences.dailyGoalHours}h daily goal`},
          {label: 'Sessions today', value: String(todayHistory.length), detail: `${todaySessions.length} calendar study blocks`},
        ].map(stat => (
          <div key={stat.label} className="rounded-2xl p-4" style={surfaceStyle}>
            <div className="text-[12px] text-[var(--text-muted)]">{stat.label}</div>
            <div className="text-2xl font-semibold font-mono-num text-[var(--text-primary)] mt-1">{stat.value}</div>
            <div className="text-[11px] text-[var(--text-secondary)] mt-1">{stat.detail}</div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-stretch">
        {/* Main Centered Timer Surface */}
        <div className="xl:col-span-7 rounded-2xl" style={surfaceStyle}>
          {timerContent}
        </div>

        {/* Right Sidebar: Session Context & Recent History */}
        <div className="xl:col-span-5 space-y-4">
          <div className="rounded-2xl p-4 space-y-3.5" style={surfaceStyle}>
            <h2 className="font-display text-[14px] font-semibold text-[var(--text-primary)]">
              Session Context
            </h2>

            {showingCurrentSessionOneClick && activeSessionInfo ? (
              <div className="space-y-1.5 text-[12.5px]">
                <div className="font-medium text-[var(--text-primary)]">
                  {activeSessionInfo.session.title}
                </div>
                <div className="text-[var(--text-muted)] font-mono-num">
                  {activeSubject ? `${activeSubject.code} · ` : ''}
                  {formatHourLabel(activeSessionInfo.session.startHour)} –{' '}
                  {formatHourLabel(activeSessionInfo.session.startHour + activeSessionInfo.session.durationHours)}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label htmlFor="focus-subject" className="block text-[11.5px] text-[var(--text-muted)] mb-1">
                    Subject
                  </label>
                  <select
                    id="focus-subject"
                    disabled={!isIdle}
                    value={focusSubject}
                    onChange={(e) => setFocusContext(e.target.value, focusTitle)}
                    className="w-full px-2.5 py-2 rounded-lg text-[13px]"
                    style={{
                      backgroundColor: 'var(--bg-surface-subtle)',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--text-primary)',
                    }}
                  >
                    <option value="">General focus</option>
                    {subjects.filter(s => !s.archived).map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.code} · {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="focus-task" className="block text-[11.5px] text-[var(--text-muted)] mb-1">
                    Activity / linked task
                  </label>
                  <input
                    id="focus-task"
                    list="focus-task-options"
                    disabled={!isIdle}
                    placeholder="Type an activity or choose a task"
                    value={focusTitle}
                    onChange={(e) => setFocusContext(focusSubject, e.target.value)}
                    className="w-full px-2.5 py-2 rounded-lg text-[13px]"
                    style={{
                      backgroundColor: 'var(--bg-surface-subtle)',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--text-primary)',
                    }}
                  />
                  <datalist id="focus-task-options">
                    {tasks.filter(t => !focusSubject || t.subjectId === focusSubject).map(t => <option key={t.id} value={t.title} />)}
                  </datalist>
                </div>
              </div>
            )}
          </div>

          <div className="rounded-2xl p-4 space-y-3" style={surfaceStyle}>
            <h2 className="font-display text-[14px] font-semibold text-[var(--text-primary)]">Today's schedule</h2>
            {!todaySessions.length && <p className="text-sm text-[var(--text-muted)]">No study blocks planned today.</p>}
            {todaySessions.map(s => (
              <div key={s.id} className="flex items-start gap-3 py-2 border-b last:border-0 border-[var(--border-subtle)]">
                <span className="w-1 self-stretch rounded" style={{background: subjects.find(sub => sub.id === s.subjectId)?.color || 'var(--accent)'}} />
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-[13px] text-[var(--text-primary)]">{s.title}</div>
                  <div className="text-[11px] text-[var(--text-muted)]">{formatHourLabel(s.startHour)} – {formatHourLabel(s.startHour + s.durationHours)}</div>
                </div>
                {activeSessionInfo?.session.id === s.id && <span className="text-[11px] text-[var(--accent)]">Now</span>}
              </div>
            ))}
          </div>
          {/* Recent Focus Sessions */}
          <div className="rounded-2xl p-4 space-y-3" style={surfaceStyle}>
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-display text-[14px] font-semibold text-[var(--text-primary)]">
                Recent Sessions
              </h2>
              <span className="text-[11.5px] font-mono-num text-[var(--text-muted)]">
                {focusHistory.length} · {formatHoursMinutesCompact(totalLoggedMinutes * 60)}
              </span>
            </div>

            {focusHistory.length === 0 ? (
              <p className="text-[12.5px] text-[var(--text-muted)] py-3">
                Completed focus sessions will appear here.
              </p>
            ) : (
              <div className="divide-y divide-[var(--border-subtle)] max-h-72 overflow-y-auto">
                {focusHistory.map((item) => {
                  const sub = subjects.find((s) => s.id === item.subjectId);
                  return (
                    <div key={item.id} className="py-2.5 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-[12.5px] font-medium text-[var(--text-primary)] truncate">
                          {item.taskTitle}
                        </div>
                        <div className="text-[11px] text-[var(--text-muted)]">
                          {sub?.code} · {item.durationMinutes}m {item.mode} · {item.completedAt}
                        </div>
                      </div>
                      <div
                        className="flex items-center gap-0.5 shrink-0"
                        aria-label={`Rated ${item.qualityRating} of 5`}
                      >
                        <Star className="w-3.5 h-3.5 text-amber-500" fill="#F59E0B" />
                        <span className="font-mono-num text-[11.5px] font-medium text-[var(--text-secondary)]">
                          {item.qualityRating}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-2xl p-5" style={surfaceStyle}>
        <h2 className="font-display text-[14px] font-semibold text-[var(--text-primary)]">Focus activity · Last 7 days</h2>
        <div className="grid grid-cols-7 gap-3 mt-4">
          {week.map(d => <div key={d.key} className="flex flex-col items-center gap-2">
            <span className="text-[11px] text-[var(--text-secondary)] font-mono-num">{d.minutes}m</span>
            <div className="w-full h-20 flex items-end justify-center rounded-md bg-[var(--bg-surface-subtle)]">
              <div className="w-2/3 max-w-12 rounded-t-md bg-[var(--accent)]" style={{height: `${d.minutes / weekMax * 100}%`}} />
            </div>
            <span className="text-[11px] text-[var(--text-muted)]">{d.label}</span>
          </div>)}
        </div>
      </div>
      {breakDurationPopup}
    </div>
  );
};
