import React, { useEffect, useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import {
  Plus,
  CheckCircle2,
  Circle,
  TrendingUp,
  X,
  Link2,
  Search,
  Trash2,
  ArrowUpRight,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { localDay } from '../../assistant/workspaceContext';
import {
  applyMilestoneAdd,
  applyMilestoneRemove,
  applyMilestoneToggle,
} from '../../utils/goalProgress';
import { sortMilestones, type MilestoneOrder } from '../../utils/milestoneSort';
import type { GoalItem, GoalMilestone, Priority, TaskItem } from '../../types/studyflow';

type ComposerTab = 'milestone' | 'existing_task' | 'new_task';

function formatShortDate(iso: string): string {
  if (!iso) return 'No date';
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export const GoalsView: React.FC = () => {
  const {
    goals,
    updateGoal,
    deleteGoal,
    setActiveModal,
    subjects,
    tasks,
    addTask,
    toggleTaskStatus,
    setRoute,
    focusHistory,
    legacyCalendar,
    pushToast,
  } = useApp();

  const [milestoneOrders, setMilestoneOrders] = useState<Record<string, MilestoneOrder>>({});
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [composerGoalId, setComposerGoalId] = useState<string | null>(null);
  const [composerTab, setComposerTab] = useState<ComposerTab>('milestone');

  // Standalone milestone draft
  const defaultDateIso = localDay();
  const [msLabel, setMsLabel] = useState('');
  const [msDate, setMsDate] = useState(defaultDateIso);

  // Existing task picker state
  const [taskSearch, setTaskSearch] = useState('');

  // New task + milestone draft
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskSubject, setNewTaskSubject] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<Priority>('medium');
  const [newTaskDue, setNewTaskDue] = useState(defaultDateIso);
  const [newTaskMinutes, setNewTaskMinutes] = useState(45);

  const taskById = useMemo(() => new Map(tasks.map((t) => [t.id, t])), [tasks]);

  const composerGoal = useMemo(
    () => goals.find((g) => g.id === composerGoalId) ?? null,
    [goals, composerGoalId],
  );

  // Close popup on Escape
  useEffect(() => {
    if (!composerGoalId) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setComposerGoalId(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [composerGoalId]);

  const filteredGoals =
    categoryFilter === 'all' ? goals : goals.filter((g) => g.category === categoryFilter);

  const surfaceStyle: React.CSSProperties = {
    backgroundColor: 'var(--bg-surface)',
    border: '1px solid var(--border-subtle)',
  };

  const inputStyle: React.CSSProperties = {
    backgroundColor: 'var(--bg-surface-subtle)',
    border: '1px solid var(--border-subtle)',
    color: 'var(--text-primary)',
  };

  const openComposer = (goal: GoalItem, tab: ComposerTab = 'milestone') => {
    setComposerGoalId(goal.id);
    setComposerTab(tab);
    setMsLabel('');
    setMsDate(defaultDateIso);
    setTaskSearch('');
    setNewTaskTitle('');
    setNewTaskSubject(goal.subjectId ?? subjects[0]?.id ?? '');
    setNewTaskPriority('medium');
    setNewTaskDue(defaultDateIso);
    setNewTaskMinutes(45);
  };

  const handleLogProgress = (goalId: string, current: number, target: number, unit: string) => {
    const step = unit === 'hrs' ? 0.5 : unit === 'cards' ? 10 : 1;
    const next = Math.min(target, Number((current + step).toFixed(1)));
    updateGoal(goalId, { current: next });
    pushToast(`Logged +${step} ${unit} toward goal`);
  };

  const handleToggleMilestone = (goal: GoalItem, milestone: GoalMilestone) => {
    const linkedTask = milestone.taskId ? taskById.get(milestone.taskId) : undefined;
    if (linkedTask) {
      // toggleTaskStatus atomically updates both the task and all linked goals
      toggleTaskStatus(linkedTask.id);
      return;
    }

    const updated = applyMilestoneToggle(goal, milestone.id, !milestone.done);
    updateGoal(goal.id, {
      milestones: updated.milestones,
      current: updated.current,
    });
  };

  const handleRemoveMilestone = (goal: GoalItem, milestoneId: string) => {
    const updated = applyMilestoneRemove(goal, milestoneId);
    updateGoal(goal.id, {
      milestones: updated.milestones,
      current: updated.current,
    });
    pushToast('Milestone removed from goal');
  };

  const handleAddStandaloneMilestone = (e: React.FormEvent, goal: GoalItem) => {
    e.preventDefault();
    const label = msLabel.trim();
    if (!label) return;
    const nextMilestone: GoalMilestone = {
      id: `ms-${crypto.randomUUID()}`,
      label,
      done: false,
      date: formatShortDate(msDate),
    };
    updateGoal(goal.id, {
      milestones: [...goal.milestones, nextMilestone],
    });
    setMsLabel('');
    pushToast(`Added milestone to "${goal.title}"`);
  };

  const handleLinkExistingTask = (goal: GoalItem, task: TaskItem) => {
    if (goal.milestones.some((m) => m.taskId === task.id)) {
      pushToast('Task is already linked to this goal');
      return;
    }
    const nextMilestone: GoalMilestone = {
      id: `ms-${crypto.randomUUID()}`,
      label: task.title,
      done: task.status === 'done',
      date: task.dueLabel || formatShortDate(task.dueDate),
      taskId: task.id,
    };
    const updated = applyMilestoneAdd(goal, nextMilestone);
    updateGoal(goal.id, {
      milestones: updated.milestones,
      current: updated.current,
    });
    pushToast(
      task.status === 'done'
        ? `Linked completed task "${task.title}" and updated progress`
        : `Linked task "${task.title}"`,
    );
  };

  const handleCreateTaskAndAttach = (e: React.FormEvent, goal: GoalItem) => {
    e.preventDefault();
    const title = newTaskTitle.trim();
    if (!title) return;
    const dueLabel = formatShortDate(newTaskDue);
    const createdTaskId = addTask({
      title,
      subjectId: newTaskSubject || goal.subjectId || subjects[0]?.id || '',
      dueDate: newTaskDue,
      dueLabel,
      priority: newTaskPriority,
      status: 'todo',
      estimatedMinutes: Math.max(5, newTaskMinutes || 30),
      description: `Linked to goal: ${goal.title}`,
      subtasks: [],
    });
    const nextMilestone: GoalMilestone = {
      id: `ms-${crypto.randomUUID()}`,
      label: title,
      done: false,
      date: dueLabel,
      taskId: createdTaskId,
    };
    updateGoal(goal.id, {
      milestones: [...goal.milestones, nextMilestone],
    });
    setNewTaskTitle('');
    setComposerGoalId(null);
  };

  // Tasks eligible to link in the open popup
  const availableTasksForPopup = useMemo(() => {
    if (!composerGoal) return [];
    const linkedTaskIds = new Set(
      composerGoal.milestones.map((m) => m.taskId).filter((id): id is string => Boolean(id)),
    );
    const q = taskSearch.trim().toLowerCase();
    return tasks
      .filter((t) => !linkedTaskIds.has(t.id))
      .filter((t) => {
        if (!q) return true;
        const s = subjects.find((item) => item.id === t.subjectId);
        return `${t.title} ${s?.code ?? ''} ${s?.name ?? ''}`.toLowerCase().includes(q);
      })
      .sort((a, b) => {
        const aMatch = composerGoal.subjectId && a.subjectId === composerGoal.subjectId ? 0 : 1;
        const bMatch = composerGoal.subjectId && b.subjectId === composerGoal.subjectId ? 0 : 1;
        if (aMatch !== bMatch) return aMatch - bMatch;
        const aDone = a.status === 'done' ? 1 : 0;
        const bDone = b.status === 'done' ? 1 : 0;
        if (aDone !== bDone) return aDone - bDone;
        return a.dueDate.localeCompare(b.dueDate);
      });
  }, [composerGoal, tasks, taskSearch, subjects]);

  const today = new Date();
  const monday = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate() - ((today.getDay() + 6) % 7),
  );
  const weekStart = localDay(monday);
  const weekEnd = localDay(today);
  const weeklyMinutes = new Map<string, number>();
  for (const session of focusHistory) {
    const date = session.completedAt.slice(0, 10);
    if (date >= weekStart && date <= weekEnd) {
      weeklyMinutes.set(
        session.subjectId,
        (weeklyMinutes.get(session.subjectId) ?? 0) + session.durationMinutes,
      );
    }
  }
  const chartData = subjects.map((subject) => ({
    subject: subject.code || subject.name,
    target: subject.weeklyTargetHours,
    actual: Number(((weeklyMinutes.get(subject.id) ?? 0) / 60).toFixed(2)),
  }));
  const achievedHistory = goals
    .filter((goal) => goal.target > 0 && goal.current >= goal.target)
    .sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? ''));

  return (
    <div className="space-y-4 pb-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-[19px] font-semibold text-[var(--text-primary)]">
            Goals & Targets
          </h1>
          <p className="text-[12.5px] text-[var(--text-muted)]">
            Daily study pacing, syllabus targets, and task-linked milestone tracking
          </p>
        </div>

        <button
          type="button"
          onClick={() => setActiveModal('create_goal')}
          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[12.5px] font-medium whitespace-nowrap"
          style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' }}
        >
          <Plus className="w-3.5 h-3.5" /> New Goal
        </button>
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filter goals by category">
        {['all', 'daily', 'weekly', 'subject', 'syllabus', 'revision', 'tasks'].map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setCategoryFilter(cat)}
            className="px-2.5 py-1 rounded-lg text-[12px] font-medium capitalize transition-colors whitespace-nowrap"
            style={{
              backgroundColor: categoryFilter === cat ? 'var(--accent-soft)' : 'var(--bg-surface)',
              color: categoryFilter === cat ? 'var(--accent)' : 'var(--text-secondary)',
              border:
                categoryFilter === cat
                  ? '1px solid var(--accent-border)'
                  : '1px solid var(--border-subtle)',
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Active Goals Grid — Fixed Uniform Card Height with Invisible Internal Scroll */}
      {filteredGoals.length === 0 ? (
        <div className="rounded-xl p-8 text-center space-y-2.5" style={surfaceStyle}>
          <p className="text-[13.5px] font-medium text-[var(--text-primary)]">
            No goals in this category yet
          </p>
          <p className="text-[12px] text-[var(--text-muted)]">
            Create a study target and break it down with milestones or linked tasks.
          </p>
          <div className="flex items-center justify-center gap-2 pt-1">
            {categoryFilter !== 'all' && (
              <button
                type="button"
                onClick={() => setCategoryFilter('all')}
                className="px-3 py-1.5 rounded-lg text-[12px] font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)]"
                style={{ border: '1px solid var(--border-subtle)' }}
              >
                Show All Goals
              </button>
            )}
            <button
              type="button"
              onClick={() => setActiveModal('create_goal')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium"
              style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' }}
            >
              <Plus className="w-3.5 h-3.5" /> New Goal
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredGoals.map((goal) => {
            const pct = Math.min(100, Math.round((goal.current / Math.max(1, goal.target)) * 100));
            const sub = goal.subjectId ? subjects.find((s) => s.id === goal.subjectId) : null;

            const milestoneOrder = milestoneOrders[goal.id] ?? 'due-asc';
            const sortedMilestones = sortMilestones(goal.milestones, taskById, milestoneOrder, goal.deadline);
            const resolvedMilestones = sortedMilestones.map((ms) => {
              const linkedTask = ms.taskId ? taskById.get(ms.taskId) : undefined;
              const linkedSub = linkedTask
                ? subjects.find((s) => s.id === linkedTask.subjectId)
                : undefined;
              return {
                ms,
                linkedTask,
                linkedSub,
                done: linkedTask ? linkedTask.status === 'done' : ms.done,
                label: linkedTask ? linkedTask.title : ms.label,
                date: linkedTask ? linkedTask.dueLabel || formatShortDate(linkedTask.dueDate) : ms.date,
              };
            });

            const completedMsCount = resolvedMilestones.filter((m) => m.done).length;

            return (
              <div
                key={goal.id}
                className="rounded-xl p-4 h-[296px] flex flex-col gap-3"
                style={surfaceStyle}
              >
                {/* Fixed Card Header */}
                <div className="flex items-start justify-between gap-3 shrink-0">
                  <div className="min-w-0">
                    <div className="text-[11.5px] text-[var(--text-muted)] capitalize truncate">
                      {goal.category} goal {sub ? `· ${sub.code}` : ''} · Due {goal.deadline}
                    </div>
                    <h2 className="font-display text-[15px] font-semibold text-[var(--text-primary)] mt-0.5 truncate">
                      {goal.title}
                    </h2>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleLogProgress(goal.id, goal.current, goal.target, goal.unit)}
                      disabled={goal.current >= goal.target}
                      className="px-2.5 py-1 rounded-lg text-[11.5px] font-medium transition-colors disabled:opacity-40 hover:bg-[var(--bg-surface-hover)] whitespace-nowrap"
                      style={{ border: '1px solid var(--border-subtle)', color: 'var(--accent)' }}
                    >
                      + Log
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteGoal(goal.id)}
                      aria-label={`Delete goal ${goal.title}`}
                      title="Delete goal"
                      className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Fixed Progress Bar */}
                <div className="shrink-0">
                  <div className="flex items-baseline justify-between text-[12.5px] mb-1.5">
                    <span className="font-mono-num font-semibold text-[var(--text-primary)] tabular-nums">
                      {goal.current} / {goal.target} {goal.unit}
                    </span>
                    <span className="font-mono-num text-[12px] text-[var(--text-secondary)] tabular-nums">
                      {pct}%
                    </span>
                  </div>
                  <div
                    className="h-2 w-full rounded-full overflow-hidden"
                    style={{ backgroundColor: 'var(--bg-surface-hover)' }}
                  >
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{ width: `${pct}%`, backgroundColor: sub?.color ?? 'var(--accent)' }}
                    />
                  </div>
                </div>

                {/* Milestones Header + Invisible-Scrollbar List */}
                <div
                  className="pt-2.5 flex flex-col flex-1 min-h-0"
                  style={{ borderTop: '1px solid var(--border-subtle)' }}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5 shrink-0">
                    <div className="text-[11.5px] text-[var(--text-muted)] tabular-nums">
                      <span className="font-medium text-[var(--text-secondary)]">Milestones</span>
                      {resolvedMilestones.length > 0 && (
                        <span>
                          {' '}
                          · {completedMsCount}/{resolvedMilestones.length} done
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => openComposer(goal, 'milestone')}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11.5px] font-medium transition-colors hover:bg-[var(--bg-surface-hover)] whitespace-nowrap"
                      style={{ color: 'var(--accent)' }}
                    >
                      <Plus className="w-3 h-3" /> Add milestone
                    </button>
                  </div>
                  {resolvedMilestones.length > 0 && (
                    <div className="flex items-center justify-end mb-1.5 gap-2 shrink-0">
                      <label className="text-[11px] text-[var(--text-muted)]" htmlFor={`milestone-sort-${goal.id}`}>Sort</label>
                      <select id={`milestone-sort-${goal.id}`} aria-label={`Sort milestones for ${goal.title}`} value={milestoneOrder}
                        onChange={e => setMilestoneOrders(prev => ({ ...prev, [goal.id]: e.target.value as MilestoneOrder }))}
                        className="rounded px-1.5 py-0.5 text-[11px] max-w-full" style={inputStyle}>
                        <option value="due-asc">Due date ↑</option><option value="due-desc">Due date ↓</option>
                        <option value="title">Title A–Z</option><option value="incomplete">Incomplete first</option>
                        <option value="completed">Completed first</option><option value="manual">Manual order</option>
                      </select>
                    </div>
                  )}

                  <div className="flex-1 min-h-0 overflow-y-auto scrollbar-none pr-0.5">
                    {resolvedMilestones.length === 0 ? (
                      <p className="text-[12px] text-[var(--text-muted)] py-2">
                        No milestones yet. Click Add milestone to add a checkpoint or link a task.
                      </p>
                    ) : (
                      <div className="space-y-1">
                        {resolvedMilestones.map(({ ms, linkedTask, linkedSub, done, label, date }, index) => (
                          <div
                            key={ms.id}
                            className="group flex items-center justify-between gap-2 py-1 px-1.5 -mx-1.5 rounded-lg hover:bg-[var(--bg-surface-hover)] transition-colors text-[12px]"
                          >
                            <button
                              type="button"
                              onClick={() => handleToggleMilestone(goal, ms)}
                              aria-pressed={done}
                              className="flex items-center gap-2 min-w-0 flex-1 text-left"
                            >
                              {done ? (
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                              ) : (
                                <Circle className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />
                              )}
                              <span className="min-w-0 flex-1">
                                <span
                                  className={
                                    done
                                      ? 'text-[var(--text-muted)] line-through block truncate'
                                      : 'text-[var(--text-primary)] block truncate'
                                  }
                                >
                                  {label}
                                </span>
                                {linkedTask && (
                                  <span className="text-[10.5px] text-[var(--text-muted)] block truncate">
                                    Task
                                    {linkedSub ? ` · ${linkedSub.code}` : ''}
                                    {` · ${linkedTask.estimatedMinutes}m`}
                                  </span>
                                )}
                              </span>
                            </button>

                            <div className="flex items-center gap-1.5 shrink-0">
                              {milestoneOrder === 'manual' && ([-1, 1] as const).map(delta => (
                                <button key={delta} type="button" disabled={index + delta < 0 || index + delta >= sortedMilestones.length}
                                  aria-label={`Move ${label} ${delta < 0 ? 'up' : 'down'}`}
                                  className="px-1 rounded disabled:opacity-30 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                                  onClick={() => {
                                    const next = [...goal.milestones];
                                    const from = next.findIndex(m => m.id === ms.id);
                                    if (from < 0 || from + delta < 0 || from + delta >= next.length) return;
                                    [next[from], next[from + delta]] = [next[from + delta], next[from]];
                                    updateGoal(goal.id, { milestones: next });
                                  }}>{delta < 0 ? '↑' : '↓'}</button>
                              ))}
                              <span className="font-mono-num text-[11px] text-[var(--text-muted)] tabular-nums">
                                {date}
                              </span>
                              {linkedTask && (
                                <button
                                  type="button"
                                  onClick={() => setRoute('tasks')}
                                  title="View in Tasks"
                                  aria-label={`Open ${label} in Tasks`}
                                  className="p-0.5 rounded opacity-0 group-hover:opacity-100 focus-visible:opacity-100 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-opacity"
                                >
                                  <ArrowUpRight className="w-3 h-3" />
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleRemoveMilestone(goal, ms.id)}
                                title={linkedTask ? 'Unlink task from goal' : 'Remove milestone'}
                                aria-label={`Remove ${label}`}
                                className="p-0.5 rounded opacity-0 group-hover:opacity-100 focus-visible:opacity-100 text-[var(--text-muted)] hover:text-rose-600 dark:hover:text-rose-400 transition-opacity"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Bottom Row: Target vs Actual Comparison + Achievement History */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-7 rounded-xl p-4" style={surfaceStyle}>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="font-display text-[14.5px] font-semibold text-[var(--text-primary)]">
                Weekly Target vs Actual by Subject
              </h2>
              <p className="text-[12px] text-[var(--text-muted)]">
                Hours logged against planned subject targets
              </p>
            </div>
            <div className="flex items-center gap-3 text-[11.5px] text-[var(--text-secondary)]">
              <span className="flex items-center gap-1.5">
                <span
                  className="w-2.5 h-2.5 rounded-sm"
                  style={{ backgroundColor: 'var(--border-strong)' }}
                />
                Target
              </span>
              <span className="flex items-center gap-1.5">
                <span
                  className="w-2.5 h-2.5 rounded-sm"
                  style={{ backgroundColor: 'var(--accent)' }}
                />
                Actual
              </span>
            </div>
          </div>
          {chartData.length === 0 ? (
            <p className="py-8 text-[12px] text-[var(--text-muted)]">
              Add a subject to track its weekly study target.
            </p>
          ) : (
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 6, right: 8, left: -18, bottom: 0 }}>
                  <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="subject"
                    tick={{ fill: 'var(--text-muted)', fontSize: 11.5 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: 'var(--text-muted)', fontSize: 11.5 }}
                    axisLine={false}
                    tickLine={false}
                    unit="h"
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--bg-elevated)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 10,
                      fontSize: 12,
                    }}
                  />
                  <Bar
                    dataKey="target"
                    name="Target (h)"
                    fill="var(--border-strong)"
                    radius={[4, 4, 0, 0]}
                    isAnimationActive={false}
                  />
                  <Bar
                    dataKey="actual"
                    name="Actual (h)"
                    fill="var(--accent)"
                    radius={[4, 4, 0, 0]}
                    isAnimationActive={false}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="lg:col-span-5 rounded-xl p-4" style={surfaceStyle}>
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4" style={{ color: 'var(--accent)' }} />
            <h2 className="font-display text-[14.5px] font-semibold text-[var(--text-primary)]">
              Goal Achievement History
            </h2>
          </div>
          <div className="divide-y divide-[var(--border-subtle)]">
            {achievedHistory.length === 0 && (
              <p className="py-4 text-[12px] text-[var(--text-muted)]">No completed goals yet.</p>
            )}
            {achievedHistory.map((item) => (
              <div key={item.id} className="py-3 flex items-start justify-between gap-3">
                <div>
                  <div className="text-[13px] font-medium text-[var(--text-primary)]">
                    {item.title}
                  </div>
                  <div className="text-[11.5px] text-[var(--text-muted)] mt-0.5">
                    {item.completedAt ? new Date(item.completedAt).toLocaleDateString() : ''}
                  </div>
                </div>
                <span className="font-mono-num text-[11.5px] font-medium text-emerald-600 dark:text-emerald-400 shrink-0 tabular-nums">
                  {item.current} / {item.target} {item.unit}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Add Milestone / Task Popup Modal */}
      {composerGoal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-milestone-modal-title"
        >
          <div
            className="fixed inset-0 bg-black/45 backdrop-blur-[2px]"
            onClick={() => setComposerGoalId(null)}
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
              className="flex items-start justify-between gap-3 px-5 py-3.5"
              style={{ borderBottom: '1px solid var(--border-subtle)' }}
            >
              <div className="min-w-0">
                <h2
                  id="add-milestone-modal-title"
                  className="font-display font-semibold text-[15px] text-[var(--text-primary)]"
                >
                  Add Milestone
                </h2>
                <p className="text-[12px] text-[var(--text-muted)] truncate mt-0.5">
                  {composerGoal.title}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setComposerGoalId(null)}
                aria-label="Close add milestone popup"
                className="p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* 3-Mode Switcher: Milestone | Existing Task | New Task */}
              <div
                className="grid grid-cols-3 gap-1 p-0.5 rounded-lg text-[12px]"
                style={{
                  backgroundColor: 'var(--bg-surface-subtle)',
                  border: '1px solid var(--border-subtle)',
                }}
                role="tablist"
                aria-label="Milestone type"
              >
                {(
                  [
                    ['milestone', 'Milestone'],
                    ['existing_task', 'Existing Task'],
                    ['new_task', 'New Task'],
                  ] as [ComposerTab, string][]
                ).map(([tabId, label]) => (
                  <button
                    key={tabId}
                    type="button"
                    role="tab"
                    aria-selected={composerTab === tabId}
                    onClick={() => setComposerTab(tabId)}
                    className="py-1.5 px-2 rounded-md font-medium transition-colors whitespace-nowrap"
                    style={{
                      backgroundColor:
                        composerTab === tabId ? 'var(--bg-surface)' : 'transparent',
                      color:
                        composerTab === tabId ? 'var(--text-primary)' : 'var(--text-muted)',
                      boxShadow: composerTab === tabId ? 'var(--shadow-subtle)' : 'none',
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Tab 1: Standalone Milestone */}
              {composerTab === 'milestone' && (
                <form
                  onSubmit={(e) => {
                    handleAddStandaloneMilestone(e, composerGoal);
                    setComposerGoalId(null);
                  }}
                  className="space-y-3.5"
                >
                  <div>
                    <label className="block text-[12px] font-medium text-[var(--text-secondary)] mb-1">
                      Milestone Title
                    </label>
                    <input
                      type="text"
                      value={msLabel}
                      onChange={(e) => setMsLabel(e.target.value)}
                      placeholder="e.g., Complete Chapter 4 problem review"
                      autoFocus
                      className="w-full px-3 py-2 rounded-lg text-[13px]"
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label className="block text-[12px] font-medium text-[var(--text-secondary)] mb-1">
                      Target Date
                    </label>
                    <input
                      type="date"
                      value={msDate}
                      onChange={(e) => setMsDate(e.target.value)}
                      className="w-full px-2.5 py-2 rounded-lg text-[13px]"
                      style={inputStyle}
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setComposerGoalId(null)}
                      className="px-3.5 py-1.5 rounded-lg text-[13px] text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)]"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={!msLabel.trim()}
                      className="px-4 py-1.5 rounded-lg text-[13px] font-medium disabled:opacity-40"
                      style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' }}
                    >
                      Add Milestone
                    </button>
                  </div>
                </form>
              )}

              {/* Tab 2: Link Existing Task */}
              {composerTab === 'existing_task' && (
                <div className="space-y-3">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="search"
                      value={taskSearch}
                      onChange={(e) => setTaskSearch(e.target.value)}
                      placeholder="Search existing tasks..."
                      aria-label="Search existing tasks"
                      autoFocus
                      className="w-full pl-8 pr-3 py-2 rounded-lg text-[13px]"
                      style={inputStyle}
                    />
                  </div>

                  {availableTasksForPopup.length === 0 ? (
                    <div className="py-6 text-center space-y-1.5">
                      <p className="text-[12.5px] text-[var(--text-muted)]">
                        {tasks.length === 0
                          ? 'No tasks created yet.'
                          : 'No matching unlinked tasks.'}
                      </p>
                      <button
                        type="button"
                        onClick={() => setComposerTab('new_task')}
                        className="text-[12px] font-medium hover:underline"
                        style={{ color: 'var(--accent)' }}
                      >
                        Create a new task instead
                      </button>
                    </div>
                  ) : (
                    <div
                      className="max-h-60 overflow-y-auto scrollbar-none divide-y divide-[var(--border-subtle)] rounded-xl"
                      style={{
                        backgroundColor: 'var(--bg-surface)',
                        border: '1px solid var(--border-subtle)',
                      }}
                    >
                      {availableTasksForPopup.map((task) => {
                        const taskSub = subjects.find((s) => s.id === task.subjectId);
                        return (
                          <button
                            key={task.id}
                            type="button"
                            onClick={() => handleLinkExistingTask(composerGoal, task)}
                            className="w-full px-3 py-2.5 flex items-center justify-between gap-2 text-left hover:bg-[var(--bg-surface-hover)] transition-colors"
                          >
                            <div className="min-w-0">
                              <div className="text-[12.5px] font-medium text-[var(--text-primary)] truncate">
                                {task.title}
                              </div>
                              <div className="text-[11.5px] text-[var(--text-muted)] truncate tabular-nums">
                                {[
                                  taskSub?.code,
                                  task.dueLabel,
                                  `${task.estimatedMinutes}m`,
                                  task.status === 'done' ? 'Done' : task.priority,
                                ]
                                  .filter(Boolean)
                                  .join(' · ')}
                              </div>
                            </div>
                            <span
                              className="inline-flex items-center gap-1 text-[12px] font-medium shrink-0"
                              style={{ color: 'var(--accent)' }}
                            >
                              <Link2 className="w-3.5 h-3.5" /> Link
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  <div className="flex justify-end pt-1">
                    <button
                      type="button"
                      onClick={() => setComposerGoalId(null)}
                      className="px-3.5 py-1.5 rounded-lg text-[13px] text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)]"
                    >
                      Done
                    </button>
                  </div>
                </div>
              )}

              {/* Tab 3: Create New Task & Attach as Milestone */}
              {composerTab === 'new_task' && (
                <form
                  onSubmit={(e) => handleCreateTaskAndAttach(e, composerGoal)}
                  className="space-y-3"
                >
                  <div>
                    <label className="block text-[12px] font-medium text-[var(--text-secondary)] mb-1">
                      Task Title
                    </label>
                    <input
                      type="text"
                      value={newTaskTitle}
                      onChange={(e) => setNewTaskTitle(e.target.value)}
                      placeholder="Also added to Tasks and linked here..."
                      autoFocus
                      className="w-full px-3 py-2 rounded-lg text-[13px]"
                      style={inputStyle}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[12px] font-medium text-[var(--text-secondary)] mb-1">
                        Subject
                      </label>
                      <select
                        value={newTaskSubject}
                        onChange={(e) => setNewTaskSubject(e.target.value)}
                        className="w-full px-2.5 py-2 rounded-lg text-[12.5px]"
                        style={inputStyle}
                      >
                        <option value="">General</option>
                        {subjects.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.code} · {s.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[12px] font-medium text-[var(--text-secondary)] mb-1">
                        Priority
                      </label>
                      <select
                        value={newTaskPriority}
                        onChange={(e) => setNewTaskPriority(e.target.value as Priority)}
                        className="w-full px-2.5 py-2 rounded-lg text-[12.5px]"
                        style={inputStyle}
                      >
                        <option value="high">High</option>
                        <option value="medium">Medium</option>
                        <option value="low">Low</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[12px] font-medium text-[var(--text-secondary)] mb-1">
                        Due Date
                      </label>
                      <input
                        type="date"
                        value={newTaskDue}
                        onChange={(e) => setNewTaskDue(e.target.value)}
                        className="w-full px-2.5 py-2 rounded-lg text-[12.5px]"
                        style={inputStyle}
                      />
                    </div>
                    <div>
                      <label className="block text-[12px] font-medium text-[var(--text-secondary)] mb-1">
                        Est. Minutes
                      </label>
                      <input
                        type="number"
                        min={5}
                        max={300}
                        value={newTaskMinutes}
                        onChange={(e) => setNewTaskMinutes(Number(e.target.value))}
                        className="w-full px-2.5 py-2 rounded-lg text-[12.5px] font-mono-num"
                        style={inputStyle}
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setComposerGoalId(null)}
                      className="px-3.5 py-1.5 rounded-lg text-[13px] text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)]"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={!newTaskTitle.trim()}
                      className="px-4 py-1.5 rounded-lg text-[13px] font-medium disabled:opacity-40"
                      style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' }}
                    >
                      Create & Link Task
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
