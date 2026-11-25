import { localDay } from '../assistant/workspaceContext';
import type { GoalItem, TaskItem } from '../types/studyflow';
import type { MilestoneOrder } from './milestoneSort';

export type GoalViewMode = 'cards' | 'list';
export type GoalStatusFilter = 'all' | 'in_progress' | 'completed' | 'not_started' | 'overdue';
export type GoalStatus = 'completed' | 'overdue' | 'in_progress' | 'not_started';
export type GoalSortBy =
  | 'due-asc'
  | 'due-desc'
  | 'title-asc'
  | 'title-desc'
  | 'created-desc'
  | 'created-asc'
  | 'progress-desc'
  | 'progress-asc'
  | 'remaining-asc'
  | 'remaining-desc';

export interface GoalViewPreferences {
  viewMode: GoalViewMode;
  categoryFilter: string;
  subjectFilter: string;
  statusFilter: GoalStatusFilter;
  searchQuery: string;
  sortBy: GoalSortBy;
  milestoneOrders: Record<string, MilestoneOrder>;
}

export const GOALS_PREFS_STORAGE_KEY = 'studyflow.goals.viewPrefs.v1';

export const DEFAULT_GOAL_VIEW_PREFERENCES: GoalViewPreferences = {
  viewMode: 'cards',
  categoryFilter: 'all',
  subjectFilter: 'all',
  statusFilter: 'all',
  searchQuery: '',
  sortBy: 'due-asc',
  milestoneOrders: {},
};

const VALID_VIEW_MODES = new Set<GoalViewMode>(['cards', 'list']);
const VALID_STATUS_FILTERS = new Set<GoalStatusFilter>([
  'all',
  'in_progress',
  'completed',
  'not_started',
  'overdue',
]);
const VALID_SORT_OPTIONS = new Set<GoalSortBy>([
  'due-asc',
  'due-desc',
  'title-asc',
  'title-desc',
  'created-desc',
  'created-asc',
  'progress-desc',
  'progress-asc',
  'remaining-asc',
  'remaining-desc',
]);
const VALID_MILESTONE_ORDERS = new Set<MilestoneOrder>([
  'due-asc',
  'due-desc',
  'title',
  'incomplete',
  'completed',
  'manual',
]);

const MONTH_INDEX: Record<string, number> = {
  jan: 1,
  january: 1,
  feb: 2,
  february: 2,
  mar: 3,
  march: 3,
  apr: 4,
  april: 4,
  may: 5,
  jun: 6,
  june: 6,
  jul: 7,
  july: 7,
  aug: 8,
  august: 8,
  sep: 9,
  sept: 9,
  september: 9,
  oct: 10,
  october: 10,
  nov: 11,
  november: 11,
  dec: 12,
  december: 12,
};

function shiftDayIso(baseIso: string, deltaDays: number): string {
  const [y, m, d] = baseIso.split('-').map(Number);
  const dt = new Date(y, (m || 1) - 1, d || 1);
  dt.setDate(dt.getDate() + deltaDays);
  return localDay(dt);
}

/**
 * Parses StudyFlow goal deadlines (`YYYY-MM-DD`, `"Today, 10:00 PM"`,
 * `"Sun, Nov 29"`, `"Dec 5, 2026"`, `"Nov 24"`, etc.) into `YYYY-MM-DD`.
 */
export function parseGoalDeadlineIso(
  deadline: string,
  referenceDayIso = localDay(),
): string | null {
  const raw = (deadline || '').trim();
  if (!raw) return null;

  const isoMatch = raw.match(/^(\d{4}-\d{2}-\d{2})(?:$|T|\s)/);
  if (isoMatch) return isoMatch[1];

  const lower = raw.toLowerCase();
  if (lower.startsWith('today')) return referenceDayIso;
  if (lower.startsWith('tomorrow')) return shiftDayIso(referenceDayIso, 1);
  if (lower.startsWith('yesterday')) return shiftDayIso(referenceDayIso, -1);

  // Strip optional leading weekday like "Sun, Nov 29" or "Fri, Nov 27, 2026"
  const withoutWeekday = raw.replace(/^[A-Za-z]{3,9},?\s+/, (prefix) => {
    const firstWord = prefix.replace(/[^A-Za-z]/g, '').toLowerCase();
    return MONTH_INDEX[firstWord] ? prefix : '';
  });

  const mdMatch = withoutWeekday.match(
    /^([A-Za-z]+)\s+(\d{1,2})(?:,?\s*(\d{4}))?/,
  );
  if (mdMatch) {
    const month = MONTH_INDEX[mdMatch[1].toLowerCase()];
    const day = Number(mdMatch[2]);
    const refYear = Number(referenceDayIso.slice(0, 4)) || new Date().getFullYear();
    const year = mdMatch[3] ? Number(mdMatch[3]) : refYear;
    if (month && day >= 1 && day <= 31) {
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }

  return null;
}

export function getGoalProgressPercent(
  goal: GoalItem,
  taskById?: ReadonlyMap<string, TaskItem>,
): number {
  if (goal.target > 0) {
    return Math.min(100, Math.round((goal.current / goal.target) * 100));
  }
  if (goal.milestones.length > 0 && taskById) {
    const { completed, total } = getGoalMilestoneCounts(goal, taskById);
    return total > 0 ? Math.min(100, Math.round((completed / total) * 100)) : 0;
  }
  return 0;
}

export function getGoalMilestoneCounts(
  goal: GoalItem,
  taskById: ReadonlyMap<string, TaskItem>,
): { completed: number; total: number; remaining: number } {
  const total = goal.milestones.length;
  let completed = 0;
  for (const ms of goal.milestones) {
    const linkedTask = ms.taskId ? taskById.get(ms.taskId) : undefined;
    const done = linkedTask ? linkedTask.status === 'done' : ms.done;
    if (done) completed += 1;
  }
  return {
    completed,
    total,
    remaining: Math.max(0, total - completed),
  };
}

export function isGoalCompleted(goal: GoalItem): boolean {
  return Boolean(goal.completedAt) || (goal.target > 0 && goal.current >= goal.target);
}

export function isGoalOverdue(
  goal: GoalItem,
  referenceDayIso = localDay(),
): boolean {
  if (isGoalCompleted(goal)) return false;
  const deadlineIso = parseGoalDeadlineIso(goal.deadline, referenceDayIso);
  if (!deadlineIso) return false;
  return deadlineIso < referenceDayIso;
}

export function getGoalStatus(
  goal: GoalItem,
  taskById: ReadonlyMap<string, TaskItem>,
  referenceDayIso = localDay(),
): GoalStatus {
  if (isGoalCompleted(goal)) return 'completed';
  if (isGoalOverdue(goal, referenceDayIso)) return 'overdue';
  const { completed } = getGoalMilestoneCounts(goal, taskById);
  if (goal.current <= 0 && completed === 0) return 'not_started';
  return 'in_progress';
}

export function matchesGoalStatusFilter(
  goal: GoalItem,
  filter: GoalStatusFilter,
  taskById: ReadonlyMap<string, TaskItem>,
  referenceDayIso = localDay(),
): boolean {
  if (filter === 'all') return true;
  return getGoalStatus(goal, taskById, referenceDayIso) === filter;
}

export function countGoalsByStatus(
  goals: GoalItem[],
  taskById: ReadonlyMap<string, TaskItem>,
  referenceDayIso = localDay(),
): Record<GoalStatusFilter, number> {
  const counts: Record<GoalStatusFilter, number> = {
    all: goals.length,
    in_progress: 0,
    completed: 0,
    not_started: 0,
    overdue: 0,
  };
  for (const goal of goals) {
    const status = getGoalStatus(goal, taskById, referenceDayIso);
    counts[status] += 1;
  }
  return counts;
}

export interface GoalFilterAndSortOptions {
  categoryFilter: string;
  subjectFilter: string;
  statusFilter: GoalStatusFilter;
  searchQuery: string;
  sortBy: GoalSortBy;
}

export function filterAndSortGoals(
  goals: GoalItem[],
  options: GoalFilterAndSortOptions,
  taskById: ReadonlyMap<string, TaskItem>,
  referenceDayIso = localDay(),
): GoalItem[] {
  const normalizedQuery = options.searchQuery.trim().toLowerCase();

  const indexed = goals
    .map((goal, index) => ({ goal, index }))
    .filter(({ goal }) => {
      if (options.categoryFilter !== 'all' && goal.category !== options.categoryFilter) {
        return false;
      }
      if (options.subjectFilter === 'general') {
        if (goal.subjectId) return false;
      } else if (
        options.subjectFilter !== 'all' &&
        goal.subjectId !== options.subjectFilter
      ) {
        return false;
      }
      if (
        !matchesGoalStatusFilter(goal, options.statusFilter, taskById, referenceDayIso)
      ) {
        return false;
      }
      if (normalizedQuery && !goal.title.toLowerCase().includes(normalizedQuery)) {
        return false;
      }
      return true;
    });

  indexed.sort((a, b) => {
    const ga = a.goal;
    const gb = b.goal;

    switch (options.sortBy) {
      case 'title-asc': {
        const cmp = ga.title.localeCompare(gb.title, undefined, { sensitivity: 'base' });
        return cmp !== 0 ? cmp : a.index - b.index;
      }
      case 'title-desc': {
        const cmp = gb.title.localeCompare(ga.title, undefined, { sensitivity: 'base' });
        return cmp !== 0 ? cmp : a.index - b.index;
      }
      case 'due-asc':
      case 'due-desc': {
        const da = parseGoalDeadlineIso(ga.deadline, referenceDayIso);
        const db = parseGoalDeadlineIso(gb.deadline, referenceDayIso);
        if (!da && !db) return a.index - b.index;
        if (!da) return 1;
        if (!db) return -1;
        const cmp =
          options.sortBy === 'due-asc' ? da.localeCompare(db) : db.localeCompare(da);
        return cmp !== 0 ? cmp : a.index - b.index;
      }
      case 'created-desc':
      case 'created-asc': {
        const ca = ga.createdAt ?? ga.completedAt ?? '';
        const cb = gb.createdAt ?? gb.completedAt ?? '';
        if (!ca && !cb) {
          return options.sortBy === 'created-desc'
            ? a.index - b.index
            : b.index - a.index;
        }
        if (!ca) return 1;
        if (!cb) return -1;
        const cmp =
          options.sortBy === 'created-desc'
            ? cb.localeCompare(ca)
            : ca.localeCompare(cb);
        return cmp !== 0 ? cmp : a.index - b.index;
      }
      case 'progress-desc':
      case 'progress-asc': {
        const pa = getGoalProgressPercent(ga, taskById);
        const pb = getGoalProgressPercent(gb, taskById);
        const cmp = options.sortBy === 'progress-desc' ? pb - pa : pa - pb;
        return cmp !== 0 ? cmp : a.index - b.index;
      }
      case 'remaining-asc':
      case 'remaining-desc': {
        const ra = getGoalMilestoneCounts(ga, taskById).remaining;
        const rb = getGoalMilestoneCounts(gb, taskById).remaining;
        const cmp = options.sortBy === 'remaining-asc' ? ra - rb : rb - ra;
        return cmp !== 0 ? cmp : a.index - b.index;
      }
      default:
        return a.index - b.index;
    }
  });

  return indexed.map((entry) => entry.goal);
}

/**
 * Ensures any legacy "lesson"/"lessons" unit label displays consistently
 * with generic milestone terminology throughout the Goals UI.
 */
export function normalizeGoalUnitLabel(unit: string): string {
  const trimmed = (unit || '').trim();
  if (!trimmed) return 'milestones';
  const lower = trimmed.toLowerCase();
  if (lower === 'lessons') return trimmed[0] === 'L' ? 'Milestones' : 'milestones';
  if (lower === 'lesson') return trimmed[0] === 'L' ? 'Milestone' : 'milestone';
  return trimmed;
}

/**
 * Formats the completion summary shown in Goal Achievement History
 * (e.g., "8/8 Milestones Completed").
 */
export function formatAchievementMilestoneSummary(
  goal: GoalItem,
  taskById: ReadonlyMap<string, TaskItem>,
): string {
  if (goal.milestones.length > 0) {
    const { completed, total } = getGoalMilestoneCounts(goal, taskById);
    const noun = total === 1 ? 'Milestone' : 'Milestones';
    return `${completed}/${total} ${noun} Completed`;
  }

  const normalized = normalizeGoalUnitLabel(goal.unit);
  const lower = normalized.toLowerCase();
  if (!lower || lower === 'milestone' || lower === 'milestones' || lower === 'goal') {
    const noun = goal.target === 1 ? 'Milestone' : 'Milestones';
    return `${goal.current}/${goal.target} ${noun} Completed`;
  }

  const capitalized = normalized.charAt(0).toUpperCase() + normalized.slice(1);
  return `${goal.current}/${goal.target} ${capitalized} Completed`;
}

export function sanitizeGoalViewPreferences(
  raw: unknown,
): GoalViewPreferences {
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_GOAL_VIEW_PREFERENCES, milestoneOrders: {} };
  }
  const obj = raw as Record<string, unknown>;
  const milestoneOrders: Record<string, MilestoneOrder> = {};
  if (obj.milestoneOrders && typeof obj.milestoneOrders === 'object') {
    for (const [k, v] of Object.entries(obj.milestoneOrders as Record<string, unknown>)) {
      if (typeof v === 'string' && VALID_MILESTONE_ORDERS.has(v as MilestoneOrder)) {
        milestoneOrders[k] = v as MilestoneOrder;
      }
    }
  }
  return {
    viewMode:
      typeof obj.viewMode === 'string' && VALID_VIEW_MODES.has(obj.viewMode as GoalViewMode)
        ? (obj.viewMode as GoalViewMode)
        : DEFAULT_GOAL_VIEW_PREFERENCES.viewMode,
    categoryFilter:
      typeof obj.categoryFilter === 'string' && obj.categoryFilter.trim()
        ? obj.categoryFilter
        : DEFAULT_GOAL_VIEW_PREFERENCES.categoryFilter,
    subjectFilter:
      typeof obj.subjectFilter === 'string' && obj.subjectFilter.trim()
        ? obj.subjectFilter
        : DEFAULT_GOAL_VIEW_PREFERENCES.subjectFilter,
    statusFilter:
      typeof obj.statusFilter === 'string' &&
      VALID_STATUS_FILTERS.has(obj.statusFilter as GoalStatusFilter)
        ? (obj.statusFilter as GoalStatusFilter)
        : DEFAULT_GOAL_VIEW_PREFERENCES.statusFilter,
    searchQuery: typeof obj.searchQuery === 'string' ? obj.searchQuery : '',
    sortBy:
      typeof obj.sortBy === 'string' && VALID_SORT_OPTIONS.has(obj.sortBy as GoalSortBy)
        ? (obj.sortBy as GoalSortBy)
        : DEFAULT_GOAL_VIEW_PREFERENCES.sortBy,
    milestoneOrders,
  };
}

export function loadGoalViewPreferences(
  storage: Pick<Storage, 'getItem'> | null | undefined = typeof window !== 'undefined'
    ? window.localStorage
    : undefined,
): GoalViewPreferences {
  if (!storage) return { ...DEFAULT_GOAL_VIEW_PREFERENCES, milestoneOrders: {} };
  try {
    const raw = storage.getItem(GOALS_PREFS_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_GOAL_VIEW_PREFERENCES, milestoneOrders: {} };
    return sanitizeGoalViewPreferences(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_GOAL_VIEW_PREFERENCES, milestoneOrders: {} };
  }
}

export function saveGoalViewPreferences(
  prefs: GoalViewPreferences,
  storage: Pick<Storage, 'setItem'> | null | undefined = typeof window !== 'undefined'
    ? window.localStorage
    : undefined,
): void {
  if (!storage) return;
  try {
    storage.setItem(GOALS_PREFS_STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // Ignore quota or storage restriction errors
  }
}
