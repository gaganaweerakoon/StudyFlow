import { localDay } from '../assistant/workspaceContext';
import type { FocusHistoryItem, StudySession } from '../types/studyflow';

import { layoutCalendarDay } from './calendarLayout';

export type StudyRange = 'daily' | 'weekly' | 'monthly';

export function studyChart(range: StudyRange, sessions: StudySession[], history: FocusHistoryItem[]) {
  const today = new Date();
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
    const cursor = new Date(from + 'T12:00:00');
    while (localDay(cursor) < until) {
      for (const block of layoutCalendarDay(sessions, localDay(cursor))) {
        if (block.session.countsTowardStudy !== false) planned += block.to - block.from;
      }
      cursor.setDate(cursor.getDate() + 1);
    }
    const actual = history.filter(item => inRange(item.completedAt.slice(0, 10)))
      .reduce((sum, item) => sum + item.durationMinutes / 60, 0);
    return { label, planned: +planned.toFixed(2), actual: +actual.toFixed(2) };
  });
}
