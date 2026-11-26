import type { ChapterItem, Subject, UnitItem } from '../types/studyflow';

export function normalizeSyllabus(subject: Subject): Subject {
  const units = [...(subject.units ?? [])];
  const valid = new Set(units.map(unit => unit.id));
  const needsDefault = subject.chapters.some(chapter => !chapter.unitId || !valid.has(chapter.unitId));
  if (needsDefault || !units.length) {
    const id = `unit-default-${subject.id}`;
    if (!valid.has(id)) units.push({ id, title: 'General' });
    return { ...subject, units, chapters: subject.chapters.map(chapter => chapter.unitId && valid.has(chapter.unitId) ? chapter : { ...chapter, unitId: id }) };
  }
  return subject;
}

export function syllabusUnits(subject: Subject): UnitItem[] {
  return normalizeSyllabus(subject).units ?? [];
}

export function chapterUnit(subject: Subject, chapter: ChapterItem): UnitItem | undefined {
  const normalized = normalizeSyllabus(subject);
  const unitId = normalized.chapters.find(item => item.id === chapter.id)?.unitId;
  return normalized.units?.find(unit => unit.id === unitId);
}

export function chapterNumber(subject: Subject, chapterId: string): string {
  const normalized = normalizeSyllabus(subject);
  const chapter = normalized.chapters.find(item => item.id === chapterId);
  if (!chapter) return '';
  const unitIndex = (normalized.units ?? []).findIndex(unit => unit.id === chapter.unitId);
  const chapterIndex = normalized.chapters.filter(item => item.unitId === chapter.unitId).findIndex(item => item.id === chapterId);
  return `${unitIndex + 1}.${chapterIndex + 1}`;
}

export function groupedChapters(subject: Subject) {
  const normalized = normalizeSyllabus(subject);
  return (normalized.units ?? []).map((unit, index) => ({ unit, number: index + 1, chapters: normalized.chapters.filter(chapter => chapter.unitId === unit.id) }));
}

export function isChapterArchived(subject: Subject, chapter: ChapterItem): boolean {
  return Boolean(chapter.archived || chapterUnit(subject, chapter)?.archived);
}

export function moveSyllabusItem<T extends { id: string }>(items: T[], id: string, delta: -1 | 1): T[] {
  const index = items.findIndex(item => item.id === id);
  const target = index + delta;
  if (index < 0 || target < 0 || target >= items.length) return items;
  const next = [...items];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

export function moveChapter(subject: Subject, id: string, delta: -1 | 1): Subject {
  const normalized = normalizeSyllabus(subject);
  const chapter = normalized.chapters.find(item => item.id === id);
  if (!chapter) return normalized;
  const siblings = normalized.chapters.filter(item => item.unitId === chapter.unitId);
  const ordered = moveSyllabusItem(siblings, id, delta);
  let index = 0;
  return { ...normalized, chapters: normalized.chapters.map(item => item.unitId === chapter.unitId ? ordered[index++] : item) };
}

export type IncomingChapter = ChapterItem & { unitTitle?: string };
const key = (value: string) => value.normalize('NFC').trim().replace(/\s+/g, ' ').toLowerCase();

/** Merge imports within the resolved unit, preserving chapter and topic IDs/progress. */
export function mergeImportedChapters(subject: Subject, incoming: IncomingChapter[]): Subject {
  const normalized = normalizeSyllabus(subject);
  const units = [...(normalized.units ?? [])];
  const chapters = [...normalized.chapters];
  for (const item of incoming) {
    const { unitTitle, ...chapter } = item;
    if (!chapter.title.trim()) continue;
    let unit = units.find(candidate => candidate.id === chapter.unitId && !candidate.archived);
    if (!unit && unitTitle?.trim()) {
      unit = units.find(candidate => key(candidate.title) === key(unitTitle) && !candidate.archived);
      if (!unit) { unit = { id: `unit-${crypto.randomUUID()}`, title: unitTitle.trim() }; units.push(unit); }
    }
    if (!unit) unit = units.find(candidate => !candidate.archived);
    if (!unit) { unit = { id: `unit-${crypto.randomUUID()}`, title: 'General' }; units.push(unit); }
    const existingIndex = chapters.findIndex(candidate => candidate.unitId === unit.id && key(candidate.title) === key(chapter.title));
    if (existingIndex < 0) { chapters.push({ ...chapter, unitId: unit.id }); continue; }
    const existing = chapters[existingIndex];
    const known = new Set(existing.topics.map(topic => key(topic.title)));
    const topics = [...existing.topics];
    for (const topic of chapter.topics) if (!known.has(key(topic.title))) { topics.push(topic); known.add(key(topic.title)); }
    chapters[existingIndex] = { ...existing, topics };
  }
  return { ...normalized, units, chapters };
}
