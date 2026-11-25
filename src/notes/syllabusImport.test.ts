import test from 'node:test';
import assert from 'node:assert/strict';
import { emptySyllabus, mergeSyllabus, parseNumberedSyllabusMarkdown, splitSyllabus } from './syllabusImport';

test('local Markdown preserves bilingual competency titles and ignores source notes', () => {
  const source = [
    '# Syllabus', '## Source and import conventions', '- Not a topic',
    '## Foundation Course – මූලික පාඨමාලාව', '### F1. Basic Algebra – වීජ ගණිතය', '- F1.1 Expansion – ප්‍රසාරණය',
    '## Part I. Pure Mathematics – ශුද්ධ ගණිතය', '### P01. Real Numbers – තාත්වික සංඛ්‍යා', '- I-1.1 Number systems – සංඛ්‍යා පද්ධති',
    '## Part II. Applied Mathematics – ව්‍යවහාරික ගණිතය', '### A01. Vectors – දෛශික', '- II-1.1 Vector operations – දෛශික කර්ම',
    '## Source discrepancies', '- Do not import this'
  ].join('\n');
  const parsed = parseNumberedSyllabusMarkdown(source);
  assert.ok(parsed);
  assert.equal(parsed.chapters.length, 3);
  assert.equal(parsed.chapters[2].topics[0], 'II-1.1 Vector operations – දෛශික කර්ම');
  assert.equal(parsed.exams.length, 0);
  assert.equal(parseNumberedSyllabusMarkdown('ordinary text'), null);
});

test('document chunks preserve every input character', () => {
  const input = 'Page 1\n' + 'ගණිතය '.repeat(6000) + '\nPage 2\nFinal competency';
  const chunks = splitSyllabus(input, 4000);
  assert.ok(chunks.length > 1);
  assert.ok(chunks.every(c => c.length <= 4000));
  assert.equal(chunks.join(''), input);
});

test('chunk merge avoids duplicate chapters and topics', () => {
  const target = emptySyllabus();
  mergeSyllabus(target, { ...emptySyllabus(), chapters: [{title:'Vectors',topics:['Magnitude']}] });
  mergeSyllabus(target, { ...emptySyllabus(), chapters: [{title:' vectors ',topics:['Magnitude','Direction']}] });
  assert.equal(target.chapters.length, 1);
  assert.deepEqual(target.chapters[0].topics, ['Magnitude','Direction']);
});
