import type { useApp } from '../context/AppContext';
import { CHAT_LIMITS } from './protocol';

type Workspace = ReturnType<typeof useApp>;
export type WorkspacePage = Workspace['route'];

const labels: Record<WorkspacePage, string> = {
  dashboard: 'Dashboard', planner: 'Planner', focus: 'Focus timer', tasks: 'Tasks',
  goals: 'Goals', subjects: 'Subjects', notes: 'Notes', flashcards: 'Flashcards',
  practice: 'Practice tests', exams: 'Exams', analytics: 'Analytics', assistant: 'Assistant',
  achievements: 'Achievements', settings: 'Settings',
};

export function localDay(date = new Date()) {
  const two = (part: number) => String(part).padStart(2, '0');
  return `${date.getFullYear()}-${two(date.getMonth() + 1)}-${two(date.getDate())}`;
}

function clip(text: string, length = 110) {
  return text.trim().replace(/\s+/g, ' ').slice(0, length);
}

export function workspaceContext(app: Workspace, page: WorkspacePage, prompt: string) {
  const { subjects, selectedSubjectId, selectedNoteId, tasks, sessions, exams, focusTimer, notes, decks, goals, focusHistory } = app;
  const today = localDay();
  const subjectName = (id: string) => subjects.find(subject => subject.id === id)?.name;
  const question = prompt.toLowerCase();
  const requested = subjects.find(subject => [subject.name, subject.code].some(term =>
    term.trim().length > 1 && question.includes(term.trim().toLowerCase())));
  const note = page === 'notes' ? notes.find(item => item.id === selectedNoteId) : undefined;
  const subject = requested ?? subjects.find(item => item.id === (note?.subjectId ??
    (page === 'subjects' ? selectedSubjectId : page === 'focus' ? focusTimer.subjectId : null)));
  const matches = (id: string) => !subject || subject.id === id;
  const lines = [`Screen: ${labels[page]}. Local date: ${today}.`];
  if (subject) lines.push(`Subject: ${clip(subject.name)}.`);
  if (note) lines.push(`Selected note: ${clip(note.title)}\n${note.content.trim().slice(0, 1050)}`);
  if (page === 'analytics') {
    for (const entry of [...focusHistory].reverse().slice(0, 4)) {
      lines.push(`Focus log: ${clip(entry.taskTitle)} · ${entry.durationMinutes} min · ${clip(entry.completedAt, 40)}`);
    }
  }
  if (page === 'focus' && focusTimer.running) {
    lines.push(`Active timer: ${focusTimer.mode} (${focusTimer.phase}) · ${clip(focusTimer.taskTitle || 'No task selected')}`);
  }
  if (page === 'goals') {
    for (const goal of goals.filter(item => !item.subjectId || matches(item.subjectId)).slice(0, 4)) {
      lines.push(`Goal: ${clip(goal.title)} · ${goal.current}/${goal.target} ${clip(goal.unit, 20)} · ${clip(goal.deadline, 35)}`);
    }
  }
  if (page === 'flashcards') {
    for (const deck of decks.filter(item => matches(item.subjectId)).slice(0, 4)) {
      lines.push(`Deck: ${clip(deck.title)} · ${app.flashcards.filter(card => card.deckId === deck.id && card.dueToday).length} due`);
    }
  }

  const planning = ['planner', 'dashboard', 'tasks', 'focus', 'subjects', 'assistant'].includes(page) ||
    /\b(plan|study next|due|deadline|schedule|exam|task)\b/i.test(prompt);
  if (planning) {
    const open = tasks.filter(task => task.status !== 'done' && matches(task.subjectId))
      .sort((a, b) => (a.dueDate || '9999').localeCompare(b.dueDate || '9999')).slice(0, 4);
    if (!open.length) lines.push('No matching open tasks.');
    for (const task of open) {
      lines.push(`Open task: ${clip(task.title)} · ${task.dueDate || 'no due date'} · ${task.priority} priority`);
    }
    const upcoming = sessions.filter(item => item.status === 'upcoming' && item.date >= today && matches(item.subjectId))
      .sort((a, b) => a.date.localeCompare(b.date) || a.startHour - b.startHour).slice(0, 3);
    if (!upcoming.length) lines.push('No matching upcoming sessions from today.');
    for (const session of upcoming) {
      const minutes = Math.round(session.startHour * 60);
      const time = `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
      lines.push(`Planned session: ${clip(session.title)} · ${session.date} ${time} · ${Math.round(session.durationHours * 60)} min`);
    }
  }
  if (planning || ['exams', 'practice'].includes(page)) {
    for (const exam of exams.filter(item => item.date >= today && matches(item.subjectId))
      .sort((a, b) => a.date.localeCompare(b.date)).slice(0, 2)) {
      lines.push(`Upcoming exam: ${clip(exam.title)} · ${exam.date}`);
    }
  }
  return { label: note ? `Notes · ${clip(note.title, 40)}` : labels[page], text: lines.join('\n').slice(0, CHAT_LIMITS.context) };
}
