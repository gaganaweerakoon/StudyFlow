import { readGeneratedCards, readGeneratedQuestions } from '../notes/generatedStudyItems';
import type { useApp } from '../context/AppContext';
import type { StudySession, TaskItem } from '../types/studyflow';

type Workspace = ReturnType<typeof useApp>;

export interface WorkspaceEdit {
  title: string;
  success?: string;
  confirmation?: boolean;
  apply: (app: Workspace) => boolean;
}

function validDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d\d-\d\d$/.test(value)) return false;
  const date = new Date(value + 'T00:00:00Z');
  return Number.isFinite(+date) && date.toISOString().slice(0, 10) === value;
}

export function parseWorkspaceEdit(raw: string, app: Workspace): WorkspaceEdit | undefined {
  try {
    const edit = JSON.parse(raw) as Record<string, unknown>;
    if (!edit || typeof edit !== 'object' || Array.isArray(edit)) return;
    const title = typeof edit.title === 'string' && edit.title.trim() && edit.title.length <= 200 ? edit.title.trim() : undefined;
    const id = typeof edit.id === 'string' ? edit.id : undefined;
    if (edit.action === 'create_flashcards' || edit.action === 'create_practice_test') {
      const note = app.notes.find(item => item.id === edit.noteId);
      if (!note || (!note.content.trim() && !note.pdf?.pages?.some(page => page.text.trim()))) return;
      if (edit.action === 'create_flashcards') {
        const deck = app.decks.find(item => item.id === edit.deckId);
        if (!deck) return;
        const cards = readGeneratedCards(edit.cards);
        return {
          title: `Save flashcards to “${deck.title}”`,
          success: `Saved ${cards.length} flashcards to “${deck.title}” in Flashcards.`,
          apply: current => {
            if (!current.decks.some(item => item.id === deck.id) || current.notes.find(item => item.id === note.id) !== note) return false;
            const saved = new Set(current.flashcards.filter(card => card.deckId === deck.id).map(card => JSON.stringify([card.front, card.back])));
            for (const card of cards) {
              const key = JSON.stringify([card.front, card.back]);
              if (saved.has(key)) continue;
              current.addFlashcard({ ...card, deckId: deck.id, hint: note.title });
              saved.add(key);
            }
            return true;
          },
        };
      }
      const questions = readGeneratedQuestions(edit.questions, note.title);
      const name = title ?? `${note.title} practice`;
      const sourceSection = typeof edit.sourceSection === 'string' ? edit.sourceSection.slice(0, 120) : undefined;
      return {
        title: `Create practice test “${name}”`,
        success: `Saved “${name}” in Practice Tests with ${questions.length} questions.`,
        apply: current => {
          if (current.notes.find(item => item.id === note.id) !== note) return false;
          current.addQuiz({
            id: crypto.randomUUID(), title: name, subjectId: note.subjectId, difficulty: 'Standard',
            durationMinutes: Math.max(5, questions.length * 2), questions, sourceNoteId: note.id, sourceSection,
          });
          return true;
        },
      };
    }
    if (edit.action === 'create_note' || edit.action === 'update_note') {
      const existing = id && app.notes.find(item => item.id === id);
      const updating = edit.action === 'update_note';
      const name = title || (existing && existing.title);
      const content = typeof edit.content === 'string' ? edit.content.trim() : '';
      if (!name || !content || content.length > 60000 || (updating && !existing)) return;
      const subjectId = typeof edit.subjectId === 'string' ? edit.subjectId : '';
      if (subjectId && !app.subjects.some(subject => subject.id === subjectId)) return;
      return {
        title: `${updating ? 'Update' : 'Create'} note “${name}”`,
        success: `${updating ? 'Updated' : 'Created'} “${name}” in Notes.`,
        apply: current => {
          if (updating && existing) {
            if (current.notes.find(note => note.id === existing.id) !== existing) return false;
            current.updateNote(existing.id, { title: name, content, updatedAt: 'Just now' });
          } else if (!current.notes.some(note => note.title === name && note.content === content && note.subjectId === subjectId)) {
            current.createNote(subjectId, 'fld-all', { title: name, content });
          }
          return true;
        },
      };
    }
    if (edit.action === 'delete_tasks' || edit.action === 'complete_tasks') {
      const ids: unknown = edit.ids;
      if (!Array.isArray(ids) || ids.length === 0 || ids.length > 100 ||
          ids.some(value => typeof value !== 'string') || new Set(ids).size !== ids.length) return;
      const targets = ids.map(id => app.tasks.find(task => task.id === id));
      if (targets.some(task => !task)) return;
      const deleting = edit.action === 'delete_tasks';
      return {
        confirmation: true,
        title: `${deleting ? 'Delete' : 'Complete'} ${ids.length} ${ids.length === 1 ? 'task' : 'tasks'} · ${targets.map(task => task?.title).join(', ')}`,
        apply: current => {
          if (targets.some(task => current.tasks.find(item => item.id === task?.id) !== task)) return false;
          if (deleting) current.deleteTasks(ids);
          else for (const id of ids) current.updateTask(id, { status: 'done' });
          return true;
        },
      };
    }
    if (edit.action === 'delete_event' && id) {
      const event = app.sessions.find(item => item.id === id);
      if (!event || event.recurring && edit.scope !== 'occurrence') return;
      return {
        confirmation: true,
        title: `Delete “${event.title}” on ${event.date}${event.recurring ? ' · this occurrence only' : ''}`,
        apply: current => {
          if (JSON.stringify(current.sessions.find(item => item.id === id)) !== JSON.stringify(event)) return false;
          current.deleteSession(id);
          return true;
        },
      };
    }
    if (edit.action === 'create_task' && title && (edit.date === undefined || validDate(edit.date))) {
      const date = typeof edit.date === 'string' ? edit.date : '';
      return {
        title: `Add task “${title}”${date ? ` due ${date}` : ''}`,
        apply: current => {
          current.addTask({ title, dueDate: date, dueLabel: date, subjectId: '', priority: 'medium',
            status: 'todo', estimatedMinutes: 0, description: '', subtasks: [] });
          return true;
        },
      };
    }
    if (edit.action === 'update_task' && id) {
      const task = app.tasks.find(item => item.id === id);
      if (!task || (edit.date !== undefined && !validDate(edit.date))) return;
      const patch: Partial<TaskItem> = {};
      const changes: string[] = [];
      if (title && title !== task.title) { patch.title = title; changes.push(`rename to “${title}”`); }
      if (validDate(edit.date) && edit.date !== task.dueDate) {
        patch.dueDate = patch.dueLabel = edit.date;
        changes.push(`due ${edit.date}`);
      }
      if (edit.status === 'done' && task.status !== 'done') { patch.status = 'done'; changes.push('mark complete'); }
      if (!changes.length) return;
      return {
        title: `Update “${task.title}” · ${changes.join(', ')}`,
        apply: current => {
          if (current.tasks.find(item => item.id === id) !== task) return false;
          current.updateTask(id, patch);
          return true;
        },
      };
    }
    if (edit.action === 'update_event' && edit.scope === 'series') {
      const match = id?.match(/^legacy-series-(\d+)-\d{4}-\d{2}-\d{2}$/);
      if (!match || !app.updateRecurringSeries || edit.date !== undefined) return;
      const seriesId = Number(match[1]);
      const series = app.recurringSeries.find(row => row.id === seriesId);
      if (!series || typeof series.title !== 'string') return;
      const toHour = (value: unknown) => {
        if (typeof value !== 'string' || !/^\d{2}:\d{2}$/.test(value)) return NaN;
        const [hour, minute] = value.split(':').map(Number);
        return hour + minute / 60;
      };
      const priorStart = toHour(series.start_time);
      const priorEnd = toHour(series.end_time);
      const start = edit.startHour ?? priorStart;
      const duration = edit.durationHours ?? ((priorEnd - priorStart + 24) % 24 || 24);
      if (typeof start !== 'number' || !Number.isFinite(start) || start < 0 || start >= 24 ||
          typeof duration !== 'number' || !Number.isFinite(duration) || duration <= 0 || duration > 24) return;
      const name = title ?? series.title;
      return {
        title: `Update entire series “${series.title}” to “${name}” · start hour ${start}, duration ${duration}h (existing exceptions and overrides stay in place)`,
        apply: current => {
          if (!current.updateRecurringSeries || current.recurringSeries.find(row => row.id === seriesId) !== series) return false;
          current.updateRecurringSeries(seriesId, name, start, duration);
          return true;
        },
      };
    }
    if (edit.action !== 'create_event' && edit.action !== 'update_event') return;
    const existing = edit.action === 'update_event' ? app.sessions.find(item => item.id === id) : undefined;
    if (edit.action === 'update_event' && (!existing || existing.recurring && edit.scope !== 'occurrence')) return;
    const date = edit.date ?? existing?.date;
    const startHour = edit.startHour ?? existing?.startHour;
    const durationHours = edit.durationHours ?? existing?.durationHours;
    const name = title ?? existing?.title;
    if (!name || !validDate(date) || typeof startHour !== 'number' || !Number.isFinite(startHour) || startHour < 0 ||
        startHour >= 24 || typeof durationHours !== 'number' || !Number.isFinite(durationHours) || durationHours <= 0 || durationHours > 24) return;
    const blockType = edit.blockType ?? existing?.blockType;
    if (blockType !== undefined && blockType !== 'study' && blockType !== 'sleep' && blockType !== 'free') return;
    const weekdays = edit.weekdays ?? [];
    if (!Array.isArray(weekdays) || weekdays.length > 7 || (existing && weekdays.length > 0) ||
        weekdays.some(day => !Number.isInteger(day) || day < 0 || day > 6) || new Set(weekdays).size !== weekdays.length) return;
    const patch = { title: name, date, startHour, durationHours, dayIndex: (new Date(date + 'T00:00:00Z').getUTCDay() + 6) % 7 };
    const hours = Math.floor(startHour);
    const mins = Math.floor((startHour - hours) * 60 + 0.000001);
    const time = `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
    return {
      success: `${existing ? 'Updated' : 'Scheduled'} “${name}”${weekdays.length === 7 ? ' every day' : weekdays.length ? ' on the selected weekdays' : ''} at ${time} for ${durationHours}h.`,
      title: `${existing ? 'Update' : 'Add'} “${name}” · ${date}, ${time} for ${durationHours}h${existing?.recurring ? ' · this occurrence only' : ''}`,
      apply: current => {
        if (existing) {
          const live = current.sessions.find(item => item.id === existing.id);
          if (JSON.stringify(live) !== JSON.stringify(existing)) return false;
          current.updateSession(existing.id, {
            ...patch,
            ...(blockType && { blockType, countsTowardStudy: blockType === 'study' }),
            ...(blockType === 'sleep' || blockType === 'free' ? { subjectId: '' } : {}),
          });
        } else {
          const event: Omit<StudySession, 'id'> = { ...patch, subjectId: '', status: 'upcoming' };
          event.blockType = blockType ?? 'study';
          event.countsTowardStudy = event.blockType === 'study';
          current.addSession(event, weekdays);
        }
        return true;
      },
    };
  } catch {
    return;
  }
}

export function splitWorkspaceResponse(response: string, complete = false): { text: string; command?: string } {
  const fence = /(?:^|\n)[ \t]*```(pip-edit|json)?[ \t]*(?:\n|$)/gi;
  for (const match of response.matchAll(fence)) {
    const start = match.index + match[0].length;
    const rest = response.slice(start);
    const end = rest.search(/\n[ \t]*```[ \t]*(?:\n|$)/);
    const body = (end < 0 ? rest : rest.slice(0, end)).trim();
    const isCommand = match[1]?.toLowerCase() === 'pip-edit' || /"action"\s*:/.test(body);
    if (isCommand) return {
      text: response.slice(0, match.index).trimEnd(),
      command: end < 0 ? '' : body,
    };
    if (!complete && end < 0) return { text: response.slice(0, match.index).trimEnd() };
  }

  const raw = response.trim();
  if (raw.startsWith('{') && /"action"\s*:/.test(raw)) return { text: '', command: raw };
  if (!complete && raw.startsWith('{')) return { text: '' };
  return { text: response };
}
