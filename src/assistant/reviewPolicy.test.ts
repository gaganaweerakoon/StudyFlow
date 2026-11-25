import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeReviewEdits, reviewSelection, selectedReviewAction } from './reviewPolicy.ts';
import type { WorkspaceEdit } from './workspaceEdit';
const make = (action: string, extra: Partial<WorkspaceEdit> = {}): WorkspaceEdit => ({ action, title: action, apply: () => true, ...extra });

test('mixed changes preserve both approval gates and start sensitive changes unchecked', () => {
  const edits = normalizeReviewEdits([make('delete_note'), make('create_task'), make('create_note')]);
  assert.deepEqual(edits.map(e => e.reviewKind), ['destructive', 'approval', 'approval']);
  assert.ok(edits.every(e => e.confirmation));
  assert.deepEqual(reviewSelection(edits), { 0: false, 1: true, 2: true });
  assert.deepEqual(reviewSelection(edits, false), { 0: false, 1: false, 2: false });
  assert.equal(selectedReviewAction(edits[0], undefined), false);
  assert.equal(selectedReviewAction(edits[0], true), true);
});
test('bundle items count toward bulk approval and selections fail closed', () => {
  const edits = normalizeReviewEdits([make('create_flashcards', { reviewItems: [{id:'a',label:'A'}, {id:'b',label:'B'}], applySelected: () => true }), make('create_task')]);
  assert.ok(edits.every(e => e.confirmation));
  assert.deepEqual(reviewSelection(edits), {0:['a','b'],1:true});
  assert.deepEqual(selectedReviewAction(edits[0], ['a','invalid','a']), ['a']);
  assert.equal(selectedReviewAction(edits[0], true), false);
  assert.equal(selectedReviewAction(edits[0], []), false);
  assert.equal(selectedReviewAction(edits[1], ['a']), false);
});
