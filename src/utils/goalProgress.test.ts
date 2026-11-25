import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { GoalItem } from '../types/studyflow';
import {
  applyMilestoneAdd,
  applyMilestoneRemove,
  applyMilestoneToggle,
  computeInitialGoalProgress,
  milestoneProgressStep,
  syncGoalsForTaskStatusChange,
} from './goalProgress.ts';

function makeGoal(overrides: Partial<GoalItem> = {}): GoalItem {
  return {
    id: 'g-test',
    title: 'Test Goal',
    category: 'tasks',
    current: 0,
    target: 4,
    unit: 'tasks',
    deadline: 'Dec 1, 2026',
    milestones: [],
    ...overrides,
  };
}

describe('goalProgress', () => {
  it('counts standalone milestone completion toward progress for discrete and continuous goals', () => {
    const topicGoal = makeGoal({
      category: 'syllabus',
      current: 5,
      target: 8,
      unit: 'topics',
      milestones: [
        { id: 'm1', label: 'Flow theorems', done: true, date: 'Nov 1' },
        { id: 'm2', label: 'Karp reductions', done: false, date: 'Nov 5' },
        { id: 'm3', label: 'Approximations', done: false, date: 'Nov 9' },
      ],
    });

    const afterComplete = applyMilestoneToggle(topicGoal, 'm2', true, '2026-11-24T12:00:00Z');
    assert.equal(afterComplete.current, 6);
    assert.equal(afterComplete.milestones[1].done, true);

    const afterUndo = applyMilestoneToggle(afterComplete, 'm2', false, '2026-11-24T12:05:00Z');
    assert.equal(afterUndo.current, 5);
    assert.equal(afterUndo.milestones[1].done, false);

    const hoursGoal = makeGoal({
      category: 'daily',
      current: 3.4,
      target: 4.5,
      unit: 'hrs',
      milestones: [
        { id: 'm1', label: 'Morning', done: true, date: '09:00 AM' },
        { id: 'm2', label: 'Midday', done: true, date: '11:30 AM' },
        { id: 'm3', label: 'Afternoon', done: false, date: '02:00 PM' },
      ],
    });

    assert.equal(milestoneProgressStep(hoursGoal), 1.5);
    const completedHoursGoal = applyMilestoneToggle(hoursGoal, 'm3', true, '2026-11-24T15:00:00Z');
    assert.equal(completedHoursGoal.current, 4.5);
    assert.equal(completedHoursGoal.completedAt, '2026-11-24T15:00:00Z');

    const uncheckedHoursGoal = applyMilestoneToggle(completedHoursGoal, 'm3', false, '2026-11-24T15:05:00Z');
    assert.equal(uncheckedHoursGoal.current, 3);
    assert.equal(uncheckedHoursGoal.completedAt, undefined);
  });

  it('syncs goal progress and milestones when a linked task is completed or reopened anywhere in the app', () => {
    const goals: GoalItem[] = [
      makeGoal({
        id: 'g-tasks',
        category: 'tasks',
        current: 1,
        target: 3,
        unit: 'tasks',
        milestones: [
          { id: 'm1', label: 'PSet 1', done: true, date: 'Nov 20', taskId: 'tsk-1' },
          { id: 'm2', label: 'PSet 2', done: false, date: 'Nov 24', taskId: 'tsk-2' },
          { id: 'm3', label: 'PSet 3', done: false, date: 'Nov 26', taskId: 'tsk-3' },
        ],
      }),
      makeGoal({
        id: 'g-hours',
        category: 'weekly',
        current: 2,
        target: 4,
        unit: 'hrs',
        milestones: [
          { id: 'm4', label: 'PSet 2', done: false, date: 'Nov 24', taskId: 'tsk-2' },
          { id: 'm5', label: 'Exam prep', done: true, date: 'Nov 25' },
        ],
      }),
    ];

    const afterDone = syncGoalsForTaskStatusChange(goals, 'tsk-2', true, '2026-11-24T14:00:00Z');
    assert.equal(afterDone[0].current, 2);
    assert.equal(afterDone[0].milestones[1].done, true);
    assert.equal(afterDone[1].current, 4);
    assert.equal(afterDone[1].milestones[0].done, true);
    assert.equal(afterDone[1].completedAt, '2026-11-24T14:00:00Z');

    // Re-applying the same status must be a no-op (prevents double-counting)
    const afterDuplicate = syncGoalsForTaskStatusChange(afterDone, 'tsk-2', true, '2026-11-24T14:01:00Z');
    assert.equal(afterDuplicate, afterDone);
    assert.equal(afterDuplicate[0].current, 2);

    // Reopening the task deducts progress and clears completedAt
    const afterReopen = syncGoalsForTaskStatusChange(afterDone, 'tsk-2', false, '2026-11-24T14:02:00Z');
    assert.equal(afterReopen[0].current, 1);
    assert.equal(afterReopen[0].milestones[1].done, false);
    assert.equal(afterReopen[1].current, 2);
    assert.equal(afterReopen[1].completedAt, undefined);
  });

  it('credits progress when linking an already-completed task and deducts when removing a completed milestone', () => {
    const goal = makeGoal({
      category: 'tasks',
      current: 0,
      target: 2,
      unit: 'tasks',
      milestones: [],
    });

    const withDoneLinked = applyMilestoneAdd(
      goal,
      { id: 'm1', label: 'Finished lab', done: true, date: 'Nov 24', taskId: 'tsk-done' },
      '2026-11-24T16:00:00Z',
    );
    assert.equal(withDoneLinked.current, 1);

    const afterRemove = applyMilestoneRemove(withDoneLinked, 'm1', '2026-11-24T16:05:00Z');
    assert.equal(afterRemove.current, 0);
    assert.equal(afterRemove.milestones.length, 0);
  });

  it('computes initial goal progress when created with already-completed linked tasks', () => {
    const initial = computeInitialGoalProgress(3, 'tasks', 'tasks', [
      { id: 'm1', label: 'Done task', done: true, date: 'Nov 23', taskId: 'tsk-1' },
      { id: 'm2', label: 'Open task', done: false, date: 'Nov 25', taskId: 'tsk-2' },
    ]);
    assert.equal(initial, 1);
  });
});
