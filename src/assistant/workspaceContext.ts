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
  const { subjects, selectedNoteId, tasks, sessions, exams, focusTimer, decks, goals, focusHistory, flashcards, quizzes } = app;
  const notes = app.notes.map(({pdf,...note}) => ({...note, pdfText: pdf?.pages?.map((p,i)=>'## Page '+(i+1)+'\n'+p.text).join('\n')}));
  const note = page === 'notes' ? notes.find(item => item.id === selectedNoteId) : undefined;
  const terms = prompt.toLocaleLowerCase().match(/[\p{L}\p{N}]{3,}/gu) ?? [];
  const relevance = (row: unknown) => {
    const json = JSON.stringify(row).toLocaleLowerCase();
    return terms.reduce((sum, term) => sum + Number(json.includes(term)), 0);
  };
  const groups = { subjects, tasks, calendar: sessions, goals, notes: notes.filter(item => item.id !== note?.id), decks, flashcards, exams, quizzes, focusHistory };
  const sections = Object.entries(groups).map(([name, rows]) => ({
    name,
    rows: [...rows].sort((a, b) => relevance(b) - relevance(a)),
    included: [] as string[],
  }));
  const header = [
    `Screen: ${labels[page]}. Local date: ${localDay()}.`,
    app.recurringSeries.length ? `Recurring calendar rules: ${JSON.stringify(app.recurringSeries).slice(0, 32000)}` : '',
    `Section totals: ${sections.map(({ name, rows }) => `${name}: ${rows.length}`).join(', ')}.`,
    note ? `Selected note: ${JSON.stringify(note).slice(0, 6000)}` : '',
    focusTimer.running ? `Active focus: ${JSON.stringify(focusTimer)}` : '',
  ].filter(Boolean).join('\n');
  let remaining = CHAT_LIMITS.context - header.length - 1024;
  // Give each section a pass before filling the remaining space with more rows.
  for (let offset = 0; remaining > 0 && sections.some(section => offset < section.rows.length); offset++) {
    for (const section of sections) {
      const row = section.rows[offset];
      if (!row) continue;
      const text = JSON.stringify(row);
      const entry = text.length > 4500 ? JSON.stringify({ id: row.id, excerpt: text.slice(0, 3900) }) : text;
      if (entry.length + 1 > remaining) continue;
      section.included.push(entry);
      remaining -= entry.length + 1;
    }
  }
  return {
    label: note ? `Workspace · ${clip(note.title, 40)}` : 'Workspace',
    text: [header, ...sections.map(section =>
      `${section.name} (${section.included.length}/${section.rows.length} included):\n${section.included.join('\n')}`)].join('\n'),
  };
}
