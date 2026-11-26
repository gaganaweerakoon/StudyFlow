import type { Subject } from '../types/studyflow';
import { syllabusUnits } from '../utils/syllabusHierarchy';

export function noteDestination(prompt: string, subjects: Subject[]) {
  const normalize = (value: string) => value.normalize('NFC').toLocaleLowerCase().trim();
  const text = ' ' + normalize(prompt).replace(/[^\p{L}\p{M}\p{N}]+/gu, ' ') + ' ';
  const mentions = (value: string) => value.split(/\s+[–—-]\s+/).some(part => {
    const term = normalize(part).replace(/[^\p{L}\p{M}\p{N}]+/gu, ' ').trim();
    return term && text.includes(' ' + term + ' ');
  });
  const matches = subjects.filter(s => [s.id, s.code, s.name].some(mentions));
  if (matches.length !== 1) return { question: 'Which subject should I save the note in?' };
  const subject = matches[0];
  const units = syllabusUnits(subject);
  const number = /\bunit\s*0*(\d+)\b/i.exec(prompt);
  const named = units.filter(u => mentions(u.title) || mentions(u.id));
  const numbered = number ? units[Number(number[1]) - 1] : undefined;
  if ((number && !numbered) || named.length > 1 || (numbered && named.some(u => u.id !== numbered.id))) {
    return { question: 'Which unit in ' + subject.name + ' should hold this note?' };
  }
  const unit = numbered ?? named[0];
  if (!unit && /\bunit\b/i.test(prompt)) return { question: 'Which unit in ' + subject.name + ' should hold this note?' };
  return { subjectId: subject.id, unitId: unit?.id };
}
