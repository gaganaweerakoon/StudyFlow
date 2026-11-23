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
