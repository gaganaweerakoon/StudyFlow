import type { useApp } from '../context/AppContext';
import { computeWorkspaceDiagnostics, findOpenSlotsForDay } from './workspaceDiagnostics';

type Workspace = ReturnType<typeof useApp>;
export type WorkspacePage = Workspace['route'];

export function localDay(date = new Date()) {
  const two = (part: number) => String(part).padStart(2, '0');
  return `${date.getFullYear()}-${two(date.getMonth() + 1)}-${two(date.getDate())}`;
}

function clip(text: string, length = 120) {
  return text.trim().replace(/\s+/g, ' ').slice(0, length);
}

export function validTimeZone(zone: unknown): zone is string {
  if (typeof zone !== 'string' || !zone || zone.length > 80) return false;
  try {
    new Intl.DateTimeFormat('en', { timeZone: zone });
    return true;
  } catch {
    return false;
  }
}

export function requestClock(timezone = '', now = new Date()) {
  const timeZone = timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
      timeZoneName: 'longOffset',
    })
      .formatToParts(now)
      .map(({ type, value }) => [type, value]),
  );
  const date = `${parts.year}-${parts.month}-${parts.day}`;
  const time = `${parts.hour}:${parts.minute}`;
  return { date, time, label: `${date} ${time} (${timeZone}, ${parts.timeZoneName})` };
}

const ignored = new Set(
  'the for this that from with what when which and please about show today tomorrow next current schedule calendar session event tasks task notes note focus exam exams create update delete generate practice flashcards goals goal subject subjects analyze advice help plan week study work make give'.split(
    ' ',
  ),
);

export function workspaceContext(
  app: Pick<
    Workspace,
    | 'subjects'
    | 'tasks'
    | 'sessions'
    | 'exams'
    | 'goals'
    | 'notes'
    | 'selectedNoteId'
    | 'decks'
    | 'flashcards'
    | 'quizzes'
    | 'focusHistory'
    | 'focusTimer'
    | 'preferences'
  >,
  page: WorkspacePage,
  prompt: string,
  clock = requestClock(),
) {
  const lower = prompt.toLocaleLowerCase().trim();
  if (!lower || /^(?:hi|hello|hey|thanks|thank you|good morning|good evening)(?: pip)?[!.? ]*$/.test(lower)) {
    return { label: 'No workspace records', text: '' };
  }

  const [hour, minute] = clock.time.split(':').map(Number);
  const currentHour = (Number.isFinite(hour) ? hour : 9) + (Number.isFinite(minute) ? minute : 0) / 60;

  const terms = [...new Set(lower.match(/[\p{L}\p{M}\p{N}]{3,}/gu) ?? [])].filter((term) => !ignored.has(term));
  const exact = (title: string) => title.length > 2 && lower.includes(title.toLocaleLowerCase());
  const relevance = (title: string) =>
    exact(title)
      ? 100
      : terms.reduce((total, term) => total + Number(title.toLocaleLowerCase().includes(term)), 0);

  function best<T>(rows: T[], name: (row: T) => string, fallback = false, limit = 6) {
    return rows
      .map((row) => ({ row, score: relevance(name(row)) }))
      .filter((item) => item.score || fallback)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((item) => item.row);
  }

  const sections: { name: string; rows: unknown[] }[] = [];
  const add = (name: string, rows: unknown[]) => {
    if (rows.length) sections.push({ name, rows });
  };

  const asksAnalysisOrAdvice =
    /\b(analy[sz]e|advice|overview|summary|summarize|how am i doing|progress|workload|priorit|rebalance|recommend|suggest|what should i|study next|plan my|plan this|coach|weak|behind|overdue|ready|review my|check my|my work|my week|my day|today|this week|improve)\b/i.test(
      lower,
    ) || /විශ්ලේෂණය|උපදෙස්|සැලසුම්/.test(lower);

  const asksCalendar =
    asksAnalysisOrAdvice ||
    /\b(calendar|schedule|reschedule|session|event|class|block|slot|free time|busy|book|move|shift|put|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday|what.?s next|what.?s on|upcoming|rebalance|planner)\b/i.test(
      lower,
    ) ||
    /කාලසටහන|සැසිය/.test(lower);

  const asksTasks =
    asksAnalysisOrAdvice ||
    /\b(tasks?|to-?do|assignments?|deadlines?|homework|complete|finish|overdue|remind|priority)\b/i.test(lower);

  const asksExams =
    asksAnalysisOrAdvice || /\b(exams?|finals?|midterms?|tests?|prep|grade|weight)\b/i.test(lower);

  const asksGoals =
    asksAnalysisOrAdvice || /\b(goals?|targets?|milestones?)\b/i.test(lower);

  const asksNote =
    /\b(notes?|flashcards?|cards?|decks?|quiz|quizzes|practice tests?|practice|selected section|syllabus|summarize|summary|from my|study guide)\b/i.test(
      lower,
    ) ||
    page === 'notes' ||
    /සටහන/.test(lower);

  const asksFlashcards =
    asksAnalysisOrAdvice || /\b(flashcards?|decks?|cards?|spaced repetition|recall|due)\b/i.test(lower);

  const asksPractice =
    asksAnalysisOrAdvice || /\b(practice|quiz|quizzes|mock|test|weak topics?|score)\b/i.test(lower);

  const asksFocus =
    asksAnalysisOrAdvice || /\b(focus|pomodoro|timer|stopwatch|deep work|hours|streak)\b/i.test(lower);

  const diag = computeWorkspaceDiagnostics(
    {
      subjects: app.subjects,
      tasks: app.tasks,
      sessions: app.sessions,
      exams: app.exams,
      goals: app.goals,
      notes: app.notes,
      decks: app.decks,
      flashcards: app.flashcards,
      quizzes: app.quizzes,
      focusHistory: app.focusHistory,
      dailyGoalHours: app.preferences?.dailyGoalHours,
      weeklyGoalHours: app.preferences?.weeklyGoalHours,
    },
    clock.date,
    currentHour,
  );

  // Always include compact workspace summary for analysis/advice/planning queries
  if (asksAnalysisOrAdvice) {
    add('Workspace Overview', [
      {
        today: diag.today,
        todayPlannedHours: diag.todayPlannedHours,
        dailyGoalHours: diag.dailyGoalHours,
        weeklyGoalHours: diag.weeklyGoalHours,
        openSlotsToday: diag.openSlotsToday.map((s) => s.label),
        openTasksCount: diag.openTasksCount,
        overdueTasksCount: diag.overdueTasks.length,
        dueFlashcardsCount: diag.dueFlashcardsCount,
        completedFocusSessions: diag.completedFocusSessions,
        focusMinutesLogged: diag.focusMinutesLogged,
        avgFocusQuality: diag.avgFocusQuality,
        weakQuizTopics: diag.weakQuizTopics,
      },
    ]);
  }

  if (asksCalendar) {
    const nextDay = (offset: number) => {
      const day = new Date(clock.date + 'T00:00:00Z');
      day.setUTCDate(day.getUTCDate() + offset);
      return day.toISOString().slice(0, 10);
    };
    const chronological = [...app.sessions].sort(
      (a, b) => a.date.localeCompare(b.date) || a.startHour - b.startHour,
    );
    const tonight = lower.includes('tomorrow') ? nextDay(1) : clock.date;
    const upcoming = chronological.filter(
      (session) =>
        session.date >= tonight &&
        (session.date !== clock.date ||
          !/\b(next|upcoming|now)\b/.test(lower) ||
          session.startHour + session.durationHours > currentHour),
    );
    const activeOvernight = chronological.filter(
      (session) => session.date === nextDay(-1) && session.startHour + session.durationHours > 24 + currentHour,
    );
    const matching = best(
      chronological.filter((session) => session.date >= nextDay(-1)),
      (row) => row.title,
      false,
      4,
    );
    const current = lower.includes('tomorrow') ? [] : activeOvernight;
    const relevant = [...new Map([...matching, ...current, ...upcoming.slice(0, 8)].map((row) => [row.id, row])).values()].slice(
      0,
      10,
    );
    add(
      'Calendar',
      relevant.map(({ id, title, date, startHour, durationHours, blockType, recurring, subjectId }) => ({
        id,
        title: clip(title, 120),
        date,
        startHour,
        durationHours,
        blockType: blockType ?? 'study',
        recurring: Boolean(recurring),
        subjectId,
      })),
    );
    const targetDay = lower.includes('tomorrow') ? nextDay(1) : clock.date;
    const openSlots = findOpenSlotsForDay(app.sessions, targetDay, targetDay === clock.date ? Math.max(8, Math.ceil(currentHour)) : 8, 21);
    if (openSlots.length) {
      add(
        'Open Slots',
        openSlots.map((slot) => ({ date: slot.date, startHour: slot.startHour, endHour: slot.endHour, label: slot.label })),
      );
    }
  }

  if (asksTasks) {
    const openFirst = [...app.tasks].sort((a, b) => {
      if (a.status === 'done' && b.status !== 'done') return 1;
      if (a.status !== 'done' && b.status === 'done') return -1;
      return (a.dueDate || '9999-12-31').localeCompare(b.dueDate || '9999-12-31');
    });
    const picked = best(openFirst, (row) => `${row.title} ${row.description}`, true, 10);
    add(
      'Tasks',
      picked.map(({ id, title, status, priority, dueDate, subjectId, estimatedMinutes }) => ({
        id,
        title: clip(title),
        status,
        priority,
        dueDate,
        subjectId,
        estimatedMinutes,
      })),
    );
  }

  if (asksExams) {
    add(
      'Exams',
      best(app.exams, (row) => row.title, true, 6).map(({ id, title, date, time, subjectId, prepProgress, weightPercent }) => ({
        id,
        title: clip(title),
        date,
        time,
        subjectId,
        prepProgress,
        weightPercent,
      })),
    );
  }

  if (asksGoals) {
    add(
      'Goals',
      best(app.goals, (row) => row.title, true, 6).map(({ id, title, current, target, unit, deadline, milestones }) => ({
        id,
        title: clip(title),
        current,
        target,
        unit,
        deadline,
        milestonesCount: milestones?.length ?? 0,
      })),
    );
  }

  if (asksNote) {
    const selected = app.notes.find((note) => note.id === app.selectedNoteId);
    const matched = best(
      app.notes.filter((note) => note.id !== selected?.id),
      (row) => `${row.title} ${row.tags.join(' ')}`,
      false,
      3,
    );
    const notesToSend = [...(selected ? [selected] : []), ...matched];
    // If user asked about notes/flashcards/quiz without naming a specific note, include up to 3 most recent notes!
    if (notesToSend.length < 2 && app.notes.length > 0) {
      for (const note of app.notes) {
        if (!notesToSend.some((n) => n.id === note.id)) {
          notesToSend.push(note);
        }
        if (notesToSend.length >= 3) break;
      }
    }
    add(
      'Notes',
      notesToSend.slice(0, 3).map((note) => ({
        id: note.id,
        title: clip(note.title),
        subjectId: note.subjectId,
        isSelected: note.id === app.selectedNoteId,
        content:
          note.content.slice(0, 2600) ||
          note.pdf?.pages
            ?.slice(0, 3)
            .map((part) => part.text.slice(0, 900))
            .join('\n') ||
          '',
      })),
    );
  } else if (asksAnalysisOrAdvice && app.notes.length > 0) {
    add(
      'Notes Catalog',
      app.notes.slice(0, 6).map((note) => ({
        id: note.id,
        title: clip(note.title),
        subjectId: note.subjectId,
      })),
    );
  }

  if (asksFlashcards) {
    add(
      'Decks',
      diag.decksSummary.slice(0, 8).map((d) => ({
        id: d.id,
        title: clip(d.title),
        due: d.due,
        total: d.total,
      })),
    );
  }

  if (asksPractice && app.quizzes.length > 0) {
    add(
      'Practice Tests',
      app.quizzes.slice(0, 6).map((q) => ({
        id: q.id,
        title: clip(q.title),
        subjectId: q.subjectId,
        questionCount: q.questions.length,
        lastScore: q.lastScore,
        topics: [...new Set(q.questions.map((item) => item.topic))].slice(0, 4),
      })),
    );
  }

  // Always provide active subjects so Pip can link calendar/tasks/exams/decks/notes cleanly
  const activeSubjects = app.subjects.filter((s) => !s.archived);
  if (activeSubjects.length > 0) {
    const matchedSubjects = best(activeSubjects, (row) => `${row.code} ${row.name}`, true, 8);
    add(
      'Subjects',
      matchedSubjects.map((sub) => {
        const summary = diag.subjectsSummary.find((s) => s.id === sub.id);
        return {
          id: sub.id,
          code: sub.code,
          name: clip(sub.name),
          completionPercent: summary?.completionPercent ?? 0,
          pendingTasks: summary?.pendingTasks ?? 0,
        };
      }),
    );
  }

  if (asksFocus) {
    if (app.focusTimer.running) {
      const { taskTitle, mode, secondsLeft } = app.focusTimer;
      add('Active Focus', [{ title: clip(taskTitle), mode, secondsLeft }]);
    }
    if (app.focusHistory.length > 0) {
      add(
        'Recent Focus',
        app.focusHistory.slice(0, 5).map((f) => ({
          taskTitle: clip(f.taskTitle, 80),
          subjectId: f.subjectId,
          durationMinutes: f.durationMinutes,
          qualityRating: f.qualityRating,
          completedAt: f.completedAt,
        })),
      );
    }
  }

  const text = sections
    .map(({ name, rows }) => `${name}:\n${rows.map((row) => JSON.stringify(row)).join('\n')}`)
    .join('\n');
  const tokens = Math.ceil(new TextEncoder().encode(text).length / 4);
  return {
    label: sections.length ? `${sections.map((section) => section.name).join(', ')} · ~${tokens} tokens` : 'No workspace records',
    text,
  };
}
