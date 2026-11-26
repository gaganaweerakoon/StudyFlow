import type { LegacyArchive } from '../desktop/legacy';

/** Preserve linked records while clearing only the deleted subject reference. */
export function unassignSubject<T extends { subjectId?: string }>(items: T[], subjectId: string): T[] {
  return items.map(item => item.subjectId === subjectId ? { ...item, subjectId: '', ...('syllabusLinks' in item ? {syllabusLinks: undefined} : {}) } : item);
}

/** Recurring series may use either the legacy numeric ID or the current subject ID. */
export function removeLegacySubject(archive: LegacyArchive | undefined, subjectId: string): LegacyArchive | undefined {
  if (!archive) return archive;
  return Object.fromEntries(Object.entries(archive).map(([table, rows]) => [table,
    table === 'subjects'
      ? rows.filter(row => `legacy-subject-${row.id}` !== subjectId)
      : rows.map(row => {
        const legacyMatch = row.subject_id != null && `legacy-subject-${row.subject_id}` === subjectId;
        const currentMatch = row.studyflowSubjectId === subjectId;
        if (!legacyMatch && !currentMatch) return row;
        const next: Record<string, unknown> = { ...row, subject_id: null };
        if (currentMatch) next.studyflowSubjectId = '';
        return next;
      }),
  ]));
}
