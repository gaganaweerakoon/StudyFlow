import React, { useMemo } from 'react';
import {
  ArrowRight,
  CalendarPlus,
  Loader2,
  RefreshCw,
  Sparkles,
  Target,
  Clock,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useAssistant } from '../../assistant/AssistantContext';
import { computeWorkspaceDiagnostics } from '../../assistant/workspaceDiagnostics';
import { requestClock } from '../../assistant/workspaceContext';
import type { DashboardAdviceItem } from '../../assistant/protocol';

export const DashboardAiOverviewCard: React.FC = () => {
  const {
    subjects,
    tasks,
    sessions,
    exams,
    goals,
    notes,
    decks,
    flashcards,
    quizzes,
    focusHistory,
    preferences,
    setRoute,
    setFocusMode,
    setFocusContext,
    applyPhoneFocusAction,
  } = useApp();

  const {
    dashboardOverview,
    dashboardOverviewLoading,
    dashboardOverviewError,
    refreshDashboardOverview,
    askPip,
    settings,
  } = useAssistant();

  const diagnostics = useMemo(() => {
    const clock = requestClock(settings.timezone);
    const [h, m] = clock.time.split(':').map(Number);
    const currentHour = (Number.isFinite(h) ? h : 9) + (Number.isFinite(m) ? m : 0) / 60;
    return computeWorkspaceDiagnostics(
      {
        subjects,
        tasks,
        sessions,
        exams,
        goals,
        notes,
        decks,
        flashcards,
        quizzes,
        focusHistory,
        dailyGoalHours: preferences.dailyGoalHours,
        weeklyGoalHours: preferences.weeklyGoalHours,
      },
      clock.date,
      currentHour,
    );
  }, [
    subjects,
    tasks,
    sessions,
    exams,
    goals,
    notes,
    decks,
    flashcards,
    quizzes,
    focusHistory,
    preferences.dailyGoalHours,
    preferences.weeklyGoalHours,
    settings.timezone,
  ]);

  const executeAdviceAction = (item: DashboardAdviceItem) => {
    switch (item.actionType) {
      case 'open_planner':
        setRoute('planner');
        break;
      case 'open_flashcards':
        setRoute('flashcards');
        break;
      case 'open_practice':
        setRoute('practice');
        break;
      case 'open_tasks':
        setRoute('tasks');
        break;
      case 'open_notes':
        setRoute('notes');
        break;
      case 'start_focus': {
        const topTask = diagnostics.overdueTasks[0] ?? diagnostics.highPriorityTasks[0];
        setFocusMode('Pomodoro');
        if (topTask) setFocusContext('', topTask.title);
        applyPhoneFocusAction({ action: 'start' });
        setRoute('focus');
        break;
      }
      case 'ask_pip':
      default:
        askPip(
          item.prompt ||
            `Help me act on this study recommendation: ${item.title}. ${item.detail}`,
          { openFloating: true },
        );
        break;
    }
  };

  const generatedLabel = dashboardOverview?.generatedAt
    ? new Date(dashboardOverview.generatedAt).toLocaleTimeString([], {
        hour: 'numeric',
        minute: '2-digit',
      })
    : null;

  return (
    <section
      className="rounded-xl p-4 self-start space-y-3.5"
      style={{
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--accent-border)',
        boxShadow: 'var(--shadow-subtle)',
      }}
      aria-label="Pip AI Study Overview"
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Sparkles className="w-4 h-4 shrink-0" style={{ color: 'var(--accent)' }} />
          <h2 className="font-display text-[14.5px] font-semibold text-[var(--text-primary)] truncate">
            Pip AI Study Overview
          </h2>
        </div>

        <button
          type="button"
          onClick={() => void refreshDashboardOverview()}
          disabled={dashboardOverviewLoading}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12px] font-medium whitespace-nowrap transition-colors disabled:opacity-50"
          style={{
            backgroundColor: dashboardOverview ? 'var(--bg-surface-subtle)' : 'var(--accent)',
            color: dashboardOverview ? 'var(--text-primary)' : 'var(--accent-fg)',
            border: dashboardOverview ? '1px solid var(--border-subtle)' : '1px solid transparent',
          }}
        >
          {dashboardOverviewLoading ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Analyzing…
            </>
          ) : (
            <>
              <RefreshCw className="w-3.5 h-3.5" />
              {dashboardOverview ? 'Refresh AI Overview' : 'Analyze with Pip'}
            </>
          )}
        </button>
      </div>

      {/* Live Workspace Signals (real data, plain typographic metadata) */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-[var(--text-muted)] font-mono-num">
        <span>
          <strong className="text-[var(--text-primary)] font-semibold">{diagnostics.todayPlannedHours}h</strong> planned today
        </span>
        <span aria-hidden="true">·</span>
        <span>
          <strong className="text-[var(--text-primary)] font-semibold">{diagnostics.openTasksCount}</strong> open tasks
          {diagnostics.overdueTasks.length > 0 && (
            <span className="text-rose-500 font-semibold"> ({diagnostics.overdueTasks.length} overdue)</span>
          )}
        </span>
        <span aria-hidden="true">·</span>
        <span>
          <strong className="text-[var(--text-primary)] font-semibold">{diagnostics.dueFlashcardsCount}</strong> cards due
        </span>
        {diagnostics.upcomingExams[0] && (
          <>
            <span aria-hidden="true">·</span>
            <span>
              Next exam in <strong className="text-[var(--text-primary)] font-semibold">{diagnostics.upcomingExams[0].daysUntil}d</strong>
            </span>
          </>
        )}
      </div>

      {dashboardOverviewError && (
        <div
          role="alert"
          className="rounded-lg px-3 py-2 text-[12px] text-rose-600 dark:text-rose-400"
          style={{
            backgroundColor: 'var(--bg-surface-subtle)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          {dashboardOverviewError}
        </div>
      )}

      {/* Main Content: Live Gemini Overview OR Instant Grounded Summary */}
      {dashboardOverview ? (
        <div className="space-y-3">
          <div>
            <div className="flex items-baseline justify-between gap-2">
              <h3 className="text-[13.5px] font-semibold text-[var(--text-primary)]">
                {dashboardOverview.headline}
              </h3>
              {generatedLabel && (
                <span className="text-[11px] text-[var(--text-muted)] shrink-0 font-mono-num">
                  Updated {generatedLabel}
                </span>
              )}
            </div>
            <p className="text-[12.5px] text-[var(--text-secondary)] leading-relaxed mt-1">
              {dashboardOverview.summary}
            </p>
          </div>

          <div
            className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 rounded-lg p-3"
            style={{
              backgroundColor: 'var(--bg-surface-subtle)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wide">
                <Target className="w-3 h-3" style={{ color: 'var(--accent)' }} />
                Top Focus Priority
              </div>
              <p className="text-[12.5px] font-medium text-[var(--text-primary)] leading-snug">
                {dashboardOverview.focusPriority}
              </p>
            </div>
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wide">
                <Clock className="w-3 h-3" style={{ color: 'var(--accent)' }} />
                Schedule Advice
              </div>
              <p className="text-[12.5px] text-[var(--text-secondary)] leading-snug">
                {dashboardOverview.scheduleTip}
              </p>
            </div>
          </div>

          {dashboardOverview.advice.length > 0 && (
            <div className="divide-y divide-[var(--border-subtle)] border-t border-[var(--border-subtle)]">
              {dashboardOverview.advice.map((item, idx) => (
                <div key={idx} className="py-2.5 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[12.5px] font-medium text-[var(--text-primary)]">
                      {item.title}
                    </div>
                    {item.detail && (
                      <p className="text-[12px] text-[var(--text-secondary)] mt-0.5 leading-snug">
                        {item.detail}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => executeAdviceAction(item)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11.5px] font-medium whitespace-nowrap shrink-0 transition-colors hover:bg-[var(--bg-surface-hover)]"
                    style={{
                      color: 'var(--accent)',
                      backgroundColor: 'var(--accent-soft)',
                    }}
                  >
                    {item.actionLabel}
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-2.5">
          <p className="text-[13px] text-[var(--text-primary)] leading-relaxed">
            {diagnostics.instantSummary}
          </p>
          <p className="text-[12.5px] text-[var(--text-secondary)] leading-relaxed">
            <strong className="font-semibold text-[var(--text-primary)]">Next move:</strong>{' '}
            {diagnostics.instantRecommendation}
          </p>
          {diagnostics.openSlotsToday.length > 0 && (
            <div className="text-[12px] text-[var(--text-muted)]">
              Open today:{' '}
              <span className="font-mono-num text-[var(--text-secondary)]">
                {diagnostics.openSlotsToday.map((s) => s.label).join(' · ')}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Quick Action Bar */}
      <div
        className="pt-3 flex flex-wrap items-center gap-2.5"
        style={{ borderTop: '1px solid var(--border-subtle)' }}
      >
        <button
          type="button"
          onClick={() =>
            askPip(
              'Analyze my workload, upcoming exams, overdue tasks, and open calendar slots today, then give me a prioritized study plan and schedule my top priority session.',
              { openFullPage: true },
            )
          }
          className="inline-flex items-center gap-1.5 text-[12px] font-medium whitespace-nowrap hover:underline"
          style={{ color: 'var(--accent)' }}
        >
          Ask Pip to rebalance week <ArrowRight className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={() =>
            askPip(
              diagnostics.openSlotsToday[0]
                ? `Schedule a 1-hour study session for my highest priority subject during my open ${diagnostics.openSlotsToday[0].label} slot today.`
                : 'Schedule a 1-hour study session for my highest priority subject today.',
              { openFloating: true },
            )
          }
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11.5px] font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)] whitespace-nowrap"
          style={{ border: '1px solid var(--border-subtle)' }}
        >
          <CalendarPlus className="w-3.5 h-3.5" />
          Schedule Slot
        </button>
      </div>
    </section>
  );
};
