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
import { useApp } from '../../context/AppContext';
import type { StudySession } from '../../types/studyflow';
import { formatHourLabel } from '../../utils/studyLogic';

type PlannerMode = 'day' | 'week' | 'month' | 'agenda';

const DAYS = [
  { short: 'Mon', num: 16, date: '2026-11-16' },
  { short: 'Tue', num: 17, date: '2026-11-17' },
  { short: 'Wed', num: 18, date: '2026-11-18' },
  { short: 'Thu', num: 19, date: '2026-11-19' },
  { short: 'Fri', num: 20, date: '2026-11-20' },
  { short: 'Sat', num: 21, date: '2026-11-21' },
  { short: 'Sun', num: 22, date: '2026-11-22', isToday: true },
];

const HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19];
const HOUR_HEIGHT = 60;

export const PlannerView: React.FC = () => {
  const {
    sessions,
    subjects,
    updateSession,
    deleteSession,
    setActiveModal,
    pushToast,
  } = useApp();

  const [viewMode, setViewMode] = useState<PlannerMode>('week');
  const [activeDayIdx, setActiveDayIdx] = useState<number>(6);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(sessions[1]?.id ?? null);
  const [dragSessionId, setDragSessionId] = useState<string | null>(null);
  const [showRescheduleApplied, setShowRescheduleApplied] = useState(false);

  const selectedSession = sessions.find((s) => s.id === selectedSessionId) ?? null;

  const getWorkloadForDay = (dayIdx: number) =>
    sessions
      .filter((s) => s.dayIndex === dayIdx)
      .reduce((acc, s) => acc + s.durationHours, 0);

  const handleDropOnCell = (dayIdx: number, hour: number) => {
    if (!dragSessionId) return;
    const targetDay = DAYS[dayIdx];
    updateSession(dragSessionId, {
      dayIndex: dayIdx,
      date: targetDay.date,
      startHour: hour,
      status: dayIdx === 6 && hour >= 11 ? 'upcoming' : 'upcoming',
    });
    pushToast(`Rescheduled block to ${targetDay.short} ${formatHourLabel(hour)}`);
    setDragSessionId(null);
  };

  const handleResizeDuration = (ses: StudySession, delta: number) => {
    const next = Math.max(0.5, Math.min(4, ses.durationHours + delta));
    updateSession(ses.id, { durationHours: next });
  };

  const applySmartReschedule = () => {
    const missed = sessions.find((s) => s.status === 'missed');
    if (missed) {
      updateSession(missed.id, {
        dayIndex: 6,
        date: '2026-11-22',
        startHour: 18,
        status: 'upcoming',
      });
    }
    setShowRescheduleApplied(true);
    pushToast('Smart reschedule applied — moved deferred ECON 205 lab');
  };

  const renderSessionBlock = (ses: StudySession) => {
    const sub = subjects.find((s) => s.id === ses.subjectId);
    const isSelected = ses.id === selectedSessionId;
    const topPx = (ses.startHour - 8) * HOUR_HEIGHT;
    const heightPx = Math.max(32, ses.durationHours * HOUR_HEIGHT - 4);
    const color = sub?.color ?? '#4F46E5';

    return (
      <div
        key={ses.id}
        draggable
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
        aria-label={`${ses.title}, ${sub?.code}, ${formatHourLabel(ses.startHour)}`}
        className="absolute left-1 right-1 rounded-lg px-2 py-1 cursor-pointer select-none overflow-hidden transition-shadow group"
        style={{
          top: topPx,
          height: heightPx,
          backgroundColor: `${color}18`,
          border: isSelected ? `1.5px solid ${color}` : `1px solid ${color}45`,
          opacity: ses.status === 'missed' ? 0.72 : 1,
        }}
      >
        <div className="flex items-start justify-between gap-1">
          <span className="text-[10.5px] font-semibold truncate" style={{ color }}>
            {sub?.code}
          </span>
          <span className="flex items-center gap-1 shrink-0">
            {ses.recurring && <Repeat className="w-2.5 h-2.5 text-[var(--text-muted)]" />}
            {ses.status === 'completed' && <CheckCircle2 className="w-3 h-3 text-emerald-500" />}
            {ses.status === 'missed' && <AlertCircle className="w-3 h-3 text-rose-500" />}
          </span>
        </div>
        <div className={`text-[11.5px] font-medium text-[var(--text-primary)] leading-tight mt-0.5 ${heightPx < 66 ? 'truncate' : 'line-clamp-2'}`}>
          {ses.title}
        </div>
        {heightPx >= 72 && (
          <div className="text-[10.5px] font-mono-num text-[var(--text-muted)] mt-0.5">
            {formatHourLabel(ses.startHour)} · {ses.durationHours}h
          </div>
        )}
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
            Nov 16 – Nov 22, 2026 · Drag any study block to reschedule across time slots
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
                    PST
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
                        {h === 12 ? '12 PM' : h > 12 ? `${h - 12} PM` : `${h} AM`}
                      </div>
                    ))}
                  </div>

                  {/* Day Columns */}
                  {(viewMode === 'week' ? DAYS : [DAYS[activeDayIdx]]).map((d, idx) => {
                    const realIdx = viewMode === 'week' ? idx : activeDayIdx;
                    const daySessions = sessions.filter((s) => s.dayIndex === realIdx);

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
                            style={{ top: (10.25 - 8) * HOUR_HEIGHT }}
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
                {Array.from({ length: 28 }, (_, i) => {
                  const dayNum = i + 2; // Nov 2..29
                  const dateIso = `2026-11-${String(dayNum).padStart(2, '0')}`;
                  const dayEvents = sessions.filter((s) => s.date === dateIso);
                  const isToday = dayNum === 22;

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
                            {dayEvents.reduce((a, b) => a + b.durationHours, 0)}h
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
          <div
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

            {!showRescheduleApplied ? (
              <>
                <p className="text-[12px] text-[var(--text-secondary)] leading-relaxed">
                  1 missed session detected: <strong className="text-[var(--text-primary)]">ECON 205 Lab Walkthrough</strong> (Thu 3:00 PM).
                </p>
                <div className="p-2.5 rounded-lg text-[12px]" style={{ backgroundColor: 'var(--bg-surface-subtle)' }}>
                  <div className="flex items-center gap-1.5 font-medium text-[var(--text-primary)]">
                    <GripVertical className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                    Suggested Slot: Sun 6:00 PM
                  </div>
                  <div className="text-[11.5px] text-[var(--text-muted)] mt-0.5">
                    Preserves 4.5h weekday load balance before Midterm III.
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
            ) : (
              <div className="text-[12.5px] text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                All deferred blocks rebalanced into open slots.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
