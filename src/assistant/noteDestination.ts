import type { NoteItem, Subject } from '../types/studyflow';
import { syllabusUnits } from '../utils/syllabusHierarchy';

export function noteDestination(prompt: string, subjects: Subject[], previous?: NoteItem) {
  const normalize = (value: string) => value.normalize('NFC').toLocaleLowerCase().trim();
  const text = ' ' + normalize(prompt).replace(/[^\p{L}\p{M}\p{N}]+/gu, ' ') + ' ';
  const mentions = (value: string) => value.split(/\s+[–—-]\s+/).some(part => {
    const term = normalize(part).replace(/[^\p{L}\p{M}\p{N}]+/gu, ' ').trim();
    return term && text.includes(' ' + term + ' ');
  });
  const sameUnit = /\bsame unit\b/i.test(prompt);
  const matches = subjects.filter(s => !s.archived && [s.id, s.code, s.name].some(mentions));
  if (!matches.length && sameUnit && previous) {
    const subject = subjects.find(s => s.id === previous.subjectId && !s.archived);
    if (subject) matches.push(subject);
  }
  if (matches.length !== 1) return { question: 'Which subject should I save the note in?' };
  const subject = matches[0];
  const units = syllabusUnits(subject);
  const linked = previous?.subjectId === subject.id ? previous.syllabusLinks?.unitIds : undefined;
  const number = /\bunit\s*0*(\d+)\b/i.exec(prompt);
  const named = units.filter(u => mentions(u.title) || mentions(u.id));
  const numbered = number ? units[Number(number[1]) - 1] : undefined;
  if ((number && !numbered) || named.length > 1 || (numbered && named.some(u => u.id !== numbered.id))) {
    return { question: 'Which unit in ' + subject.name + ' should hold this note?' };
  }
  const remembered = sameUnit && linked?.length === 1 ? units.find(u => u.id === linked[0]) : undefined;
  const unit = numbered ?? named[0] ?? remembered;
  if (unit?.archived) return { question: 'Which active unit in ' + subject.name + ' should hold this note?' };
  if (!unit && /\bunit\b/i.test(prompt)) return { question: 'Which unit in ' + subject.name + ' should hold this note?' };
  return { subjectId: subject.id, unitId: unit?.id };
}
