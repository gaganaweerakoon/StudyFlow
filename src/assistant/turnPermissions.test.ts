import test from 'node:test';
import assert from 'node:assert/strict';
import { allowedTurnTools } from './turnPermissions';

test('calendar then note in the same thread grants independent permissions', () => {
  assert.deepEqual(allowedTurnTools('Schedule chemistry tomorrow at 7'), ['create_event']);
  assert.deepEqual(allowedTurnTools('Make a Sinhala note from this PDF in Chemistry Unit 3'), ['create_note']);
});
test('attachment, question, negative or ambiguous request grants no write', () => {
  for (const prompt of ['', 'Explain this calendar', 'How do I create a note?', 'Do not create an event', 'Make a note or event']) {
    assert.deepEqual(allowedTurnTools(prompt), []);
  }
});
