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

export interface SyllabusLinks { unitIds?: string[]; chapterIds?: string[] }
export interface SyllabusScope { subjectId: string; unitId?: string; chapterId?: string }

/** Links use stable IDs; unit membership of a chapter is always derived, never duplicated. */
export function sanitizeSyllabusLinks(subject: Subject | undefined, links: SyllabusLinks | undefined): SyllabusLinks | undefined {
  if (!subject || !links) return undefined;
  const normalized = normalizeSyllabus(subject);
  const unitIds = [...new Set(links.unitIds ?? [])].filter(id => normalized.units?.some(unit => unit.id === id));
  const chapterIds = [...new Set(links.chapterIds ?? [])].filter(id => normalized.chapters.some(ch => ch.id === id));
  return unitIds.length || chapterIds.length ? { unitIds, chapterIds } : undefined;
}
export function matchesSyllabusScope(item: {subjectId: string; syllabusLinks?: SyllabusLinks}, subject: Subject | undefined, scope: SyllabusScope): boolean {
  if (scope.subjectId && item.subjectId !== scope.subjectId) return false;
  const links = item.syllabusLinks;
  if (scope.chapterId) return !!links?.chapterIds?.includes(scope.chapterId);
  if (scope.unitId) return !!links?.unitIds?.includes(scope.unitId) || !!subject && normalizeSyllabus(subject).chapters.some(ch => ch.unitId === scope.unitId && links?.chapterIds?.includes(ch.id));
  return true;
}
export function removeChapterLink<T extends {subjectId: string; syllabusLinks?: SyllabusLinks}>(item: T, subjectId: string, chapterId: string): T {
  if (item.subjectId !== subjectId || !item.syllabusLinks?.chapterIds?.includes(chapterId)) return item;
  return { ...item, syllabusLinks: {...item.syllabusLinks, chapterIds: item.syllabusLinks.chapterIds.filter(id => id !== chapterId)} };
}
export function syllabusLinkLabels(subject: Subject | undefined, links: SyllabusLinks | undefined): string[] {
  if (!subject || !links) return [];
  const normalized = normalizeSyllabus(subject);
  return [...(normalized.units ?? []).flatMap((unit,index) => links.unitIds?.includes(unit.id) ? [`${index+1}. ${unit.title}`] : []), ...normalized.chapters.flatMap(ch => links.chapterIds?.includes(ch.id) ? [`${chapterNumber(normalized,ch.id)} ${ch.title}`] : [])];
}

/** Reject unknown or cross-subject IDs rather than silently trusting model output. */
export function parseSyllabusLinks(subject: Subject | undefined, raw: unknown): {valid: boolean; links?: SyllabusLinks} {
  if (raw === undefined) return {valid: true};
  if (!subject || !raw || typeof raw !== 'object' || Array.isArray(raw)) return {valid:false};
  const data = raw as Record<string, unknown>;
  if (Object.keys(data).some(key => key !== 'unitIds' && key !== 'chapterIds')) return {valid:false};
  for (const key of ['unitIds','chapterIds'] as const) if (data[key] !== undefined && (!Array.isArray(data[key]) || (data[key] as unknown[]).length > 100 || (data[key] as unknown[]).some(id=>typeof id !== 'string'))) return {valid:false};
  const requested = {unitIds:[...new Set((data.unitIds ?? []) as string[])],chapterIds:[...new Set((data.chapterIds ?? []) as string[])]};
  const links = sanitizeSyllabusLinks(subject, requested);
  if ((links?.unitIds?.length ?? 0) !== requested.unitIds.length || (links?.chapterIds?.length ?? 0) !== requested.chapterIds.length) return {valid:false};
  return {valid:true, links:links ?? {unitIds:[],chapterIds:[]}};
}
