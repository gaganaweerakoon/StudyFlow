import { studyChart } from '../../utils/workspaceMetrics';
import React from 'react';
import {
  LayoutDashboard,
  CalendarDays,
  Timer,
  CheckSquare,
  Target,
  BookOpen,
  FileText,
  Layers,
  ClipboardCheck,
  GraduationCap,
  BarChart3,
  Bot,
  Award,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
  X,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { NavRoute } from '../../types/studyflow';

interface NavItemDef {
  id: NavRoute;
  label: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  count?: number;
}

export const Sidebar: React.FC = () => {
  const {
    route,
    setRoute,
    setSelectedSubjectId,
    sidebarCollapsed,
    setSidebarCollapsed,
    mobileNavOpen,
    setMobileNavOpen,
    tasks,
    flashcards,
    focusTimer,
    legacyCalendar,
    focusHistory,
    sessions,
    preferences,
  } = useApp();

  const weeklyHours = legacyCalendar ? studyChart('weekly', sessions, focusHistory).reduce((sum, day) => sum + day.actual, 0) : 28.6;
  const pendingTasksCount = tasks.filter((t) => t.status !== 'done').length;
  const dueCardsCount = flashcards.filter((c) => c.dueToday).length;

  const groups: { title: string; items: NavItemDef[] }[] = [
    {
      title: 'Workspace',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'planner', label: 'Study Planner', icon: CalendarDays },
        { id: 'focus', label: 'Focus Timer', icon: Timer },
        { id: 'tasks', label: 'Tasks', icon: CheckSquare, count: pendingTasksCount },
        { id: 'goals', label: 'Goals', icon: Target },
      ],
    },
    {
      title: 'Learning',
      items: [
        { id: 'subjects', label: 'Subjects', icon: BookOpen },
        { id: 'notes', label: 'Notes', icon: FileText },
        { id: 'flashcards', label: 'Flashcards', icon: Layers, count: dueCardsCount },
        { id: 'practice', label: 'Practice Tests', icon: ClipboardCheck },
        { id: 'exams', label: 'Exams', icon: GraduationCap },
      ],
    },
    {
      title: 'Intelligence',
      items: [
        { id: 'analytics', label: 'Analytics', icon: BarChart3 },
        { id: 'assistant', label: 'AI Assistant', icon: Bot },
      ],
    },
    {
      title: 'Personal',
      items: [
        { id: 'achievements', label: 'Achievements', icon: Award },
        { id: 'settings', label: 'Settings', icon: Settings },
      ],
    },
  ];

  const handleNavigate = (id: NavRoute) => {
    setRoute(id);
    if (id !== 'subjects') {
      setSelectedSubjectId(null);
    }
    setMobileNavOpen(false);
  };

  const renderSidebarInner = (isMobile = false) => {
    const compact = !isMobile && sidebarCollapsed;

    return (
      <div
        className="flex flex-col h-full select-none"
        style={{
          backgroundColor: 'var(--bg-sidebar)',
          borderRight: '1px solid var(--border-subtle)',
        }}
      >
        {/* Brand header */}
        <div
          className={`flex items-center h-13 shrink-0 px-3 ${compact ? 'justify-center' : 'justify-between'}`}
          style={{ borderBottom: '1px solid var(--border-subtle)' }}
        >
          {!compact && (
            <button
              type="button"
              onClick={() => handleNavigate('dashboard')}
              className="flex items-center gap-2.5 px-1.5 py-1 rounded-lg hover:bg-[var(--bg-surface-hover)] transition-colors whitespace-nowrap shrink-0"
            >
              <span
                className="w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold font-display"
                style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' }}
              >
                S
              </span>
              <span className="font-display font-semibold text-[15px] tracking-tight text-[var(--text-primary)]">
                StudyFlow
              </span>
            </button>
          )}

          {isMobile ? (
            <button
              type="button"
              onClick={() => setMobileNavOpen(false)}
              aria-label="Close navigation menu"
              className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)]"
            >
              <X className="w-4 h-4" strokeWidth={1.75} />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setSidebarCollapsed((c) => !c)}
              aria-label={compact ? 'Expand sidebar' : 'Collapse sidebar'}
              title={compact ? 'Expand sidebar' : 'Collapse sidebar'}
              className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] transition-colors"
            >
              {compact ? (
                <PanelLeftOpen className="w-4 h-4" strokeWidth={1.75} />
              ) : (
                <PanelLeftClose className="w-4 h-4" strokeWidth={1.75} />
              )}
            </button>
          )}
        </div>

        {/* Navigation groups */}
        <nav
          aria-label="Primary navigation"
          className="flex-1 overflow-y-auto py-3 px-2 space-y-4"
        >
          {groups.map((group) => (
            <div key={group.title}>
              {!compact ? (
                <div className="px-2.5 mb-1.5 text-[11px] font-medium text-[var(--text-muted)] tracking-tight">
                  {group.title}
                </div>
              ) : (
                <div
                  className="mx-2 my-2 h-px"
                  style={{ backgroundColor: 'var(--border-subtle)' }}
                  aria-hidden="true"
                />
              )}
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = route === item.id;
                  const showTimerRunning = item.id === 'focus' && focusTimer.running;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleNavigate(item.id)}
                      aria-label={compact ? item.label : undefined}
                      aria-current={active ? 'page' : undefined}
                      title={compact ? item.label : undefined}
                      className={`group relative w-full flex items-center rounded-lg text-[13px] font-medium transition-colors duration-150 ${
                        compact ? 'justify-center px-0 py-2' : 'justify-between px-2.5 py-1.5'
                      }`}
                      style={{
                        backgroundColor: active ? 'var(--accent-soft)' : 'transparent',
                        color: active ? 'var(--accent)' : 'var(--text-secondary)',
                      }}
                    >
                      <span className="flex items-center gap-2.5 min-w-0">
                        <Icon
                          className={`w-4 h-4 shrink-0 transition-colors ${
                            active ? '' : 'text-[var(--text-muted)] group-hover:text-[var(--text-primary)]'
                          }`}
                          strokeWidth={active ? 2 : 1.75}
                        />
                        {!compact && (
                          <span
                            className={`truncate ${
                              active ? 'font-semibold' : 'group-hover:text-[var(--text-primary)]'
                            }`}
                          >
                            {item.label}
                          </span>
                        )}
                      </span>

                      {!compact && showTimerRunning && (
                        <span className="text-[11px] font-mono-num text-[var(--accent)]">
                          Active
                        </span>
                      )}

                      {!compact && !showTimerRunning && item.count !== undefined && item.count > 0 && (
                        <span className="text-[11px] font-mono-num text-[var(--text-muted)]">
                          {item.count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Bottom Semester Summary Footer (quiet, functional, no telemetry) */}
        {!compact && (
          <div
            className="p-3 shrink-0"
            style={{ borderTop: '1px solid var(--border-subtle)' }}
          >
            <div className="flex items-center justify-between text-[12px] mb-1.5">
              <span className="font-medium text-[var(--text-primary)]">{legacyCalendar ? 'Weekly study goal' : 'Fall Term 2026'}</span>
              <span className="font-mono-num text-[var(--text-muted)]">{legacyCalendar ? '' : 'Wk 12/15'}</span>
            </div>
            <div
              className="h-1.5 w-full rounded-full overflow-hidden"
              style={{ backgroundColor: 'var(--bg-surface-hover)' }}
            >
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{ width: legacyCalendar ? `${Math.min(100, weeklyHours / Math.max(1, preferences.weeklyGoalHours) * 100)}%` : '80%', backgroundColor: 'var(--accent)' }}
              />
            </div>
            <div className="mt-1.5 text-[11px] text-[var(--text-muted)]">
              {weeklyHours.toFixed(1)} / {(legacyCalendar ? preferences.weeklyGoalHours : 32).toFixed(1)} hrs this week
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className="hidden lg:block shrink-0 h-full transition-all duration-200"
        style={{ width: sidebarCollapsed ? 60 : 232 }}
      >
        {renderSidebarInner(false)}
      </aside>

      {/* Mobile slide-over sidebar */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-[1px]"
            onClick={() => setMobileNavOpen(false)}
            aria-hidden="true"
          />
          <aside className="relative z-10 w-64 max-w-[80vw] h-full">
            {renderSidebarInner(true)}
          </aside>
        </div>
      )}
    </>
  );
};
