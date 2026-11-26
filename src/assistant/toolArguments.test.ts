import assert from 'node:assert/strict';
import test from 'node:test';
import { validToolArguments } from './toolArguments';

test('native calls reject extra fields, missing fields, and wrong nested types', () => {
  const note = { title: 'Redox', content: 'Review', syllabusLinks: { unitIds: ['unit-redox'] } };
  assert.ok(validToolArguments('create_note', note));
  assert.equal(validToolArguments('create_note', { ...note, action:'create_event' }), false);
  assert.equal(validToolArguments('create_note', { ...note, syllabusLinks: { unitIds:[1] } }), false);
  assert.equal(validToolArguments('create_note', { title:note.title }), false);
  assert.equal(validToolArguments('create_event', { title:'Lesson', date:'2027-01-10', startHour:'9' }), false);
});
