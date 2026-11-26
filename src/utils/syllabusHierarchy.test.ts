import test from 'node:test';
import assert from 'node:assert/strict';
import type { Subject, ChapterItem } from '../types/studyflow';
import { chapterNumber, groupedChapters, isChapterArchived, mergeImportedChapters, moveChapter, moveSyllabusItem, normalizeSyllabus } from './syllabusHierarchy';
const chapter = (id: string, title = id, unitId?: string): ChapterItem => ({id, title, unitId, topics: [{id: `topic-${id}`, title: 'Theory', completed: true, confidence: 4, difficulty: 'medium', revisionStatus: 'mastered'}]});
const subject = (chapters: ChapterItem[], units?: Subject['units']): Subject => ({id:'chem', code:'CHEM', name:'Chemistry', color:'#123456', icon:'flask', instructor:'', totalHours:0, weeklyTargetHours:0, lastStudied:'', nextExamDate:'', nextExamTitle:'', currentGrade:'', targetGrade:'', chapters, units});
test('migration preserves chapter and topic identities, progress, and archive flags', () => {
  const old = subject([chapter('a'), {...chapter('b'), archived:true}]);
  const migrated = normalizeSyllabus(old);
  assert.equal(migrated.units?.[0].id, 'unit-default-chem');
  assert.deepEqual(migrated.chapters.map(c => c.id), ['a','b']);
  assert.equal(migrated.chapters[0].topics, old.chapters[0].topics);
  assert.equal(migrated.chapters[1].archived,true);
  assert.equal(chapterNumber(migrated,'b'),'1.2');
  assert.equal(normalizeSyllabus(migrated), migrated);
  assert.deepEqual(normalizeSyllabus(JSON.parse(JSON.stringify(migrated))), migrated);
});
test('numbering follows unit and sibling order without changing IDs', () => {
  const original = subject([chapter('a','A','u1'),chapter('b','B','u2'),chapter('c','C','u1')], [{id:'u1',title:'One'},{id:'u2',title:'Two'}]);
  const moved = moveChapter(original,'c',-1);
  assert.equal(chapterNumber(moved,'c'),'1.1');
  assert.equal(chapterNumber(moved,'a'),'1.2');
  assert.equal(chapterNumber(moved,'b'),'2.1');
  const reordered = {...moved, units:moveSyllabusItem(moved.units!, 'u2', -1)};
  assert.equal(chapterNumber(reordered,'b'),'1.1');
  assert.equal(chapterNumber(reordered,'c'),'2.1');
  assert.equal(reordered.chapters.find(c=>c.id==='a')?.topics[0].completed,true);
});
test('archiving a unit hides its chapters without destroying individual archive state', () => {
  const original = subject([chapter('a','A','u'),{...chapter('b','B','u'),archived:true}], [{id:'u',title:'Unit',archived:true}]);
  assert.ok(original.chapters.every(c=>isChapterArchived(original,c)));
  const restored = {...original,units:[{id:'u',title:'Unit'}]};
  assert.equal(isChapterArchived(restored,restored.chapters[0]),false);
  assert.equal(isChapterArchived(restored,restored.chapters[1]),true);
});
test('import merges within the correct unit and keeps progress, even with identical chapter titles', () => {
  const original = subject([chapter('a','Bonding','u1')], [{id:'u1',title:'Chemistry'}]);
  const imported = mergeImportedChapters(original,[{...chapter('new',' bonding '),unitTitle:' chemistry '},{...chapter('b','Bonding'),unitTitle:'Physics'}]);
  assert.equal(imported.chapters.length,2);
  assert.equal(imported.chapters[0].id,'a');
  assert.equal(imported.chapters[0].topics[0].completed,true);
  assert.equal(groupedChapters(imported)[1].unit.title,'Physics');
  assert.equal(chapterNumber(imported,'b'),'2.1');
  assert.deepEqual(mergeImportedChapters(imported,[{...chapter('duplicate','Bonding'),unitTitle:'Physics'}]).chapters.map(c=>c.id),['a','b']);
});
