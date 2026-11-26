import React, { useMemo, useState } from 'react';
import { Check, ChevronDown, Layers, Search, X } from 'lucide-react';
import type { Subject } from '../../types/studyflow';
import {
  formatChapterTitle,
  formatUnitTitle,
  groupedChapters,
  syllabusLinkLabels,
  type SyllabusLinks,
} from '../../utils/syllabusHierarchy';

interface SyllabusLinkPickerProps {
  subject?: Subject;
  subjects?: Subject[];
  subjectId?: string;
  onSubjectChange?: (subjectId: string) => void;
  links?: SyllabusLinks;
  onChange: (links: SyllabusLinks) => void;
  defaultOpen?: boolean;
  embedded?: boolean;
  onDone?: () => void;
}

export function SyllabusLinkPicker({
  subject,
  subjects,
  subjectId,
  onSubjectChange,
  links,
  onChange,
  defaultOpen = false,
  embedded = false,
  onDone,
}: SyllabusLinkPickerProps) {
  const [open, setOpen] = useState(defaultOpen);
  const [query, setQuery] = useState('');

  const resolvedSubject = useMemo(
    () => subject ?? (subjects && subjectId ? subjects.find((s) => s.id === subjectId) : undefined),
    [subject, subjects, subjectId],
  );

  const labels = useMemo(
    () => syllabusLinkLabels(resolvedSubject, links),
    [resolvedSubject, links],
  );

  const groups = useMemo(
    () => (resolvedSubject ? groupedChapters(resolvedSubject) : []),
    [resolvedSubject],
  );

  const totalItems = useMemo(
    () => groups.reduce((acc, g) => acc + 1 + g.chapters.length, 0),
    [groups],
  );

  const selectedCount = (links?.unitIds?.length ?? 0) + (links?.chapterIds?.length ?? 0);

  const normalizedQuery = query.trim().toLocaleLowerCase();
  const matches = (text: string) =>
    !normalizedQuery || text.toLocaleLowerCase().includes(normalizedQuery);

  const filteredGroups = useMemo(() => {
    if (!resolvedSubject) return [];
    return groups
      .map((group) => {
        const unitLabel = formatUnitTitle(group.number, group.unit.title);
        const unitMatches = matches(unitLabel);
        const matchingChapters = group.chapters.filter(
          (ch) => unitMatches || matches(formatChapterTitle(resolvedSubject, ch)),
        );
        if (!unitMatches && matchingChapters.length === 0) return null;
        return { ...group, unitLabel, matchingChapters };
      })
      .filter((g): g is NonNullable<typeof g> => g !== null);
  }, [groups, resolvedSubject, normalizedQuery]);

  const toggle = (kind: 'unitIds' | 'chapterIds', id: string) => {
    const ids = new Set(links?.[kind] ?? []);
    if (ids.has(id)) ids.delete(id);
    else ids.add(id);
    onChange({
      unitIds: kind === 'unitIds' ? [...ids] : [...(links?.unitIds ?? [])],
      chapterIds: kind === 'chapterIds' ? [...ids] : [...(links?.chapterIds ?? [])],
    });
  };

  const pickerBody = (
    <div className="space-y-2.5">
      {subjects && onSubjectChange && (
        <label className="block space-y-1">
          <span className="block text-[11.5px] font-medium text-[var(--text-secondary)]">Subject</span>
          <div className="relative">
            <select
              aria-label="Assign subject"
              value={subjectId ?? resolvedSubject?.id ?? ''}
              onChange={(e) => {
                onSubjectChange(e.target.value);
                setQuery('');
              }}
              className="w-full h-9 appearance-none rounded-lg pl-2.5 pr-8 text-[12.5px] text-[var(--text-primary)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] transition-colors cursor-pointer"
              style={{
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <option value="">Unassigned</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.code} — {s.name}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-[var(--text-muted)] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </label>
      )}

      {resolvedSubject ? (
        <>
          {totalItems > 4 && (
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[var(--text-muted)] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                aria-label="Search syllabus links"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Filter units or chapters…"
                className="w-full h-8 rounded-lg pl-8 pr-7 text-[12px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                }}
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  aria-label="Clear syllabus search"
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}

          <div
            className="max-h-48 overflow-y-auto rounded-lg divide-y divide-[var(--border-subtle)]"
            style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            {filteredGroups.length === 0 ? (
              <div className="px-3 py-4 text-center text-[12px] text-[var(--text-muted)]">
                No matching units or chapters.
              </div>
            ) : (
              filteredGroups.map(({ unit, unitLabel, matchingChapters }) => {
                const unitChecked = links?.unitIds?.includes(unit.id) ?? false;
                return (
                  <div key={unit.id} className="p-1.5 space-y-0.5">
                    <label
                      className="flex items-center gap-2.5 min-h-[34px] px-2 py-1 rounded-md cursor-pointer transition-colors hover:bg-[var(--bg-surface-hover)]"
                      style={{
                        backgroundColor: unitChecked ? 'var(--accent-soft)' : undefined,
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={unitChecked}
                        onChange={() => toggle('unitIds', unit.id)}
                        className="w-3.5 h-3.5 rounded accent-[var(--accent)] shrink-0 focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                      />
                      <span className="flex-1 min-w-0 text-[12.5px] font-semibold text-[var(--text-primary)] truncate">
                        {unitLabel}
                        {unit.archived ? (
                          <span className="ml-1.5 text-[11px] font-normal text-[var(--text-muted)]">
                            Archived
                          </span>
                        ) : null}
                      </span>
                      <span className="text-[11px] text-[var(--text-muted)] shrink-0">Unit</span>
                    </label>

                    {matchingChapters.length > 0 && (
                      <div className="pl-4 space-y-0.5">
                        {matchingChapters.map((ch) => {
                          const chChecked = links?.chapterIds?.includes(ch.id) ?? false;
                          return (
                            <label
                              key={ch.id}
                              className="flex items-center gap-2.5 min-h-[32px] px-2 py-1 rounded-md cursor-pointer transition-colors hover:bg-[var(--bg-surface-hover)]"
                              style={{
                                backgroundColor: chChecked ? 'var(--accent-soft)' : undefined,
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={chChecked}
                                onChange={() => toggle('chapterIds', ch.id)}
                                className="w-3.5 h-3.5 rounded accent-[var(--accent)] shrink-0 focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                              />
                              <span className="flex-1 min-w-0 text-[12.5px] text-[var(--text-secondary)] truncate">
                                {formatChapterTitle(resolvedSubject, ch)}
                                {ch.archived ? (
                                  <span className="ml-1.5 text-[11px] text-[var(--text-muted)]">
                                    Archived
                                  </span>
                                ) : null}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          <div className="flex items-center justify-between gap-2 pt-0.5">
            <span className="text-[11.5px] text-[var(--text-muted)]">
              {selectedCount === 0 ? (
                'Not linked to a unit or chapter'
              ) : (
                <>
                  <span className="font-mono-num tabular-nums font-medium text-[var(--text-secondary)]">
                    {selectedCount}
                  </span>{' '}
                  {selectedCount === 1 ? 'link' : 'links'} selected
                </>
              )}
            </span>
            <div className="flex items-center gap-2">
              {selectedCount > 0 && (
                <button
                  type="button"
                  onClick={() => onChange({ unitIds: [], chapterIds: [] })}
                  className="text-[11.5px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] px-2 py-1 rounded-md hover:bg-[var(--bg-surface-hover)] transition-colors whitespace-nowrap"
                >
                  Clear
                </button>
              )}
              {(onDone || !embedded) && (
                <button
                  type="button"
                  onClick={() => {
                    if (onDone) onDone();
                    else setOpen(false);
                  }}
                  className="inline-flex items-center gap-1 text-[11.5px] font-medium px-2.5 py-1 rounded-md transition-colors whitespace-nowrap"
                  style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' }}
                >
                  <Check className="w-3 h-3" /> Done
                </button>
              )}
            </div>
          </div>
        </>
      ) : (
        <p className="text-[12px] text-[var(--text-muted)] py-1">
          Select a subject above to link specific units or chapters.
        </p>
      )}
    </div>
  );

  if (embedded) {
    return (
      <div
        className="rounded-lg p-3"
        style={{
          backgroundColor: 'var(--bg-surface-subtle)',
          border: '1px solid var(--border-subtle)',
        }}
      >
        {pickerBody}
      </div>
    );
  }

  return (
    <div
      className="w-full rounded-lg transition-colors"
      style={{
        backgroundColor: 'var(--bg-surface-subtle)',
        border: open ? '1px solid var(--accent-border)' : '1px solid var(--border-subtle)',
      }}
    >
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="w-full min-h-[36px] px-3 py-1.5 flex items-center justify-between gap-2 text-left rounded-lg hover:bg-[var(--bg-surface-hover)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
      >
        <span className="flex items-center gap-2 min-w-0">
          <Layers className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />
          <span className="text-[12px] font-medium text-[var(--text-secondary)] shrink-0">
            Syllabus
          </span>
          <span aria-hidden="true" className="text-[var(--text-muted)] text-[12px]">
            ·
          </span>
          <span className="text-[12px] text-[var(--text-primary)] truncate">
            {labels.length ? labels.join(' · ') : 'Unlinked'}
          </span>
        </span>
        <span className="inline-flex items-center gap-1.5 shrink-0 text-[11.5px] text-[var(--text-muted)]">
          {selectedCount > 0 && (
            <span className="font-mono-num tabular-nums">{selectedCount}</span>
          )}
          <ChevronDown
            className={`w-3.5 h-3.5 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
          />
        </span>
      </button>

      {open && (
        <div
          className="px-3 pb-3 pt-2.5"
          style={{ borderTop: '1px solid var(--border-subtle)' }}
        >
          {pickerBody}
        </div>
      )}
    </div>
  );
}
