import type { StudySession } from '../types/studyflow';

export function layoutCalendarDay(sessions: StudySession[], date: string) {
  const day = new Date(date + 'T12:00:00');
  const entries = sessions.flatMap(session => {
    const startDate = new Date(session.date + 'T12:00:00');
    const offset = (Date.UTC(day.getFullYear(), day.getMonth(), day.getDate()) -
      Date.UTC(startDate.getFullYear(), startDate.getMonth(), startDate.getDate())) / 86_400_000;
    const start = session.startHour - 24 * offset;
    const end = start + session.durationHours;
    const from = Math.max(0, start);
    const to = Math.min(24, end);
    return to > from ? [{ session, from, to, continued: start < 0, column: 0, columns: 1 }] : [];
  }).sort((a, b) => a.from - b.from || b.to - a.to);

  let group: typeof entries = [];
  let ends: number[] = [];
  const finish = () => group.forEach(entry => { entry.columns = ends.length; });
  for (const entry of entries) {
    if (ends.every(end => end <= entry.from)) {
      finish();
      group = [];
      ends = [];
    }
    const open = ends.findIndex(end => end <= entry.from);
    entry.column = open === -1 ? ends.length : open;
    ends[entry.column] = entry.to;
    group.push(entry);
  }
  finish();
  return entries;
}
