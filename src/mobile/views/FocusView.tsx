import React from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  CloudOff,
  Coffee,
  Maximize2,
  Minimize2,
  Monitor,
  Pause,
  Play,
  ShieldAlert,
  Smartphone,
} from 'lucide-react';
import { useCompanion } from '../CompanionContext';
import { formatCountdownMMSS, resolveTodayStudyView } from '../companionLogic';
import { formatFocusCountdown } from '../../utils/studyLogic';
import {
  clampBreakMinutes,
  clampFocusHoursMinutes,
  formatHoursMinutesCompact,
  getMobileBlockFocusSeconds,
  MAX_BREAK_MINUTES,
  MAX_FOCUS_HOURS,
  MIN_BREAK_MINUTES,
} from '../../utils/focusTimerLogic';

export const FocusView: React.FC = () => {
  const {
    focus,
    liveMode,
    blocks,
    nowAbsMin,
    subjects,
    connection,
    startFocusForBlock,
    startCustomFocus,
    pauseFocus,
    resumeFocus,
    takeBreak,
    endBreak,
    finishFocus,
    setFocusFullScreen,
    screenTimeMode,
    setScreenTimeMode,
    screenTimeTab,
    setScreenTimeTab,
    sessionScreenTimeApps,
    todayScreenTimeApps,
    setPermission,
    settings,
    updateSettings,
  } = useCompanion();

  const deepBridge = (window as unknown as { StudyFlowDeepFocus?: { enabled(): boolean; request(): void } }).StudyFlowDeepFocus;
  const [deepAllowed, setDeepAllowed] = React.useState(false);
  React.useEffect(() => {
    const check = () => setDeepAllowed(deepBridge?.enabled() === true);
    check();
    window.addEventListener('focus', check);
    document.addEventListener('visibilitychange', check);
    return () => {
      window.removeEventListener('focus', check);
      document.removeEventListener('visibilitychange', check);
    };
  }, [deepBridge]);

  const [idleMode, setIdleMode] = React.useState<'Pomodoro' | 'Custom'>('Pomodoro');
  const [customSubject, setCustomSubject] = React.useState('');
  const [customHours, setCustomHours] = React.useState(0);
  const [customMinutes, setCustomMinutes] = React.useState(45);
  const subjectMap = new Map(subjects.map((s) => [s.id, s]));

  const isIdle = focus.phase === 'idle' || focus.phase === 'completed';
  const { heroSession, heroStatus } = resolveTodayStudyView(blocks, nowAbsMin);
  const activeHeroRemainder =
    isIdle && heroSession && heroStatus === 'in_progress'
      ? getMobileBlockFocusSeconds(heroSession, nowAbsMin, liveMode ? new Date().getSeconds() : 0)
      : null;

  const activeSubject = subjectMap.get(
    activeHeroRemainder && heroSession?.subjectId ? heroSession.subjectId : focus.subjectId
  );

  const breaksEnabled = settings.breaksEnabled !== false;
  const breakMin = clampBreakMinutes(settings.defaultBreakMinutes ?? focus.breakMinutes ?? 5);

  const pcStopwatch = liveMode && focus.origin === 'pc' && focus.pcMode === 'Stopwatch' && focus.phase !== 'break' && focus.phase !== 'break_paused';
  const displaySeconds = activeHeroRemainder
    ? activeHeroRemainder.seconds
    : pcStopwatch
      ? focus.elapsedActiveSeconds
      : focus.secondsLeft;
  const displayTotalSeconds = activeHeroRemainder ? activeHeroRemainder.seconds : focus.totalSeconds;

  const progressRatio =
    displayTotalSeconds > 0
      ? Math.min(
          1,
          Math.max(
            0,
            pcStopwatch
              ? focus.elapsedActiveSeconds / 36000
              : (displayTotalSeconds - displaySeconds) / displayTotalSeconds
          )
        )
      : 0;

  // Exact StudyFlow PC FocusTimerView circular SVG ring geometry & colors
  const radius = 96;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - progressRatio);
  const isBreakPhase = focus.phase === 'break' || focus.phase === 'break_paused';
  const hasPausedSession = Boolean(focus.pausedFocus);
  const ringStroke = isBreakPhase ? '#10B981' : activeSubject?.color ?? 'var(--accent)';

  const phaseLabel =
    focus.phase === 'focus'
      ? 'Focus interval'
      : focus.phase === 'paused'
        ? 'Focus paused'
        : focus.phase === 'break'
          ? hasPausedSession
            ? 'Mid-session break'
            : `${focus.breakMinutes}-minute break`
          : focus.phase === 'break_paused'
            ? 'Break paused'
            : focus.phase === 'completed'
              ? 'Interval complete'
              : activeHeroRemainder
                ? 'Current session remainder'
                : 'Ready to focus';

  const isRunning = focus.phase === 'focus' || focus.phase === 'break';
  const isPaused = focus.phase === 'paused' || focus.phase === 'break_paused';
  const canTakeMidBreak = focus.phase === 'focus' || focus.phase === 'paused';

  const appsList = screenTimeTab === 'session' ? sessionScreenTimeApps : todayScreenTimeApps;
  const totalScreenMin = appsList.reduce((acc, a) => acc + a.minutes, 0);

  const timerBlock = (
    <section
      aria-label="Focus timer"
      className={`rounded-xl p-4 flex flex-col items-center text-center ${
        focus.showFullScreen ? 'flex-1 justify-center border-0 shadow-none' : ''
      }`}
      style={
        focus.showFullScreen
          ? { backgroundColor: 'var(--bg-canvas)' }
          : {
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              boxShadow: 'var(--shadow-subtle)',
            }
      }
    >
      {/* Subject + Session Title Header */}
      <div className="w-full flex items-start justify-between gap-2 mb-3">
        <div className="text-left min-w-0">
          <div className="flex items-center gap-1.5 text-[calc(12px*var(--sf-font-scale,1))] font-semibold">
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: activeSubject?.color ?? 'var(--accent)' }}
            />
            <span style={{ color: activeSubject?.color ?? 'var(--accent)' }}>
              {focus.customSubject || ((activeSubject?.code ?? 'STUDY') + ' · ' + (activeSubject?.name ?? 'Study'))}
            </span>
          </div>
          <h2 className="font-display text-[calc(17px*var(--sf-font-scale,1))] font-semibold text-[var(--text-primary)] leading-snug mt-0.5 truncate">
            {activeHeroRemainder && heroSession ? heroSession.title : focus.sessionTitle}
          </h2>
        </div>

        <button
          type="button"
          onClick={() => setFocusFullScreen(!focus.showFullScreen)}
          aria-label={focus.showFullScreen ? 'Exit full-screen focus' : 'Open full-screen focus'}
          className="min-h-[48px] min-w-[48px] rounded-xl flex items-center justify-center shrink-0 transition-colors hover:bg-[var(--bg-surface-hover)]"
          style={{
            backgroundColor: 'var(--bg-surface-subtle)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--text-secondary)',
          }}
        >
          {focus.showFullScreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
      </div>

      {/* Started on PC / Offline / Mid-Session Break Metadata */}
      {(focus.origin === 'pc' || connection.mode === 'offline' || focus.pendingSyncWhenOnline || (isBreakPhase && hasPausedSession)) && (
        <div className="w-full space-y-1.5 mb-3 text-left">
          {isBreakPhase && hasPausedSession && focus.pausedFocus && (
            <div
              role="status"
              className="rounded-lg px-3 py-2 flex items-center gap-2 text-[calc(12px*var(--sf-font-scale,1))]"
              style={{
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.28)',
                color: 'var(--text-primary)',
              }}
            >
              <Coffee className="w-3.5 h-3.5 shrink-0 text-emerald-500" />
              <span>
                Session paused ({formatCountdownMMSS(focus.pausedFocus.secondsLeft)} left) · stays paused until you resume
              </span>
            </div>
          )}

          {focus.origin === 'pc' && focus.phase !== 'idle' && (
            <div
              className="rounded-lg px-3 py-2 flex items-center gap-2 text-[calc(12px*var(--sf-font-scale,1))]"
              style={{
                backgroundColor: 'var(--accent-soft)',
                border: '1px solid var(--accent-border)',
                color: 'var(--text-primary)',
              }}
            >
              <Monitor className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--accent)' }} />
              <span>Started on PC · Phone controls synced</span>
            </div>
          )}

          {(connection.mode === 'offline' || focus.pendingSyncWhenOnline) && (
            <div
              className="rounded-lg px-3 py-2 flex items-center gap-2 text-[calc(12px*var(--sf-font-scale,1))]"
              style={{
                backgroundColor: 'var(--bg-surface-subtle)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-secondary)',
              }}
            >
              <CloudOff className="w-3.5 h-3.5 shrink-0 text-[var(--text-muted)]" />
              <span>{focus.origin === 'phone' ? 'Local timer · will sync when connected' : 'Offline · reconnect to sync'}</span>
            </div>
          )}
        </div>
      )}

      {/* PC-Matched Circular Progress Ring & Steady Tabular Countdown */}
      <div className="relative w-[224px] h-[224px] flex items-center justify-center my-1">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 224 224" aria-hidden="true">
          <circle
            cx="112"
            cy="112"
            r={radius}
            fill="none"
            stroke="var(--bg-surface-hover)"
            strokeWidth="7"
          />
          <circle
            cx="112"
            cy="112"
            r={radius}
            fill="none"
            stroke={ringStroke}
            strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            className="transition-all duration-300"
          />
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center px-5">
          <div className="text-[calc(12px*var(--sf-font-scale,1))] font-medium text-[var(--text-muted)] flex items-center gap-1.5">
            {isBreakPhase && <Coffee className="w-3.5 h-3.5 text-emerald-500" />}
            <span>{phaseLabel}</span>
          </div>
          <div
            data-testid="focus-countdown"
            className="font-mono-num text-[38px] font-semibold tracking-tight leading-none my-2"
            style={{ color: 'var(--text-primary)' }}
          >
            {!activeHeroRemainder && !pcStopwatch && !isBreakPhase && displaySeconds === 0 && focus.elapsedActiveSeconds >= focus.totalSeconds && focus.phase !== 'idle'
              ? formatFocusCountdown(0, focus.elapsedActiveSeconds, focus.totalSeconds, Boolean(focus.localRunId || focus.pcMode === 'Custom' || focus.pcMode === 'Countdown'))
              : formatCountdownMMSS(displaySeconds)}
          </div>
          <div className="text-[calc(11.5px*var(--sf-font-scale,1))] font-mono-num text-[var(--text-muted)]">
            {isBreakPhase
              ? `${focus.breakMinutes} min break`
              : pcStopwatch
                ? 'PC stopwatch · elapsed'
                : activeHeroRemainder
                  ? `${formatHoursMinutesCompact(activeHeroRemainder.seconds)} left in session`
                  : `${formatHoursMinutesCompact(focus.intervalMinutes * 60)} interval`}
          </div>
        </div>
      </div>

      {/* Primary Action Controls */}
      <div className="w-full space-y-2 mt-4">
        <div className="w-full flex items-center gap-2.5">
          {isIdle ? (
            <button
              type="button"
              onClick={() =>
                startFocusForBlock(
                  activeHeroRemainder && heroSession ? heroSession.id : focus.sessionId,
                  'phone',
                  focus.showFullScreen
                )
              }
              className="flex-1 min-h-[48px] px-5 rounded-xl inline-flex items-center justify-center gap-2 text-[calc(14px*var(--sf-font-scale,1))] font-semibold transition-opacity hover:opacity-90"
              style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' }}
            >
              <Play className="w-4 h-4" />
              {activeHeroRemainder
                ? `Start (${formatHoursMinutesCompact(activeHeroRemainder.seconds)})`
                : 'Start'}
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={isRunning ? pauseFocus : resumeFocus}
                className="flex-1 min-h-[48px] px-5 rounded-xl inline-flex items-center justify-center gap-2 text-[calc(14px*var(--sf-font-scale,1))] font-semibold transition-opacity hover:opacity-90"
                style={{
                  backgroundColor: isBreakPhase ? '#10B981' : 'var(--accent)',
                  color: '#FFFFFF',
                }}
              >
                {isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                {isRunning ? 'Pause' : isPaused ? 'Resume' : 'Start'}
              </button>
              <button
                type="button"
                onClick={finishFocus}
                className="min-h-[48px] px-4 rounded-xl inline-flex items-center justify-center gap-1.5 text-[calc(13.5px*var(--sf-font-scale,1))] font-medium transition-colors hover:bg-[var(--bg-surface-hover)]"
                style={{
                  backgroundColor: 'var(--bg-surface-subtle)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-primary)',
                }}
              >
                <CheckCircle2 className="w-4 h-4" />
                Finish
              </button>
            </>
          )}
        </div>

        {/* Mid-session Take Break (pauses session without ending) / Return to Session */}
        {canTakeMidBreak && (
          <button
            type="button"
            onClick={() => takeBreak(breakMin)}
            className="w-full min-h-[44px] px-4 rounded-xl inline-flex items-center justify-center gap-2 text-[calc(13px*var(--sf-font-scale,1))] font-medium transition-colors hover:bg-[var(--bg-surface-hover)]"
            style={{
              backgroundColor: 'var(--bg-surface-subtle)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-primary)',
            }}
          >
            <Coffee className="w-4 h-4 text-emerald-500" />
            Take {breakMin}m break (pauses session)
          </button>
        )}

        {isBreakPhase && (
          <button
            type="button"
            onClick={endBreak}
            className="w-full min-h-[44px] px-4 rounded-xl inline-flex items-center justify-center gap-2 text-[calc(13px*var(--sf-font-scale,1))] font-medium transition-colors hover:bg-[var(--bg-surface-hover)]"
            style={{
              backgroundColor: 'var(--bg-surface-subtle)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-primary)',
            }}
          >
            <ArrowLeft className="w-4 h-4" />
            {hasPausedSession ? 'Return to paused session' : 'End break'}
          </button>
        )}
      </div>
    </section>
  );

  // Full-screen immersive active focus overlay
  if (focus.showFullScreen) {
    return (
      <div
        className="absolute inset-0 z-30 flex flex-col p-4"
        style={{ backgroundColor: 'var(--bg-canvas)' }}
      >
        {timerBlock}
      </div>
    );
  }

  return (
    <div className="px-4 pb-6 pt-3 space-y-4">
      <header className="flex items-center justify-between gap-2">
        <h1 className="font-display text-[calc(20px*var(--sf-font-scale,1))] font-semibold text-[var(--text-primary)]">
          Focus
        </h1>
        <span className="text-[calc(12px*var(--sf-font-scale,1))] text-[var(--text-muted)]">
          Synced with {connection.pcName}
        </span>
      </header>

      {timerBlock}

      {/* Optional Breaks Settings Card */}
      <section className="rounded-xl p-4 space-y-3 border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
        <label className="flex items-center justify-between gap-3">
          <div>
            <div className="font-semibold text-[calc(14px*var(--sf-font-scale,1))] text-[var(--text-primary)]">
              Optional breaks
            </div>
            <p className="text-xs text-[var(--text-muted)]">
              Pause mid-session or take a break after finishing. Focus stays paused until you tap Resume.
            </p>
          </div>
          <input
            type="checkbox"
            checked={breaksEnabled}
            onChange={(e) => updateSettings({ breaksEnabled: e.target.checked })}
            className="w-4 h-4 accent-[var(--accent)] shrink-0"
          />
        </label>

        {breaksEnabled && (
          <div className="flex items-center justify-between gap-2 pt-2 border-t border-[var(--border-subtle)]">
            <div className="flex items-center gap-1.5">
              {[5, 10, 15].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => updateSettings({ defaultBreakMinutes: m })}
                  className="min-h-[36px] px-3 rounded-lg text-xs font-mono-num font-medium"
                  style={{
                    backgroundColor: breakMin === m ? 'var(--accent-soft)' : 'var(--bg-surface-subtle)',
                    border: breakMin === m ? '1px solid var(--accent-border)' : '1px solid var(--border-subtle)',
                    color: breakMin === m ? 'var(--accent)' : 'var(--text-secondary)',
                  }}
                >
                  {m}m
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
              <input
                aria-label="Break duration in minutes"
                type="number"
                min={MIN_BREAK_MINUTES}
                max={MAX_BREAK_MINUTES}
                value={breakMin}
                onChange={(e) => updateSettings({ defaultBreakMinutes: clampBreakMinutes(Number(e.target.value)) })}
                className="w-14 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-2 py-1.5 text-center font-mono-num text-xs text-[var(--text-primary)]"
              />
              <span>min</span>
            </div>
          </div>
        )}
      </section>

      {liveMode && (
        <section className="rounded-xl p-4 space-y-2 border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
          <label className="flex items-center justify-between gap-3">
            <span className="font-semibold">Deep focus mode</span>
            <input
              type="checkbox"
              checked={settings.deepFocus === true}
              onChange={(e) => updateSettings({ deepFocus: e.target.checked })}
            />
          </label>
          <p className="text-xs text-[var(--text-muted)]">
            Warns when you switch to another app during an active focus interval. Android accessibility permission is needed; StudyFlow only observes the foreground app package, never screen contents or text. It does not block apps.
          </p>
          {settings.deepFocus && !deepAllowed && (
            <button
              type="button"
              onClick={() => deepBridge?.request()}
              className="rounded-lg px-3 py-2 text-sm bg-[var(--accent)] text-[var(--accent-fg)]"
            >
              Enable Android accessibility access
            </button>
          )}
          {settings.deepFocus && deepAllowed && (
            <p className="text-xs text-[var(--text-secondary)]">Ready · warnings enabled during focus.</p>
          )}
        </section>
      )}

      {/* When NO scheduled session is currently active and timer is idle: show ONLY Pomodoro or Custom (hours & minutes) */}
      {isIdle && (
        <section className="rounded-xl p-4 space-y-3 border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="font-semibold text-[var(--text-primary)]">Start a focus session</h2>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                Choose Pomodoro or Custom (up to 10h), even during a scheduled block.
              </p>
            </div>
          </div>

          <div
            className="grid grid-cols-2 p-1 rounded-xl text-xs"
            style={{ backgroundColor: 'var(--bg-surface-subtle)', border: '1px solid var(--border-subtle)' }}
            role="tablist"
            aria-label="Mobile focus modes"
          >
            {(['Pomodoro', 'Custom'] as const).map((m) => {
              const selected = idleMode === m;
              return (
                <button
                  key={m}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => setIdleMode(m)}
                  className="min-h-[38px] rounded-lg font-medium transition-colors"
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

          {idleMode === 'Pomodoro' ? (
            <button
              type="button"
              onClick={() => startCustomFocus(activeSubject?.name || 'Pomodoro Focus', 25)}
              className="w-full min-h-[48px] rounded-xl py-3 font-semibold bg-[var(--accent)] text-[var(--accent-fg)]"
            >
              Start Pomodoro (25m)
            </button>
          ) : (
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                const clamped = clampFocusHoursMinutes(customHours, customMinutes);
                startCustomFocus(customSubject || activeSubject?.name || 'Focus session', clamped.totalMinutes);
              }}
            >
              <label className="block text-xs text-[var(--text-secondary)]">
                Subject
                <input
                  required
                  list="studyflow-subjects"
                  maxLength={100}
                  value={customSubject}
                  onChange={(e) => setCustomSubject(e.target.value)}
                  placeholder="e.g. Chemistry"
                  className="mt-1 block w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-sm text-[var(--text-primary)]"
                />
                <datalist id="studyflow-subjects">
                  {subjects
                    .filter((s) => s.id !== 'synced-study')
                    .map((s) => (
                      <option key={s.id} value={s.name} />
                    ))}
                </datalist>
              </label>

              <div className="grid grid-cols-2 gap-2.5">
                <label className="block text-xs text-[var(--text-secondary)]">
                  Hours (0–10)
                  <input
                    type="number"
                    min={0}
                    max={MAX_FOCUS_HOURS}
                    value={customHours}
                    onChange={(e) => {
                      const nextH = Math.max(0, Math.min(MAX_FOCUS_HOURS, Number(e.target.value) || 0));
                      setCustomHours(nextH);
                      if (nextH >= MAX_FOCUS_HOURS) setCustomMinutes(0);
                    }}
                    className="mt-1 block w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-sm font-mono-num text-[var(--text-primary)]"
                  />
                </label>
                <label className="block text-xs text-[var(--text-secondary)]">
                  Minutes (0–59)
                  <input
                    type="number"
                    min={0}
                    max={customHours >= MAX_FOCUS_HOURS ? 0 : 59}
                    value={customHours >= MAX_FOCUS_HOURS ? 0 : customMinutes}
                    onChange={(e) => {
                      const nextM = Math.max(0, Math.min(59, Number(e.target.value) || 0));
                      setCustomMinutes(customHours >= MAX_FOCUS_HOURS ? 0 : nextM);
                    }}
                    className="mt-1 block w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-sm font-mono-num text-[var(--text-primary)]"
                  />
                </label>
              </div>

              <button
                type="submit"
                className="w-full min-h-[48px] rounded-xl py-3 font-semibold bg-[var(--accent)] text-[var(--accent-fg)]"
              >
                Start custom timer ({formatHoursMinutesCompact(clampFocusHoursMinutes(customHours, customMinutes).totalSeconds)})
              </button>
            </form>
          )}
        </section>
      )}

      {/* Screen Time Section (Inside Focus) */}
      <section
        aria-label="Screen time"
        className="rounded-xl p-4 space-y-3.5"
        style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          boxShadow: 'var(--shadow-subtle)',
        }}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-[var(--text-secondary)]" />
            <h2 className="font-display text-[calc(15px*var(--sf-font-scale,1))] font-semibold text-[var(--text-primary)]">
              Screen time
            </h2>
          </div>

          <div
            className="inline-flex p-0.5 rounded-lg text-[calc(12px*var(--sf-font-scale,1))]"
            style={{
              backgroundColor: 'var(--bg-surface-subtle)',
              border: '1px solid var(--border-subtle)',
            }}
            role="tablist"
            aria-label="Screen time range"
          >
            {(
              [
                { id: 'session', label: 'This session' },
                { id: 'today', label: 'Today' },
              ] as const
            ).map((tab) => {
              const active = screenTimeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setScreenTimeTab(tab.id)}
                  className="min-h-[36px] px-2.5 rounded-md font-medium transition-colors whitespace-nowrap"
                  style={{
                    backgroundColor: active ? 'var(--bg-surface)' : 'transparent',
                    color: active ? 'var(--text-primary)' : 'var(--text-muted)',
                    boxShadow: active ? 'var(--shadow-subtle)' : 'none',
                  }}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {screenTimeMode === 'permission_needed' ? (
          <div
            className="rounded-xl p-3.5 space-y-3"
            style={{
              backgroundColor: 'var(--bg-surface-subtle)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <div className="flex items-start gap-2.5">
              <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0" style={{ color: 'var(--accent)' }} />
              <div className="space-y-1">
                <p className="text-[calc(13.5px*var(--sf-font-scale,1))] font-semibold text-[var(--text-primary)]">
                  Usage access needed
                </p>
                <p className="text-[calc(12.5px*var(--sf-font-scale,1))] text-[var(--text-secondary)] leading-relaxed">
                  Allow Android usage access so StudyFlow can measure which apps draw your
                  attention during active focus intervals. Pauses and breaks are never counted.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setPermission('usageAccess', true);
                if (!liveMode) setScreenTimeMode('measured');
              }}
              className="w-full min-h-[48px] rounded-xl text-[calc(13.5px*var(--sf-font-scale,1))] font-semibold transition-opacity hover:opacity-90"
              style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' }}
            >
              Allow usage access
            </button>
          </div>
        ) : screenTimeMode === 'zero' || (liveMode && appsList.length === 0) ? (
          <div
            className="rounded-xl p-3.5 space-y-1.5"
            style={{
              backgroundColor: 'var(--bg-surface-subtle)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <p className="text-[calc(14px*var(--sf-font-scale,1))] font-semibold text-[var(--text-primary)]">
              0 min of phone use during {focus.intervalMinutes} min of focus.
            </p>
            <p className="text-[calc(12px*var(--sf-font-scale,1))] text-[var(--text-secondary)]">
              Zero distractions recorded during active focus. Pauses and breaks are excluded.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <p className="text-[calc(14px*var(--sf-font-scale,1))] font-semibold text-[var(--text-primary)] leading-snug">
                {screenTimeTab === 'session'
                  ? `${totalScreenMin.toFixed(1)} min of phone use since this focus interval started.`
                  : `${totalScreenMin.toFixed(1)} min of phone use on your phone today.`}
              </p>
              <p className="text-[calc(11.5px*var(--sf-font-scale,1))] text-[var(--text-muted)] mt-0.5">
                {liveMode
                  ? 'Measured by Android usage access · excludes StudyFlow itself'
                  : 'Counts active focus intervals only · excludes pauses and breaks'}
              </p>
            </div>

            <div
              className="h-2.5 w-full rounded-full overflow-hidden flex gap-0.5"
              style={{ backgroundColor: 'var(--bg-surface-subtle)' }}
              aria-label="App screen time distribution"
            >
              {appsList.map((app) => (
                <div
                  key={app.id}
                  style={{
                    width: `${(app.minutes / Math.max(1, totalScreenMin)) * 100}%`,
                    backgroundColor: app.color,
                  }}
                  title={`${app.name}: ${app.minutes} min`}
                />
              ))}
            </div>

            <div className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
              {appsList.map((app) => (
                <div
                  key={app.id}
                  className="py-2 flex items-center justify-between gap-2 text-[calc(13px*var(--sf-font-scale,1))]"
                  style={{ borderColor: 'var(--border-subtle)' }}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: app.color }}
                    />
                    <span className="font-medium text-[var(--text-primary)] truncate">
                      {app.name}
                    </span>
                    <span className="text-[calc(11.5px*var(--sf-font-scale,1))] text-[var(--text-muted)] truncate">
                      {app.category}
                    </span>
                  </div>
                  <span className="font-mono-num text-[calc(12.5px*var(--sf-font-scale,1))] font-medium text-[var(--text-secondary)] shrink-0">
                    {app.minutes} min
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
};
