import React, { useState } from 'react';
import {
  Repeat,
  Clock,
  MapPin,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Calendar as CalendarIcon,
  Plus,
  Trash2,
  X,
  ArrowRight,
  GripVertical,
} from 'lucide-react';
import { localDay } from '../../assistant/workspaceContext';
import { useApp } from '../../context/AppContext';
import { recurringSeriesTemplate, recurringWeekdays } from '../../desktop/legacy';
import type { StudySession } from '../../types/studyflow';
import { layoutCalendarDay } from '../../utils/calendarLayout';
import { formatHourLabel } from '../../utils/studyLogic';

import { CalendarBlockFields, readCalendarBlockFields, RepeatWeekdays } from '../shell/CalendarBlockFields';

type PlannerMode = 'day' | 'week' | 'month' | 'agenda';

const DEMO_DAYS = [
  { short: 'Mon', num: 16, date: '2026-11-16' },
  { short: 'Tue', num: 17, date: '2026-11-17' },
  { short: 'Wed', num: 18, date: '2026-11-18' },
  { short: 'Thu', num: 19, date: '2026-11-19' },
  { short: 'Fri', num: 20, date: '2026-11-20' },
  { short: 'Sat', num: 21, date: '2026-11-21' },
  { short: 'Sun', num: 22, date: '2026-11-22', isToday: true },
];

const HOURS = Array.from({ length: 24 }, (_, hour) => hour);
const HOUR_HEIGHT = 60;

export const PlannerView: React.FC = () => {
  const {
    sessions,
    legacyCalendar,
    subjects,
    updateSession, updateRecurringSeries, recurringSeries,
    deleteSession,
    setActiveModal,
    pushToast,
  } = useApp();

  const today = new Date();
  const weekday = (today.getDay() + 6) % 7;
  const weekStart = new Date(today.getFullYear(), today.getMonth(), today.getDate() - weekday, 12);
  const DAYS = legacyCalendar ? DEMO_DAYS.map(({ short }, index) => {
    const date = new Date(weekStart);
    date.setDate(date.getDate() + index);
    return { short, num: date.getDate(), date: localDay(date), isToday: index === weekday };
  }) : DEMO_DAYS;

  const monthOffset = legacyCalendar ? (new Date(today.getFullYear(), today.getMonth(), 1).getDay() + 6) % 7 : 0;
  const monthDays = legacyCalendar ? new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate() : 28;
  const [viewMode, setViewMode] = useState<PlannerMode>('week');
  const [activeDayIdx, setActiveDayIdx] = useState<number>(legacyCalendar ? weekday : 6);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [dragSessionId, setDragSessionId] = useState<string | null>(null);


  const selectedSession = sessions.find((s) => s.id === selectedSessionId) ?? null;
  const selectedSeriesId = /^legacy-series-(\d+)-/.exec(selectedSession?.id ?? '')?.[1];
  const selectedSeries = recurringSeries.find(row => row.id === Number(selectedSeriesId));
  const [editScope, setEditScope] = useState<{ id: string | null; series: boolean }>({ id: null, series: false });
  const editingSeries = editScope.id === selectedSessionId && editScope.series;

  const blocksByDate = new Map(DAYS.map(day => [day.date, layoutCalendarDay(sessions, day.date)]));
  const getWorkloadForDay = (dayIdx: number) => (blocksByDate.get(DAYS[dayIdx].date) ?? [])
    .filter(block => block.session.countsTowardStudy !== false)
    .reduce((total, block) => total + block.to - block.from, 0);

  const handleDropOnCell = (dayIdx: number, hour: number) => {
    if (!dragSessionId) return;
    const targetDay = DAYS[dayIdx];
    updateSession(dragSessionId, {
      dayIndex: dayIdx,
      date: targetDay.date,
      startHour: hour,
      status: 'upcoming',
    });
    pushToast(`Rescheduled block to ${targetDay.short} ${formatHourLabel(hour)}`);
    setDragSessionId(null);
  };

  const handleResizeDuration = (ses: StudySession, delta: number) => {
    const next = Math.max(0.5, Math.min(24, ses.durationHours + delta));
    updateSession(ses.id, { durationHours: next });
  };

  const missed = sessions.find(s => s.status === 'missed' && s.countsTowardStudy !== false && s.date <= localDay(today));
  function findSlot() {
    if (!missed) return;
    for (const day of DAYS.filter(day => day.date >= localDay(today))) {
      const blocks = blocksByDate.get(day.date) ?? [];
      for (let start = 8; start + missed.durationHours <= 22; start += 0.5) {
        if (day.date === localDay(today) && start <= today.getHours() + today.getMinutes() / 60) continue;
        if (blocks.every(block => start >= block.to || start + missed.durationHours <= block.from)) return { day, start };
      }
    }
  }
  const slot = findSlot();
  const applySmartReschedule = () => {
    if (!missed || !slot) return;
    updateSession(missed.id, { date: slot.day.date, dayIndex: DAYS.indexOf(slot.day), startHour: slot.start, status: 'upcoming' });
    pushToast('Study block rescheduled');
  };

  const renderSessionBlock = ({ session: ses, from, to, continued, column, columns }: ReturnType<typeof layoutCalendarDay>[number]) => {
    const sub = subjects.find((s) => s.id === ses.subjectId);
    const isSelected = ses.id === selectedSessionId;
    const topPx = from * HOUR_HEIGHT;
    const heightPx = Math.max(1, (to - from) * HOUR_HEIGHT - 1);
    const color = sub?.color ?? '#4F46E5';

    return (
      <div
        key={ses.id}
        draggable={!continued}
        onDragStart={() => setDragSessionId(ses.id)}
        onDragEnd={() => setDragSessionId(null)}
        onClick={() => setSelectedSessionId(ses.id)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setSelectedSessionId(ses.id);
          }
        }}
        aria-label={`${ses.title}, ${formatHourLabel(from)} to ${formatHourLabel(to % 24)}${continued ? ', continued' : ''}`}
        title={`${ses.title} · ${formatHourLabel(from)}–${formatHourLabel(to % 24)}${continued ? ' · Continued' : ''}`}
        className="absolute rounded-md px-1 py-px cursor-pointer select-none overflow-hidden transition-shadow group"
        style={{
          top: topPx,
          left: `calc(${column * 100 / columns}% + 1px)`,
          width: `calc(${100 / columns}% - 2px)`,
          height: heightPx,
          backgroundColor: `${color}18`,
          border: isSelected ? `1.5px solid ${color}` : `1px solid ${color}45`,
          opacity: ses.status === 'missed' ? 0.72 : 1,
        }}
      >
        <div className="truncate text-[11px] leading-tight font-medium">
          {heightPx < 27 && <span className="mr-1 text-[var(--text-muted)]">{formatHourLabel(from)}</span>}
          {ses.title}
        </div>
        {heightPx >= 27 && <div className="truncate text-[10px] leading-tight text-[var(--text-muted)]">
          {formatHourLabel(from)}{continued ? ' · Continued' : ses.recurring ? ' · Repeats' : ''}
        </div>}
        {heightPx >= 54 && sub && <div className="truncate text-[10px]" style={{ color }}>{sub.code}</div>}
        {/* Subtle resize handle affordance */}
        <div
          className="absolute bottom-0 inset-x-0 h-2 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => {
            e.stopPropagation();
            handleResizeDuration(ses, 0.5);
          }}
          title="Click bottom edge to extend +30m"
        >
          <span className="w-6 h-0.5 rounded-full" style={{ backgroundColor: color }} />
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4 pb-6">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-[19px] font-semibold text-[var(--text-primary)]">
            Study Planner
          </h1>
          <p className="text-[12.5px] text-[var(--text-muted)]">
            {legacyCalendar ? `${DAYS[0].date} – ${DAYS[6].date}` : 'Nov 16 – Nov 22, 2026'} · Drag any study block to reschedule across time slots
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div
            className="inline-flex items-center p-0.5 rounded-lg text-[12px]"
            style={{ backgroundColor: 'var(--bg-surface-subtle)', border: '1px solid var(--border-subtle)' }}
            role="tablist"
            aria-label="Calendar view mode"
          >
            {(['day', 'week', 'month', 'agenda'] as PlannerMode[]).map((m) => (
              <button
                key={m}
                type="button"
                role="tab"
                aria-selected={viewMode === m}
                onClick={() => setViewMode(m)}
                className="px-2.5 py-1 rounded-md capitalize font-medium transition-colors"
                style={{
                  backgroundColor: viewMode === m ? 'var(--bg-surface)' : 'transparent',
                  color: viewMode === m ? 'var(--text-primary)' : 'var(--text-muted)',
                }}
              >
                {m}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setActiveModal('create_session')}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[12.5px] font-medium whitespace-nowrap"
            style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' }}
          >
            <Plus className="w-3.5 h-3.5" /> Schedule Block
          </button>
        </div>
      </div>

      {/* Main Split: Calendar Workspace + Right Context Panel */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">
        {/* Calendar Container */}
        <div
          className="xl:col-span-9 rounded-xl overflow-hidden"
          style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          {/* Week or Day Time-Grid */}
          {(viewMode === 'week' || viewMode === 'day') && (
            <div className="overflow-x-auto">
              <div className={viewMode === 'week' ? 'min-w-[680px]' : 'min-w-[340px]'}>
                {/* Day Headers + Daily Workload Indicator */}
                <div
                  className="grid"
                  style={{
                    gridTemplateColumns:
                      viewMode === 'week' ? '56px repeat(7, minmax(0, 1fr))' : '56px 1fr',
                    borderBottom: '1px solid var(--border-subtle)',
                    backgroundColor: 'var(--bg-surface-subtle)',
                  }}
                >
                  <div className="p-2 text-[10.5px] text-[var(--text-muted)] text-center self-center">
                    {legacyCalendar ? Intl.DateTimeFormat(undefined, { timeZoneName: 'short' }).formatToParts(today).find(part => part.type === 'timeZoneName')?.value : 'PST'}
                  </div>
                  {(viewMode === 'week' ? DAYS : [DAYS[activeDayIdx]]).map((d, idx) => {
                    const realIdx = viewMode === 'week' ? idx : activeDayIdx;
                    const loadHrs = getWorkloadForDay(realIdx);
                    const loadPct = Math.min(100, Math.round((loadHrs / 6) * 100));
                    return (
                      <button
                        key={d.date}
                        type="button"
                        onClick={() => setActiveDayIdx(realIdx)}
                        className="p-2 text-left transition-colors hover:bg-[var(--bg-surface-hover)]"
                        style={{ borderLeft: '1px solid var(--border-subtle)' }}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-medium text-[var(--text-muted)]">
                            {d.short}
                          </span>
                          <span
                            className="font-mono-num text-[12px] font-semibold px-1.5 py-0.5 rounded-md"
                            style={{
                              backgroundColor: d.isToday ? 'var(--accent)' : 'transparent',
                              color: d.isToday ? 'var(--accent-fg)' : 'var(--text-primary)',
                            }}
                          >
                            {d.num}
                          </span>
                        </div>
                        {/* Daily workload bar */}
                        <div className="mt-1.5 flex items-center gap-1.5">
                          <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--border-subtle)' }}>
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${loadPct}%`,
                                backgroundColor: loadHrs >= 4.5 ? '#D97706' : 'var(--accent)',
                              }}
                            />
                          </div>
                          <span className="font-mono-num text-[10px] text-[var(--text-muted)]">
                            {loadHrs.toFixed(1)}h
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Time grid body */}
                <div
                  className="grid relative"
                  style={{
                    gridTemplateColumns:
                      viewMode === 'week' ? '56px repeat(7, minmax(0, 1fr))' : '56px 1fr',
                    height: HOURS.length * HOUR_HEIGHT,
                  }}
                >
                  {/* Hour Labels */}
                  <div className="relative">
                    {HOURS.map((h) => (
                      <div
                        key={h}
                        className="pr-2 text-right text-[10.5px] font-mono-num text-[var(--text-muted)]"
                        style={{ height: HOUR_HEIGHT, paddingTop: 2 }}
                      >
                        {h % 12 || 12} {h < 12 ? 'AM' : 'PM'}
                      </div>
                    ))}
                  </div>

                  {/* Day Columns */}
                  {(viewMode === 'week' ? DAYS : [DAYS[activeDayIdx]]).map((d, idx) => {
                    const realIdx = viewMode === 'week' ? idx : activeDayIdx;
                    const daySessions = blocksByDate.get(d.date) ?? [];

                    return (
                      <div
                        key={d.date}
                        className="relative"
                        style={{
                          borderLeft: '1px solid var(--border-subtle)',
                          backgroundColor: d.isToday ? 'var(--accent-soft)' : 'transparent',
                        }}
                      >
                        {/* Drop target hour rows */}
                        {HOURS.map((h) => (
                          <div
                            key={h}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={() => handleDropOnCell(realIdx, h)}
                            style={{
                              height: HOUR_HEIGHT,
                              borderBottom: '1px solid var(--border-subtle)',
                            }}
                          />
                        ))}

                        {/* Current time hairline indicator (10:15 AM on Today) */}
                        {d.isToday && (
                          <div
                            className="absolute left-0 right-0 z-10 pointer-events-none flex items-center"
                            style={{ top: (legacyCalendar ? today.getHours() + today.getMinutes() / 60 : 10.25) * HOUR_HEIGHT }}
                          >
                            <span className="w-2 h-2 rounded-full -ml-1" style={{ backgroundColor: '#E11D48' }} />
                            <div className="flex-1 h-[1.5px]" style={{ backgroundColor: '#E11D48' }} />
                          </div>
                        )}

                        {daySessions.map((ses) => renderSessionBlock(ses))}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Month View */}
          {viewMode === 'month' && (
            <div className="p-4">
              <div className="grid grid-cols-7 gap-2 mb-2 text-[11.5px] font-medium text-[var(--text-muted)] text-center">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
                  <div key={d}>{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1.5">
                {Array.from({ length: monthDays + monthOffset }, (_, i) => {
                  if (i < monthOffset) return <div aria-hidden="true" key={`blank-${i}`} />;
                  const dayNum = legacyCalendar ? i - monthOffset + 1 : i + 2;
                  const dateIso = legacyCalendar
                    ? localDay(new Date(today.getFullYear(), today.getMonth(), dayNum, 12))
                    : `2026-11-${String(dayNum).padStart(2, '0')}`;
                  const dayEvents = sessions.filter((s) => s.date === dateIso);
                  const isToday = legacyCalendar ? dateIso === localDay(today) : dayNum === 22;

                  return (
                    <div
                      key={dateIso}
                      className="min-h-[84px] rounded-lg p-1.5"
                      style={{
                        backgroundColor: isToday ? 'var(--accent-soft)' : 'var(--bg-surface-subtle)',
                        border: isToday ? '1px solid var(--accent)' : '1px solid var(--border-subtle)',
                      }}
                    >
                      <div className="flex items-center justify-between text-[11px] font-mono-num mb-1">
                        <span className={isToday ? 'font-bold text-[var(--accent)]' : 'text-[var(--text-secondary)]'}>
                          {dayNum}
                        </span>
                        {dayEvents.length > 0 && (
                          <span className="text-[10px] text-[var(--text-muted)]">
                            {Number(layoutCalendarDay(sessions, dateIso).filter(b => b.session.countsTowardStudy !== false).reduce((sum, b) => sum + b.to - b.from, 0).toFixed(2))}h
                          </span>
                        )}
                      </div>
                      <div className="space-y-1">
                        {dayEvents.slice(0, 2).map((ev) => {
                          const sub = subjects.find((s) => s.id === ev.subjectId);
                          return (
                            <button
                              key={ev.id}
                              type="button"
                              onClick={() => setSelectedSessionId(ev.id)}
                              className="w-full text-left text-[10.5px] px-1.5 py-0.5 rounded truncate font-medium"
                              style={{
                                backgroundColor: `${sub?.color ?? '#4F46E5'}22`,
                                color: 'var(--text-primary)',
                              }}
                            >
                              {sub?.code} · {ev.title}
                            </button>
                          );
                        })}
                        {dayEvents.length > 2 && (
                          <div className="text-[10px] text-[var(--text-muted)] px-1">
                            +{dayEvents.length - 2} more
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Agenda View */}
          {viewMode === 'agenda' && (
            <div className="divide-y divide-[var(--border-subtle)]">
              {[...sessions]
                .sort((a, b) => a.date.localeCompare(b.date) || a.startHour - b.startHour)
                .map((ses) => {
                  const sub = subjects.find((s) => s.id === ses.subjectId);
                  return (
                    <button
                      key={ses.id}
                      type="button"
                      onClick={() => setSelectedSessionId(ses.id)}
                      className="w-full px-4 py-3 flex items-center justify-between gap-4 hover:bg-[var(--bg-surface-hover)] text-left transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="font-mono-num text-[12px] text-[var(--text-muted)] w-24 shrink-0">
                          {ses.date}
                        </span>
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: sub?.color }} />
                        <div className="min-w-0">
                          <div className="text-[13px] font-medium text-[var(--text-primary)] truncate">
                            {ses.title}
                          </div>
                          <div className="text-[11.5px] text-[var(--text-muted)]">
                            {sub?.code} · {formatHourLabel(ses.startHour)} ({ses.durationHours}h) · {ses.location ?? 'Workspace'}
                          </div>
                        </div>
                      </div>
                      <span
                        className={`text-[12px] font-medium capitalize shrink-0 ${
                          ses.status === 'completed'
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : ses.status === 'missed'
                              ? 'text-rose-600 dark:text-rose-400'
                              : 'text-[var(--text-secondary)]'
                        }`}
                      >
                        {ses.status}
                      </span>
                    </button>
                  );
                })}
            </div>
          )}
        </div>

        {/* Right Column: Session Detail Side Panel + Smart Rescheduling Panel */}
        <div className="xl:col-span-3 space-y-4">
          {/* Session Detail Inspector */}
          <div
            className="rounded-xl p-4"
            style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display text-[14px] font-semibold text-[var(--text-primary)]">
                Session Detail
              </h2>
              {selectedSession && (
                <button
                  type="button"
                  onClick={() => setSelectedSessionId(null)}
                  aria-label="Clear selected session"
                  className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {selectedSession ? (
              (() => {
                const sub = subjects.find((s) => s.id === selectedSession.subjectId);
                const formSession = selectedSeries && editingSeries ? recurringSeriesTemplate(selectedSeries, selectedSession) : selectedSession;
                return (
                  <div className="space-y-3">
                    <div>
                      <div className="flex items-center gap-1.5 text-[11.5px] font-semibold" style={{ color: sub?.color }}>
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: sub?.color }} />
                        {sub?.code} · {sub?.name}
                      </div>
                      <div className="text-[14px] font-semibold text-[var(--text-primary)] mt-1">
                        {selectedSession.title}
                      </div>
                    </div>

                    <div className="space-y-1.5 text-[12px] text-[var(--text-secondary)]">
                      <div className="flex items-center gap-2">
                        <CalendarIcon className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                        <span>{selectedSession.date}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                        <span className="font-mono-num">
                          {formatHourLabel(selectedSession.startHour)} · {selectedSession.durationHours} hrs
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                        <span>{selectedSession.location ?? 'Study Workspace'}</span>
                      </div>
                    </div>

                    {selectedSession.notes && (
                      <p className="text-[12px] text-[var(--text-secondary)] p-2.5 rounded-lg" style={{ backgroundColor: 'var(--bg-surface-subtle)' }}>
                        {selectedSession.notes}
                      </p>
                    )}

                    <form key={`${selectedSession.id}-${editingSeries}`} className="grid gap-2 text-xs [&_input:not([type=checkbox])]:block [&_input:not([type=checkbox])]:w-full [&_input:not([type=checkbox])]:rounded [&_input:not([type=checkbox])]:border [&_input:not([type=checkbox])]:border-[var(--border-subtle)] [&_input:not([type=checkbox])]:p-1" onSubmit={e => {
                      e.preventDefault();
                      const data = new FormData(e.currentTarget);
                      const title = String(data.get('title')).trim();
                      if (!title) return;
                      const [hour, minute] = String(data.get('start')).split(':').map(Number);
                      const startHour = hour + minute / 60;
                      const durationHours = Number(data.get('duration')) / 60;
                      const fields = readCalendarBlockFields(data);
                      if (selectedSeries && editingSeries && updateRecurringSeries) {
                        if (data.get('date') !== selectedSession.date) {
                          pushToast('Choose This occurrence to move it to a different date.');
                          return;
                        }
                        const weekdays = data.getAll('repeat-day').map(Number);
                        if (!weekdays.length) {
                          pushToast('Choose at least one weekday.');
                          return;
                        }
                        updateRecurringSeries(Number(selectedSeriesId), title, startHour, durationHours, fields, String(data.get('subject') ?? ''), weekdays);
                        setEditScope({ id: null, series: false });
                      } else {
                        const date = String(data.get('date'));
                        const dayIndex = (new Date(date + 'T12:00:00').getDay() + 6) % 7;
                        updateSession(selectedSession.id, { title, date, dayIndex, startHour, durationHours, ...fields, subjectId: String(data.get('subject') ?? '') });
                      }
                      pushToast('Calendar changes saved');
                    }}>
                      {selectedSeries && updateRecurringSeries && <label>Apply to <select name="scope" value={editingSeries ? 'series' : 'one'}
                        onChange={event => setEditScope({ id: selectedSessionId, series: event.target.value === 'series' })}>
                        <option value="one">This occurrence</option><option value="series">Entire series</option>
                      </select></label>}
                      <label>Title <input name="title" required defaultValue={formSession.title} /></label>
                      <label>Date <input name="date" type="date" required defaultValue={formSession.date} /></label>
                      <label>Starts <input name="start" type="time" required defaultValue={new Date(Math.round(formSession.startHour * 60) * 60000).toISOString().slice(11,16)} /></label>
                      <label>Duration in minutes <input name="duration" type="number" min="1" max="1440" required defaultValue={Math.round(formSession.durationHours * 60)} /></label>
                      <CalendarBlockFields session={formSession} subjects={subjects} />
                      {selectedSeries && editingSeries && <RepeatWeekdays selected={recurringWeekdays(selectedSeries)} />}
                      <button type="submit" className="rounded bg-[var(--accent)] p-2 text-white">Save event</button>
                    </form>
                    {/* Resize / Status Controls */}
                    <div className="pt-2 space-y-2" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                      <div className="flex items-center justify-between text-[12px]">
                        <span className="text-[var(--text-muted)]">Duration</span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleResizeDuration(selectedSession, -0.5)}
                            className="px-2 py-0.5 rounded text-[11.5px] hover:bg-[var(--bg-surface-hover)]"
                            style={{ border: '1px solid var(--border-subtle)' }}
                          >
                            −30m
                          </button>
                          <button
                            type="button"
                            onClick={() => handleResizeDuration(selectedSession, 0.5)}
                            className="px-2 py-0.5 rounded text-[11.5px] hover:bg-[var(--bg-surface-hover)]"
                            style={{ border: '1px solid var(--border-subtle)' }}
                          >
                            +30m
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[12px]">
                        <span className="text-[var(--text-muted)]">Status</span>
                        <select
                          value={selectedSession.status}
                          onChange={(e) =>
                            updateSession(selectedSession.id, {
                              status: e.target.value as StudySession['status'],
                            })
                          }
                          aria-label="Session status"
                          className="px-2 py-1 rounded-md text-[12px]"
                          style={{
                            backgroundColor: 'var(--bg-surface-subtle)',
                            border: '1px solid var(--border-subtle)',
                            color: 'var(--text-primary)',
                          }}
                        >
                          <option value="upcoming">Upcoming</option>
                          <option value="completed">Completed</option>
                          <option value="missed">Missed</option>
                        </select>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          deleteSession(selectedSession.id);
                          setSelectedSessionId(null);
                        }}
                        className="w-full mt-2 py-1.5 rounded-lg text-[12px] font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 inline-flex items-center justify-center gap-1.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Remove Session
                      </button>
                    </div>
                  </div>
                );
              })()
            ) : (
              <div className="py-6 text-center text-[12.5px] text-[var(--text-muted)]">
                Select any study block on the calendar to inspect or edit duration and status.
              </div>
            )}
          </div>

          {/* Smart Rescheduling Suggestion Panel */}
          {missed && slot && <div
            className="rounded-xl p-4 space-y-2.5"
            style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--accent-border)',
            }}
          >
            <div className="flex items-center gap-1.5 text-[12.5px] font-semibold" style={{ color: 'var(--accent)' }}>
              <Sparkles className="w-3.5 h-3.5" />
              Smart Rescheduling
            </div>

            {(
              <>
                <p className="text-[12px] text-[var(--text-secondary)] leading-relaxed">
                  1 missed session detected: <strong className="text-[var(--text-primary)]">{missed.title}</strong> ({missed.date} · {formatHourLabel(missed.startHour)}).
                </p>
                <div className="p-2.5 rounded-lg text-[12px]" style={{ backgroundColor: 'var(--bg-surface-subtle)' }}>
                  <div className="flex items-center gap-1.5 font-medium text-[var(--text-primary)]">
                    <GripVertical className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                    Suggested Slot: {slot.day.short} {formatHourLabel(slot.start)}
                  </div>
                  <div className="text-[11.5px] text-[var(--text-muted)] mt-0.5">
                    {Math.round(missed.durationHours * 60)} min available on {slot.day.date}.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={applySmartReschedule}
                  className="w-full py-1.5 rounded-lg text-[12.5px] font-medium inline-flex items-center justify-center gap-1.5"
                  style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' }}
                >
                  Apply Suggestion <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </>
            )}
          </div>}
        </div>
      </div>
    </div>
  );
};
