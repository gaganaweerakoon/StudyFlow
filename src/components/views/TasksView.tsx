import React, { useState, useMemo } from 'react';
import {
  Search,
  Plus,
  Check,
  Trash2,
  X,
  List,
  Columns3,
  CalendarDays,
  Clock,
  CheckSquare,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { Priority, TaskItem, TaskStatus } from '../../types/studyflow';
import { filterAndSortTasks } from '../../utils/studyLogic';

type TasksLayout = 'list' | 'kanban' | 'calendar';

const COLUMNS: { id: TaskStatus; label: string }[] = [
  { id: 'todo', label: 'To Do' },
  { id: 'in_progress', label: 'In Progress' },
  { id: 'review', label: 'Review' },
  { id: 'done', label: 'Completed' },
];

const PRIORITY_STYLE: Record<Priority, { label: string; color: string }> = {
  high: { label: 'High', color: '#E11D48' },
  medium: { label: 'Medium', color: '#D97706' },
  low: { label: 'Low', color: '#64748B' },
};

export const TasksView: React.FC = () => {
  const {
    tasks,
    subjects,
    toggleTaskStatus,
    toggleSubtask,
    updateTask,
    deleteTasks,
    setActiveModal,
    pushToast,
  } = useApp();

  const [layout, setLayout] = useState<TasksLayout>('list');
  const [scope, setScope] = useState<'all' | 'today' | 'upcoming' | 'completed'>('all');
  const [subjectFilter, setSubjectFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<Priority | 'all'>('all');
  const [sortBy, setSortBy] = useState<'dueDate' | 'priority' | 'title'>('dueDate');
  const [query, setQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [drawerTaskId, setDrawerTaskId] = useState<string | null>(null);
  const [newSubtaskText, setNewSubtaskText] = useState('');
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);

  const visibleTasks = useMemo(
    () =>
      filterAndSortTasks(tasks, {
        query,
        subjectId: subjectFilter,
        scope,
        priority: priorityFilter,
        sortBy,
      }),
    [tasks, query, subjectFilter, scope, priorityFilter, sortBy]
  );

  const drawerTask = tasks.find((t) => t.id === drawerTaskId) ?? null;

  const toggleBulkSelect = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleBulkComplete = () => {
    selectedIds.forEach((id) => updateTask(id, { status: 'done' }));
    pushToast(`Marked ${selectedIds.length} tasks completed`);
    setSelectedIds([]);
  };

  const handleBulkDelete = () => {
    deleteTasks(selectedIds);
    setSelectedIds([]);
  };

  const handleAddSubtask = (task: TaskItem) => {
    if (!newSubtaskText.trim()) return;
    updateTask(task.id, {
      subtasks: [...task.subtasks, { id: `st-${Date.now()}`, title: newSubtaskText.trim(), done: false }],
    });
    setNewSubtaskText('');
  };

  const surfaceStyle: React.CSSProperties = {
    backgroundColor: 'var(--bg-surface)',
    border: '1px solid var(--border-subtle)',
  };

  return (
    <div className="space-y-4 pb-6 relative">
      {/* Header & View Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-[19px] font-semibold text-[var(--text-primary)]">
            Tasks
          </h1>
          <p className="text-[12.5px] text-[var(--text-muted)]">
            {tasks.filter((t) => t.status !== 'done').length} open · {tasks.filter((t) => t.status === 'done').length} completed
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div
            className="inline-flex items-center p-0.5 rounded-lg text-[12px]"
            style={{ backgroundColor: 'var(--bg-surface-subtle)', border: '1px solid var(--border-subtle)' }}
            role="tablist"
            aria-label="Task view mode"
          >
            {(
              [
                { id: 'list', label: 'List', icon: List },
                { id: 'kanban', label: 'Board', icon: Columns3 },
                { id: 'calendar', label: 'Calendar', icon: CalendarDays },
              ] as const
            ).map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={layout === tab.id}
                  onClick={() => setLayout(tab.id)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium transition-colors"
                  style={{
                    backgroundColor: layout === tab.id ? 'var(--bg-surface)' : 'transparent',
                    color: layout === tab.id ? 'var(--text-primary)' : 'var(--text-muted)',
                  }}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => setActiveModal('create_task')}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[12.5px] font-medium"
            style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' }}
          >
            <Plus className="w-3.5 h-3.5" /> New Task
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-1.5">
          {(['all', 'today', 'upcoming', 'completed'] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setScope(s)}
              className="px-2.5 py-1 rounded-lg text-[12px] font-medium capitalize transition-colors"
              style={{
                backgroundColor: scope === s ? 'var(--accent-soft)' : 'var(--bg-surface)',
                color: scope === s ? 'var(--accent)' : 'var(--text-secondary)',
                border: scope === s ? '1px solid var(--accent-border)' : '1px solid var(--border-subtle)',
              }}
            >
              {s}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[var(--text-muted)] absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter tasks..."
              aria-label="Filter tasks"
              className="h-8 pl-8 pr-3 rounded-lg text-[12.5px] w-44 sm:w-52"
              style={{
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-primary)',
              }}
            />
          </div>

          <select
            aria-label="Filter by subject"
            value={subjectFilter}
            onChange={(e) => setSubjectFilter(e.target.value)}
            className="h-8 px-2.5 rounded-lg text-[12px]"
            style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-primary)',
            }}
          >
            <option value="all">All Subjects</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>{s.code}</option>
            ))}
          </select>

          <select
            aria-label="Filter by priority"
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value as Priority | 'all')}
            className="h-8 px-2.5 rounded-lg text-[12px]"
            style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-primary)',
            }}
          >
            <option value="all">All Priorities</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          <select
            aria-label="Sort tasks"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'dueDate' | 'priority' | 'title')}
            className="h-8 px-2.5 rounded-lg text-[12px]"
            style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-primary)',
            }}
          >
            <option value="dueDate">Sort: Due Date</option>
            <option value="priority">Sort: Priority</option>
            <option value="title">Sort: Title</option>
          </select>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {selectedIds.length > 0 && (
        <div
          className="rounded-xl px-4 py-2 flex items-center justify-between gap-3 text-[12.5px]"
          style={{ backgroundColor: 'var(--accent-soft)', border: '1px solid var(--accent-border)' }}
        >
          <span className="font-medium text-[var(--text-primary)]">
            {selectedIds.length} task{selectedIds.length > 1 ? 's' : ''} selected
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleBulkComplete}
              className="px-2.5 py-1 rounded-md font-medium text-[12px]"
              style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' }}
            >
              Mark Complete
            </button>
            <button
              type="button"
              onClick={handleBulkDelete}
              className="px-2.5 py-1 rounded-md font-medium text-[12px] text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 inline-flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" /> Delete
            </button>
            <button
              type="button"
              onClick={() => setSelectedIds([])}
              className="text-[12px] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* LIST VIEW */}
      {layout === 'list' && (
        <div className="rounded-xl max-h-[max(12rem,calc(100dvh-16rem))] overflow-y-auto overscroll-contain" style={surfaceStyle}>
          {visibleTasks.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <CheckSquare className="w-7 h-7 mx-auto text-[var(--text-muted)] opacity-50" />
              <div className="text-[13.5px] font-medium text-[var(--text-primary)]">
                No tasks match your current filters
              </div>
              <p className="text-[12px] text-[var(--text-muted)]">
                Clear filters or create a new task to organize your study queue.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[var(--border-subtle)]">
              {visibleTasks.map((task) => {
                const sub = subjects.find((s) => s.id === task.subjectId);
                const doneSub = task.subtasks.filter((st) => st.done).length;
                const isSelected = selectedIds.includes(task.id);
                const isDone = task.status === 'done';

                return (
                  <div
                    key={task.id}
                    className="px-3.5 py-2.5 flex items-center gap-3 hover:bg-[var(--bg-surface-hover)] transition-colors"
                    style={{
                      backgroundColor: isSelected ? 'var(--accent-soft)' : 'transparent',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleBulkSelect(task.id)}
                      aria-label={`Select "${task.title}"`}
                      className="rounded shrink-0"
                    />

                    <button
                      type="button"
                      onClick={() => toggleTaskStatus(task.id)}
                      aria-label={`Toggle completion for "${task.title}"`}
                      className="w-4 h-4 rounded-full flex items-center justify-center shrink-0 transition-colors"
                      style={{
                        border: isDone ? 'none' : '1.5px solid var(--border-strong)',
                        backgroundColor: isDone ? 'var(--accent)' : 'transparent',
                        color: 'var(--accent-fg)',
                      }}
                    >
                      {isDone && <Check className="w-3 h-3" strokeWidth={2.5} />}
                    </button>

                    <button
                      type="button"
                      onClick={() => setDrawerTaskId(task.id)}
                      className="flex-1 min-w-0 text-left flex flex-wrap sm:flex-nowrap items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <div
                          className={`text-[13px] font-medium truncate ${
                            isDone ? 'line-through text-[var(--text-muted)]' : 'text-[var(--text-primary)]'
                          }`}
                        >
                          {task.title}
                        </div>
                        <div className="flex items-center gap-2 text-[11.5px] text-[var(--text-muted)] mt-0.5">
                          <span className="inline-flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: sub?.color }} />
                            {sub?.code}
                          </span>
                          {task.subtasks.length > 0 && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="font-mono-num">
                                {doneSub}/{task.subtasks.length} subtasks
                              </span>
                            </>
                          )}
                          <span aria-hidden="true">·</span>
                          <span className="font-mono-num">{task.estimatedMinutes}m</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 shrink-0 text-[12px]">
                        <span
                          className="font-medium"
                          style={{ color: PRIORITY_STYLE[task.priority].color }}
                        >
                          {PRIORITY_STYLE[task.priority].label}
                        </span>
                        <span className="font-mono-num text-[var(--text-secondary)] w-24 text-right">
                          {task.dueLabel.split(',')[0]}
                        </span>
                      </div>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* KANBAN BOARD VIEW */}
      {layout === 'kanban' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          {COLUMNS.map((col) => {
            const colTasks = visibleTasks.filter((t) => t.status === col.id);
            return (
              <div
                key={col.id}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => {
                  if (draggedTaskId) {
                    updateTask(draggedTaskId, { status: col.id });
                    setDraggedTaskId(null);
                  }
                }}
                className="rounded-xl p-3 flex flex-col gap-2.5 h-[clamp(15rem,calc(100dvh-16rem),48rem)]"
                style={{
                  backgroundColor: 'var(--bg-surface-subtle)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <div className="flex items-center justify-between px-1">
                  <span className="text-[12.5px] font-semibold text-[var(--text-primary)]">
                    {col.label}
                  </span>
                  <span className="font-mono-num text-[11.5px] text-[var(--text-muted)]">
                    {colTasks.length}
                  </span>
                </div>

                <div tabIndex={0} role="region" aria-label={col.label + " tasks"} className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-y-contain pr-1">
                  {colTasks.map((task) => {
                    const sub = subjects.find((s) => s.id === task.subjectId);
                    const doneSub = task.subtasks.filter((st) => st.done).length;
                    return (
                      <div
                        key={task.id}
                        draggable
                        onDragStart={() => setDraggedTaskId(task.id)}
                        onClick={() => setDrawerTaskId(task.id)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') setDrawerTaskId(task.id);
                        }}
                        className="rounded-lg p-3 cursor-pointer hover:border-[var(--border-strong)] transition-colors space-y-2"
                        style={surfaceStyle}
                      >
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="inline-flex items-center gap-1.5 font-medium" style={{ color: sub?.color }}>
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: sub?.color }} />
                            {sub?.code}
                          </span>
                          <span style={{ color: PRIORITY_STYLE[task.priority].color }}>
                            {PRIORITY_STYLE[task.priority].label}
                          </span>
                        </div>
                        <div className="text-[13px] font-medium text-[var(--text-primary)] leading-snug">
                          {task.title}
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)]">
                          <span>{task.dueLabel.split(',')[0]}</span>
                          {task.subtasks.length > 0 && (
                            <span className="font-mono-num">
                              {doneSub}/{task.subtasks.length} steps
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CALENDAR VIEW */}
      {layout === 'calendar' && (
        <div className="rounded-xl p-4" style={surfaceStyle}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {['2026-11-21', '2026-11-22', '2026-11-23', '2026-11-24', '2026-11-25'].map((dayIso) => {
              const dayTasks = visibleTasks.filter((t) => t.dueDate === dayIso);
              const isToday = dayIso === '2026-11-22';
              return (
                <div
                  key={dayIso}
                  className="rounded-lg p-3 flex flex-col gap-2 h-[clamp(12rem,calc(100dvh-17rem),46rem)]"
                  style={{
                    backgroundColor: isToday ? 'var(--accent-soft)' : 'var(--bg-surface-subtle)',
                    border: isToday ? '1px solid var(--accent-border)' : '1px solid var(--border-subtle)',
                  }}
                >
                  <div className="flex items-center justify-between text-[12px] font-semibold">
                    <span className="text-[var(--text-primary)]">
                      {isToday ? 'Today · Nov 22' : dayIso.slice(5)}
                    </span>
                    <span className="font-mono-num text-[11px] text-[var(--text-muted)]">
                      {dayTasks.length}
                    </span>
                  </div>
                  <div tabIndex={0} role="region" aria-label={`Tasks due ${dayIso}`} className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain space-y-2">
                  {dayTasks.length === 0 ? (
                    <div className="text-[11.5px] text-[var(--text-muted)] pt-4">No tasks due</div>
                  ) : (
                    dayTasks.map((t) => {
                      const sub = subjects.find((s) => s.id === t.subjectId);
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setDrawerTaskId(t.id)}
                          className="w-full text-left p-2 rounded-lg text-[12px] space-y-1"
                          style={surfaceStyle}
                        >
                          <div className="text-[10.5px] font-medium" style={{ color: sub?.color }}>
                            {sub?.code}
                          </div>
                          <div className="font-medium text-[var(--text-primary)] line-clamp-2">
                            {t.title}
                          </div>
                        </button>
                      );
                    })
                  )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Task Detail Slide-Over Drawer */}
      {drawerTask && (
        <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label="Task Details">
          <div className="fixed inset-0 bg-black/35" onClick={() => setDrawerTaskId(null)} />
          <div
            className="relative z-10 w-full max-w-md h-full flex flex-col"
            style={{
              backgroundColor: 'var(--bg-elevated)',
              borderLeft: '1px solid var(--border-subtle)',
              boxShadow: 'var(--shadow-floating)',
            }}
          >
            <div
              className="px-5 py-4 flex items-center justify-between"
              style={{ borderBottom: '1px solid var(--border-subtle)' }}
            >
              <span className="text-[13px] font-semibold text-[var(--text-primary)]">
                Task Details
              </span>
              <button
                type="button"
                onClick={() => setDrawerTaskId(null)}
                aria-label="Close task drawer"
                className="p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              <div>
                <h2 className="font-display text-[17px] font-semibold text-[var(--text-primary)]">
                  {drawerTask.title}
                </h2>
                <p className="text-[13px] text-[var(--text-secondary)] mt-1.5 leading-relaxed">
                  {drawerTask.description}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-[12.5px]">
                <div>
                  <label className="block text-[11px] text-[var(--text-muted)] mb-1">Status</label>
                  <select
                    value={drawerTask.status}
                    onChange={(e) => updateTask(drawerTask.id, { status: e.target.value as TaskStatus })}
                    className="w-full px-2.5 py-1.5 rounded-lg"
                    style={{
                      backgroundColor: 'var(--bg-surface-subtle)',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--text-primary)',
                    }}
                  >
                    {COLUMNS.map((c) => (
                      <option key={c.id} value={c.id}>{c.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] text-[var(--text-muted)] mb-1">Priority</label>
                  <select
                    value={drawerTask.priority}
                    onChange={(e) => updateTask(drawerTask.id, { priority: e.target.value as Priority })}
                    className="w-full px-2.5 py-1.5 rounded-lg"
                    style={{
                      backgroundColor: 'var(--bg-surface-subtle)',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--text-primary)',
                    }}
                  >
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-4 text-[12px] text-[var(--text-secondary)]">
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                  Est. {drawerTask.estimatedMinutes} min
                </span>
                <span>Due {drawerTask.dueLabel}</span>
              </div>

              {/* Subtasks */}
              <div className="space-y-2.5 pt-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                <div className="flex items-center justify-between">
                  <h3 className="text-[13px] font-semibold text-[var(--text-primary)]">
                    Subtasks
                  </h3>
                  <span className="font-mono-num text-[11.5px] text-[var(--text-muted)]">
                    {drawerTask.subtasks.filter((s) => s.done).length}/{drawerTask.subtasks.length}
                  </span>
                </div>

                <div className="space-y-1.5">
                  {drawerTask.subtasks.map((st) => (
                    <label
                      key={st.id}
                      className="flex items-center gap-2.5 p-2 rounded-lg cursor-pointer hover:bg-[var(--bg-surface-hover)]"
                      style={{ backgroundColor: 'var(--bg-surface-subtle)' }}
                    >
                      <input
                        type="checkbox"
                        checked={st.done}
                        onChange={() => toggleSubtask(drawerTask.id, st.id)}
                      />
                      <span
                        className={`text-[12.5px] ${
                          st.done ? 'line-through text-[var(--text-muted)]' : 'text-[var(--text-primary)]'
                        }`}
                      >
                        {st.title}
                      </span>
                    </label>
                  ))}
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleAddSubtask(drawerTask);
                  }}
                  className="flex gap-2"
                >
                  <input
                    type="text"
                    value={newSubtaskText}
                    onChange={(e) => setNewSubtaskText(e.target.value)}
                    placeholder="Add a subtask..."
                    className="flex-1 px-3 py-1.5 rounded-lg text-[12.5px]"
                    style={{
                      backgroundColor: 'var(--bg-surface-subtle)',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--text-primary)',
                    }}
                  />
                  <button
                    type="submit"
                    className="px-3 py-1.5 rounded-lg text-[12px] font-medium"
                    style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' }}
                  >
                    Add
                  </button>
                </form>
              </div>
            </div>

            <div className="p-4 flex justify-between" style={{ borderTop: '1px solid var(--border-subtle)' }}>
              <button
                type="button"
                onClick={() => {
                  deleteTasks([drawerTask.id]);
                  setDrawerTaskId(null);
                }}
                className="inline-flex items-center gap-1.5 text-[12.5px] text-rose-600 dark:text-rose-400 hover:underline"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete Task
              </button>
              <button
                type="button"
                onClick={() => setDrawerTaskId(null)}
                className="px-3.5 py-1.5 rounded-lg text-[12.5px] font-medium"
                style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
