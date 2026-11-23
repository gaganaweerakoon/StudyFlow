import type { useApp } from '../context/AppContext';

type Workspace = ReturnType<typeof useApp>;
export type WorkspacePage = Workspace['route'];

export function localDay(date = new Date()) {
  const two = (part: number) => String(part).padStart(2, '0');
  return `${date.getFullYear()}-${two(date.getMonth() + 1)}-${two(date.getDate())}`;
}

function clip(text: string, length = 110) {
  return text.trim().replace(/\s+/g, ' ').slice(0, length);
}

export function validTimeZone(zone: unknown): zone is string {
  if (typeof zone !== 'string' || !zone || zone.length > 80) return false;
  try { new Intl.DateTimeFormat('en', { timeZone: zone }); return true; } catch { return false; }
}

export function requestClock(timezone = '', now = new Date()) {
  const timeZone = timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit',
    minute: '2-digit', hourCycle: 'h23', timeZoneName: 'longOffset',
  }).formatToParts(now).map(({ type, value }) => [type, value]));
  const date = `${parts.year}-${parts.month}-${parts.day}`;
  const time = `${parts.hour}:${parts.minute}`;
  return { date, time, label: `${date} ${time} (${timeZone}, ${parts.timeZoneName})` };
}

const ignored = new Set('the for this that from with what when which and please about show today tomorrow next current schedule calendar session event tasks task notes note focus exam exams create update delete generate practice flashcards goals goal subject subjects'.split(' '));

export function workspaceContext(app: Workspace, page: WorkspacePage, prompt: string, clock = requestClock()) {
  const lower = prompt.toLocaleLowerCase().trim();
  if (!lower || /^(?:hi|hello|hey|thanks|thank you|good morning|good evening)(?: pip)?[!.? ]*$/.test(lower)) {
    return { label: 'No workspace records', text: '' };
  }
  const terms = [...new Set(lower.match(/[\p{L}\p{M}\p{N}]{3,}/gu) ?? [])].filter(term => !ignored.has(term));
  const exact = (title: string) => title.length > 2 && lower.includes(title.toLocaleLowerCase());
  const relevance = (title: string) => exact(title) ? 100 : terms.reduce((total, term) => total + Number(title.toLocaleLowerCase().includes(term)), 0);
  function best<T>(rows: T[], name: (row: T) => string, fallback = false, limit = 4) {
    return rows.map(row => ({ row, score: relevance(name(row)) }))
      .filter(item => item.score || fallback)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit).map(item => item.row);
  }
  const sections: { name: string; rows: unknown[] }[] = [];
  const add = (name: string, rows: unknown[]) => { if (rows.length) sections.push({ name, rows }); };

  const asksCalendar = /\b(calendar|schedule|session|event|class|study block|sleep block|what.s next|what.s on|upcoming)\b/i.test(lower)
    || /කාලසටහන|සැසිය/.test(lower);
  if (asksCalendar) {
    const [hour, minute] = clock.time.split(':').map(Number);
    const target = hour + minute / 60;
    const chronological = [...app.sessions].sort((a, b) => a.date.localeCompare(b.date) || a.startHour - b.startHour);
    const nextDay = (offset: number) => {
      const day = new Date(clock.date + 'T00:00:00Z');
      day.setUTCDate(day.getUTCDate() + offset);
      return day.toISOString().slice(0, 10);
    };
    const tonight = lower.includes('tomorrow') ? nextDay(1) : clock.date;
    const upcoming = chronological.filter(session => session.date >= tonight && (
      session.date !== clock.date || !/\b(next|upcoming|now)\b/.test(lower) || session.startHour + session.durationHours > target
    ));
    const activeOvernight = chronological.filter(session => session.date === nextDay(-1)
      && session.startHour + session.durationHours > 24 + target);
    const matching = best(chronological.filter(session => session.date >= nextDay(-1)), row => row.title);
    const current = lower.includes('tomorrow') ? [] : activeOvernight;
    const relevant = [...new Map([...matching, ...current, ...upcoming.slice(0, 4)].map(row => [row.id, row])).values()].slice(0, 6);
    add('Calendar', relevant.map(({ id, title, date, startHour, durationHours, blockType, recurring, subjectId }) =>
      ({ id, title: clip(title, 120), date, startHour, durationHours, blockType, recurring, subjectId })));
  }

  if (/\b(task|tasks|to-do|todo|assignment|deadline)\b/.test(lower)) {
    add('Tasks', best(app.tasks, row => row.title, true).map(({ id, title, status, dueDate }) => ({ id, title: clip(title), status, dueDate })));
  }
  if (/\b(exam|exams|final|midterm)\b/.test(lower)) {
    add('Exams', best(app.exams, row => row.title, true).map(({ id, title, date, time }) => ({ id, title: clip(title), date, time })));
  }
  if (/\b(goals?|targets?)\b/.test(lower)) {
    add('Goals', best(app.goals, row => row.title, true).map(({ id, title }) => ({ id, title: clip(title) })));
  }
  const asksNote = /\b(notes?|flashcards?|quiz|practice tests?|selected section|syllabus)\b/.test(lower) || /සටහන/.test(lower);
  if (asksNote) {
    const selected = page === 'notes' ? app.notes.find(note => note.id === app.selectedNoteId) : undefined;
    const notes = best(app.notes.filter(note => note.id !== selected?.id), row => row.title, false, 2);
    if (selected) notes.unshift(selected);
    add('Notes', notes.map(note => ({
      id: note.id, title: clip(note.title), subjectId: note.subjectId,
      content: note.content.slice(0, 1600) || note.pdf?.pages?.slice(0, 2).map(part => part.text.slice(0, 800)).join('\n'),
    })));
  }
  if (/\b(flashcards?|decks?)\b/.test(lower)) {
    add('Decks', best(app.decks, row => row.title, true).map(({ id, title }) => ({ id, title: clip(title) })));
  }
  add('Subjects', best(app.subjects, row => row.name, /\bsubjects?\b/.test(lower)).map(({ id, name, code }) => ({ id, name: clip(name), code })));
  if (/\b(focus|pomodoro|timer)\b/.test(lower) && app.focusTimer.running) {
    const { taskTitle, mode, secondsLeft } = app.focusTimer;
    add('Active focus', [{ title: clip(taskTitle), mode, secondsLeft }]);
  }
  const text = sections.map(({ name, rows }) => `${name}:
${rows.map(row => JSON.stringify(row)).join('\n')}`).join('\n');
  const tokens = Math.ceil(new TextEncoder().encode(text).length / 4);
  return { label: sections.length ? `${sections.map(section => section.name).join(', ')} · ~${tokens} tokens` : 'No workspace records', text };
}
