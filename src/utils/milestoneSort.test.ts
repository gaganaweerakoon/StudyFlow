import test from 'node:test';
import assert from 'node:assert/strict';
import { sortMilestones } from './milestoneSort';
import type { GoalMilestone, TaskItem } from '../types/studyflow';
test('sort uses current linked task dates, titles and status; missing dates last', () => {
  const rows: GoalMilestone[] = [{id:'a',label:'Z',date:'2026-12-31',done:false,taskId:'t'}, {id:'b',label:'B',date:'2026-12-02',done:false},{id:'c',label:'C',date:'',done:false}];
  const task = {id:'t',title:'A',dueDate:'2026-12-01',status:'done'} as TaskItem;
  const tasks = new Map([[task.id,task]]);
  assert.deepEqual(sortMilestones(rows,tasks,'due-asc').map(x=>x.id), ['a','b','c']);
  assert.deepEqual(sortMilestones(rows,tasks,'due-desc').map(x=>x.id), ['b','a','c']);
  assert.deepEqual(sortMilestones(rows,tasks,'title').map(x=>x.id), ['a','b','c']);
  assert.deepEqual(sortMilestones(rows,tasks,'incomplete').map(x=>x.id), ['b','c','a']);
  assert.deepEqual(sortMilestones(rows,tasks,'completed').map(x=>x.id), ['a','b','c']);
  assert.deepEqual(sortMilestones(rows,tasks,'manual'),rows);
  assert.equal(rows[0].date,'2026-12-31');
  assert.equal(rows[0].taskId,'t');
});
