import type { Subject } from '../types/studyflow';
import { chapterNumber, groupedChapters, sanitizeSyllabusLinks, stripSyllabusNumberPrefix, type SyllabusLinks } from './syllabusHierarchy';

export interface SyllabusResource { id: string; subjectId: string; title: string; syllabusLinks?: SyllabusLinks }

/** The resource's ID is permanent; numbering reflects current syllabus order. */
export function resourceTitle<T extends SyllabusResource>(resource: T, subject: Subject | undefined, resources: T[]): string {
  if (!subject) return resource.title;
  const links = sanitizeSyllabusLinks(subject, resource.syllabusLinks);
  const labels = groupedChapters(subject).flatMap(({chapters}) => chapters.filter(ch => links?.chapterIds?.includes(ch.id)).map(ch => {
    const siblings = resources.filter(r => r.subjectId === subject.id && r.syllabusLinks?.chapterIds?.includes(ch.id));
    // Oldest-created entries appear first in the workspace's reverse-chronological arrays.
    const index = siblings.length - siblings.findIndex(r => r.id === resource.id);
    return `${chapterNumber(subject, ch.id)}.${Math.max(1,index)} ${stripSyllabusNumberPrefix(ch.title)}`;
  }));
  return labels.length ? `${labels.join(' / ')} — ${resource.title}` : resource.title;
}

export function resourceGroups<T extends SyllabusResource>(subject: Subject, resources: T[]) {
  const own = resources.filter(r=>r.subjectId === subject.id);
  return {
    units: groupedChapters(subject).map(group => ({...group,
      direct: own.filter(r => r.syllabusLinks?.unitIds?.includes(group.unit.id)),
      children: group.chapters.map(chapter=>({chapter, resources:own.filter(r=>r.syllabusLinks?.chapterIds?.includes(chapter.id))})),
    })),
    unclassified: own.filter(r=>!sanitizeSyllabusLinks(subject,r.syllabusLinks)),
  };
}
