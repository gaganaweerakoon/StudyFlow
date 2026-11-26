import React, { useMemo, useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  FolderTree,
  Layers,
  LayoutGrid,
  Plus,
  RotateCcw,
  Search,
  X,
} from 'lucide-react';
import type { Subject } from '../../types/studyflow';
import {
  formatChapterTitle,
  formatUnitTitle,
  groupedChapters,
  matchesSyllabusScope,
} from '../../utils/syllabusHierarchy';
import {
  resourceGroups,
  resourceTitle,
  type SyllabusResource,
} from '../../utils/syllabusResources';

interface SyllabusResourceBrowserProps<T extends SyllabusResource> {
  subjects: Subject[];
  resources: T[];
  render: (item: T, title: string) => React.ReactNode;
  label: string;
  createLabel?: string;
  onCreate?: (subject: Subject, chapterId: string) => void;
}

export function SyllabusResourceBrowser<T extends SyllabusResource>({
  subjects,
  resources,
  render,
  label,
  createLabel,
  onCreate,
}: SyllabusResourceBrowserProps<T>) {
  const [subjectId, setSubjectId] = useState('');
  const [unitId, setUnitId] = useState('');
  const [chapterId, setChapterId] = useState('');
  const [query, setQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'syllabus'>('grid');
  const [showEmptyChapters, setShowEmptyChapters] = useState(false);
  const [collapsedKeys, setCollapsedKeys] = useState<Set<string>>(() => new Set());

  const subjectById = useMemo(
    () => new Map(subjects.map((s) => [s.id, s])),
    [subjects],
  );

  const subject = subjectId ? subjectById.get(subjectId) : undefined;

  const subjectGroups = useMemo(
    () =>
      subjects.map((sub) => ({
        subject: sub,
        groups: groupedChapters(sub),
      })),
    [subjects],
  );

  const activeGroups = useMemo(
    () => (subject ? groupedChapters(subject) : []),
    [subject],
  );

  const currentUnit = activeGroups.find((g) => g.unit.id === unitId);

  const availableChaptersForSubject = useMemo(() => {
    if (!subject) return [];
    if (currentUnit) return currentUnit.chapters;
    return activeGroups.flatMap((g) => g.chapters);
  }, [subject, activeGroups, currentUnit]);

  const currentChapter = availableChaptersForSubject.find((ch) => ch.id === chapterId);

  const subjectCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of resources) {
      counts.set(r.subjectId, (counts.get(r.subjectId) ?? 0) + 1);
    }
    return counts;
  }, [resources]);

  const trimmedQuery = query.trim().toLowerCase();

  const filtered = useMemo(
    () =>
      resources.filter((r) => {
        const resSub = subjectById.get(r.subjectId);
        const matchesScope = matchesSyllabusScope(r, resSub, {
          subjectId: subject?.id ?? '',
          unitId: currentUnit?.unit.id,
          chapterId: currentChapter?.id,
        });
        if (!matchesScope) return false;
        if (!trimmedQuery) return true;
        const displayTitle = resourceTitle(r, resSub, resources).toLowerCase();
        return displayTitle.includes(trimmedQuery) || r.title.toLowerCase().includes(trimmedQuery);
      }),
    [resources, subjectById, subject, currentUnit, currentChapter, trimmedQuery],
  );

  const hasActiveFilters = Boolean(subjectId || unitId || chapterId || trimmedQuery);

  const clearFilters = () => {
    setSubjectId('');
    setUnitId('');
    setChapterId('');
    setQuery('');
  };

  const handleSelectSubject = (nextSubjectId: string) => {
    setSubjectId(nextSubjectId);
    setUnitId('');
    setChapterId('');
  };

  const handleSelectUnit = (value: string) => {
    if (!value) {
      setUnitId('');
      setChapterId('');
      return;
    }
    // Supports composite "subjectId::unitId" when picking directly from "All"
    if (value.includes('::')) {
      const [sId, uId] = value.split('::');
      setSubjectId(sId);
      setUnitId(uId);
      setChapterId('');
      return;
    }
    setUnitId(value);
    setChapterId('');
  };

  const handleSelectChapter = (value: string) => {
    if (!value) {
      setChapterId('');
      return;
    }
    if (value.includes('::')) {
      const [sId, uId, cId] = value.split('::');
      setSubjectId(sId);
      setUnitId(uId);
      setChapterId(cId);
      return;
    }
    setChapterId(value);
    if (subject && !unitId) {
      const owningGroup = activeGroups.find((g) => g.chapters.some((ch) => ch.id === value));
      if (owningGroup) setUnitId(owningGroup.unit.id);
    }
  };

  const toggleCollapsed = (key: string) => {
    setCollapsedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const formatCount = (count: number) => {
    const noun = count === 1 && label.endsWith('s') ? label.slice(0, -1) : label;
    return noun;
  };

  const renderCards = (items: T[]) => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
      {[...items].reverse().map((r) => {
        const resSub = subjectById.get(r.subjectId);
        return <React.Fragment key={r.id}>{render(r, resourceTitle(r, resSub, resources))}</React.Fragment>;
      })}
    </div>
  );

  const selectClass =
    'w-full h-9 appearance-none rounded-lg pl-3 pr-8 text-[12.5px] text-[var(--text-primary)] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--accent)] truncate cursor-pointer';
  const controlStyle: React.CSSProperties = {
    backgroundColor: 'var(--bg-surface-subtle)',
    border: '1px solid var(--border-subtle)',
  };

  const createActionText = createLabel ?? `New for chapter`;

  const activeScopeBreadcrumb = useMemo(() => {
    const parts: string[] = [];
    if (subject) parts.push(`${subject.code} ${subject.name}`);
    if (currentUnit) parts.push(formatUnitTitle(currentUnit.number, currentUnit.unit.title));
    if (subject && currentChapter) parts.push(formatChapterTitle(subject, currentChapter));
    return parts.join(' / ');
  }, [subject, currentUnit, currentChapter]);

  const visibleSubjects = useMemo(
    () => subjects.filter((s) => !subject || s.id === subject.id),
    [subjects, subject],
  );

  const unassignedSubjectResources = useMemo(
    () => filtered.filter((r) => !subjectById.has(r.subjectId)),
    [filtered, subjectById],
  );

  return (
    <div className="space-y-4">
      {/* Unified Filter & Syllabus Scope Toolbar */}
      <div
        className="rounded-xl p-3.5 space-y-3"
        style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          boxShadow: 'var(--shadow-subtle)',
        }}
      >
        {/* Row 1: Instant Subject Selector + Layout Switch */}
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div
            role="tablist"
            aria-label="Filter by subject"
            className="flex items-center gap-1.5 overflow-x-auto pb-0.5 max-w-full"
          >
            <button
              type="button"
              role="tab"
              aria-selected={!subjectId}
              onClick={() => handleSelectSubject('')}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[12.5px] font-medium whitespace-nowrap shrink-0 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
              style={{
                backgroundColor: !subjectId ? 'var(--accent-soft)' : 'transparent',
                color: !subjectId ? 'var(--accent)' : 'var(--text-secondary)',
                border: !subjectId ? '1px solid var(--accent-border)' : '1px solid transparent',
              }}
            >
              <span>All Subjects</span>
              <span className="font-mono-num tabular-nums text-[11.5px] opacity-75">
                {resources.length}
              </span>
            </button>

            {subjects.map((sub) => {
              const active = subjectId === sub.id;
              const count = subjectCounts.get(sub.id) ?? 0;
              return (
                <button
                  key={sub.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => handleSelectSubject(sub.id)}
                  className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-[12.5px] font-medium whitespace-nowrap shrink-0 transition-colors hover:bg-[var(--bg-surface-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                  style={{
                    backgroundColor: active ? 'var(--accent-soft)' : 'transparent',
                    color: active ? 'var(--accent)' : 'var(--text-secondary)',
                    border: active ? '1px solid var(--accent-border)' : '1px solid transparent',
                  }}
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: sub.color }}
                    aria-hidden="true"
                  />
                  <span>{sub.code}</span>
                  <span className="font-mono-num tabular-nums text-[11.5px] opacity-70">
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          <div
            className="inline-flex items-center p-0.5 rounded-lg shrink-0"
            style={{
              backgroundColor: 'var(--bg-surface-subtle)',
              border: '1px solid var(--border-subtle)',
            }}
            role="group"
            aria-label="Browse layout"
          >
            <button
              type="button"
              aria-pressed={viewMode === 'grid'}
              onClick={() => setViewMode('grid')}
              className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md text-[12px] font-medium whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
              style={{
                backgroundColor: viewMode === 'grid' ? 'var(--bg-surface)' : 'transparent',
                color: viewMode === 'grid' ? 'var(--text-primary)' : 'var(--text-muted)',
              }}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              All
            </button>
            <button
              type="button"
              aria-pressed={viewMode === 'syllabus'}
              onClick={() => setViewMode('syllabus')}
              className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md text-[12px] font-medium whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
              style={{
                backgroundColor: viewMode === 'syllabus' ? 'var(--bg-surface)' : 'transparent',
                color: viewMode === 'syllabus' ? 'var(--text-primary)' : 'var(--text-muted)',
              }}
            >
              <FolderTree className="w-3.5 h-3.5" />
              By Syllabus
            </button>
          </div>
        </div>

        {/* Row 2: Unit, Chapter & Search Controls */}
        <div
          className="grid grid-cols-1 md:grid-cols-12 gap-2.5 pt-2.5"
          style={{ borderTop: '1px solid var(--border-subtle)' }}
        >
          <div className="md:col-span-4 relative">
            <Search className="w-3.5 h-3.5 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              aria-label={`Search ${label}`}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Search ${label}…`}
              className="w-full h-9 rounded-lg pl-8 pr-8 text-[12.5px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
              style={controlStyle}
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                aria-label="Clear search"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="md:col-span-4 relative">
            <select
              aria-label="Unit filter"
              className={selectClass}
              style={controlStyle}
              value={subject ? (currentUnit?.unit.id ?? '') : ''}
              onChange={(e) => handleSelectUnit(e.target.value)}
            >
              <option value="">All units</option>
              {subject
                ? activeGroups.map((g) => (
                    <option key={g.unit.id} value={g.unit.id}>
                      {formatUnitTitle(g.number, g.unit.title)}
                    </option>
                  ))
                : subjectGroups.map(({ subject: s, groups }) => (
                    <optgroup key={s.id} label={`${s.code} — ${s.name}`}>
                      {groups.map((g) => (
                        <option key={`${s.id}::${g.unit.id}`} value={`${s.id}::${g.unit.id}`}>
                          {formatUnitTitle(g.number, g.unit.title)}
                        </option>
                      ))}
                    </optgroup>
                  ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-[var(--text-muted)] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          <div className="md:col-span-4 relative">
            <select
              aria-label="Chapter filter"
              className={selectClass}
              style={controlStyle}
              value={subject ? (currentChapter?.id ?? '') : ''}
              onChange={(e) => handleSelectChapter(e.target.value)}
            >
              <option value="">All chapters</option>
              {subject
                ? availableChaptersForSubject.map((ch) => (
                    <option key={ch.id} value={ch.id}>
                      {formatChapterTitle(subject, ch)}
                    </option>
                  ))
                : subjectGroups.map(({ subject: s, groups }) => (
                    <optgroup key={s.id} label={`${s.code} — ${s.name}`}>
                      {groups.flatMap((g) =>
                        g.chapters.map((ch) => (
                          <option
                            key={`${s.id}::${g.unit.id}::${ch.id}`}
                            value={`${s.id}::${g.unit.id}::${ch.id}`}
                          >
                            {formatChapterTitle(s, ch)}
                          </option>
                        )),
                      )}
                    </optgroup>
                  ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-[var(--text-muted)] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* Quiet status & contextual chapter action row */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-[12px] text-[var(--text-muted)]">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 min-w-0">
            <span className="text-[var(--text-secondary)] font-medium">
              <span className="font-mono-num tabular-nums">{filtered.length}</span>
              {hasActiveFilters ? (
                <>
                  {' '}
                  of <span className="font-mono-num tabular-nums">{resources.length}</span>
                </>
              ) : null}{' '}
              {formatCount(hasActiveFilters ? resources.length : filtered.length)}
            </span>
            {activeScopeBreadcrumb && (
              <>
                <span aria-hidden="true">·</span>
                <span className="truncate">{activeScopeBreadcrumb}</span>
              </>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {viewMode === 'syllabus' && onCreate && (
              <label className="inline-flex items-center gap-1.5 cursor-pointer text-[12px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] select-none">
                <input
                  type="checkbox"
                  checked={showEmptyChapters}
                  onChange={(e) => setShowEmptyChapters(e.target.checked)}
                  className="w-3.5 h-3.5 rounded accent-[var(--accent)]"
                />
                <span>Show empty chapters</span>
              </label>
            )}

            {subject && currentChapter && onCreate && (
              <button
                type="button"
                onClick={() => onCreate(subject, currentChapter.id)}
                className="inline-flex items-center gap-1 h-7 px-2.5 rounded-md text-[12px] font-medium whitespace-nowrap transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' }}
              >
                <Plus className="w-3.5 h-3.5" />
                {createActionText}
              </button>
            )}

            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex items-center gap-1 h-7 px-2 rounded-md text-[12px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] whitespace-nowrap transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
                Reset
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content Area */}
      {filtered.length === 0 && !(viewMode === 'syllabus' && showEmptyChapters) ? (
        <div
          className="rounded-xl px-6 py-10 text-center space-y-3"
          style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <p className="text-[14px] font-medium text-[var(--text-primary)]">
            {subject && currentChapter
              ? `No ${label} linked to ${formatChapterTitle(subject, currentChapter)} yet`
              : `No matching ${label}`}
          </p>
          <p className="text-[12.5px] text-[var(--text-muted)] max-w-md mx-auto">
            {subject && currentChapter && onCreate
              ? `Create one directly for this chapter, or clear filters to view all ${label}.`
              : `Try clearing your filters or switching to another subject, unit, or chapter.`}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
            {subject && currentChapter && onCreate && (
              <button
                type="button"
                onClick={() => onCreate(subject, currentChapter.id)}
                className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg text-[12.5px] font-medium whitespace-nowrap"
                style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' }}
              >
                <Plus className="w-3.5 h-3.5" />
                {createActionText}
              </button>
            )}
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg text-[12.5px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] whitespace-nowrap"
                style={{ border: '1px solid var(--border-subtle)' }}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Show all {label}
              </button>
            )}
          </div>
        </div>
      ) : viewMode === 'grid' ? (
        renderCards(filtered)
      ) : (
        <div className="space-y-4">
          {visibleSubjects.map((s) => {
            const own = filtered.filter((r) => r.subjectId === s.id);
            const { units, unclassified } = resourceGroups(s, filtered);
            const visibleUnits = units
              .filter((g) => !currentUnit || g.unit.id === currentUnit.unit.id)
              .map((g) => {
                const visibleChildren = g.children.filter(
                  (c) =>
                    (!currentChapter || c.chapter.id === currentChapter.id) &&
                    (c.resources.length > 0 || (showEmptyChapters && Boolean(onCreate))),
                );
                const total = new Set(
                  [...g.direct, ...visibleChildren.flatMap((c) => c.resources)].map((r) => r.id),
                ).size;
                return { group: g, visibleChildren, total };
              })
              .filter(
                (entry) =>
                  entry.total > 0 ||
                  (showEmptyChapters && entry.visibleChildren.length > 0),
              );

            const showUnclassified = !currentUnit && !currentChapter && unclassified.length > 0;
            if (visibleUnits.length === 0 && !showUnclassified) return null;

            const subjectKey = `sub:${s.id}`;
            const subjectOpen = !collapsedKeys.has(subjectKey);

            return (
              <section
                key={s.id}
                className="rounded-xl overflow-hidden"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <button
                  type="button"
                  aria-expanded={subjectOpen}
                  onClick={() => toggleCollapsed(subjectKey)}
                  className="w-full px-4 py-3 flex items-center justify-between gap-3 text-left hover:bg-[var(--bg-surface-hover)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                >
                  <span className="flex items-center gap-3 min-w-0">
                    <ChevronRight
                      className={`w-4 h-4 text-[var(--text-muted)] shrink-0 transition-transform duration-150 ${subjectOpen ? 'rotate-90' : ''}`}
                    />
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: s.color }}
                      aria-hidden="true"
                    />
                    <span className="min-w-0">
                      <span className="block font-display text-[14.5px] font-semibold text-[var(--text-primary)] truncate">
                        {s.code} · {s.name}
                      </span>
                      <span className="block text-[11.5px] text-[var(--text-muted)] mt-0.5">
                        <span className="font-mono-num tabular-nums">{visibleUnits.length}</span>{' '}
                        {visibleUnits.length === 1 ? 'unit' : 'units'}
                        {showUnclassified ? (
                          <>
                            {' '}
                            · <span className="font-mono-num tabular-nums">{unclassified.length}</span>{' '}
                            unlinked
                          </>
                        ) : null}
                      </span>
                    </span>
                  </span>
                  <span className="text-[12px] text-[var(--text-muted)] shrink-0">
                    <span className="font-mono-num tabular-nums font-medium text-[var(--text-secondary)]">
                      {own.length}
                    </span>{' '}
                    {formatCount(own.length)}
                  </span>
                </button>

                {!subjectOpen && visibleUnits.length > 0 && (
                  <button
                    type="button"
                    onClick={() => toggleCollapsed(subjectKey)}
                    className="w-full px-4 py-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-left text-[12px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                    style={{
                      borderTop: '1px solid var(--border-subtle)',
                      backgroundColor: 'var(--bg-surface-subtle)',
                    }}
                  >
                    {visibleUnits.slice(0, 4).map(({ group: g, total }) => (
                      <span
                        key={g.unit.id}
                        className="inline-flex items-center gap-1.5 min-w-0 max-w-[260px]"
                      >
                        <span className="truncate">{formatUnitTitle(g.number, g.unit.title)}</span>
                        {total > 0 && (
                          <span className="font-mono-num tabular-nums text-[11px] text-[var(--text-muted)] shrink-0">
                            ({total})
                          </span>
                        )}
                      </span>
                    ))}
                    {visibleUnits.length > 4 && (
                      <span className="text-[11.5px] font-medium text-[var(--accent)]">
                        +<span className="font-mono-num tabular-nums">{visibleUnits.length - 4}</span>{' '}
                        more
                      </span>
                    )}
                  </button>
                )}

                {subjectOpen && (
                  <div
                    className="px-4 pb-4 pt-3.5 space-y-3"
                    style={{
                      borderTop: '1px solid var(--border-subtle)',
                      backgroundColor: 'var(--bg-surface-subtle)',
                    }}
                  >
                    {visibleUnits.map(({ group: g, visibleChildren, total }) => {
                      const unitKey = `unit:${s.id}:${g.unit.id}`;
                      const unitOpen = !collapsedKeys.has(unitKey);

                      return (
                        <div
                          key={g.unit.id}
                          className="rounded-xl overflow-hidden transition-colors"
                          style={{
                            backgroundColor: 'var(--bg-surface)',
                            border: '1px solid var(--border-subtle)',
                          }}
                        >
                          <button
                            type="button"
                            aria-expanded={unitOpen}
                            onClick={() => toggleCollapsed(unitKey)}
                            className="w-full px-3.5 py-2.5 flex items-center justify-between gap-3 text-left hover:bg-[var(--bg-surface-hover)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                          >
                            <span className="flex items-center gap-2.5 min-w-0">
                              <ChevronRight
                                className={`w-3.5 h-3.5 text-[var(--text-muted)] shrink-0 transition-transform duration-150 ${unitOpen ? 'rotate-90' : ''}`}
                              />
                              <span
                                className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                                style={{
                                  backgroundColor: `${s.color}16`,
                                  color: s.color,
                                }}
                              >
                                <Layers className="w-3.5 h-3.5" />
                              </span>
                              <span className="min-w-0">
                                <span className="block font-display text-[13.5px] font-semibold text-[var(--text-primary)] truncate">
                                  {formatUnitTitle(g.number, g.unit.title)}
                                </span>
                                <span className="block text-[11.5px] text-[var(--text-muted)] mt-0.5">
                                  <span className="font-mono-num tabular-nums">
                                    {visibleChildren.length}
                                  </span>{' '}
                                  {visibleChildren.length === 1 ? 'chapter' : 'chapters'}
                                  {g.direct.length > 0 ? (
                                    <>
                                      {' '}
                                      ·{' '}
                                      <span className="font-mono-num tabular-nums">
                                        {g.direct.length}
                                      </span>{' '}
                                      unit-level
                                    </>
                                  ) : null}
                                </span>
                              </span>
                            </span>
                            <span className="text-[12px] text-[var(--text-muted)] shrink-0">
                              <span className="font-mono-num tabular-nums font-medium text-[var(--text-secondary)]">
                                {total}
                              </span>{' '}
                              {formatCount(total)}
                            </span>
                          </button>

                          {!unitOpen && visibleChildren.length > 0 && (
                            <button
                              type="button"
                              onClick={() => toggleCollapsed(unitKey)}
                              className="w-full px-3.5 py-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-left text-[12px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                              style={{
                                borderTop: '1px solid var(--border-subtle)',
                                backgroundColor: 'var(--bg-surface-subtle)',
                              }}
                            >
                              {visibleChildren.slice(0, 4).map((c) => (
                                <span
                                  key={c.chapter.id}
                                  className="inline-flex items-center gap-1.5 min-w-0 max-w-[260px]"
                                >
                                  <span
                                    className="w-1.5 h-1.5 rounded-full shrink-0"
                                    style={
                                      c.resources.length > 0
                                        ? { backgroundColor: s.color }
                                        : {
                                            backgroundColor: 'transparent',
                                            boxShadow: 'inset 0 0 0 1px var(--border-strong)',
                                          }
                                    }
                                    aria-hidden="true"
                                  />
                                  <span className="truncate">{formatChapterTitle(s, c.chapter)}</span>
                                  {c.resources.length > 0 && (
                                    <span className="font-mono-num tabular-nums text-[11px] text-[var(--text-muted)] shrink-0">
                                      ({c.resources.length})
                                    </span>
                                  )}
                                </span>
                              ))}
                              {visibleChildren.length > 4 && (
                                <span className="text-[11.5px] font-medium text-[var(--accent)]">
                                  +
                                  <span className="font-mono-num tabular-nums">
                                    {visibleChildren.length - 4}
                                  </span>{' '}
                                  more
                                </span>
                              )}
                            </button>
                          )}

                          {unitOpen && (
                            <div
                              className="px-3.5 pb-3.5 pt-3 space-y-4"
                              style={{ borderTop: '1px solid var(--border-subtle)' }}
                            >
                              {!currentChapter && g.direct.length > 0 && (
                                <div className="space-y-2">
                                  <div className="text-[12px] font-medium text-[var(--text-muted)]">
                                    Unit-level {label} ·{' '}
                                    <span className="font-mono-num tabular-nums">
                                      {g.direct.length}
                                    </span>
                                  </div>
                                  {renderCards(g.direct)}
                                </div>
                              )}

                              {visibleChildren.map((c) => (
                                <div key={c.chapter.id} className="space-y-2.5">
                                  <div className="flex flex-wrap items-center justify-between gap-2 pb-1.5 border-b border-[var(--border-subtle)]">
                                    <div className="flex items-center gap-2 min-w-0">
                                      <span className="text-[13px] font-medium text-[var(--text-primary)] truncate">
                                        {formatChapterTitle(s, c.chapter)}
                                      </span>
                                      {c.resources.length > 0 && (
                                        <span className="text-[11.5px] text-[var(--text-muted)] shrink-0">
                                          ·{' '}
                                          <span className="font-mono-num tabular-nums">
                                            {c.resources.length}
                                          </span>
                                        </span>
                                      )}
                                    </div>
                                    {onCreate && (
                                      <button
                                        type="button"
                                        onClick={() => onCreate(s, c.chapter.id)}
                                        className="inline-flex items-center gap-1 text-[12px] font-medium whitespace-nowrap hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] rounded px-1"
                                        style={{ color: 'var(--accent)' }}
                                      >
                                        <Plus className="w-3 h-3" />
                                        {createActionText}
                                      </button>
                                    )}
                                  </div>
                                  {c.resources.length > 0 ? (
                                    renderCards(c.resources)
                                  ) : (
                                    <p className="text-[12px] text-[var(--text-muted)]">
                                      No {label} linked to this chapter yet.
                                    </p>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {showUnclassified && (
                      <div
                        className="rounded-xl p-3.5 space-y-2.5"
                        style={{
                          backgroundColor: 'var(--bg-surface)',
                          border: '1px solid var(--border-subtle)',
                        }}
                      >
                        <div className="text-[12.5px] font-medium text-[var(--text-muted)] pb-1.5 border-b border-[var(--border-subtle)]">
                          Unlinked to a unit or chapter ·{' '}
                          <span className="font-mono-num tabular-nums">{unclassified.length}</span>
                        </div>
                        {renderCards(unclassified)}
                      </div>
                    )}
                  </div>
                )}
              </section>
            );
          })}

          {unassignedSubjectResources.length > 0 && (
            <section
              className="rounded-xl p-4 space-y-3"
              style={{
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div className="text-[13.5px] font-semibold text-[var(--text-primary)]">
                Unassigned subject ·{' '}
                <span className="font-mono-num tabular-nums font-normal text-[var(--text-muted)]">
                  {unassignedSubjectResources.length}
                </span>
              </div>
              {renderCards(unassignedSubjectResources)}
            </section>
          )}
        </div>
      )}
    </div>
  );
}
