import { resourceGroups, resourceTitle } from './syllabusResources';
import test from 'node:test';
import assert from 'node:assert/strict';
import type { Subject, ChapterItem } from '../types/studyflow';
import { chapterNumber, groupedChapters, isChapterArchived, mergeImportedChapters, moveChapter, moveSyllabusItem, normalizeSyllabus, matchesSyllabusScope, sanitizeSyllabusLinks, removeChapterLink, parseSyllabusLinks, syllabusLinkLabels } from './syllabusHierarchy';
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


test('multi-chapter note links resolve membership and preserve identity after a chapter moves', () => {
  const original = subject([chapter('a','A','u1'),chapter('b','B','u2')],[{id:'u1',title:'First'},{id:'u2',title:'Second'}]);
  const links = sanitizeSyllabusLinks(original,{unitIds:['u1','missing'],chapterIds:['a','a','b','invalid']});
  assert.deepEqual(links,{unitIds:['u1'],chapterIds:['a','b']});
  const note = {id:'note',subjectId:'chem',syllabusLinks:links};
  assert.equal(matchesSyllabusScope(note,original,{subjectId:'chem',chapterId:'a'}),true);
  assert.equal(matchesSyllabusScope(note,original,{subjectId:'chem',unitId:'u2'}),true);
  assert.equal(matchesSyllabusScope(note,original,{subjectId:'other'}),false);
  const moved={...original,chapters:original.chapters.map(ch=>({...ch,unitId:'u1'}))};
  assert.equal(matchesSyllabusScope(note,moved,{subjectId:'chem',unitId:'u2'}),false);
  assert.ok(syllabusLinkLabels(moved,links).includes('1.2 B'));
  assert.deepEqual(removeChapterLink(note,'chem','a').syllabusLinks?.chapterIds,['b']);
  assert.deepEqual(note.syllabusLinks?.chapterIds,['a','b']);
  assert.equal(parseSyllabusLinks(original,{chapterIds:['other']}).valid,false);
  assert.equal(parseSyllabusLinks(original,{chapterIds:['a','b']}).valid,true);
  assert.equal(sanitizeSyllabusLinks(undefined,links),undefined);
});


test('resource groups share multi-chapter resources and numbering follows syllabus order without replacing IDs',()=>{
  const original=subject([chapter('a','A','u'),chapter('b','B','u')],[{id:'u',title:'Unit'}]);
  const legacy={id:'legacy',subjectId:'chem',title:'Legacy'};
  const older={id:'old',subjectId:'chem',title:'Older',syllabusLinks:{chapterIds:['a']}};
  const newer={id:'new',subjectId:'chem',title:'Newer',syllabusLinks:{chapterIds:['a','b']}};
  const resources=[newer,older,legacy];const groups=resourceGroups(original,resources);
  assert.equal(groups.units[0].children[0].resources[0],newer);
  assert.equal(groups.units[0].children[1].resources[0],newer);
  assert.deepEqual(groups.unclassified,[legacy]);
  assert.equal(resourceTitle(older,original,resources),'1.1.1 A — Older');
  assert.equal(resourceTitle(newer,original,resources),'1.1.2 A / 1.2.1 B — Newer');
  assert.equal(resourceTitle(newer,moveChapter(original,'b',-1),resources),'1.1.1 B / 1.2.2 A — Newer');
  assert.equal(JSON.parse(JSON.stringify(resources))[0].id,'new');
});
