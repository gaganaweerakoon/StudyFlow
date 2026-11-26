import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowUpRight,
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
import { plannedProgress, plannedStudyHours } from '../../utils/workspaceMetrics';
import { formatHourLabel, formatTimerSeconds, formatFocusCountdown } from '../../utils/studyLogic';
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
  { label: '1h 30m', hours: 1, minutes: 30 },
  { label: '2h', hours: 2, minutes: 0 },
] as const;
const BREAK_PRESETS = [5, 10, 15, 20, 30] as const;

const DIAL_TICKS = Array.from({ length: 60 }, (_, idx) => {
  const angle = (idx / 60) * Math.PI * 2 - Math.PI / 2;
  const isMajor = idx % 5 === 0;
  const outerR = 142;
  const innerR = isMajor ? 135 : 138;
  return {
    idx,
    isMajor,
    x1: 150 + Math.cos(angle) * innerR,
    y1: 150 + Math.sin(angle) * innerR,
    x2: 150 + Math.cos(angle) * outerR,
    y2: 150 + Math.sin(angle) * outerR,
  };
});

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
  const [rightTab, setRightTab] = useState<'schedule' | 'recent'>('schedule');
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
  const showingCurrentSessionOneClick =
    isIdle && Boolean(activeSessionInfo) && !focusTimer.manualDurationOverride;

  const visibleIdleMode: 'Scheduled' | 'Pomodoro' | 'Custom' = showingCurrentSessionOneClick
    ? 'Scheduled'
    : focusTimer.mode === 'Custom' || focusTimer.mode === 'Countdown'
      ? 'Custom'
      : 'Pomodoro';

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
    !showingCurrentSessionOneClick &&
    focusTimer.phase === 'focus' &&
    focusTimer.mode === 'Stopwatch'
      ? formatTimerSeconds(focusTimer.elapsedSeconds)
      : formatFocusCountdown(effectiveSecondsLeft, focusTimer.elapsedSeconds, effectiveTotalSeconds,
          !showingCurrentSessionOneClick && focusTimer.phase === 'focus' && (focusTimer.mode === 'Custom' || focusTimer.mode === 'Countdown'));

  const progressRatio =
    !showingCurrentSessionOneClick &&
    focusTimer.phase === 'focus' &&
    focusTimer.mode === 'Stopwatch'
      ? Math.min(1, focusTimer.elapsedSeconds / 36000)
      : Math.min(
          1,
          Math.max(
            0,
            (effectiveTotalSeconds - effectiveSecondsLeft) / Math.max(1, effectiveTotalSeconds),
          ),
        );

  const dialRadius = 122;
  const circumference = 2 * Math.PI * dialRadius;
  const dashOffset = circumference * (1 - progressRatio);
  const arcHeadAngle = progressRatio * Math.PI * 2 - Math.PI / 2;
  const arcHeadX = 150 + Math.cos(arcHeadAngle) * dialRadius;
  const arcHeadY = 150 + Math.sin(arcHeadAngle) * dialRadius;

  const canTakeMidBreak =
    focusTimer.phase === 'focus' && (focusTimer.running || focusTimer.elapsedSeconds > 0);
  const isBreakPhase = focusTimer.phase === 'break';
  const hasPausedSession = Boolean(focusTimer.pausedFocus);
  const activeStrokeColor = isBreakPhase ? '#10B981' : activeSubject?.color ?? 'var(--accent)';

  const estimatedEndTimeLabel = useMemo(() => {
    if (effectiveSecondsLeft <= 0) return null;
    const endDate = new Date(now.getTime() + effectiveSecondsLeft * 1000);
    return endDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }, [now, effectiveSecondsLeft]);

  const totalLoggedMinutes = useMemo(
    () => focusHistory.reduce((acc, item) => acc + (Number(item.durationMinutes) || 0), 0),
    [focusHistory],
  );

  const dayKey = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const todayKey = dayKey(now);

  const todayHistory = useMemo(
    () =>
      focusHistory.filter(
        (item) =>
          item.completedAt === todayKey ||
          (item.endedAtMs && dayKey(new Date(item.endedAtMs)) === todayKey),
      ),
    [focusHistory, todayKey],
  );

  const todayMinutes = useMemo(
    () => todayHistory.reduce((sum, item) => sum + (Number(item.durationMinutes) || 0), 0),
    [todayHistory],
  );

  const dailyPlan = plannedStudyHours(sessions, 'daily', now);
  const goalMinutes = dailyPlan * 60;
  const dailyGoalPct = plannedProgress(todayMinutes, goalMinutes);

  const todaySessions = useMemo(
    () =>
      sessions
        .filter(
          (s) =>
            s.date === todayKey &&
            s.countsTowardStudy !== false &&
            s.blockType !== 'sleep' &&
            s.blockType !== 'free',
        )
        .sort((a, b) => a.startHour - b.startHour),
    [sessions, todayKey],
  );

  const quickPickTasks = useMemo(() => {
    const open = tasks.filter((t) => t.status !== 'done');
    const scoped = focusSubject
      ? open.filter((t) => t.subjectId === focusSubject)
      : open;
    const list = scoped.length > 0 ? scoped : open;
    return list.slice(0, 3);
  }, [tasks, focusSubject]);

  const applyHoursMinutes = (nextH: number, nextM: number) => {
    const clamped = clampFocusHoursMinutes(nextH, nextM);
    setCustomHours(clamped.hours);
    setCustomMinutes(clamped.minutes);
    setFocusDuration(clamped.hours, clamped.minutes, 'Custom');
  };

  const handleLoadScheduledBlock = (block: (typeof todaySessions)[number]) => {
    if (!isIdle) {
      pushToast('Pause or reset the active timer to switch sessions');
      return;
    }
    if (activeSessionInfo?.session.id === block.id) {
      useCurrentSessionRemainder();
      pushToast(`Loaded live block "${block.title}"`);
      return;
    }
    const totalMins = Math.max(5, Math.round(block.durationHours * 60));
    const split = splitMinutesToHoursMinutes(totalMins);
    setFocusContext(block.subjectId, block.title);
    applyHoursMinutes(split.hours, split.minutes);
    pushToast(`Loaded "${block.title}" (${formatHoursMinutesCompact(totalMins * 60)})`);
  };

  const handlePickTask = (task: (typeof tasks)[number]) => {
    if (!isIdle) return;
    setFocusContext(task.subjectId || focusSubject, task.title);
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
  }, [
    breakPopupOpen,
    fullScreenMode,
    showingCurrentSessionOneClick,
    startCurrentSessionFocus,
    toggleFocusRunning,
  ]);

  const surfaceStyle: React.CSSProperties = {
    backgroundColor: 'var(--bg-surface)',
    border: '1px solid var(--border-subtle)',
  };

  const inputStyle: React.CSSProperties = {
    backgroundColor: 'var(--bg-surface-subtle)',
    border: '1px solid var(--border-subtle)',
    color: 'var(--text-primary)',
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
        style={surfaceStyle}
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
              style={inputStyle}
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

  const timerInstrument = (
    <div className="flex flex-col items-center justify-center flex-1 py-6 px-5 sm:px-8">
      {/* Top Instrument Bar: Mode Switcher or Phase Readout + Estimated Finish */}
      <div className="w-full flex flex-wrap items-center justify-between gap-3 mb-6">
        {isIdle ? (
          <div
            className="inline-flex items-center p-1 rounded-xl text-[12.5px]"
            style={{
              backgroundColor: 'var(--bg-surface-subtle)',
              border: '1px solid var(--border-subtle)',
            }}
            role="tablist"
            aria-label="Focus timer modes"
          >
            {MODES.filter((m) => m !== 'Scheduled' || activeSessionInfo).map((m) => {
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
                      const split = splitMinutesToHoursMinutes(
                        customHours * 60 + customMinutes || 45,
                      );
                      setCustomHours(split.hours);
                      setCustomMinutes(split.minutes);
                      setFocusDuration(split.hours, split.minutes, 'Custom');
                    } else {
                      setFocusMode('Pomodoro');
                    }
                  }}
                  className="px-3.5 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap"
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
        ) : (
          <div className="flex items-center gap-2 text-[12.5px] text-[var(--text-secondary)]">
            {isBreakPhase ? (
              <Coffee className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            ) : (
              <Clock className="w-3.5 h-3.5 shrink-0" style={{ color: activeStrokeColor }} />
            )}
            <span className="font-medium text-[var(--text-primary)]">
              {isBreakPhase
                ? hasPausedSession
                  ? 'Mid-session break'
                  : 'Break in progress'
                : focusTimer.running
                  ? 'Focus active'
                  : 'Session paused'}
            </span>
            {!isBreakPhase && focusTimer.elapsedSeconds > 0 && (
              <>
                <span aria-hidden="true" className="text-[var(--text-muted)]">
                  ·
                </span>
                <span className="font-mono-num text-[var(--text-muted)]">
                  {formatTimerSeconds(focusTimer.elapsedSeconds)} elapsed
                </span>
              </>
            )}
          </div>
        )}

        {estimatedEndTimeLabel && (
          <div className="text-[12px] text-[var(--text-muted)] font-mono-num whitespace-nowrap">
            Ends at <span className="text-[var(--text-secondary)]">{estimatedEndTimeLabel}</span>
          </div>
        )}
      </div>

      {/* Scheduled session metadata kicker */}
      {showingCurrentSessionOneClick && activeSessionInfo && (
        <div className="mb-4 flex flex-wrap items-center justify-center gap-2 text-[12.5px] text-[var(--text-secondary)]">
          <Clock className="w-3.5 h-3.5 shrink-0" style={{ color: activeStrokeColor }} />
          <span className="font-medium text-[var(--text-primary)]">Scheduled now</span>
          <span aria-hidden="true" className="text-[var(--text-muted)]">
            ·
          </span>
          <span className="font-mono-num font-medium" style={{ color: activeStrokeColor }}>
            {formatHoursMinutesCompact(activeSessionInfo.remainingSeconds)} left in block
          </span>
        </div>
      )}

      {/* Custom duration presets + Hr : Min inline controls */}
      {isIdle && visibleIdleMode === 'Custom' && (
        <div className="mb-6 flex flex-wrap items-center justify-center gap-2.5 w-full">
          <div className="flex flex-wrap items-center justify-center gap-1.5">
            {CUSTOM_PRESETS.map((preset) => {
              const active = customHours === preset.hours && customMinutes === preset.minutes;
              return (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => applyHoursMinutes(preset.hours, preset.minutes)}
                  className="h-8 px-2.5 rounded-lg font-mono-num text-[12px] font-medium transition-colors whitespace-nowrap"
                  style={{
                    backgroundColor: active ? 'var(--accent-soft)' : 'var(--bg-surface-subtle)',
                    color: active ? 'var(--accent)' : 'var(--text-secondary)',
                    border: active
                      ? '1px solid var(--accent-border)'
                      : '1px solid var(--border-subtle)',
                  }}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>

          <div
            className="hidden sm:block h-4 w-px"
            style={{ backgroundColor: 'var(--border-subtle)' }}
            aria-hidden="true"
          />

          <div className="flex items-center justify-center gap-1.5 text-[12px]">
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
              className="w-14 h-8 px-2 rounded-lg font-mono-num text-center text-[13px]"
              style={inputStyle}
            />
            <span className="text-[var(--text-muted)] font-mono-num">:</span>
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
              className="w-14 h-8 px-2 rounded-lg font-mono-num text-center text-[13px]"
              style={inputStyle}
            />
          </div>
        </div>
      )}

      {/* Mid-session break notice */}
      {isBreakPhase && hasPausedSession && focusTimer.pausedFocus && (
        <div
          role="status"
          className="mb-5 px-3.5 py-2 rounded-xl text-[12px] flex flex-wrap items-center justify-center gap-2"
          style={{
            backgroundColor: 'rgba(16, 185, 129, 0.08)',
            border: '1px solid rgba(16, 185, 129, 0.24)',
            color: 'var(--text-primary)',
          }}
        >
          <Coffee className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
          <span>
            Session paused with{' '}
            <strong className="font-mono-num">
              {formatTimerSeconds(focusTimer.pausedFocus.secondsLeft)}
            </strong>{' '}
            left · stays paused until you resume
          </span>
        </div>
      )}

      {/* Precision Chronometer Circular Dial */}
      <div className="relative w-64 h-64 sm:w-[296px] sm:h-[296px] flex items-center justify-center my-1">
        <svg className="w-full h-full" viewBox="0 0 300 300" aria-hidden="true">
          {/* Precision 60-minute perimeter ticks */}
          <g>
            {DIAL_TICKS.map((tick) => (
              <line
                key={tick.idx}
                x1={tick.x1}
                y1={tick.y1}
                x2={tick.x2}
                y2={tick.y2}
                stroke="var(--text-muted)"
                strokeOpacity={tick.isMajor ? 0.32 : 0.14}
                strokeWidth={tick.isMajor ? 1.5 : 1}
                strokeLinecap="round"
              />
            ))}
          </g>

          {/* Track & active progress arc */}
          <g transform="rotate(-90 150 150)">
            <circle
              cx="150"
              cy="150"
              r={dialRadius}
              fill="none"
              stroke="var(--bg-surface-hover)"
              strokeWidth="6"
            />
            <circle
              cx="150"
              cy="150"
              r={dialRadius}
              fill="none"
              stroke={activeStrokeColor}
              strokeWidth="6.5"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              className="transition-[stroke-dashoffset] duration-500"
            />
          </g>

          {/* Subtle progress head marker when active */}
          {progressRatio > 0.008 && (
            <circle
              cx={arcHeadX}
              cy={arcHeadY}
              r="5"
              fill={activeStrokeColor}
              stroke="var(--bg-surface)"
              strokeWidth="2.5"
            />
          )}
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-8">
          <div className="text-[12px] font-medium text-[var(--text-muted)] flex items-center gap-1.5">
            {isBreakPhase ? (
              <>
                <Coffee className="w-3.5 h-3.5 text-emerald-500" />
                <span>{hasPausedSession ? 'Mid-Session Break' : 'Break'}</span>
              </>
            ) : (
              <span>
                {activeSubject?.code ?? 'Focus'} ·{' '}
                {showingCurrentSessionOneClick ? 'Scheduled' : visibleIdleMode}
              </span>
            )}
          </div>

          <div
            data-testid="focus-timer-readout"
            className={`font-mono-num font-semibold tracking-tight text-[var(--text-primary)] leading-none my-2.5 ${
              displayTime.length > 5
                ? 'text-[36px] sm:text-[42px]'
                : 'text-[46px] sm:text-[54px]'
            }`}
          >
            {displayTime}
          </div>

          <div className="text-[13px] text-[var(--text-secondary)] truncate max-w-[210px]">
            {focusTitle || 'Ready to focus'}
          </div>
        </div>
      </div>

      {/* Primary Action Controls */}
      <div className="mt-7 flex flex-wrap items-center justify-center gap-2.5">
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

      <p className="mt-4 text-[11.5px] text-[var(--text-muted)]">
        Press <kbd className="font-mono-num px-1.5 py-0.5 rounded bg-[var(--bg-surface-subtle)] border border-[var(--border-subtle)] text-[var(--text-secondary)]">Space</kbd> to start or pause
      </p>
    </div>
  );

  if (fullScreenMode) {
    return (
      <div
        className="fixed inset-0 z-50 flex flex-col items-center justify-center p-6"
        style={{ backgroundColor: 'var(--bg-canvas)' }}
      >
        <div className="w-full max-w-2xl flex flex-col">
          <div className="flex items-center justify-end mb-2">
            <button
              type="button"
              onClick={() => setFullScreenMode(false)}
              className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg text-[12.5px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] transition-colors whitespace-nowrap"
              style={surfaceStyle}
            >
              <Minimize2 className="w-3.5 h-3.5" /> Exit Full-Screen
            </button>
          </div>
          {timerInstrument}
        </div>
        {breakDurationPopup}
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-6">
      {/* Clean Workspace Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-[20px] font-semibold tracking-tight text-[var(--text-primary)]">
            Focus Timer
          </h1>
          <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[12.5px] text-[var(--text-muted)]">
            <span>
              Today:{' '}
              <strong className="font-mono-num font-medium text-[var(--text-primary)]">
                {formatHoursMinutesCompact(todayMinutes * 60)}
              </strong>{' '}
              {dailyPlan > 0 ? `of ${dailyPlan.toFixed(1)}h planned` : '· no study blocks planned'}
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-mono-num">
              {todayHistory.length} {todayHistory.length === 1 ? 'session' : 'sessions'} logged
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-mono-num">
              {todaySessions.length} planned {todaySessions.length === 1 ? 'block' : 'blocks'}
            </span>
          </div>
        </div>

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

      {/* Main 2-Column Single-Viewport Studio Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Dominant Left Focal Surface: Precision Timer + Daily Goal Pacing Bar */}
        <div
          className="lg:col-span-7 rounded-2xl flex flex-col justify-between min-h-[540px]"
          style={surfaceStyle}
        >
          {timerInstrument}

          {/* Integrated Daily Target Progress Footer */}
          <div
            className="px-6 py-3.5 flex flex-wrap items-center justify-between gap-4"
            style={{ borderTop: '1px solid var(--border-subtle)' }}
          >
            <div className="flex items-center gap-3 flex-1 min-w-[200px]">
              <span className="text-[12px] font-medium text-[var(--text-secondary)] whitespace-nowrap">
                Daily Target
              </span>
              <div
                className="flex-1 h-1.5 rounded-full overflow-hidden"
                style={{ backgroundColor: 'var(--bg-surface-hover)' }}
              >
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${dailyGoalPct}%`,
                    backgroundColor: activeStrokeColor,
                  }}
                />
              </div>
              <span className="font-mono-num text-[12px] font-medium text-[var(--text-primary)] tabular-nums whitespace-nowrap">
                {dailyPlan > 0 ? `${dailyGoalPct}%` : 'No plan'}
              </span>
            </div>

            <div className="flex items-center gap-3 text-[12px] text-[var(--text-muted)] whitespace-nowrap">
              <span className="font-mono-num">
                {formatHoursMinutesCompact(todayMinutes * 60)}{dailyPlan > 0 ? ` / ${dailyPlan.toFixed(1)}h` : ' · no plan'}
              </span>
              <button
                type="button"
                onClick={() => setRoute('analytics')}
                className="inline-flex items-center gap-0.5 font-medium text-[var(--accent)] hover:underline whitespace-nowrap"
              >
                Full trends
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Right Companion Column: Session Context + Tabbed Schedule/Recent Rail */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          {/* Session Setup Card */}
          <div className="rounded-2xl p-5 space-y-4" style={surfaceStyle}>
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-display text-[14px] font-semibold text-[var(--text-primary)]">
                Session Setup
              </h2>
              {!isIdle && (
                <span className="text-[11.5px] text-[var(--text-muted)]">
                  Locked while active
                </span>
              )}
            </div>

            {showingCurrentSessionOneClick && activeSessionInfo ? (
              <div className="space-y-1.5 text-[13px]">
                <div className="font-medium text-[var(--text-primary)]">
                  {activeSessionInfo.session.title}
                </div>
                <div className="text-[12px] text-[var(--text-muted)] font-mono-num">
                  {activeSubject ? `${activeSubject.code} · ` : ''}
                  {formatHourLabel(activeSessionInfo.session.startHour)} –{' '}
                  {formatHourLabel(
                    activeSessionInfo.session.startHour + activeSessionInfo.session.durationHours,
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label
                    htmlFor="focus-subject"
                    className="block text-[12px] text-[var(--text-muted)] mb-1"
                  >
                    Subject
                  </label>
                  <select
                    id="focus-subject"
                    disabled={!isIdle}
                    value={focusSubject}
                    onChange={(e) => setFocusContext(e.target.value, focusTitle)}
                    className="w-full h-9 px-3 rounded-lg text-[13px] disabled:opacity-60"
                    style={inputStyle}
                  >
                    <option value="">General focus</option>
                    {subjects
                      .filter((s) => !s.archived)
                      .map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.code} · {s.name}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="focus-task"
                    className="block text-[12px] text-[var(--text-muted)] mb-1"
                  >
                    Activity or linked task
                  </label>
                  <input
                    id="focus-task"
                    list="focus-task-options"
                    disabled={!isIdle}
                    placeholder="What are you working on?"
                    value={focusTitle}
                    onChange={(e) => setFocusContext(focusSubject, e.target.value)}
                    className="w-full h-9 px-3 rounded-lg text-[13px] disabled:opacity-60"
                    style={inputStyle}
                  />
                  <datalist id="focus-task-options">
                    {tasks
                      .filter((t) => !focusSubject || t.subjectId === focusSubject)
                      .map((t) => (
                        <option key={t.id} value={t.title} />
                      ))}
                  </datalist>
                </div>

                {/* Quick-pick upcoming tasks */}
                {isIdle && quickPickTasks.length > 0 && (
                  <div
                    className="pt-3 space-y-1.5"
                    style={{ borderTop: '1px solid var(--border-subtle)' }}
                  >
                    <div className="flex items-center justify-between text-[11.5px] text-[var(--text-muted)]">
                      <span>Up next</span>
                      <button
                        type="button"
                        onClick={() => setRoute('tasks')}
                        className="hover:text-[var(--text-primary)] transition-colors"
                      >
                        All tasks
                      </button>
                    </div>
                    <div className="space-y-1">
                      {quickPickTasks.map((task) => {
                        const sub = subjects.find((s) => s.id === task.subjectId);
                        const selected = focusTitle === task.title;
                        return (
                          <button
                            key={task.id}
                            type="button"
                            onClick={() => handlePickTask(task)}
                            className="w-full px-2.5 py-1.5 rounded-lg text-left flex items-center justify-between gap-2 transition-colors hover:bg-[var(--bg-surface-hover)]"
                            style={{
                              backgroundColor: selected ? 'var(--accent-soft)' : 'transparent',
                            }}
                          >
                            <span
                              className="text-[12.5px] truncate"
                              style={{
                                color: selected ? 'var(--accent)' : 'var(--text-primary)',
                                fontWeight: selected ? 500 : 400,
                              }}
                            >
                              {task.title}
                            </span>
                            <span className="text-[11px] font-mono-num text-[var(--text-muted)] shrink-0 whitespace-nowrap">
                              {sub ? `${sub.code} · ` : ''}
                              {task.estimatedMinutes}m
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Tabbed Schedule & Recent Sessions Rail */}
          <div className="rounded-2xl p-5 flex-1 flex flex-col min-h-[260px]" style={surfaceStyle}>
            <div className="flex items-center justify-between gap-2 mb-3.5">
              <div
                className="inline-flex items-center p-0.5 rounded-lg text-[12px]"
                style={{
                  backgroundColor: 'var(--bg-surface-subtle)',
                  border: '1px solid var(--border-subtle)',
                }}
                role="tablist"
                aria-label="Session queue and history"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={rightTab === 'schedule'}
                  onClick={() => setRightTab('schedule')}
                  className="px-3 py-1 rounded-md font-medium transition-colors whitespace-nowrap"
                  style={{
                    backgroundColor: rightTab === 'schedule' ? 'var(--bg-surface)' : 'transparent',
                    color: rightTab === 'schedule' ? 'var(--text-primary)' : 'var(--text-muted)',
                    boxShadow: rightTab === 'schedule' ? 'var(--shadow-subtle)' : 'none',
                  }}
                >
                  Today&apos;s Schedule
                  <span className="ml-1.5 font-mono-num text-[11px] opacity-75">
                    {todaySessions.length}
                  </span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={rightTab === 'recent'}
                  onClick={() => setRightTab('recent')}
                  className="px-3 py-1 rounded-md font-medium transition-colors whitespace-nowrap"
                  style={{
                    backgroundColor: rightTab === 'recent' ? 'var(--bg-surface)' : 'transparent',
                    color: rightTab === 'recent' ? 'var(--text-primary)' : 'var(--text-muted)',
                    boxShadow: rightTab === 'recent' ? 'var(--shadow-subtle)' : 'none',
                  }}
                >
                  Recent
                  <span className="ml-1.5 font-mono-num text-[11px] opacity-75">
                    {focusHistory.length}
                  </span>
                </button>
              </div>

              {rightTab === 'schedule' ? (
                <button
                  type="button"
                  onClick={() => setRoute('planner')}
                  className="text-[11.5px] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors whitespace-nowrap"
                >
                  Planner
                </button>
              ) : (
                <span className="text-[11.5px] font-mono-num text-[var(--text-muted)] whitespace-nowrap">
                  {formatHoursMinutesCompact(totalLoggedMinutes * 60)} total
                </span>
              )}
            </div>

            {rightTab === 'schedule' ? (
              todaySessions.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center py-6 space-y-2">
                  <p className="text-[13px] text-[var(--text-muted)]">
                    No study blocks scheduled for today.
                  </p>
                  <button
                    type="button"
                    onClick={() => setRoute('planner')}
                    className="text-[12.5px] font-medium text-[var(--accent)] hover:underline"
                  >
                    Plan study blocks
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-[var(--border-subtle)] overflow-y-auto max-h-[300px] pr-0.5">
                  {todaySessions.map((session) => {
                    const sub = subjects.find((s) => s.id === session.subjectId);
                    const isLiveNow = activeSessionInfo?.session.id === session.id;
                    const durationMins = Math.round(session.durationHours * 60);
                    return (
                      <button
                        key={session.id}
                        type="button"
                        onClick={() => handleLoadScheduledBlock(session)}
                        className="w-full py-2.5 px-2 -mx-2 rounded-lg text-left flex items-center justify-between gap-3 hover:bg-[var(--bg-surface-hover)] transition-colors"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-[13px] font-medium text-[var(--text-primary)] truncate">
                              {session.title}
                            </span>
                            {isLiveNow && (
                              <span
                                className="text-[11px] font-semibold shrink-0"
                                style={{ color: 'var(--accent)' }}
                              >
                                Now
                              </span>
                            )}
                          </div>
                          <div className="mt-0.5 flex items-center gap-1.5 text-[11.5px] text-[var(--text-muted)]">
                            {sub && (
                              <>
                                <span
                                  className="font-medium"
                                  style={{ color: sub.color }}
                                >
                                  {sub.code}
                                </span>
                                <span aria-hidden="true">·</span>
                              </>
                            )}
                            <span className="font-mono-num">
                              {formatHourLabel(session.startHour)} –{' '}
                              {formatHourLabel(session.startHour + session.durationHours)}
                            </span>
                          </div>
                        </div>

                        <span className="text-[11.5px] font-mono-num text-[var(--text-muted)] shrink-0 whitespace-nowrap">
                          {formatHoursMinutesCompact(durationMins * 60)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )
            ) : focusHistory.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center py-6">
                <p className="text-[13px] text-[var(--text-muted)]">
                  Completed focus sessions will appear here.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-[var(--border-subtle)] overflow-y-auto max-h-[300px] pr-0.5">
                {focusHistory.map((item) => {
                  const sub = subjects.find((s) => s.id === item.subjectId);
                  return (
                    <div key={item.id} className="py-2.5 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-[13px] font-medium text-[var(--text-primary)] truncate">
                          {item.taskTitle}
                        </div>
                        <div className="mt-0.5 text-[11.5px] text-[var(--text-muted)]">
                          {sub ? `${sub.code} · ` : ''}
                          <span className="font-mono-num">{item.durationMinutes}m</span>{' '}
                          {item.mode} · {item.completedAt}
                        </div>
                      </div>
                      <div
                        className="flex items-center gap-1 shrink-0"
                        aria-label={`Rated ${item.qualityRating} of 5`}
                      >
                        <Star className="w-3.5 h-3.5 text-amber-500" fill="#F59E0B" />
                        <span className="font-mono-num text-[12px] font-medium text-[var(--text-secondary)]">
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

      {breakDurationPopup}
    </div>
  );
};
