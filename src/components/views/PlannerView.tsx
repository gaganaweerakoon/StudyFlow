import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  Bell,
  Calendar as CalendarIcon,
  CalendarPlus,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Coffee,
  Copy,
  Edit3,
  GripVertical,
  MapPin,
  Moon,
  Play,
  Plus,
  Repeat,
  RotateCcw,
  Search,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { localDay } from '../../assistant/workspaceContext';
import { useApp } from '../../context/AppContext';
import { recurringSeriesTemplate, recurringWeekdays } from '../../desktop/legacy';
import type { StudySession, TaskItem } from '../../types/studyflow';
import { layoutCalendarDay } from '../../utils/calendarLayout';
import { formatHourLabel } from '../../utils/studyLogic';
import { CalendarBlockFields, readCalendarBlockFields, RepeatWeekdays } from '../shell/CalendarBlockFields';
import { readSessionTimeFields, SessionTimeFields } from '../shell/SessionTimeFields';

type PlannerMode = 'day' | 'week' | 'month' | 'agenda';
type AgendaStatusFilter = 'all' | 'upcoming' | 'completed' | 'missed';
type DragPayload =
  | { kind: 'session'; id: string }
  | { kind: 'task'; task: TaskItem };

const WEEKDAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const HOURS = Array.from({ length: 24 }, (_, hour) => hour);
const HOUR_HEIGHT = 60;

function parseIso(iso: string): Date {
  return new Date(`${iso}T12:00:00`);
}

function addDays(iso: string, delta: number): string {
  const d = parseIso(iso);
  d.setDate(d.getDate() + delta);
  return localDay(d);
}

function addMonths(iso: string, delta: number): string {
  const d = parseIso(iso);
  const targetDay = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + delta);
  const maxDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(targetDay, maxDay));
  return localDay(d);
}

function getWeekdayIndex(iso: string): number {
  return (parseIso(iso).getDay() + 6) % 7;
}

function getWeekStart(iso: string): string {
  return addDays(iso, -getWeekdayIndex(iso));
}

function formatShortDate(iso: string): string {
  return parseIso(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatFullDate(iso: string): string {
  return parseIso(iso).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatMonthYear(iso: string): string {
  return parseIso(iso).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function formatWeekRange(startIso: string, endIso: string): string {
  const s = parseIso(startIso);
  const e = parseIso(endIso);
  if (s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear()) {
    return `${s.toLocaleDateString('en-US', { month: 'short' })} ${s.getDate()} – ${e.getDate()}, ${e.getFullYear()}`;
  }
  return `${s.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${e.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
}

function formatDurationCompact(hours: number): string {
  const mins = Math.round(hours * 60);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  return `${m}m`;
}

function isStudyBlock(ses: StudySession): boolean {
  return ses.countsTowardStudy !== false && ses.blockType !== 'sleep' && ses.blockType !== 'free';
}

export const PlannerView: React.FC = () => {
  const {
    sessions,
    legacyCalendar,
    subjects,
    tasks,
    preferences,
    addSession,
    updateSession,
    updateRecurringSeries,
    recurringSeries,
    deleteSession,
    setFocusContext,
    setRoute,
    pushToast,
  } = useApp();

  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const todayIso = localDay(now);
  const currentHourFloat = now.getHours() + now.getMinutes() / 60;

  const [viewMode, setViewMode] = useState<PlannerMode>('week');
  const [anchorDate, setAnchorDate] = useState<string>(todayIso);
  const [subjectFilter, setSubjectFilter] = useState<string>('all');
  const [studyOnly, setStudyOnly] = useState<boolean>(false);
  const [agendaQuery, setAgendaQuery] = useState<string>('');
  const [agendaStatus, setAgendaStatus] = useState<AgendaStatusFilter>('all');
  const [agendaScope, setAgendaScope] = useState<'week' | 'all'>('all');

  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editScope, setEditScope] = useState<{ id: string | null; series: boolean }>({
    id: null,
    series: false,
  });

  const [quickCreateDraft, setQuickCreateDraft] = useState<{
    date: string;
    startHour: number;
    durationHours: number;
    title?: string;
    subjectId?: string;
  } | null>(null);
  const [quickRepeat, setQuickRepeat] = useState<'once' | 'daily' | 'weekly'>('once');

  const [dragPayload, setDragPayload] = useState<DragPayload | null>(null);
  const [dragOverCell, setDragOverCell] = useState<{ date: string; hour: number } | null>(null);

  const gridScrollRef = useRef<HTMLDivElement>(null);
  const editDialogRef = useRef<HTMLDialogElement>(null);
  const createDialogRef = useRef<HTMLDialogElement>(null);

  // Auto-scroll time grid to working hours (7:00 AM) on initial mount and view switches
  useEffect(() => {
    if (viewMode !== 'week' && viewMode !== 'day') return;
    const el = gridScrollRef.current;
    if (!el) return;
    const targetHour = Math.max(0, Math.min(18, Math.floor(Math.min(7, currentHourFloat - 1))));
    el.scrollTop = targetHour * HOUR_HEIGHT;
  }, [viewMode]);

  const scrollToNow = () => {
    const el = gridScrollRef.current;
    if (!el) return;
    el.scrollTo({
      top: Math.max(0, (currentHourFloat - 2) * HOUR_HEIGHT),
      behavior: 'smooth',
    });
  };

  // Sync native modals cleanly
  const editingSession = useMemo(
    () => sessions.find((s) => s.id === editingSessionId) ?? null,
    [sessions, editingSessionId],
  );
  const selectedSession = useMemo(
    () => sessions.find((s) => s.id === selectedSessionId) ?? null,
    [sessions, selectedSessionId],
  );

  useEffect(() => {
    const dialog = editDialogRef.current;
    if (!dialog) return;
    if (editingSession && !dialog.open) dialog.showModal();
    if (!editingSession && dialog.open) dialog.close();
  }, [editingSession]);

  useEffect(() => {
    const dialog = createDialogRef.current;
    if (!dialog) return;
    if (quickCreateDraft && !dialog.open) dialog.showModal();
    if (!quickCreateDraft && dialog.open) dialog.close();
  }, [quickCreateDraft]);

  const editingSeriesId = /^legacy-series-(\d+)-/.exec(editingSession?.id ?? '')?.[1];
  const editingSeries = recurringSeries.find((row) => row.id === Number(editingSeriesId));
  const editingEntireSeries = editScope.id === editingSessionId && editScope.series;

  // Filtered sessions
  const visibleSessions = useMemo(() => {
    return sessions.filter((ses) => {
      if (studyOnly && !isStudyBlock(ses)) return false;
      if (subjectFilter !== 'all') {
        if (!isStudyBlock(ses)) return false;
        if (ses.subjectId !== subjectFilter) return false;
      }
      return true;
    });
  }, [sessions, subjectFilter, studyOnly]);

  // Build visible week days around anchorDate
  const weekStartIso = getWeekStart(anchorDate);
  const weekDays = useMemo(() => {
    return WEEKDAY_SHORT.map((short, index) => {
      const date = addDays(weekStartIso, index);
      const d = parseIso(date);
      return {
        short,
        dayIndex: index,
        num: d.getDate(),
        date,
        isToday: date === todayIso,
      };
    });
  }, [weekStartIso, todayIso]);

  const activeDayObj = useMemo(() => {
    const found = weekDays.find((d) => d.date === anchorDate);
    if (found) return found;
    const d = parseIso(anchorDate);
    return {
      short: WEEKDAY_SHORT[getWeekdayIndex(anchorDate)],
      dayIndex: getWeekdayIndex(anchorDate),
      num: d.getDate(),
      date: anchorDate,
      isToday: anchorDate === todayIso,
    };
  }, [weekDays, anchorDate, todayIso]);

  const displayedDays = viewMode === 'week' ? weekDays : [activeDayObj];

  // Layout map for visible week (for filtered rendering) and full sessions (for accurate workload & conflict checks)
  const filteredBlocksByDate = useMemo(
    () => new Map(weekDays.map((day) => [day.date, layoutCalendarDay(visibleSessions, day.date)])),
    [weekDays, visibleSessions],
  );
  const allBlocksByDate = useMemo(
    () => new Map(weekDays.map((day) => [day.date, layoutCalendarDay(sessions, day.date)])),
    [weekDays, sessions],
  );

  const getWorkloadForDate = (dateIso: string) =>
    (allBlocksByDate.get(dateIso) ?? layoutCalendarDay(sessions, dateIso))
      .filter((block) => isStudyBlock(block.session))
      .reduce((total, block) => total + (block.to - block.from), 0);

  // Weekly metrics & per-subject breakdown for the currently viewed week
  const weekSummary = useMemo(() => {
    let totalStudyHours = 0;
    let completedHours = 0;
    let upcomingCount = 0;
    let completedCount = 0;
    let missedCount = 0;
    const bySubject = new Map<string, number>();
    const countedIds = new Set<string>();

    for (const day of weekDays) {
      const blocks = allBlocksByDate.get(day.date) ?? [];
      for (const block of blocks) {
        if (!isStudyBlock(block.session)) continue;
        const hrs = block.to - block.from;
        totalStudyHours += hrs;
        if (block.session.status === 'completed') completedHours += hrs;
        if (block.session.subjectId) {
          bySubject.set(
            block.session.subjectId,
            (bySubject.get(block.session.subjectId) ?? 0) + hrs,
          );
        }
        if (!block.continued && !countedIds.has(block.session.id)) {
          countedIds.add(block.session.id);
          if (block.session.status === 'completed') completedCount += 1;
          else if (block.session.status === 'missed') missedCount += 1;
          else upcomingCount += 1;
        }
      }
    }

    const subjectBreakdown = subjects
      .map((sub) => ({
        subject: sub,
        hours: Number((bySubject.get(sub.id) ?? 0).toFixed(1)),
      }))
      .filter((row) => row.hours > 0)
      .sort((a, b) => b.hours - a.hours);

    return {
      totalStudyHours: Number(totalStudyHours.toFixed(1)),
      completedHours: Number(completedHours.toFixed(1)),
      upcomingCount,
      completedCount,
      missedCount,
      subjectBreakdown,
    };
  }, [weekDays, allBlocksByDate, subjects]);

  // Month grid cells
  const monthMeta = useMemo(() => {
    const anchor = parseIso(anchorDate);
    const year = anchor.getFullYear();
    const month = anchor.getMonth();
    const firstOfMonth = new Date(year, month, 1, 12);
    const offset = (firstOfMonth.getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: Array<{ dateIso: string; dayNum: number; isToday: boolean } | null> = [];
    for (let i = 0; i < offset; i++) cells.push(null);
    for (let dayNum = 1; dayNum <= daysInMonth; dayNum++) {
      const dateIso = localDay(new Date(year, month, dayNum, 12));
      cells.push({ dateIso, dayNum, isToday: dateIso === todayIso });
    }
    return { cells, label: formatMonthYear(anchorDate) };
  }, [anchorDate, todayIso]);

  // Conflict-free slot finder starting from a given date
  const findOpenSlot = (
    durationHours: number,
    startFromIso: string,
    maxDays = 7,
  ): { date: string; startHour: number } | null => {
    for (let offset = 0; offset < maxDays; offset++) {
      const dateIso = addDays(startFromIso, offset);
      const blocks = layoutCalendarDay(sessions, dateIso);
      for (let start = 8; start + durationHours <= 22; start += 0.5) {
        if (dateIso === todayIso && start <= currentHourFloat + 0.25) continue;
        const conflict = blocks.some(
          (block) => !(start >= block.to || start + durationHours <= block.from),
        );
        if (!conflict) return { date: dateIso, startHour: start };
      }
    }
    return null;
  };

  // Smart Rescheduling for missed study sessions
  const missedSessions = useMemo(
    () =>
      sessions
        .filter((s) => s.status === 'missed' && isStudyBlock(s) && s.date <= todayIso)
        .sort((a, b) => a.date.localeCompare(b.date) || a.startHour - b.startHour),
    [sessions, todayIso],
  );
  const primaryMissed = missedSessions[0] ?? null;
  const suggestedSlot = useMemo(
    () => (primaryMissed ? findOpenSlot(primaryMissed.durationHours, todayIso, 7) : null),
    [primaryMissed, sessions, todayIso, currentHourFloat],
  );

  const applySmartReschedule = () => {
    if (!primaryMissed || !suggestedSlot) return;
    updateSession(primaryMissed.id, {
      date: suggestedSlot.date,
      dayIndex: getWeekdayIndex(suggestedSlot.date),
      startHour: suggestedSlot.startHour,
      status: 'upcoming',
    });
    setAnchorDate(suggestedSlot.date);
    setSelectedSessionId(primaryMissed.id);
    pushToast(
      `Rescheduled "${primaryMissed.title}" to ${formatShortDate(suggestedSlot.date)} · ${formatHourLabel(suggestedSlot.startHour)}`,
    );
  };

  // Unscheduled open tasks queue (for drag-to-schedule & 1-click auto-slot)
  const unscheduledTasks = useMemo(() => {
    const scheduledTitles = new Set(
      sessions.filter((s) => s.status !== 'missed').map((s) => s.title.trim().toLowerCase()),
    );
    const priorityRank = { high: 0, medium: 1, low: 2 };
    return tasks
      .filter((t) => t.status !== 'done' && !scheduledTitles.has(t.title.trim().toLowerCase()))
      .filter((t) => subjectFilter === 'all' || t.subjectId === subjectFilter)
      .sort((a, b) => priorityRank[a.priority] - priorityRank[b.priority] || a.dueDate.localeCompare(b.dueDate))
      .slice(0, 5);
  }, [tasks, sessions, subjectFilter]);

  const scheduleTaskAt = (task: TaskItem, dateIso: string, startHour: number) => {
    const durationHours = Math.max(
      0.5,
      Math.min(4, Math.round((task.estimatedMinutes / 60) * 2) / 2 || 1),
    );
    addSession({
      title: task.title,
      subjectId: task.subjectId,
      date: dateIso,
      dayIndex: getWeekdayIndex(dateIso),
      startHour,
      durationHours,
      status: 'upcoming',
      blockType: 'study',
      countsTowardStudy: true,
      location: 'Study Workspace',
      notes: task.description,
    });
    setAnchorDate(dateIso);
    pushToast(`Scheduled "${task.title}" · ${formatShortDate(dateIso)} ${formatHourLabel(startHour)}`);
  };

  const handleAutoSlotTask = (task: TaskItem) => {
    const durationHours = Math.max(
      0.5,
      Math.min(4, Math.round((task.estimatedMinutes / 60) * 2) / 2 || 1),
    );
    const slot = findOpenSlot(durationHours, anchorDate >= todayIso ? anchorDate : todayIso, 7);
    if (!slot) {
      openQuickCreate(anchorDate, 14, durationHours, task.title, task.subjectId);
      return;
    }
    scheduleTaskAt(task, slot.date, slot.startHour);
  };

  // Navigation handlers
  const handleStep = (direction: -1 | 1) => {
    if (viewMode === 'day') {
      setAnchorDate((prev) => addDays(prev, direction));
    } else if (viewMode === 'month') {
      setAnchorDate((prev) => addMonths(prev, direction));
    } else {
      setAnchorDate((prev) => addDays(prev, direction * 7));
    }
  };

  const handleJumpToday = () => {
    setAnchorDate(todayIso);
    if (viewMode === 'week' || viewMode === 'day') {
      window.setTimeout(scrollToNow, 30);
    }
  };

  const openQuickCreate = (
    date: string,
    startHour = 14,
    durationHours = 1,
    title = '',
    subjectId?: string,
  ) => {
    setQuickRepeat('once');
    setQuickCreateDraft({ date, startHour, durationHours, title, subjectId });
  };

  const handleDropOnCell = (dateIso: string, dayIndex: number, hour: number) => {
    setDragOverCell(null);
    if (!dragPayload) return;
    if (dragPayload.kind === 'session') {
      updateSession(dragPayload.id, {
        dayIndex,
        date: dateIso,
        startHour: hour,
        status: 'upcoming',
      });
      pushToast(`Moved block to ${WEEKDAY_SHORT[dayIndex]} ${formatHourLabel(hour)}`);
    } else {
      scheduleTaskAt(dragPayload.task, dateIso, hour);
    }
    setDragPayload(null);
  };

  const handleResizeDuration = (ses: StudySession, delta: number) => {
    const next = Math.max(0.5, Math.min(24, Number((ses.durationHours + delta).toFixed(2))));
    updateSession(ses.id, { durationHours: next });
  };

  const handleDuplicateNextDay = (ses: StudySession) => {
    const nextDate = addDays(ses.date, 1);
    addSession({
      title: ses.title,
      subjectId: ses.subjectId,
      date: nextDate,
      dayIndex: getWeekdayIndex(nextDate),
      startHour: ses.startHour,
      durationHours: ses.durationHours,
      status: 'upcoming',
      blockType: ses.blockType,
      countsTowardStudy: ses.countsTowardStudy,
      alarms: ses.alarms,
      location: ses.location,
      notes: ses.notes,
    });
    pushToast(`Duplicated to ${formatShortDate(nextDate)}`);
  };

  const handleStartFocus = (ses: StudySession) => {
    setFocusContext(ses.subjectId, ses.title, ses.id);
    setRoute('focus');
    pushToast(`Loaded "${ses.title}" in Focus Timer`);
  };

  const toggleCompleted = (ses: StudySession) => {
    const nextStatus: StudySession['status'] = ses.status === 'completed' ? 'upcoming' : 'completed';
    updateSession(ses.id, { status: nextStatus });
    pushToast(nextStatus === 'completed' ? 'Marked session completed' : 'Marked session upcoming');
  };

  // Period header label
  const periodLabel = useMemo(() => {
    if (viewMode === 'day') return formatFullDate(activeDayObj.date);
    if (viewMode === 'month') return monthMeta.label;
    return formatWeekRange(weekDays[0].date, weekDays[6].date);
  }, [viewMode, activeDayObj.date, monthMeta.label, weekDays]);

  const timezoneLabel = legacyCalendar
    ? Intl.DateTimeFormat(undefined, { timeZoneName: 'short' })
        .formatToParts(now)
        .find((part) => part.type === 'timeZoneName')?.value ?? 'LOC'
    : 'PST';

  // Agenda grouped sessions
  const agendaGroups = useMemo(() => {
    const q = agendaQuery.trim().toLowerCase();
    const weekStart = weekDays[0].date;
    const weekEnd = weekDays[6].date;

    const filtered = visibleSessions
      .filter((ses) => {
        if (agendaScope === 'week' && (ses.date < weekStart || ses.date > weekEnd)) return false;
        if (agendaStatus !== 'all' && ses.status !== agendaStatus) return false;
        if (q) {
          const sub = subjects.find((s) => s.id === ses.subjectId);
          const hay = `${ses.title} ${sub?.code ?? ''} ${sub?.name ?? ''} ${ses.location ?? ''} ${ses.notes ?? ''}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => a.date.localeCompare(b.date) || a.startHour - b.startHour);

    const groups: { date: string; sessions: StudySession[]; studyHours: number }[] = [];
    for (const ses of filtered) {
      let group = groups[groups.length - 1];
      if (!group || group.date !== ses.date) {
        group = { date: ses.date, sessions: [], studyHours: 0 };
        groups.push(group);
      }
      group.sessions.push(ses);
      if (isStudyBlock(ses)) group.studyHours += ses.durationHours;
    }
    return groups;
  }, [visibleSessions, agendaScope, agendaStatus, agendaQuery, weekDays, subjects]);

  const renderSessionBlock = ({
    session: ses,
    from,
    to,
    continued,
    column,
    columns,
  }: ReturnType<typeof layoutCalendarDay>[number]) => {
    const sub = subjects.find((s) => s.id === ses.subjectId);
    const isSelected = ses.id === selectedSessionId;
    const isSleep = ses.blockType === 'sleep';
    const isFree = ses.blockType === 'free' || (!isSleep && ses.countsTowardStudy === false);
    const topPx = from * HOUR_HEIGHT;
    const heightPx = Math.max(20, (to - from) * HOUR_HEIGHT - 2);
    const color = sub?.color ?? 'var(--accent)';
    const hasAlarm = Boolean(
      ses.alarms?.ringAtStart ||
        (ses.alarms?.advanceNoticeMin ?? 0) > 0 ||
        ses.alarms?.wakeAtEnd ||
        ses.alarms?.remindAtBedtime,
    );

    const blockStyle: React.CSSProperties = isSleep
      ? {
          top: topPx,
          left: `calc(${(column * 100) / columns}% + 2px)`,
          width: `calc(${100 / columns}% - 4px)`,
          height: heightPx,
          backgroundColor: 'var(--bg-surface-subtle)',
          border: isSelected ? '1.5px solid var(--accent)' : '1px solid var(--border-strong)',
          opacity: 0.9,
        }
      : isFree
        ? {
            top: topPx,
            left: `calc(${(column * 100) / columns}% + 2px)`,
            width: `calc(${100 / columns}% - 4px)`,
            height: heightPx,
            backgroundColor: 'transparent',
            border: isSelected ? '1.5px solid var(--accent)' : '1px dashed var(--border-strong)',
          }
        : {
            top: topPx,
            left: `calc(${(column * 100) / columns}% + 2px)`,
            width: `calc(${100 / columns}% - 4px)`,
            height: heightPx,
            backgroundColor: ses.status === 'missed' ? 'rgba(225, 29, 72, 0.09)' : `${color}18`,
            border: isSelected
              ? `1.5px solid ${color}`
              : ses.status === 'missed'
                ? '1px solid rgba(225, 29, 72, 0.42)'
                : `1px solid ${color}46`,
            opacity: ses.status === 'completed' ? 0.8 : 1,
          };

    return (
      <div
        key={`${ses.id}-${continued ? 'cont' : 'main'}`}
        draggable={!continued}
        onDragStart={(e) => {
          e.stopPropagation();
          e.dataTransfer.setData('text/plain', ses.id);
          e.dataTransfer.effectAllowed = 'move';
          setDragPayload({ kind: 'session', id: ses.id });
        }}
        onDragEnd={() => {
          setDragPayload(null);
          setDragOverCell(null);
        }}
        onClick={(e) => {
          e.stopPropagation();
          setSelectedSessionId(ses.id);
        }}
        onDoubleClick={(e) => {
          e.stopPropagation();
          setSelectedSessionId(ses.id);
          setEditingSessionId(ses.id);
        }}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setSelectedSessionId(ses.id);
          }
        }}
        aria-label={`${ses.title}, ${formatHourLabel(from)} to ${formatHourLabel(to % 24)}${continued ? ', continued' : ''}`}
        title={`${ses.title} · ${formatHourLabel(from)}–${formatHourLabel(to % 24)} · Click to inspect, double-click to edit`}
        className="absolute rounded-lg px-2 py-1 cursor-pointer select-none overflow-hidden transition-shadow hover:shadow-sm group z-[5]"
        style={blockStyle}
      >
        <div className="flex items-center gap-1 min-w-0">
          {isSleep ? (
            <Moon className="w-3 h-3 shrink-0 text-[var(--text-muted)]" />
          ) : isFree ? (
            <Coffee className="w-3 h-3 shrink-0 text-[var(--text-muted)]" />
          ) : ses.status === 'completed' ? (
            <CheckCircle2 className="w-3 h-3 shrink-0 text-emerald-600 dark:text-emerald-400" />
          ) : ses.status === 'missed' ? (
            <AlertCircle className="w-3 h-3 shrink-0 text-rose-600 dark:text-rose-400" />
          ) : (
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: color }}
            />
          )}
          <span
            className={`truncate text-[11.5px] leading-tight font-medium text-[var(--text-primary)] ${
              ses.status === 'completed' ? 'line-through decoration-[var(--text-muted)]' : ''
            }`}
          >
            {ses.title}
          </span>
          {(hasAlarm || ses.recurring) && heightPx >= 26 && (
            <span className="ml-auto flex items-center gap-1 shrink-0 text-[var(--text-muted)]">
              {hasAlarm && <Bell className="w-2.5 h-2.5" />}
              {ses.recurring && <Repeat className="w-2.5 h-2.5" />}
            </span>
          )}
        </div>

        {heightPx >= 34 && (
          <div className="mt-0.5 truncate text-[10.5px] leading-tight font-mono-num text-[var(--text-secondary)]">
            {formatHourLabel(from)} – {formatHourLabel(to % 24)}
            {continued ? ' · Cont.' : ''}
            {ses.status === 'missed' ? ' · Missed' : ''}
          </div>
        )}

        {heightPx >= 56 && (
          <div className="mt-0.5 truncate text-[10.5px] leading-tight text-[var(--text-muted)]">
            {isSleep
              ? 'Sleep block'
              : isFree
                ? 'Free time'
                : [sub?.code, ses.location].filter(Boolean).join(' · ') || 'Study session'}
          </div>
        )}

        {/* Bottom resize handle (+30m on click) */}
        {!continued && (
          <button
            type="button"
            className="absolute bottom-0 inset-x-0 h-2.5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-ns-resize"
            onClick={(e) => {
              e.stopPropagation();
              handleResizeDuration(ses, 0.5);
              pushToast(`Extended "${ses.title}" by 30m`);
            }}
            aria-label={`Extend ${ses.title} by 30 minutes`}
            title="Click bottom edge to extend +30m"
          >
            <span
              className="w-7 h-0.5 rounded-full"
              style={{ backgroundColor: isSleep || isFree ? 'var(--text-muted)' : color }}
            />
          </button>
        )}
      </div>
    );
  };

  const dailyGoal = Math.max(1, preferences.dailyGoalHours || 4.5);
  const weeklyGoal = Math.max(1, preferences.weeklyGoalHours || 32);
  const weeklyGoalPct = Math.min(100, Math.round((weekSummary.totalStudyHours / weeklyGoal) * 100));

  return (
    <div className="space-y-3.5 pb-6">
      {/* Top Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-baseline gap-2.5 flex-wrap">
            <h1 className="font-display text-[19px] font-semibold text-[var(--text-primary)] tracking-tight">
              Study Planner
            </h1>
            <span className="text-[13px] font-medium text-[var(--text-secondary)] font-mono-num">
              {periodLabel}
            </span>
          </div>
          <p className="text-[12px] text-[var(--text-muted)] mt-0.5 tabular-nums">
            {weekSummary.totalStudyHours}h planned this week · {weekSummary.completedCount} completed · Click any time slot to schedule or drag blocks to move
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {/* Date Navigator */}
          <div
            className="inline-flex items-center rounded-lg p-0.5 text-[12px]"
            style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <button
              type="button"
              onClick={() => handleStep(-1)}
              aria-label={`Previous ${viewMode}`}
              className="p-1.5 rounded-md text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleJumpToday}
              className="px-2.5 py-1 rounded-md font-medium text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] transition-colors whitespace-nowrap"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => handleStep(1)}
              aria-label={`Next ${viewMode}`}
              className="p-1.5 rounded-md text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] transition-colors"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* View Mode Segmented Control */}
          <div
            className="inline-flex items-center p-0.5 rounded-lg text-[12px]"
            style={{
              backgroundColor: 'var(--bg-surface-subtle)',
              border: '1px solid var(--border-subtle)',
            }}
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
                className="px-2.5 py-1 rounded-md capitalize font-medium transition-colors whitespace-nowrap"
                style={{
                  backgroundColor: viewMode === m ? 'var(--bg-surface)' : 'transparent',
                  color: viewMode === m ? 'var(--text-primary)' : 'var(--text-muted)',
                  boxShadow: viewMode === m ? 'var(--shadow-subtle)' : 'none',
                }}
              >
                {m}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => openQuickCreate(anchorDate, 14, 1.5)}
            className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-lg text-[12.5px] font-medium whitespace-nowrap shrink-0 transition-opacity hover:opacity-95"
            style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' }}
          >
            <Plus className="w-3.5 h-3.5" /> Schedule Block
          </button>
        </div>
      </div>

      {/* Interactive Filter Strip */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div
          className="flex items-center gap-1 flex-wrap"
          role="group"
          aria-label="Filter by subject"
        >
          <button
            type="button"
            onClick={() => setSubjectFilter('all')}
            className="px-2.5 py-1 rounded-md text-[12px] font-medium transition-colors whitespace-nowrap"
            style={{
              backgroundColor:
                subjectFilter === 'all' ? 'var(--bg-surface)' : 'transparent',
              color:
                subjectFilter === 'all' ? 'var(--text-primary)' : 'var(--text-muted)',
              border:
                subjectFilter === 'all'
                  ? '1px solid var(--border-strong)'
                  : '1px solid transparent',
            }}
          >
            All Subjects
          </button>
          {subjects.map((sub) => {
            const active = subjectFilter === sub.id;
            return (
              <button
                key={sub.id}
                type="button"
                onClick={() => setSubjectFilter(active ? 'all' : sub.id)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[12px] font-medium transition-colors whitespace-nowrap"
                style={{
                  backgroundColor: active ? `${sub.color}1C` : 'transparent',
                  color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
                  border: active ? `1px solid ${sub.color}55` : '1px solid transparent',
                }}
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: sub.color }}
                />
                <span>{sub.code}</span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setStudyOnly((v) => !v)}
            aria-pressed={studyOnly}
            className="px-2.5 py-1 rounded-md text-[11.5px] font-medium transition-colors whitespace-nowrap"
            style={{
              backgroundColor: studyOnly ? 'var(--accent-soft)' : 'var(--bg-surface)',
              color: studyOnly ? 'var(--accent)' : 'var(--text-secondary)',
              border: studyOnly ? '1px solid var(--accent-border)' : '1px solid var(--border-subtle)',
            }}
          >
            Study blocks only
          </button>
          {(viewMode === 'week' || viewMode === 'day') && (
            <button
              type="button"
              onClick={scrollToNow}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11.5px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] transition-colors whitespace-nowrap"
              style={{ border: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-surface)' }}
            >
              <Clock className="w-3 h-3" /> Current time
            </button>
          )}
        </div>
      </div>

      {/* Main Split: Calendar Workspace + Right Inspector & Planning Rail */}
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
            <div ref={gridScrollRef} className="h-[clamp(380px,68vh,760px)] overflow-auto">
              <div className={viewMode === 'week' ? 'min-w-[700px]' : 'min-w-[340px]'}>
                {/* Sticky Day Headers + Daily Workload Indicator */}
                <div
                  className="sticky top-0 z-20 grid"
                  style={{
                    gridTemplateColumns:
                      viewMode === 'week' ? '60px repeat(7, minmax(0, 1fr))' : '60px 1fr',
                    borderBottom: '1px solid var(--border-subtle)',
                    backgroundColor: 'var(--bg-surface-subtle)',
                  }}
                >
                  <div className="p-2 text-[10.5px] font-mono-num text-[var(--text-muted)] text-center self-center">
                    {timezoneLabel}
                  </div>
                  {displayedDays.map((d) => {
                    const loadHrs = getWorkloadForDate(d.date);
                    const loadPct = Math.min(100, Math.round((loadHrs / dailyGoal) * 100));
                    const isFocusedDay = d.date === anchorDate;
                    const overloaded = loadHrs > dailyGoal * 1.25;

                    return (
                      <div
                        key={d.date}
                        className="p-2 transition-colors"
                        style={{
                          borderLeft: '1px solid var(--border-subtle)',
                          backgroundColor:
                            isFocusedDay && viewMode === 'week'
                              ? 'var(--bg-surface)'
                              : 'transparent',
                        }}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <button
                            type="button"
                            onClick={() => setAnchorDate(d.date)}
                            onDoubleClick={() => {
                              setAnchorDate(d.date);
                              setViewMode('day');
                            }}
                            title="Click to select day, double-click for Day view"
                            className="flex items-center gap-1.5 text-left group"
                          >
                            <span className="text-[11px] font-medium text-[var(--text-muted)] group-hover:text-[var(--text-primary)]">
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
                          </button>
                          <button
                            type="button"
                            onClick={() => openQuickCreate(d.date, 10, 1)}
                            aria-label={`Add block on ${d.short} ${d.num}`}
                            title={`Schedule on ${d.short} ${d.num}`}
                            className="p-0.5 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] transition-colors"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>

                        {/* Daily workload bar against dailyGoalHours */}
                        <div
                          className="mt-1.5 flex items-center gap-1.5"
                          title={`${loadHrs.toFixed(1)}h of ${dailyGoal}h daily goal`}
                        >
                          <div
                            className="flex-1 h-1 rounded-full overflow-hidden"
                            style={{ backgroundColor: 'var(--border-subtle)' }}
                          >
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${loadPct}%`,
                                backgroundColor: overloaded ? '#D97706' : 'var(--accent)',
                              }}
                            />
                          </div>
                          <span className="font-mono-num text-[10px] text-[var(--text-muted)] tabular-nums">
                            {loadHrs.toFixed(1)}h
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Time grid body */}
                <div
                  className="grid relative"
                  style={{
                    gridTemplateColumns:
                      viewMode === 'week' ? '60px repeat(7, minmax(0, 1fr))' : '60px 1fr',
                    height: HOURS.length * HOUR_HEIGHT,
                  }}
                >
                  {/* Hour Labels */}
                  <div className="relative select-none">
                    {HOURS.map((h) => (
                      <div
                        key={h}
                        className="pr-2.5 text-right text-[10.5px] font-mono-num text-[var(--text-muted)]"
                        style={{ height: HOUR_HEIGHT, paddingTop: 3 }}
                      >
                        {h === 0 ? '12 AM' : `${h % 12 || 12} ${h < 12 ? 'AM' : 'PM'}`}
                      </div>
                    ))}
                  </div>

                  {/* Day Columns */}
                  {displayedDays.map((d) => {
                    const dayBlocks =
                      filteredBlocksByDate.get(d.date) ?? layoutCalendarDay(visibleSessions, d.date);

                    return (
                      <div
                        key={d.date}
                        className="relative"
                        style={{
                          borderLeft: '1px solid var(--border-subtle)',
                          backgroundColor: d.isToday ? 'var(--accent-soft)' : 'transparent',
                        }}
                      >
                        {/* Interactive Hour Cells (Click to schedule / Drop target) */}
                        {HOURS.map((h) => {
                          const isDropTarget =
                            dragOverCell?.date === d.date && dragOverCell.hour === h;

                          return (
                            <div
                              key={h}
                              onClick={() => openQuickCreate(d.date, h, 1)}
                              onDragOver={(e) => {
                                e.preventDefault();
                                if (dragOverCell?.date !== d.date || dragOverCell?.hour !== h) {
                                  setDragOverCell({ date: d.date, hour: h });
                                }
                              }}
                              onDragLeave={() => {
                                if (dragOverCell?.date === d.date && dragOverCell?.hour === h) {
                                  setDragOverCell(null);
                                }
                              }}
                              onDrop={(e) => {
                                e.preventDefault();
                                handleDropOnCell(d.date, d.dayIndex, h);
                              }}
                              className="relative group/cell cursor-pointer transition-colors"
                              style={{
                                height: HOUR_HEIGHT,
                                borderBottom: '1px solid var(--border-subtle)',
                                backgroundColor: isDropTarget ? 'var(--accent-soft)' : undefined,
                                outline: isDropTarget ? '1.5px dashed var(--accent)' : undefined,
                                outlineOffset: -2,
                              }}
                            >
                              {/* Subtle half-hour guide line */}
                              <div
                                className="absolute left-0 right-0 pointer-events-none"
                                style={{
                                  top: HOUR_HEIGHT / 2,
                                  borderTop: '1px dashed var(--chart-grid)',
                                }}
                              />
                              {isDropTarget ? (
                                <span
                                  className="absolute inset-x-1.5 top-1 text-[10.5px] font-medium font-mono-num pointer-events-none truncate"
                                  style={{ color: 'var(--accent)' }}
                                >
                                  Drop · {formatHourLabel(h)}
                                </span>
                              ) : (
                                <span className="absolute right-1.5 top-1 text-[10px] font-mono-num text-[var(--text-muted)] opacity-0 group-hover/cell:opacity-75 transition-opacity pointer-events-none">
                                  + {formatHourLabel(h)}
                                </span>
                              )}
                            </div>
                          );
                        })}

                        {/* Current Time Line */}
                        {d.isToday && (
                          <div
                            className="absolute left-0 right-0 z-10 pointer-events-none flex items-center"
                            style={{ top: currentHourFloat * HOUR_HEIGHT }}
                          >
                            <span
                              className="w-2 h-2 rounded-full -ml-1 shrink-0"
                              style={{ backgroundColor: '#E11D48' }}
                            />
                            <div className="flex-1 h-[1.5px]" style={{ backgroundColor: '#E11D48' }} />
                            <span
                              className="mr-1 px-1 py-px rounded text-[9.5px] font-mono-num font-semibold text-white shrink-0"
                              style={{ backgroundColor: '#E11D48' }}
                            >
                              {formatHourLabel(currentHourFloat)}
                            </span>
                          </div>
                        )}

                        {dayBlocks.map((entry) => renderSessionBlock(entry))}
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
                {WEEKDAY_SHORT.map((d) => (
                  <div key={d}>{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1.5">
                {monthMeta.cells.map((cell, idx) => {
                  if (!cell) {
                    return <div aria-hidden="true" key={`blank-${idx}`} className="min-h-[96px]" />;
                  }
                  const dayBlocks = layoutCalendarDay(visibleSessions, cell.dateIso);
                  const studyHrs = layoutCalendarDay(sessions, cell.dateIso)
                    .filter((b) => isStudyBlock(b.session))
                    .reduce((sum, b) => sum + (b.to - b.from), 0);

                  return (
                    <div
                      key={cell.dateIso}
                      className="min-h-[96px] rounded-lg p-1.5 flex flex-col group/month transition-colors"
                      style={{
                        backgroundColor: cell.isToday
                          ? 'var(--accent-soft)'
                          : 'var(--bg-surface-subtle)',
                        border: cell.isToday
                          ? '1px solid var(--accent)'
                          : '1px solid var(--border-subtle)',
                      }}
                    >
                      <div className="flex items-center justify-between text-[11px] font-mono-num mb-1">
                        <button
                          type="button"
                          onClick={() => {
                            setAnchorDate(cell.dateIso);
                            setViewMode('day');
                          }}
                          className={`px-1 rounded hover:underline ${
                            cell.isToday
                              ? 'font-bold text-[var(--accent)]'
                              : 'text-[var(--text-secondary)]'
                          }`}
                          title="Open in Day view"
                        >
                          {cell.dayNum}
                        </button>
                        <div className="flex items-center gap-1">
                          {studyHrs > 0 && (
                            <span className="text-[10px] text-[var(--text-muted)] tabular-nums">
                              {Number(studyHrs.toFixed(1))}h
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => openQuickCreate(cell.dateIso, 14, 1)}
                            aria-label={`Schedule on ${cell.dateIso}`}
                            className="p-0.5 rounded opacity-0 group-hover/month:opacity-100 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] transition-opacity"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      <div className="space-y-1 flex-1">
                        {dayBlocks.slice(0, 3).map((block) => {
                          const ses = block.session;
                          const sub = subjects.find((s) => s.id === ses.subjectId);
                          const color = sub?.color ?? 'var(--accent)';
                          return (
                            <button
                              key={`${ses.id}-${block.continued ? 'c' : 'm'}`}
                              type="button"
                              onClick={() => setSelectedSessionId(ses.id)}
                              className="w-full text-left text-[10.5px] px-1.5 py-0.5 rounded truncate font-medium flex items-center gap-1 transition-colors hover:brightness-95"
                              style={{
                                backgroundColor: isStudyBlock(ses)
                                  ? `${color}22`
                                  : 'var(--bg-surface)',
                                color: 'var(--text-primary)',
                                border:
                                  selectedSessionId === ses.id
                                    ? `1px solid ${color}`
                                    : '1px solid transparent',
                              }}
                            >
                              <span
                                className="w-1.5 h-1.5 rounded-full shrink-0"
                                style={{
                                  backgroundColor: isStudyBlock(ses) ? color : 'var(--text-muted)',
                                }}
                              />
                              <span className="truncate">{ses.title}</span>
                            </button>
                          );
                        })}
                        {dayBlocks.length > 3 && (
                          <button
                            type="button"
                            onClick={() => {
                              setAnchorDate(cell.dateIso);
                              setViewMode('day');
                            }}
                            className="text-[10px] text-[var(--text-muted)] hover:text-[var(--text-primary)] px-1"
                          >
                            +{dayBlocks.length - 3} more
                          </button>
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
            <div>
              {/* Agenda Toolbar */}
              <div
                className="px-4 py-3 flex flex-wrap items-center justify-between gap-2.5"
                style={{ borderBottom: '1px solid var(--border-subtle)' }}
              >
                <div className="relative flex-1 min-w-[200px] max-w-xs">
                  <Search className="w-3.5 h-3.5 text-[var(--text-muted)] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="search"
                    value={agendaQuery}
                    onChange={(e) => setAgendaQuery(e.target.value)}
                    placeholder="Search sessions, subjects, rooms..."
                    aria-label="Search scheduled sessions"
                    className="w-full pl-8 pr-3 py-1.5 rounded-lg text-[12.5px]"
                    style={{
                      backgroundColor: 'var(--bg-surface-subtle)',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--text-primary)',
                    }}
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div
                    className="inline-flex items-center p-0.5 rounded-lg text-[11.5px]"
                    style={{
                      backgroundColor: 'var(--bg-surface-subtle)',
                      border: '1px solid var(--border-subtle)',
                    }}
                  >
                    {(['all', 'week'] as const).map((sc) => (
                      <button
                        key={sc}
                        type="button"
                        onClick={() => setAgendaScope(sc)}
                        className="px-2 py-1 rounded-md font-medium whitespace-nowrap transition-colors"
                        style={{
                          backgroundColor: agendaScope === sc ? 'var(--bg-surface)' : 'transparent',
                          color: agendaScope === sc ? 'var(--text-primary)' : 'var(--text-muted)',
                        }}
                      >
                        {sc === 'all' ? 'All Dates' : 'This Week'}
                      </button>
                    ))}
                  </div>

                  <div
                    className="inline-flex items-center p-0.5 rounded-lg text-[11.5px]"
                    style={{
                      backgroundColor: 'var(--bg-surface-subtle)',
                      border: '1px solid var(--border-subtle)',
                    }}
                  >
                    {(['all', 'upcoming', 'completed', 'missed'] as AgendaStatusFilter[]).map(
                      (st) => (
                        <button
                          key={st}
                          type="button"
                          onClick={() => setAgendaStatus(st)}
                          className="px-2 py-1 rounded-md capitalize font-medium whitespace-nowrap transition-colors"
                          style={{
                            backgroundColor:
                              agendaStatus === st ? 'var(--bg-surface)' : 'transparent',
                            color:
                              agendaStatus === st ? 'var(--text-primary)' : 'var(--text-muted)',
                          }}
                        >
                          {st}
                        </button>
                      ),
                    )}
                  </div>
                </div>
              </div>

              {agendaGroups.length === 0 ? (
                <div className="px-6 py-14 text-center space-y-2.5">
                  <p className="text-[13.5px] font-medium text-[var(--text-primary)]">
                    No sessions match your current filters
                  </p>
                  <p className="text-[12px] text-[var(--text-muted)]">
                    Try clearing the search query or schedule a new study block.
                  </p>
                  <div className="flex items-center justify-center gap-2 pt-1">
                    {(agendaQuery || agendaStatus !== 'all' || subjectFilter !== 'all' || studyOnly) && (
                      <button
                        type="button"
                        onClick={() => {
                          setAgendaQuery('');
                          setAgendaStatus('all');
                          setSubjectFilter('all');
                          setStudyOnly(false);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)]"
                        style={{ border: '1px solid var(--border-subtle)' }}
                      >
                        <RotateCcw className="w-3.5 h-3.5" /> Reset Filters
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => openQuickCreate(anchorDate, 14, 1.5)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium"
                      style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' }}
                    >
                      <Plus className="w-3.5 h-3.5" /> Schedule Block
                    </button>
                  </div>
                </div>
              ) : (
                <div className="max-h-[640px] overflow-auto divide-y divide-[var(--border-subtle)]">
                  {agendaGroups.map((group) => {
                    const isGroupToday = group.date === todayIso;
                    return (
                      <div key={group.date}>
                        <div
                          className="px-4 py-2 flex items-center justify-between text-[11.5px] font-medium"
                          style={{ backgroundColor: 'var(--bg-surface-subtle)' }}
                        >
                          <span
                            className={
                              isGroupToday
                                ? 'font-semibold text-[var(--accent)]'
                                : 'text-[var(--text-secondary)]'
                            }
                          >
                            {isGroupToday ? 'Today · ' : ''}
                            {formatFullDate(group.date)}
                          </span>
                          <span className="font-mono-num text-[var(--text-muted)] tabular-nums">
                            {group.sessions.length} block{group.sessions.length === 1 ? '' : 's'} ·{' '}
                            {Number(group.studyHours.toFixed(1))}h study
                          </span>
                        </div>
                        <div className="divide-y divide-[var(--border-subtle)]">
                          {group.sessions.map((ses) => {
                            const sub = subjects.find((s) => s.id === ses.subjectId);
                            const endHour = (ses.startHour + ses.durationHours) % 24;
                            const study = isStudyBlock(ses);
                            return (
                              <div
                                key={ses.id}
                                onClick={() => setSelectedSessionId(ses.id)}
                                role="button"
                                tabIndex={0}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    setSelectedSessionId(ses.id);
                                  }
                                }}
                                className="px-4 py-2.5 flex items-center justify-between gap-3 hover:bg-[var(--bg-surface-hover)] transition-colors cursor-pointer"
                                style={{
                                  backgroundColor:
                                    selectedSessionId === ses.id
                                      ? 'var(--accent-soft)'
                                      : undefined,
                                }}
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  <span className="font-mono-num text-[11.5px] text-[var(--text-secondary)] w-[132px] shrink-0 tabular-nums">
                                    {formatHourLabel(ses.startHour)} – {formatHourLabel(endHour)}
                                  </span>
                                  <span
                                    className="w-2.5 h-2.5 rounded-full shrink-0"
                                    style={{
                                      backgroundColor: study
                                        ? sub?.color ?? 'var(--accent)'
                                        : 'var(--text-muted)',
                                    }}
                                  />
                                  <div className="min-w-0">
                                    <div className="text-[13px] font-medium text-[var(--text-primary)] truncate">
                                      {ses.title}
                                    </div>
                                    <div className="text-[11.5px] text-[var(--text-muted)] truncate">
                                      {[
                                        study
                                          ? sub?.code ?? 'Unassigned'
                                          : ses.blockType === 'sleep'
                                            ? 'Sleep'
                                            : 'Free time',
                                        formatDurationCompact(ses.durationHours),
                                        ses.location,
                                      ]
                                        .filter(Boolean)
                                        .join(' · ')}
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                  <span
                                    className={`text-[11.5px] font-medium capitalize ${
                                      ses.status === 'completed'
                                        ? 'text-emerald-600 dark:text-emerald-400'
                                        : ses.status === 'missed'
                                          ? 'text-rose-600 dark:text-rose-400'
                                          : 'text-[var(--text-muted)]'
                                    }`}
                                  >
                                    {ses.status}
                                  </span>
                                  {study && ses.status !== 'completed' && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleStartFocus(ses);
                                      }}
                                      aria-label={`Start focus for ${ses.title}`}
                                      title="Start Focus Timer"
                                      className="p-1.5 rounded-md text-[var(--text-secondary)] hover:text-[var(--accent)] hover:bg-[var(--bg-surface)] transition-colors"
                                    >
                                      <Play className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedSessionId(ses.id);
                                      setEditingSessionId(ses.id);
                                    }}
                                    aria-label={`Edit ${ses.title}`}
                                    title="Edit session"
                                    className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition-colors"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>
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
            </div>
          )}
        </div>

        {/* Right Column: Inspector + Smart Rescheduling + Weekly Load + Unscheduled Tasks */}
        <div className="xl:col-span-3 space-y-4">
          {/* Selected Session Quick Inspector */}
          {selectedSession && (
            <section
              aria-label="Selected session details"
              className="rounded-xl p-4 space-y-3"
              style={{
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-strong)',
              }}
            >
              {(() => {
                const sub = subjects.find((s) => s.id === selectedSession.subjectId);
                const study = isStudyBlock(selectedSession);
                const endHour = (selectedSession.startHour + selectedSession.durationHours) % 24;
                const alarmSummary = [
                  selectedSession.alarms?.advanceNoticeMin
                    ? `${selectedSession.alarms.advanceNoticeMin}m before`
                    : '',
                  selectedSession.alarms?.ringAtStart ? 'Start alarm' : '',
                  selectedSession.alarms?.remindAtBedtime ? 'Bedtime reminder' : '',
                  selectedSession.alarms?.wakeAtEnd ? 'Wake alarm' : '',
                ]
                  .filter(Boolean)
                  .join(' · ');

                return (
                  <>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 text-[11.5px] font-medium text-[var(--text-muted)]">
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{
                              backgroundColor: study
                                ? sub?.color ?? 'var(--accent)'
                                : 'var(--text-muted)',
                            }}
                          />
                          <span className="truncate">
                            {study
                              ? sub
                                ? `${sub.code} · ${sub.name}`
                                : 'Study Session'
                              : selectedSession.blockType === 'sleep'
                                ? 'Sleep Block'
                                : 'Free Time'}
                          </span>
                        </div>
                        <h2 className="font-display text-[14.5px] font-semibold text-[var(--text-primary)] mt-1 leading-snug">
                          {selectedSession.title}
                        </h2>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedSessionId(null)}
                        aria-label="Close session inspector"
                        className="p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] shrink-0"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="space-y-1.5 text-[12px] text-[var(--text-secondary)]">
                      <div className="flex items-center gap-2">
                        <CalendarIcon className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />
                        <span>{formatFullDate(selectedSession.date)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />
                        <span className="font-mono-num tabular-nums">
                          {formatHourLabel(selectedSession.startHour)} – {formatHourLabel(endHour)} ·{' '}
                          {formatDurationCompact(selectedSession.durationHours)}
                        </span>
                      </div>
                      {selectedSession.location && (
                        <div className="flex items-center gap-2">
                          <MapPin className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />
                          <span className="truncate">{selectedSession.location}</span>
                        </div>
                      )}
                      {alarmSummary && (
                        <div className="flex items-center gap-2">
                          <Bell className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />
                          <span>{alarmSummary}</span>
                        </div>
                      )}
                    </div>

                    {selectedSession.notes && (
                      <p
                        className="text-[12px] text-[var(--text-secondary)] p-2.5 rounded-lg leading-relaxed"
                        style={{ backgroundColor: 'var(--bg-surface-subtle)' }}
                      >
                        {selectedSession.notes}
                      </p>
                    )}

                    {/* Primary Focus Action for study sessions */}
                    {study && (
                      <button
                        type="button"
                        onClick={() => handleStartFocus(selectedSession)}
                        className="w-full py-2 rounded-lg text-[12.5px] font-medium inline-flex items-center justify-center gap-1.5 transition-opacity hover:opacity-95"
                        style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' }}
                      >
                        <Play className="w-3.5 h-3.5" /> Start Focus Session
                      </button>
                    )}

                    {/* Quick Inspector Controls */}
                    <div
                      className="pt-2.5 space-y-2"
                      style={{ borderTop: '1px solid var(--border-subtle)' }}
                    >
                      <div className="flex items-center justify-between text-[12px]">
                        <span className="text-[var(--text-muted)]">Duration</span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleResizeDuration(selectedSession, -0.5)}
                            className="px-2 py-0.5 rounded text-[11.5px] font-mono-num hover:bg-[var(--bg-surface-hover)]"
                            style={{ border: '1px solid var(--border-subtle)' }}
                          >
                            −30m
                          </button>
                          <button
                            type="button"
                            onClick={() => handleResizeDuration(selectedSession, 0.5)}
                            className="px-2 py-0.5 rounded text-[11.5px] font-mono-num hover:bg-[var(--bg-surface-hover)]"
                            style={{ border: '1px solid var(--border-subtle)' }}
                          >
                            +30m
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-1.5 pt-1">
                        <button
                          type="button"
                          onClick={() => toggleCompleted(selectedSession)}
                          className="py-1.5 px-2 rounded-lg text-[12px] font-medium inline-flex items-center justify-center gap-1.5 text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] transition-colors"
                          style={{ border: '1px solid var(--border-subtle)' }}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          {selectedSession.status === 'completed' ? 'Reopen' : 'Complete'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingSessionId(selectedSession.id)}
                          className="py-1.5 px-2 rounded-lg text-[12px] font-medium inline-flex items-center justify-center gap-1.5 text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] transition-colors"
                          style={{ border: '1px solid var(--border-subtle)' }}
                        >
                          <Edit3 className="w-3.5 h-3.5" /> Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDuplicateNextDay(selectedSession)}
                          className="py-1.5 px-2 rounded-lg text-[12px] font-medium inline-flex items-center justify-center gap-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] transition-colors"
                          style={{ border: '1px solid var(--border-subtle)' }}
                        >
                          <Copy className="w-3.5 h-3.5" /> Copy +1d
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            deleteSession(selectedSession.id);
                            setSelectedSessionId(null);
                          }}
                          className="py-1.5 px-2 rounded-lg text-[12px] font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 inline-flex items-center justify-center gap-1.5 transition-colors"
                          style={{ border: '1px solid var(--border-subtle)' }}
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Remove
                        </button>
                      </div>
                    </div>
                  </>
                );
              })()}
            </section>
          )}

          {/* Smart Rescheduling Suggestion Panel */}
          {primaryMissed && suggestedSlot && (
            <section
              aria-label="Smart rescheduling"
              className="rounded-xl p-4 space-y-2.5"
              style={{
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--accent-border)',
              }}
            >
              <div className="flex items-center justify-between">
                <div
                  className="flex items-center gap-1.5 text-[12.5px] font-semibold"
                  style={{ color: 'var(--accent)' }}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Smart Rescheduling
                </div>
                <span className="text-[11px] font-mono-num text-[var(--text-muted)]">
                  {missedSessions.length} missed
                </span>
              </div>

              <p className="text-[12px] text-[var(--text-secondary)] leading-relaxed">
                Missed: <strong className="text-[var(--text-primary)]">{primaryMissed.title}</strong>{' '}
                ({formatShortDate(primaryMissed.date)} · {formatHourLabel(primaryMissed.startHour)}).
              </p>

              <div
                className="p-2.5 rounded-lg text-[12px]"
                style={{ backgroundColor: 'var(--bg-surface-subtle)' }}
              >
                <div className="font-medium text-[var(--text-primary)] font-mono-num">
                  Open Slot: {formatShortDate(suggestedSlot.date)} ·{' '}
                  {formatHourLabel(suggestedSlot.startHour)}
                </div>
                <div className="text-[11.5px] text-[var(--text-muted)] mt-0.5 tabular-nums">
                  {Math.round(primaryMissed.durationHours * 60)} min conflict-free window
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={applySmartReschedule}
                  className="flex-1 py-1.5 rounded-lg text-[12px] font-medium inline-flex items-center justify-center gap-1.5"
                  style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' }}
                >
                  Apply Slot <ArrowRight className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    updateSession(primaryMissed.id, { status: 'completed' });
                    pushToast('Marked missed session completed');
                  }}
                  title="Mark completed instead"
                  className="px-2.5 py-1.5 rounded-lg text-[12px] text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)]"
                  style={{ border: '1px solid var(--border-subtle)' }}
                >
                  Done
                </button>
              </div>
            </section>
          )}

          {/* Weekly Study Load & Subject Allocation */}
          <section
            aria-label="Weekly study load"
            className="rounded-xl p-4 space-y-3"
            style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <div className="flex items-baseline justify-between gap-2">
              <h2 className="font-display text-[13.5px] font-semibold text-[var(--text-primary)]">
                Weekly Study Load
              </h2>
              <span className="font-mono-num text-[12px] text-[var(--text-secondary)] tabular-nums">
                {weekSummary.totalStudyHours}h / {weeklyGoal}h
              </span>
            </div>

            <div className="space-y-1.5">
              <div
                className="h-1.5 rounded-full overflow-hidden"
                style={{ backgroundColor: 'var(--bg-surface-subtle)' }}
              >
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${weeklyGoalPct}%`, backgroundColor: 'var(--accent)' }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)] tabular-nums">
                <span>{weekSummary.completedHours}h completed</span>
                <span>
                  {weekSummary.upcomingCount} upcoming
                  {weekSummary.missedCount > 0 ? ` · ${weekSummary.missedCount} missed` : ''}
                </span>
              </div>
            </div>

            {weekSummary.subjectBreakdown.length > 0 ? (
              <div
                className="pt-2.5 space-y-2"
                style={{ borderTop: '1px solid var(--border-subtle)' }}
              >
                {weekSummary.subjectBreakdown.map(({ subject, hours }) => {
                  const pct =
                    weekSummary.totalStudyHours > 0
                      ? Math.round((hours / weekSummary.totalStudyHours) * 100)
                      : 0;
                  const active = subjectFilter === subject.id;
                  return (
                    <button
                      key={subject.id}
                      type="button"
                      onClick={() => setSubjectFilter(active ? 'all' : subject.id)}
                      className="w-full text-left group space-y-1 rounded-md p-1 -mx-1 hover:bg-[var(--bg-surface-hover)] transition-colors"
                    >
                      <div className="flex items-center justify-between text-[11.5px]">
                        <span className="flex items-center gap-1.5 text-[var(--text-primary)] font-medium truncate">
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: subject.color }}
                          />
                          <span className="truncate">{subject.code}</span>
                        </span>
                        <span className="font-mono-num text-[11px] text-[var(--text-muted)] tabular-nums">
                          {hours}h · {pct}%
                        </span>
                      </div>
                      <div
                        className="h-1 rounded-full overflow-hidden"
                        style={{ backgroundColor: 'var(--bg-surface-subtle)' }}
                      >
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${pct}%`, backgroundColor: subject.color }}
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="text-[12px] text-[var(--text-muted)] pt-1">
                No study blocks scheduled for this week yet.
              </p>
            )}
          </section>

          {/* Unscheduled Tasks Queue (Drag onto Grid or Auto-Slot) */}
          <section
            aria-label="Unscheduled tasks"
            className="rounded-xl p-4 space-y-2.5"
            style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <div className="flex items-baseline justify-between gap-2">
              <h2 className="font-display text-[13.5px] font-semibold text-[var(--text-primary)]">
                Unscheduled Tasks
              </h2>
              <span className="text-[11px] text-[var(--text-muted)]">Drag to grid</span>
            </div>

            {unscheduledTasks.length === 0 ? (
              <p className="text-[12px] text-[var(--text-muted)]">
                All open tasks are already scheduled on your calendar.
              </p>
            ) : (
              <div className="space-y-1.5">
                {unscheduledTasks.map((task) => {
                  const sub = subjects.find((s) => s.id === task.subjectId);
                  return (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('text/plain', task.id);
                        e.dataTransfer.effectAllowed = 'copy';
                        setDragPayload({ kind: 'task', task });
                      }}
                      onDragEnd={() => {
                        setDragPayload(null);
                        setDragOverCell(null);
                      }}
                      className="p-2 rounded-lg flex items-start gap-2 cursor-grab active:cursor-grabbing hover:bg-[var(--bg-surface-hover)] transition-colors"
                      style={{
                        backgroundColor: 'var(--bg-surface-subtle)',
                        border: '1px solid var(--border-subtle)',
                      }}
                    >
                      <GripVertical className="w-3.5 h-3.5 text-[var(--text-muted)] mt-0.5 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="text-[12px] font-medium text-[var(--text-primary)] truncate">
                          {task.title}
                        </div>
                        <div className="text-[11px] text-[var(--text-muted)] mt-0.5 tabular-nums truncate">
                          {sub?.code ?? 'General'} · {task.estimatedMinutes}m · {task.dueLabel}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleAutoSlotTask(task)}
                        aria-label={`Auto-schedule ${task.title}`}
                        title="Find next open slot and schedule"
                        className="p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--accent)] hover:bg-[var(--bg-surface)] shrink-0 transition-colors"
                      >
                        <CalendarPlus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>

      {/* Edit Session Modal */}
      <dialog
        ref={editDialogRef}
        aria-labelledby="session-editor-title"
        onClose={() => setEditingSessionId(null)}
        className="m-auto max-h-[90dvh] w-[min(460px,calc(100vw-2rem))] overflow-auto rounded-2xl border border-[var(--border-subtle)] p-0 text-[var(--text-primary)] backdrop:bg-black/45"
        style={{ backgroundColor: 'var(--bg-elevated)', boxShadow: 'var(--shadow-floating)' }}
      >
        {editingSession && (() => {
          const formSession =
            editingSeries && editingEntireSeries
              ? recurringSeriesTemplate(editingSeries, editingSession)
              : editingSession;

          return (
            <div>
              <div
                className="flex items-center justify-between px-5 py-3.5"
                style={{ borderBottom: '1px solid var(--border-subtle)' }}
              >
                <h2
                  id="session-editor-title"
                  className="font-display text-[15px] font-semibold text-[var(--text-primary)]"
                >
                  Edit Scheduled Block
                </h2>
                <button
                  type="button"
                  onClick={() => setEditingSessionId(null)}
                  aria-label="Close edit dialog"
                  className="p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form
                key={`${editingSession.id}-${editingEntireSeries}`}
                className="p-5 space-y-3.5 text-[12px]"
                onSubmit={(e) => {
                  e.preventDefault();
                  const data = new FormData(e.currentTarget);
                  const title = String(data.get('title')).trim();
                  if (!title) return;
                  const { startHour, durationHours } = readSessionTimeFields(data);
                  const fields = readCalendarBlockFields(data);
                  const location = String(data.get('location') ?? '').trim() || undefined;
                  const notes = String(data.get('notes') ?? '').trim() || undefined;

                  if (editingSeries && editingEntireSeries && updateRecurringSeries) {
                    if (data.get('date') !== editingSession.date) {
                      pushToast('Choose This occurrence to move it to a different date.');
                      return;
                    }
                    const weekdays = data.getAll('repeat-day').map(Number);
                    if (!weekdays.length) {
                      pushToast('Choose at least one weekday.');
                      return;
                    }
                    updateRecurringSeries(
                      Number(editingSeriesId),
                      title,
                      startHour,
                      durationHours,
                      fields,
                      String(data.get('subject') ?? ''),
                      weekdays,
                    );
                    setEditScope({ id: null, series: false });
                  } else {
                    const date = String(data.get('date'));
                    const dayIndex = getWeekdayIndex(date);
                    updateSession(editingSession.id, {
                      title,
                      date,
                      dayIndex,
                      startHour,
                      durationHours,
                      ...fields,
                      subjectId:
                        fields.blockType === 'study' ? String(data.get('subject') ?? '') : '',
                      location,
                      notes,
                    });
                  }
                  pushToast('Calendar changes saved');
                  setEditingSessionId(null);
                }}
              >
                {editingSeries && updateRecurringSeries && (
                  <label className="grid gap-1">
                    <span className="font-medium text-[var(--text-secondary)]">Apply changes to</span>
                    <select
                      name="scope"
                      value={editingEntireSeries ? 'series' : 'one'}
                      onChange={(event) =>
                        setEditScope({
                          id: editingSessionId,
                          series: event.target.value === 'series',
                        })
                      }
                      className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] px-2.5 py-1.5 text-[12.5px] text-[var(--text-primary)]"
                    >
                      <option value="one">This occurrence only</option>
                      <option value="series">Entire recurring series</option>
                    </select>
                  </label>
                )}

                <label className="grid gap-1">
                  <span className="font-medium text-[var(--text-secondary)]">Title</span>
                  <input
                    name="title"
                    required
                    defaultValue={formSession.title}
                    className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] px-3 py-2 text-[13px] text-[var(--text-primary)]"
                  />
                </label>

                <label className="grid gap-1">
                  <span className="font-medium text-[var(--text-secondary)]">Date</span>
                  <input
                    name="date"
                    type="date"
                    required
                    defaultValue={formSession.date}
                    className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] px-2.5 py-1.5 text-[13px] text-[var(--text-primary)]"
                  />
                </label>

                <SessionTimeFields
                  startHour={formSession.startHour}
                  durationHours={formSession.durationHours}
                />

                <CalendarBlockFields session={formSession} subjects={subjects} />

                {editingSeries && editingEntireSeries && (
                  <RepeatWeekdays selected={recurringWeekdays(editingSeries)} />
                )}

                {!editingEntireSeries && (
                  <div className="grid gap-3 pt-1 border-t border-[var(--border-subtle)]">
                    <label className="grid gap-1">
                      <span className="font-medium text-[var(--text-secondary)]">
                        Location (optional)
                      </span>
                      <input
                        name="location"
                        defaultValue={editingSession.location ?? ''}
                        placeholder="e.g., Science Library · Desk 4B"
                        className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] px-3 py-1.5 text-[12.5px] text-[var(--text-primary)]"
                      />
                    </label>
                    <label className="grid gap-1">
                      <span className="font-medium text-[var(--text-secondary)]">
                        Session notes (optional)
                      </span>
                      <textarea
                        name="notes"
                        rows={2}
                        defaultValue={editingSession.notes ?? ''}
                        placeholder="Key problem numbers or focus goals..."
                        className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] px-3 py-1.5 text-[12.5px] text-[var(--text-primary)] resize-none"
                      />
                    </label>
                  </div>
                )}

                <div className="flex items-center justify-between gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      deleteSession(editingSession.id);
                      setEditingSessionId(null);
                      setSelectedSessionId(null);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12.5px] font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-500/10"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Remove
                  </button>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingSessionId(null)}
                      className="px-3.5 py-1.5 rounded-lg text-[12.5px] text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)]"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 rounded-lg text-[12.5px] font-medium"
                      style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' }}
                    >
                      Save Changes
                    </button>
                  </div>
                </div>
              </form>
            </div>
          );
        })()}
      </dialog>

      {/* Quick-Create Session Modal (pre-filled from clicked slot or Schedule Block button) */}
      <dialog
        ref={createDialogRef}
        aria-labelledby="quick-create-title"
        onClose={() => setQuickCreateDraft(null)}
        className="m-auto max-h-[90dvh] w-[min(460px,calc(100vw-2rem))] overflow-auto rounded-2xl border border-[var(--border-subtle)] p-0 text-[var(--text-primary)] backdrop:bg-black/45"
        style={{ backgroundColor: 'var(--bg-elevated)', boxShadow: 'var(--shadow-floating)' }}
      >
        {quickCreateDraft && (
          <div>
            <div
              className="flex items-center justify-between px-5 py-3.5"
              style={{ borderBottom: '1px solid var(--border-subtle)' }}
            >
              <h2
                id="quick-create-title"
                className="font-display text-[15px] font-semibold text-[var(--text-primary)]"
              >
                Schedule Block
              </h2>
              <button
                type="button"
                onClick={() => setQuickCreateDraft(null)}
                aria-label="Close schedule modal"
                className="p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              key={`${quickCreateDraft.date}-${quickCreateDraft.startHour}-${quickCreateDraft.durationHours}`}
              className="p-5 space-y-3.5 text-[12px]"
              onSubmit={(e) => {
                e.preventDefault();
                const data = new FormData(e.currentTarget);
                const title = String(data.get('title') ?? '').trim();
                if (!title) return;
                const date = String(data.get('date'));
                const dayIndex = getWeekdayIndex(date);
                const weekdays =
                  quickRepeat === 'daily'
                    ? [0, 1, 2, 3, 4, 5, 6]
                    : quickRepeat === 'weekly'
                      ? data.getAll('repeat-day').map(Number)
                      : [];
                if (quickRepeat === 'weekly' && !weekdays.length) {
                  pushToast('Choose at least one weekday to repeat.');
                  return;
                }
                const fields = readCalendarBlockFields(data);
                const location = String(data.get('location') ?? '').trim();
                addSession(
                  {
                    ...fields,
                    title,
                    subjectId:
                      fields.blockType === 'study' ? String(data.get('subject') ?? '') : '',
                    dayIndex,
                    date,
                    ...readSessionTimeFields(data),
                    status: 'upcoming',
                    recurring: weekdays.length > 0,
                    location:
                      location || (fields.blockType === 'study' ? 'Study Workspace' : undefined),
                  },
                  weekdays,
                );
                setAnchorDate(date);
                setQuickCreateDraft(null);
              }}
            >
              <label className="grid gap-1">
                <span className="font-medium text-[var(--text-secondary)]">Block title</span>
                <input
                  name="title"
                  required
                  autoFocus
                  defaultValue={quickCreateDraft.title ?? ''}
                  placeholder="e.g., Vector Calculus Problem Set"
                  className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] px-3 py-2 text-[13px] text-[var(--text-primary)]"
                />
              </label>

              <label className="grid gap-1">
                <span className="font-medium text-[var(--text-secondary)]">Date</span>
                <input
                  name="date"
                  type="date"
                  required
                  defaultValue={quickCreateDraft.date}
                  className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] px-2.5 py-1.5 text-[13px] text-[var(--text-primary)]"
                />
              </label>

              <SessionTimeFields
                startHour={quickCreateDraft.startHour}
                durationHours={quickCreateDraft.durationHours}
              />

              <CalendarBlockFields
                session={
                  quickCreateDraft.subjectId
                    ? ({ subjectId: quickCreateDraft.subjectId } as StudySession)
                    : undefined
                }
                subjects={subjects}
              />

              <label className="grid gap-1">
                <span className="font-medium text-[var(--text-secondary)]">Repeat</span>
                <select
                  value={quickRepeat}
                  onChange={(e) => setQuickRepeat(e.target.value as typeof quickRepeat)}
                  className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] px-2.5 py-1.5 text-[12.5px] text-[var(--text-primary)]"
                >
                  <option value="once">Does not repeat</option>
                  <option value="daily">Every day</option>
                  <option value="weekly">Selected weekdays</option>
                </select>
              </label>

              {quickRepeat === 'weekly' && (
                <RepeatWeekdays selected={[getWeekdayIndex(quickCreateDraft.date)]} />
              )}

              <label className="grid gap-1">
                <span className="font-medium text-[var(--text-secondary)]">
                  Location (optional)
                </span>
                <input
                  name="location"
                  placeholder="e.g., Science Library"
                  className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] px-3 py-1.5 text-[12.5px] text-[var(--text-primary)]"
                />
              </label>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setQuickCreateDraft(null)}
                  className="px-3.5 py-1.5 rounded-lg text-[12.5px] text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg text-[12.5px] font-medium"
                  style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' }}
                >
                  Schedule Block
                </button>
              </div>
            </form>
          </div>
        )}
      </dialog>
    </div>
  );
};
