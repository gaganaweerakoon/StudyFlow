import type { GoalItem, GoalMilestone } from '../types/studyflow';

type GoalScale = Pick<GoalItem, 'category' | 'target' | 'unit' | 'milestones'>;
const DISCRETE_ONE_UNITS = new Set('task tasks topic topics chapter chapters milestone milestones session sessions set sets pset psets exam exams paper papers module modules lecture lectures assignment assignments goal goals'.split(' '));
const DECIMAL_UNITS = new Set(['hr', 'hrs', 'hour', 'hours']);

export function roundProgress(value: number): number {
  return Math.round(value * 10) / 10;
}

export function clampGoalProgress(value: number, target: number): number {
  const safe = Math.max(0, Number.isFinite(value) ? value : 0);
  if (target > 0 && safe >= target) return target;
  const rounded = roundProgress(safe);
  return target > 0 ? Math.min(target, rounded) : rounded;
}

function unitOf(goal: GoalScale): string {
  return (goal.unit || '').trim().toLowerCase();
}
function discrete(goal: GoalScale): boolean {
  const unit = unitOf(goal);
  return DISCRETE_ONE_UNITS.has(unit) || (goal.category === 'tasks' && !unit);
}

// Round cumulative credit, not each individual milestone. This makes
// 3/3 milestones of a 4-hour goal add up to 4 hours instead of 3.9.
function credit(goal: GoalScale): number {
  const done = goal.milestones.filter(m => m.done).length;
  if (!done) return 0;
  if (discrete(goal)) return clampGoalProgress(done, goal.target);
  const target = goal.target > 0 ? goal.target : goal.milestones.length;
  const share = target * done / goal.milestones.length;
  const value = DECIMAL_UNITS.has(unitOf(goal)) ? roundProgress(share) : Math.round(share);
  return done === goal.milestones.length ? target : clampGoalProgress(value, target);
}

export function milestoneProgressStep(goal: GoalScale, milestoneCount = goal.milestones.length): number {
  if (discrete(goal)) return 1;
  const share = Math.max(1, goal.target || 1) / Math.max(1, milestoneCount);
  return DECIMAL_UNITS.has(unitOf(goal)) ? Math.max(0.1, roundProgress(share)) : Math.max(1, Math.round(share));
}

export function withGoalCompletionState(goal: GoalItem, nextCurrent: number, nowIso = new Date().toISOString()): GoalItem {
  const next = { ...goal, current: clampGoalProgress(nextCurrent, goal.target) };
  if (next.target > 0 && next.current >= next.target) next.completedAt = goal.completedAt ?? nowIso;
  else delete next.completedAt;
  return next;
}

export function computeInitialGoalProgress(target: number, unit: string, category: GoalItem['category'], milestones: GoalMilestone[]): number {
  return credit({ target, unit, category, milestones });
}

function updateMilestones(goal: GoalItem, milestones: GoalMilestone[], nowIso: string): GoalItem {
  const next = { ...goal, milestones };
  return withGoalCompletionState(next, goal.current + credit(next) - credit(goal), nowIso);
}

export function applyMilestoneToggle(goal: GoalItem, milestoneId: string, nextDone: boolean, nowIso = new Date().toISOString()): GoalItem {
  if (!goal.milestones.some(m => m.id === milestoneId && m.done !== nextDone)) return goal;
  return updateMilestones(goal, goal.milestones.map(m => m.id === milestoneId ? { ...m, done: nextDone } : m), nowIso);
}

export function syncGoalsForTaskStatusChange(goals: GoalItem[], taskId: string, nextDone: boolean, nowIso = new Date().toISOString()): GoalItem[] {
  let changed = false;
  const next = goals.map(goal => {
    if (!goal.milestones.some(m => m.taskId === taskId && m.done !== nextDone)) return goal;
    changed = true;
    return updateMilestones(goal, goal.milestones.map(m => m.taskId === taskId ? { ...m, done: nextDone } : m), nowIso);
  });
  return changed ? next : goals;
}

export function applyMilestoneAdd(goal: GoalItem, milestone: GoalMilestone, nowIso = new Date().toISOString()): GoalItem {
  return updateMilestones(goal, [...goal.milestones, milestone], nowIso);
}

export function applyMilestoneRemove(goal: GoalItem, milestoneId: string, nowIso = new Date().toISOString()): GoalItem {
  if (!goal.milestones.some(m => m.id === milestoneId)) return goal;
  return updateMilestones(goal, goal.milestones.filter(m => m.id !== milestoneId), nowIso);
}
