import React from 'react';
import {
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
import { formatCountdownMMSS } from '../companionLogic';

export const FocusView: React.FC = () => {
  const {
    focus,
    liveMode,
    subjects,
    connection,
    startFocusForBlock,
    startCustomFocus,
    pauseFocus,
    resumeFocus,
    finishFocus,
    setFocusFullScreen,
    screenTimeMode,
    setScreenTimeMode,
    screenTimeTab,
    setScreenTimeTab,
    sessionScreenTimeApps,
    todayScreenTimeApps,
    setPermission,
  } = useCompanion();

  const [customSubject, setCustomSubject] = React.useState('');
  const [customMinutes, setCustomMinutes] = React.useState(25);
  const subjectMap = new Map(subjects.map((s) => [s.id, s]));
  const activeSubject = subjectMap.get(focus.subjectId);

  const pcStopwatch = liveMode && focus.origin === 'pc' && focus.pcMode === 'Stopwatch';
  const progressRatio =
    focus.totalSeconds > 0
      ? Math.min(1, Math.max(0, pcStopwatch
        ? focus.elapsedActiveSeconds / focus.totalSeconds
        : (focus.totalSeconds - focus.secondsLeft) / focus.totalSeconds))
      : 0;

  // Exact StudyFlow PC FocusTimerView circular SVG ring geometry & colors
  const radius = 96;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - progressRatio);
  const ringStroke =
    focus.phase === 'break' || focus.phase === 'break_paused'
      ? '#10B981'
      : activeSubject?.color ?? 'var(--accent)';

  const phaseLabel =
    focus.phase === 'focus'
      ? 'Focus interval'
      : focus.phase === 'paused'
      ? 'Focus paused'
      : focus.phase === 'break'
      ? '5-minute break'
      : focus.phase === 'break_paused'
      ? 'Break paused'
      : focus.phase === 'completed'
      ? 'Interval complete'
      : 'Ready to focus';

  const isRunning = focus.phase === 'focus' || focus.phase === 'break';
  const isPaused = focus.phase === 'paused' || focus.phase === 'break_paused';

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
            {focus.sessionTitle}
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
          {focus.showFullScreen ? (
            <Minimize2 className="w-4 h-4" />
          ) : (
            <Maximize2 className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Started on PC / Offline Continuity Metadata */}
      {(focus.origin === 'pc' || connection.mode === 'offline' || focus.pendingSyncWhenOnline) && (
        <div className="w-full space-y-1.5 mb-3 text-left">
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
              <span>{focus.origin === 'phone' ? 'Local timer · PC import not supported yet' : 'Offline · reconnect to sync'}</span>
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
            {(focus.phase === 'break' || focus.phase === 'break_paused') && (
              <Coffee className="w-3.5 h-3.5 text-emerald-500" />
            )}
            <span>{phaseLabel}</span>
          </div>
          <div
            data-testid="focus-countdown"
            className="font-mono-num text-[44px] font-semibold tracking-tight leading-none my-2"
            style={{ color: 'var(--text-primary)' }}
          >
            {formatCountdownMMSS(pcStopwatch ? focus.elapsedActiveSeconds : focus.secondsLeft)}
          </div>
          <div className="text-[calc(11.5px*var(--sf-font-scale,1))] font-mono-num text-[var(--text-muted)]">
            {focus.phase === 'break' || focus.phase === 'break_paused'
              ? `${focus.breakMinutes} min break`
              : pcStopwatch ? 'PC stopwatch · elapsed time' : `${focus.intervalMinutes} min interval`}
          </div>
        </div>
      </div>

      {/* Primary Action Controls (Start / Pause / Resume / Finish) */}
      <div className="w-full flex items-center gap-2.5 mt-4">
        {focus.phase === 'idle' || focus.phase === 'completed' ? (
          <button
            type="button"
            onClick={() => startFocusForBlock(focus.sessionId, 'phone', focus.showFullScreen)}
            className="flex-1 min-h-[48px] px-5 rounded-xl inline-flex items-center justify-center gap-2 text-[calc(14px*var(--sf-font-scale,1))] font-semibold transition-opacity hover:opacity-90"
            style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' }}
          >
            <Play className="w-4 h-4" />
            Start
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={isRunning ? pauseFocus : resumeFocus}
              className="flex-1 min-h-[48px] px-5 rounded-xl inline-flex items-center justify-center gap-2 text-[calc(14px*var(--sf-font-scale,1))] font-semibold transition-opacity hover:opacity-90"
              style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' }}
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

      {liveMode && (focus.phase === 'idle' || focus.phase === 'completed') && (
        <section className="rounded-xl p-4 space-y-3 border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
          <h2 className="font-semibold">Custom focus timer</h2>
          <p className="text-xs text-[var(--text-muted)]">Works offline. Enter a subject and duration. Sessions are currently stored on this phone.</p>
          <form className="space-y-3" onSubmit={e => { e.preventDefault(); startCustomFocus(customSubject, customMinutes); }}>
            <label className="block text-xs">Subject
              <input required maxLength={100} value={customSubject} onChange={e => setCustomSubject(e.target.value)} placeholder="e.g. Chemistry"
                className="mt-1 block w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-sm"/>
            </label>
            <label className="block text-xs">Duration (minutes)
              <input required type="number" min={1} max={720} value={customMinutes} onChange={e => setCustomMinutes(Number(e.target.value))}
                className="mt-1 block w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-sm"/>
            </label>
            <button type="submit" className="w-full rounded-lg py-3 font-semibold bg-[var(--accent)] text-[var(--accent-fg)]">Start custom timer</button>
          </form>
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

          {/* This session / Today segmented toggle */}
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

        {/* State 1: Permission Needed / Unavailable Data */}
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
        ) : (screenTimeMode === 'zero' || (liveMode && appsList.length === 0)) ? (
          /* State 2: Measured Zero Usage */
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
          /* State 3: Measured Usage */
          <div className="space-y-3">
            <div>
              <p className="text-[calc(14px*var(--sf-font-scale,1))] font-semibold text-[var(--text-primary)] leading-snug">
                {screenTimeTab === 'session'
                  ? `${totalScreenMin.toFixed(1)} min of phone use since this focus interval started.`
                  : `${totalScreenMin.toFixed(1)} min of phone use on your phone today.`}
              </p>
              <p className="text-[calc(11.5px*var(--sf-font-scale,1))] text-[var(--text-muted)] mt-0.5">
                {liveMode ? 'Measured by Android usage access · excludes StudyFlow itself' : 'Counts active focus intervals only · excludes pauses and breaks'}
              </p>
            </div>

            {/* Horizontal Stacked Breakdown Bar */}
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

            {/* Most-used apps with exact durations */}
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
