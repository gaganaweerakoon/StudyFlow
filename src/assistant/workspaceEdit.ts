import type { useApp } from '../context/AppContext';
import type { StudySession, TaskItem } from '../types/studyflow';

type Workspace = ReturnType<typeof useApp>;

export interface WorkspaceEdit {
  title: string;
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
    if (edit.action !== 'create_event' && edit.action !== 'update_event') return;
    const existing = edit.action === 'update_event' ? app.sessions.find(item => item.id === id) : undefined;
    if (edit.action === 'update_event' && (!existing || existing.recurring && edit.scope !== 'occurrence')) return;
    const date = edit.date ?? existing?.date;
    const startHour = edit.startHour ?? existing?.startHour;
    const durationHours = edit.durationHours ?? existing?.durationHours;
    const name = title ?? existing?.title;
    if (!name || !validDate(date) || typeof startHour !== 'number' || !Number.isFinite(startHour) || startHour < 0 ||
        startHour >= 24 || typeof durationHours !== 'number' || !Number.isFinite(durationHours) || durationHours <= 0 || durationHours > 24) return;
    const patch = { title: name, date, startHour, durationHours, dayIndex: (new Date(date + 'T00:00:00Z').getUTCDay() + 6) % 7 };
    const hours = Math.floor(startHour);
    const mins = Math.floor((startHour - hours) * 60 + 0.000001);
    const time = `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
    return {
      title: `${existing ? 'Update' : 'Add'} “${name}” · ${date}, ${time} for ${durationHours}h${existing?.recurring ? ' · this occurrence only' : ''}`,
      apply: current => {
        if (existing) {
          const live = current.sessions.find(item => item.id === existing.id);
          if (JSON.stringify(live) !== JSON.stringify(existing)) return false;
          current.updateSession(existing.id, patch);
        } else {
          const event: Omit<StudySession, 'id'> = { ...patch, subjectId: '', status: 'upcoming' };
          current.addSession(event);
        }
        return true;
      },
    };
  } catch {
    return;
  }
}
