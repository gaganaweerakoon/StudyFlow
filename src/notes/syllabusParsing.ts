import type { SyllabusExtractionBundle } from '../types/studyflow';

export function emptySyllabus(): SyllabusExtractionBundle {
  return { exams: [], tasks: [], chapters: [], goals: [] };
}

// The exported NIE bilingual outlines have explicit, stable chapter and competency IDs.
// Do not mistake introductory notes, references or term tables for topics.
export function parseNumberedSyllabusMarkdown(text: string): SyllabusExtractionBundle | null {
  const result = emptySyllabus();
  let current: SyllabusExtractionBundle['chapters'][number] | undefined;
  let group = '';
  const seen = new Set<string>();
  for (const line of text.replace(/^\uFEFF/, '').split(/\r?\n/)) {
    const part = /^##\s+(Foundation Course|Part I\. Pure Mathematics|Part II\. Applied Mathematics)\b/.exec(line);
    if (part) {
      group = part[1].startsWith('Foundation') ? 'Foundation' : part[1].startsWith('Part II') ? 'Applied' : 'Pure';
      current = undefined;
      continue;
    }
    if (/^##\s+/.test(line)) { group = ''; current = undefined; continue; }
    const chapter = /^###\s+([FPA]\d+)\.\s+(.+)$/.exec(line);
    if (chapter && group) {
      current = { title: group + ' · ' + chapter[2].trim(), unitTitle: group, topics: [] };
      result.chapters.push(current);
      continue;
    }
    const topic = /^[-*]\s+((?:F\d+|I{1,2}-\d+)\.\d+)\s+(.+)$/.exec(line);
    if (current && topic && !seen.has(topic[1])) {
      seen.add(topic[1]);
      current.topics.push(topic[1] + ' ' + topic[2].trim());
    }
  }
  return result.chapters.length && result.chapters.every(c => c.topics.length) ? result : null;
}

// Batch by line / paragraph boundary, without dropping any part of the input.
export function splitSyllabus(text: string, target = 22000): string[] {
  const chunks: string[] = [];
  let pending = '';
  for (const line of text.split(/(?<=\n)/)) {
    if (pending && pending.length + line.length > target) {
      chunks.push(pending); pending = '';
    }
    for (let i = 0; i < line.length; i += target) {
      const part = line.slice(i, i + target);
      if (pending && pending.length + part.length > target) { chunks.push(pending); pending = ''; }
      pending += part;
    }
  }
  if (pending) chunks.push(pending);
  return chunks;
}

export function mergeSyllabus(target: SyllabusExtractionBundle, next: SyllabusExtractionBundle) {
  const key = (s: string) => s.normalize('NFC').trim().replace(/\s+/g, ' ').toLowerCase();
  if (!next || !Array.isArray(next.chapters) || !Array.isArray(next.tasks) || !Array.isArray(next.exams) || !Array.isArray(next.goals)) {
    throw new Error('Pip returned an invalid syllabus bundle.');
  }
  target.courseTitle ||= next.courseTitle;
  for (const chapter of next.chapters) {
    if (typeof chapter.title !== 'string' || !chapter.title.trim() || !Array.isArray(chapter.topics) || chapter.topics.some(t => typeof t !== 'string')) {
      throw new Error('Pip returned an invalid syllabus chapter.');
    }
    const unitTitle = typeof chapter.unitTitle === 'string' ? chapter.unitTitle.trim() : undefined;
    const existing = target.chapters.find(c => key(c.title) === key(chapter.title) && key(c.unitTitle ?? '') === key(unitTitle ?? ''));
    if (!existing) target.chapters.push({ title: chapter.title, ...(unitTitle ? {unitTitle} : {}), topics: [...new Set(chapter.topics)] });
    else {
      const known = new Set(existing.topics.map(key));
      for (const t of chapter.topics) if (!known.has(key(t))) { existing.topics.push(t); known.add(key(t)); }
    }
  }
  for (const e of next.exams) if (typeof e.title === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(e.date) && !target.exams.some(v => key(v.title) === key(e.title) && v.date === e.date)) target.exams.push(e);
  for (const t of next.tasks) if (typeof t.title === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(t.dueDate) && !target.tasks.some(v => key(v.title) === key(t.title) && v.dueDate === t.dueDate)) target.tasks.push(t);
  for (const g of next.goals) if (typeof g.title === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(g.deadline) && !target.goals.some(v => key(v.title) === key(g.title) && v.deadline === g.deadline)) target.goals.push(g);
}
