import React, { useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import {
  Play,
  Pause,
  SlidersHorizontal,
  ArrowUp,
  ArrowDown,
  Eye,
  EyeOff,
  RotateCcw,
  ArrowRight,
  Sparkles,
  Check,
  Clock,
  Flame,
  Calendar,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { localDay } from '../../assistant/workspaceContext';
import { studyChart } from '../../utils/workspaceMetrics';
import { DASHBOARD_CHART_DATA } from '../../data/mockData';
import {
  calculateStudyAdherence,
  calculateSubjectProgress,
  formatHourLabel,
  formatTimerSeconds,
} from '../../utils/studyLogic';

type RangeKey = 'daily' | 'weekly' | 'monthly';

export const DashboardView: React.FC = () => {
  const {
    preferences,
    legacyCalendar,
    focusHistory,
    subjects,
    tasks,
    sessions,
    exams,
    notes,
    focusTimer,
    toggleFocusRunning,
    setRoute,
    setSelectedSubjectId,
    setSelectedNoteId,
    dashboardWidgets,
    toggleDashboardWidget,
    moveDashboardWidget,
    resetDashboardWidgets,
    toggleTaskStatus,
  } = useApp();

  const [chartRange, setChartRange] = useState<RangeKey>('weekly');
  const [customizeOpen, setCustomizeOpen] = useState(false);

  const chartData = legacyCalendar ? studyChart(chartRange, sessions, focusHistory) : DASHBOARD_CHART_DATA[chartRange];
  const adherence = calculateStudyAdherence(chartData);

  const completedTasks = tasks.filter((t) => t.status === 'done').length;
  const pendingTasks = tasks.length - completedTasks;
  const todaySessions = sessions
    .filter((s) => s.date === (legacyCalendar ? localDay() : '2026-11-22'))
    .sort((a, b) => a.startHour - b.startHour);

  const dailyStudyHours = legacyCalendar ? studyChart('daily', sessions, focusHistory)[0].actual : 3.4;
  const weeklyHours = legacyCalendar ? studyChart('weekly', sessions, focusHistory).reduce((sum, day) => sum + day.actual, 0) : 28.6;
  const dailyGoalPct = Math.min(100, Math.round((dailyStudyHours / preferences.dailyGoalHours) * 100));

  const isVisible = (id: string) => dashboardWidgets.find((w) => w.id === id)?.visible ?? true;
  const widgetOrder = (id: string) => dashboardWidgets.findIndex((w) => w.id === id);

  const surfaceStyle: React.CSSProperties = {
    backgroundColor: 'var(--bg-surface)',
    border: '1px solid var(--border-subtle)',
    boxShadow: 'var(--shadow-subtle)',
  };

  const renderSection = (id: string) => {
    if (!isVisible(id)) return null;

    switch (id) {
      case 'kpi_strip':
        return (
          <section key={id} aria-label="Study metrics summary" className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
            {/* Study Time Today + Goal Ring */}
            <div className="rounded-xl p-4 flex items-center justify-between gap-3" style={surfaceStyle}>
              <div>
                <div className="text-[12px] text-[var(--text-muted)]">Study time today</div>
                <div className="mt-1 flex items-baseline gap-1.5">
                  <span className="font-mono-num text-[22px] font-semibold text-[var(--text-primary)]">
                    {dailyStudyHours.toFixed(1)}h
                  </span>
                  <span className="text-[12px] text-[var(--text-muted)] font-mono-num">
                    / {preferences.dailyGoalHours}h
                  </span>
                </div>
                <div className="mt-1 text-[11.5px] text-[var(--text-secondary)]">
                  {dailyGoalPct}% of daily goal
                </div>
              </div>
              <svg width="46" height="46" viewBox="0 0 46 46" className="shrink-0 -rotate-90" aria-hidden="true">
                <circle cx="23" cy="23" r="18" fill="none" stroke="var(--bg-surface-hover)" strokeWidth="4" />
                <circle
                  cx="23"
                  cy="23"
                  r="18"
                  fill="none"
                  stroke="var(--accent)"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 18}
                  strokeDashoffset={2 * Math.PI * 18 * (1 - dailyGoalPct / 100)}
                />
              </svg>
            </div>

            {/* Weekly Study Hours */}
            <div className="rounded-xl p-4" style={surfaceStyle}>
              <div className="text-[12px] text-[var(--text-muted)]">Weekly study hours</div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="font-mono-num text-[22px] font-semibold text-[var(--text-primary)]">
                  {weeklyHours.toFixed(1)}h
                </span>
                <span className="text-[12px] text-emerald-600 dark:text-emerald-400 font-medium">
                  {legacyCalendar ? `of ${preferences.weeklyGoalHours}h goal` : ' +2.4h vs last wk'}
                </span>
              </div>
              <div className="mt-2 h-1.5 w-full rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-surface-hover)' }}>
                <div className="h-full rounded-full" style={{ width: legacyCalendar ? `${Math.min(100, 100 * weeklyHours / Math.max(1, preferences.weeklyGoalHours))}%` : '89%', backgroundColor: 'var(--accent)' }} />
              </div>
            </div>

            {/* Study Streak */}
            <div className="rounded-xl p-4" style={surfaceStyle}>
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-[var(--text-muted)]">Current study streak</span>
                <Flame className="w-3.5 h-3.5 text-amber-500" />
              </div>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="font-mono-num text-[22px] font-semibold text-[var(--text-primary)]">
                  {legacyCalendar ? '—' : '16 days'}
                </span>
                <span className="text-[12px] text-[var(--text-muted)]">{legacyCalendar ? '—' : 'Best: 21d'}</span>
              </div>
              <div className="mt-1.5 flex items-center gap-1" aria-label="Last 7 days streak">
                {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
                  <span
                    key={`${d}-${i}`}
                    className="w-5 h-5 rounded text-[10px] font-mono-num flex items-center justify-center font-medium"
                    style={{
                      backgroundColor: 'var(--accent-soft)',
                      color: 'var(--accent)',
                    }}
                  >
                    {d}
                  </span>
                ))}
              </div>
            </div>

            {/* Completed & Pending Tasks */}
            <div className="rounded-xl p-4" style={surfaceStyle}>
              <div className="text-[12px] text-[var(--text-muted)]">Tasks status</div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="font-mono-num text-[22px] font-semibold text-[var(--text-primary)]">
                  {completedTasks}
                </span>
                <span className="text-[12.5px] text-[var(--text-secondary)]">
                  completed · <span className="font-mono-num">{pendingTasks}</span> pending
                </span>
              </div>
              <button
                type="button"
                onClick={() => setRoute('tasks')}
                className="mt-1.5 inline-flex items-center gap-1 text-[12px] font-medium hover:underline"
                style={{ color: 'var(--accent)' }}
              >
                Open task queue <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </section>
        );

      case 'planned_actual_chart':
        return (
          <section key={id} className="rounded-xl p-4" style={surfaceStyle}>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="font-display text-[15px] font-semibold text-[var(--text-primary)]">
                  Planned vs Actual Study Time
                </h2>
                <div className="flex flex-wrap items-center gap-2 text-[12px] text-[var(--text-muted)] mt-0.5">
                  <span className="font-mono-num">{adherence.totalActual}h actual</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono-num">{adherence.totalPlanned}h planned</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-medium text-[var(--text-primary)] font-mono-num">
                    {adherence.adherencePercent}% adherence
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {/* Inline Legend */}
                <div className="hidden sm:flex items-center gap-3 text-[12px] text-[var(--text-secondary)]">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-0.5 rounded-full" style={{ backgroundColor: 'var(--chart-planned)' }} />
                    Planned
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-0.5 rounded-full" style={{ backgroundColor: 'var(--accent)' }} />
                    Actual
                  </span>
                </div>

                {/* Daily / Weekly / Monthly segmented filter */}
                <div
                  className="inline-flex items-center p-0.5 rounded-lg text-[12px]"
                  style={{ backgroundColor: 'var(--bg-surface-subtle)', border: '1px solid var(--border-subtle)' }}
                  role="tablist"
                  aria-label="Study time chart range"
                >
                  {(['daily', 'weekly', 'monthly'] as RangeKey[]).map((key) => (
                    <button
                      key={key}
                      type="button"
                      role="tab"
                      aria-selected={chartRange === key}
                      onClick={() => setChartRange(key)}
                      className="px-2.5 py-1 rounded-md capitalize font-medium transition-colors whitespace-nowrap"
                      style={{
                        backgroundColor: chartRange === key ? 'var(--bg-surface)' : 'transparent',
                        color: chartRange === key ? 'var(--text-primary)' : 'var(--text-muted)',
                        boxShadow: chartRange === key ? 'var(--shadow-subtle)' : 'none',
                      }}
                    >
                      {key}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
                  <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="label"
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
                      boxShadow: 'var(--shadow-floating)',
                    }}
                    labelStyle={{ color: 'var(--text-primary)', fontWeight: 600, marginBottom: 4 }}
                    formatter={(value, name) => [
                      `${value ?? 0} hrs`,
                      name === 'planned' ? 'Planned' : 'Actual',
                    ]}
                  />
                  <Line
                    type="monotone"
                    dataKey="planned"
                    stroke="var(--chart-planned)"
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    dot={{ r: 3, fill: 'var(--chart-planned)', strokeWidth: 0 }}
                    activeDot={{ r: 5 }}
                    isAnimationActive={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="actual"
                    stroke="var(--accent)"
                    strokeWidth={2.5}
                    dot={{ r: 3.5, fill: 'var(--accent)', strokeWidth: 0 }}
                    activeDot={{ r: 5.5 }}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>
        );

      case 'today_schedule':
        return (
          <section key={id} className="rounded-xl p-4" style={surfaceStyle}>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="font-display text-[14.5px] font-semibold text-[var(--text-primary)]">
                  Today&apos;s Study Schedule
                </h2>
                <p className="text-[12px] text-[var(--text-muted)]">
                  {legacyCalendar ? new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' }) : 'Sunday, Nov 22'} · {todaySessions.length} blocks scheduled
                </p>
              </div>
              <button
                type="button"
                onClick={() => setRoute('planner')}
                className="text-[12px] font-medium hover:underline whitespace-nowrap"
                style={{ color: 'var(--accent)' }}
              >
                Full planner
              </button>
            </div>

            <div className="divide-y divide-[var(--border-subtle)]">
              {todaySessions.map((ses) => {
                const sub = subjects.find((s) => s.id === ses.subjectId);
                return (
                  <div key={ses.id} className="py-2.5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="font-mono-num text-[12px] text-[var(--text-muted)] w-16 shrink-0">
                        {formatHourLabel(ses.startHour)}
                      </span>
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: sub?.color ?? 'var(--accent)' }}
                      />
                      <div className="min-w-0">
                        <div className="text-[13px] font-medium text-[var(--text-primary)] truncate">
                          {ses.title}
                        </div>
                        <div className="text-[11.5px] text-[var(--text-muted)] truncate">
                          {sub?.code} · {ses.durationHours}h · {ses.location ?? 'Workspace'}
                        </div>
                      </div>
                    </div>
                    <span
                      className={`text-[11.5px] font-medium shrink-0 ${
                        ses.status === 'completed'
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-[var(--text-muted)]'
                      }`}
                    >
                      {ses.status === 'completed' ? 'Completed' : 'Upcoming'}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        );

      case 'quick_focus': {
        const sub = subjects.find((s) => s.id === focusTimer.subjectId);
        const timeStr =
          focusTimer.mode === 'Stopwatch'
            ? formatTimerSeconds(focusTimer.elapsedSeconds)
            : formatTimerSeconds(focusTimer.secondsLeft);

        return (
          <section key={id} className="rounded-xl p-4 flex flex-col justify-between" style={surfaceStyle}>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-[14.5px] font-semibold text-[var(--text-primary)]">
                  Quick-Start Focus
                </h2>
                <p className="text-[12px] text-[var(--text-muted)] truncate max-w-[220px]">
                  {sub?.code} · {focusTimer.mode}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setRoute('focus')}
                className="text-[12px] font-medium hover:underline"
                style={{ color: 'var(--accent)' }}
              >
                Open timer
              </button>
            </div>

            <div className="my-4 flex items-center justify-between gap-4">
              <div>
                <div className="font-mono-num text-[32px] font-semibold tracking-tight text-[var(--text-primary)] leading-none">
                  {timeStr}
                </div>
                <div className="text-[12px] text-[var(--text-secondary)] mt-1.5 truncate max-w-[230px]">
                  {focusTimer.taskTitle}
                </div>
              </div>
              <button
                type="button"
                onClick={toggleFocusRunning}
                aria-label={focusTimer.running ? 'Pause quick focus timer' : 'Start quick focus timer'}
                className="h-10 px-4 rounded-xl inline-flex items-center gap-2 text-[13px] font-medium shrink-0 transition-opacity hover:opacity-90"
                style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' }}
              >
                {focusTimer.running ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                {focusTimer.running ? 'Pause' : 'Start'}
              </button>
            </div>

            <div className="pt-2.5 flex items-center justify-between text-[11.5px] text-[var(--text-muted)]" style={{ borderTop: '1px solid var(--border-subtle)' }}>
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" /> Cycle {focusTimer.cycleCount} of 4
              </span>
              <span>Next: 5m break</span>
            </div>
          </section>
        );
      }

      case 'subject_progress':
        return (
          <section key={id} className="rounded-xl p-4" style={surfaceStyle}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display text-[14.5px] font-semibold text-[var(--text-primary)]">
                Subject Progress
              </h2>
              <button
                type="button"
                onClick={() => setRoute('subjects')}
                className="text-[12px] font-medium hover:underline"
                style={{ color: 'var(--accent)' }}
              >
                All subjects
              </button>
            </div>
            <div className="space-y-3">
              {subjects.map((sub) => {
                const prog = calculateSubjectProgress(sub.chapters);
                return (
                  <button
                    key={sub.id}
                    type="button"
                    onClick={() => {
                      setSelectedSubjectId(sub.id);
                      setRoute('subjects');
                    }}
                    className="w-full text-left group"
                  >
                    <div className="flex items-center justify-between text-[12.5px] mb-1">
                      <span className="flex items-center gap-2 min-w-0">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: sub.color }} />
                        <span className="font-medium text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors truncate">
                          {sub.code} · {sub.name}
                        </span>
                      </span>
                      <span className="font-mono-num text-[12px] text-[var(--text-secondary)] shrink-0 ml-2">
                        {prog.percent}%
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-surface-hover)' }}>
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{ width: `${prog.percent}%`, backgroundColor: sub.color }}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        );

      case 'upcoming_exams':
        return (
          <section key={id} className="rounded-xl p-4" style={surfaceStyle}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display text-[14.5px] font-semibold text-[var(--text-primary)]">
                Upcoming Exams
              </h2>
              <button
                type="button"
                onClick={() => setRoute('exams')}
                className="text-[12px] font-medium hover:underline"
                style={{ color: 'var(--accent)' }}
              >
                Exam prep
              </button>
            </div>
            <div className="divide-y divide-[var(--border-subtle)]">
              {exams.slice(0, 3).map((ex) => {
                const sub = subjects.find((s) => s.id === ex.subjectId);
                const daysAway = Math.max(
                  1,
                  Math.round((new Date(ex.date).getTime() - new Date('2026-11-22').getTime()) / 86400000)
                );
                return (
                  <div key={ex.id} className="py-2.5 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-[13px] font-medium text-[var(--text-primary)] truncate">
                        {ex.title}
                      </div>
                      <div className="text-[11.5px] text-[var(--text-muted)]">
                        {sub?.code} · {ex.date} · {ex.prepProgress}% ready
                      </div>
                    </div>
                    <span className="font-mono-num text-[12px] font-semibold shrink-0 text-amber-600 dark:text-amber-400">
                      {daysAway}d
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        );

      case 'recent_notes':
        return (
          <section key={id} className="rounded-xl p-4" style={surfaceStyle}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display text-[14.5px] font-semibold text-[var(--text-primary)]">
                Recent Notes & Tasks Due
              </h2>
              <button
                type="button"
                onClick={() => setRoute('notes')}
                className="text-[12px] font-medium hover:underline"
                style={{ color: 'var(--accent)' }}
              >
                Open notes
              </button>
            </div>
            <div className="space-y-2">
              {notes.slice(0, 2).map((n) => {
                const sub = subjects.find((s) => s.id === n.subjectId);
                return (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => {
                      setSelectedNoteId(n.id);
                      setRoute('notes');
                    }}
                    className="w-full text-left p-2.5 rounded-lg hover:bg-[var(--bg-surface-hover)] transition-colors"
                    style={{ backgroundColor: 'var(--bg-surface-subtle)' }}
                  >
                    <div className="text-[13px] font-medium text-[var(--text-primary)] truncate">
                      {n.title}
                    </div>
                    <div className="text-[11.5px] text-[var(--text-muted)] mt-0.5">
                      {sub?.code} · Updated {n.updatedAt}
                    </div>
                  </button>
                );
              })}

              {/* Quick pending tasks checklist */}
              <div className="pt-2" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                {tasks.filter((t) => t.status !== 'done').slice(0, 2).map((t) => (
                  <div key={t.id} className="py-1.5 flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => toggleTaskStatus(t.id)}
                      aria-label={`Mark "${t.title}" done`}
                      className="w-4 h-4 rounded flex items-center justify-center shrink-0 transition-colors"
                      style={{
                        border: '1.5px solid var(--border-strong)',
                        backgroundColor: 'transparent',
                      }}
                    >
                      {t.status === 'done' && <Check className="w-3 h-3" />}
                    </button>
                    <span className="text-[12.5px] text-[var(--text-primary)] truncate flex-1">
                      {t.title}
                    </span>
                    <span className="text-[11px] text-[var(--text-muted)] shrink-0">
                      {t.dueLabel.split(',')[0]}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        );

      case 'ai_insight':
        return (
          <section
            key={id}
            className="rounded-xl p-4 flex flex-col justify-between"
            style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--accent-border)',
              boxShadow: 'var(--shadow-subtle)',
            }}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold" style={{ color: 'var(--accent)' }}>
                  <Sparkles className="w-3.5 h-3.5" />
                  StudyFlow Productivity Insight
                </span>
                <span className="text-[11px] text-[var(--text-muted)]">{legacyCalendar ? 'Study history' : 'Based on 14-day log'}</span>
              </div>
              <p className="text-[13px] text-[var(--text-primary)] leading-relaxed">
                {legacyCalendar ? `You have ${focusHistory.length} completed focus sessions in this workspace.` : <>Your morning deep-work blocks between <span className="font-mono-num font-medium">9:00–11:30 AM</span> average{' '}
                <span className="font-mono-num font-semibold">93%</span> focus quality — 14% higher than late afternoon sessions.</>}
              </p>
              <p className="text-[12.5px] text-[var(--text-secondary)] mt-2">
                {legacyCalendar ? 'Open Analytics to review your study time.' : 'Recommendation: Shift CHEM 210 carbonyl mechanism drills into tomorrow morning’s open 9:30 AM slot before Midterm III prep peaks.'}
              </p>
            </div>
            <div className="mt-3.5 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setRoute('assistant')}
                className="inline-flex items-center gap-1.5 text-[12.5px] font-medium hover:underline"
                style={{ color: 'var(--accent)' }}
              >
                Ask AI Assistant to rebalance week <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </section>
        );

      default:
        return null;
    }
  };

  // Separate top-level full-width widgets vs 2-column grid widgets while preserving user order
  const orderedIds = dashboardWidgets.map((w) => w.id);
  const fullWidthIds = new Set(['kpi_strip', 'planned_actual_chart']);

  return (
    <div className="space-y-4 pb-6">
      {/* Greeting Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-[12px] text-[var(--text-muted)]">
            <Calendar className="w-3.5 h-3.5" />
            <span>Sunday, November 22, 2026 · Week 12 of Fall Term</span>
          </div>
          <h1 className="font-display text-[22px] font-semibold tracking-tight text-[var(--text-primary)] mt-0.5">
            Good morning, {preferences.name.split(' ')[0]}
          </h1>
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => setCustomizeOpen((o) => !o)}
            aria-expanded={customizeOpen}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[12.5px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] transition-colors"
            style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Customize Dashboard
          </button>

          {customizeOpen && (
            <div
              className="absolute right-0 mt-2 w-80 rounded-xl p-3.5 z-30 space-y-2.5"
              style={{
                backgroundColor: 'var(--bg-elevated)',
                border: '1px solid var(--border-subtle)',
                boxShadow: 'var(--shadow-floating)',
              }}
            >
              <div className="flex items-center justify-between pb-2" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <span className="text-[12.5px] font-semibold text-[var(--text-primary)]">
                  Arrange & Toggle Widgets
                </span>
                <button
                  type="button"
                  onClick={resetDashboardWidgets}
                  className="inline-flex items-center gap-1 text-[11.5px] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                >
                  <RotateCcw className="w-3 h-3" /> Reset
                </button>
              </div>
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {dashboardWidgets.map((w, idx) => (
                  <div
                    key={w.id}
                    className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg"
                    style={{ backgroundColor: 'var(--bg-surface-subtle)' }}
                  >
                    <span className="text-[12.5px] text-[var(--text-primary)] truncate">
                      {w.label}
                    </span>
                    <div className="flex items-center gap-0.5 shrink-0">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => moveDashboardWidget(w.id, 'up')}
                        aria-label={`Move ${w.label} up`}
                        className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] disabled:opacity-30"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={idx === dashboardWidgets.length - 1}
                        onClick={() => moveDashboardWidget(w.id, 'down')}
                        aria-label={`Move ${w.label} down`}
                        className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] disabled:opacity-30"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleDashboardWidget(w.id)}
                        aria-label={w.visible ? `Hide ${w.label}` : `Show ${w.label}`}
                        className="p-1 rounded text-[var(--text-secondary)] hover:text-[var(--accent)]"
                      >
                        {w.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5 opacity-50" />}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Render full-width sections and paired grid sections cleanly following user widget order */}
      <div className="space-y-4">
        {orderedIds
          .filter((id) => fullWidthIds.has(id))
          .sort((a, b) => widgetOrder(a) - widgetOrder(b))
          .map((id) => renderSection(id))}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {orderedIds
            .filter((id) => !fullWidthIds.has(id))
            .sort((a, b) => widgetOrder(a) - widgetOrder(b))
            .map((id) => renderSection(id))}
        </div>
      </div>
    </div>
  );
};
