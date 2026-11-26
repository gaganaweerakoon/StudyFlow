import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { Search, ArrowUpRight, Sparkles } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import {
  ANALYTICS_PRODUCTIVITY_TREND,
  ANALYTICS_FOCUS_DURATION,
  ANALYTICS_GOAL_COMPARISON,
  ANALYTICS_TASK_TRENDS,
  ANALYTICS_RETENTION_CURVE,
  ANALYTICS_EXAM_PROGRESSION,
  ANALYTICS_SESSIONS_TABLE,
  CONSISTENCY_HEATMAP,
  PEAK_HOURS_HEATMAP,
} from '../../data/mockData';

import { studyChart } from '../../utils/workspaceMetrics';
import { analyzeSrsRetention, buildForgettingCurveSeries } from '../../utils/srsIntelligence';
import { localDay } from '../../assistant/workspaceContext';

const TIME_SLOTS = ['8a', '10a', '12p', '2p', '4p', '6p', '8p', '10p'];

export const AnalyticsView: React.FC = () => {
  const { subjects, sessions, focusHistory, legacyCalendar, decks, flashcards, exams, setRoute } = useApp();
  const [dateRange, setDateRange] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [subjectFilter, setSubjectFilter] = useState<string>('all');
  const [tableSearch, setTableSearch] = useState('');

  const todayIso = localDay(new Date());
  const filteredDecks = useMemo(
    () => (subjectFilter === 'all' ? decks : decks.filter((d) => d.subjectId === subjectFilter)),
    [decks, subjectFilter],
  );
  const filteredDeckIds = useMemo(() => new Set(filteredDecks.map((d) => d.id)), [filteredDecks]);
  const filteredCards = useMemo(
    () => flashcards.filter((c) => filteredDeckIds.has(c.deckId)),
    [flashcards, filteredDeckIds],
  );
  const srsSummary = useMemo(
    () => analyzeSrsRetention(filteredDecks, filteredCards, exams, subjects, todayIso),
    [filteredDecks, filteredCards, exams, subjects, todayIso],
  );
  const srsCurveData = useMemo(
    () => buildForgettingCurveSeries(filteredCards, exams, todayIso, 14),
    [filteredCards, exams, todayIso],
  );

  const surfaceStyle: React.CSSProperties = {
    backgroundColor: 'var(--bg-surface)',
    border: '1px solid var(--border-subtle)',
  };

  const tooltipStyle: React.CSSProperties = {
    backgroundColor: 'var(--bg-elevated)',
    border: '1px solid var(--border-subtle)',
    borderRadius: 10,
    fontSize: 12,
  };

  const subjectDonutData = useMemo(
    () =>
      subjects.map((s) => {
        const loggedHours = focusHistory
          .filter((item) => item.subjectId === s.id)
          .reduce((sum, item) => sum + item.durationMinutes / 60, 0);
        return {
          name: s.code,
          fullName: s.name,
          hours: legacyCalendar ? loggedHours : (s.totalHours > 0 ? s.totalHours : loggedHours),
          color: s.color,
        };
      }),
    [subjects, legacyCalendar, focusHistory]
  );

  const totalHoursAll = useMemo(
    () => Number(subjectDonutData.reduce((acc, s) => acc + s.hours, 0).toFixed(1)),
    [subjectDonutData]
  );

  const filteredSessions = useMemo(() => {
    const q = tableSearch.trim().toLowerCase();
    const rows = legacyCalendar ? focusHistory.map(item => ({
      id: item.id, date: item.completedAt, subjectId: item.subjectId, topic: item.taskTitle,
      plannedMin: 0, actualMin: item.durationMinutes, focusScore: item.qualityRating * 20, mode: item.mode,
    })) : ANALYTICS_SESSIONS_TABLE;
    return rows.filter((row) => {
      if (subjectFilter !== 'all' && row.subjectId !== subjectFilter) return false;
      if (q && !row.topic.toLowerCase().includes(q) && !row.mode.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [subjectFilter, tableSearch, focusHistory, legacyCalendar]);

  const heatmapColor = (level: number) => {
    if (level === 0) return 'var(--bg-surface-hover)';
    const opacities = [0.15, 0.35, 0.62, 0.92];
    return `color-mix(in srgb, var(--accent) ${Math.round((opacities[level - 1] ?? 0.9) * 100)}%, transparent)`;
  };

  const liveChart = studyChart(dateRange, sessions.filter(item => subjectFilter === 'all' || item.subjectId === subjectFilter),
    focusHistory.filter(item => subjectFilter === 'all' || item.subjectId === subjectFilter));
  const total = liveChart.reduce((sum, row) => sum + row.actual, 0);
  const planned = liveChart.reduce((sum, row) => sum + row.planned, 0);
  const totalStatsByRange = { total: total.toFixed(1) + 'h', delta: '', sub: 'Logged focus and completed study blocks' };

  return (
    <div className="space-y-4 pb-8">
      {/* Header + Global Analytics Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-[19px] font-semibold text-[var(--text-primary)]">
            Analytics & Insights
          </h1>
          <p className="text-[12.5px] text-[var(--text-muted)]">
            Deep telemetry across study adherence, focus quality, retention, and exam performance
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div
            className="inline-flex items-center p-0.5 rounded-lg text-[12px]"
            style={{ backgroundColor: 'var(--bg-surface-subtle)', border: '1px solid var(--border-subtle)' }}
          >
            {(['daily', 'weekly', 'monthly'] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setDateRange(r)}
                className="px-2.5 py-1 rounded-md capitalize font-medium transition-colors"
                style={{
                  backgroundColor: dateRange === r ? 'var(--bg-surface)' : 'transparent',
                  color: dateRange === r ? 'var(--text-primary)' : 'var(--text-muted)',
                }}
              >
                {r}
              </button>
            ))}
          </div>

          <select
            aria-label="Filter analytics by subject"
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
              <option key={s.id} value={s.id}>{s.code} · {s.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* 2. Total Study Hours KPI Strip + Insight Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <div className="rounded-xl p-4" style={surfaceStyle}>
          <div className="text-[12px] text-[var(--text-muted)] capitalize">Total study hours ({dateRange})</div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="font-mono-num text-[22px] font-semibold text-[var(--text-primary)]">
              {totalStatsByRange.total}
            </span>
            <span className="inline-flex items-center text-[12px] font-medium text-emerald-600 dark:text-emerald-400">
              <ArrowUpRight className="w-3.5 h-3.5" /> {totalStatsByRange.delta}
            </span>
          </div>
          <div className="text-[11.5px] text-[var(--text-muted)] mt-0.5">{totalStatsByRange.sub}</div>
        </div>

        <div className="rounded-xl p-4" style={surfaceStyle}>
          <div className="text-[12px] text-[var(--text-muted)]">Schedule adherence</div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="font-mono-num text-[22px] font-semibold text-[var(--text-primary)]">{planned ? `${(100 * total / planned).toFixed(1)}%` : '—'}</span>
            <span className="text-[12px] text-emerald-600 dark:text-emerald-400 font-medium">{legacyCalendar ? '' : '+4.1%'}</span>
          </div>
          <div className="text-[11.5px] text-[var(--text-muted)] mt-0.5">Actual vs planned sessions</div>
        </div>

        <div className="rounded-xl p-4" style={surfaceStyle}>
          <div className="text-[12px] text-[var(--text-muted)]">Avg focus quality</div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="font-mono-num text-[22px] font-semibold text-[var(--text-primary)]">{legacyCalendar ? '—' : '88.4'}</span>
            <span className="text-[12px] text-[var(--text-muted)] font-mono-num">/ 100</span>
          </div>
          <div className="text-[11.5px] text-[var(--text-muted)] mt-0.5">{legacyCalendar ? 'Focus quality history' : 'Peak window: 9:30–11:30 AM'}</div>
        </div>

        <div className="rounded-xl p-4" style={{ ...surfaceStyle, borderColor: 'var(--accent-border)' }}>
          <div className="inline-flex items-center gap-1.5 text-[12px] font-semibold" style={{ color: 'var(--accent)' }}>
            <Sparkles className="w-3.5 h-3.5" /> Key Pattern
          </div>
          <p className="text-[12.5px] text-[var(--text-primary)] mt-1 leading-snug">
            {legacyCalendar ? 'Study patterns appear as you log more sessions.' : <>45-minute Pomodoro blocks yield <strong>11% higher retention</strong> than marathon 90m sessions.</>}
          </p>
        </div>
      </div>

      {/* Row 1: (1) Planned vs Actual Dual-Line + (3) Study Time by Subject Donut */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-8 rounded-xl p-4" style={surfaceStyle}>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="font-display text-[14.5px] font-semibold text-[var(--text-primary)]">
                Planned vs Actual Study Time
              </h2>
              <p className="text-[12px] text-[var(--text-muted)]">Smooth dual-line comparison ({dateRange})</p>
            </div>
            <div className="flex items-center gap-3 text-[11.5px] text-[var(--text-secondary)]">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-0.5" style={{ backgroundColor: 'var(--chart-planned)' }} /> Planned
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-0.5" style={{ backgroundColor: 'var(--accent)' }} /> Actual
              </span>
            </div>
          </div>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={liveChart} margin={{ top: 6, right: 10, left: -18, bottom: 0 }}>
                <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: 'var(--text-muted)', fontSize: 11.5 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11.5 }} axisLine={false} tickLine={false} unit="h" />
                <Tooltip contentStyle={tooltipStyle} />
                <Line type="monotone" dataKey="planned" name="Planned (h)" stroke="var(--chart-planned)" strokeWidth={2} strokeDasharray="4 4" dot={{ r: 3 }} isAnimationActive={false} />
                <Line type="monotone" dataKey="actual" name="Actual (h)" stroke="var(--accent)" strokeWidth={2.5} dot={{ r: 3.5 }} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-4 rounded-xl p-4 flex flex-col justify-between" style={surfaceStyle}>
          <div>
            <h2 className="font-display text-[14.5px] font-semibold text-[var(--text-primary)]">
              Study Time by Subject
            </h2>
            <p className="text-[12px] text-[var(--text-muted)] font-mono-num">{totalHoursAll}h semester total</p>
          </div>
          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={subjectDonutData}
                  dataKey="hours"
                  nameKey="name"
                  innerRadius={48}
                  outerRadius={72}
                  paddingAngle={2}
                  isAnimationActive={false}
                >
                  {subjectDonutData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`${v ?? 0} hrs`, 'Logged']} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11.5px]">
            {subjectDonutData.map((s) => (
              <div key={s.name} className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-[var(--text-secondary)] truncate">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                  {s.name}
                </span>
                <span className="font-mono-num text-[var(--text-primary)]">{s.hours}h</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row 2: (4) Productivity Trends Area + (6) Focus Duration Distribution Bar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-7 rounded-xl p-4" style={surfaceStyle}>
          <h2 className="font-display text-[14.5px] font-semibold text-[var(--text-primary)]">
            Productivity Trends
          </h2>
          <p className="text-[12px] text-[var(--text-muted)] mb-3">Composite focus quality index over the past 14 days</p>
          <div className="h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={legacyCalendar ? [] : ANALYTICS_PRODUCTIVITY_TREND} margin={{ top: 6, right: 10, left: -18, bottom: 0 }}>
                <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: 'var(--text-muted)', fontSize: 11.5 }} axisLine={false} tickLine={false} />
                <YAxis domain={[60, 100]} tick={{ fill: 'var(--text-muted)', fontSize: 11.5 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Area type="monotone" dataKey="score" name="Focus Score" stroke="var(--accent)" fill="var(--accent-soft)" strokeWidth={2.5} isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-5 rounded-xl p-4" style={surfaceStyle}>
          <h2 className="font-display text-[14.5px] font-semibold text-[var(--text-primary)]">
            Focus Duration Distribution
          </h2>
          <p className="text-[12px] text-[var(--text-muted)] mb-3">Completed study blocks by session length</p>
          <div className="h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={legacyCalendar ? [] : ANALYTICS_FOCUS_DURATION} margin={{ top: 6, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="bucket" tick={{ fill: 'var(--text-muted)', fontSize: 11.5 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11.5 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="sessions" name="Sessions" fill="var(--accent)" radius={[5, 5, 0, 0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Row 3: (5) Study Consistency Calendar Heatmap + (8) Peak Productivity Hours Heatmap */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-6 rounded-xl p-4" style={surfaceStyle}>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="font-display text-[14.5px] font-semibold text-[var(--text-primary)]">
                Study Consistency Heatmap
              </h2>
              <p className="text-[12px] text-[var(--text-muted)]">14-week daily activity cadence (96 active days)</p>
            </div>
            <div className="flex items-center gap-1 text-[10.5px] text-[var(--text-muted)]">
              <span>Less</span>
              {[0, 1, 2, 3, 4].map((lvl) => (
                <span key={lvl} className="w-2.5 h-2.5 rounded-[3px]" style={{ backgroundColor: heatmapColor(lvl) }} />
              ))}
              <span>More</span>
            </div>
          </div>
          <div className="grid grid-cols-14 gap-1.5 pt-1">
            {(legacyCalendar ? CONSISTENCY_HEATMAP.map(week => week.map(() => 0)) : CONSISTENCY_HEATMAP).map((week, wIdx) => (
              <div key={wIdx} className="flex flex-col gap-1.5">
                {week.map((lvl, dIdx) => (
                  <div
                    key={`${wIdx}-${dIdx}`}
                    title={`Week ${wIdx + 1}, Day ${dIdx + 1}: Level ${lvl}`}
                    className="w-full aspect-square rounded-[4px]"
                    style={{ backgroundColor: heatmapColor(lvl) }}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-6 rounded-xl p-4" style={surfaceStyle}>
          <h2 className="font-display text-[14.5px] font-semibold text-[var(--text-primary)]">
            Peak Productivity Hours
          </h2>
          <p className="text-[12px] text-[var(--text-muted)] mb-3">Hourly deep-work output across weekdays</p>
          <div className="space-y-1.5 overflow-x-auto">
            <div className="grid grid-cols-9 gap-1.5 text-[10.5px] font-mono-num text-[var(--text-muted)]">
              <div />
              {TIME_SLOTS.map((s) => (
                <div key={s} className="text-center">{s}</div>
              ))}
            </div>
            {(legacyCalendar ? [] : PEAK_HOURS_HEATMAP).map((row) => (
              <div key={row.day} className="grid grid-cols-9 gap-1.5 items-center">
                <div className="text-[11px] text-[var(--text-secondary)]">{row.day}</div>
                {row.slots.map((val, idx) => (
                  <div
                    key={idx}
                    title={`${row.day} ${TIME_SLOTS[idx]}: Intensity ${val}/4`}
                    className="h-5 rounded-[4px]"
                    style={{ backgroundColor: heatmapColor(val) }}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row 4: (7) Goal Completion + (9) Task Completion Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl p-4" style={surfaceStyle}>
          <h2 className="font-display text-[14.5px] font-semibold text-[var(--text-primary)]">
            Goal Completion: Target vs Actual
          </h2>
          <p className="text-[12px] text-[var(--text-muted)] mb-3">Weekly subject hour targets vs actual hours logged</p>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={legacyCalendar ? [] : ANALYTICS_GOAL_COMPARISON} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="subject" tick={{ fill: 'var(--text-muted)', fontSize: 11.5 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11.5 }} axisLine={false} tickLine={false} unit="h" />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="target" name="Target (h)" fill="var(--border-strong)" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                <Bar dataKey="actual" name="Actual (h)" fill="var(--accent)" radius={[4, 4, 0, 0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl p-4" style={surfaceStyle}>
          <h2 className="font-display text-[14.5px] font-semibold text-[var(--text-primary)]">
            Task Completion Trends
          </h2>
          <p className="text-[12px] text-[var(--text-muted)] mb-3">Completed vs pending assignments per week</p>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={legacyCalendar ? [] : ANALYTICS_TASK_TRENDS} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="week" tick={{ fill: 'var(--text-muted)', fontSize: 11.5 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11.5 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="completed" name="Completed" fill="#059669" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                <Bar dataKey="pending" name="Pending" fill="#D97706" radius={[4, 4, 0, 0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Row 5: (10) Revision Retention + (11) Exam Score Progression */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl p-4" style={surfaceStyle}>
          <div className="flex items-start justify-between gap-2 mb-3">
            <div>
              <h2 className="font-display text-[14.5px] font-semibold text-[var(--text-primary)]">
                SRS Forgetting-Curve Forecast
              </h2>
              <p className="text-[12px] text-[var(--text-muted)]">
                {filteredCards.length > 0 ? (
                  <>
                    <span className="font-mono-num">{srsSummary.overallRetentionToday}%</span> recall today ·{' '}
                    <span className="font-mono-num">{srsSummary.overallRetentionAtExam}%</span> at exam ·{' '}
                    <span className="font-mono-num">{srsSummary.atRiskTotal}</span> at-risk
                  </>
                ) : (
                  'Your active recall retention vs standard forgetting curve'
                )}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setRoute('flashcards')}
              className="text-[11.5px] font-medium hover:underline whitespace-nowrap shrink-0"
              style={{ color: 'var(--accent)' }}
            >
              Open SRS Lab
            </button>
          </div>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              {filteredCards.length > 0 ? (
                <AreaChart data={srsCurveData} margin={{ top: 4, right: 10, left: -18, bottom: 0 }}>
                  <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="dayLabel" tick={{ fill: 'var(--text-muted)', fontSize: 11.5 }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fill: 'var(--text-muted)', fontSize: 11.5 }} axisLine={false} tickLine={false} unit="%" />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(val) => [`${val}%`, 'Projected Recall']}
                  />
                  <Area
                    type="monotone"
                    dataKey="avgRetention"
                    name="Projected Recall (%)"
                    stroke="#0D9488"
                    fill="color-mix(in srgb, #0D9488 18%, transparent)"
                    strokeWidth={2.25}
                    isAnimationActive={false}
                  />
                </AreaChart>
              ) : (
                <LineChart data={legacyCalendar ? [] : ANALYTICS_RETENTION_CURVE} margin={{ top: 4, right: 10, left: -18, bottom: 0 }}>
                  <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="day" tick={{ fill: 'var(--text-muted)', fontSize: 11.5 }} axisLine={false} tickLine={false} />
                  <YAxis domain={[40, 100]} tick={{ fill: 'var(--text-muted)', fontSize: 11.5 }} axisLine={false} tickLine={false} unit="%" />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Line type="monotone" dataKey="benchmark" name="Unreviewed Baseline (%)" stroke="var(--chart-planned)" strokeDasharray="4 4" strokeWidth={2} isAnimationActive={false} />
                  <Line type="monotone" dataKey="retention" name="Your Retention (%)" stroke="#0D9488" strokeWidth={2.5} isAnimationActive={false} />
                </LineChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl p-4" style={surfaceStyle}>
          <h2 className="font-display text-[14.5px] font-semibold text-[var(--text-primary)]">
            Exam Score Progression
          </h2>
          <p className="text-[12px] text-[var(--text-muted)] mb-3">Assessment trajectory across core courses</p>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={legacyCalendar ? [] : ANALYTICS_EXAM_PROGRESSION} margin={{ top: 4, right: 10, left: -18, bottom: 0 }}>
                <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="exam" tick={{ fill: 'var(--text-muted)', fontSize: 11.5 }} axisLine={false} tickLine={false} />
                <YAxis domain={[70, 100]} tick={{ fill: 'var(--text-muted)', fontSize: 11.5 }} axisLine={false} tickLine={false} unit="%" />
                <Tooltip contentStyle={tooltipStyle} />
                <Line type="monotone" dataKey="chem" name="CHEM" stroke="#16A34A" strokeWidth={2} isAnimationActive={false} />
                <Line type="monotone" dataKey="phy" name="PHY" stroke="#3B82F6" strokeWidth={2} isAnimationActive={false} />
                <Line type="monotone" dataKey="cm" name="CM" stroke="#A855F7" strokeWidth={2} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 12. Study Session History Filterable Data Table */}
      <div className="rounded-xl overflow-hidden" style={surfaceStyle}>
        <div className="px-4 py-3 flex flex-wrap items-center justify-between gap-3" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <div>
            <h2 className="font-display text-[14.5px] font-semibold text-[var(--text-primary)]">
              Study Session History
            </h2>
            <p className="text-[12px] text-[var(--text-muted)]">
              {filteredSessions.length} recorded sessions
            </p>
          </div>
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[var(--text-muted)] absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={tableSearch}
              onChange={(e) => setTableSearch(e.target.value)}
              placeholder="Search topic or mode..."
              aria-label="Search study session history"
              className="h-8 pl-8 pr-3 rounded-lg text-[12px] w-52"
              style={{
                backgroundColor: 'var(--bg-surface-subtle)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-primary)',
              }}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-[12.5px]">
            <thead>
              <tr style={{ backgroundColor: 'var(--bg-surface-subtle)', borderBottom: '1px solid var(--border-subtle)' }}>
                <th className="py-2.5 px-4 font-medium text-[var(--text-muted)]">Date</th>
                <th className="py-2.5 px-4 font-medium text-[var(--text-muted)]">Subject</th>
                <th className="py-2.5 px-4 font-medium text-[var(--text-muted)]">Topic</th>
                <th className="py-2.5 px-4 font-medium text-[var(--text-muted)]">Mode</th>
                <th className="py-2.5 px-4 font-medium text-[var(--text-muted)] text-right">Planned</th>
                <th className="py-2.5 px-4 font-medium text-[var(--text-muted)] text-right">Actual</th>
                <th className="py-2.5 px-4 font-medium text-[var(--text-muted)] text-right">Focus</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {filteredSessions.map((row) => {
                const sub = subjects.find((s) => s.id === row.subjectId);
                return (
                  <tr key={row.id} className="hover:bg-[var(--bg-surface-hover)] transition-colors">
                    <td className="py-2.5 px-4 font-mono-num text-[var(--text-secondary)] whitespace-nowrap">{row.date}</td>
                    <td className="py-2.5 px-4 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5 font-medium text-[var(--text-primary)]">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: sub?.color }} />
                        {sub?.code}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-[var(--text-primary)]">{row.topic}</td>
                    <td className="py-2.5 px-4 text-[var(--text-secondary)]">{row.mode}</td>
                    <td className="py-2.5 px-4 font-mono-num text-right text-[var(--text-muted)]">{row.plannedMin}m</td>
                    <td className="py-2.5 px-4 font-mono-num text-right text-[var(--text-primary)] font-medium">{row.actualMin}m</td>
                    <td className="py-2.5 px-4 font-mono-num text-right font-semibold text-emerald-600 dark:text-emerald-400">
                      {row.focusScore}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
