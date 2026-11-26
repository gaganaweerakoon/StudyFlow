import type {
  ChapterItem,
  FlashcardItem,
  NoteItem,
  Priority,
  QuizQuestion,
  Subject,
  TaskItem,
} from '../types/studyflow';
import { formatChapterTitle } from './syllabusHierarchy';

export type ReviewRating = 'again' | 'hard' | 'good' | 'easy';

/**
 * Pure SM-2 inspired spaced-repetition scheduling function.
 */
export function scheduleFlashcardReview(
  card: Pick<FlashcardItem, 'intervalDays' | 'easeFactor'>,
  rating: ReviewRating
): { intervalDays: number; easeFactor: number; mastery: FlashcardItem['mastery'] } {
  let ease = card.easeFactor;
  let nextInterval = card.intervalDays;

  if (rating === 'again') {
    ease = Math.max(1.3, Number((ease - 0.2).toFixed(2)));
    nextInterval = 1;
  } else if (rating === 'hard') {
    ease = Math.max(1.3, Number((ease - 0.15).toFixed(2)));
    nextInterval = Math.max(1, Math.round(card.intervalDays * 1.2));
  } else if (rating === 'good') {
    nextInterval = card.intervalDays <= 1 ? 3 : Math.round(card.intervalDays * ease);
  } else {
    ease = Math.min(3.0, Number((ease + 0.15).toFixed(2)));
    nextInterval = card.intervalDays <= 1 ? 5 : Math.round(card.intervalDays * ease * 1.3);
  }

  const mastery: FlashcardItem['mastery'] =
    nextInterval >= 14 ? 'mature' : nextInterval >= 3 ? 'learning' : 'new';

  return { intervalDays: nextInterval, easeFactor: ease, mastery };
}

/**
 * Calculates overall syllabus completion percentage for a subject.
 */
export function calculateSubjectProgress(chapters: ChapterItem[]): {
  completed: number;
  total: number;
  percent: number;
} {
  let completed = 0;
  let total = 0;
  for (const ch of chapters) {
    for (const t of ch.topics) {
      total += 1;
      if (t.completed) completed += 1;
    }
  }
  const percent = total === 0 ? 0 : Math.round((completed / total) * 100);
  return { completed, total, percent };
}

/**
 * Grades a practice test and returns per-topic accuracy and weak topics (< 75%).
 */
export function gradePracticeTest(
  questions: QuizQuestion[],
  answers: Record<string, string>,
  shortMarks: Record<string, boolean> = {}
): {
  correctCount: number;
  totalCount: number;
  scorePercent: number;
  topicBreakdown: { topic: string; correct: number; total: number; accuracy: number }[];
  weakTopics: string[];
} {
  let correctCount = 0;
  const topicMap = new Map<string, { correct: number; total: number }>();

  for (const q of questions) {
    const raw = (answers[q.id] ?? '').trim().toLowerCase();
    const expected = q.correctAnswer.trim().toLowerCase();
    const isCorrect = raw.length > 0 && (q.type === "short" ? shortMarks[q.id] ?? raw === expected : raw === expected);

    if (isCorrect) correctCount += 1;
    const entry = topicMap.get(q.topic) ?? { correct: 0, total: 0 };
    entry.total += 1;
    if (isCorrect) entry.correct += 1;
    topicMap.set(q.topic, entry);
  }

  const totalCount = questions.length;
  const scorePercent = totalCount === 0 ? 0 : Math.round((correctCount / totalCount) * 100);
  const topicBreakdown = Array.from(topicMap.entries()).map(([topic, stats]) => ({
    topic,
    correct: stats.correct,
    total: stats.total,
    accuracy: Math.round((stats.correct / stats.total) * 100),
  }));

  const weakTopics = topicBreakdown.filter((t) => t.accuracy < 75).map((t) => t.topic);

  return { correctCount, totalCount, scorePercent, topicBreakdown, weakTopics };
}

/**
 * Computes Planned vs Actual adherence summary.
 */
export function calculateStudyAdherence(
  points: { planned: number; actual: number }[]
): { totalPlanned: number; totalActual: number; adherencePercent: number; deltaHours: number } {
  const totalPlanned = Number(points.reduce((acc, p) => acc + p.planned, 0).toFixed(1));
  const totalActual = Number(points.reduce((acc, p) => acc + p.actual, 0).toFixed(1));
  const adherencePercent =
    totalPlanned === 0 ? 100 : Math.round((totalActual / totalPlanned) * 100);
  const deltaHours = Number((totalActual - totalPlanned).toFixed(1));
  return { totalPlanned, totalActual, adherencePercent, deltaHours };
}

const PRIORITY_RANK: Record<Priority, number> = { high: 0, medium: 1, low: 2 };

export function filterAndSortTasks(
  tasks: TaskItem[],
  opts: {
    query?: string;
    subjectId?: string;
    scope?: 'all' | 'today' | 'upcoming' | 'completed';
    priority?: Priority | 'all';
    sortBy?: 'dueDate' | 'priority' | 'title';
    todayIso?: string;
  }
): TaskItem[] {
  const q = (opts.query ?? '').trim().toLowerCase();
  const now = new Date();
  const realToday = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const today = opts.todayIso ?? realToday;

  const filtered = tasks.filter((t) => {
    if (opts.subjectId && opts.subjectId !== 'all' && t.subjectId !== opts.subjectId) {
      return false;
    }
    if (opts.priority && opts.priority !== 'all' && t.priority !== opts.priority) {
      return false;
    }
    if (opts.scope === 'today' && t.dueDate !== today) return false;
    if (opts.scope === 'upcoming' && (t.dueDate <= today || t.status === 'done')) return false;
    if (opts.scope === 'completed' && t.status !== 'done') return false;
    if (q && !t.title.toLowerCase().includes(q) && !t.description.toLowerCase().includes(q)) {
      return false;
    }
    return true;
  });

  return [...filtered].sort((a, b) => {
    if (opts.sortBy === 'priority') {
      return PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
    }
    if (opts.sortBy === 'title') {
      return a.title.localeCompare(b.title);
    }
    return a.dueDate.localeCompare(b.dueDate);
  });
}

export interface SearchHit {
  id: string;
  category: 'Subject' | 'Task' | 'Note' | 'Topic';
  title: string;
  subtitle: string;
  targetRoute: 'subjects' | 'tasks' | 'notes';
  targetId: string;
}

export function searchWorkspace(
  query: string,
  data: { subjects: Subject[]; tasks: TaskItem[]; notes: NoteItem[] }
): SearchHit[] {
  const q = query.trim().toLowerCase();
  const hits: SearchHit[] = [];

  for (const s of data.subjects) {
    if (!q || s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q)) {
      hits.push({
        id: `sub-${s.id}`,
        category: 'Subject',
        title: `${s.code} — ${s.name}`,
        subtitle: `${s.totalHours}h logged · Target ${s.targetGrade}`,
        targetRoute: 'subjects',
        targetId: s.id,
      });
    }
    if (q) {
      for (const ch of s.chapters) {
        for (const tp of ch.topics) {
          if (tp.title.toLowerCase().includes(q)) {
            hits.push({
              id: `topic-${tp.id}`,
              category: 'Topic',
              title: tp.title,
              subtitle: `${s.code} · ${formatChapterTitle(s, ch)}`,
              targetRoute: 'subjects',
              targetId: s.id,
            });
          }
        }
      }
    }
  }

  for (const t of data.tasks) {
    if (!q || t.title.toLowerCase().includes(q)) {
      hits.push({
        id: `task-${t.id}`,
        category: 'Task',
        title: t.title,
        subtitle: `Due ${t.dueLabel} · ${t.priority} priority`,
        targetRoute: 'tasks',
        targetId: t.id,
      });
    }
  }

  for (const n of data.notes) {
    if (!q || n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q)) {
      hits.push({
        id: `note-${n.id}`,
        category: 'Note',
        title: n.title,
        subtitle: `Updated ${n.updatedAt}`,
        targetRoute: 'notes',
        targetId: n.id,
      });
    }
  }

  return hits.slice(0, q ? 12 : 6);
}

export function formatTimerSeconds(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const hrs = Math.floor(safe / 3600);
  const mins = Math.floor((safe % 3600) / 60);
  const secs = safe % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  if (hrs > 0) {
    return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
  }
  return `${pad(mins)}:${pad(secs)}`;
}

/** Display a completed countdown as an elapsed overtime, preserving its planned duration. */
export function formatFocusCountdown(secondsLeft: number, elapsedSeconds: number, totalSeconds: number, allowOvertime = true): string {
  if (allowOvertime && secondsLeft === 0 && totalSeconds > 0 && elapsedSeconds >= totalSeconds) {
    const overtime = Math.max(0, Math.floor(elapsedSeconds - totalSeconds));
    return `+${String(Math.floor(overtime / 3600)).padStart(2, '0')}.${String(Math.floor(overtime / 60) % 60).padStart(2, '0')}.${String(overtime % 60).padStart(2, '0')}`;
  }
  return formatTimerSeconds(secondsLeft);
}

export function formatHourLabel(hourFloat: number): string {
  const h = Math.floor(hourFloat);
  const m = Math.round((hourFloat - h) * 60);
  const suffix = h >= 12 ? 'PM' : 'AM';
  const displayH = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${displayH}:00 ${suffix}` : `${displayH}:${String(m).padStart(2, '0')} ${suffix}`;
}
