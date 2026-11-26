import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { FocusHistoryItem, StudySession } from '../types/studyflow';
import { studyChart } from './workspaceMetrics';

test('subject progress credits independent focus and counts linked focus only once', () => {
  const block: StudySession = {
    id: 'lesson', title: 'Chemistry practice', subjectId: 'chemistry',
    date: '2026-11-23', dayIndex: 0, startHour: 23, durationHours: 2, status: 'completed',
  };
  const log: FocusHistoryItem = {
    id: 'linked', calendarSessionId: block.id, subjectId: block.subjectId, taskTitle: block.title,
    completedAt: '2026-11-23', durationMinutes: 60, mode: 'Pomodoro', qualityRating: 5,
  };
  const independent = { ...log, id: 'independent', calendarSessionId: null, durationMinutes: 30 };
  const personalBlock = { ...block, id: 'personal', countsTowardStudy: false };
  const options = { creditCompletedBlocks: true, date: new Date(2026, 10, 23) };
  const week = studyChart('weekly', [block, personalBlock], [log, independent], options);
  assert.deepEqual(week.slice(0, 2).map(day => day.planned), [1, 1]);
  assert.equal(week.reduce((total, day) => total + day.actual, 0), 2.5);
  const legacyWeek = studyChart('weekly', [block], [{ ...log, calendarSessionId: undefined }], options);
  assert.equal(legacyWeek.reduce((total, day) => total + day.actual, 0), 2);
});

test('planned targets use calendar minutes, not manual preferences, and split overnight blocks', async () => {
  const { plannedStudyHours, plannedProgress } = await import('./workspaceMetrics');
  const monday = new Date(2026, 10, 23, 12);
  const tuesday = new Date(2026, 10, 24, 12);
  const base: StudySession = { id: 'chem', title: 'Chemistry class', subjectId: 'chem', date: '2026-11-23', dayIndex: 0, startHour: 9, durationHours: 1.5, status: 'completed' };
  const physics: StudySession = { ...base, id: 'phys', subjectId: 'phys', startHour: 12, durationHours: 2, status: 'missed' };
  const free: StudySession = { ...base, id: 'free', blockType: 'free', durationHours: 1 };
  const disabled: StudySession = { ...base, id: 'disabled', countsTowardStudy: false };
  const sleep: StudySession = { ...base, id: 'sleep', blockType: 'sleep', durationHours: 8 };
  const overnight: StudySession = { ...base, id: 'night', startHour: 23, durationHours: 2 };
  assert.equal(plannedStudyHours([base, physics, free, disabled, sleep, base], 'daily', monday), 3.5);
  assert.equal(plannedStudyHours([overnight], 'daily', monday), 1);
  assert.equal(plannedStudyHours([overnight], 'daily', tuesday), 1);
  assert.equal(plannedStudyHours([base, physics, overnight], 'weekly', tuesday, 'chem'), 3.5);
  assert.equal(plannedStudyHours([base, physics, overnight], 'weekly', tuesday, 'phys'), 2);
  assert.equal(plannedStudyHours([base], 'daily', tuesday), 0);
  assert.equal(plannedStudyHours([{ ...base, date: '2026-11-24', durationHours: 2 }], 'daily', tuesday), 2);
  assert.equal(plannedProgress(1, 0), 0);
  assert.equal(plannedProgress(4, 3.5), 100);
});


test('planner projection includes distant months without removing current month or duplicating dates', async () => {
  const { calendarProjectionDates } = await import('./calendarLayout');
  const dates = calendarProjectionDates('2026-11-26', '2027-03-01');
  assert.ok(dates.includes('2026-11-26'));
  assert.ok(dates.includes('2027-02-28'));
  assert.ok(dates.includes('2027-03-31'));
  assert.equal(new Set(dates).size, dates.length);
  assert.equal(calendarProjectionDates('2026-11-26', '2026-11-26').length, 68);
});
