import assert from 'node:assert/strict';
import test from 'node:test';
import type { WorkspaceSnapshot } from '../context/AppContext';
import type { GoalItem, TaskItem } from '../types/studyflow';
import { wipeWorkspace } from '../desktop/wipeWorkspace';

const task: TaskItem = {id: 'task-1', title: 'Review', subjectId: '', dueDate: '', dueLabel: '', priority: 'medium', status: 'done', estimatedMinutes: 30, description: '', subtasks: []};
const goal: GoalItem = {id: 'goal-1', title: 'Review', category: 'tasks', current: 2, target: 3, unit: 'tasks', deadline: '', milestones: [{id:'m1',label:'Linked',date:'',taskId:task.id,done:true},{id:'m2',label:'Standalone',date:'',done:true},{id:'m3',label:'Orphan',date:'',taskId:'missing',done:false}]};
const fixture = () => ({tasks:[task], goals:[goal], legacyArchive:{tasks:[{id:1}]}} as unknown as WorkspaceSnapshot);

test('task reset removes all task-linked milestones, preserves standalone progress and does not mutate inputs', () => {
  const before = fixture();
  const after = wipeWorkspace(before,'tasks');
  assert.deepEqual(after.tasks, []);
  assert.deepEqual(after.legacyArchive?.tasks, []);
  assert.deepEqual(after.goals[0].milestones, [goal.milestones[1]]);
  assert.equal(after.goals[0].current, 1);
  assert.equal(before.tasks.length, 1);
  assert.equal(before.goals[0].milestones.length,3);
});
test('task reset also clears task links from the pre-import recovery snapshot', () => {
  const after = wipeWorkspace({...fixture(), previousWorkspace: fixture()}, 'tasks');
  assert.deepEqual(after.previousWorkspace?.tasks, []);
  assert.deepEqual(after.previousWorkspace?.goals[0].milestones,[goal.milestones[1]]);
});
