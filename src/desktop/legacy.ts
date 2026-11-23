import { invoke } from '@tauri-apps/api/core';
import type { WorkspaceSnapshot } from '../context/AppContext';
import { localDay } from '../assistant/workspaceContext';
import type { StudySession } from '../types/studyflow';

type Row = Record<string, unknown>;
export type LegacyArchive = Record<string, Row[]>;

const text = (row: Row, key: string) => typeof row[key] === 'string' ? row[key] as string : '';
const number = (row: Row, key: string) => typeof row[key] === 'number' ? row[key] as number : 0;
const subjectId = (row: Row, key = 'subject_id') => row[key] == null ? '' : `legacy-subject-${row[key]}`;
const hour = (value: string) => Number(value.slice(0, 2)) + Number(value.slice(3, 5)) / 60;

export async function chooseLegacyBackup() {
  const picker = document.createElement('input');
  picker.type = 'file';
  picker.accept = '.sqlite,.sqlite3,.db';
  const file = await new Promise<File | undefined>(resolve => {
    picker.onchange = () => resolve(picker.files?.[0]);
    picker.oncancel = () => resolve(undefined);
    picker.click();
  });
  if (!file) return;
  if (file.size > 16 * 1024 * 1024) throw new Error('Choose a SQLite backup up to 16 MB.');
  return invoke<LegacyArchive>('inspect_legacy_backup', await file.arrayBuffer());
}

function session(row: Row, id: string, date: string, from: string, to: string, recurring = false): StudySession {
  const start = hour(from);
  const end = hour(to);
  const duration = end - start;
  return {
    id, date, recurring, countsTowardStudy: row.countsTowardStudy !== false, title: text(row, 'title'), subjectId: typeof row.studyflowSubjectId === 'string' ? row.studyflowSubjectId : subjectId(row),
    dayIndex: (new Date(date + 'T12:00:00').getDay() + 6) % 7,
    startHour: start, durationHours: duration > 0 ? duration : duration + 24,
    status: 'upcoming', location: text(row, 'location'), notes: text(row, 'notes'),
  };
}

export function legacyOccurrences(archive: LegacyArchive, dates: string[]) {
  const occurrences: StudySession[] = [];
  const dateSet = new Set(dates);
  for (const row of archive.recurring_events) {
    const weekdays = new Set(text(row, 'weekdays').match(/[0-6]/g) ?? []);
    const exceptions = new Set(archive.recurrence_exceptions.filter(item => item.series_id === row.id).map(item => text(item, 'date')));
    const overrides = new Map(archive.recurrence_overrides.filter(item => item.series_id === row.id).map(item => [text(item, 'occurrence_date'), item]));
    for (const date of dates) {
      const day = (new Date(date + 'T12:00:00').getDay() + 6) % 7;
      if (date < text(row, 'valid_from') || (text(row, 'valid_until') && date > text(row, 'valid_until')) ||
          !weekdays.has(String(day)) || exceptions.has(date) || overrides.has(date)) continue;
      occurrences.push(session(row, `legacy-series-${row.id}-${date}`, date, text(row, 'start_time'), text(row, 'end_time'), true));
    }
    for (const [date, change] of overrides) {
      const scheduled = text(change, 'scheduled_date');
      if (dateSet.has(scheduled) && !exceptions.has(date)) {
        occurrences.push(session(row, `legacy-series-${row.id}-${date}`, scheduled, text(change, 'start_time'), text(change, 'end_time'), true));
      }
    }
  }
  return occurrences;
}

export function mapLegacyWorkspace(archive: LegacyArchive, current: WorkspaceSnapshot): WorkspaceSnapshot {
  const folder = { id: 'legacy-notes', name: 'Imported Notes' };
  const durations = new Map<unknown, number>();
  for (const interval of archive.focus_intervals) {
    durations.set(interval.session_id, (durations.get(interval.session_id) ?? 0) +
      Math.max(0, (number(interval, 'end_ms') || number(interval, 'last_seen_ms')) - number(interval, 'start_ms')));
  }
  return {
    ...current,
    legacyArchive: archive,
    subjects: archive.subjects.filter(row => !row.archived).map(row => ({
      id: subjectId(row, 'id'), name: text(row, 'name'), code: text(row, 'name'),
      color: /^#[0-9a-f]{6}$/i.test(text(row, 'color')) ? text(row, 'color') : '#4F46E5',
      weeklyTargetHours: number(row, 'weekly_target_min') / 60,
      icon: 'brain', totalHours: 0, lastStudied: '', nextExamDate: '', nextExamTitle: '', instructor: '',
      currentGrade: '', targetGrade: '', chapters: [],
    })),
    tasks: archive.tasks.map(row => {
      const priority = text(row, 'priority').toLowerCase();
      return {
        id: `legacy-task-${row.id}`, title: text(row, 'title'), subjectId: subjectId(row),
        dueDate: text(row, 'due_date'), dueLabel: text(row, 'due_date'), priority: priority === 'high' || priority === 'low' ? priority : 'medium',
        status: row.completed ? 'done' : 'todo', estimatedMinutes: 0,
        description: [text(row, 'topic'), text(row, 'lesson_url')].filter(Boolean).join('\n'), subtasks: [],
      };
    }),
    sessions: archive.schedule_events.map(row => {
      const start = text(row, 'start_at');
      return session(row, `legacy-event-${row.id}`, start.slice(0, 10), start.slice(11, 16), text(row, 'end_at').slice(11, 16));
    }),
    goals: archive.learning_goals.map(row => ({
      id: `legacy-goal-${row.id}`, title: text(row, 'title'), category: 'subject',
      subjectId: subjectId(row) || undefined, current: row.status === 'completed' ? 1 : 0,
      target: 1, unit: 'goal', deadline: text(row, 'due_date'), milestones: [],
    })),
    folders: [folder],
    notes: archive.notes.map(row => ({
      id: `legacy-note-${row.id}`, folderId: folder.id, subjectId: subjectId(row), title: text(row, 'title'),
      updatedAt: text(row, 'updated_at'), content: text(row, 'body'), pinned: false, tags: [],
      linkedResources: [], attachments: [], pdfHighlights: [],
    })),
    focusHistory: archive.study_sessions.filter(row => row.status === 'completed' && !row.deleted_at && !row.hidden && number(row, 'ended_at') > 0)
      .map(row => ({
        id: `legacy-focus-${row.id}`, subjectId: subjectId(row), taskTitle: text(row, 'title'),
        mode: 'Custom', durationMinutes: Math.round((durations.get(row.id) ??
          Math.max(0, number(row, 'ended_at') - number(row, 'started_at'))) / 60000),
        completedAt: localDay(new Date(number(row, 'ended_at'))), qualityRating: 0,
      })),
    decks: [{ id: 'review', title: 'General Review', subjectId: '', description: '', lastReviewed: '', retentionRate: 0 }], flashcards: [], exams: [], quizzes: [], challenges: [], xpPoints: 0, notifications: [],
    preferences: { ...current.preferences, name: 'Student', email: '', major: '' },
  };
}
