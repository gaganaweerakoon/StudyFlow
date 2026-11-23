import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildAlertSchedule,
  calculateDailyStudyMinutes,
  findExactAlertAtTime,
  getTimelineSegmentsForDay,
  getWakeUpReadiness,
  resolveTodayStudyView,
  toAbsMin,
} from './companionLogic.ts';
import { COMPANION_SUBJECTS, INITIAL_SCHEDULE_BLOCKS } from './sampleData.ts';

test('rescheduling Chemistry from 7:30 AM to 8:00 AM cancels old alerts and moves them to 7:45 AM and 8:00 AM', () => {
  const initialAlerts = buildAlertSchedule(INITIAL_SCHEDULE_BLOCKS, COMPANION_SUBJECTS, null);
  const oldHeadsUp = findExactAlertAtTime(initialAlerts, toAbsMin(0, 7 * 60 + 15), new Set());
  const oldStartAlarm = findExactAlertAtTime(initialAlerts, toAbsMin(0, 7 * 60 + 30), new Set());
  assert.equal(oldHeadsUp?.kind, 'study_headsup');
  assert.equal(oldStartAlarm?.kind, 'study_start_alarm');

  const movedBlocks = INITIAL_SCHEDULE_BLOCKS.map((b) =>
    b.id === 'blk-chem-mon' ? { ...b, startMin: 8 * 60, revision: b.revision + 1 } : b
  );
  const nextAlerts = buildAlertSchedule(movedBlocks, COMPANION_SUBJECTS, null);

  // Old 7:15 AM and 7:30 AM alerts are gone
  assert.equal(findExactAlertAtTime(nextAlerts, toAbsMin(0, 7 * 60 + 15), new Set()), null);
  assert.equal(findExactAlertAtTime(nextAlerts, toAbsMin(0, 7 * 60 + 30), new Set()), null);

  // New 7:45 AM heads-up and 8:00 AM start alarm exist with bumped revision IDs
  const newHeadsUp = findExactAlertAtTime(nextAlerts, toAbsMin(0, 7 * 60 + 45), new Set());
  const newStartAlarm = findExactAlertAtTime(nextAlerts, toAbsMin(0, 8 * 60), new Set());
  assert.equal(newHeadsUp?.kind, 'study_headsup');
  assert.equal(newHeadsUp?.exactTimeLabel, '8:00 AM');
  assert.equal(newStartAlarm?.kind, 'study_start_alarm');
  assert.equal(newStartAlarm?.exactTimeLabel, '8:00 AM');
  assert.notEqual(newHeadsUp?.id, oldHeadsUp?.id);
});

test('cross-midnight sleep appears on both dates, has no advance alert, and schedules one wake-up at 6:30 AM next day', () => {
  const monSegments = getTimelineSegmentsForDay(INITIAL_SCHEDULE_BLOCKS, 0);
  const tueSegments = getTimelineSegmentsForDay(INITIAL_SCHEDULE_BLOCKS, 1);

  const monSleep = monSegments.find((s) => s.block.id === 'blk-sleep-mon');
  const tueSleep = tueSegments.find((s) => s.block.id === 'blk-sleep-mon');

  assert.ok(monSleep, 'Sleep block should render on Monday evening');
  assert.equal(monSleep.segmentStartMin, 23 * 60);
  assert.equal(monSleep.segmentEndMin, 24 * 60);
  assert.equal(monSleep.isCrossMidnightStart, true);

  assert.ok(tueSleep, 'Sleep block should continue onto Tuesday morning');
  assert.equal(tueSleep.segmentStartMin, 0);
  assert.equal(tueSleep.segmentEndMin, 6 * 60 + 30);
  assert.equal(tueSleep.isCrossMidnightEnd, true);

  const alerts = buildAlertSchedule(INITIAL_SCHEDULE_BLOCKS, COMPANION_SUBJECTS, null);
  const sleepAlerts = alerts.filter((a) => a.blockId === 'blk-sleep-mon');
  assert.equal(sleepAlerts.length, 2, 'Only bedtime reminder and one wake-up alarm');
  assert.equal(sleepAlerts.some((a) => a.kind === 'study_headsup'), false);

  // Confirm zero advance alert 10 or 15 min before wake-up (6:15 AM / 6:20 AM Tue)
  assert.equal(findExactAlertAtTime(alerts, toAbsMin(1, 6 * 60 + 15), new Set()), null);
  assert.equal(findExactAlertAtTime(alerts, toAbsMin(1, 6 * 60 + 20), new Set()), null);

  // Direct jump to 6:30 AM Tue surfaces ONLY the wake-up alarm (no replayed missed alerts)
  const wakeAlarm = findExactAlertAtTime(alerts, toAbsMin(1, 6 * 60 + 30), new Set());
  assert.equal(wakeAlarm?.kind, 'sleep_wakeup_alarm');
  assert.equal(wakeAlarm?.exactTimeLabel, '6:30 AM');
});

test('snoozing 6:30 AM wake-up rings once at 6:35 AM and dismissing ends it permanently', () => {
  const baseAlerts = buildAlertSchedule(INITIAL_SCHEDULE_BLOCKS, COMPANION_SUBJECTS, null);
  const originalWake = findExactAlertAtTime(baseAlerts, toAbsMin(1, 6 * 60 + 30), new Set());
  assert.ok(originalWake);

  const dismissed = new Set<string>([originalWake.id]);
  const snoozeTarget = toAbsMin(1, 6 * 60 + 35);
  const snoozedAlerts = buildAlertSchedule(INITIAL_SCHEDULE_BLOCKS, COMPANION_SUBJECTS, {
    sourceAlertId: originalWake.id,
    blockId: 'blk-sleep-mon',
    triggerAbsMin: snoozeTarget,
  });

  // Original 6:30 AM will not re-ring
  assert.equal(findExactAlertAtTime(snoozedAlerts, toAbsMin(1, 6 * 60 + 30), dismissed), null);

  // Snoozed alert rings at 6:35 AM
  const snoozeAlarm = findExactAlertAtTime(snoozedAlerts, snoozeTarget, dismissed);
  assert.equal(snoozeAlarm?.kind, 'sleep_wakeup_alarm');
  assert.equal(snoozeAlarm?.isSnoozed, true);
  assert.equal(snoozeAlarm?.exactTimeLabel, '6:35 AM');

  // Dismissing the snoozed alert ends it completely
  dismissed.add(snoozeAlarm.id);
  assert.equal(findExactAlertAtTime(snoozedAlerts, snoozeTarget, dismissed), null);
});

test('daily study total counts only study blocks and excludes sleep and free time', () => {
  // Monday has 90m Chemistry + 90m Math + 90m Algorithms = 270 min (4.5h)
  // Free time (75m + 120m) and Sleep (450m) must NOT be counted
  const monStudyMins = calculateDailyStudyMinutes(INITIAL_SCHEDULE_BLOCKS, 0);
  assert.equal(monStudyMins, 270);
});

test('Today hero view resolves upcoming, in-progress, and end-of-day states accurately', () => {
  const at715 = resolveTodayStudyView(INITIAL_SCHEDULE_BLOCKS, toAbsMin(0, 7 * 60 + 15));
  assert.equal(at715.heroSession?.id, 'blk-chem-mon');
  assert.equal(at715.heroStatus, 'upcoming');
  assert.equal(at715.heroStatusText, 'Starts in 15 min');

  const at735 = resolveTodayStudyView(INITIAL_SCHEDULE_BLOCKS, toAbsMin(0, 7 * 60 + 35));
  assert.equal(at735.heroSession?.id, 'blk-chem-mon');
  assert.equal(at735.heroStatus, 'in_progress');
  assert.equal(at735.heroStatusText, 'In progress · ends at 9:00 AM');

  const at2100 = resolveTodayStudyView(INITIAL_SCHEDULE_BLOCKS, toAbsMin(0, 21 * 60));
  assert.equal(at2100.heroSession, null);
  assert.equal(at2100.remainingSessions.length, 0);
});

test('wake-up readiness flags exact alarm blocker when permission is disabled', () => {
  const ready = getWakeUpReadiness(
    INITIAL_SCHEDULE_BLOCKS,
    toAbsMin(0, 7 * 60 + 15),
    { notifications: true, exactAlarms: true, usageAccess: true },
    null
  );
  assert.equal(ready.ready, true);
  assert.equal(ready.statusText, 'Next wake-up set for tomorrow, 6:30 AM.');

  const blocked = getWakeUpReadiness(
    INITIAL_SCHEDULE_BLOCKS,
    toAbsMin(0, 7 * 60 + 15),
    { notifications: true, exactAlarms: false, usageAccess: true },
    null
  );
  assert.equal(blocked.ready, false);
  assert.ok(blocked.blockerReason);
});
