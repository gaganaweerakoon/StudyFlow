import { SyllabusImport } from '../../notes/SyllabusImport';
import { studyChart } from '../../utils/workspaceMetrics';
import React, { useEffect, useMemo, useState } from 'react';
import {
  LayoutGrid,
  List,
  Plus,
  Code2,
  Sigma,
  FlaskConical,
  Brain,
  LineChart as LineChartIcon,
  ArrowLeft,
  Check,
  Calendar,
  BookOpen,
  Archive,
  ArchiveRestore,
  ChevronRight,
  Layers,
  X,
  Trash2,
  Pencil,
  MoreHorizontal,
  ArrowUp,
  ArrowDown,
  FileText,
  FilePlus,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { useApp } from '../../context/AppContext';
import { markdownToPlainPreview } from '../../assistant/markdownNormalize';
import type { ChapterItem, Subject, TopicItem } from '../../types/studyflow';
import { calculateSubjectProgress } from '../../utils/studyLogic';
import { chapterNumber, chapterUnit, formatChapterTitle, formatUnitTitle, groupedChapters, isChapterArchived, stripSyllabusNumberPrefix, syllabusUnits } from '../../utils/syllabusHierarchy';

type DetailTab = 'chapters' | 'overview' | 'tasks' | 'notes' | 'flashcards' | 'performance';
type RootSectionTab = 'subjects' | 'chapters';
type ArchiveFilter = 'active' | 'archived';

const SUBJECT_ICONS: Record<Subject['icon'], React.ComponentType<{ className?: string }>> = {
  code: Code2,
  sigma: Sigma,
  flask: FlaskConical,
  brain: Brain,
  chart: LineChartIcon,
};

const SUBJECT_SWATCHES = ['#4F46E5', '#0D9488', '#D97706', '#E11D48', '#7C3AED', '#2563EB', '#059669'];

function getChapterStats(chapter: ChapterItem) {
  const total = chapter.topics.length;
  const completed = chapter.topics.filter((t) => t.completed).length;
  const percent = total === 0 ? 0 : Math.round((completed / total) * 100);
  const avgConfidence =
    total === 0
      ? 0
      : Number((chapter.topics.reduce((acc, t) => acc + t.confidence, 0) / total).toFixed(1));
  const remaining = total - completed;
  return { total, completed, remaining, percent, avgConfidence };
}

export const SubjectsView: React.FC = () => {
  const {
    subjects,
    sessions,
    focusHistory,
    selectedSubjectId,
    setSelectedSubjectId,
    updateSubject,
    deleteSubject,
    toggleArchiveSubject,
    toggleArchiveChapter,
    addUnit, updateUnit, reorderUnit, reorderChapter,
    addChapter,
    updateChapter,
    deleteChapter,
    addTopic,
    deleteTopic,
    toggleTopicCompletion,
    updateTopicConfidence,
    tasks,
    toggleTaskStatus,
    notes, createNote, setNotesSyllabusScope,
    setSelectedNoteId,
    decks,
    flashcards,
    setRoute,
    setActiveModal,
  } = useApp();

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [rootTab, setRootTab] = useState<RootSectionTab>('subjects');
  const [archiveFilter, setArchiveFilter] = useState<ArchiveFilter>('active');
  const [chapterArchiveFilter, setChapterArchiveFilter] = useState<ArchiveFilter>('active');
  const [activeTab, setActiveTab] = useState<DetailTab>('chapters');
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null);

  // Add Chapter popup state
  const [chapterModalOpen, setChapterModalOpen] = useState(false);
  const [newChapterSubjectId, setNewChapterSubjectId] = useState<string>('');
  const [newChapterUnitId, setNewChapterUnitId] = useState('');
  const [editChapterUnitId, setEditChapterUnitId] = useState('');
  const [unitDraft, setUnitDraft] = useState<{ subjectId: string; unitId?: string; title: string } | null>(null);
  const [collapsedUnits, setCollapsedUnits] = useState<Set<string>>(() => new Set());
  const [openUnitMenuId, setOpenUnitMenuId] = useState<string | null>(null);
  const [newChapterTitle, setNewChapterTitle] = useState('');
  const [newChapterTopics, setNewChapterTopics] = useState('');

  useEffect(() => {
    if (!openUnitMenuId) return;
    const handlePointerDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest('[data-unit-menu]')) return;
      setOpenUnitMenuId(null);
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenUnitMenuId(null);
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [openUnitMenuId]);

  // Edit Subject popup state
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [editSubCode, setEditSubCode] = useState('');
  const [editSubName, setEditSubName] = useState('');
  const [editSubInstructor, setEditSubInstructor] = useState('');
  const [editSubCurrentGrade, setEditSubCurrentGrade] = useState('');
  const [editSubTargetGrade, setEditSubTargetGrade] = useState('');
  const [editSubColor, setEditSubColor] = useState(SUBJECT_SWATCHES[0]);

  // Edit Chapter popup state
  const [editingChapter, setEditingChapter] = useState<{ subjectId: string; chapter: ChapterItem } | null>(null);
  const [editChapterTitle, setEditChapterTitle] = useState('');

  // Delete confirmation popup state
  const [deleteTarget, setDeleteTarget] = useState<
    | { kind: 'subject'; subject: Subject }
    | { kind: 'chapter'; subjectId: string; chapter: ChapterItem }
    | null
  >(null);

  // Inline Add Topic state inside Chapter view
  const [newTopicTitle, setNewTopicTitle] = useState('');
  const [newTopicDifficulty, setNewTopicDifficulty] = useState<TopicItem['difficulty']>('medium');

  const activeSubject = selectedSubjectId
    ? subjects.find((s) => s.id === selectedSubjectId) ?? null
    : null;

  const activeChapter =
    activeSubject && selectedChapterId
      ? activeSubject.chapters.find((c) => c.id === selectedChapterId) ?? null
      : null;

  // Reset chapter archive filter when switching subjects
  useEffect(() => {
    setChapterArchiveFilter('active');
  }, [selectedSubjectId]);

  // Close popups on Escape
  useEffect(() => {
    if (!chapterModalOpen && !editingSubject && !editingChapter && !deleteTarget) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setChapterModalOpen(false);
        setEditingSubject(null);
        setEditingChapter(null);
        setDeleteTarget(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [chapterModalOpen, editingSubject, editingChapter, deleteTarget]);

  const surfaceStyle: React.CSSProperties = {
    backgroundColor: 'var(--bg-surface)',
    border: '1px solid var(--border-subtle)',
  };

  const inputStyle: React.CSSProperties = {
    backgroundColor: 'var(--bg-surface-subtle)',
    border: '1px solid var(--border-subtle)',
    color: 'var(--text-primary)',
  };

  function weeklyProgress(id: string) {
    const blocks = sessions.filter((s) => s.subjectId === id && s.countsTowardStudy !== false);
    const history = focusHistory.filter((h) => h.subjectId === id);
    const weekly = studyChart('weekly', blocks, history);
    const total = weekly.reduce((sum, day) => sum + day.planned, 0);
    const completed = weekly.reduce((sum, day) => sum + day.actual, 0);
    return {
      total: +total.toFixed(2),
      completed: +completed.toFixed(2),
      percent: total ? Math.min(100, Math.round((100 * completed) / total)) : 0,
    };
  }

  const openAddChapterModal = (preferredSubjectId?: string, preferredUnitId?: string) => {
    const fallbackId =
      preferredSubjectId ??
      activeSubject?.id ??
      subjects.find((s) => !s.archived)?.id ??
      subjects[0]?.id ??
      '';
    setNewChapterSubjectId(fallbackId);
    setNewChapterUnitId(preferredUnitId ?? subjects.filter(subject => subject.id === fallbackId).flatMap(syllabusUnits).find(unit => !unit.archived)?.id ?? '');
    setNewChapterTitle('');
    setNewChapterTopics('');
    setChapterModalOpen(true);
  };

  const handleCreateChapterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChapterSubjectId || !newChapterTitle.trim() || !newChapterUnitId) return;
    const topics = newChapterTopics
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
    addChapter(newChapterSubjectId, newChapterTitle.trim(), topics, newChapterUnitId || undefined);
    setChapterModalOpen(false);
    setNewChapterTitle('');
    setNewChapterTopics('');
  };

  const openEditSubjectModal = (sub: Subject) => {
    setEditingSubject(sub);
    setEditSubCode(sub.code);
    setEditSubName(sub.name);
    setEditSubInstructor(sub.instructor);
    setEditSubCurrentGrade(sub.currentGrade);
    setEditSubTargetGrade(sub.targetGrade);
    setEditSubColor(sub.color);
  };

  const handleEditSubjectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSubject || !editSubCode.trim() || !editSubName.trim()) return;
    updateSubject(editingSubject.id, {
      code: editSubCode.trim().toUpperCase(),
      name: editSubName.trim(),
      instructor: editSubInstructor.trim() || 'Faculty Instructor',
      currentGrade: editSubCurrentGrade.trim() || '—',
      targetGrade: editSubTargetGrade.trim() || 'A',
      color: editSubColor,
    });
    setEditingSubject(null);
  };

  const openEditChapterModal = (subjectId: string, chapter: ChapterItem) => {
    setEditingChapter({ subjectId, chapter });
    setEditChapterTitle(stripSyllabusNumberPrefix(chapter.title));
    setEditChapterUnitId(chapter.unitId ?? '');
  };

  const handleEditChapterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingChapter || !editChapterTitle.trim()) return;
    updateChapter(editingChapter.subjectId, editingChapter.chapter.id, editChapterTitle.trim(), editChapterUnitId || undefined);
    setEditingChapter(null);
  };

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    if (deleteTarget.kind === 'subject') {
      deleteSubject(deleteTarget.subject.id);
      if (selectedSubjectId === deleteTarget.subject.id) {
        setSelectedChapterId(null);
        setSelectedSubjectId(null);
      }
    } else {
      deleteChapter(deleteTarget.subjectId, deleteTarget.chapter.id);
      if (selectedChapterId === deleteTarget.chapter.id) {
        setSelectedChapterId(null);
      }
    }
    setDeleteTarget(null);
  };

  const fadedIconBtnClass =
    'p-1 rounded-md text-[var(--text-muted)] opacity-45 group-hover:opacity-90 hover:!opacity-100 hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] focus-visible:opacity-100 transition-opacity transition-colors';
  const fadedTrashBtnClass =
    'p-1 rounded-md text-[var(--text-muted)] opacity-45 group-hover:opacity-90 hover:!opacity-100 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-500/10 focus-visible:opacity-100 transition-opacity transition-colors';

  // Flattened chapters across all subjects for the root "Chapters" view
  const allChaptersList = useMemo(() => {
    return subjects.flatMap((sub) =>
      sub.chapters.map((chapter, index) => ({
        subject: sub,
        chapter,
        index,
      })),
    );
  }, [subjects]);

  // Shared Chapter Card renderer — matches Subject Card visual language & hierarchy
  const renderChapterCard = (
    sub: Subject,
    ch: ChapterItem,
    _chapterNumber: number,
    showSubjectName = false,
    reorderControls?: { canUp: boolean; canDown: boolean; onUp: () => void; onDown: () => void },
  ) => {
    const stats = getChapterStats(ch);
    const isArchived = Boolean(ch.archived);

    return (
      <div
        key={`${sub.id}-${ch.id}`}
        onClick={() => {
          setSelectedSubjectId(sub.id);
          setActiveTab('chapters');
          setSelectedChapterId(ch.id);
        }}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setSelectedSubjectId(sub.id);
            setActiveTab('chapters');
            setSelectedChapterId(ch.id);
          }
        }}
        className="rounded-xl p-4 text-left hover:border-[var(--border-strong)] transition-all space-y-3.5 group cursor-pointer"
        style={{
          ...surfaceStyle,
          opacity: isArchived ? 0.78 : 1,
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
              style={{ backgroundColor: `${sub.color}1C`, color: sub.color }}
            >
              <BookOpen className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-[11.5px] font-medium text-[var(--text-muted)] truncate">
                {showSubjectName ? `${sub.code} · ${sub.name} · ` : `${sub.code} · `}Chapter {chapterNumber(sub, ch.id)}
                {isChapterArchived(sub, ch) ? ' · Archived' : ''}
              </div>
              <h2 className="font-display text-[15px] font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors truncate">
                {stripSyllabusNumberPrefix(ch.title)}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <span className="font-mono-num text-[12.5px] font-semibold text-[var(--text-primary)] tabular-nums mr-0.5">
              {stats.percent}%
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                openEditChapterModal(sub.id, ch);
              }}
              aria-label={`Edit chapter ${ch.title}`}
              title="Edit chapter"
              className={fadedIconBtnClass}
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggleArchiveChapter(sub.id, ch.id);
              }}
              aria-label={isArchived ? `Restore chapter ${ch.title}` : `Archive chapter ${ch.title}`}
              title={isArchived ? 'Restore chapter' : 'Archive chapter'}
              className={fadedIconBtnClass}
            >
              {isArchived ? (
                <ArchiveRestore className="w-3.5 h-3.5" />
              ) : (
                <Archive className="w-3.5 h-3.5" />
              )}
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setDeleteTarget({ kind: 'chapter', subjectId: sub.id, chapter: ch });
              }}
              aria-label={`Delete chapter ${ch.title}`}
              title="Delete chapter"
              className={fadedTrashBtnClass}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between text-[12px] mb-1">
            <span className="text-[var(--text-secondary)]">Topics completed</span>
            <span className="font-mono-num font-medium text-[var(--text-primary)] tabular-nums">
              {stats.completed} / {stats.total}
            </span>
          </div>
          <div
            className="h-1.5 w-full rounded-full overflow-hidden"
            style={{ backgroundColor: 'var(--bg-surface-hover)' }}
          >
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${stats.percent}%`, backgroundColor: sub.color }}
            />
          </div>
        </div>

        <div
          className="pt-2.5 flex items-center justify-between gap-2 text-[11.5px] text-[var(--text-muted)]"
          style={{ borderTop: '1px solid var(--border-subtle)' }}
        >
          <div className="flex items-center gap-2.5 min-w-0 truncate">
            <span className="truncate">
              {stats.remaining === 0 && stats.total > 0 ? (
                'All topics mastered'
              ) : (
                <>
                  <span className="font-mono-num tabular-nums">{stats.remaining}</span> remaining
                </>
              )}
            </span>
            <span aria-hidden="true" className="opacity-40">
              ·
            </span>
            <span className="truncate">
              {stats.total > 0 ? (
                <>
                  Confidence <span className="font-mono-num tabular-nums">{stats.avgConfidence}/5</span>
                </>
              ) : (
                'No topics yet'
              )}
            </span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {reorderControls && (reorderControls.canUp || reorderControls.canDown) && (
              <div
                className="inline-flex items-center gap-0.5 mr-1 opacity-60 group-hover:opacity-100 focus-within:opacity-100 transition-opacity"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  disabled={!reorderControls.canUp}
                  onClick={(e) => {
                    e.stopPropagation();
                    reorderControls.onUp();
                  }}
                  aria-label={`Move chapter ${stripSyllabusNumberPrefix(ch.title)} earlier`}
                  title="Move earlier"
                  className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] disabled:opacity-25 disabled:pointer-events-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                >
                  <ArrowUp className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  disabled={!reorderControls.canDown}
                  onClick={(e) => {
                    e.stopPropagation();
                    reorderControls.onDown();
                  }}
                  aria-label={`Move chapter ${stripSyllabusNumberPrefix(ch.title)} later`}
                  title="Move later"
                  className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] disabled:opacity-25 disabled:pointer-events-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                >
                  <ArrowDown className="w-3 h-3" />
                </button>
              </div>
            )}
            <span className="inline-flex items-center gap-0.5 text-[var(--text-secondary)] group-hover:text-[var(--accent)] transition-colors">
              Open <ChevronRight className="w-3 h-3" />
            </span>
          </div>
        </div>
      </div>
    );
  };

  // Shared Add Chapter Popup Modal
  const addChapterModal = chapterModalOpen ? (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-chapter-modal-title"
    >
      <div
        className="fixed inset-0 bg-black/45 backdrop-blur-[2px]"
        onClick={() => setChapterModalOpen(false)}
      />
      <div
        className="relative w-full max-w-md rounded-2xl overflow-hidden"
        style={{
          backgroundColor: 'var(--bg-elevated)',
          border: '1px solid var(--border-subtle)',
          boxShadow: 'var(--shadow-floating)',
        }}
      >
        <div
          className="flex items-center justify-between px-5 py-3.5"
          style={{ borderBottom: '1px solid var(--border-subtle)' }}
        >
          <h2
            id="add-chapter-modal-title"
            className="font-display font-semibold text-[15px] text-[var(--text-primary)]"
          >
            Add Chapter
          </h2>
          <button
            type="button"
            onClick={() => setChapterModalOpen(false)}
            aria-label="Close add chapter modal"
            className="p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleCreateChapterSubmit} className="p-5 space-y-3.5">
          <div>
            <label className="block text-[12px] font-medium text-[var(--text-secondary)] mb-1">
              Subject
            </label>
            <select
              value={newChapterSubjectId}
              onChange={(e) => { const id = e.target.value; setNewChapterSubjectId(id); setNewChapterUnitId(subjects.filter(subject => subject.id === id).flatMap(syllabusUnits).find(unit => !unit.archived)?.id ?? ''); }}
              className="w-full px-2.5 py-2 rounded-lg text-[13px]"
              style={inputStyle}
              required
            >
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.code} · {s.name}
                  {s.archived ? ' (Archived)' : ''}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[12px] font-medium text-[var(--text-secondary)] mb-1">Unit</label>
            <select aria-label="Chapter unit" value={newChapterUnitId} onChange={e => setNewChapterUnitId(e.target.value)} className="w-full px-2.5 py-2 rounded-lg text-[13px]" style={inputStyle} required>
              <option value="" disabled>Select an active unit</option>
              {subjects.filter(subject => subject.id === newChapterSubjectId).flatMap(subject => groupedChapters(subject)).filter(({unit}) => !unit.archived).map(({unit, number}) => <option key={unit.id} value={unit.id}>{formatUnitTitle(number, unit.title)}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[12px] font-medium text-[var(--text-secondary)] mb-1">
              Chapter Title
            </label>
            <input
              type="text"
              value={newChapterTitle}
              onChange={(e) => setNewChapterTitle(e.target.value)}
              placeholder="e.g., Randomized & Approximation Algorithms"
              className="w-full px-3 py-2 rounded-lg text-[13px]"
              style={inputStyle}
              autoFocus
              required
            />
          </div>
          <div>
            <label className="block text-[12px] font-medium text-[var(--text-secondary)] mb-1">
              Initial Topics (optional, one per line)
            </label>
            <textarea
              rows={3}
              value={newChapterTopics}
              onChange={(e) => setNewChapterTopics(e.target.value)}
              placeholder={'Las Vegas vs Monte Carlo algorithms\nRandomized QuickSort expected runtime'}
              className="w-full px-3 py-2 rounded-lg text-[12.5px] resize-none"
              style={inputStyle}
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setChapterModalOpen(false)}
              className="px-3.5 py-1.5 rounded-lg text-[13px] text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!newChapterTitle.trim() || !newChapterSubjectId || !newChapterUnitId}
              className="px-4 py-1.5 rounded-lg text-[13px] font-medium disabled:opacity-40"
              style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' }}
            >
              Add Chapter
            </button>
          </div>
        </form>
      </div>
    </div>
  ) : null;

  const editSubjectModal = editingSubject ? (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-subject-modal-title"
    >
      <div
        className="fixed inset-0 bg-black/45 backdrop-blur-[2px]"
        onClick={() => setEditingSubject(null)}
      />
      <div
        className="relative w-full max-w-md rounded-2xl overflow-hidden"
        style={{
          backgroundColor: 'var(--bg-elevated)',
          border: '1px solid var(--border-subtle)',
          boxShadow: 'var(--shadow-floating)',
        }}
      >
        <div
          className="flex items-center justify-between px-5 py-3.5"
          style={{ borderBottom: '1px solid var(--border-subtle)' }}
        >
          <h2
            id="edit-subject-modal-title"
            className="font-display font-semibold text-[15px] text-[var(--text-primary)]"
          >
            Edit Subject
          </h2>
          <button
            type="button"
            onClick={() => setEditingSubject(null)}
            aria-label="Close edit subject modal"
            className="p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleEditSubjectSubmit} className="p-5 space-y-3.5">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[12px] font-medium text-[var(--text-secondary)] mb-1">
                Code
              </label>
              <input
                type="text"
                value={editSubCode}
                onChange={(e) => setEditSubCode(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-[13px]"
                style={inputStyle}
                autoFocus
                required
              />
            </div>
            <div className="col-span-2">
              <label className="block text-[12px] font-medium text-[var(--text-secondary)] mb-1">
                Subject Title
              </label>
              <input
                type="text"
                value={editSubName}
                onChange={(e) => setEditSubName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-[13px]"
                style={inputStyle}
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] font-medium text-[var(--text-secondary)] mb-1">
                Instructor
              </label>
              <input
                type="text"
                value={editSubInstructor}
                onChange={(e) => setEditSubInstructor(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-[13px]"
                style={inputStyle}
              />
            </div>
            <p className="self-center text-[12px] text-[var(--text-muted)]">Weekly study targets follow your calendar plan.</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] font-medium text-[var(--text-secondary)] mb-1">
                Current Grade
              </label>
              <input
                type="text"
                value={editSubCurrentGrade}
                onChange={(e) => setEditSubCurrentGrade(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-[13px] font-mono-num"
                style={inputStyle}
              />
            </div>
            <div>
              <label className="block text-[12px] font-medium text-[var(--text-secondary)] mb-1">
                Target Grade
              </label>
              <input
                type="text"
                value={editSubTargetGrade}
                onChange={(e) => setEditSubTargetGrade(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-[13px] font-mono-num"
                style={inputStyle}
              />
            </div>
          </div>
          <div>
            <label className="block text-[12px] font-medium text-[var(--text-secondary)] mb-1.5">
              Subject Color
            </label>
            <div className="flex items-center gap-2">
              {SUBJECT_SWATCHES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setEditSubColor(c)}
                  aria-label={`Color ${c}`}
                  className="w-6 h-6 rounded-full transition-transform hover:scale-110"
                  style={{
                    backgroundColor: c,
                    outline: editSubColor === c ? '2px solid var(--text-primary)' : 'none',
                    outlineOffset: 2,
                  }}
                />
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setEditingSubject(null)}
              className="px-3.5 py-1.5 rounded-lg text-[13px] text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!editSubCode.trim() || !editSubName.trim()}
              className="px-4 py-1.5 rounded-lg text-[13px] font-medium disabled:opacity-40"
              style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' }}
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  ) : null;

  const editChapterModal = editingChapter ? (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-chapter-modal-title"
    >
      <div
        className="fixed inset-0 bg-black/45 backdrop-blur-[2px]"
        onClick={() => setEditingChapter(null)}
      />
      <div
        className="relative w-full max-w-md rounded-2xl overflow-hidden"
        style={{
          backgroundColor: 'var(--bg-elevated)',
          border: '1px solid var(--border-subtle)',
          boxShadow: 'var(--shadow-floating)',
        }}
      >
        <div
          className="flex items-center justify-between px-5 py-3.5"
          style={{ borderBottom: '1px solid var(--border-subtle)' }}
        >
          <h2
            id="edit-chapter-modal-title"
            className="font-display font-semibold text-[15px] text-[var(--text-primary)]"
          >
            Edit Chapter
          </h2>
          <button
            type="button"
            onClick={() => setEditingChapter(null)}
            aria-label="Close edit chapter modal"
            className="p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleEditChapterSubmit} className="p-5 space-y-3.5">
          <label className="block text-[12px] font-medium text-[var(--text-secondary)]">Unit
            <select aria-label="Move chapter to unit" value={editChapterUnitId} onChange={e => setEditChapterUnitId(e.target.value)} className="w-full px-2.5 py-2 rounded-lg text-[13px]" style={inputStyle}>
              {subjects.filter(subject => subject.id === editingChapter.subjectId).flatMap(subject => groupedChapters(subject)).filter(({unit}) => !unit.archived || unit.id === editingChapter.chapter.unitId).map(({unit, number}) => <option key={unit.id} value={unit.id}>{formatUnitTitle(number, unit.title)}</option>)}
            </select>
          </label>
          <div>
            <label className="block text-[12px] font-medium text-[var(--text-secondary)] mb-1">
              Chapter Title
            </label>
            <input
              type="text"
              value={editChapterTitle}
              onChange={(e) => setEditChapterTitle(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-[13px]"
              style={inputStyle}
              autoFocus
              required
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setEditingChapter(null)}
              className="px-3.5 py-1.5 rounded-lg text-[13px] text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!editChapterTitle.trim()}
              className="px-4 py-1.5 rounded-lg text-[13px] font-medium disabled:opacity-40"
              style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' }}
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  ) : null;

  const deleteConfirmModal = deleteTarget ? (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-confirm-modal-title"
    >
      <div
        className="fixed inset-0 bg-black/45 backdrop-blur-[2px]"
        onClick={() => setDeleteTarget(null)}
      />
      <div
        className="relative w-full max-w-sm rounded-2xl overflow-hidden"
        style={{
          backgroundColor: 'var(--bg-elevated)',
          border: '1px solid var(--border-subtle)',
          boxShadow: 'var(--shadow-floating)',
        }}
      >
        <div className="p-5 space-y-3">
          <h2
            id="delete-confirm-modal-title"
            className="font-display font-semibold text-[15px] text-[var(--text-primary)]"
          >
            {deleteTarget.kind === 'subject'
              ? `Delete ${deleteTarget.subject.code}?`
              : 'Delete chapter?'}
          </h2>
          <p className="text-[12.5px] text-[var(--text-secondary)] leading-relaxed">
            {deleteTarget.kind === 'subject'
              ? `"${deleteTarget.subject.name}" and its ${deleteTarget.subject.chapters.length} chapter${deleteTarget.subject.chapters.length === 1 ? '' : 's'} will be permanently removed. Linked tasks, sessions, notes, goals, tests and other records will be kept as unassigned. You can archive it instead to keep the syllabus and its progress.`
              : `"${deleteTarget.chapter.title}" and its ${deleteTarget.chapter.topics.length} topic${deleteTarget.chapter.topics.length === 1 ? '' : 's'} will be permanently removed. Linked notes will be kept; only this chapter association is cleared.`}
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setDeleteTarget(null)}
              className="px-3.5 py-1.5 rounded-lg text-[13px] text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmDelete}
              className="px-4 py-1.5 rounded-lg text-[13px] font-medium bg-rose-600 text-white hover:bg-rose-700 transition-colors"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  ) : null;

  const allModals = (
    <>
      {addChapterModal}
      {editSubjectModal}
      {editChapterModal}
      {deleteConfirmModal}
    </>
  );

  // =========================================================================
  // LEVEL 3: CHAPTER DETAIL VIEW (INSIDE A SUBJECT)
  // =========================================================================
  if (activeSubject && activeChapter) {
    const stats = getChapterStats(activeChapter);

    return (
      <div className="space-y-4 pb-6">
        {/* Breadcrumb + Chapter Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setSelectedChapterId(null)}
              aria-label={`Back to ${activeSubject.name} chapters`}
              className="p-2 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] shrink-0"
              style={surfaceStyle}
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ backgroundColor: `${activeSubject.color}1F`, color: activeSubject.color }}
            >
              <BookOpen className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-[12px] text-[var(--text-muted)] flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedChapterId(null);
                    setSelectedSubjectId(null);
                  }}
                  className="hover:text-[var(--text-primary)] hover:underline"
                >
                  Subjects & Courses
                </button>
                <span aria-hidden="true">/</span>
                <button
                  type="button"
                  onClick={() => setSelectedChapterId(null)}
                  className="hover:text-[var(--text-primary)] hover:underline"
                >
                  {activeSubject.code}
                </button>
                <span aria-hidden="true">/</span><span>{stripSyllabusNumberPrefix(chapterUnit(activeSubject, activeChapter)?.title ?? '')}</span>
                {isChapterArchived(activeSubject, activeChapter) && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>Archived</span>
                  </>
                )}
              </div>
              <h1 className="font-display text-[19px] font-semibold text-[var(--text-primary)] truncate">
                {formatChapterTitle(activeSubject, activeChapter)}
              </h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 shrink-0">
            <button type="button" onClick={()=>{ const scope={subjectId:activeSubject.id,unitId:chapterUnit(activeSubject,activeChapter)?.id,chapterId:activeChapter.id}; setNotesSyllabusScope(scope); setRoute('notes'); }} className="rounded-lg px-3 py-2 text-xs border border-[var(--border-subtle)]">Linked notes ({notes.filter(note=>note.subjectId===activeSubject.id && note.syllabusLinks?.chapterIds?.includes(activeChapter.id)).length})</button>
            <button type="button" onClick={()=>{createNote(activeSubject.id,'fld-all',{title:stripSyllabusNumberPrefix(activeChapter.title),syllabusLinks:{chapterIds:[activeChapter.id]}}); setNotesSyllabusScope({subjectId:activeSubject.id,unitId:chapterUnit(activeSubject,activeChapter)?.id,chapterId:activeChapter.id}); setRoute('notes');}} className="rounded-lg px-3 py-2 text-xs bg-[var(--accent)] text-[var(--accent-fg)]">+ Create Note</button>
            <button
              type="button"
              onClick={() => openEditChapterModal(activeSubject.id, activeChapter)}
              aria-label={`Edit chapter ${activeChapter.title}`}
              title="Edit chapter"
              className="p-2 rounded-lg text-[var(--text-muted)] opacity-70 hover:opacity-100 hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] transition-opacity transition-colors"
              style={surfaceStyle}
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => toggleArchiveChapter(activeSubject.id, activeChapter.id)}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[12px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] whitespace-nowrap"
              style={surfaceStyle}
            >
              {activeChapter.archived ? (
                <>
                  <ArchiveRestore className="w-3.5 h-3.5" /> Restore Chapter
                </>
              ) : (
                <>
                  <Archive className="w-3.5 h-3.5" /> Archive Chapter
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() =>
                setDeleteTarget({
                  kind: 'chapter',
                  subjectId: activeSubject.id,
                  chapter: activeChapter,
                })
              }
              aria-label={`Delete chapter ${activeChapter.title}`}
              title="Delete chapter"
              className="p-2 rounded-lg text-[var(--text-muted)] opacity-70 hover:opacity-100 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-500/10 transition-opacity transition-colors"
              style={surfaceStyle}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Chapter Summary Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-xl p-4" style={surfaceStyle}>
            <div className="text-[12px] text-[var(--text-muted)]">Chapter Completion</div>
            <div className="font-mono-num text-[22px] font-semibold text-[var(--text-primary)] mt-1 tabular-nums">
              {stats.percent}%
            </div>
            <div className="mt-2 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-surface-hover)' }}>
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${stats.percent}%`, backgroundColor: activeSubject.color }}
              />
            </div>
          </div>
          <div className="rounded-xl p-4" style={surfaceStyle}>
            <div className="text-[12px] text-[var(--text-muted)]">Topics Completed</div>
            <div className="font-mono-num text-[22px] font-semibold text-[var(--text-primary)] mt-1 tabular-nums">
              {stats.completed} / {stats.total}
            </div>
            <div className="text-[11.5px] text-[var(--text-muted)] mt-0.5 tabular-nums">
              {stats.remaining} remaining in this chapter
            </div>
          </div>
          <div className="rounded-xl p-4" style={surfaceStyle}>
            <div className="text-[12px] text-[var(--text-muted)]">Average Confidence</div>
            <div className="font-mono-num text-[22px] font-semibold text-[var(--text-primary)] mt-1 tabular-nums">
              {stats.total > 0 ? `${stats.avgConfidence} / 5` : '—'}
            </div>
            <div className="text-[11.5px] text-[var(--text-muted)] mt-0.5">
              Self-rated recall readiness
            </div>
          </div>
        </div>

        {/* Topics List + Add Topic Form */}
        <div className="rounded-xl overflow-hidden" style={surfaceStyle}>
          <div
            className="px-4 py-3 flex flex-wrap items-center justify-between gap-2"
            style={{ borderBottom: '1px solid var(--border-subtle)' }}
          >
            <div>
              <h2 className="font-display text-[14.5px] font-semibold text-[var(--text-primary)]">
                Chapter Topics
              </h2>
              <p className="text-[12px] text-[var(--text-muted)]">
                Check off mastered topics and track recall confidence
              </p>
            </div>
          </div>

          {activeChapter.topics.length === 0 ? (
            <div className="p-8 text-center text-[13px] text-[var(--text-muted)]">
              No topics in this chapter yet. Add your first topic below.
            </div>
          ) : (
            <div className="divide-y divide-[var(--border-subtle)]">
              {activeChapter.topics.map((tp) => (
                <div
                  key={tp.id}
                  className="px-4 py-3 flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <button
                      type="button"
                      onClick={() => toggleTopicCompletion(activeSubject.id, activeChapter.id, tp.id)}
                      aria-label={`Toggle completion for ${tp.title}`}
                      className="w-4 h-4 rounded flex items-center justify-center shrink-0 transition-colors"
                      style={{
                        border: tp.completed ? 'none' : '1.5px solid var(--border-strong)',
                        backgroundColor: tp.completed ? activeSubject.color : 'transparent',
                        color: '#fff',
                      }}
                    >
                      {tp.completed && <Check className="w-3 h-3" strokeWidth={2.5} />}
                    </button>
                    <div className="min-w-0">
                      <div
                        className={`text-[13px] font-medium ${
                          tp.completed
                            ? 'text-[var(--text-muted)] line-through'
                            : 'text-[var(--text-primary)]'
                        }`}
                      >
                        {tp.title}
                      </div>
                      <div className="text-[11.5px] text-[var(--text-muted)] capitalize">
                        Difficulty: {tp.difficulty} · Revision: {tp.revisionStatus.replace('_', ' ')}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-[var(--text-muted)]">Confidence</span>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((lvl) => (
                          <button
                            key={lvl}
                            type="button"
                            onClick={() =>
                              updateTopicConfidence(activeSubject.id, activeChapter.id, tp.id, lvl)
                            }
                            aria-label={`Set confidence ${lvl} of 5 for ${tp.title}`}
                            className="w-4 h-2 rounded-sm transition-colors"
                            style={{
                              backgroundColor:
                                lvl <= tp.confidence
                                  ? activeSubject.color
                                  : 'var(--bg-surface-hover)',
                            }}
                          />
                        ))}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => deleteTopic(activeSubject.id, activeChapter.id, tp.id)}
                      aria-label={`Remove topic ${tp.title}`}
                      title="Remove topic"
                      className="p-1 rounded text-[var(--text-muted)] opacity-0 group-hover:opacity-100 focus-visible:opacity-100 hover:text-rose-600 dark:hover:text-rose-400 transition-opacity"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add Topic Inline Row */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!newTopicTitle.trim()) return;
              addTopic(activeSubject.id, activeChapter.id, newTopicTitle.trim(), newTopicDifficulty);
              setNewTopicTitle('');
            }}
            className="px-4 py-3 flex flex-wrap sm:flex-nowrap items-center gap-2"
            style={{
              borderTop: '1px solid var(--border-subtle)',
              backgroundColor: 'var(--bg-surface-subtle)',
            }}
          >
            <input
              type="text"
              value={newTopicTitle}
              onChange={(e) => setNewTopicTitle(e.target.value)}
              placeholder="Add a topic to this chapter..."
              aria-label="New topic title"
              className="flex-1 min-w-[200px] px-3 py-1.5 rounded-lg text-[12.5px]"
              style={{
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-primary)',
              }}
            />
            <select
              value={newTopicDifficulty}
              onChange={(e) => setNewTopicDifficulty(e.target.value as TopicItem['difficulty'])}
              aria-label="Topic difficulty"
              className="px-2.5 py-1.5 rounded-lg text-[12.5px]"
              style={{
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-primary)',
              }}
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
            <button
              type="submit"
              disabled={!newTopicTitle.trim()}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[12.5px] font-medium disabled:opacity-40 whitespace-nowrap"
              style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' }}
            >
              <Plus className="w-3.5 h-3.5" /> Add Topic
            </button>
          </form>
        </div>

        {allModals}
      </div>
    );
  }

  // =========================================================================
  // LEVEL 2: SUBJECT DETAIL VIEW (CHAPTERS HIERARCHY + OVERVIEW/TASKS/NOTES)
  // =========================================================================
  if (activeSubject) {
    const Icon = SUBJECT_ICONS[activeSubject.icon] ?? Code2;
    const activeChapters = activeSubject.chapters.filter((ch) => !isChapterArchived(activeSubject, ch));
    const archivedChapters = activeSubject.chapters.filter((ch) => isChapterArchived(activeSubject, ch));
    const prog = calculateSubjectProgress(activeChapters);
    const subTasks = tasks.filter((t) => t.subjectId === activeSubject.id);
    const subNotes = notes.filter((n) => n.subjectId === activeSubject.id);
    const subDecks = decks.filter((d) => d.subjectId === activeSubject.id);
    const subCards = flashcards.filter((c) => subDecks.some((d) => d.id === c.deckId));
    const daysToExam = Math.max(
      1,
      Math.round((new Date(activeSubject.nextExamDate).getTime() - Date.now()) / 86400000),
    );

    const perfSeries = [
      { wk: 'Wk 8', hours: 5.2, quiz: 79 },
      { wk: 'Wk 9', hours: 6.4, quiz: 84 },
      { wk: 'Wk 10', hours: 7.1, quiz: 87 },
      { wk: 'Wk 11', hours: 7.8, quiz: 90 },
      { wk: 'Wk 12', hours: weeklyProgress(activeSubject.id).total, quiz: 92 },
    ];

    return (
      <div className="space-y-4 pb-6">
        {/* Subject Detail Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setSelectedSubjectId(null)}
              aria-label="Back to all subjects"
              className="p-2 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] shrink-0"
              style={surfaceStyle}
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ backgroundColor: `${activeSubject.color}1F`, color: activeSubject.color }}
            >
              <Icon className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="text-[12px] text-[var(--text-muted)] truncate">
                {activeSubject.code} · {activeSubject.instructor}
                {activeSubject.archived ? ' · Archived' : ''}
              </div>
              <h1 className="font-display text-[19px] font-semibold text-[var(--text-primary)] truncate">
                {activeSubject.name}
              </h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-[12.5px]">
            <div className="text-right">
              <div className="text-[11px] text-[var(--text-muted)]">Current / Target</div>
              <div className="font-mono-num font-semibold text-[var(--text-primary)]">
                {activeSubject.currentGrade} → {activeSubject.targetGrade}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[11px] text-[var(--text-muted)]">Next Exam</div>
              <div className="font-mono-num font-semibold text-amber-600 dark:text-amber-400">
                {Number.isFinite(daysToExam) ? `in ${daysToExam} days` : 'No exam scheduled'}
              </div>
            </div>
            <button
              type="button"
              onClick={() => openEditSubjectModal(activeSubject)}
              aria-label={`Edit subject ${activeSubject.name}`}
              title="Edit subject"
              className="p-2 rounded-lg text-[var(--text-muted)] opacity-70 hover:opacity-100 hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] transition-opacity transition-colors"
              style={surfaceStyle}
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => toggleArchiveSubject(activeSubject.id)}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[12px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] whitespace-nowrap"
              style={surfaceStyle}
            >
              {activeSubject.archived ? (
                <>
                  <ArchiveRestore className="w-3.5 h-3.5" /> Restore
                </>
              ) : (
                <>
                  <Archive className="w-3.5 h-3.5" /> Archive
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => setDeleteTarget({ kind: 'subject', subject: activeSubject })}
              aria-label={`Delete subject ${activeSubject.name}`}
              title="Delete subject"
              className="p-2 rounded-lg text-[var(--text-muted)] opacity-70 hover:opacity-100 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-500/10 transition-opacity transition-colors"
              style={surfaceStyle}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => openAddChapterModal(activeSubject.id)}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[12.5px] font-medium whitespace-nowrap"
              style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' }}
            >
              <Plus className="w-3.5 h-3.5" /> Add Chapter
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div
          className="flex items-center gap-1 overflow-x-auto pb-0.5"
          style={{ borderBottom: '1px solid var(--border-subtle)' }}
          role="tablist"
          aria-label="Subject detail tabs"
        >
          {(
            [
              { id: 'chapters', label: `Syllabus (${activeChapters.length})` },
              { id: 'overview', label: 'Overview' },
              { id: 'tasks', label: `Tasks (${subTasks.length})` },
              { id: 'notes', label: `Notes (${subNotes.length})` },
              { id: 'flashcards', label: `Flashcards (${subCards.length})` },
              { id: 'performance', label: 'Performance' },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={activeTab === t.id}
              onClick={() => setActiveTab(t.id)}
              className="px-3.5 py-2 text-[13px] font-medium whitespace-nowrap transition-colors relative"
              style={{
                color: activeTab === t.id ? 'var(--accent)' : 'var(--text-secondary)',
                borderBottom:
                  activeTab === t.id ? '2px solid var(--accent)' : '2px solid transparent',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* CHAPTERS TAB (Cards styled identically to Subject Cards) */}
        {activeTab === 'chapters' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div
                className="inline-flex items-center p-0.5 rounded-lg text-[12px]"
                style={{
                  backgroundColor: 'var(--bg-surface-subtle)',
                  border: '1px solid var(--border-subtle)',
                }}
                role="tablist"
                aria-label="Chapter archive filter"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={chapterArchiveFilter === 'active'}
                  onClick={() => setChapterArchiveFilter('active')}
                  className="px-2.5 py-1 rounded-md font-medium whitespace-nowrap transition-colors"
                  style={{
                    backgroundColor:
                      chapterArchiveFilter === 'active' ? 'var(--bg-surface)' : 'transparent',
                    color:
                      chapterArchiveFilter === 'active'
                        ? 'var(--text-primary)'
                        : 'var(--text-muted)',
                  }}
                >
                  Active ({activeChapters.length})
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={chapterArchiveFilter === 'archived'}
                  onClick={() => setChapterArchiveFilter('archived')}
                  className="px-2.5 py-1 rounded-md font-medium whitespace-nowrap transition-colors"
                  style={{
                    backgroundColor:
                      chapterArchiveFilter === 'archived' ? 'var(--bg-surface)' : 'transparent',
                    color:
                      chapterArchiveFilter === 'archived'
                        ? 'var(--text-primary)'
                        : 'var(--text-muted)',
                  }}
                >
                  Archived ({archivedChapters.length})
                </button>
              </div>

              <div className="flex items-center gap-2">
                <SyllabusImport key={activeSubject.id} subject={activeSubject.id} />
                <div
                  className="inline-flex items-center p-0.5 rounded-lg"
                  style={{
                    backgroundColor: 'var(--bg-surface-subtle)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setViewMode('grid')}
                    aria-label="Grid view"
                    className="p-1.5 rounded-md"
                    style={{
                      backgroundColor: viewMode === 'grid' ? 'var(--bg-surface)' : 'transparent',
                      color: viewMode === 'grid' ? 'var(--text-primary)' : 'var(--text-muted)',
                    }}
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('list')}
                    aria-label="List view"
                    className="p-1.5 rounded-md"
                    style={{
                      backgroundColor: viewMode === 'list' ? 'var(--bg-surface)' : 'transparent',
                      color: viewMode === 'list' ? 'var(--text-primary)' : 'var(--text-muted)',
                    }}
                  >
                    <List className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {(() => {
              const visibleUnitGroups = groupedChapters(activeSubject).filter(({ unit, chapters }) =>
                chapterArchiveFilter === 'active'
                  ? !unit.archived
                  : Boolean(unit.archived) || chapters.some((ch) => ch.archived),
              );
              const visibleKeys = visibleUnitGroups.map(({ unit }) => `${activeSubject.id}:${unit.id}`);
              const allCollapsed =
                visibleKeys.length > 0 && visibleKeys.every((k) => collapsedUnits.has(k));

              return (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-display text-[14px] font-semibold text-[var(--text-primary)]">
                        Units & chapters
                      </h3>
                      <span className="text-[12px] text-[var(--text-muted)]">
                        <span className="font-mono-num tabular-nums">{visibleUnitGroups.length}</span>{' '}
                        {visibleUnitGroups.length === 1 ? 'unit' : 'units'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {visibleUnitGroups.length > 1 && (
                        <button
                          type="button"
                          onClick={() =>
                            setCollapsedUnits((previous) => {
                              const next = new Set(previous);
                              if (allCollapsed) visibleKeys.forEach((k) => next.delete(k));
                              else visibleKeys.forEach((k) => next.add(k));
                              return next;
                            })
                          }
                          className="h-8 px-2.5 rounded-lg text-[12px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] transition-colors whitespace-nowrap"
                        >
                          {allCollapsed ? 'Expand all' : 'Collapse all'}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setUnitDraft({ subjectId: activeSubject.id, title: '' })}
                        className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[12px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                        style={surfaceStyle}
                      >
                        <Plus className="w-3.5 h-3.5" /> Add Unit
                      </button>
                    </div>
                  </div>

                  {unitDraft?.subjectId === activeSubject.id && (
                    <form
                      className="flex flex-wrap sm:flex-nowrap gap-2 items-center p-3 rounded-xl"
                      style={{
                        backgroundColor: 'var(--bg-surface)',
                        border: '1px solid var(--accent-border)',
                        boxShadow: 'var(--shadow-subtle)',
                      }}
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (!unitDraft.title.trim()) return;
                        if (unitDraft.unitId)
                          updateUnit(activeSubject.id, unitDraft.unitId, { title: unitDraft.title });
                        else addUnit(activeSubject.id, unitDraft.title);
                        setUnitDraft(null);
                      }}
                    >
                      <input
                        aria-label="Unit title"
                        autoFocus
                        required
                        value={unitDraft.title}
                        onChange={(e) => setUnitDraft({ ...unitDraft, title: e.target.value })}
                        placeholder="e.g., Core Foundations"
                        className="flex-1 min-w-[200px] h-9 px-3 rounded-lg text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                        style={inputStyle}
                      />
                      <button
                        type="submit"
                        className="h-9 px-3.5 rounded-lg text-[12.5px] font-medium whitespace-nowrap"
                        style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' }}
                      >
                        {unitDraft.unitId ? 'Save Unit' : 'Create Unit'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setUnitDraft(null)}
                        className="h-9 px-3 rounded-lg text-[12.5px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] whitespace-nowrap"
                      >
                        Cancel
                      </button>
                    </form>
                  )}

                  {visibleUnitGroups.map(({ unit, number, chapters }, unitIdx) => {
                    const groupChapters = chapters.filter((ch) =>
                      chapterArchiveFilter === 'active'
                        ? !isChapterArchived(activeSubject, ch)
                        : isChapterArchived(activeSubject, ch),
                    );
                    const key = `${activeSubject.id}:${unit.id}`;
                    const expanded = !collapsedUnits.has(key);
                    const menuOpen = openUnitMenuId === key;

                    const unitTopicsTotal = groupChapters.reduce(
                      (sum, ch) => sum + ch.topics.length,
                      0,
                    );
                    const unitTopicsDone = groupChapters.reduce(
                      (sum, ch) => sum + ch.topics.filter((t) => t.completed).length,
                      0,
                    );
                    const unitPercent =
                      unitTopicsTotal === 0
                        ? 0
                        : Math.round((unitTopicsDone / unitTopicsTotal) * 100);
                    const unitNoteCount = notes.filter(
                      (n) =>
                        n.subjectId === activeSubject.id &&
                        (n.syllabusLinks?.unitIds?.includes(unit.id) ||
                          groupChapters.some((ch) =>
                            n.syllabusLinks?.chapterIds?.includes(ch.id),
                          )),
                    ).length;

                    const canMoveUnitUp = unitIdx > 0;
                    const canMoveUnitDown = unitIdx < visibleUnitGroups.length - 1;

                    return (
                      <section
                        key={unit.id}
                        className={`rounded-xl transition-colors hover:border-[var(--border-strong)] ${menuOpen ? 'relative z-20' : 'relative'}`}
                        style={{
                          ...surfaceStyle,
                          opacity: unit.archived ? 0.8 : 1,
                        }}
                      >
                        {/* Unit Card Header — rich, scannable when collapsed and clean when expanded */}
                        <div className="px-4 py-3 flex flex-wrap sm:flex-nowrap items-center justify-between gap-3">
                          <button
                            type="button"
                            aria-expanded={expanded}
                            onClick={() =>
                              setCollapsedUnits((previous) => {
                                const next = new Set(previous);
                                if (next.has(key)) next.delete(key);
                                else next.add(key);
                                return next;
                              })
                            }
                            className="flex flex-1 items-center gap-3 min-w-0 text-left group rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                          >
                            <ChevronRight
                              className={`w-4 h-4 text-[var(--text-muted)] shrink-0 transition-transform duration-150 ${expanded ? 'rotate-90' : ''}`}
                            />
                            <div
                              className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                              style={{
                                backgroundColor: `${activeSubject.color}16`,
                                color: activeSubject.color,
                              }}
                            >
                              <Layers className="w-4 h-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="font-display text-[14.5px] font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors truncate">
                                {formatUnitTitle(number, unit.title)}
                              </div>
                              <div className="text-[12px] text-[var(--text-muted)] truncate mt-0.5">
                                <span className="font-mono-num tabular-nums">
                                  {groupChapters.length}
                                </span>{' '}
                                {groupChapters.length === 1 ? 'chapter' : 'chapters'}
                                {unitTopicsTotal > 0 ? (
                                  <>
                                    {' '}
                                    ·{' '}
                                    <span className="font-mono-num tabular-nums">
                                      {unitTopicsDone}/{unitTopicsTotal}
                                    </span>{' '}
                                    topics
                                  </>
                                ) : null}
                                {unitNoteCount > 0 ? (
                                  <>
                                    {' '}
                                    ·{' '}
                                    <span className="font-mono-num tabular-nums">
                                      {unitNoteCount}
                                    </span>{' '}
                                    {unitNoteCount === 1 ? 'note' : 'notes'}
                                  </>
                                ) : null}
                                {unit.archived ? ' · Archived' : ''}
                              </div>
                            </div>
                          </button>

                          {/* Right progress preview + uncluttered action cluster */}
                          <div className="flex items-center gap-3 shrink-0 ml-auto">
                            {unitTopicsTotal > 0 && (
                              <div className="hidden md:flex items-center gap-2.5">
                                <div
                                  className="w-20 h-1.5 rounded-full overflow-hidden"
                                  style={{
                                    backgroundColor:
                                      'color-mix(in srgb, var(--text-primary) 10%, transparent)',
                                  }}
                                >
                                  <div
                                    className="h-full rounded-full transition-all"
                                    style={{
                                      width: `${unitPercent}%`,
                                      backgroundColor: activeSubject.color,
                                    }}
                                  />
                                </div>
                                <span className="font-mono-num tabular-nums text-[12px] font-semibold text-[var(--text-primary)] w-9 text-right">
                                  {unitPercent}%
                                </span>
                              </div>
                            )}

                            <div className="flex items-center gap-1.5">
                              {!unit.archived && (
                                <button
                                  type="button"
                                  onClick={() => openAddChapterModal(activeSubject.id, unit.id)}
                                  className="inline-flex items-center gap-1 h-8 px-2.5 rounded-lg text-[12px] font-medium whitespace-nowrap transition-colors hover:bg-[var(--accent-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                                  style={{
                                    color: 'var(--accent)',
                                    border: '1px solid var(--border-subtle)',
                                  }}
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                  Chapter
                                </button>
                              )}

                              <div className="relative" data-unit-menu>
                                <button
                                  type="button"
                                  aria-label={`Unit actions for ${stripSyllabusNumberPrefix(unit.title)}`}
                                  aria-expanded={menuOpen}
                                  aria-haspopup="menu"
                                  onClick={() => setOpenUnitMenuId(menuOpen ? null : key)}
                                  className="h-8 w-8 rounded-lg inline-flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                                >
                                  <MoreHorizontal className="w-4 h-4" />
                                </button>

                                {menuOpen && (
                                  <div
                                    role="menu"
                                    className="absolute right-0 mt-1.5 w-48 rounded-xl py-1.5 z-30"
                                    style={{
                                      backgroundColor: 'var(--bg-elevated)',
                                      border: '1px solid var(--border-subtle)',
                                      boxShadow: 'var(--shadow-floating)',
                                    }}
                                  >
                                    <button
                                      type="button"
                                      role="menuitem"
                                      onClick={() => {
                                        setOpenUnitMenuId(null);
                                        setNotesSyllabusScope({
                                          subjectId: activeSubject.id,
                                          unitId: unit.id,
                                        });
                                        setRoute('notes');
                                      }}
                                      className="w-full px-3 py-2 text-left text-[12.5px] text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] flex items-center justify-between gap-2"
                                    >
                                      <span className="inline-flex items-center gap-2">
                                        <FileText className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                                        View unit notes
                                      </span>
                                      {unitNoteCount > 0 && (
                                        <span className="font-mono-num tabular-nums text-[11.5px] text-[var(--text-muted)]">
                                          {unitNoteCount}
                                        </span>
                                      )}
                                    </button>
                                    <button
                                      type="button"
                                      role="menuitem"
                                      onClick={() => {
                                        setOpenUnitMenuId(null);
                                        createNote(activeSubject.id, 'fld-all', {
                                          title: stripSyllabusNumberPrefix(unit.title),
                                          syllabusLinks: { unitIds: [unit.id] },
                                        });
                                        setNotesSyllabusScope({
                                          subjectId: activeSubject.id,
                                          unitId: unit.id,
                                        });
                                        setRoute('notes');
                                      }}
                                      className="w-full px-3 py-2 text-left text-[12.5px] text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] flex items-center gap-2"
                                    >
                                      <FilePlus className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                                      New note in unit
                                    </button>

                                    <div
                                      className="my-1"
                                      style={{ borderTop: '1px solid var(--border-subtle)' }}
                                    />

                                    <button
                                      type="button"
                                      role="menuitem"
                                      onClick={() => {
                                        setOpenUnitMenuId(null);
                                        setUnitDraft({
                                          subjectId: activeSubject.id,
                                          unitId: unit.id,
                                          title: stripSyllabusNumberPrefix(unit.title),
                                        });
                                      }}
                                      className="w-full px-3 py-2 text-left text-[12.5px] text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] flex items-center gap-2"
                                    >
                                      <Pencil className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                                      Rename unit
                                    </button>

                                    {visibleUnitGroups.length > 1 && (
                                      <>
                                        <button
                                          type="button"
                                          role="menuitem"
                                          disabled={!canMoveUnitUp}
                                          onClick={() => {
                                            setOpenUnitMenuId(null);
                                            reorderUnit(activeSubject.id, unit.id, -1);
                                          }}
                                          className="w-full px-3 py-2 text-left text-[12.5px] text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] disabled:opacity-40 disabled:pointer-events-none flex items-center gap-2"
                                        >
                                          <ArrowUp className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                                          Move unit up
                                        </button>
                                        <button
                                          type="button"
                                          role="menuitem"
                                          disabled={!canMoveUnitDown}
                                          onClick={() => {
                                            setOpenUnitMenuId(null);
                                            reorderUnit(activeSubject.id, unit.id, 1);
                                          }}
                                          className="w-full px-3 py-2 text-left text-[12.5px] text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] disabled:opacity-40 disabled:pointer-events-none flex items-center gap-2"
                                        >
                                          <ArrowDown className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                                          Move unit down
                                        </button>
                                      </>
                                    )}

                                    <div
                                      className="my-1"
                                      style={{ borderTop: '1px solid var(--border-subtle)' }}
                                    />

                                    <button
                                      type="button"
                                      role="menuitem"
                                      onClick={() => {
                                        setOpenUnitMenuId(null);
                                        updateUnit(activeSubject.id, unit.id, {
                                          archived: !unit.archived,
                                        });
                                      }}
                                      className="w-full px-3 py-2 text-left text-[12.5px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] flex items-center gap-2"
                                    >
                                      {unit.archived ? (
                                        <>
                                          <ArchiveRestore className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                                          Restore unit
                                        </>
                                      ) : (
                                        <>
                                          <Archive className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                                          Archive unit
                                        </>
                                      )}
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Collapsed Unit Preview — scannable chapter index with direct jump */}
                        {!expanded && groupChapters.length > 0 && (
                          <div
                            className="px-4 py-2 rounded-b-xl flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12px]"
                            style={{
                              borderTop: '1px solid var(--border-subtle)',
                              backgroundColor: 'var(--bg-surface-subtle)',
                            }}
                          >
                            {groupChapters.slice(0, 4).map((ch) => {
                              const chStats = getChapterStats(ch);
                              const chNum = chapterNumber(activeSubject, ch.id);
                              const chTitle = stripSyllabusNumberPrefix(ch.title);
                              return (
                                <button
                                  key={ch.id}
                                  type="button"
                                  onClick={() => setSelectedChapterId(ch.id)}
                                  className="inline-flex items-center gap-1.5 min-w-0 max-w-[260px] text-[var(--text-secondary)] hover:text-[var(--accent)] transition-colors rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                                >
                                  <span
                                    className="w-1.5 h-1.5 rounded-full shrink-0"
                                    style={
                                      chStats.total > 0 && chStats.percent === 100
                                        ? { backgroundColor: activeSubject.color }
                                        : chStats.completed > 0
                                          ? {
                                              backgroundColor: `${activeSubject.color}40`,
                                              boxShadow: `inset 0 0 0 1px ${activeSubject.color}`,
                                            }
                                          : {
                                              backgroundColor: 'transparent',
                                              boxShadow: 'inset 0 0 0 1px var(--border-strong)',
                                            }
                                    }
                                    aria-hidden="true"
                                  />
                                  <span className="font-mono-num tabular-nums text-[11px] text-[var(--text-muted)] shrink-0">
                                    {chNum}
                                  </span>
                                  <span className="truncate">{chTitle}</span>
                                </button>
                              );
                            })}
                            {groupChapters.length > 4 && (
                              <button
                                type="button"
                                onClick={() =>
                                  setCollapsedUnits((previous) => {
                                    const next = new Set(previous);
                                    next.delete(key);
                                    return next;
                                  })
                                }
                                className="text-[11.5px] font-medium text-[var(--accent)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] rounded"
                              >
                                +
                                <span className="font-mono-num tabular-nums">
                                  {groupChapters.length - 4}
                                </span>{' '}
                                more
                              </button>
                            )}
                          </div>
                        )}

                        {/* Expanded Unit Body */}
                        {expanded && (
                          <div
                            className="px-4 py-3.5 rounded-b-xl"
                            style={{
                              borderTop: '1px solid var(--border-subtle)',
                              backgroundColor: 'var(--bg-surface-subtle)',
                            }}
                          >
                            {groupChapters.length === 0 ? (
                              <div className="py-4 px-2 flex flex-wrap items-center justify-between gap-2 text-[12.5px] text-[var(--text-muted)]">
                                <span>No chapters in this unit yet.</span>
                                {!unit.archived && (
                                  <button
                                    type="button"
                                    onClick={() => openAddChapterModal(activeSubject.id, unit.id)}
                                    className="inline-flex items-center gap-1 text-[12px] font-medium hover:underline"
                                    style={{ color: 'var(--accent)' }}
                                  >
                                    <Plus className="w-3.5 h-3.5" /> Add first chapter
                                  </button>
                                )}
                              </div>
                            ) : viewMode === 'grid' ? (
                              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                                {groupChapters.map((ch, idx) =>
                                  renderChapterCard(activeSubject, ch, idx + 1, false, {
                                    canUp: idx > 0,
                                    canDown: idx < groupChapters.length - 1,
                                    onUp: () => reorderChapter(activeSubject.id, ch.id, -1),
                                    onDown: () => reorderChapter(activeSubject.id, ch.id, 1),
                                  }),
                                )}
                              </div>
                            ) : (
                              <div
                                className="rounded-lg divide-y divide-[var(--border-subtle)] overflow-hidden"
                                style={{
                                  backgroundColor: 'var(--bg-surface)',
                                  border: '1px solid var(--border-subtle)',
                                }}
                              >
                                {groupChapters.map((ch, idx) => {
                                  const stats = getChapterStats(ch);
                                  const isArchived = Boolean(ch.archived);
                                  return (
                                    <div
                                      key={ch.id}
                                      onClick={() => setSelectedChapterId(ch.id)}
                                      role="button"
                                      tabIndex={0}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                          e.preventDefault();
                                          setSelectedChapterId(ch.id);
                                        }
                                      }}
                                      className="w-full px-4 py-3 flex items-center justify-between gap-4 hover:bg-[var(--bg-surface-hover)] text-left cursor-pointer transition-colors"
                                    >
                                      <div className="flex items-center gap-3 min-w-0">
                                        <span
                                          className="w-2.5 h-2.5 rounded-full shrink-0"
                                          style={{ backgroundColor: activeSubject.color }}
                                          aria-hidden="true"
                                        />
                                        <div className="min-w-0">
                                          <div className="text-[13.5px] font-semibold text-[var(--text-primary)] truncate">
                                            {formatChapterTitle(activeSubject, ch)}
                                          </div>
                                          <div className="text-[11.5px] text-[var(--text-muted)]">
                                            <span className="font-mono-num tabular-nums">
                                              {stats.completed}/{stats.total}
                                            </span>{' '}
                                            topics completed · Confidence{' '}
                                            <span className="font-mono-num tabular-nums">
                                              {stats.total > 0 ? `${stats.avgConfidence}/5` : '—'}
                                            </span>
                                          </div>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-1 shrink-0">
                                        {groupChapters.length > 1 && (
                                          <>
                                            <button
                                              type="button"
                                              disabled={idx === 0}
                                              aria-label={`Move ${stripSyllabusNumberPrefix(ch.title)} up`}
                                              title="Move up"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                reorderChapter(activeSubject.id, ch.id, -1);
                                              }}
                                              className={`${fadedIconBtnClass} disabled:opacity-25 disabled:pointer-events-none`}
                                            >
                                              <ArrowUp className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                              type="button"
                                              disabled={idx === groupChapters.length - 1}
                                              aria-label={`Move ${stripSyllabusNumberPrefix(ch.title)} down`}
                                              title="Move down"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                reorderChapter(activeSubject.id, ch.id, 1);
                                              }}
                                              className={`${fadedIconBtnClass} disabled:opacity-25 disabled:pointer-events-none`}
                                            >
                                              <ArrowDown className="w-3.5 h-3.5" />
                                            </button>
                                          </>
                                        )}
                                        <span className="font-mono-num text-[12px] font-semibold text-[var(--text-primary)] tabular-nums mx-1.5">
                                          {stats.percent}%
                                        </span>
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            openEditChapterModal(activeSubject.id, ch);
                                          }}
                                          aria-label={`Edit ${ch.title}`}
                                          title="Edit chapter"
                                          className={fadedIconBtnClass}
                                        >
                                          <Pencil className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            toggleArchiveChapter(activeSubject.id, ch.id);
                                          }}
                                          aria-label={
                                            isArchived
                                              ? `Restore ${ch.title}`
                                              : `Archive ${ch.title}`
                                          }
                                          title={isArchived ? 'Restore chapter' : 'Archive chapter'}
                                          className={fadedIconBtnClass}
                                        >
                                          {isArchived ? (
                                            <ArchiveRestore className="w-3.5 h-3.5" />
                                          ) : (
                                            <Archive className="w-3.5 h-3.5" />
                                          )}
                                        </button>
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setDeleteTarget({
                                              kind: 'chapter',
                                              subjectId: activeSubject.id,
                                              chapter: ch,
                                            });
                                          }}
                                          aria-label={`Delete ${ch.title}`}
                                          title="Delete chapter"
                                          className={fadedTrashBtnClass}
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        )}
                      </section>
                    );
                  })}
                </>
              );
            })()}
          </div>
        )}

        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <div className="lg:col-span-8 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-xl p-4" style={surfaceStyle}>
                  <div className="text-[12px] text-[var(--text-muted)]">Syllabus Completion</div>
                  <div className="font-mono-num text-[22px] font-semibold text-[var(--text-primary)] mt-1 tabular-nums">
                    {prog.percent}%
                  </div>
                  <div className="text-[11.5px] text-[var(--text-muted)] tabular-nums">
                    {prog.completed} of {prog.total} active topics
                  </div>
                </div>
                <div className="rounded-xl p-4" style={surfaceStyle}>
                  <div className="text-[12px] text-[var(--text-muted)]">Total Study Time</div>
                  <div className="font-mono-num text-[22px] font-semibold text-[var(--text-primary)] mt-1 tabular-nums">
                    {activeSubject.totalHours}h
                  </div>
                  <div className="text-[11.5px] text-[var(--text-muted)]">
                    Weekly plan: {weeklyProgress(activeSubject.id).total}h
                  </div>
                </div>
                <div className="rounded-xl p-4" style={surfaceStyle}>
                  <div className="text-[12px] text-[var(--text-muted)]">Last Studied</div>
                  <div className="text-[15px] font-semibold text-[var(--text-primary)] mt-1.5">
                    {activeSubject.lastStudied}
                  </div>
                  <div className="text-[11.5px] text-[var(--text-muted)] mt-0.5">
                    {activeSubject.nextExamTitle}
                  </div>
                </div>
              </div>

              {/* Quick Chapter Mastery Snapshot */}
              <div className="rounded-xl p-4" style={surfaceStyle}>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-display text-[14.5px] font-semibold text-[var(--text-primary)]">
                    Chapter Mastery Breakdown
                  </h2>
                  <button
                    type="button"
                    onClick={() => setActiveTab('chapters')}
                    className="text-[12px] font-medium hover:underline"
                    style={{ color: 'var(--accent)' }}
                  >
                    Open chapters
                  </button>
                </div>
                <div className="space-y-3">
                  {activeChapters.length === 0 ? (
                    <p className="text-[12.5px] text-[var(--text-muted)]">
                      No active chapters yet.
                    </p>
                  ) : (
                    activeChapters.map((ch) => {
                      const stats = getChapterStats(ch);
                      return (
                        <button
                          key={ch.id}
                          type="button"
                          onClick={() => setSelectedChapterId(ch.id)}
                          className="w-full text-left group"
                        >
                          <div className="flex items-center justify-between text-[12.5px] mb-1">
                            <span className="font-medium text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors">
                              {formatChapterTitle(activeSubject, ch)}
                            </span>
                            <span className="font-mono-num text-[12px] text-[var(--text-muted)] tabular-nums">
                              {stats.completed}/{stats.total} ({stats.percent}%)
                            </span>
                          </div>
                          <div
                            className="h-1.5 rounded-full overflow-hidden"
                            style={{ backgroundColor: 'var(--bg-surface-hover)' }}
                          >
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${stats.percent}%`,
                                backgroundColor: activeSubject.color,
                              }}
                            />
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            <div className="lg:col-span-4 rounded-xl p-4 space-y-3" style={surfaceStyle}>
              <h2 className="font-display text-[14.5px] font-semibold text-[var(--text-primary)]">
                Upcoming Course Tasks
              </h2>
              {subTasks.length === 0 ? (
                <p className="text-[12.5px] text-[var(--text-muted)]">
                  All tasks complete for this course.
                </p>
              ) : (
                <div className="divide-y divide-[var(--border-subtle)]">
                  {subTasks.map((t) => (
                    <div key={t.id} className="py-2.5 flex items-start gap-2.5">
                      <button
                        type="button"
                        onClick={() => toggleTaskStatus(t.id)}
                        aria-label={`Toggle ${t.title}`}
                        className="mt-0.5 w-4 h-4 rounded-full flex items-center justify-center shrink-0"
                        style={{
                          border: t.status === 'done' ? 'none' : '1.5px solid var(--border-strong)',
                          backgroundColor:
                            t.status === 'done' ? activeSubject.color : 'transparent',
                          color: '#fff',
                        }}
                      >
                        {t.status === 'done' && <Check className="w-3 h-3" />}
                      </button>
                      <div className="min-w-0">
                        <div
                          className={`text-[12.5px] font-medium ${
                            t.status === 'done'
                              ? 'line-through text-[var(--text-muted)]'
                              : 'text-[var(--text-primary)]'
                          }`}
                        >
                          {t.title}
                        </div>
                        <div className="text-[11px] text-[var(--text-muted)]">{t.dueLabel}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TASKS TAB */}
        {activeTab === 'tasks' && (
          <div className="rounded-xl divide-y divide-[var(--border-subtle)]" style={surfaceStyle}>
            {subTasks.length === 0 ? (
              <div className="p-8 text-center text-[13px] text-[var(--text-muted)]">
                No tasks assigned to {activeSubject.code}.
              </div>
            ) : (
              subTasks.map((t) => (
                <div key={t.id} className="px-4 py-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <button
                      type="button"
                      onClick={() => toggleTaskStatus(t.id)}
                      aria-label={`Toggle ${t.title}`}
                      className="w-4 h-4 rounded-full flex items-center justify-center shrink-0"
                      style={{
                        border: t.status === 'done' ? 'none' : '1.5px solid var(--border-strong)',
                        backgroundColor: t.status === 'done' ? activeSubject.color : 'transparent',
                        color: '#fff',
                      }}
                    >
                      {t.status === 'done' && <Check className="w-3 h-3" />}
                    </button>
                    <div className="min-w-0">
                      <div className="text-[13px] font-medium text-[var(--text-primary)] truncate">
                        {t.title}
                      </div>
                      <div className="text-[11.5px] text-[var(--text-muted)]">{t.description}</div>
                    </div>
                  </div>
                  <span className="text-[12px] font-mono-num text-[var(--text-secondary)] shrink-0">
                    {t.dueLabel}
                  </span>
                </div>
              ))
            )}
          </div>
        )}

        {/* NOTES TAB */}
        {activeTab === 'notes' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {subNotes.length === 0 ? (
              <div
                className="md:col-span-2 rounded-xl p-8 text-center text-[13px] text-[var(--text-muted)]"
                style={surfaceStyle}
              >
                No notes linked to {activeSubject.code} yet.
              </div>
            ) : (
              subNotes.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => {
                    setSelectedNoteId(n.id);
                    setRoute('notes');
                  }}
                  className="rounded-xl p-4 text-left hover:border-[var(--border-strong)] transition-colors"
                  style={surfaceStyle}
                >
                  <div className="text-[14px] font-semibold text-[var(--text-primary)]">
                    {n.title}
                  </div>
                  <div className="text-[12px] text-[var(--text-muted)] mt-1">
                    Updated {n.updatedAt} · {n.attachments.length} attachment
                    {n.attachments.length === 1 ? '' : 's'}
                  </div>
                  <p className="text-[12.5px] text-[var(--text-secondary)] mt-2 line-clamp-2">
                    {markdownToPlainPreview(n.content)}
                  </p>
                </button>
              ))
            )}
          </div>
        )}

        {/* FLASHCARDS TAB */}
        {activeTab === 'flashcards' && (
          <div className="rounded-xl divide-y divide-[var(--border-subtle)]" style={surfaceStyle}>
            {subCards.length === 0 ? (
              <div className="p-8 text-center text-[13px] text-[var(--text-muted)]">
                No flashcards created for {activeSubject.code} yet.
              </div>
            ) : (
              subCards.map((c) => (
                <div key={c.id} className="p-4 flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="text-[13px] font-semibold text-[var(--text-primary)]">
                      {c.front}
                    </div>
                    <div className="text-[12.5px] text-[var(--text-secondary)]">{c.back}</div>
                  </div>
                  <div className="text-right shrink-0 text-[11.5px] text-[var(--text-muted)] font-mono-num">
                    <div className="capitalize">{c.mastery}</div>
                    <div>Interval: {c.intervalDays}d</div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* PERFORMANCE TAB */}
        {activeTab === 'performance' && (
          <div className="rounded-xl p-4" style={surfaceStyle}>
            <div className="mb-3">
              <h2 className="font-display text-[14.5px] font-semibold text-[var(--text-primary)]">
                Quiz Score & Weekly Study Hours Trajectory
              </h2>
              <p className="text-[12px] text-[var(--text-muted)]">
                Last 5 weeks for {activeSubject.code}
              </p>
            </div>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={perfSeries} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
                  <CartesianGrid
                    stroke="var(--chart-grid)"
                    strokeDasharray="3 3"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="wk"
                    tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    domain={[60, 100]}
                    tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                    unit="%"
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--bg-elevated)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 10,
                      fontSize: 12,
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="quiz"
                    name="Quiz Score (%)"
                    stroke={activeSubject.color}
                    fill={`${activeSubject.color}24`}
                    strokeWidth={2.5}
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {allModals}
      </div>
    );
  }

  // =========================================================================
  // LEVEL 1: SUBJECTS & COURSES ROOT (SUBJECTS + CHAPTERS SECTIONS + ARCHIVE)
  // =========================================================================
  const activeSubjectsList = subjects.filter((s) => !s.archived);
  const archivedSubjectsList = subjects.filter((s) => s.archived);
  const visibleSubjects =
    archiveFilter === 'active' ? activeSubjectsList : archivedSubjectsList;

  const activeChaptersAll = allChaptersList.filter(
    ({ subject, chapter }) => !subject.archived && !isChapterArchived(subject, chapter),
  );
  const archivedChaptersAll = allChaptersList.filter(
    ({ subject, chapter }) => isChapterArchived(subject, chapter) || Boolean(subject.archived),
  );
  const visibleAllChapters =
    archiveFilter === 'active' ? activeChaptersAll : archivedChaptersAll;

  return (
    <div className="space-y-4 pb-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-[19px] font-semibold text-[var(--text-primary)]">
            Subjects & Courses
          </h1>
          <p className="text-[12.5px] text-[var(--text-muted)] tabular-nums">
            {activeSubjectsList.length} active subjects · {activeChaptersAll.length} active chapters
            {archivedSubjectsList.length > 0 || archivedChaptersAll.length > 0
              ? ` · ${archivedSubjectsList.length} archived subject${archivedSubjectsList.length === 1 ? '' : 's'}`
              : ''}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Grid / List toggle */}
          <div
            className="inline-flex items-center p-0.5 rounded-lg"
            style={{
              backgroundColor: 'var(--bg-surface-subtle)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              aria-label="Grid view"
              className="p-1.5 rounded-md"
              style={{
                backgroundColor: viewMode === 'grid' ? 'var(--bg-surface)' : 'transparent',
                color: viewMode === 'grid' ? 'var(--text-primary)' : 'var(--text-muted)',
              }}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              aria-label="List view"
              className="p-1.5 rounded-md"
              style={{
                backgroundColor: viewMode === 'list' ? 'var(--bg-surface)' : 'transparent',
                color: viewMode === 'list' ? 'var(--text-primary)' : 'var(--text-muted)',
              }}
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>

          {rootTab === 'chapters' ? (
            <button
              type="button"
              onClick={() => openAddChapterModal()}
              disabled={subjects.length === 0}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[12.5px] font-medium whitespace-nowrap disabled:opacity-40"
              style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' }}
            >
              <Plus className="w-3.5 h-3.5" /> Add Chapter
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setActiveModal('create_subject')}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[12.5px] font-medium whitespace-nowrap"
              style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' }}
            >
              <Plus className="w-3.5 h-3.5" /> Add Subject
            </button>
          )}
        </div>
      </div>

      {/* Section Switcher: Subjects | Chapters + Active | Archived Filter */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div
          className="inline-flex items-center p-0.5 rounded-lg text-[12.5px]"
          style={{
            backgroundColor: 'var(--bg-surface-subtle)',
            border: '1px solid var(--border-subtle)',
          }}
          role="tablist"
          aria-label="Subjects or chapters view"
        >
          <button
            type="button"
            role="tab"
            aria-selected={rootTab === 'subjects'}
            onClick={() => setRootTab('subjects')}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md font-medium whitespace-nowrap transition-colors"
            style={{
              backgroundColor: rootTab === 'subjects' ? 'var(--bg-surface)' : 'transparent',
              color: rootTab === 'subjects' ? 'var(--text-primary)' : 'var(--text-muted)',
              boxShadow: rootTab === 'subjects' ? 'var(--shadow-subtle)' : 'none',
            }}
          >
            <Layers className="w-3.5 h-3.5" />
            Subjects ({activeSubjectsList.length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={rootTab === 'chapters'}
            onClick={() => setRootTab('chapters')}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md font-medium whitespace-nowrap transition-colors"
            style={{
              backgroundColor: rootTab === 'chapters' ? 'var(--bg-surface)' : 'transparent',
              color: rootTab === 'chapters' ? 'var(--text-primary)' : 'var(--text-muted)',
              boxShadow: rootTab === 'chapters' ? 'var(--shadow-subtle)' : 'none',
            }}
          >
            <BookOpen className="w-3.5 h-3.5" />
            Chapters ({activeChaptersAll.length})
          </button>
        </div>

        <div
          className="inline-flex items-center p-0.5 rounded-lg text-[12px]"
          style={{
            backgroundColor: 'var(--bg-surface-subtle)',
            border: '1px solid var(--border-subtle)',
          }}
          role="tablist"
          aria-label="Active or archived filter"
        >
          <button
            type="button"
            role="tab"
            aria-selected={archiveFilter === 'active'}
            onClick={() => setArchiveFilter('active')}
            className="px-2.5 py-1 rounded-md font-medium whitespace-nowrap transition-colors"
            style={{
              backgroundColor: archiveFilter === 'active' ? 'var(--bg-surface)' : 'transparent',
              color: archiveFilter === 'active' ? 'var(--text-primary)' : 'var(--text-muted)',
            }}
          >
            Active ({rootTab === 'subjects' ? activeSubjectsList.length : activeChaptersAll.length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={archiveFilter === 'archived'}
            onClick={() => setArchiveFilter('archived')}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md font-medium whitespace-nowrap transition-colors"
            style={{
              backgroundColor: archiveFilter === 'archived' ? 'var(--bg-surface)' : 'transparent',
              color: archiveFilter === 'archived' ? 'var(--text-primary)' : 'var(--text-muted)',
            }}
          >
            <Archive className="w-3 h-3" />
            Archived (
            {rootTab === 'subjects' ? archivedSubjectsList.length : archivedChaptersAll.length})
          </button>
        </div>
      </div>

      {/* SUBJECTS SECTION */}
      {rootTab === 'subjects' && (
        visibleSubjects.length === 0 ? (
          <div className="rounded-xl p-10 text-center space-y-2.5" style={surfaceStyle}>
            <p className="text-[13.5px] font-medium text-[var(--text-primary)]">
              {archiveFilter === 'archived' ? 'No archived subjects' : 'No active subjects yet'}
            </p>
            <p className="text-[12px] text-[var(--text-muted)]">
              {archiveFilter === 'archived'
                ? 'Subjects you archive are kept safely here and can be restored anytime.'
                : 'Add a subject to organize chapters, syllabus topics, notes, and study goals.'}
            </p>
            {archiveFilter === 'active' && (
              <button
                type="button"
                onClick={() => setActiveModal('create_subject')}
                className="mt-1 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12.5px] font-medium"
                style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' }}
              >
                <Plus className="w-3.5 h-3.5" /> Add Subject
              </button>
            )}
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {visibleSubjects.map((sub) => {
              const Icon = SUBJECT_ICONS[sub.icon] ?? Code2;
              const prog = weeklyProgress(sub.id);
              const openTasks = tasks.filter(
                (t) => t.subjectId === sub.id && t.status !== 'done',
              ).length;
              const activeChCount = sub.chapters.filter((c) => !isChapterArchived(sub, c)).length;
              const daysToExam = Math.max(
                1,
                Math.round((new Date(sub.nextExamDate).getTime() - Date.now()) / 86400000),
              );
              const isArchived = Boolean(sub.archived);

              return (
                <div
                  key={sub.id}
                  onClick={() => {
                    setSelectedChapterId(null);
                    setSelectedSubjectId(sub.id);
                    setActiveTab('chapters');
                  }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelectedChapterId(null);
                      setSelectedSubjectId(sub.id);
                      setActiveTab('chapters');
                    }
                  }}
                  className="rounded-xl p-4 text-left hover:border-[var(--border-strong)] transition-all space-y-3.5 group cursor-pointer"
                  style={{ ...surfaceStyle, opacity: isArchived ? 0.78 : 1 }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                        style={{ backgroundColor: `${sub.color}1C`, color: sub.color }}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[11.5px] font-medium text-[var(--text-muted)] truncate">
                          {sub.code} · {sub.instructor}
                          {isArchived ? ' · Archived' : ''}
                        </div>
                        <h2 className="font-display text-[15px] font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors truncate">
                          {sub.name}
                        </h2>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="font-mono-num text-[12.5px] font-semibold text-[var(--text-primary)] mr-0.5">
                        {sub.currentGrade}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditSubjectModal(sub);
                        }}
                        aria-label={`Edit ${sub.name}`}
                        title="Edit subject"
                        className={fadedIconBtnClass}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleArchiveSubject(sub.id);
                        }}
                        aria-label={isArchived ? `Restore ${sub.name}` : `Archive ${sub.name}`}
                        title={isArchived ? 'Restore subject' : 'Archive subject'}
                        className={fadedIconBtnClass}
                      >
                        {isArchived ? (
                          <ArchiveRestore className="w-3.5 h-3.5" />
                        ) : (
                          <Archive className="w-3.5 h-3.5" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteTarget({ kind: 'subject', subject: sub });
                        }}
                        aria-label={`Delete ${sub.name}`}
                        title="Delete subject"
                        className={fadedTrashBtnClass}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-[12px] mb-1">
                      <span className="text-[var(--text-secondary)]">
                        Completed / scheduled this week
                      </span>
                      <span className="font-mono-num font-medium text-[var(--text-primary)] tabular-nums">
                        {prog.completed}h / {prog.total}h
                      </span>
                    </div>
                    <div
                      className="h-1.5 w-full rounded-full overflow-hidden"
                      style={{ backgroundColor: 'var(--bg-surface-hover)' }}
                    >
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${prog.percent}%`, backgroundColor: sub.color }}
                      />
                    </div>
                  </div>

                  <div
                    className="pt-2.5 flex items-center justify-between text-[11.5px] text-[var(--text-muted)]"
                    style={{ borderTop: '1px solid var(--border-subtle)' }}
                  >
                    <span className="inline-flex items-center gap-1 font-mono-num tabular-nums">
                      <BookOpen className="w-3 h-3" /> {activeChCount} ch · {sub.totalHours}h
                    </span>
                    <span>{openTasks} open tasks</span>
                    <span className="inline-flex items-center gap-1 font-mono-num text-amber-600 dark:text-amber-400">
                      <Calendar className="w-3 h-3" />{' '}
                      {Number.isFinite(daysToExam) ? `Exam in ${daysToExam}d` : 'No exam'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-xl divide-y divide-[var(--border-subtle)]" style={surfaceStyle}>
            {visibleSubjects.map((sub) => {
              const prog = weeklyProgress(sub.id);
              const activeChCount = sub.chapters.filter((c) => !isChapterArchived(sub, c)).length;
              const isArchived = Boolean(sub.archived);
              return (
                <div
                  key={sub.id}
                  onClick={() => {
                    setSelectedChapterId(null);
                    setSelectedSubjectId(sub.id);
                    setActiveTab('chapters');
                  }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelectedChapterId(null);
                      setSelectedSubjectId(sub.id);
                      setActiveTab('chapters');
                    }
                  }}
                  className="w-full px-4 py-3 flex items-center justify-between gap-4 hover:bg-[var(--bg-surface-hover)] text-left cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: sub.color }}
                    />
                    <div className="min-w-0">
                      <div className="text-[13.5px] font-semibold text-[var(--text-primary)] truncate">
                        {sub.code} — {sub.name}
                      </div>
                      <div className="text-[11.5px] text-[var(--text-muted)]">
                        {sub.instructor} · {activeChCount} chapter{activeChCount === 1 ? '' : 's'} ·
                        Last studied {sub.lastStudied}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 text-[12px] font-mono-num tabular-nums">
                    <span className="text-[var(--text-secondary)] mr-2">{sub.totalHours}h</span>
                    <span className="w-10 text-right font-semibold text-[var(--text-primary)] mr-1">
                      {prog.percent}%
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditSubjectModal(sub);
                      }}
                      aria-label={`Edit ${sub.name}`}
                      title="Edit subject"
                      className={fadedIconBtnClass}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleArchiveSubject(sub.id);
                      }}
                      aria-label={isArchived ? `Restore ${sub.name}` : `Archive ${sub.name}`}
                      title={isArchived ? 'Restore subject' : 'Archive subject'}
                      className={fadedIconBtnClass}
                    >
                      {isArchived ? (
                        <ArchiveRestore className="w-3.5 h-3.5" />
                      ) : (
                        <Archive className="w-3.5 h-3.5" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteTarget({ kind: 'subject', subject: sub });
                      }}
                      aria-label={`Delete ${sub.name}`}
                      title="Delete subject"
                      className={fadedTrashBtnClass}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* CHAPTERS SECTION (All Chapters across subjects — same card language as Subjects) */}
      {rootTab === 'chapters' && (
        visibleAllChapters.length === 0 ? (
          <div className="rounded-xl p-10 text-center space-y-2.5" style={surfaceStyle}>
            <p className="text-[13.5px] font-medium text-[var(--text-primary)]">
              {archiveFilter === 'archived' ? 'No archived chapters' : 'No active chapters yet'}
            </p>
            <p className="text-[12px] text-[var(--text-muted)]">
              {archiveFilter === 'archived'
                ? 'Chapters you archive appear here and can be restored anytime.'
                : 'Add a chapter to any subject to track syllabus topics and mastery.'}
            </p>
            {archiveFilter === 'active' && subjects.length > 0 && (
              <button
                type="button"
                onClick={() => openAddChapterModal()}
                className="mt-1 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12.5px] font-medium"
                style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' }}
              >
                <Plus className="w-3.5 h-3.5" /> Add Chapter
              </button>
            )}
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {visibleAllChapters.map(({ subject, chapter, index }) =>
              renderChapterCard(subject, chapter, index + 1, true),
            )}
          </div>
        ) : (
          <div className="rounded-xl divide-y divide-[var(--border-subtle)]" style={surfaceStyle}>
            {visibleAllChapters.map(({ subject, chapter }) => {
              const stats = getChapterStats(chapter);
              const isArchived = Boolean(chapter.archived);
              return (
                <div
                  key={`${subject.id}-${chapter.id}`}
                  onClick={() => {
                    setSelectedSubjectId(subject.id);
                    setActiveTab('chapters');
                    setSelectedChapterId(chapter.id);
                  }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelectedSubjectId(subject.id);
                      setActiveTab('chapters');
                      setSelectedChapterId(chapter.id);
                    }
                  }}
                  className="w-full px-4 py-3 flex items-center justify-between gap-4 hover:bg-[var(--bg-surface-hover)] text-left cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: subject.color }}
                    />
                    <div className="min-w-0">
                      <div className="text-[13.5px] font-semibold text-[var(--text-primary)] truncate">
                        {formatChapterTitle(subject, chapter)}
                      </div>
                      <div className="text-[11.5px] text-[var(--text-muted)] tabular-nums">
                        {subject.code} · {subject.name} · {stats.completed}/{stats.total} topics
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="font-mono-num text-[12px] font-semibold text-[var(--text-primary)] tabular-nums mr-1.5">
                      {stats.percent}%
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditChapterModal(subject.id, chapter);
                      }}
                      aria-label={`Edit ${chapter.title}`}
                      title="Edit chapter"
                      className={fadedIconBtnClass}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleArchiveChapter(subject.id, chapter.id);
                      }}
                      aria-label={isArchived ? `Restore ${chapter.title}` : `Archive ${chapter.title}`}
                      title={isArchived ? 'Restore chapter' : 'Archive chapter'}
                      className={fadedIconBtnClass}
                    >
                      {isArchived ? (
                        <ArchiveRestore className="w-3.5 h-3.5" />
                      ) : (
                        <Archive className="w-3.5 h-3.5" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteTarget({
                          kind: 'chapter',
                          subjectId: subject.id,
                          chapter,
                        });
                      }}
                      aria-label={`Delete ${chapter.title}`}
                      title="Delete chapter"
                      className={fadedTrashBtnClass}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {allModals}
    </div>
  );
};
