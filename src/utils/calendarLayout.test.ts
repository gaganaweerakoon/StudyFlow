import test from 'node:test';
import assert from 'node:assert/strict';
import type { StudySession } from '../types/studyflow';
import { computeAdaptiveHourHeight, layoutCalendarDay } from './calendarLayout';

function makeSession(overrides: Partial<StudySession> & { id: string; date: string; startHour: number; durationHours: number }): StudySession {
  return {
    title: 'Study Session',
    subjectId: 'sub-1',
    dayIndex: 0,
    status: 'upcoming',
    blockType: 'study',
    countsTowardStudy: true,
    ...overrides,
  };
}

test('computeAdaptiveHourHeight returns balanced default for an empty week', () => {
  const result = computeAdaptiveHourHeight([[], [], [], [], [], [], []]);
  assert.equal(result.hourHeight, 56);
  assert.equal(result.densityLabel, 'Balanced');
  assert.equal(result.stats.sessionCount, 0);
});

test('longer and fewer sessions produce a compact shorter calendar height', () => {
  const dates = ['2026-11-23', '2026-11-24', '2026-11-25', '2026-11-26', '2026-11-27'];
  const sessions: StudySession[] = [
    makeSession({ id: 's1', date: dates[0], startHour: 9, durationHours: 3.5 }),
    makeSession({ id: 's2', date: dates[2], startHour: 10, durationHours: 4 }),
    makeSession({ id: 's3', date: dates[4], startHour: 13, durationHours: 3 }),
  ];

  const groups = dates.map((d) =>
    layoutCalendarDay(sessions, d).map((b) => ({
      from: b.from,
      to: b.to,
      columns: b.columns,
    })),
  );
  const result = computeAdaptiveHourHeight(groups);

  assert.equal(result.densityLabel, 'Compact');
  assert.ok(result.hourHeight <= 42, `expected compact height <= 42, got ${result.hourHeight}`);
  assert.ok(result.hourHeight >= 34);
});

test('many shorter sessions in a day expand the calendar height', () => {
  const date = '2026-11-25';
  const sessions: StudySession[] = [
    makeSession({ id: 'd1', date, startHour: 8, durationHours: 0.5 }),
    makeSession({ id: 'd2', date, startHour: 9, durationHours: 0.5 }),
    makeSession({ id: 'd3', date, startHour: 10, durationHours: 0.75 }),
    makeSession({ id: 'd4', date, startHour: 11.5, durationHours: 0.5 }),
    makeSession({ id: 'd5', date, startHour: 14, durationHours: 0.5 }),
    makeSession({ id: 'd6', date, startHour: 15, durationHours: 0.75 }),
  ];

  const groups = [
    layoutCalendarDay(sessions, date).map((b) => ({
      from: b.from,
      to: b.to,
      columns: b.columns,
    })),
  ];
  const result = computeAdaptiveHourHeight(groups);

  assert.equal(result.densityLabel, 'Expanded');
  assert.ok(result.hourHeight >= 76, `expected expanded height >= 76, got ${result.hourHeight}`);
  assert.ok(result.hourHeight <= 96);
});

test('same-time overlapping sessions boost height compared to sequential sessions of equal duration', () => {
  const date = '2026-11-25';
  const sequential = [
    makeSession({ id: 'a1', date, startHour: 9, durationHours: 1 }),
    makeSession({ id: 'a2', date, startHour: 11, durationHours: 1 }),
  ];
  const overlapping = [
    makeSession({ id: 'b1', date, startHour: 9, durationHours: 1 }),
    makeSession({ id: 'b2', date, startHour: 9, durationHours: 1 }),
  ];

  const seqResult = computeAdaptiveHourHeight([
    layoutCalendarDay(sequential, date).map((b) => ({ from: b.from, to: b.to, columns: b.columns })),
  ]);
  const overlapResult = computeAdaptiveHourHeight([
    layoutCalendarDay(overlapping, date).map((b) => ({ from: b.from, to: b.to, columns: b.columns })),
  ]);

  assert.equal(overlapResult.stats.maxConcurrent, 2);
  assert.ok(
    overlapResult.hourHeight > seqResult.hourHeight,
    `expected overlapping (${overlapResult.hourHeight}) > sequential (${seqResult.hourHeight})`,
  );
});

test('aligned same-time long sessions across the week are recognized and stay compact', () => {
  const dates = ['2026-11-23', '2026-11-24', '2026-11-25', '2026-11-26', '2026-11-27'];
  const sessions = dates.map((date, i) =>
    makeSession({ id: `rec-${i}`, date, startHour: 9, durationHours: 2.5 }),
  );

  const groups = dates.map((d) =>
    layoutCalendarDay(sessions, d).map((b) => ({ from: b.from, to: b.to, columns: b.columns })),
  );
  const result = computeAdaptiveHourHeight(groups);

  assert.equal(result.stats.sameTimeSlotGroups, 1);
  assert.equal(result.stats.maxDailySessions, 1);
  assert.equal(result.densityLabel, 'Compact');
  assert.ok(result.hourHeight <= 42, `expected aligned 2.5h week <= 42, got ${result.hourHeight}`);
});

test('long background sleep blocks do not shrink height when paired with short daytime study blocks', () => {
  const date = '2026-11-25';
  const blocks = [
    { from: 0, to: 7, columns: 1, isBackground: true },
    { from: 9, to: 9.5, columns: 1, isBackground: false },
    { from: 10, to: 10.5, columns: 1, isBackground: false },
    { from: 11, to: 11.5, columns: 1, isBackground: false },
    { from: 14, to: 14.5, columns: 1, isBackground: false },
    { from: 15, to: 15.5, columns: 1, isBackground: false },
  ];

  const result = computeAdaptiveHourHeight([blocks]);
  assert.equal(result.densityLabel, 'Expanded');
  assert.ok(result.hourHeight >= 76, `expected short daytime sessions to expand >= 76, got ${result.hourHeight}`);

  // When only sleep blocks exist, fall back to background blocks -> Compact
  const sleepOnly = computeAdaptiveHourHeight([[{ from: 0, to: 8, columns: 1, isBackground: true }]]);
  assert.equal(sleepOnly.densityLabel, 'Compact');
  assert.ok(sleepOnly.hourHeight <= 40);
});

test('formatSessionDurationCompact formats fractional hours cleanly for toasts', async () => {
  const { formatSessionDurationCompact } = await import('./calendarLayout');
  assert.equal(formatSessionDurationCompact(0.5), '30m');
  assert.equal(formatSessionDurationCompact(1), '1h');
  assert.equal(formatSessionDurationCompact(1.5), '1h 30m');
  assert.equal(formatSessionDurationCompact(5.75), '5h 45m');
});

