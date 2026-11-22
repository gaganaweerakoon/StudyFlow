import test from 'node:test';
import assert from 'node:assert/strict';
import {
  scheduleFlashcardReview,
  calculateSubjectProgress,
  gradePracticeTest,
  calculateStudyAdherence,
  filterAndSortTasks,
  searchWorkspace,
  formatTimerSeconds,
  formatHourLabel,
} from './studyLogic';
import type { ChapterItem, QuizQuestion, TaskItem } from '../types/studyflow';

test('scheduleFlashcardReview updates intervals and ease accurately for all 4 ratings', () => {
  const base = { intervalDays: 4, easeFactor: 2.5 };

  const again = scheduleFlashcardReview(base, 'again');
  assert.equal(again.intervalDays, 1);
  assert.equal(again.easeFactor, 2.3);
  assert.equal(again.mastery, 'new');

  const hard = scheduleFlashcardReview(base, 'hard');
  assert.equal(hard.intervalDays, 5);
  assert.equal(hard.mastery, 'learning');

  const good = scheduleFlashcardReview(base, 'good');
  assert.equal(good.intervalDays, 10);
  assert.equal(good.mastery, 'learning');

  const easy = scheduleFlashcardReview(base, 'easy');
  assert.equal(easy.intervalDays, 14);
  assert.equal(easy.mastery, 'mature');
});

test('calculateSubjectProgress counts completed syllabus topics accurately', () => {
  const chapters: ChapterItem[] = [
    {
      id: 'c1',
      title: 'Graphs',
      topics: [
        { id: 't1', title: 'BFS', completed: true, difficulty: 'easy', confidence: 5, revisionStatus: 'mastered' },
        { id: 't2', title: 'Max Flow', completed: false, difficulty: 'hard', confidence: 2, revisionStatus: 'in_review' },
      ],
    },
    {
      id: 'c2',
      title: 'DP',
      topics: [
        { id: 't3', title: 'Knapsack', completed: true, difficulty: 'medium', confidence: 4, revisionStatus: 'mastered' },
      ],
    },
  ];

  const result = calculateSubjectProgress(chapters);
  assert.equal(result.completed, 2);
  assert.equal(result.total, 3);
  assert.equal(result.percent, 67);
});

test('gradePracticeTest scores MCQ and short answer questions and identifies weak topics', () => {
  const questions: QuizQuestion[] = [
    {
      id: 'q1',
      type: 'mcq',
      topic: 'Dynamic Programming',
      prompt: 'Time complexity of 0/1 Knapsack?',
      options: ['O(nW)', 'O(n log n)'],
      correctAnswer: 'O(nW)',
      explanation: 'Pseudo-polynomial in capacity W.',
    },
    {
      id: 'q2',
      type: 'short',
      topic: 'Graph Theory',
      prompt: 'Algorithm for shortest paths with negative edges?',
      correctAnswer: 'Bellman-Ford',
      explanation: 'Relaxes all edges V-1 times.',
    },
  ];

  const graded = gradePracticeTest(questions, { q1: 'O(nW)', q2: 'Dijkstra' });
  assert.equal(graded.correctCount, 1);
  assert.equal(graded.totalCount, 2);
  assert.equal(graded.scorePercent, 50);
  assert.deepEqual(graded.weakTopics, ['Graph Theory']);
});

test('calculateStudyAdherence computes total planned, actual, delta, and percentage', () => {
  const summary = calculateStudyAdherence([
    { planned: 4.0, actual: 3.5 },
    { planned: 4.0, actual: 4.5 },
  ]);
  assert.equal(summary.totalPlanned, 8.0);
  assert.equal(summary.totalActual, 8.0);
  assert.equal(summary.adherencePercent, 100);
  assert.equal(summary.deltaHours, 0);
});

test('filterAndSortTasks filters by scope and sorts by priority', () => {
  const tasks: TaskItem[] = [
    {
      id: '1',
      title: 'Low task',
      subjectId: 'cs340',
      dueDate: '2026-11-22',
      dueLabel: 'Today',
      priority: 'low',
      status: 'todo',
      estimatedMinutes: 30,
      description: 'Desc',
      subtasks: [],
    },
    {
      id: '2',
      title: 'High task',
      subjectId: 'cs340',
      dueDate: '2026-11-22',
      dueLabel: 'Today',
      priority: 'high',
      status: 'in_progress',
      estimatedMinutes: 45,
      description: 'Urgent',
      subtasks: [],
    },
  ];

  const sorted = filterAndSortTasks(tasks, { scope: 'today', sortBy: 'priority', todayIso: '2026-11-22' });
  assert.equal(sorted.length, 2);
  assert.equal(sorted[0].id, '2');
});

test('formatTimerSeconds and formatHourLabel produce clean tabular strings', () => {
  assert.equal(formatTimerSeconds(1500), '25:00');
  assert.equal(formatTimerSeconds(3665), '01:01:05');
  assert.equal(formatHourLabel(9.5), '9:30 AM');
  assert.equal(formatHourLabel(14), '2:00 PM');
});

test('searchWorkspace returns matching subjects, topics, tasks, and notes', () => {
  const hits = searchWorkspace('stokes', {
    subjects: [
      {
        id: 'math241',
        code: 'MATH 241',
        name: 'Multivariable Calculus',
        instructor: 'Dr. Chen',
        color: '#0D9488',
        icon: 'sigma',
        totalHours: 38,
        weeklyTargetHours: 7,
        lastStudied: 'Yesterday',
        nextExamDate: '2026-12-03',
        nextExamTitle: 'Final',
        currentGrade: 'A-',
        targetGrade: 'A',
        chapters: [
          {
            id: 'ch1',
            title: 'Vector Calculus',
            topics: [
              { id: 'tp1', title: 'Stokes Theorem', completed: false, difficulty: 'hard', confidence: 3, revisionStatus: 'in_review' },
            ],
          },
        ],
      },
    ],
    tasks: [],
    notes: [],
  });

  assert.equal(hits.length, 1);
  assert.equal(hits[0].category, 'Topic');
  assert.equal(hits[0].title, 'Stokes Theorem');
});
