import test from 'node:test';
import assert from 'node:assert/strict';
import type { GoalItem } from '../types/studyflow';
import { applyMilestoneToggle, applyMilestoneAdd, applyMilestoneRemove, computeInitialGoalProgress, syncGoalsForTaskStatusChange, clampGoalProgress } from './goalProgress.ts';

const now = '2026-11-25T00:00:00Z';
function goal(overrides: Partial<GoalItem> = {}): GoalItem {
  return { id: 'g', title: 'Study', category: 'daily', current: 0, target: 4, unit: 'hrs', deadline: 'Nov 25', milestones: ['a','b','c'].map(id => ({ id, label: id, date: 'Nov 25', done: false, taskId: id })), ...overrides };
}

test('three milestones exactly complete a four-hour goal and undo without drift', () => {
  let g = goal();
  for (const id of ['a','b','c']) g = applyMilestoneToggle(g, id, true, now);
  assert.equal(g.current, 4);
  assert.equal(g.completedAt, now);
  for (const id of ['c','a','b']) g = applyMilestoneToggle(g, id, false, now);
  assert.equal(g.current, 0);
  assert.equal(g.completedAt, undefined);
});

test('linked tasks use the same cumulative credit and duplicate events are no-ops', () => {
  let gs = [goal()];
  for (const id of ['a','b','c']) gs = syncGoalsForTaskStatusChange(gs, id, true, now);
  assert.equal(gs[0].current, 4);
  assert.equal(syncGoalsForTaskStatusChange(gs, 'c', true, now), gs);
  assert.equal(syncGoalsForTaskStatusChange(gs, 'c', false, now)[0].current, 2.7);
});

test('initial progress uses cumulative credit', () => {
  const g = goal();
  assert.equal(computeInitialGoalProgress(g.target, g.unit, g.category, g.milestones.map(m => ({...m, done: true}))), 4);
});

test('discrete goals retain manual credit and support milestone add/remove', () => {
  const g = goal({ category: 'tasks', unit: 'tasks', target: 8, current: 3, milestones: [] });
  const added = applyMilestoneAdd(g, { id: 'm', label: 'Task', done: true, date: 'Nov 25' }, now);
  assert.equal(added.current, 4);
  assert.equal(applyMilestoneRemove(added, 'm', now).current, 3);
});

test('fractional targets are never exceeded by rounding', () => {
  assert.equal(clampGoalProgress(1.26, 1.26), 1.26);
  assert.equal(clampGoalProgress(1.24, 1.24), 1.24);
  assert.equal(clampGoalProgress(NaN, 4), 0);
});
