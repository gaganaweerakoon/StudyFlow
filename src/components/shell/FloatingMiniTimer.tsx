import React from 'react';
import { Play, Pause, Maximize2, X, Coffee, ArrowLeft, GripVertical } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useFloatingPosition } from '../../hooks/useFloatingPosition';
import { formatTimerSeconds, formatFocusCountdown } from '../../utils/studyLogic';

export const FloatingMiniTimer: React.FC = () => {
  const {
    route,
    setRoute,
    focusTimer,
    toggleFocusRunning,
    takeFocusBreak,
    endFocusBreak,
    setMiniTimerVisible,
    subjects,
    preferences,
  } = useApp();

  const {
    elementRef,
    position,
    isDragging,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handlePointerCancel,
    resetPosition,
  } = useFloatingPosition<HTMLDivElement>({
    storageKey: 'studyflow_floating_mini_timer_pos',
    margin: 12,
    ignoreSelector: 'button, a, input, select, textarea',
  });

  const shouldShow =
    (focusTimer.miniVisible || focusTimer.running || Boolean(focusTimer.pausedFocus)) &&
    route !== 'focus';
  if (!shouldShow) return null;

  const subject = subjects.find((s) => s.id === focusTimer.subjectId);
  const isBreak = focusTimer.phase === 'break';
  const canTakeBreak =
    focusTimer.phase === 'focus' && (focusTimer.running || focusTimer.elapsedSeconds > 0);
  const displayTime =
    focusTimer.phase === 'focus' && focusTimer.mode === 'Stopwatch'
      ? formatTimerSeconds(focusTimer.elapsedSeconds)
      : formatFocusCountdown(
          focusTimer.secondsLeft,
          focusTimer.elapsedSeconds,
          focusTimer.totalSeconds,
          focusTimer.phase === 'focus',
        );

  const progressPct =
    focusTimer.phase === 'focus' && focusTimer.mode === 'Stopwatch'
      ? Math.min(100, (focusTimer.elapsedSeconds / 36000) * 100)
      : Math.min(
          100,
          ((focusTimer.totalSeconds - focusTimer.secondsLeft) /
            Math.max(1, focusTimer.totalSeconds)) *
            100,
        );

  return (
    <div
      ref={elementRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onDoubleClick={(e) => {
        if ((e.target as HTMLElement | null)?.closest('button')) return;
        resetPosition();
      }}
      className={`fixed z-40 w-76 rounded-xl overflow-hidden select-none touch-none ${
        position ? '' : 'bottom-4 right-4'
      } ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
      style={{
        ...(position ? { left: position.x, top: position.y } : {}),
        backgroundColor: 'var(--bg-elevated)',
        border: isDragging ? '1px solid var(--accent-border)' : '1px solid var(--border-subtle)',
        boxShadow: 'var(--shadow-floating)',
      }}
      role="region"
      aria-label="Floating Focus Mini-Timer"
      title="Drag to move timer · Double-click to reset position"
    >
      <div className="px-3 py-2.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="text-[var(--text-muted)] opacity-55 shrink-0 flex items-center"
            aria-hidden="true"
          >
            <GripVertical className="w-3.5 h-3.5" />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-[11px] text-[var(--text-muted)]">
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{
                  backgroundColor: isBreak ? '#10B981' : subject?.color ?? 'var(--accent)',
                }}
              />
              <span className="truncate">
                {isBreak
                  ? focusTimer.pausedFocus
                    ? `Break · ${formatTimerSeconds(focusTimer.pausedFocus.secondsLeft)} paused`
                    : 'Optional break'
                  : `${subject?.code ?? 'Focus'} · ${focusTimer.mode}`}
              </span>
            </div>
            <div className="font-mono-num text-[18px] font-semibold text-[var(--text-primary)] leading-tight mt-0.5">
              {displayTime}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={toggleFocusRunning}
            aria-label={focusTimer.running ? 'Pause timer' : 'Resume timer'}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-opacity hover:opacity-90 cursor-pointer"
            style={{
              backgroundColor: isBreak ? '#10B981' : 'var(--accent)',
              color: '#FFFFFF',
            }}
          >
            {focusTimer.running ? (
              <Pause className="w-3.5 h-3.5" />
            ) : (
              <Play className="w-3.5 h-3.5 ml-0.5" />
            )}
          </button>
          {canTakeBreak && (
            <button
              type="button"
              onClick={() => takeFocusBreak(preferences.pomodoroBreakMin)}
              aria-label="Take a break without ending session"
              title="Take break (pauses session)"
              className="w-7 h-7 rounded-lg flex items-center justify-center text-emerald-500 hover:bg-[var(--bg-surface-hover)] cursor-pointer"
            >
              <Coffee className="w-3.5 h-3.5" />
            </button>
          )}
          {isBreak && (
            <button
              type="button"
              onClick={endFocusBreak}
              aria-label="Return to paused session"
              title="Return to paused session"
              className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={() => setRoute('focus')}
            aria-label="Open full Focus Timer"
            title="Open Focus Timer"
            className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] cursor-pointer"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setMiniTimerVisible(false)}
            aria-label="Hide floating timer"
            className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="h-1 w-full" style={{ backgroundColor: 'var(--bg-surface-subtle)' }}>
        <div
          className="h-full transition-all duration-300"
          style={{
            width: `${progressPct}%`,
            backgroundColor: isBreak ? '#10B981' : 'var(--accent)',
          }}
        />
      </div>
    </div>
  );
};
