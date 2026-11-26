import { plannedStudyHours } from '../utils/workspaceMetrics';
import { layoutCalendarDay } from '../utils/calendarLayout';
import type {
  ExamItem,
  FlashcardDeck,
  FlashcardItem,
  FocusHistoryItem,
  GoalItem,
  NoteItem,
  PracticeQuiz,
  StudySession,
  Subject,
  TaskItem,
} from '../types/studyflow';

export interface WorkspaceDiagnosticsInput {
  subjects: Subject[];
  tasks: TaskItem[];
  sessions: StudySession[];
  exams: ExamItem[];
  goals: GoalItem[];
  notes: NoteItem[];
  decks: FlashcardDeck[];
  flashcards: FlashcardItem[];
  quizzes: PracticeQuiz[];
  focusHistory: FocusHistoryItem[];
  dailyGoalHours?: number;
  weeklyGoalHours?: number;
}

export interface OpenSlot {
  date: string;
  startHour: number;
  endHour: number;
  label: string;
}

export interface SubjectDiagnostic {
  id: string;
  code: string;
  name: string;
  completionPercent: number;
  pendingTasks: number;
  upcomingExams: number;
}

export interface WorkspaceDiagnostics {
  today: string;
  todaySessionsCount: number;
  todayPlannedHours: number;
  upcomingSessionsCount: number;
  openTasksCount: number;
  overdueTasksCount: number;
  overdueTasks: Array<{ id: string; title: string; dueDate: string; priority: TaskItem['priority']; subjectCode?: string }>;
  highPriorityTasks: Array<{ id: string; title: string; dueDate: string; subjectCode?: string }>;
  upcomingExams: Array<{ id: string; title: string; date: string; daysUntil: number; prepProgress: number; subjectCode?: string }>;
  dueFlashcardsCount: number;
  totalFlashcardsCount: number;
  decksSummary: Array<{ id: string; title: string; due: number; total: number }>;
  recentQuizzes: Array<{ id: string; title: string; lastScore?: number; questionCount: number; subjectCode?: string }>;
  weakQuizTopics: string[];
  focusMinutesLogged: number;
  avgFocusQuality: number | null;
  completedFocusSessions: number;
  activeGoalsCount: number;
  goalsSummary: Array<{ id: string; title: string; percent: number; current: number; target: number; unit: string }>;
  subjectsSummary: SubjectDiagnostic[];
  notesCount: number;
  openSlotsToday: OpenSlot[];
  dailyGoalHours: number;
  weeklyGoalHours: number;
  instantSummary: string;
  instantRecommendation: string;
}

function addDays(isoDate: string, offset: number): string {
  const d = new Date(isoDate + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + offset);
  return d.toISOString().slice(0, 10);
}

function daysBetween(fromIso: string, toIso: string): number {
  const from = Date.parse(fromIso + 'T00:00:00Z');
  const to = Date.parse(toIso + 'T00:00:00Z');
  if (!Number.isFinite(from) || !Number.isFinite(to)) return 0;
  return Math.round((to - from) / 86_400_000);
}

export function formatHourLabel(hour: number): string {
  const totalMinutes = Math.round(hour * 60);
  const h24 = Math.floor(totalMinutes / 60) % 24;
  const mins = totalMinutes % 60;
  const period = h24 >= 12 ? 'PM' : 'AM';
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return mins === 0 ? `${h12}:00 ${period}` : `${h12}:${String(mins).padStart(2, '0')} ${period}`;
}

export function findOpenSlotsForDay(
  sessions: StudySession[],
  date: string,
  minStartHour = 8,
  maxEndHour = 21,
): OpenSlot[] {
  const dayBlocks = layoutCalendarDay(sessions, date)
    .filter(({ session }) => session.status !== 'missed')
    .map(({ from, to }) => ({
      start: Math.max(minStartHour, from),
      end: Math.min(maxEndHour, to),
    }))
    .filter((b) => b.end > b.start)
    .sort((a, b) => a.start - b.start);

  const slots: OpenSlot[] = [];
  let cursor = minStartHour;
  for (const block of dayBlocks) {
    if (block.start - cursor >= 1) {
      slots.push({
        date,
        startHour: cursor,
        endHour: block.start,
        label: `${formatHourLabel(cursor)}–${formatHourLabel(block.start)}`,
      });
    }
    cursor = Math.max(cursor, block.end);
  }
  if (maxEndHour - cursor >= 1) {
    slots.push({
      date,
      startHour: cursor,
      endHour: maxEndHour,
      label: `${formatHourLabel(cursor)}–${formatHourLabel(maxEndHour)}`,
    });
  }
  return slots.slice(0, 3);
}

export function computeWorkspaceDiagnostics(
  input: WorkspaceDiagnosticsInput,
  todayIso: string,
  currentHour = 9,
): WorkspaceDiagnostics {
  const subjectById = new Map(input.subjects.map((s) => [s.id, s]));
  const activeSubjects = input.subjects.filter((s) => !s.archived);
  const nextWeekIso = addDays(todayIso, 7);

  const todaySessions = layoutCalendarDay(input.sessions, todayIso);
  const planDate = new Date(todayIso + 'T12:00:00');
  const todayPlannedHours = plannedStudyHours(input.sessions, 'daily', planDate);
  const upcomingSessionsCount = input.sessions.filter(
    (s) => s.status === 'upcoming' && s.countsTowardStudy !== false && s.blockType !== 'sleep' && s.blockType !== 'free' && s.date <= nextWeekIso && (s.date > todayIso || todaySessions.some(block => block.session.id === s.id && block.to > currentHour)),
  ).length;

  const openTasks = input.tasks.filter((t) => t.status !== 'done');
  const allOverdueTasks = openTasks.filter((t) => Boolean(t.dueDate) && t.dueDate < todayIso);
  const overdueTasksCount = allOverdueTasks.length;
  const overdueTasks = allOverdueTasks
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    .slice(0, 6)
    .map((t) => ({
      id: t.id,
      title: t.title,
      dueDate: t.dueDate,
      priority: t.priority,
      subjectCode: subjectById.get(t.subjectId)?.code,
    }));

  const highPriorityTasks = openTasks
    .filter((t) => t.priority === 'high')
    .sort((a, b) => (a.dueDate || '9999-12-31').localeCompare(b.dueDate || '9999-12-31'))
    .slice(0, 6)
    .map((t) => ({
      id: t.id,
      title: t.title,
      dueDate: t.dueDate,
      subjectCode: subjectById.get(t.subjectId)?.code,
    }));

  const upcomingExams = input.exams
    .map((e) => ({
      id: e.id,
      title: e.title,
      date: e.date,
      daysUntil: daysBetween(todayIso, e.date),
      prepProgress: e.prepProgress,
      subjectCode: subjectById.get(e.subjectId)?.code,
    }))
    .filter((e) => e.daysUntil >= 0)
    .sort((a, b) => a.daysUntil - b.daysUntil)
    .slice(0, 6);

  const dueFlashcardsCount = input.flashcards.filter((c) => c.dueToday).length;
  const decksSummary = input.decks.map((d) => {
    const cards = input.flashcards.filter((c) => c.deckId === d.id);
    return {
      id: d.id,
      title: d.title,
      due: cards.filter((c) => c.dueToday).length,
      total: cards.length,
    };
  });

  const recentQuizzes = input.quizzes.slice(0, 8).map((q) => ({
    id: q.id,
    title: q.title,
    lastScore: q.lastScore,
    questionCount: q.questions.length,
    subjectCode: subjectById.get(q.subjectId)?.code,
  }));

  const weakTopicSet = new Set<string>();
  for (const quiz of input.quizzes) {
    const latest = [...(quiz.attempts ?? [])].sort((a, b) => b.at.localeCompare(a.at))[0];
    if (latest?.review) {
      for (const q of latest.review.questions) {
        if (latest.review.marks[q.id]?.correct === false && q.topic?.trim()) weakTopicSet.add(q.topic.trim());
      }
    }
  }
  const weakQuizTopics = Array.from(weakTopicSet).slice(0, 5);

  const focusMinutesLogged = input.focusHistory.reduce((acc, f) => acc + (f.durationMinutes || 0), 0);
  const ratedFocus = input.focusHistory.filter((f) => typeof f.qualityRating === 'number' && f.qualityRating > 0);
  const avgFocusQuality = ratedFocus.length
    ? Number((ratedFocus.reduce((acc, f) => acc + f.qualityRating, 0) / ratedFocus.length).toFixed(1))
    : null;

  const goalsSummary = input.goals.map((g) => ({
    id: g.id,
    title: g.title,
    current: g.current,
    target: g.target,
    unit: g.unit,
    percent: g.target > 0 ? Math.min(100, Math.round((g.current / g.target) * 100)) : 0,
  }));

  const subjectsSummary: SubjectDiagnostic[] = activeSubjects.map((s) => {
    const visibleChapters = s.chapters.filter((c) => !c.archived);
    const topics = visibleChapters.flatMap((c) => c.topics);
    const done = topics.filter((t) => t.completed).length;
    return {
      id: s.id,
      code: s.code,
      name: s.name,
      completionPercent: topics.length ? Math.round((done / topics.length) * 100) : 0,
      pendingTasks: openTasks.filter((t) => t.subjectId === s.id).length,
      upcomingExams: upcomingExams.filter((e) => e.subjectCode === s.code).length,
    };
  });

  const minSlotStart = Math.min(20, Math.max(8, Math.ceil(currentHour)));
  const openSlotsToday = findOpenSlotsForDay(input.sessions, todayIso, minSlotStart, 21);

  // Build concise, grounded instant summary & recommendation (never hardcoded mock copy)
  const parts: string[] = [];
  if (overdueTasks.length > 0) {
    parts.push(`${overdueTasksCount} overdue ${overdueTasksCount === 1 ? 'task' : 'tasks'}`);
  }
  if (openTasks.length > 0) {
    parts.push(`${openTasks.length} open ${openTasks.length === 1 ? 'task' : 'tasks'}`);
  }
  if (dueFlashcardsCount > 0) {
    parts.push(`${dueFlashcardsCount} flashcards due`);
  }
  if (upcomingExams[0]) {
    const nextExam = upcomingExams[0];
    parts.push(
      `${nextExam.title} in ${nextExam.daysUntil === 0 ? 'today' : `${nextExam.daysUntil}d`} (${nextExam.prepProgress}% prep)`,
    );
  }
  const instantSummary = parts.length
    ? `Right now you have ${parts.slice(0, 3).join(', ')} with ${todayPlannedHours}h planned today.`
    : `Your schedule is clear today (${todayPlannedHours}h planned) with ${input.notes.length} notes and ${input.quizzes.length} practice tests ready.`;

  let instantRecommendation = 'Ask Pip to build a focused study block or generate active-recall practice from your notes.';
  if (overdueTasks.length > 0) {
    const top = overdueTasks[0];
    const slotText = openSlotsToday[0] ? ` during your open ${openSlotsToday[0].label} slot` : '';
    instantRecommendation = `Clear "${top.title}" first${slotText}, then lock in a 25-minute review session.`;
  } else if (upcomingExams[0] && upcomingExams[0].prepProgress < 75) {
    const ex = upcomingExams[0];
    const slotText = openSlotsToday[0] ? ` in your ${openSlotsToday[0].label} window` : '';
    instantRecommendation = `Prioritize ${ex.subjectCode ? `${ex.subjectCode} ` : ''}${ex.title} (${ex.prepProgress}% ready)${slotText} with active-recall flashcards or a practice test.`;
  } else if (dueFlashcardsCount > 0) {
    instantRecommendation = `Run a quick spaced-repetition sweep on your ${dueFlashcardsCount} due flashcards before starting deep work.`;
  } else if (highPriorityTasks[0]) {
    const t = highPriorityTasks[0];
    instantRecommendation = `Tackle high-priority task "${t.title}"${openSlotsToday[0] ? ` at ${formatHourLabel(openSlotsToday[0].startHour)}` : ''}.`;
  }

  return {
    today: todayIso,
    todaySessionsCount: todaySessions.length,
    todayPlannedHours,
    upcomingSessionsCount,
    openTasksCount: openTasks.length,
    overdueTasksCount,
    overdueTasks,
    highPriorityTasks,
    upcomingExams,
    dueFlashcardsCount,
    totalFlashcardsCount: input.flashcards.length,
    decksSummary,
    recentQuizzes,
    weakQuizTopics,
    focusMinutesLogged,
    avgFocusQuality,
    completedFocusSessions: input.focusHistory.length,
    activeGoalsCount: input.goals.filter((g) => !g.completedAt).length,
    goalsSummary,
    subjectsSummary,
    notesCount: input.notes.length,
    openSlotsToday,
    dailyGoalHours: todayPlannedHours,
    weeklyGoalHours: plannedStudyHours(input.sessions, 'weekly', planDate),
    instantSummary,
    instantRecommendation,
  };
}

export function buildOverviewPayloadText(diag: WorkspaceDiagnostics): string {
  return JSON.stringify(
    {
      today: diag.today,
      todayPlannedHours: diag.todayPlannedHours,
      dailyGoalHours: diag.dailyGoalHours,
      weeklyGoalHours: diag.weeklyGoalHours,
      upcomingSessions7d: diag.upcomingSessionsCount,
      openSlotsToday: diag.openSlotsToday.map((s) => s.label),
      openTasksCount: diag.openTasksCount,
      overdueTasksCount: diag.overdueTasksCount,
      overdueTasks: diag.overdueTasks,
      highPriorityTasks: diag.highPriorityTasks,
      upcomingExams: diag.upcomingExams,
      dueFlashcardsCount: diag.dueFlashcardsCount,
      decks: diag.decksSummary,
      recentQuizzes: diag.recentQuizzes,
      weakQuizTopics: diag.weakQuizTopics,
      focusMinutesLogged: diag.focusMinutesLogged,
      avgFocusQuality: diag.avgFocusQuality,
      goals: diag.goalsSummary,
      subjects: diag.subjectsSummary,
      notesCount: diag.notesCount,
    },
    null,
    0,
  );
}
