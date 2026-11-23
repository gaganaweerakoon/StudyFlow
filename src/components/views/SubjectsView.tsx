import { studyChart } from '../../utils/workspaceMetrics';
import React, { useState } from 'react';
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
  ChevronDown,
  ChevronRight,
  Check,
  Clock,
  Calendar,
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
import type { Subject } from '../../types/studyflow';
import { calculateSubjectProgress } from '../../utils/studyLogic';

type DetailTab = 'overview' | 'syllabus' | 'tasks' | 'notes' | 'flashcards' | 'performance';

const SUBJECT_ICONS: Record<Subject['icon'], React.ComponentType<{ className?: string }>> = {
  code: Code2,
  sigma: Sigma,
  flask: FlaskConical,
  brain: Brain,
  chart: LineChartIcon,
};

export const SubjectsView: React.FC = () => {
  const {
    subjects, sessions, focusHistory,
    selectedSubjectId,
    setSelectedSubjectId,
    toggleTopicCompletion,
    updateTopicConfidence,
    tasks,
    toggleTaskStatus,
    notes,
    setSelectedNoteId,
    decks,
    flashcards,
    setRoute,
    setActiveModal,
  } = useApp();

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [activeTab, setActiveTab] = useState<DetailTab>('overview');
  const [expandedChapters, setExpandedChapters] = useState<Record<string, boolean>>({});

  const activeSubject = selectedSubjectId ? subjects.find((s) => s.id === selectedSubjectId) ?? null : null;

  const surfaceStyle: React.CSSProperties = {
    backgroundColor: 'var(--bg-surface)',
    border: '1px solid var(--border-subtle)',
  };

  const toggleChapter = (id: string) => {
    setExpandedChapters((prev) => ({ ...prev, [id]: prev[id] === false }));
  };

  function weeklyProgress(id: string) {
    const blocks = sessions.filter(s => s.subjectId === id && s.countsTowardStudy !== false);
    const history = focusHistory.filter(h => h.subjectId === id);
    const weekly = studyChart('weekly', blocks, history);
    const finished = studyChart('weekly', blocks.filter(s => s.status === 'completed'), []);
    const total = weekly.reduce((sum, day) => sum + day.planned, 0);
    const completed = weekly.reduce((sum, day, i) => sum + Math.max(day.actual, finished[i].planned), 0);
    return { total: +total.toFixed(2), completed: +completed.toFixed(2), percent: total ? Math.min(100, Math.round(100 * completed / total)) : 0 };
  }

  if (activeSubject) {
    const Icon = SUBJECT_ICONS[activeSubject.icon] ?? Code2;
    const prog = calculateSubjectProgress(activeSubject.chapters);
    const subTasks = tasks.filter((t) => t.subjectId === activeSubject.id);
    const subNotes = notes.filter((n) => n.subjectId === activeSubject.id);
    const subDecks = decks.filter((d) => d.subjectId === activeSubject.id);
    const subCards = flashcards.filter((c) => subDecks.some((d) => d.id === c.deckId));
    const daysToExam = Math.max(
      1,
      Math.round((new Date(activeSubject.nextExamDate).getTime() - Date.now()) / 86400000)
    );

    const perfSeries = [
      { wk: 'Wk 8', hours: 5.2, quiz: 79 },
      { wk: 'Wk 9', hours: 6.4, quiz: 84 },
      { wk: 'Wk 10', hours: 7.1, quiz: 87 },
      { wk: 'Wk 11', hours: 7.8, quiz: 90 },
      { wk: 'Wk 12', hours: activeSubject.weeklyTargetHours, quiz: 92 },
    ];

    return (
      <div className="space-y-4 pb-6">
        {/* Subject Detail Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSelectedSubjectId(null)}
              aria-label="Back to all subjects"
              className="p-2 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)]"
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
            <div>
              <div className="text-[12px] text-[var(--text-muted)]">
                {activeSubject.code} · {activeSubject.instructor}
              </div>
              <h1 className="font-display text-[19px] font-semibold text-[var(--text-primary)]">
                {activeSubject.name}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-4 text-[12.5px]">
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
              { id: 'overview', label: 'Overview' },
              { id: 'syllabus', label: `Syllabus (${prog.completed}/${prog.total})` },
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
                borderBottom: activeTab === t.id ? '2px solid var(--accent)' : '2px solid transparent',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <div className="lg:col-span-8 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-xl p-4" style={surfaceStyle}>
                  <div className="text-[12px] text-[var(--text-muted)]">Syllabus Completion</div>
                  <div className="font-mono-num text-[22px] font-semibold text-[var(--text-primary)] mt-1">
                    {prog.percent}%
                  </div>
                  <div className="text-[11.5px] text-[var(--text-muted)]">
                    {prog.completed} of {prog.total} topics
                  </div>
                </div>
                <div className="rounded-xl p-4" style={surfaceStyle}>
                  <div className="text-[12px] text-[var(--text-muted)]">Total Study Time</div>
                  <div className="font-mono-num text-[22px] font-semibold text-[var(--text-primary)] mt-1">
                    {activeSubject.totalHours}h
                  </div>
                  <div className="text-[11.5px] text-[var(--text-muted)]">
                    Weekly target: {activeSubject.weeklyTargetHours}h
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

              {/* Quick Syllabus Snapshot */}
              <div className="rounded-xl p-4" style={surfaceStyle}>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-display text-[14.5px] font-semibold text-[var(--text-primary)]">
                    Chapter Mastery Breakdown
                  </h2>
                  <button
                    type="button"
                    onClick={() => setActiveTab('syllabus')}
                    className="text-[12px] font-medium hover:underline"
                    style={{ color: 'var(--accent)' }}
                  >
                    Open full syllabus
                  </button>
                </div>
                <div className="space-y-3">
                  {activeSubject.chapters.map((ch) => {
                    const done = ch.topics.filter((t) => t.completed).length;
                    const pct = Math.round((done / ch.topics.length) * 100);
                    return (
                      <div key={ch.id}>
                        <div className="flex items-center justify-between text-[12.5px] mb-1">
                          <span className="font-medium text-[var(--text-primary)]">{ch.title}</span>
                          <span className="font-mono-num text-[12px] text-[var(--text-muted)]">
                            {done}/{ch.topics.length} ({pct}%)
                          </span>
                        </div>
                        <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-surface-hover)' }}>
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: activeSubject.color }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="lg:col-span-4 rounded-xl p-4 space-y-3" style={surfaceStyle}>
              <h2 className="font-display text-[14.5px] font-semibold text-[var(--text-primary)]">
                Upcoming Course Tasks
              </h2>
              {subTasks.length === 0 ? (
                <p className="text-[12.5px] text-[var(--text-muted)]">All tasks complete for this course.</p>
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
                          backgroundColor: t.status === 'done' ? activeSubject.color : 'transparent',
                          color: '#fff',
                        }}
                      >
                        {t.status === 'done' && <Check className="w-3 h-3" />}
                      </button>
                      <div className="min-w-0">
                        <div className={`text-[12.5px] font-medium ${t.status === 'done' ? 'line-through text-[var(--text-muted)]' : 'text-[var(--text-primary)]'}`}>
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

        {/* SYLLABUS TREE TAB */}
        {activeTab === 'syllabus' && (
          <div className="space-y-3">
            {activeSubject.chapters.map((ch) => {
              const isOpen = expandedChapters[ch.id] !== false;
              const doneCount = ch.topics.filter((t) => t.completed).length;

              return (
                <div key={ch.id} className="rounded-xl overflow-hidden" style={surfaceStyle}>
                  <button
                    type="button"
                    onClick={() => toggleChapter(ch.id)}
                    aria-expanded={isOpen}
                    className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-[var(--bg-surface-hover)] transition-colors"
                  >
                    <span className="flex items-center gap-2 font-display text-[14px] font-semibold text-[var(--text-primary)]">
                      {isOpen ? <ChevronDown className="w-4 h-4 text-[var(--text-muted)]" /> : <ChevronRight className="w-4 h-4 text-[var(--text-muted)]" />}
                      {ch.title}
                    </span>
                    <span className="font-mono-num text-[12px] text-[var(--text-muted)]">
                      {doneCount}/{ch.topics.length} completed
                    </span>
                  </button>

                  {isOpen && (
                    <div className="divide-y divide-[var(--border-subtle)]" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                      {ch.topics.map((tp) => (
                        <div key={tp.id} className="px-4 py-2.5 flex flex-wrap sm:flex-nowrap items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <button
                              type="button"
                              onClick={() => toggleTopicCompletion(activeSubject.id, ch.id, tp.id)}
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
                              <div className={`text-[13px] font-medium ${tp.completed ? 'text-[var(--text-muted)] line-through' : 'text-[var(--text-primary)]'}`}>
                                {tp.title}
                              </div>
                              <div className="text-[11.5px] text-[var(--text-muted)] capitalize">
                                Difficulty: {tp.difficulty} · Revision: {tp.revisionStatus.replace('_', ' ')}
                              </div>
                            </div>
                          </div>

                          {/* Interactive Confidence Indicator (1..5) */}
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[11px] text-[var(--text-muted)]">Confidence</span>
                            <div className="flex items-center gap-1">
                              {[1, 2, 3, 4, 5].map((lvl) => (
                                <button
                                  key={lvl}
                                  type="button"
                                  onClick={() => updateTopicConfidence(activeSubject.id, ch.id, tp.id, lvl)}
                                  aria-label={`Set confidence ${lvl} of 5 for ${tp.title}`}
                                  className="w-4 h-2 rounded-sm transition-colors"
                                  style={{
                                    backgroundColor:
                                      lvl <= tp.confidence ? activeSubject.color : 'var(--bg-surface-hover)',
                                  }}
                                />
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* TASKS TAB */}
        {activeTab === 'tasks' && (
          <div className="rounded-xl divide-y divide-[var(--border-subtle)]" style={surfaceStyle}>
            {subTasks.map((t) => (
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
                    <div className="text-[13px] font-medium text-[var(--text-primary)] truncate">{t.title}</div>
                    <div className="text-[11.5px] text-[var(--text-muted)]">{t.description}</div>
                  </div>
                </div>
                <span className="text-[12px] font-mono-num text-[var(--text-secondary)] shrink-0">{t.dueLabel}</span>
              </div>
            ))}
          </div>
        )}

        {/* NOTES TAB */}
        {activeTab === 'notes' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {subNotes.map((n) => (
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
                <div className="text-[14px] font-semibold text-[var(--text-primary)]">{n.title}</div>
                <div className="text-[12px] text-[var(--text-muted)] mt-1">
                  Updated {n.updatedAt} · {n.attachments.length} attachment{n.attachments.length === 1 ? '' : 's'}
                </div>
                <p className="text-[12.5px] text-[var(--text-secondary)] mt-2 line-clamp-2">
                  {n.content.replace(/[#*`]/g, '')}
                </p>
              </button>
            ))}
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
                    <div className="text-[13px] font-semibold text-[var(--text-primary)]">{c.front}</div>
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
              <p className="text-[12px] text-[var(--text-muted)]">Last 5 weeks for {activeSubject.code}</p>
            </div>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={perfSeries} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
                  <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="wk" tick={{ fill: 'var(--text-muted)', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis domain={[60, 100]} tick={{ fill: 'var(--text-muted)', fontSize: 12 }} axisLine={false} tickLine={false} unit="%" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--bg-elevated)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 10,
                      fontSize: 12,
                    }}
                  />
                  <Area type="monotone" dataKey="quiz" name="Quiz Score (%)" stroke={activeSubject.color} fill={`${activeSubject.color}24`} strokeWidth={2.5} isAnimationActive={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    );
  }

  // SUBJECT OVERVIEW (GRID / LIST)
  return (
    <div className="space-y-4 pb-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-[19px] font-semibold text-[var(--text-primary)]">
            Subjects & Courses
          </h1>
          <p className="text-[12.5px] text-[var(--text-muted)]">
            {subjects.length} enrolled courses · Select any subject to open syllabus, notes, and performance
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div
            className="inline-flex items-center p-0.5 rounded-lg"
            style={{ backgroundColor: 'var(--bg-surface-subtle)', border: '1px solid var(--border-subtle)' }}
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

          <button
            type="button"
            onClick={() => setActiveModal('create_subject')}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[12.5px] font-medium"
            style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' }}
          >
            <Plus className="w-3.5 h-3.5" /> Add Subject
          </button>
        </div>
      </div>

      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {subjects.map((sub) => {
            const Icon = SUBJECT_ICONS[sub.icon] ?? Code2;
            const prog = weeklyProgress(sub.id);
            const openTasks = tasks.filter((t) => t.subjectId === sub.id && t.status !== 'done').length;
            const daysToExam = Math.max(
              1,
              Math.round((new Date(sub.nextExamDate).getTime() - Date.now()) / 86400000)
            );

            return (
              <button
                key={sub.id}
                type="button"
                onClick={() => {
                  setSelectedSubjectId(sub.id);
                  setActiveTab('overview');
                }}
                className="rounded-xl p-4 text-left hover:border-[var(--border-strong)] transition-all space-y-3.5 group"
                style={surfaceStyle}
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
                      <div className="text-[11.5px] font-medium text-[var(--text-muted)]">
                        {sub.code} · {sub.instructor}
                      </div>
                      <h2 className="font-display text-[15px] font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors truncate">
                        {sub.name}
                      </h2>
                    </div>
                  </div>
                  <span className="font-mono-num text-[12.5px] font-semibold text-[var(--text-primary)] shrink-0">
                    {sub.currentGrade}
                  </span>
                </div>

                <div>
                  <div className="flex items-center justify-between text-[12px] mb-1">
                    <span className="text-[var(--text-secondary)]">Completed / scheduled this week</span>
                    <span className="font-mono-num font-medium text-[var(--text-primary)]">
                      {prog.completed}h / {prog.total}h
                    </span>
                  </div>
                  <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-surface-hover)' }}>
                    <div className="h-full rounded-full" style={{ width: `${prog.percent}%`, backgroundColor: sub.color }} />
                  </div>
                </div>

                <div
                  className="pt-2.5 flex items-center justify-between text-[11.5px] text-[var(--text-muted)]"
                  style={{ borderTop: '1px solid var(--border-subtle)' }}
                >
                  <span className="inline-flex items-center gap-1 font-mono-num">
                    <Clock className="w-3 h-3" /> {sub.totalHours}h logged
                  </span>
                  <span>{openTasks} open tasks</span>
                  <span className="inline-flex items-center gap-1 font-mono-num text-amber-600 dark:text-amber-400">
                    <Calendar className="w-3 h-3" /> {Number.isFinite(daysToExam) ? `Exam in ${daysToExam}d` : 'No exam scheduled'}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="rounded-xl divide-y divide-[var(--border-subtle)]" style={surfaceStyle}>
          {subjects.map((sub) => {
            const prog = weeklyProgress(sub.id);
            return (
              <button
                key={sub.id}
                type="button"
                onClick={() => setSelectedSubjectId(sub.id)}
                className="w-full px-4 py-3 flex items-center justify-between gap-4 hover:bg-[var(--bg-surface-hover)] text-left"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: sub.color }} />
                  <div className="min-w-0">
                    <div className="text-[13.5px] font-semibold text-[var(--text-primary)] truncate">
                      {sub.code} — {sub.name}
                    </div>
                    <div className="text-[11.5px] text-[var(--text-muted)]">
                      {sub.instructor} · Last studied {sub.lastStudied}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-6 shrink-0 text-[12px] font-mono-num">
                  <span className="text-[var(--text-secondary)]">{sub.totalHours}h</span>
                  <span className="w-12 text-right font-semibold text-[var(--text-primary)]">{prog.percent}%</span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
