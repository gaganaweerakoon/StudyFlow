import assert from 'node:assert/strict';
import test from 'node:test';
import {
  countGoalsByStatus,
  DEFAULT_GOAL_VIEW_PREFERENCES,
  filterAndSortGoals,
  formatAchievementMilestoneSummary,
  getGoalMilestoneCounts,
  getGoalStatus,
  loadGoalViewPreferences,
  normalizeGoalUnitLabel,
  parseGoalDeadlineIso,
  saveGoalViewPreferences,
} from './goalFilters.ts';
import type { GoalItem, TaskItem } from '../types/studyflow.ts';

function makeGoal(overrides: Partial<GoalItem> = {}): GoalItem {
  return {
    id: 'g-1',
    title: 'Sample Goal',
    category: 'subject',
    current: 0,
    target: 4,
    unit: 'milestones',
    deadline: '2026-12-05',
    createdAt: '2026-11-20T10:00:00Z',
    milestones: [],
    ...overrides,
  };
}

function makeTask(overrides: Partial<TaskItem> = {}): TaskItem {
  return {
    id: 't-1',
    title: 'Linked Task',
    subjectId: 'cs340',
    dueDate: '2026-11-28',
    dueLabel: 'Nov 28',
    priority: 'medium',
    status: 'todo',
    estimatedMinutes: 30,
    description: '',
    subtasks: [],
    ...overrides,
  };
}

test('parseGoalDeadlineIso parses ISO, formatted dates, and relative strings cleanly', () => {
  const ref = '2026-11-25';
  assert.equal(parseGoalDeadlineIso('2026-12-05', ref), '2026-12-05');
  assert.equal(parseGoalDeadlineIso('Dec 5, 2026', ref), '2026-12-05');
  assert.equal(parseGoalDeadlineIso('Sun, Nov 29', ref), '2026-11-29');
  assert.equal(parseGoalDeadlineIso('Today, 10:00 PM', ref), '2026-11-25');
  assert.equal(parseGoalDeadlineIso('Tomorrow', ref), '2026-11-26');
  assert.equal(parseGoalDeadlineIso('Yesterday', ref), '2026-11-24');
  assert.equal(parseGoalDeadlineIso('No deadline', ref), null);
});

test('getGoalStatus resolves completed, overdue, in_progress, and not_started including linked tasks', () => {
  const ref = '2026-11-25';
  const taskDone = makeTask({ id: 't-done', status: 'done' });
  const taskOpen = makeTask({ id: 't-open', status: 'todo' });
  const taskMap = new Map<string, TaskItem>([
    [taskDone.id, taskDone],
    [taskOpen.id, taskOpen],
  ]);

  const completed = makeGoal({
    id: 'g-comp',
    current: 4,
    target: 4,
    deadline: '2026-11-20',
    completedAt: '2026-11-20T12:00:00Z',
  });
  const overdue = makeGoal({
    id: 'g-over',
    current: 1,
    target: 4,
    deadline: 'Nov 23, 2026',
  });
  const notStarted = makeGoal({
    id: 'g-new',
    current: 0,
    target: 3,
    deadline: '2026-12-01',
    milestones: [{ id: 'm1', label: 'First step', done: false, date: 'Nov 29', taskId: 't-open' }],
  });
  const inProgressViaTask = makeGoal({
    id: 'g-prog',
    current: 0,
    target: 2,
    deadline: '2026-12-01',
    milestones: [{ id: 'm2', label: 'Linked', done: false, date: 'Nov 28', taskId: 't-done' }],
  });

  assert.equal(getGoalStatus(completed, taskMap, ref), 'completed');
  assert.equal(getGoalStatus(overdue, taskMap, ref), 'overdue');
  assert.equal(getGoalStatus(notStarted, taskMap, ref), 'not_started');
  assert.equal(getGoalStatus(inProgressViaTask, taskMap, ref), 'in_progress');
});

test('filterAndSortGoals combines subject, status, category, and search filters accurately', () => {
  const ref = '2026-11-25';
  const taskMap = new Map<string, TaskItem>();
  const goals: GoalItem[] = [
    makeGoal({
      id: 'g-1',
      title: 'Algorithms Proof Set',
      category: 'syllabus',
      subjectId: 'cs340',
      current: 2,
      target: 4,
      deadline: '2026-12-05',
      createdAt: '2026-11-20T09:00:00Z',
    }),
    makeGoal({
      id: 'g-2',
      title: 'Algorithms Past Paper Drill',
      category: 'syllabus',
      subjectId: 'cs340',
      current: 0,
      target: 3,
      deadline: '2026-11-22',
      createdAt: '2026-11-21T09:00:00Z',
    }),
    makeGoal({
      id: 'g-3',
      title: 'Organic Synthesis Cards',
      category: 'revision',
      subjectId: 'chem210',
      current: 5,
      target: 5,
      deadline: '2026-11-24',
      completedAt: '2026-11-24T12:00:00Z',
      createdAt: '2026-11-18T09:00:00Z',
    }),
    makeGoal({
      id: 'g-4',
      title: 'Daily Reading Habit',
      category: 'daily',
      subjectId: undefined,
      current: 0,
      target: 2,
      deadline: '2026-12-01',
      createdAt: '2026-11-24T09:00:00Z',
    }),
  ];

  // Subject + status + search combined
  const overdueAlgo = filterAndSortGoals(
    goals,
    {
      categoryFilter: 'all',
      subjectFilter: 'cs340',
      statusFilter: 'overdue',
      searchQuery: 'algorithms',
      sortBy: 'due-asc',
    },
    taskMap,
    ref,
  );
  assert.deepEqual(overdueAlgo.map((g) => g.id), ['g-2']);

  // Completed filter
  const completedOnly = filterAndSortGoals(
    goals,
    {
      categoryFilter: 'all',
      subjectFilter: 'all',
      statusFilter: 'completed',
      searchQuery: '',
      sortBy: 'due-asc',
    },
    taskMap,
    ref,
  );
  assert.deepEqual(completedOnly.map((g) => g.id), ['g-3']);

  // General (no subject) + not_started
  const generalNotStarted = filterAndSortGoals(
    goals,
    {
      categoryFilter: 'all',
      subjectFilter: 'general',
      statusFilter: 'not_started',
      searchQuery: '',
      sortBy: 'due-asc',
    },
    taskMap,
    ref,
  );
  assert.deepEqual(generalNotStarted.map((g) => g.id), ['g-4']);

  // In-progress includes g-1 (2/4, future deadline); g-2 is overdue
  const inProgress = filterAndSortGoals(
    goals,
    {
      categoryFilter: 'all',
      subjectFilter: 'all',
      statusFilter: 'in_progress',
      searchQuery: '',
      sortBy: 'due-asc',
    },
    taskMap,
    ref,
  );
  assert.deepEqual(inProgress.map((g) => g.id), ['g-1']);

  assert.deepEqual(countGoalsByStatus(goals, taskMap, ref), {
    all: 4,
    in_progress: 1,
    completed: 1,
    not_started: 1,
    overdue: 1,
  });
});

test('filterAndSortGoals supports all sorting modes including remaining milestones and creation date', () => {
  const ref = '2026-11-25';
  const taskDone = makeTask({ id: 't-done', status: 'done' });
  const taskMap = new Map<string, TaskItem>([[taskDone.id, taskDone]]);

  const gAlpha = makeGoal({
    id: 'g-a',
    title: 'Beta Goal',
    current: 1,
    target: 4, // 25%
    deadline: '2026-12-10',
    createdAt: '2026-11-10T10:00:00Z',
    milestones: [
      { id: 'm1', label: 'A', done: false, date: 'Dec 1' },
      { id: 'm2', label: 'B', done: false, date: 'Dec 2' },
      { id: 'm3', label: 'C', done: false, date: 'Dec 3' },
    ], // 3 remaining
  });
  const gBeta = makeGoal({
    id: 'g-b',
    title: 'Alpha Goal',
    current: 3,
    target: 4, // 75%
    deadline: '2026-12-01',
    createdAt: '2026-11-24T10:00:00Z',
    milestones: [
      { id: 'm4', label: 'D', done: false, date: 'Nov 28', taskId: 't-done' }, // resolved done via task!
      { id: 'm5', label: 'E', done: false, date: 'Nov 30' },
    ], // 1 remaining
  });
  const gGamma = makeGoal({
    id: 'g-c',
    title: 'Gamma Goal',
    current: 2,
    target: 4, // 50%
    deadline: '2026-12-20',
    createdAt: '2026-11-15T10:00:00Z',
    milestones: [], // 0 remaining
  });

  const all = [gAlpha, gBeta, gGamma];

  const by = (sortBy: Parameters<typeof filterAndSortGoals>[1]['sortBy']) =>
    filterAndSortGoals(
      all,
      {
        categoryFilter: 'all',
        subjectFilter: 'all',
        statusFilter: 'all',
        searchQuery: '',
        sortBy,
      },
      taskMap,
      ref,
    ).map((g) => g.id);

  assert.deepEqual(by('title-asc'), ['g-b', 'g-a', 'g-c']);
  assert.deepEqual(by('title-desc'), ['g-c', 'g-a', 'g-b']);
  assert.deepEqual(by('due-asc'), ['g-b', 'g-a', 'g-c']);
  assert.deepEqual(by('due-desc'), ['g-c', 'g-a', 'g-b']);
  assert.deepEqual(by('created-desc'), ['g-b', 'g-c', 'g-a']);
  assert.deepEqual(by('created-asc'), ['g-a', 'g-c', 'g-b']);
  assert.deepEqual(by('progress-desc'), ['g-b', 'g-c', 'g-a']);
  assert.deepEqual(by('progress-asc'), ['g-a', 'g-c', 'g-b']);
  assert.deepEqual(by('remaining-asc'), ['g-c', 'g-b', 'g-a']);
  assert.deepEqual(by('remaining-desc'), ['g-a', 'g-b', 'g-c']);

  assert.deepEqual(getGoalMilestoneCounts(gBeta, taskMap), {
    completed: 1,
    total: 2,
    remaining: 1,
  });
});

test('normalizeGoalUnitLabel and formatAchievementMilestoneSummary use Milestones instead of Lessons', () => {
  const taskMap = new Map<string, TaskItem>();

  assert.equal(normalizeGoalUnitLabel('lessons'), 'milestones');
  assert.equal(normalizeGoalUnitLabel('Lessons'), 'Milestones');
  assert.equal(normalizeGoalUnitLabel('lesson'), 'milestone');
  assert.equal(normalizeGoalUnitLabel('hrs'), 'hrs');

  const eightMilestonesGoal = makeGoal({
    current: 8,
    target: 8,
    unit: 'lessons',
    milestones: Array.from({ length: 8 }, (_, idx) => ({
      id: `m-${idx}`,
      label: `Step ${idx + 1}`,
      done: true,
      date: 'Nov 24',
    })),
  });
  assert.equal(
    formatAchievementMilestoneSummary(eightMilestonesGoal, taskMap),
    '8/8 Milestones Completed',
  );

  const legacyLessonsWithoutArray = makeGoal({
    current: 8,
    target: 8,
    unit: 'Lessons',
    milestones: [],
  });
  assert.equal(
    formatAchievementMilestoneSummary(legacyLessonsWithoutArray, taskMap),
    '8/8 Milestones Completed',
  );
});

test('loadGoalViewPreferences and saveGoalViewPreferences persist across restarts and ignore corrupt payloads', () => {
  const store = new Map<string, string>();
  const mockStorage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, val: string) => {
      store.set(key, val);
    },
  };

  assert.deepEqual(loadGoalViewPreferences(mockStorage), DEFAULT_GOAL_VIEW_PREFERENCES);

  const nextPrefs = {
    ...DEFAULT_GOAL_VIEW_PREFERENCES,
    viewMode: 'list' as const,
    subjectFilter: 'cs340',
    statusFilter: 'in_progress' as const,
    searchQuery: 'Reductions',
    sortBy: 'remaining-desc' as const,
    milestoneOrders: { 'g-3': 'title' as const },
  };
  saveGoalViewPreferences(nextPrefs, mockStorage);

  const reloaded = loadGoalViewPreferences(mockStorage);
  assert.deepEqual(reloaded, nextPrefs);

  // Corrupt JSON falls back cleanly without crashing
  mockStorage.setItem('studyflow.goals.viewPrefs.v1', '{bad-json');
  assert.deepEqual(loadGoalViewPreferences(mockStorage), DEFAULT_GOAL_VIEW_PREFERENCES);
});
