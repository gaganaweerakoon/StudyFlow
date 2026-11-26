import assert from 'node:assert/strict';
import test from 'node:test';
import { removeLegacySubject, unassignSubject } from './subjectReferences';

test('deleting a subject unassigns matching records without deleting or changing other records', () => {
  const before = [{ id: 'a', subjectId: 'chem', title: 'Notes' }, { id: 'b', subjectId: 'physics', title: 'Lab' }];
  const after = unassignSubject(before, 'chem');
  assert.deepEqual(after, [{ ...before[0], subjectId: '' }, before[1]]);
  assert.equal(before[0].subjectId, 'chem');
  assert.equal(after[1], before[1]);
});

test('legacy and modern recurring links are cleared without losing events or other subjects', () => {
  const archive = { subjects: [{ id: 1 }, { id: 2 }], recurring_events: [{ id: 3, subject_id: 1 }, { id: 4, subject_id: 2, studyflowSubjectId: 'legacy-subject-2' }, { id: 5, subject_id: null, studyflowSubjectId: 'modern' }, { id: 6, studyflowSubjectId: 'modern' }] };
  const afterLegacy = removeLegacySubject(archive, 'legacy-subject-1')!;
  assert.deepEqual(afterLegacy.subjects, [{ id: 2 }]);
  assert.deepEqual(afterLegacy.recurring_events[0], { id: 3, subject_id: null });
  assert.equal(afterLegacy.recurring_events[1], archive.recurring_events[1]);
  const afterModern = removeLegacySubject(afterLegacy, 'modern')!;
  assert.equal(afterModern.recurring_events[2].studyflowSubjectId, '');
  assert.equal(afterModern.recurring_events[3].studyflowSubjectId, '');
  assert.equal(afterModern.recurring_events.length, 4);
  assert.equal(archive.recurring_events[0].subject_id, 1);
  assert.equal(removeLegacySubject(undefined, 'modern'), undefined);
});
