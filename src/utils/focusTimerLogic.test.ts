import assert from 'node:assert/strict';
import test from 'node:test';
import type { FocusTimerState } from '../context/AppContext';
import type { CompanionFocusState } from '../mobile/types';
import type { StudySession } from '../types/studyflow';
import { formatCountdownMMSS } from '../mobile/companionLogic';
import { phoneRecord } from '../companion/offlineFocus';
import { INITIAL_SESSIONS, INITIAL_TASKS } from '../data/mockData';
import type { ScheduleBlock } from '../mobile/types';
import {
  advanceFocusTimerState,
  clampFocusHoursMinutes,
  computeSwitchElapsedMinutes,
  currentStudySessionRemaining,
  detectMobilePlannedSessionInterruption,
  detectPlannedSessionInterruption,
  endFocusBreakState,
  formatHoursMinutesCompact,
  getMobileBlockFocusSeconds,
  MAX_FOCUS_MINUTES,
  MAX_FOCUS_SECONDS,
  takeFocusBreakState,
} from './focusTimerLogic';

const BASE_TIMER: FocusTimerState = {
  mode: 'Custom',
  phase: 'focus',
  secondsLeft: 3600,
  totalSeconds: 5400,
  elapsedSeconds: 1800,
  running: true,
  subjectId: 'cs340',
  taskTitle: 'Algorithms Practice',
  calendarSessionId: 'ses-1',
  cycleCount: 1,
  miniVisible: false,
  completionModalOpen: false,
  lastCompletedMinutes: 25,
};

test('clampFocusHoursMinutes enforces 1 min floor and 10h (600 min) ceiling', () => {
  assert.deepEqual(clampFocusHoursMinutes(0, 0), {
    hours: 0,
    minutes: 1,
    totalMinutes: 1,
    totalSeconds: 60,
  });
  assert.deepEqual(clampFocusHoursMinutes(2, 35), {
    hours: 2,
    minutes: 35,
    totalMinutes: 155,
    totalSeconds: 9300,
  });
  assert.deepEqual(clampFocusHoursMinutes(10, 45), {
    hours: 10,
    minutes: 0,
    totalMinutes: MAX_FOCUS_MINUTES,
    totalSeconds: MAX_FOCUS_SECONDS,
  });
  assert.deepEqual(clampFocusHoursMinutes(14, 15), {
    hours: 10,
    minutes: 0,
    totalMinutes: 600,
    totalSeconds: 36000,
  });
});

test('currentStudySessionRemaining returns exact remainder of active session and clamps to 10h max', () => {
  const sessions: StudySession[] = [
    {
      id: 'ses-active',
      title: 'Organic Chemistry Review',
      subjectId: 'chem210',
      dayIndex: 1,
      date: '2026-11-24',
      startHour: 9,
      durationHours: 1.5, // 09:00 - 10:30
      status: 'upcoming',
    },
    {
      id: 'ses-sleep',
      title: 'Sleep',
      subjectId: '',
      dayIndex: 1,
      date: '2026-11-24',
      startHour: 9,
      durationHours: 2,
      status: 'upcoming',
      blockType: 'sleep',
      countsTowardStudy: false,
    },
  ];

  // At 09:42:30 -> 47m 30s (2850s) left
  const mid = new Date(2026, 10, 24, 9, 42, 30, 0);
  const info = currentStudySessionRemaining(sessions, mid);
  assert.ok(info);
  assert.equal(info.session.id, 'ses-active');
  assert.equal(info.remainingSeconds, 2850);
  assert.equal(info.remainingMinutes, 48);

  // At 10:29:45 -> 15s left, clamped to 60s minimum
  const nearEnd = new Date(2026, 10, 24, 10, 29, 45, 0);
  const nearInfo = currentStudySessionRemaining(sessions, nearEnd);
  assert.ok(nearInfo);
  assert.equal(nearInfo.remainingSeconds, 60);

  // Marathon 12h session is clamped to 10h max (36000s)
  const marathon: StudySession[] = [
    {
      id: 'ses-long',
      title: 'Exam Sprint',
      subjectId: 'cs340',
      dayIndex: 1,
      date: '2026-11-24',
      startHour: 8,
      durationHours: 12,
      status: 'upcoming',
    },
  ];
  const atStart = new Date(2026, 10, 24, 8, 5, 0, 0);
  const longInfo = currentStudySessionRemaining(marathon, atStart);
  assert.ok(longInfo);
  assert.equal(longInfo.remainingSeconds, MAX_FOCUS_SECONDS);
});

test('getMobileBlockFocusSeconds uses remainder for in-progress block and full duration for upcoming block', () => {
  // Monday 09:00..10:30 (90 min)
  const block = { dayIndex: 0, startMin: 9 * 60, durationMin: 90 };

  // In progress at 09:35:00 -> 55 min left
  const inProgress = getMobileBlockFocusSeconds(block, 9 * 60 + 35, 0);
  assert.equal(inProgress.isInProgress, true);
  assert.equal(inProgress.seconds, 55 * 60);
  assert.equal(inProgress.minutes, 55);

  // Upcoming at 08:30 -> full 90 min
  const upcoming = getMobileBlockFocusSeconds(block, 8 * 60 + 30, 0);
  assert.equal(upcoming.isInProgress, false);
  assert.equal(upcoming.seconds, 90 * 60);
  assert.equal(upcoming.minutes, 90);

  // Long block capped at 10 hours
  const marathon = getMobileBlockFocusSeconds({ dayIndex: 0, startMin: 8 * 60, durationMin: 780 }, 8 * 60 + 10, 0);
  assert.equal(marathon.seconds, MAX_FOCUS_SECONDS);
  assert.equal(marathon.minutes, MAX_FOCUS_MINUTES);
});

test('takeFocusBreakState pauses active session without ending it, and break end restores PAUSED session without auto-starting', () => {
  const onBreak = takeFocusBreakState(BASE_TIMER, 10);
  assert.equal(onBreak.phase, 'break');
  assert.equal(onBreak.running, true);
  assert.equal(onBreak.totalSeconds, 600);
  assert.equal(onBreak.secondsLeft, 600);
  assert.deepEqual(onBreak.pausedFocus, {
    mode: 'Custom',
    secondsLeft: 3600,
    totalSeconds: 5400,
    elapsedSeconds: 1800,
  });
  assert.equal(onBreak.calendarSessionId, 'ses-1');
  assert.equal(onBreak.taskTitle, 'Algorithms Practice');

  // Tick break partway: focus elapsedSeconds stays untouched
  const midBreak = advanceFocusTimerState(onBreak, 120);
  assert.equal(midBreak.phase, 'break');
  assert.equal(midBreak.secondsLeft, 480);
  assert.equal(midBreak.pausedFocus?.elapsedSeconds, 1800);

  // Break finishes at 00:00 -> restores exact focus state in PAUSED (running: false) mode!
  const afterBreak = advanceFocusTimerState(midBreak, 480);
  assert.equal(afterBreak.phase, 'focus');
  assert.equal(afterBreak.running, false, 'Must NOT auto-start focus when break ends');
  assert.equal(afterBreak.completionModalOpen, false, 'Must NOT trigger session completion when break ends');
  assert.equal(afterBreak.secondsLeft, 3600);
  assert.equal(afterBreak.totalSeconds, 5400);
  assert.equal(afterBreak.elapsedSeconds, 1800);
  assert.equal(afterBreak.pausedFocus, undefined);

  // Returning early from a break also restores PAUSED focus without auto-starting
  const returnedEarly = endFocusBreakState(midBreak);
  assert.equal(returnedEarly.phase, 'focus');
  assert.equal(returnedEarly.running, false, 'Must NOT auto-start focus on early break return');
  assert.equal(returnedEarly.secondsLeft, 3600);
  assert.equal(returnedEarly.elapsedSeconds, 1800);
  assert.equal(returnedEarly.pausedFocus, undefined);
});

test('formatCountdownMMSS and formatHoursMinutesCompact format multi-hour durations cleanly', () => {
  assert.equal(formatCountdownMMSS(25 * 60), '25:00');
  assert.equal(formatCountdownMMSS(3600), '1:00:00');
  assert.equal(formatCountdownMMSS(10 * 3600), '10:00:00');
  assert.equal(formatHoursMinutesCompact(45 * 60), '45m');
  assert.equal(formatHoursMinutesCompact(90 * 60), '1h 30m');
  assert.equal(formatHoursMinutesCompact(10 * 3600), '10h');
});

test('offline phoneRecord preserves paused focus progress during a mid-session break', () => {
  const onBreakMobile: CompanionFocusState = {
    localRunId: 'phone-12345678-1234-1234-1234-123456789012',
    startedAtMs: 1_700_000_000_000,
    sessionId: 'ses-chem',
    subjectId: 'chem210',
    customSubject: 'Chemistry',
    sessionTitle: 'Chemistry',
    phase: 'break',
    origin: 'phone',
    intervalMinutes: 90,
    breakMinutes: 5,
    totalSeconds: 300,
    secondsLeft: 210,
    elapsedActiveSeconds: 1800,
    startedAtAbsMin: 540,
    pausedFocus: {
      secondsLeft: 3600,
      totalSeconds: 5400,
      elapsedActiveSeconds: 1800,
      intervalMinutes: 90,
      startedAtAbsMin: 540,
    },
    pendingSyncWhenOnline: true,
    showFullScreen: false,
    showBreakSheet: false,
  };

  const record = phoneRecord(onBreakMobile, 'running', 1_700_001_800_000, 1_700_001_890_000);
  assert.ok(record);
  assert.equal(record.state, 'paused');
  assert.equal(record.totalSeconds, 5400);
  assert.equal(record.remainingSeconds, 3600);
  assert.equal(record.elapsedSeconds, 1800);
});

test('detectPlannedSessionInterruption prompts when Pomodoro/Custom is running and a scheduled session starts, and deduplicates alerts', () => {
  const sessions: StudySession[] = [
    {
      id: 'ses-next',
      title: 'Linear Algebra Review',
      subjectId: 'math241',
      dayIndex: 1,
      date: '2026-11-24',
      startHour: 11,
      durationHours: 1.5,
      status: 'upcoming',
    },
  ];
  const now = new Date(2026, 10, 24, 11, 2, 0, 0); // 11:02 -> 88 min left
  const alerted = new Set<string>();

  // Idle timer -> no interruption prompt
  const idleTimer: FocusTimerState = {
    ...BASE_TIMER,
    running: false,
    elapsedSeconds: 0,
    pausedFocus: undefined,
    calendarSessionId: null,
  };
  assert.equal(
    detectPlannedSessionInterruption({ sessions, timer: idleTimer, now, alertedKeys: alerted }),
    null
  );

  // Running Pomodoro -> detects newly started scheduled session
  const pomodoroTimer: FocusTimerState = {
    ...BASE_TIMER,
    mode: 'Pomodoro',
    running: true,
    elapsedSeconds: 420,
    calendarSessionId: null,
  };
  const prompt = detectPlannedSessionInterruption({ sessions, timer: pomodoroTimer, now, alertedKeys: alerted });
  assert.ok(prompt);
  assert.equal(prompt.session.id, 'ses-next');
  assert.equal(prompt.occurrenceKey, 'ses-next@2026-11-24');
  assert.equal(prompt.remainingSeconds, 88 * 60);

  // Already running that exact session -> no prompt
  const sameSessionTimer: FocusTimerState = {
    ...pomodoroTimer,
    calendarSessionId: 'ses-next',
  };
  assert.equal(
    detectPlannedSessionInterruption({ sessions, timer: sameSessionTimer, now, alertedKeys: alerted }),
    null
  );

  // Deduplication once alerted
  alerted.add(prompt.occurrenceKey);
  assert.equal(
    detectPlannedSessionInterruption({ sessions, timer: pomodoroTimer, now, alertedKeys: alerted }),
    null
  );
});

test('computeSwitchElapsedMinutes logs whole elapsed minutes from active or mid-break paused focus', () => {
  assert.equal(computeSwitchElapsedMinutes({ elapsedSeconds: 59 }), 0);
  assert.equal(computeSwitchElapsedMinutes({ elapsedSeconds: 60 }), 1);
  assert.equal(computeSwitchElapsedMinutes({ elapsedSeconds: 745 }), 12);
  assert.equal(
    computeSwitchElapsedMinutes({
      elapsedSeconds: 0,
      pausedFocus: { mode: 'Pomodoro', secondsLeft: 900, totalSeconds: 1500, elapsedSeconds: 600 },
    }),
    10
  );
});

test('detectMobilePlannedSessionInterruption detects starting mobile study block while Custom/Pomodoro is running', () => {
  const blocks: ScheduleBlock[] = [
    {
      id: 'blk-math',
      revision: 1,
      type: 'study',
      title: 'Calculus Drill',
      subjectId: 'math241',
      dayIndex: 1,
      startMin: 11 * 60,
      durationMin: 60,
      advanceNoticeMin: 15,
      ringAtStart: true,
      focusIntervalMin: 25,
      remindAtBedtime: false,
      wakeAtEnd: false,
    },
  ];
  const alerted = new Set<string>();
  const nowAbsMin = 1 * 1440 + 11 * 60 + 5; // Tue 11:05 -> 55 min left

  const prompt = detectMobilePlannedSessionInterruption({
    blocks,
    focus: { phase: 'focus', sessionId: 'phone-custom-1' },
    nowAbsMin,
    nowSecondOffset: 0,
    alertedKeys: alerted,
  });
  assert.ok(prompt);
  assert.equal(prompt.block.id, 'blk-math');
  assert.equal(prompt.remainingSeconds, 55 * 60);

  // Already running blk-math -> no prompt
  assert.equal(
    detectMobilePlannedSessionInterruption({
      blocks,
      focus: { phase: 'focus', sessionId: 'blk-math' },
      nowAbsMin,
      nowSecondOffset: 0,
      alertedKeys: alerted,
    }),
    null
  );
});

test('starter schedule and tasks anchor dynamically to today real local date', () => {
  const now = new Date();
  const todayIso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  assert.ok(
    INITIAL_SESSIONS.some((s) => s.date === todayIso),
    `Expected INITIAL_SESSIONS to contain sessions anchored to today (${todayIso})`
  );
  assert.ok(
    INITIAL_TASKS.some((t) => t.dueDate === todayIso),
    `Expected INITIAL_TASKS to contain tasks anchored to today (${todayIso})`
  );
});

