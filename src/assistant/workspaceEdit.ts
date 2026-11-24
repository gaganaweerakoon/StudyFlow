import { readGeneratedCards, readGeneratedQuestions } from '../notes/generatedStudyItems';
import type { useApp } from '../context/AppContext';
import type { ExamItem, GoalItem, NavRoute, StudySession, TaskItem } from '../types/studyflow';

export type Workspace = ReturnType<typeof useApp>;

export interface WorkspaceEdit {
  action: string;
  title: string;
  success?: string;
  confirmation?: boolean;
  route?: NavRoute;
  routeLabel?: string;
  apply: (app: Workspace) => boolean;
}

export interface BatchEditResult {
  appliedCount: number;
  failedCount: number;
  messages: string[];
  links: Array<{ route: NavRoute; label: string }>;
}

const VALID_ROUTES = new Set<NavRoute>([
  'dashboard',
  'planner',
  'subjects',
  'tasks',
  'focus',
  'notes',
  'flashcards',
  'practice',
  'exams',
  'goals',
  'analytics',
  'settings',
  'assistant',
]);

function validDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d\d-\d\d$/.test(value)) return false;
  const date = new Date(value + 'T00:00:00Z');
  return Number.isFinite(+date) && date.toISOString().slice(0, 10) === value;
}

function parseHour(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value) && value >= 0 && value < 24) {
    return value;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    const hm = trimmed.match(/^(\d{1,2}):(\d{2})(?:\s*(am|pm))?$/i);
    if (hm) {
      let h = Number(hm[1]);
      const m = Number(hm[2]);
      const mer = hm[3]?.toLowerCase();
      if (mer === 'pm' && h < 12) h += 12;
      if (mer === 'am' && h === 12) h = 0;
      if (h >= 0 && h < 24 && m >= 0 && m < 60) return h + m / 60;
    }
    const asNum = Number(trimmed);
    if (Number.isFinite(asNum) && asNum >= 0 && asNum < 24) return asNum;
  }
  return undefined;
}

function formatHour(hour: number): string {
  const totalMinutes = Math.round(hour * 60);
  const h = Math.floor(totalMinutes / 60) % 24;
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function resolveSubjectId(raw: unknown, app: Workspace): string {
  if (typeof raw !== 'string' || !raw.trim()) return '';
  const needle = raw.trim().toLowerCase();
  const byId = app.subjects.find((s) => s.id === raw.trim());
  if (byId) return byId.id;
  const byCodeOrName = app.subjects.find(
    (s) => s.code.toLowerCase() === needle || s.name.toLowerCase() === needle || s.name.toLowerCase().includes(needle),
  );
  return byCodeOrName?.id ?? '';
}

function resolveNote(raw: unknown, app: Workspace) {
  if (typeof raw === 'string' && raw.trim()) {
    const needle = raw.trim().toLowerCase();
    const byId = app.notes.find((n) => n.id === raw.trim());
    if (byId) return byId;
    const byTitle = app.notes.find(
      (n) => n.title.toLowerCase() === needle || n.title.toLowerCase().includes(needle),
    );
    if (byTitle) return byTitle;
  }
  return app.notes.find((n) => n.id === app.selectedNoteId) ?? app.notes[0];
}

function resolveDeck(deckIdRaw: unknown, deckTitleRaw: unknown, app: Workspace) {
  if (typeof deckIdRaw === 'string' && deckIdRaw.trim()) {
    const byId = app.decks.find((d) => d.id === deckIdRaw.trim());
    if (byId) return byId;
    const byName = app.decks.find((d) => d.title.toLowerCase() === deckIdRaw.trim().toLowerCase());
    if (byName) return byName;
  }
  if (typeof deckTitleRaw === 'string' && deckTitleRaw.trim()) {
    const needle = deckTitleRaw.trim().toLowerCase();
    const byName = app.decks.find((d) => d.title.toLowerCase() === needle);
    if (byName) return byName;
  }
  return undefined;
}

export function parseWorkspaceEdit(raw: string, app: Workspace): WorkspaceEdit | undefined {
  try {
    const edit = JSON.parse(raw) as Record<string, unknown>;
    if (!edit || typeof edit !== 'object' || Array.isArray(edit) || typeof edit.action !== 'string') return;
    const action = edit.action;
    const title =
      typeof edit.title === 'string' && edit.title.trim() && edit.title.length <= 200
        ? edit.title.trim()
        : undefined;
    const id = typeof edit.id === 'string' ? edit.id.trim() : undefined;

    // 1. Navigate to view
    if (action === 'navigate_to_view') {
      const targetRoute = typeof edit.route === 'string' ? (edit.route.trim() as NavRoute) : undefined;
      if (!targetRoute || !VALID_ROUTES.has(targetRoute)) return;
      const note = typeof edit.noteId === 'string' ? resolveNote(edit.noteId, app) : undefined;
      const label = targetRoute.charAt(0).toUpperCase() + targetRoute.slice(1);
      return {
        action,
        title: `Open ${label}`,
        success: `Opened ${label}.`,
        route: targetRoute,
        routeLabel: `Open ${label}`,
        apply: (current) => {
          if (targetRoute === 'notes' && note) current.setSelectedNoteId(note.id);
          current.setRoute(targetRoute);
          return true;
        },
      };
    }

    // 2. Start Focus Session
    if (action === 'start_focus_session') {
      const taskTitle =
        typeof edit.taskTitle === 'string' && edit.taskTitle.trim()
          ? edit.taskTitle.trim().slice(0, 160)
          : title ?? 'Focused Study Session';
      const subjectId = resolveSubjectId(edit.subjectId, app);
      const rawMode = typeof edit.mode === 'string' ? edit.mode : 'Pomodoro';
      const mode: 'Pomodoro' | 'Countdown' | 'Stopwatch' | 'Custom' =
        rawMode === 'Countdown' || rawMode === 'Stopwatch' || rawMode === 'Custom' ? rawMode : 'Pomodoro';
      const minutes =
        typeof edit.minutes === 'number' && Number.isFinite(edit.minutes) && edit.minutes >= 1 && edit.minutes <= 180
          ? Math.round(edit.minutes)
          : undefined;
      const autoStart = edit.autoStart !== false;
      return {
        action,
        title: `Start ${mode}${minutes ? ` (${minutes}m)` : ''} focus session for “${taskTitle}”`,
        success: `Configured ${mode}${minutes ? ` (${minutes} min)` : ''} focus timer for “${taskTitle}”${autoStart ? ' and started the timer' : ''}.`,
        route: 'focus',
        routeLabel: 'Open Focus Timer',
        apply: (current) => {
          current.setFocusMode(minutes && mode !== 'Custom' ? 'Custom' : mode, minutes);
          current.setFocusContext(subjectId, taskTitle);
          if (autoStart) current.applyPhoneFocusAction({ action: 'start' });
          return true;
        },
      };
    }

    // 3. Create Deck
    if (action === 'create_deck' && title) {
      const subjectId = resolveSubjectId(edit.subjectId, app);
      const description =
        typeof edit.description === 'string' ? edit.description.trim().slice(0, 240) : 'Created with Pip';
      return {
        action,
        title: `Create flashcard deck “${title}”`,
        success: `Created deck “${title}” in Flashcards.`,
        route: 'flashcards',
        routeLabel: 'Open Flashcards',
        apply: (current) => {
          if (current.decks.some((d) => d.title.toLowerCase() === title.toLowerCase())) return true;
          current.addDeck({ title, subjectId, description });
          return true;
        },
      };
    }

    // 4. Create Flashcards (from note or topic; existing deck OR auto-create new deck!)
    if (action === 'create_flashcards') {
      const cards = readGeneratedCards(edit.cards);
      const note = resolveNote(edit.noteId, app);
      const existingDeck = resolveDeck(edit.deckId, edit.deckTitle, app);
      const requestedNewTitle =
        typeof edit.deckTitle === 'string' && edit.deckTitle.trim()
          ? edit.deckTitle.trim().slice(0, 120)
          : note
            ? `${note.title} Deck`
            : 'Pip Study Deck';
      const fallbackDeck = existingDeck ?? (!edit.deckTitle ? app.decks[0] : undefined);
      const targetDeckName = fallbackDeck ? fallbackDeck.title : requestedNewTitle;
      const subjectId = resolveSubjectId(edit.subjectId, app) || note?.subjectId || '';

      return {
        action,
        title: `Save ${cards.length} flashcards to “${targetDeckName}”`,
        success: `Saved ${cards.length} flashcards to “${targetDeckName}” in Flashcards.`,
        route: 'flashcards',
        routeLabel: 'Open Flashcards',
        apply: (current) => {
          let deckId = fallbackDeck && current.decks.some((d) => d.id === fallbackDeck.id) ? fallbackDeck.id : '';
          if (!deckId) {
            const matchByName = current.decks.find(
              (d) => d.title.toLowerCase() === targetDeckName.toLowerCase(),
            );
            deckId = matchByName
              ? matchByName.id
              : current.addDeck({
                  title: targetDeckName,
                  subjectId,
                  description: note ? `Generated from note: ${note.title}` : 'Generated with Pip',
                });
          }
          const saved = new Set(
            current.flashcards
              .filter((card) => card.deckId === deckId)
              .map((card) => JSON.stringify([card.front, card.back])),
          );
          for (const card of cards) {
            const key = JSON.stringify([card.front, card.back]);
            if (saved.has(key)) continue;
            current.addFlashcard({ ...card, deckId, hint: note?.title });
            saved.add(key);
          }
          return true;
        },
      };
    }

    // 5. Create Practice Test (from note or topic)
    if (action === 'create_practice_test') {
      const note = resolveNote(edit.noteId, app);
      const defaultTopic = title ?? note?.title ?? 'Study Review';
      const questions = readGeneratedQuestions(edit.questions, defaultTopic);
      const name = title ?? (note ? `${note.title} Practice Test` : 'Pip Practice Test');
      const subjectId = resolveSubjectId(edit.subjectId, app) || note?.subjectId || '';
      const rawDiff = typeof edit.difficulty === 'string' ? edit.difficulty : 'Standard';
      const difficulty: 'Standard' | 'Challenge' | 'Exam Level' =
        rawDiff === 'Challenge' || rawDiff === 'Exam Level'
          ? rawDiff
          : rawDiff === 'Exam-Level'
            ? 'Exam Level'
            : 'Standard';
      const sourceSection =
        typeof edit.sourceSection === 'string' ? edit.sourceSection.trim().slice(0, 120) : undefined;

      return {
        action,
        title: `Create practice test “${name}” (${questions.length} questions)`,
        success: `Saved “${name}” in Practice Tests with ${questions.length} questions.`,
        route: 'practice',
        routeLabel: 'Open Practice Tests',
        apply: (current) => {
          current.addQuiz({
            id: crypto.randomUUID(),
            title: name,
            subjectId,
            difficulty,
            durationMinutes: Math.max(5, questions.length * 2),
            questions,
            sourceNoteId: note?.id,
            sourceSection,
          });
          return true;
        },
      };
    }

    // 6. Create / Update Note
    if (action === 'create_note' || action === 'update_note') {
      const updating = action === 'update_note';
      const existing = updating ? (id ? app.notes.find((item) => item.id === id) : resolveNote(edit.title, app)) : undefined;
      const name = title || existing?.title;
      const content = typeof edit.content === 'string' ? edit.content.trim() : '';
      if (!name || !content || content.length > 60000 || (updating && !existing)) return;
      const subjectId = resolveSubjectId(edit.subjectId, app) || existing?.subjectId || '';
      const tags = Array.isArray(edit.tags)
        ? edit.tags.filter((t): t is string => typeof t === 'string' && Boolean(t.trim())).slice(0, 8)
        : undefined;

      return {
        action,
        title: `${updating ? 'Update' : 'Create'} note “${name}”`,
        success: `${updating ? 'Updated' : 'Created'} “${name}” in Notes.`,
        route: 'notes',
        routeLabel: 'Open Notes',
        apply: (current) => {
          if (updating && existing) {
            if (!current.notes.some((n) => n.id === existing.id)) return false;
            current.updateNote(existing.id, {
              title: name,
              content,
              updatedAt: 'Just now',
              ...(tags ? { tags } : {}),
            });
            current.setSelectedNoteId(existing.id);
          } else if (
            !current.notes.some((n) => n.title === name && n.content === content && n.subjectId === subjectId)
          ) {
            current.createNote(subjectId, 'fld-all', { title: name, content, ...(tags ? { tags } : {}) });
          }
          return true;
        },
      };
    }

    // 7. Delete Note / Delete Exam
    if (action === 'delete_note' || action === 'delete_exam') {
      const isNote = action === 'delete_note';
      const record = (isNote ? app.notes : app.exams).find((item) => item.id === id);
      if (!record) return;
      return {
        action,
        title: isNote
          ? `Delete note “${record.title}” and its attachments`
          : `Delete exam “${record.title}” and its mock exam history`,
        success: `Deleted “${record.title}” from ${isNote ? 'Notes' : 'Exams'}.`,
        confirmation: true,
        apply: (current) => {
          if (!(isNote ? current.notes : current.exams).some((item) => item.id === record.id)) return false;
          if (isNote) current.deleteNote(record.id);
          else current.deleteExam(record.id);
          return true;
        },
      };
    }

    // 8. Create / Update Exam
    if (action === 'create_exam' || action === 'update_exam') {
      const updating = action === 'update_exam';
      const exam = updating ? app.exams.find((item) => item.id === id) : undefined;
      if (updating && !exam) return;
      const name = title ?? exam?.title;
      const date = edit.date === undefined ? exam?.date : edit.date;
      const time = edit.time === undefined ? exam?.time ?? '' : edit.time;
      const subjectId =
        edit.subjectId === undefined ? exam?.subjectId ?? '' : resolveSubjectId(edit.subjectId, app);
      const room = edit.room === undefined ? exam?.room ?? '' : edit.room;
      const targetGrade = edit.targetGrade === undefined ? exam?.targetGrade ?? '' : edit.targetGrade;
      const weightPercent = edit.weightPercent === undefined ? exam?.weightPercent ?? 0 : Number(edit.weightPercent);
      const prepProgress =
        typeof edit.prepProgress === 'number' && Number.isFinite(edit.prepProgress)
          ? Math.max(0, Math.min(100, Math.round(edit.prepProgress)))
          : exam?.prepProgress ?? 0;

      if (
        (edit.title !== undefined && !title) ||
        !name ||
        !validDate(date) ||
        typeof time !== 'string' ||
        (edit.time !== undefined && time !== '' && !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time)) ||
        typeof room !== 'string' ||
        room.length > 200 ||
        typeof targetGrade !== 'string' ||
        targetGrade.length > 80 ||
        !Number.isFinite(weightPercent) ||
        weightPercent < 0 ||
        weightPercent > 100
      ) {
        return;
      }

      const fields: Pick<
        ExamItem,
        'title' | 'date' | 'time' | 'subjectId' | 'room' | 'targetGrade' | 'weightPercent' | 'prepProgress'
      > = {
        title: name,
        date,
        time,
        subjectId,
        room: room.trim(),
        targetGrade: targetGrade.trim(),
        weightPercent,
        prepProgress,
      };
      return {
        action,
        title: `${exam ? 'Update' : 'Add'} exam “${name}” on ${date}`,
        success: `${exam ? 'Updated' : 'Added'} “${name}” in Exams for ${date}${time ? ` at ${time}` : ''}.`,
        route: 'exams',
        routeLabel: 'Open Exams',
        apply: (current) => {
          if (exam) {
            if (!current.exams.some((item) => item.id === exam.id)) return false;
            current.updateExam(exam.id, fields);
          } else if (
            !current.exams.some(
              (item) => item.title === name && item.date === date && item.time === time && item.subjectId === subjectId,
            )
          ) {
            current.addExam({ ...fields, syllabusTopics: [] });
          }
          return true;
        },
      };
    }

    // 9. Create Goal / Add Goal Milestone
    if (action === 'create_goal' && title) {
      const target =
        typeof edit.target === 'number' && Number.isFinite(edit.target) && edit.target > 0 ? edit.target : 100;
      const unit = typeof edit.unit === 'string' && edit.unit.trim() ? edit.unit.trim().slice(0, 32) : '%';
      const deadline = typeof edit.deadline === 'string' ? edit.deadline.trim().slice(0, 40) : '';
      const rawCat = typeof edit.category === 'string' ? edit.category.toLowerCase() : 'weekly';
      const category: GoalItem['category'] =
        rawCat === 'daily' ||
        rawCat === 'weekly' ||
        rawCat === 'subject' ||
        rawCat === 'tasks' ||
        rawCat === 'syllabus' ||
        rawCat === 'revision'
          ? rawCat
          : 'weekly';
      const subjectId = resolveSubjectId(edit.subjectId, app) || undefined;
      const steps: unknown[] = Array.isArray(edit.milestoneSteps)
        ? edit.milestoneSteps
        : Array.isArray(edit.milestones) ? edit.milestones : [];
      const milestones = steps.slice(0, 30).flatMap((step) => {
        const fields = step && typeof step === 'object' ? step as Record<string, unknown> : {};
        const rawLabel = typeof step === 'string' ? step : fields.title;
        const label = typeof rawLabel === 'string' ? rawLabel.trim().slice(0, 180) : '';
        const date = typeof fields.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(fields.date) ? fields.date : deadline;
        return label ? [{ id: `ms-${crypto.randomUUID()}`, label, date, done: false }] : [];
      });
      return {
        action,
        title: `Add goal “${title}” (${target} ${unit})`,
        success: `Created goal “${title}” in Goals.`,
        route: 'goals',
        routeLabel: 'Open Goals',
        apply: (current) => {
          if (current.goals.some((g) => g.title.toLowerCase() === title.toLowerCase())) return true;
          current.addGoal({ title, category, current: 0, target, unit, deadline, subjectId, milestones });
          return true;
        },
      };
    }

    if (action === 'update_goal' || action === 'update_goal_milestone') {
      const goal = app.goals.find((item) => item.id === (action === 'update_goal' ? edit.id : edit.goalId));
      if (!goal) return;
      const milestone = action === 'update_goal_milestone' ? goal.milestones.find((item) => item.id === edit.id) : undefined;
      if (action === 'update_goal_milestone' && !milestone) return;
      const rawDate = action === 'update_goal' ? edit.deadline : edit.date;
      const date = typeof rawDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(rawDate) ? rawDate : undefined;
      if (!title && !date) return;
      const label = milestone?.label ?? goal.title;
      return {
        action,
        title: `Update “${label}”`,
        success: `Updated “${label}”.`,
        route: 'goals',
        routeLabel: 'Open Goals',
        apply: (current) => {
          const live = current.goals.find((item) => item.id === goal.id);
          if (!live) return false;
          if (!milestone) {
            current.updateGoal(live.id, { title: title || live.title, deadline: date ?? live.deadline });
            return true;
          }
          if (!live.milestones.some((item) => item.id === milestone.id)) return false;
          current.updateGoal(live.id, {
            milestones: live.milestones.map((item) => item.id === milestone.id
              ? { ...item, label: title || item.label, date: date ?? item.date }
              : item),
          });
          return true;
        },
      };
    }

    if (action === 'add_goal_milestone' && title) {
      const goalNeedle = typeof edit.goalId === 'string' ? edit.goalId.trim() : '';
      if (!goalNeedle) return;
      const goal =
        app.goals.find((g) => g.id === goalNeedle) ??
        app.goals.find(
          (g) =>
            g.title.toLowerCase() === goalNeedle.toLowerCase() ||
            g.title.toLowerCase().includes(goalNeedle.toLowerCase()),
        );
      if (!goal) return;
      const date = typeof edit.date === 'string' ? edit.date.trim().slice(0, 40) : goal.deadline || '';
      return {
        action,
        title: `Add milestone “${title}” to “${goal.title}”`,
        success: `Added milestone “${title}” to “${goal.title}”.`,
        route: 'goals',
        routeLabel: 'Open Goals',
        apply: (current) => {
          const live = current.goals.find((g) => g.id === goal.id);
          if (!live) return false;
          if (live.milestones.some((item) => item.label.toLowerCase() === title.toLowerCase())) return true;
          const nextMilestones = [
            ...(live.milestones ?? []),
            { id: `ms-${crypto.randomUUID()}`, label: title, date, done: false },
          ];
          current.updateGoal(live.id, { milestones: nextMilestones });
          return true;
        },
      };
    }

    // 10. Delete / Complete Tasks
    if (action === 'delete_tasks' || action === 'complete_tasks') {
      const ids: unknown = edit.ids;
      if (
        !Array.isArray(ids) ||
        ids.length === 0 ||
        ids.length > 100 ||
        ids.some((value) => typeof value !== 'string') ||
        new Set(ids).size !== ids.length
      ) {
        return;
      }
      const targets = ids.map((taskId) => app.tasks.find((task) => task.id === taskId));
      if (targets.some((task) => !task)) return;
      const deleting = action === 'delete_tasks';
      // Single-task completion is non-destructive and safe; deletion or bulk completion asks for confirmation
      const needsConfirm = deleting || ids.length > 1;
      return {
        action,
        confirmation: needsConfirm,
        title: `${deleting ? 'Delete' : 'Complete'} ${ids.length} ${ids.length === 1 ? 'task' : 'tasks'} · ${targets.map((task) => task?.title).join(', ')}`,
        success: `${deleting ? 'Deleted' : 'Completed'} ${ids.length} ${ids.length === 1 ? 'task' : 'tasks'}.`,
        route: 'tasks',
        routeLabel: 'Open Tasks',
        apply: (current) => {
          if (targets.some((task) => !current.tasks.some((item) => item.id === task?.id))) return false;
          if (deleting) current.deleteTasks(ids);
          else for (const taskId of ids) current.updateTask(taskId, { status: 'done' });
          return true;
        },
      };
    }

    // 11. Delete Event
    if (action === 'delete_event' && id) {
      const event = app.sessions.find((item) => item.id === id);
      if (!event || (event.recurring && edit.scope !== 'occurrence')) return;
      return {
        action,
        confirmation: true,
        title: `Delete “${event.title}” on ${event.date}${event.recurring ? ' · this occurrence only' : ''}`,
        success: `Removed “${event.title}” from Calendar.`,
        route: 'planner',
        routeLabel: 'Open Planner',
        apply: (current) => {
          if (!current.sessions.some((item) => item.id === id)) return false;
          current.deleteSession(id);
          return true;
        },
      };
    }

    // 12. Create Task
    if (action === 'create_task' && title && (edit.date === undefined || edit.date === '' || validDate(edit.date))) {
      const date = typeof edit.date === 'string' && validDate(edit.date) ? edit.date : '';
      const subjectId = resolveSubjectId(edit.subjectId, app);
      const rawPriority = typeof edit.priority === 'string' ? edit.priority : 'medium';
      const priority: TaskItem['priority'] =
        rawPriority === 'low' || rawPriority === 'high' ? rawPriority : 'medium';
      const estimatedMinutes =
        typeof edit.estimatedMinutes === 'number' && Number.isFinite(edit.estimatedMinutes) && edit.estimatedMinutes >= 0
          ? Math.round(edit.estimatedMinutes)
          : 30;
      const description = typeof edit.description === 'string' ? edit.description.trim().slice(0, 600) : '';

      return {
        action,
        title: `Add task “${title}”${date ? ` due ${date}` : ''}`,
        success: `Added task “${title}”${date ? ` (due ${date})` : ''} in Tasks.`,
        route: 'tasks',
        routeLabel: 'Open Tasks',
        apply: (current) => {
          if (
            current.tasks.some(
              (task) => task.title === title && (task.dueDate ?? '') === date && task.status !== 'done',
            )
          ) {
            return true;
          }
          current.addTask({
            title,
            dueDate: date,
            dueLabel: date || 'No due date',
            subjectId,
            priority,
            status: 'todo',
            estimatedMinutes,
            description,
            subtasks: [],
          });
          return true;
        },
      };
    }

    // 13. Update Task
    if (action === 'update_task' && id) {
      const task = app.tasks.find((item) => item.id === id);
      if (!task || (edit.date !== undefined && edit.date !== '' && !validDate(edit.date))) return;
      const patch: Partial<TaskItem> = {};
      const changes: string[] = [];
      if (title && title !== task.title) {
        patch.title = title;
        changes.push(`rename to “${title}”`);
      }
      if (validDate(edit.date) && edit.date !== task.dueDate) {
        patch.dueDate = patch.dueLabel = edit.date;
        changes.push(`due ${edit.date}`);
      }
      if (
        (edit.priority === 'low' || edit.priority === 'medium' || edit.priority === 'high') &&
        edit.priority !== task.priority
      ) {
        patch.priority = edit.priority;
        changes.push(`priority ${edit.priority}`);
      }
      if (
        (edit.status === 'todo' || edit.status === 'in_progress' || edit.status === 'done') &&
        edit.status !== task.status
      ) {
        patch.status = edit.status;
        changes.push(edit.status === 'done' ? 'mark complete' : `status ${edit.status}`);
      }
      if (!changes.length) return;
      return {
        action,
        title: `Update “${task.title}” · ${changes.join(', ')}`,
        success: `Updated task “${task.title}” (${changes.join(', ')}).`,
        route: 'tasks',
        routeLabel: 'Open Tasks',
        apply: (current) => {
          if (!current.tasks.some((item) => item.id === id)) return false;
          current.updateTask(id, patch);
          return true;
        },
      };
    }

    // 14. Update Recurring Event Series
    if (action === 'update_event' && edit.scope === 'series') {
      const match = id?.match(/^legacy-series-(\d+)-\d{4}-\d{2}-\d{2}$/);
      if (!match || !app.updateRecurringSeries || edit.date !== undefined) return;
      const seriesId = Number(match[1]);
      const series = app.recurringSeries.find((row) => row.id === seriesId);
      if (!series || typeof series.title !== 'string') return;
      const priorStart = parseHour(series.start_time) ?? 9;
      const priorEnd = parseHour(series.end_time) ?? 10;
      const start = parseHour(edit.startHour ?? edit.startTime) ?? priorStart;
      const duration =
        typeof edit.durationHours === 'number' && Number.isFinite(edit.durationHours)
          ? edit.durationHours
          : (priorEnd - priorStart + 24) % 24 || 1;
      if (start < 0 || start >= 24 || duration <= 0 || duration > 24) return;
      const weekdays = edit.weekdays;
      if (
        weekdays !== undefined &&
        (!Array.isArray(weekdays) ||
          !weekdays.length ||
          weekdays.length > 7 ||
          weekdays.some((day) => !Number.isInteger(day) || day < 0 || day > 6) ||
          new Set(weekdays).size !== weekdays.length)
      ) {
        return;
      }
      const name = title ?? series.title;
      const days = weekdays?.map((day) => ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][day]).join(', ');
      return {
        action,
        confirmation: true,
        title: `Update entire series “${series.title}” to “${name}” · ${formatHour(start)} for ${duration}h${days ? ` · ${days}` : ''}`,
        success: `Updated recurring series “${name}”.`,
        route: 'planner',
        routeLabel: 'Open Planner',
        apply: (current) => {
          if (!current.updateRecurringSeries || !current.recurringSeries.some((row) => row.id === seriesId)) {
            return false;
          }
          current.updateRecurringSeries(seriesId, name, start, duration, undefined, undefined, weekdays);
          return true;
        },
      };
    }

    // 15. Create / Update Calendar Event
    if (action !== 'create_event' && action !== 'update_event') return;
    const existing = action === 'update_event' ? app.sessions.find((item) => item.id === id) : undefined;
    if (action === 'update_event' && (!existing || (existing.recurring && edit.scope !== 'occurrence'))) return;

    const date = edit.date ?? existing?.date;
    const startHour = parseHour(edit.startHour ?? edit.startTime) ?? existing?.startHour;
    const durationHours =
      typeof edit.durationHours === 'number' && Number.isFinite(edit.durationHours)
        ? edit.durationHours
        : existing?.durationHours ?? 1;
    const name = title ?? existing?.title;
    if (
      !name ||
      !validDate(date) ||
      startHour === undefined ||
      startHour < 0 ||
      startHour >= 24 ||
      durationHours <= 0 ||
      durationHours > 24
    ) {
      return;
    }

    const blockType = edit.blockType ?? existing?.blockType ?? 'study';
    if (blockType !== 'study' && blockType !== 'sleep' && blockType !== 'free') return;

    const weekdays = Array.isArray(edit.weekdays) ? edit.weekdays : [];
    if (
      weekdays.length > 7 ||
      (existing && weekdays.length > 0) ||
      weekdays.some((day) => !Number.isInteger(day) || day < 0 || day > 6) ||
      new Set(weekdays).size !== weekdays.length
    ) {
      return;
    }

    const subjectId =
      blockType === 'sleep' || blockType === 'free'
        ? ''
        : edit.subjectId !== undefined
          ? resolveSubjectId(edit.subjectId, app)
          : existing?.subjectId ?? '';
    const location = typeof edit.location === 'string' ? edit.location.trim().slice(0, 120) : existing?.location;
    const notes = typeof edit.notes === 'string' ? edit.notes.trim().slice(0, 400) : existing?.notes;

    const patch = {
      title: name,
      date,
      startHour,
      durationHours,
      dayIndex: (new Date(date + 'T00:00:00Z').getUTCDay() + 6) % 7,
      subjectId,
      ...(location !== undefined ? { location } : {}),
      ...(notes !== undefined ? { notes } : {}),
    };
    const time = formatHour(startHour);
    return {
      action,
      success: `${existing ? 'Updated' : 'Scheduled'} “${name}”${weekdays.length === 7 ? ' every day' : weekdays.length ? ' on the selected weekdays' : ''} on ${date} at ${time} for ${durationHours}h.`,
      title: `${existing ? 'Update' : 'Add'} “${name}” · ${date}, ${time} for ${durationHours}h${existing?.recurring ? ' · this occurrence only' : ''}`,
      route: 'planner',
      routeLabel: 'Open Planner',
      apply: (current) => {
        if (existing) {
          if (!current.sessions.some((item) => item.id === existing.id)) return false;
          current.updateSession(existing.id, {
            ...patch,
            blockType,
            countsTowardStudy: blockType === 'study',
          });
        } else {
          const event: Omit<StudySession, 'id'> = {
            ...patch,
            status: 'upcoming',
            blockType,
            countsTowardStudy: blockType === 'study',
          };
          const minute = (hour: number) => Math.round(hour * 60);
          if (
            !weekdays.length &&
            current.sessions.some(
              (item) =>
                !item.recurring &&
                item.title === event.title &&
                item.date === event.date &&
                minute(item.startHour) === minute(event.startHour) &&
                minute(item.durationHours) === minute(event.durationHours) &&
                (item.blockType ?? 'study') === event.blockType,
            )
          ) {
            return true;
          }
          current.addSession(event, weekdays);
        }
        return true;
      },
    };
  } catch {
    return;
  }
}

export function splitWorkspaceResponse(response: string, complete = false): { text: string; commands: string[] } {
  const fence = /(?:^|\n)[ \t]*```(pip-edit|json)?[ \t]*(?:\n|$)/gi;
  const commands: string[] = [];
  let text = response;
  const removals: Array<[number, number]> = [];

  for (const match of response.matchAll(fence)) {
    const start = match.index + match[0].length;
    const rest = response.slice(start);
    const end = rest.search(/\n[ \t]*```[ \t]*(?:\n|$)/);
    const body = (end < 0 ? rest : rest.slice(0, end)).trim();
    const isCommand = match[1]?.toLowerCase() === 'pip-edit' || /"action"\s*:/.test(body);
    if (isCommand) {
      if (end >= 0) {
        commands.push(body);
        const closeMatch = rest.slice(end).match(/^\n[ \t]*```[ \t]*(?:\n|$)/);
        removals.push([match.index, start + end + (closeMatch?.[0].length ?? 0)]);
      } else {
        removals.push([match.index, response.length]);
      }
    } else if (!complete && end < 0) {
      removals.push([match.index, response.length]);
    }
  }

  if (removals.length) {
    let out = '';
    let cursor = 0;
    for (const [a, b] of removals) {
      out += response.slice(cursor, a);
      cursor = Math.max(cursor, b);
    }
    out += response.slice(cursor);
    text = out.trim();
    return { text, commands };
  }

  const raw = response.trim();
  if (raw.startsWith('{') && /"action"\s*:/.test(raw)) return { text: '', commands: [raw] };
  if (!complete && raw.startsWith('{')) return { text: '', commands: [] };
  return { text: response, commands: [] };
}
