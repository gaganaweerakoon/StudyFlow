import test from 'node:test';
import assert from 'node:assert/strict';
import {buildExcerptPrompt, excerptFromText, MAX_NOTE_EXCERPT, selectionActions} from './noteSelection';
test('selection prompt preserves selected bilingual text, source and syllabus without unrelated content',()=>{
  const excerpt=excerptFromText('  H₂O — ජලය\n$C=n/V$  ','PDF page 3')!;
  for(const action of selectionActions){
    const prompt=buildExcerptPrompt(excerpt,'Chemistry',['1.2 Solutions'],action)!;
    assert.ok(prompt.includes('H₂O — ජලය\n$C=n/V$'));
    assert.ok(prompt.includes('PDF page 3'));
    assert.ok(prompt.includes('1.2 Solutions'));
  }
  assert.equal(excerptFromText('  ','Note'),undefined);
  assert.equal(buildExcerptPrompt({text:'a'.repeat(MAX_NOTE_EXCERPT+1),source:'Note'},'Note',[],'Explain'),undefined);
});
