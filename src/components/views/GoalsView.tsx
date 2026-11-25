import React, { useEffect, useMemo, useRef, useState } from 'react';
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
  LayoutGrid,
  List,
  ChevronRight,
  ChevronDown,
  MoreHorizontal,
  Pencil,
  Check,
  ChevronsUpDown,
  RotateCcw,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { localDay } from '../../assistant/workspaceContext';
import {
  applyMilestoneAdd,
  applyMilestoneRemove,
  applyMilestoneToggle,
} from '../../utils/goalProgress';
import { sortMilestones, type MilestoneOrder } from '../../utils/milestoneSort';
import {
  countGoalsByStatus,
  filterAndSortGoals,
  formatAchievementMilestoneSummary,
  getGoalMilestoneCounts,
  getGoalProgressPercent,
  getGoalStatus,
  isGoalCompleted,
  loadGoalViewPreferences,
  normalizeGoalUnitLabel,
  parseGoalDeadlineIso,
  sanitizeGoalViewPreferences,
  saveGoalViewPreferences,
  type GoalSortBy,
  type GoalStatus,
  type GoalStatusFilter,
  type GoalViewMode,
  type GoalViewPreferences,
} from '../../utils/goalFilters';
import type { GoalItem, GoalMilestone, Priority, TaskItem } from '../../types/studyflow';

type ComposerTab = 'milestone' | 'existing_task' | 'new_task';

function formatShortDate(iso: string): string {
  if (!iso) return 'No date';
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatFullDate(iso: string): string {
  if (!iso) return 'No deadline';
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const STATUS_TABS: Array<{ id: GoalStatusFilter; label: string }> = [
  { id: 'all', label: 'All Goals' },
  { id: 'in_progress', label: 'In Progress' },
  { id: 'completed', label: 'Completed' },
  { id: 'not_started', label: 'Not Started' },
  { id: 'overdue', label: 'Overdue' },
];

const STATUS_META: Record<
  GoalStatus,
  { label: string; className: string; style?: React.CSSProperties }
> = {
  completed: {
    label: 'Completed',
    className:
      'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/25',
  },
  overdue: {
    label: 'Overdue',
    className: 'text-rose-600 dark:text-rose-400 bg-rose-500/10 border border-rose-500/25',
  },
  in_progress: {
    label: 'In progress',
    className: '',
    style: {
      color: 'var(--accent)',
      backgroundColor: 'var(--accent-soft)',
      border: '1px solid var(--accent-border)',
    },
  },
  not_started: {
    label: 'Not started',
    className: 'text-[var(--text-muted)]',
    style: {
      backgroundColor: 'var(--bg-surface-subtle)',
      border: '1px solid var(--border-subtle)',
    },
  },
};

export const GoalsView: React.FC = () => {
  const {
    goals,
    updateGoal,
    deleteGoal,
    setActiveModal,
    subjects,
    tasks,
    addTask,
    updateTask,
    toggleTaskStatus,
    setRoute,
    focusHistory,
    preferences,
    updatePreferences,
    pushToast,
  } = useApp();

  const initialPrefs = useMemo(
    () => sanitizeGoalViewPreferences(preferences.goalsPrefs ?? loadGoalViewPreferences()),
    // Hydrate once on mount; sync effect below handles persistence and async snapshot hydration
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const [viewMode, setViewMode] = useState<GoalViewMode>(initialPrefs.viewMode);
  const [categoryFilter, setCategoryFilter] = useState<string>(initialPrefs.categoryFilter);
  const [subjectFilter, setSubjectFilter] = useState<string>(initialPrefs.subjectFilter);
  const [statusFilter, setStatusFilter] = useState<GoalStatusFilter>(initialPrefs.statusFilter);
  const [searchQuery, setSearchQuery] = useState<string>(initialPrefs.searchQuery);
  const [sortBy, setSortBy] = useState<GoalSortBy>(initialPrefs.sortBy);
  const [milestoneOrders, setMilestoneOrders] = useState<Record<string, MilestoneOrder>>(
    initialPrefs.milestoneOrders,
  );

  // List view expanded rows & quick action menu
  const [expandedGoalIds, setExpandedGoalIds] = useState<string[]>([]);
  const [openMenuGoalId, setOpenMenuGoalId] = useState<string | null>(null);
  const menuContainerRef = useRef<HTMLDivElement | null>(null);

  // Inline milestone editing state
  const [editingMilestone, setEditingMilestone] = useState<{
    goalId: string;
    milestoneId: string;
    label: string;
    date: string;
  } | null>(null);

  // Edit Goal modal state
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [editGoalTitle, setEditGoalTitle] = useState('');
  const [editGoalCategory, setEditGoalCategory] = useState<GoalItem['category']>('weekly');
  const [editGoalSubject, setEditGoalSubject] = useState('');
  const [editGoalTarget, setEditGoalTarget] = useState(1);
  const [editGoalUnit, setEditGoalUnit] = useState('milestones');
  const [editGoalDeadline, setEditGoalDeadline] = useState('');

  // Add Milestone / Task modal state
  const [composerGoalId, setComposerGoalId] = useState<string | null>(null);
  const [composerTab, setComposerTab] = useState<ComposerTab>('milestone');

  const defaultDateIso = localDay();
  const [msLabel, setMsLabel] = useState('');
  const [msDate, setMsDate] = useState(defaultDateIso);
  const [taskSearch, setTaskSearch] = useState('');
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskSubject, setNewTaskSubject] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<Priority>('medium');
  const [newTaskDue, setNewTaskDue] = useState(defaultDateIso);
  const [newTaskMinutes, setNewTaskMinutes] = useState(45);

  const taskById = useMemo(() => new Map(tasks.map((t) => [t.id, t])), [tasks]);
  const subjectById = useMemo(() => new Map(subjects.map((s) => [s.id, s])), [subjects]);

  // Apply async desktop SQLite preferences snapshot once if loaded after mount
  const hydratedPrefsRef = useRef(Boolean(preferences.goalsPrefs));
  useEffect(() => {
    if (!hydratedPrefsRef.current && preferences.goalsPrefs) {
      hydratedPrefsRef.current = true;
      const clean = sanitizeGoalViewPreferences(preferences.goalsPrefs);
      setViewMode(clean.viewMode);
      setCategoryFilter(clean.categoryFilter);
      setSubjectFilter(clean.subjectFilter);
      setStatusFilter(clean.statusFilter);
      setSearchQuery(clean.searchQuery);
      setSortBy(clean.sortBy);
      setMilestoneOrders(clean.milestoneOrders);
      saveGoalViewPreferences(clean);
    }
  }, [preferences.goalsPrefs]);

  // Persist user's view, filter, and sort preferences across restarts
  const currentPrefs: GoalViewPreferences = useMemo(
    () => ({
      viewMode,
      categoryFilter,
      subjectFilter,
      statusFilter,
      searchQuery,
      sortBy,
      milestoneOrders,
    }),
    [viewMode, categoryFilter, subjectFilter, statusFilter, searchQuery, sortBy, milestoneOrders],
  );

  useEffect(() => {
    saveGoalViewPreferences(currentPrefs);
    const serializedNext = JSON.stringify(currentPrefs);
    const serializedStored = preferences.goalsPrefs ? JSON.stringify(preferences.goalsPrefs) : '';
    if (serializedNext !== serializedStored) {
      updatePreferences({ goalsPrefs: currentPrefs });
    }
  }, [currentPrefs, preferences.goalsPrefs, updatePreferences]);

  // Reset subject filter safely if selected subject was removed
  useEffect(() => {
    if (
      subjectFilter !== 'all' &&
      subjectFilter !== 'general' &&
      !subjectById.has(subjectFilter)
    ) {
      setSubjectFilter('all');
    }
  }, [subjectFilter, subjectById]);

  const composerGoal = useMemo(
    () => goals.find((g) => g.id === composerGoalId) ?? null,
    [goals, composerGoalId],
  );
  const editingGoal = useMemo(
    () => goals.find((g) => g.id === editingGoalId) ?? null,
    [goals, editingGoalId],
  );

  // Close overlays / inline edit on Escape
  useEffect(() => {
    if (!composerGoalId && !editingGoalId && !openMenuGoalId && !editingMilestone) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setComposerGoalId(null);
        setEditingGoalId(null);
        setOpenMenuGoalId(null);
        setEditingMilestone(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [composerGoalId, editingGoalId, openMenuGoalId, editingMilestone]);

  // Close row quick-actions menu on outside click
  useEffect(() => {
    if (!openMenuGoalId) return;
    const onMouseDown = (e: MouseEvent) => {
      if (menuContainerRef.current && !menuContainerRef.current.contains(e.target as Node)) {
        setOpenMenuGoalId(null);
      }
    };
    window.addEventListener('mousedown', onMouseDown);
    return () => window.removeEventListener('mousedown', onMouseDown);
  }, [openMenuGoalId]);

  const todayIso = localDay();

  // Compute live status tab counts scoped to active subject/category/search filters
  const statusCounts = useMemo(() => {
    const preStatusGoals = filterAndSortGoals(
      goals,
      {
        categoryFilter,
        subjectFilter,
        statusFilter: 'all',
        searchQuery,
        sortBy,
      },
      taskById,
      todayIso,
    );
    return countGoalsByStatus(preStatusGoals, taskById, todayIso);
  }, [goals, categoryFilter, subjectFilter, searchQuery, sortBy, taskById, todayIso]);

  const filteredGoals = useMemo(
    () =>
      filterAndSortGoals(
        goals,
        {
          categoryFilter,
          subjectFilter,
          statusFilter,
          searchQuery,
          sortBy,
        },
        taskById,
        todayIso,
      ),
    [goals, categoryFilter, subjectFilter, statusFilter, searchQuery, sortBy, taskById, todayIso],
  );

  const hasActiveFilters =
    categoryFilter !== 'all' ||
    subjectFilter !== 'all' ||
    statusFilter !== 'all' ||
    searchQuery.trim() !== '';

  const clearAllFilters = () => {
    setCategoryFilter('all');
    setSubjectFilter('all');
    setStatusFilter('all');
    setSearchQuery('');
  };

  const hasUnassignedGoals = useMemo(() => goals.some((g) => !g.subjectId), [goals]);

  const surfaceStyle: React.CSSProperties = {
    backgroundColor: 'var(--bg-surface)',
    border: '1px solid var(--border-subtle)',
  };

  const controlStyle: React.CSSProperties = {
    backgroundColor: 'var(--bg-surface)',
    border: '1px solid var(--border-subtle)',
    color: 'var(--text-primary)',
  };

  const inputStyle: React.CSSProperties = {
    backgroundColor: 'var(--bg-surface-subtle)',
    border: '1px solid var(--border-subtle)',
    color: 'var(--text-primary)',
  };

  const openComposer = (goal: GoalItem, tab: ComposerTab = 'milestone') => {
    setOpenMenuGoalId(null);
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

  const openEditGoalModal = (goal: GoalItem) => {
    setOpenMenuGoalId(null);
    setEditingGoalId(goal.id);
    setEditGoalTitle(goal.title);
    setEditGoalCategory(goal.category);
    setEditGoalSubject(goal.subjectId ?? '');
    setEditGoalTarget(goal.target);
    setEditGoalUnit(normalizeGoalUnitLabel(goal.unit));
    setEditGoalDeadline(parseGoalDeadlineIso(goal.deadline, todayIso) ?? '');
  };

  const handleSaveGoalEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGoal) return;
    const nextTitle = editGoalTitle.trim();
    if (!nextTitle || editGoalTarget <= 0) return;

    const nextDeadline = editGoalDeadline
      ? formatFullDate(editGoalDeadline)
      : editingGoal.deadline;
    const nextUnit = normalizeGoalUnitLabel(editGoalUnit) || 'milestones';

    updateGoal(editingGoal.id, {
      title: nextTitle,
      category: editGoalCategory,
      subjectId: editGoalSubject || undefined,
      target: editGoalTarget,
      unit: nextUnit,
      deadline: nextDeadline,
    });
    setEditingGoalId(null);
    pushToast('Goal updated');
  };

  const toggleGoalExpanded = (goalId: string) => {
    setExpandedGoalIds((prev) =>
      prev.includes(goalId) ? prev.filter((id) => id !== goalId) : [...prev, goalId],
    );
  };

  const expandAllVisible = () => {
    setExpandedGoalIds(filteredGoals.map((g) => g.id));
  };

  const collapseAll = () => {
    setExpandedGoalIds([]);
  };

  const handleLogProgress = (goalId: string, current: number, target: number, unit: string) => {
    const step = unit === 'hrs' ? 0.5 : unit === 'cards' ? 10 : 1;
    const next = Math.min(target, Number((current + step).toFixed(1)));
    updateGoal(goalId, { current: next });
    pushToast(`Logged +${step} ${normalizeGoalUnitLabel(unit)} toward goal`);
  };

  const handleToggleGoalCompletion = (goal: GoalItem) => {
    setOpenMenuGoalId(null);
    if (isGoalCompleted(goal)) {
      const nextCurrent =
        goal.target > 1 ? Math.max(0, Number((goal.target - 1).toFixed(1))) : 0;
      updateGoal(goal.id, { current: nextCurrent });
      pushToast(`Reopened "${goal.title}"`);
    } else {
      updateGoal(goal.id, { current: Math.max(1, goal.target) });
      pushToast(`Marked "${goal.title}" as completed`);
    }
  };

  const handleToggleMilestone = (goal: GoalItem, milestone: GoalMilestone) => {
    const linkedTask = milestone.taskId ? taskById.get(milestone.taskId) : undefined;
    if (linkedTask) {
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
    if (
      editingMilestone &&
      editingMilestone.goalId === goal.id &&
      editingMilestone.milestoneId === milestoneId
    ) {
      setEditingMilestone(null);
    }
    const updated = applyMilestoneRemove(goal, milestoneId);
    updateGoal(goal.id, {
      milestones: updated.milestones,
      current: updated.current,
    });
    pushToast('Milestone removed from goal');
  };

  const startEditingMilestone = (
    goal: GoalItem,
    ms: GoalMilestone,
    resolvedLabel: string,
    resolvedDate: string,
  ) => {
    setEditingMilestone({
      goalId: goal.id,
      milestoneId: ms.id,
      label: resolvedLabel,
      date: resolvedDate,
    });
  };

  const handleSaveMilestoneEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMilestone) return;
    const nextLabel = editingMilestone.label.trim();
    if (!nextLabel) return;
    const goal = goals.find((g) => g.id === editingMilestone.goalId);
    if (!goal) {
      setEditingMilestone(null);
      return;
    }
    const targetMs = goal.milestones.find((m) => m.id === editingMilestone.milestoneId);
    if (!targetMs) {
      setEditingMilestone(null);
      return;
    }

    const rawDate = editingMilestone.date.trim();
    const parsedIso = parseGoalDeadlineIso(rawDate, todayIso);
    const displayDate = /^\d{4}-\d{2}-\d{2}$/.test(rawDate)
      ? formatShortDate(rawDate)
      : rawDate || targetMs.date;

    const linkedTask = targetMs.taskId ? taskById.get(targetMs.taskId) : undefined;
    if (linkedTask) {
      updateTask(linkedTask.id, {
        title: nextLabel,
        ...(parsedIso
          ? { dueDate: parsedIso, dueLabel: formatShortDate(parsedIso) }
          : { dueLabel: displayDate }),
      });
    }

    updateGoal(goal.id, {
      milestones: goal.milestones.map((m) =>
        m.id === targetMs.id ? { ...m, label: nextLabel, date: displayDate } : m,
      ),
    });
    setEditingMilestone(null);
    pushToast('Milestone updated');
  };

  const handleMoveManualMilestone = (goal: GoalItem, milestoneId: string, delta: -1 | 1) => {
    const next = [...goal.milestones];
    const from = next.findIndex((m) => m.id === milestoneId);
    if (from < 0 || from + delta < 0 || from + delta >= next.length) return;
    [next[from], next[from + delta]] = [next[from + delta], next[from]];
    updateGoal(goal.id, { milestones: next });
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
        const s = subjectById.get(t.subjectId);
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
  }, [composerGoal, tasks, taskSearch, subjectById]);

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

  const resolveGoalMilestones = (goal: GoalItem) => {
    const milestoneOrder = milestoneOrders[goal.id] ?? 'due-asc';
    const sortedMilestones = sortMilestones(
      goal.milestones,
      taskById,
      milestoneOrder,
      goal.deadline,
    );
    const resolvedMilestones = sortedMilestones.map((ms) => {
      const linkedTask = ms.taskId ? taskById.get(ms.taskId) : undefined;
      const linkedSub = linkedTask ? subjectById.get(linkedTask.subjectId) : undefined;
      return {
        ms,
        linkedTask,
        linkedSub,
        done: linkedTask ? linkedTask.status === 'done' : ms.done,
        label: linkedTask ? linkedTask.title : ms.label,
        date: linkedTask ? linkedTask.dueLabel || formatShortDate(linkedTask.dueDate) : ms.date,
      };
    });
    return { milestoneOrder, sortedMilestones, resolvedMilestones };
  };

  const renderMilestoneItem = (
    goal: GoalItem,
    entry: ReturnType<typeof resolveGoalMilestones>['resolvedMilestones'][number],
    index: number,
    totalCount: number,
    milestoneOrder: MilestoneOrder,
    inListView = false,
  ) => {
    const { ms, linkedTask, linkedSub, done, label, date } = entry;
    const isEditing =
      editingMilestone?.goalId === goal.id && editingMilestone?.milestoneId === ms.id;

    if (isEditing && editingMilestone) {
      return (
        <form
          key={ms.id}
          onSubmit={handleSaveMilestoneEdit}
          className="flex flex-wrap items-center gap-1.5 py-1.5 px-2 rounded-lg text-[12px]"
          style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--accent-border)',
          }}
        >
          <input
            type="text"
            value={editingMilestone.label}
            onChange={(e) =>
              setEditingMilestone((prev) => (prev ? { ...prev, label: e.target.value } : prev))
            }
            aria-label="Edit milestone title"
            autoFocus
            className="flex-1 min-w-[140px] px-2 py-1 rounded text-[12px]"
            style={inputStyle}
          />
          <input
            type="text"
            value={editingMilestone.date}
            onChange={(e) =>
              setEditingMilestone((prev) => (prev ? { ...prev, date: e.target.value } : prev))
            }
            placeholder="Due date"
            aria-label="Edit milestone date"
            className="w-28 px-2 py-1 rounded text-[11.5px] font-mono-num"
            style={inputStyle}
          />
          <button
            type="submit"
            disabled={!editingMilestone.label.trim()}
            aria-label="Save milestone edit"
            title="Save changes"
            className="p-1 rounded text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 disabled:opacity-40"
          >
            <Check className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setEditingMilestone(null)}
            aria-label="Cancel milestone edit"
            title="Cancel"
            className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </form>
      );
    }

    const actionVisibilityClass = inListView
      ? 'opacity-75 group-hover:opacity-100 focus-visible:opacity-100'
      : 'opacity-50 group-hover:opacity-100 focus-visible:opacity-100';

    return (
      <div
        key={ms.id}
        className={`group flex items-center justify-between gap-2 ${
          inListView ? 'py-1.5 px-2' : 'py-1 px-1.5 -mx-1.5'
        } rounded-lg hover:bg-[var(--bg-surface-hover)] transition-colors text-[12px]`}
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

        <div className="flex items-center gap-1 shrink-0">
          {milestoneOrder === 'manual' &&
            ([-1, 1] as const).map((delta) => (
              <button
                key={delta}
                type="button"
                disabled={index + delta < 0 || index + delta >= totalCount}
                aria-label={`Move ${label} ${delta < 0 ? 'up' : 'down'}`}
                className="px-1 rounded disabled:opacity-30 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                onClick={() => handleMoveManualMilestone(goal, ms.id, delta)}
              >
                {delta < 0 ? '↑' : '↓'}
              </button>
            ))}
          <span className="font-mono-num text-[11px] text-[var(--text-muted)] tabular-nums mr-1">
            {date}
          </span>
          <button
            type="button"
            onClick={() => startEditingMilestone(goal, ms, label, date)}
            title="Edit milestone"
            aria-label={`Edit ${label}`}
            className={`p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition-all ${actionVisibilityClass}`}
          >
            <Pencil className="w-3 h-3" />
          </button>
          {linkedTask && (
            <button
              type="button"
              onClick={() => setRoute('tasks')}
              title="View in Tasks"
              aria-label={`Open ${label} in Tasks`}
              className={`p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition-all ${actionVisibilityClass}`}
            >
              <ArrowUpRight className="w-3 h-3" />
            </button>
          )}
          <button
            type="button"
            onClick={() => handleRemoveMilestone(goal, ms.id)}
            title={linkedTask ? 'Unlink task from goal' : 'Delete milestone'}
            aria-label={`Remove ${label}`}
            className={`p-1 rounded text-[var(--text-muted)] hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-500/10 transition-all ${actionVisibilityClass}`}
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>
    );
  };

  const allVisibleExpanded =
    filteredGoals.length > 0 && filteredGoals.every((g) => expandedGoalIds.includes(g.id));

  return (
    <div className="space-y-4 pb-6">
      {/* Header + View Switcher + New Goal */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-[19px] font-semibold text-[var(--text-primary)]">
            Goals & Targets
          </h1>
          <p className="text-[12.5px] text-[var(--text-muted)]">
            Daily study pacing, syllabus targets, and task-linked milestone tracking
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Card / List View Switcher */}
          <div
            className="inline-flex items-center p-0.5 rounded-lg"
            style={surfaceStyle}
            role="group"
            aria-label="Goals view mode"
          >
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              aria-pressed={viewMode === 'cards'}
              className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md text-[12px] font-medium transition-colors whitespace-nowrap"
              style={{
                backgroundColor: viewMode === 'cards' ? 'var(--accent-soft)' : 'transparent',
                color: viewMode === 'cards' ? 'var(--accent)' : 'var(--text-muted)',
              }}
            >
              <LayoutGrid className="w-3.5 h-3.5" /> Cards
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              aria-pressed={viewMode === 'list'}
              className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md text-[12px] font-medium transition-colors whitespace-nowrap"
              style={{
                backgroundColor: viewMode === 'list' ? 'var(--accent-soft)' : 'transparent',
                color: viewMode === 'list' ? 'var(--accent)' : 'var(--text-muted)',
              }}
            >
              <List className="w-3.5 h-3.5" /> List
            </button>
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
      </div>

      {/* Goal-Level Filtering & Sorting Toolbar */}
      <div className="space-y-2.5">
        {/* Status Filter Tabs: All Goals | In Progress | Completed | Not Started | Overdue */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div
            className="flex flex-wrap items-center gap-1.5"
            role="group"
            aria-label="Filter goals by status"
          >
            {STATUS_TABS.map((tab) => {
              const active = statusFilter === tab.id;
              const count = statusCounts[tab.id];
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStatusFilter(tab.id)}
                  aria-pressed={active}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[12px] font-medium transition-colors whitespace-nowrap"
                  style={{
                    backgroundColor: active ? 'var(--accent-soft)' : 'var(--bg-surface)',
                    color: active ? 'var(--accent)' : 'var(--text-secondary)',
                    border: active
                      ? '1px solid var(--accent-border)'
                      : '1px solid var(--border-subtle)',
                  }}
                >
                  <span>{tab.label}</span>
                  <span
                    className="font-mono-num text-[11px] tabular-nums"
                    style={{ opacity: active ? 0.95 : 0.65 }}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          <span className="font-mono-num text-[11.5px] text-[var(--text-muted)] tabular-nums">
            Showing {filteredGoals.length} of {goals.length} goals
          </span>
        </div>

        {/* Search, Subject, Category & Goal Sort Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="w-3.5 h-3.5 text-[var(--text-muted)] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search goals by name..."
              aria-label="Search goals by name"
              className="w-full h-8 pl-8 pr-7 rounded-lg text-[12.5px]"
              style={controlStyle}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Clear goal search"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <select
            aria-label="Filter goals by subject"
            value={subjectFilter}
            onChange={(e) => setSubjectFilter(e.target.value)}
            className="h-8 px-2.5 rounded-lg text-[12px] max-w-[210px]"
            style={controlStyle}
          >
            <option value="all">All subjects</option>
            {hasUnassignedGoals && <option value="general">General (no subject)</option>}
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.code} · {s.name}
              </option>
            ))}
          </select>

          <select
            aria-label="Filter goals by category"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="h-8 px-2.5 rounded-lg text-[12px]"
            style={controlStyle}
          >
            <option value="all">All categories</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="subject">Subject</option>
            <option value="syllabus">Syllabus</option>
            <option value="revision">Revision</option>
            <option value="tasks">Tasks</option>
          </select>

          <div className="flex items-center gap-1.5 ml-auto">
            <label htmlFor="goals-sort-select" className="text-[11.5px] text-[var(--text-muted)]">
              Sort
            </label>
            <select
              id="goals-sort-select"
              aria-label="Sort goals"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as GoalSortBy)}
              className="h-8 px-2.5 rounded-lg text-[12px]"
              style={controlStyle}
            >
              <option value="due-asc">Due date (earliest)</option>
              <option value="due-desc">Due date (latest)</option>
              <option value="title-asc">Alphabetical (A–Z)</option>
              <option value="title-desc">Alphabetical (Z–A)</option>
              <option value="created-desc">Date created (newest)</option>
              <option value="created-asc">Date created (oldest)</option>
              <option value="progress-desc">Completion % (high–low)</option>
              <option value="progress-asc">Completion % (low–high)</option>
              <option value="remaining-asc">Remaining milestones (fewest)</option>
              <option value="remaining-desc">Remaining milestones (most)</option>
            </select>
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearAllFilters}
              className="h-8 px-2.5 rounded-lg text-[12px] font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)] whitespace-nowrap"
              style={{ border: '1px solid var(--border-subtle)' }}
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Empty State OR Card View OR Compact List View */}
      {filteredGoals.length === 0 ? (
        <div className="rounded-xl p-8 text-center space-y-2.5" style={surfaceStyle}>
          <p className="text-[13.5px] font-medium text-[var(--text-primary)]">
            {goals.length === 0 ? 'No goals created yet' : 'No goals match your filters'}
          </p>
          <p className="text-[12px] text-[var(--text-muted)]">
            {goals.length === 0
              ? 'Create a study target and break it down with milestones or linked tasks.'
              : 'Try adjusting your search query, status, subject, or category filters.'}
          </p>
          <div className="flex items-center justify-center gap-2 pt-1">
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearAllFilters}
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
      ) : viewMode === 'cards' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredGoals.map((goal) => {
            const pct = getGoalProgressPercent(goal, taskById);
            const sub = goal.subjectId ? subjectById.get(goal.subjectId) ?? null : null;
            const status = getGoalStatus(goal, taskById, todayIso);
            const statusInfo = STATUS_META[status];
            const displayUnit = normalizeGoalUnitLabel(goal.unit);

            const { milestoneOrder, sortedMilestones, resolvedMilestones } =
              resolveGoalMilestones(goal);
            const completedMsCount = resolvedMilestones.filter((m) => m.done).length;

            return (
              <div
                key={goal.id}
                className="rounded-xl p-4 h-[296px] flex flex-col gap-3"
                style={surfaceStyle}
              >
                {/* Fixed Card Header */}
                <div className="flex items-start justify-between gap-2.5 shrink-0">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 text-[11.5px] text-[var(--text-muted)] truncate">
                      {sub && (
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: sub.color }}
                        />
                      )}
                      <span className="capitalize truncate">
                        {goal.category} goal {sub ? `· ${sub.code}` : ''} · Due {goal.deadline}
                      </span>
                    </div>
                    <h2 className="font-display text-[15px] font-semibold text-[var(--text-primary)] mt-0.5 truncate">
                      {goal.title}
                    </h2>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10.5px] font-medium whitespace-nowrap ${statusInfo.className}`}
                      style={statusInfo.style}
                    >
                      {statusInfo.label}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        handleLogProgress(goal.id, goal.current, goal.target, goal.unit)
                      }
                      disabled={goal.current >= goal.target}
                      className="px-2 py-1 rounded-lg text-[11.5px] font-medium transition-colors disabled:opacity-40 hover:bg-[var(--bg-surface-hover)] whitespace-nowrap"
                      style={{ border: '1px solid var(--border-subtle)', color: 'var(--accent)' }}
                    >
                      + Log
                    </button>
                    <button
                      type="button"
                      onClick={() => openEditGoalModal(goal)}
                      aria-label={`Edit goal ${goal.title}`}
                      title="Edit goal"
                      className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5" />
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
                      {goal.current} / {goal.target} {displayUnit}
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
                    <div className="flex items-center gap-2">
                      {resolvedMilestones.length > 0 && (
                        <div className="flex items-center gap-1">
                          <label
                            className="text-[11px] text-[var(--text-muted)]"
                            htmlFor={`milestone-sort-${goal.id}`}
                          >
                            Sort
                          </label>
                          <select
                            id={`milestone-sort-${goal.id}`}
                            aria-label={`Sort milestones for ${goal.title}`}
                            value={milestoneOrder}
                            onChange={(e) =>
                              setMilestoneOrders((prev) => ({
                                ...prev,
                                [goal.id]: e.target.value as MilestoneOrder,
                              }))
                            }
                            className="rounded px-1.5 py-0.5 text-[11px] max-w-full"
                            style={inputStyle}
                          >
                            <option value="due-asc">Due date ↑</option>
                            <option value="due-desc">Due date ↓</option>
                            <option value="title">Title A–Z</option>
                            <option value="incomplete">Incomplete first</option>
                            <option value="completed">Completed first</option>
                            <option value="manual">Manual order</option>
                          </select>
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => openComposer(goal, 'milestone')}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11.5px] font-medium transition-colors hover:bg-[var(--bg-surface-hover)] whitespace-nowrap"
                        style={{ color: 'var(--accent)' }}
                      >
                        <Plus className="w-3 h-3" /> Add milestone
                      </button>
                    </div>
                  </div>

                  <div className="flex-1 min-h-0 overflow-y-auto scrollbar-none pr-0.5">
                    {resolvedMilestones.length === 0 ? (
                      <p className="text-[12px] text-[var(--text-muted)] py-2">
                        No milestones yet. Click Add milestone to add a checkpoint or link a task.
                      </p>
                    ) : (
                      <div className="space-y-1">
                        {resolvedMilestones.map((entry, index) =>
                          renderMilestoneItem(
                            goal,
                            entry,
                            index,
                            sortedMilestones.length,
                            milestoneOrder,
                            false,
                          ),
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Compact List View */
        <div
          className="rounded-xl overflow-visible"
          style={surfaceStyle}
          role="region"
          aria-label="Goals list view"
        >
          {/* List Utility Strip: Expand All & Collapse All */}
          <div
            className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 rounded-t-xl"
            style={{
              backgroundColor: 'var(--bg-surface-subtle)',
              borderBottom: '1px solid var(--border-subtle)',
            }}
          >
            <span className="text-[11.5px] text-[var(--text-muted)]">
              Click any goal row to expand and manage its milestones inline
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={expandAllVisible}
                disabled={allVisibleExpanded}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11.5px] font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)] disabled:opacity-40 whitespace-nowrap transition-colors"
                style={surfaceStyle}
              >
                <ChevronsUpDown className="w-3 h-3" /> Expand All
              </button>
              <button
                type="button"
                onClick={collapseAll}
                disabled={expandedGoalIds.length === 0}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11.5px] font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)] disabled:opacity-40 whitespace-nowrap transition-colors"
                style={surfaceStyle}
              >
                Collapse All
              </button>
            </div>
          </div>

          {/* Compact Column Header */}
          <div
            className="hidden md:grid md:grid-cols-[minmax(0,3fr)_minmax(0,1.3fr)_minmax(0,1.65fr)_78px_124px_96px_44px] gap-3 px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderBottom: '1px solid var(--border-subtle)',
            }}
          >
            <div>Goal</div>
            <div>Subject</div>
            <div>Progress</div>
            <div>Milestones</div>
            <div>Due Date</div>
            <div>Status</div>
            <div className="text-right">Actions</div>
          </div>

          <div className="divide-y divide-[var(--border-subtle)]">
            {filteredGoals.map((goal) => {
              const pct = getGoalProgressPercent(goal, taskById);
              const sub = goal.subjectId ? subjectById.get(goal.subjectId) ?? null : null;
              const status = getGoalStatus(goal, taskById, todayIso);
              const statusInfo = STATUS_META[status];
              const completed = isGoalCompleted(goal);
              const isExpanded = expandedGoalIds.includes(goal.id);
              const isMenuOpen = openMenuGoalId === goal.id;
              const { milestoneOrder, sortedMilestones, resolvedMilestones } =
                resolveGoalMilestones(goal);
              const { completed: completedMsCount, total: totalMsCount } = getGoalMilestoneCounts(
                goal,
                taskById,
              );

              return (
                <div key={goal.id}>
                  {/* Goal Summary Row */}
                  <div
                    className="grid grid-cols-1 md:grid-cols-[minmax(0,3fr)_minmax(0,1.3fr)_minmax(0,1.65fr)_78px_124px_96px_44px] gap-2.5 md:gap-3 items-center px-4 py-2.5 hover:bg-[var(--bg-surface-hover)]/50 transition-colors cursor-pointer"
                    onClick={() => toggleGoalExpanded(goal.id)}
                  >
                    {/* Expand Chevron + Goal Name */}
                    <div className="flex items-center gap-2 min-w-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleGoalExpanded(goal.id);
                        }}
                        aria-expanded={isExpanded}
                        aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${goal.title}`}
                        className="p-1 -ml-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] shrink-0"
                      >
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                      </button>
                      <div className="min-w-0">
                        <div className="text-[13.5px] font-medium text-[var(--text-primary)] truncate">
                          {goal.title}
                        </div>
                        <div className="text-[11px] text-[var(--text-muted)] capitalize truncate">
                          {goal.category} goal
                        </div>
                      </div>
                    </div>

                    {/* Subject with Assigned Color */}
                    <div className="flex items-center min-w-0">
                      {sub ? (
                        <span
                          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11.5px] font-medium truncate max-w-full"
                          style={{
                            color: sub.color,
                            backgroundColor: `${sub.color}18`,
                            border: `1px solid ${sub.color}38`,
                          }}
                          title={`${sub.code} · ${sub.name}`}
                        >
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: sub.color }}
                          />
                          <span className="truncate">{sub.code}</span>
                        </span>
                      ) : (
                        <span className="text-[12px] text-[var(--text-muted)]">General</span>
                      )}
                    </div>

                    {/* Progress Bar + Percentage */}
                    <div className="flex items-center gap-2 pr-1">
                      <div
                        className="h-1.5 flex-1 rounded-full overflow-hidden min-w-[48px]"
                        style={{ backgroundColor: 'var(--bg-surface-hover)' }}
                      >
                        <div
                          className="h-full rounded-full transition-all duration-300"
                          style={{
                            width: `${pct}%`,
                            backgroundColor: sub?.color ?? 'var(--accent)',
                          }}
                        />
                      </div>
                      <span className="font-mono-num text-[12px] font-medium text-[var(--text-primary)] tabular-nums shrink-0">
                        {pct}%
                      </span>
                    </div>

                    {/* Completed / Total Milestone Count */}
                    <div className="font-mono-num text-[12px] text-[var(--text-secondary)] tabular-nums">
                      {completedMsCount}/{totalMsCount}
                      <span className="md:hidden text-[var(--text-muted)]"> milestones</span>
                    </div>

                    {/* Due Date */}
                    <div
                      className={`text-[12px] font-mono-num truncate ${
                        status === 'overdue'
                          ? 'text-rose-600 dark:text-rose-400 font-medium'
                          : 'text-[var(--text-muted)]'
                      }`}
                      title={goal.deadline}
                    >
                      {goal.deadline}
                    </div>

                    {/* Status Badge */}
                    <div>
                      <span
                        className={`inline-block px-2 py-0.5 rounded-md text-[11px] font-medium whitespace-nowrap ${statusInfo.className}`}
                        style={statusInfo.style}
                      >
                        {statusInfo.label}
                      </span>
                    </div>

                    {/* Quick Actions Menu */}
                    <div
                      className="flex items-center justify-end relative"
                      onClick={(e) => e.stopPropagation()}
                      ref={isMenuOpen ? menuContainerRef : undefined}
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setOpenMenuGoalId((prev) => (prev === goal.id ? null : goal.id))
                        }
                        aria-haspopup="menu"
                        aria-expanded={isMenuOpen}
                        aria-label={`Quick actions for ${goal.title}`}
                        className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] transition-colors"
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </button>

                      {isMenuOpen && (
                        <div
                          role="menu"
                          aria-label={`Actions for ${goal.title}`}
                          className="absolute right-0 top-full mt-1 w-48 rounded-xl py-1 z-30"
                          style={{
                            backgroundColor: 'var(--bg-elevated)',
                            border: '1px solid var(--border-subtle)',
                            boxShadow: 'var(--shadow-floating)',
                          }}
                        >
                          <button
                            type="button"
                            role="menuitem"
                            onClick={() => openEditGoalModal(goal)}
                            className="w-full px-3 py-1.5 text-left text-[12px] text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] flex items-center gap-2"
                          >
                            <Pencil className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                            Edit goal
                          </button>
                          <button
                            type="button"
                            role="menuitem"
                            disabled={goal.current >= goal.target}
                            onClick={() => {
                              handleLogProgress(goal.id, goal.current, goal.target, goal.unit);
                              setOpenMenuGoalId(null);
                            }}
                            className="w-full px-3 py-1.5 text-left text-[12px] text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] disabled:opacity-40 flex items-center gap-2"
                          >
                            <TrendingUp className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                            Log progress ({goal.current}/{goal.target})
                          </button>
                          <button
                            type="button"
                            role="menuitem"
                            onClick={() => openComposer(goal, 'milestone')}
                            className="w-full px-3 py-1.5 text-left text-[12px] text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] flex items-center gap-2"
                          >
                            <Plus className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                            Add milestone
                          </button>
                          <button
                            type="button"
                            role="menuitem"
                            onClick={() => handleToggleGoalCompletion(goal)}
                            className="w-full px-3 py-1.5 text-left text-[12px] text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] flex items-center gap-2"
                          >
                            {completed ? (
                              <>
                                <RotateCcw className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                                Reopen goal
                              </>
                            ) : (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                Mark completed
                              </>
                            )}
                          </button>
                          <button
                            type="button"
                            role="menuitem"
                            onClick={() => {
                              toggleGoalExpanded(goal.id);
                              setOpenMenuGoalId(null);
                            }}
                            className="w-full px-3 py-1.5 text-left text-[12px] text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] flex items-center gap-2"
                          >
                            {isExpanded ? (
                              <>
                                <ChevronDown className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                                Collapse milestones
                              </>
                            ) : (
                              <>
                                <ChevronRight className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                                Expand milestones
                              </>
                            )}
                          </button>
                          <div
                            className="my-1"
                            style={{ borderTop: '1px solid var(--border-subtle)' }}
                          />
                          <button
                            type="button"
                            role="menuitem"
                            onClick={() => {
                              setOpenMenuGoalId(null);
                              deleteGoal(goal.id);
                            }}
                            className="w-full px-3 py-1.5 text-left text-[12px] text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 flex items-center gap-2"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Delete goal
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Expanded Inline Milestones Directly Underneath Row */}
                  {isExpanded && (
                    <div
                      className="px-4 md:pl-10 py-3 space-y-2"
                      style={{
                        backgroundColor: 'var(--bg-surface-subtle)',
                        borderTop: '1px solid var(--border-subtle)',
                      }}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2 text-[11.5px] text-[var(--text-muted)] tabular-nums">
                          <span className="font-medium text-[var(--text-secondary)]">
                            Milestones
                          </span>
                          <span>
                            · {completedMsCount}/{resolvedMilestones.length} completed ·{' '}
                            {goal.current} / {goal.target} {normalizeGoalUnitLabel(goal.unit)}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          {resolvedMilestones.length > 0 && (
                            <div className="flex items-center gap-1.5">
                              <label
                                className="text-[11px] text-[var(--text-muted)]"
                                htmlFor={`list-milestone-sort-${goal.id}`}
                              >
                                Sort
                              </label>
                              <select
                                id={`list-milestone-sort-${goal.id}`}
                                aria-label={`Sort milestones for ${goal.title}`}
                                value={milestoneOrder}
                                onChange={(e) =>
                                  setMilestoneOrders((prev) => ({
                                    ...prev,
                                    [goal.id]: e.target.value as MilestoneOrder,
                                  }))
                                }
                                className="rounded px-1.5 py-0.5 text-[11px]"
                                style={inputStyle}
                              >
                                <option value="due-asc">Due date ↑</option>
                                <option value="due-desc">Due date ↓</option>
                                <option value="title">Title A–Z</option>
                                <option value="incomplete">Incomplete first</option>
                                <option value="completed">Completed first</option>
                                <option value="manual">Manual order</option>
                              </select>
                            </div>
                          )}

                          <button
                            type="button"
                            onClick={() => openComposer(goal, 'milestone')}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11.5px] font-medium hover:bg-[var(--bg-surface-hover)] whitespace-nowrap"
                            style={{ color: 'var(--accent)' }}
                          >
                            <Plus className="w-3 h-3" /> Add milestone
                          </button>
                        </div>
                      </div>

                      {resolvedMilestones.length === 0 ? (
                        <p className="text-[12px] text-[var(--text-muted)] py-1">
                          No milestones yet. Click Add milestone to add a checkpoint or link a task.
                        </p>
                      ) : (
                        <div className="space-y-0.5">
                          {resolvedMilestones.map((entry, index) =>
                            renderMilestoneItem(
                              goal,
                              entry,
                              index,
                              sortedMilestones.length,
                              milestoneOrder,
                              true,
                            ),
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
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
            {achievedHistory.map((item) => {
              const summaryLabel = formatAchievementMilestoneSummary(item, taskById);
              const normalizedUnit = normalizeGoalUnitLabel(item.unit);
              const completedDate = item.completedAt
                ? new Date(item.completedAt).toLocaleDateString()
                : '';

              return (
                <div key={item.id} className="py-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[13px] font-medium text-[var(--text-primary)] truncate">
                      {item.title}
                    </div>
                    <div className="text-[11.5px] text-[var(--text-muted)] mt-0.5 tabular-nums">
                      {[
                        completedDate,
                        item.milestones.length > 0
                          ? `${item.current} / ${item.target} ${normalizedUnit}`
                          : '',
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </div>
                  </div>
                  <span className="font-mono-num text-[11.5px] font-medium text-emerald-600 dark:text-emerald-400 shrink-0 tabular-nums">
                    {summaryLabel}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Edit Goal Modal */}
      {editingGoal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-goal-modal-title"
        >
          <div
            className="fixed inset-0 bg-black/45 backdrop-blur-[2px]"
            onClick={() => setEditingGoalId(null)}
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
                  id="edit-goal-modal-title"
                  className="font-display font-semibold text-[15px] text-[var(--text-primary)]"
                >
                  Edit Goal
                </h2>
                <p className="text-[12px] text-[var(--text-muted)] truncate mt-0.5">
                  Update target, subject, or deadline while keeping milestones intact
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingGoalId(null)}
                aria-label="Close edit goal modal"
                className="p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveGoalEdit} className="p-5 space-y-3.5">
              <div>
                <label className="block text-[12px] font-medium text-[var(--text-secondary)] mb-1">
                  Goal Title
                </label>
                <input
                  type="text"
                  value={editGoalTitle}
                  onChange={(e) => setEditGoalTitle(e.target.value)}
                  autoFocus
                  className="w-full px-3 py-2 rounded-lg text-[13px]"
                  style={inputStyle}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-medium text-[var(--text-secondary)] mb-1">
                    Category
                  </label>
                  <select
                    value={editGoalCategory}
                    onChange={(e) => setEditGoalCategory(e.target.value as GoalItem['category'])}
                    className="w-full px-2.5 py-2 rounded-lg text-[12.5px]"
                    style={inputStyle}
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="subject">Subject</option>
                    <option value="syllabus">Syllabus</option>
                    <option value="revision">Revision</option>
                    <option value="tasks">Tasks</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-[var(--text-secondary)] mb-1">
                    Subject
                  </label>
                  <select
                    value={editGoalSubject}
                    onChange={(e) => setEditGoalSubject(e.target.value)}
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
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[12px] font-medium text-[var(--text-secondary)] mb-1">
                    Target
                  </label>
                  <input
                    type="number"
                    min={1}
                    step="0.5"
                    value={editGoalTarget}
                    onChange={(e) => setEditGoalTarget(Number(e.target.value))}
                    className="w-full px-2.5 py-2 rounded-lg text-[12.5px] font-mono-num"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-[var(--text-secondary)] mb-1">
                    Unit
                  </label>
                  <input
                    type="text"
                    value={editGoalUnit}
                    onChange={(e) => setEditGoalUnit(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-lg text-[12.5px]"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-[var(--text-secondary)] mb-1">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={editGoalDeadline}
                    onChange={(e) => setEditGoalDeadline(e.target.value)}
                    className="w-full px-2 py-2 rounded-lg text-[12px]"
                    style={inputStyle}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setEditingGoalId(null)}
                  className="px-3.5 py-1.5 rounded-lg text-[13px] text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!editGoalTitle.trim() || editGoalTarget <= 0}
                  className="px-4 py-1.5 rounded-lg text-[13px] font-medium disabled:opacity-40"
                  style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' }}
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
                        const taskSub = subjectById.get(task.subjectId);
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
