import { localDay } from '../assistant/workspaceContext';
import type { StudySession } from '../types/studyflow';

export function layoutCalendarDay(sessions: StudySession[], date: string) {
  const day = new Date(date + 'T12:00:00');
  const entries = sessions.flatMap(session => {
    const startDate = new Date(session.date + 'T12:00:00');
    const offset = (Date.UTC(day.getFullYear(), day.getMonth(), day.getDate()) -
      Date.UTC(startDate.getFullYear(), startDate.getMonth(), startDate.getDate())) / 86_400_000;
    const start = session.startHour - 24 * offset;
    const end = start + session.durationHours;
    const from = Math.max(0, start);
    const to = Math.min(24, end);
    return to > from ? [{ session, from, to, continued: start < 0, column: 0, columns: 1 }] : [];
  }).sort((a, b) => a.from - b.from || b.to - a.to);

  let group: typeof entries = [];
  let ends: number[] = [];
  const finish = () => group.forEach(entry => { entry.columns = ends.length; });
  for (const entry of entries) {
    if (ends.every(end => end <= entry.from)) {
      finish();
      group = [];
      ends = [];
    }
    const open = ends.findIndex(end => end <= entry.from);
    entry.column = open === -1 ? ends.length : open;
    ends[entry.column] = entry.to;
    group.push(entry);
  }
  finish();
  return entries;
}

export function currentStudySession(sessions: StudySession[], now = new Date()) {
  const hour = now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600;
  return layoutCalendarDay(sessions, localDay(now)).filter(({ session, from, to }) =>
    from <= hour && hour < to && session.status === 'upcoming' &&
    session.countsTowardStudy !== false && session.blockType !== 'sleep' && session.blockType !== 'free',
  ).sort((a, b) => b.session.date.localeCompare(a.session.date) || b.session.startHour - a.session.startHour || a.session.id.localeCompare(b.session.id))[0]?.session;
}

/** Projection windows include preceding overnight/weekly blocks and the following month. */
export function calendarProjectionDates(todayIso: string, anchorIso = todayIso): string[] {
  const dates = new Set<string>();
  for (const iso of new Set([todayIso, anchorIso])) {
    const day = new Date(iso + 'T12:00:00');
    if (!Number.isFinite(day.getTime())) continue;
    const first = new Date(day.getFullYear(), day.getMonth(), -6, 12);
    for (let offset = 0; offset < 68; offset++) {
      const date = new Date(first);
      date.setDate(first.getDate() + offset);
      dates.add(localDay(date));
    }
  }
  return [...dates].sort();
}

export interface CalendarHourHeightBlock {
  from: number;
  to: number;
  columns?: number;
  isBackground?: boolean;
}

export interface AdaptiveCalendarHeightOptions {
  minHourHeight?: number;
  maxHourHeight?: number;
  defaultHourHeight?: number;
}

export interface AdaptiveCalendarHeightResult {
  hourHeight: number;
  densityLabel: 'Compact' | 'Balanced' | 'Expanded';
  reason: string;
  stats: {
    sessionCount: number;
    maxDailySessions: number;
    medianDurationHours: number;
    shortestDurationHours: number;
    maxConcurrent: number;
    sameTimeSlotGroups: number;
  };
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  if (sorted.length === 1) return sorted[0];
  const idx = (sorted.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

/**
 * Computes a single uniform pixels-per-hour height for the current calendar view
 * (week or day) based on session durations, daily session density, same-time
 * concurrent overlaps, and recurring same-time slots across the week.
 *
 * - Longer sessions & fewer sessions/day -> shorter vertical height (Compact)
 * - Shorter sessions & more sessions/day -> taller vertical height (Expanded)
 * - Concurrent overlapping sessions at the same time -> vertical readability boost
 */
export function computeAdaptiveHourHeight(
  dayBlockGroups: ReadonlyArray<ReadonlyArray<CalendarHourHeightBlock>>,
  options: AdaptiveCalendarHeightOptions = {},
): AdaptiveCalendarHeightResult {
  const minHourHeight = options.minHourHeight ?? 34;
  const maxHourHeight = options.maxHourHeight ?? 96;
  const defaultHourHeight = options.defaultHourHeight ?? 56;

  // Normalize spans per day, filtering out tiny sub-15m midnight slivers unless all spans are tiny
  const normalizedByDay = dayBlockGroups.map((dayBlocks) => {
    const valid = dayBlocks
      .map((b) => ({
        from: Math.max(0, b.from),
        to: Math.min(24, b.to),
        duration: Math.max(0, Math.min(24, b.to) - Math.max(0, b.from)),
        columns: Math.max(1, b.columns ?? 1),
        isBackground: Boolean(b.isBackground),
      }))
      .filter((b) => b.duration > 0);
    const meaningful = valid.filter((b) => b.duration >= 0.25);
    return meaningful.length > 0 ? meaningful : valid;
  });

  const allBlocks = normalizedByDay.flat();
  if (allBlocks.length === 0) {
    return {
      hourHeight: defaultHourHeight,
      densityLabel: 'Balanced',
      reason: 'No sessions in view',
      stats: {
        sessionCount: 0,
        maxDailySessions: 0,
        medianDurationHours: 0,
        shortestDurationHours: 0,
        maxConcurrent: 1,
        sameTimeSlotGroups: 0,
      },
    };
  }

  // Prioritize primary (study/active) blocks when present so long overnight sleep blocks
  // do not crush short daytime study sessions.
  const hasPrimary = allBlocks.some((b) => !b.isBackground);
  const activeByDay = normalizedByDay.map((dayBlocks) =>
    hasPrimary ? dayBlocks.filter((b) => !b.isBackground) : dayBlocks,
  );
  const activeBlocks = activeByDay.flat();

  const durations = activeBlocks.map((b) => b.duration).sort((a, b) => a - b);
  const shortestDurationHours = durations[0];
  const p25DurationHours = percentile(durations, 0.25);
  const medianDurationHours = percentile(durations, 0.5);

  const nonEmptyDayCounts = activeByDay.map((d) => d.length).filter((n) => n > 0);
  const maxDailySessions = nonEmptyDayCounts.length > 0 ? Math.max(...nonEmptyDayCounts) : 0;
  const avgActiveDaySessions =
    nonEmptyDayCounts.length > 0
      ? nonEmptyDayCounts.reduce((sum, n) => sum + n, 0) / nonEmptyDayCounts.length
      : 0;

  const maxConcurrent = activeBlocks.reduce((max, b) => Math.max(max, b.columns), 1);

  // Identify same-time weekly session slots (sessions occurring at the same time band across 2+ days)
  const slotDaySets = new Map<string, Set<number>>();
  activeByDay.forEach((dayBlocks, dayIdx) => {
    for (const block of dayBlocks) {
      const slotFrom = Math.round(block.from * 2) / 2;
      const slotTo = Math.round(block.to * 2) / 2;
      const key = `${slotFrom}-${slotTo}`;
      let days = slotDaySets.get(key);
      if (!days) {
        days = new Set<number>();
        slotDaySets.set(key, days);
      }
      days.add(dayIdx);
    }
  });
  let sameTimeSlotGroups = 0;
  let alignedBlockCount = 0;
  for (const days of slotDaySets.values()) {
    if (days.size >= 2) {
      sameTimeSlotGroups += 1;
      alignedBlockCount += days.size;
    }
  }
  const sameTimeRatio = activeBlocks.length > 0 ? alignedBlockCount / activeBlocks.length : 0;

  // 1. Duration curve: shorter representative sessions need taller hourly spacing;
  //    longer blocks need less pixels/hour while remaining generous and scannable.
  const repDuration = 0.55 * p25DurationHours + 0.45 * medianDurationHours;
  const durationTarget = 30 + 30 / Math.pow(Math.max(0.4, repDuration), 0.78);

  // 2. Daily density adjustment: busy days expand height; sparse days compress height.
  const effectiveDailyLoad = 0.65 * maxDailySessions + 0.35 * avgActiveDaySessions;
  const densityDelta = Math.max(-7, Math.min(14, (effectiveDailyLoad - 3) * 3.5));

  // 3. Same-time concurrent overlap boost: narrower side-by-side cards need extra vertical room.
  const overlapDelta = maxConcurrent > 1 ? Math.min(12, (maxConcurrent - 1) * 6) : 0;

  // 4. Same-time weekly alignment softening: when the week consists largely of identical
  //    long sessions repeating at the same time across days, keep the grid calm and compact.
  const uniformityDelta =
    maxConcurrent === 1 && repDuration >= 1.5 && sameTimeRatio >= 0.5
      ? -Math.min(4, Math.round(sameTimeRatio * 4))
      : 0;

  let rawHeight = durationTarget + densityDelta + overlapDelta + uniformityDelta;

  // 5. Short-session legibility guard: prevent 30m blocks from getting crushed below ~26px
  if (shortestDurationHours <= 0.5 && rawHeight < 56) {
    rawHeight = Math.max(rawHeight, 56);
  }

  const hourHeight = Math.round(Math.max(minHourHeight, Math.min(maxHourHeight, rawHeight)));

  const densityLabel: AdaptiveCalendarHeightResult['densityLabel'] =
    hourHeight <= 48 ? 'Compact' : hourHeight >= 68 ? 'Expanded' : 'Balanced';

  let reason: string;
  if (densityLabel === 'Compact') {
    reason =
      sameTimeSlotGroups > 0
        ? `Compact for aligned ${medianDurationHours.toFixed(1)}h sessions`
        : `Compact for longer ${medianDurationHours.toFixed(1)}h sessions`;
  } else if (densityLabel === 'Expanded') {
    reason =
      maxConcurrent > 1
        ? `Expanded for overlapping & short sessions (${maxDailySessions}/day)`
        : `Expanded for ${maxDailySessions} shorter sessions/day`;
  } else {
    reason = `Balanced for ${activeBlocks.length} ${activeBlocks.length === 1 ? 'session' : 'sessions'}`;
  }

  return {
    hourHeight,
    densityLabel,
    reason,
    stats: {
      sessionCount: activeBlocks.length,
      maxDailySessions,
      medianDurationHours: Number(medianDurationHours.toFixed(2)),
      shortestDurationHours: Number(shortestDurationHours.toFixed(2)),
      maxConcurrent,
      sameTimeSlotGroups,
    },
  };
}

export function formatSessionDurationCompact(hours: number): string {
  const mins = Math.max(0, Math.round(hours * 60));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  return `${m}m`;
}


