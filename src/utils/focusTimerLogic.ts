import type { FocusTimerState } from '../context/AppContext';
import type { ScheduleBlock } from '../mobile/types';
import type { StudySession } from '../types/studyflow';
import { currentStudySession } from './calendarLayout';

export const MAX_FOCUS_HOURS = 10;
export const MAX_FOCUS_MINUTES = MAX_FOCUS_HOURS * 60; // 600 minutes
export const MAX_FOCUS_SECONDS = MAX_FOCUS_MINUTES * 60; // 36,000 seconds
export const MIN_FOCUS_MINUTES = 1;
export const MIN_FOCUS_SECONDS = 60;

export const DEFAULT_BREAK_MINUTES = 5;
export const MIN_BREAK_MINUTES = 1;
export const MAX_BREAK_MINUTES = 60;

export interface PausedFocusSnapshot {
  mode: FocusTimerState['mode'];
  secondsLeft: number;
  totalSeconds: number;
  elapsedSeconds: number;
}

export interface ClampedDuration {
  hours: number;
  minutes: number;
  totalMinutes: number;
  totalSeconds: number;
}

export function clampFocusMinutes(totalMinutes: number): number {
  const safe = Number.isFinite(totalMinutes) ? Math.round(totalMinutes) : 25;
  return Math.max(MIN_FOCUS_MINUTES, Math.min(MAX_FOCUS_MINUTES, safe));
}

export function clampFocusSeconds(totalSeconds: number): number {
  const safe = Number.isFinite(totalSeconds) ? Math.round(totalSeconds) : 25 * 60;
  return Math.max(MIN_FOCUS_SECONDS, Math.min(MAX_FOCUS_SECONDS, safe));
}

export function clampBreakMinutes(minutes: number): number {
  const safe = Number.isFinite(minutes) ? Math.round(minutes) : DEFAULT_BREAK_MINUTES;
  return Math.max(MIN_BREAK_MINUTES, Math.min(MAX_BREAK_MINUTES, safe));
}

export function splitMinutesToHoursMinutes(totalMinutes: number): { hours: number; minutes: number } {
  const clamped = clampFocusMinutes(totalMinutes);
  return {
    hours: Math.floor(clamped / 60),
    minutes: clamped % 60,
  };
}

export function clampFocusHoursMinutes(hours: number, minutes: number): ClampedDuration {
  const safeHours = Number.isFinite(hours) ? Math.max(0, Math.floor(hours)) : 0;
  const safeMinutes = Number.isFinite(minutes) ? Math.max(0, Math.floor(minutes)) : 0;
  const totalMinutes = clampFocusMinutes(safeHours * 60 + safeMinutes);
  return {
    hours: Math.floor(totalMinutes / 60),
    minutes: totalMinutes % 60,
    totalMinutes,
    totalSeconds: totalMinutes * 60,
  };
}

export function formatHoursMinutesCompact(totalSeconds: number): string {
  const totalMin = Math.max(1, Math.ceil(Math.max(0, totalSeconds) / 60));
  const hrs = Math.floor(totalMin / 60);
  const mins = totalMin % 60;
  if (hrs === 0) return `${mins}m`;
  if (mins === 0) return `${hrs}h`;
  return `${hrs}h ${mins}m`;
}

/**
 * Computes exact remaining seconds from `now` until `session` ends.
 * Handles cross-midnight sessions accurately and clamps active remainders to [60s, 10h].
 * Returns `null` if `now` is outside the session window.
 */
export function studySessionRemainingSeconds(session: StudySession, now = new Date()): number | null {
  const match = session.date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  const dayStartMs = new Date(year, month, day, 0, 0, 0, 0).getTime();
  const sessionStartMs = dayStartMs + session.startHour * 3_600_000;
  const sessionEndMs = sessionStartMs + session.durationHours * 3_600_000;
  const nowMs = now.getTime();
  if (nowMs < sessionStartMs || nowMs >= sessionEndMs) return null;
  const rawRemainingSec = Math.ceil((sessionEndMs - nowMs) / 1000);
  return clampFocusSeconds(rawRemainingSec);
}

export interface CurrentSessionRemaining {
  session: StudySession;
  remainingSeconds: number;
  remainingMinutes: number;
}

export function currentStudySessionRemaining(
  sessions: StudySession[],
  now = new Date()
): CurrentSessionRemaining | null {
  const session = currentStudySession(sessions, now);
  if (!session) return null;
  const remainingSeconds = studySessionRemainingSeconds(session, now);
  if (remainingSeconds === null) return null;
  return {
    session,
    remainingSeconds,
    remainingMinutes: Math.max(1, Math.ceil(remainingSeconds / 60)),
  };
}

/**
 * Computes default focus duration in seconds for a mobile ScheduleBlock:
 * - If the block is currently in progress at `nowAbsMin`, returns its remaining time (clamped 1m..10h).
 * - Otherwise returns the block's full scheduled duration (clamped 1m..10h).
 */
export function getMobileBlockFocusSeconds(
  block: Pick<ScheduleBlock, 'dayIndex' | 'startMin' | 'durationMin'>,
  nowAbsMin: number,
  nowSecondOffset = 0
): { seconds: number; minutes: number; isInProgress: boolean } {
  const startAbs = block.dayIndex * 1440 + block.startMin;
  const endAbs = startAbs + block.durationMin;
  const isInProgress = nowAbsMin >= startAbs && nowAbsMin < endAbs;
  if (isInProgress) {
    const remainingSec = Math.max(0, (endAbs - nowAbsMin) * 60 - Math.max(0, Math.min(59, Math.floor(nowSecondOffset))));
    const clampedSec = clampFocusSeconds(remainingSec);
    return {
      seconds: clampedSec,
      minutes: Math.max(1, Math.ceil(clampedSec / 60)),
      isInProgress: true,
    };
  }
  const clampedMin = clampFocusMinutes(block.durationMin);
  return {
    seconds: clampedMin * 60,
    minutes: clampedMin,
    isInProgress: false,
  };
}

/**
 * Advances the Web/Desktop focus timer by `seconds`.
 * - During a break: decrements break countdown without touching focus `elapsedSeconds`.
 *   When a mid-session break ends (`00:00`), restores `pausedFocus` in PAUSED (`running: false`)
 *   state so focus NEVER auto-starts without explicit user action.
 * - During focus: Custom/Countdown continue into overtime; Pomodoro completes its cycle at zero.
 *   Stopwatch keeps its existing 10-hour limit.
 */
export function advanceFocusTimerState(timer: FocusTimerState, seconds: number): FocusTimerState {
  if (!timer.running || seconds <= 0) return timer;

  if (timer.phase === 'break') {
    if (seconds >= timer.secondsLeft) {
      if (timer.pausedFocus) {
        return {
          ...timer,
          phase: 'focus',
          mode: timer.pausedFocus.mode,
          secondsLeft: timer.pausedFocus.secondsLeft,
          totalSeconds: timer.pausedFocus.totalSeconds,
          elapsedSeconds: timer.pausedFocus.elapsedSeconds,
          pausedFocus: undefined,
          running: false,
          completionModalOpen: false,
        };
      }
      return {
        ...timer,
        phase: 'focus',
        secondsLeft: timer.mode === 'Stopwatch' ? 0 : timer.totalSeconds,
        running: false,
        completionModalOpen: false,
      };
    }
    return {
      ...timer,
      secondsLeft: timer.secondsLeft - seconds,
    };
  }

  if (timer.mode === 'Stopwatch') {
    const nextElapsed = Math.min(MAX_FOCUS_SECONDS, timer.elapsedSeconds + seconds);
    if (nextElapsed >= MAX_FOCUS_SECONDS) {
      return {
        ...timer,
        elapsedSeconds: MAX_FOCUS_SECONDS,
        running: false,
        completionModalOpen: true,
        lastCompletedMinutes: MAX_FOCUS_MINUTES,
      };
    }
    return { ...timer, elapsedSeconds: nextElapsed };
  }

  if (timer.mode === 'Custom' || timer.mode === 'Countdown') {
    return { ...timer, secondsLeft: Math.max(0, timer.secondsLeft - seconds), elapsedSeconds: timer.elapsedSeconds + seconds };
  }

  if (seconds >= timer.secondsLeft) {
    return {
      ...timer,
      secondsLeft: 0,
      elapsedSeconds: timer.elapsedSeconds + timer.secondsLeft,
      running: false,
      completionModalOpen: true,
      lastCompletedMinutes: Math.max(1, Math.round((timer.elapsedSeconds + timer.secondsLeft) / 60)),
    };
  }
  return {
    ...timer,
    secondsLeft: timer.secondsLeft - seconds,
    elapsedSeconds: timer.elapsedSeconds + seconds,
  };
}

/**
 * Takes a break from an active (running or paused) focus session WITHOUT ending it.
 * Pauses and snapshots the current focus state into `pausedFocus` and enters `phase: 'break'`.
 */
export function takeFocusBreakState(timer: FocusTimerState, breakMinutes = DEFAULT_BREAK_MINUTES): FocusTimerState {
  if (timer.phase !== 'focus') return timer;
  const hasActiveSession = timer.running || timer.elapsedSeconds > 0;
  if (!hasActiveSession) return timer;
  const clampedBreakMin = clampBreakMinutes(breakMinutes);
  const breakSec = clampedBreakMin * 60;
  return {
    ...timer,
    phase: 'break',
    running: true,
    pausedFocus: {
      mode: timer.mode,
      secondsLeft: timer.secondsLeft,
      totalSeconds: timer.totalSeconds,
      elapsedSeconds: timer.elapsedSeconds,
    },
    breakDurationMin: clampedBreakMin,
    totalSeconds: breakSec,
    secondsLeft: breakSec,
    completionModalOpen: false,
  };
}

/**
 * Ends an active or paused break and returns to the focus session in PAUSED (`running: false`) state.
 * Never auto-starts focus unless the user explicitly clicks Resume / Start.
 */
export function endFocusBreakState(timer: FocusTimerState, fallbackFocusSeconds?: number): FocusTimerState {
  if (timer.phase !== 'break') return timer;
  if (timer.pausedFocus) {
    return {
      ...timer,
      phase: 'focus',
      mode: timer.pausedFocus.mode,
      secondsLeft: timer.pausedFocus.secondsLeft,
      totalSeconds: timer.pausedFocus.totalSeconds,
      elapsedSeconds: timer.pausedFocus.elapsedSeconds,
      pausedFocus: undefined,
      running: false,
      completionModalOpen: false,
    };
  }
  const nextTotal = clampFocusSeconds(fallbackFocusSeconds ?? 25 * 60);
  return {
    ...timer,
    phase: 'focus',
    running: false,
    totalSeconds: nextTotal,
    secondsLeft: timer.mode === 'Stopwatch' ? 0 : nextTotal,
    elapsedSeconds: 0,
    completionModalOpen: false,
  };
}

export interface PendingSessionPrompt {
  occurrenceKey: string;
  session: StudySession;
  remainingSeconds: number;
}

/**
 * Detects when a scheduled study session is currently active while the user is running
 * (or paused mid-way through) a different timer (Pomodoro, Custom, or another session).
 * Deduplicates alerts per occurrenceKey (`sessionId@date`).
 */
export function detectPlannedSessionInterruption(params: {
  sessions: StudySession[];
  timer: Pick<FocusTimerState, 'running' | 'elapsedSeconds' | 'pausedFocus' | 'calendarSessionId' | 'phase'>;
  now?: Date;
  alertedKeys: ReadonlySet<string>;
}): PendingSessionPrompt | null {
  const { sessions, timer, now = new Date(), alertedKeys } = params;
  const isEngaged = timer.running || timer.elapsedSeconds > 0 || Boolean(timer.pausedFocus);
  if (!isEngaged) return null;

  const active = currentStudySessionRemaining(sessions, now);
  if (!active) return null;
  if (timer.calendarSessionId === active.session.id) return null;

  const occurrenceKey = `${active.session.id}@${active.session.date}`;
  if (alertedKeys.has(occurrenceKey)) return null;

  return {
    occurrenceKey,
    session: active.session,
    remainingSeconds: active.remainingSeconds,
  };
}

/**
 * Returns whole elapsed minutes on the outgoing timer to log when switching to a newly started session.
 * Returns 0 if less than 1 full minute has elapsed.
 */
export function computeSwitchElapsedMinutes(
  timer: Pick<FocusTimerState, 'elapsedSeconds' | 'pausedFocus'>
): number {
  const effectiveSec = timer.pausedFocus ? timer.pausedFocus.elapsedSeconds : timer.elapsedSeconds;
  return Math.floor(Math.max(0, effectiveSec) / 60);
}

export interface MobilePendingSessionPrompt {
  occurrenceKey: string;
  block: ScheduleBlock;
  remainingSeconds: number;
}

/**
 * Detects when a scheduled mobile study block becomes active while a different focus timer
 * is running or paused on the mobile companion.
 */
export function detectMobilePlannedSessionInterruption(params: {
  blocks: ScheduleBlock[];
  focus: { phase: string; sessionId: string };
  nowAbsMin: number;
  nowSecondOffset?: number;
  alertedKeys: ReadonlySet<string>;
}): MobilePendingSessionPrompt | null {
  const { blocks, focus, nowAbsMin, nowSecondOffset = 0, alertedKeys } = params;
  const isEngaged =
    focus.phase === 'focus' ||
    focus.phase === 'paused' ||
    focus.phase === 'break' ||
    focus.phase === 'break_paused';
  if (!isEngaged) return null;

  const activeBlock = blocks.find((b) => {
    if (b.type !== 'study') return false;
    const startAbs = b.dayIndex * 1440 + b.startMin;
    return nowAbsMin >= startAbs && nowAbsMin < startAbs + b.durationMin;
  });
  if (!activeBlock) return null;
  if (focus.sessionId === activeBlock.id) return null;

  const occurrenceKey = `${activeBlock.id}@${activeBlock.dayIndex}:${activeBlock.startMin}`;
  if (alertedKeys.has(occurrenceKey)) return null;

  const remaining = getMobileBlockFocusSeconds(activeBlock, nowAbsMin, nowSecondOffset);
  return {
    occurrenceKey,
    block: activeBlock,
    remainingSeconds: remaining.seconds,
  };
}

