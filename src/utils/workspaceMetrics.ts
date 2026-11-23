import { localDay } from '../assistant/workspaceContext';
import type { FocusHistoryItem, StudySession } from '../types/studyflow';

import { layoutCalendarDay } from './calendarLayout';

export type StudyRange = 'daily' | 'weekly' | 'monthly';

function loggedHoursByBlock(sessions: StudySession[], history: FocusHistoryItem[]) {
  const hours = new Map<string, number>();
  const byId = new Map(sessions.map(session => [session.id, session]));
  for (const log of history) {
    let block = log.calendarSessionId ? byId.get(log.calendarSessionId) : undefined;
    if (log.calendarSessionId === undefined && log.taskTitle.trim()) {
      const day = log.completedAt.slice(0, 10);
      const matching = layoutCalendarDay(sessions, day)
        .map(entry => entry.session)
        .filter(session => session.subjectId === log.subjectId && session.title.trim() === log.taskTitle.trim());
      // Older records had no block ID. Reconcile only when the subject, title, and day identify one block.
      if (matching.length === 1) block = matching[0];
    }
    if (block?.status !== 'completed' || block.subjectId !== log.subjectId) continue;
    hours.set(block.id, (hours.get(block.id) ?? 0) + log.durationMinutes / 60);
  }
  return hours;
}

export function studyChart(range: StudyRange, sessions: StudySession[], history: FocusHistoryItem[], options: { creditCompletedBlocks?: boolean; date?: Date } = {}) {
  const today = new Date(options.date ?? new Date());
  const logged = options.creditCompletedBlocks ? loggedHoursByBlock(sessions, history) : undefined;
  today.setHours(12, 0, 0, 0);
  if (range === 'weekly') today.setDate(today.getDate() - (today.getDay() + 6) % 7);
  if (range === 'monthly') today.setDate(1);
  const groups = range === 'daily' ? 1 : range === 'weekly' ? 7 : Math.ceil(new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate() / 7);
  return Array.from({ length: groups }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() + index * (range === 'monthly' ? 7 : 1));
    const from = localDay(date);
    const label = range === 'monthly' ? `Wk ${index + 1}`
      : date.toLocaleDateString(undefined, { weekday: 'short' });
    date.setDate(date.getDate() + (range === 'monthly' ? 7 : 1));
    const until = range === 'monthly' && date.getMonth() !== today.getMonth()
      ? localDay(new Date(today.getFullYear(), today.getMonth() + 1, 1)) : localDay(date);
    const inRange = (day: string) => day >= from && day < until;
    let planned = 0;
    let completed = 0;
    const cursor = new Date(from + 'T12:00:00');
    while (localDay(cursor) < until) {
      for (const block of layoutCalendarDay(sessions, localDay(cursor))) {
        if (block.session.countsTowardStudy === false || block.session.blockType === 'sleep' || block.session.blockType === 'free') continue;
        const hours = block.to - block.from;
        planned += hours;
        if (logged && block.session.status === 'completed') {
          // Distribute any unlogged portion across the block's days, including overnight blocks.
          const duration = block.session.durationHours;
          completed += hours * Math.max(0, 1 - (logged.get(block.session.id) ?? 0) / duration);
        }
      }
      cursor.setDate(cursor.getDate() + 1);
    }
    const actual = history.filter(item => inRange(item.completedAt.slice(0, 10)))
      .reduce((sum, item) => sum + item.durationMinutes / 60, 0);
    return { label, planned: +planned.toFixed(2), actual: +(actual + completed).toFixed(2) };
  });
}
