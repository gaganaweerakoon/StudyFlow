import assert from 'node:assert/strict';
import test from 'node:test';
import { replyBubbles } from './replyBubbles';

test('only marked brief follow-ups split and at most three bubbles render', () => {
  assert.deepEqual(replyBubbles('Water has a bent shape.\n\nThe bond angle is about 104.5°.'), ['Water has a bent shape.\n\nThe bond angle is about 104.5°.']);
  assert.deepEqual(replyBubbles('A\n[Pip follow-up]\nB\n[Pip follow-up]\nC\n[Pip follow-up]\nD'), ['A','B','C\n\nD']);
  assert.equal(replyBubbles('## Redox\nExplanation\n[Pip follow-up]\nExample').length, 1);
});
