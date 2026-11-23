import type {
  AndroidPermissionsState,
  CompanionSubject,
  ScheduleBlock,
  ScheduledAlert,
  TimelineSegment,
} from './types';

export const MINUTES_PER_DAY = 1440;

export const WEEK_DAYS = [
  { dayIndex: 0, short: 'Mon', full: 'Monday', num: 23, monthShort: 'Nov', dateIso: '2026-11-23' },
  { dayIndex: 1, short: 'Tue', full: 'Tuesday', num: 24, monthShort: 'Nov', dateIso: '2026-11-24' },
  { dayIndex: 2, short: 'Wed', full: 'Wednesday', num: 25, monthShort: 'Nov', dateIso: '2026-11-25' },
  { dayIndex: 3, short: 'Thu', full: 'Thursday', num: 26, monthShort: 'Nov', dateIso: '2026-11-26' },
  { dayIndex: 4, short: 'Fri', full: 'Friday', num: 27, monthShort: 'Nov', dateIso: '2026-11-27' },
  { dayIndex: 5, short: 'Sat', full: 'Saturday', num: 28, monthShort: 'Nov', dateIso: '2026-11-28' },
  { dayIndex: 6, short: 'Sun', full: 'Sunday', num: 29, monthShort: 'Nov', dateIso: '2026-11-29' },
] as const;

export function toAbsMin(dayIndex: number, minuteOfDay: number): number {
  return dayIndex * MINUTES_PER_DAY + minuteOfDay;
}

export function fromAbsMin(absMin: number): { dayIndex: number; minuteOfDay: number } {
  const safe = Math.max(0, Math.floor(absMin));
  const dayIndex = Math.floor(safe / MINUTES_PER_DAY);
  const minuteOfDay = safe % MINUTES_PER_DAY;
  return { dayIndex, minuteOfDay };
}

export function formatMinutes12h(minuteOfDay: number): string {
  const normalized = ((Math.floor(minuteOfDay) % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
  const h24 = Math.floor(normalized / 60);
  const m = normalized % 60;
  const period = h24 >= 12 ? 'PM' : 'AM';
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
}

export function formatMinutes24hInput(minuteOfDay: number): string {
  const normalized = ((Math.floor(minuteOfDay) % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
  const h = Math.floor(normalized / 60);
  const m = normalized % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function parse24hInput(value: string): number | null {
  const match = value.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;
  return h * 60 + m;
}

export function formatDayLabel(dayIndex: number): string {
  const day = WEEK_DAYS[dayIndex] ?? WEEK_DAYS[0];
  return `${day.full}, ${day.monthShort} ${day.num}`;
}

export function formatRelativeDayName(targetDayIndex: number, currentDayIndex: number): string {
  if (targetDayIndex === currentDayIndex) return 'today';
  if (targetDayIndex === currentDayIndex + 1) return 'tomorrow';
  const day = WEEK_DAYS[targetDayIndex];
  return day ? `${day.short}, ${day.monthShort} ${day.num}` : `Day ${targetDayIndex + 1}`;
}

export function formatDurationLabel(durationMin: number): string {
  const hrs = Math.floor(durationMin / 60);
  const mins = durationMin % 60;
  if (hrs === 0) return `${mins} min`;
  if (mins === 0) return `${hrs}h`;
  return `${hrs}h ${mins}m`;
}

export function formatCountdownMMSS(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function formatTimeRange(block: ScheduleBlock): string {
  const startLabel = formatMinutes12h(block.startMin);
  const endLabel = formatMinutes12h(block.startMin + block.durationMin);
  return `${startLabel} – ${endLabel}`;
}

export function getBlockStartAbs(block: ScheduleBlock): number {
  return toAbsMin(block.dayIndex, block.startMin);
}

export function getBlockEndAbs(block: ScheduleBlock): number {
  return getBlockStartAbs(block) + block.durationMin;
}

/**
 * Splits blocks (including cross-midnight Sleep blocks) into segments visible on `dayIndex`.
 * A Sleep block from 11:00 PM (day 0) to 6:30 AM (day 1) appears on both day 0 (23:00-24:00)
 * and day 1 (00:00-06:30).
 */
export function getTimelineSegmentsForDay(
  blocks: ScheduleBlock[],
  dayIndex: number
): TimelineSegment[] {
  const dayStart = toAbsMin(dayIndex, 0);
  const dayEnd = dayStart + MINUTES_PER_DAY;
  const segments: TimelineSegment[] = [];

  for (const block of blocks) {
    const startAbs = getBlockStartAbs(block);
    const endAbs = getBlockEndAbs(block);
    if (endAbs <= dayStart || startAbs >= dayEnd) continue;

    const clampedStart = Math.max(startAbs, dayStart) - dayStart;
    const clampedEnd = Math.min(endAbs, dayEnd) - dayStart;
    segments.push({
      block,
      dayIndex,
      segmentStartMin: clampedStart,
      segmentEndMin: clampedEnd,
      isCrossMidnightStart: endAbs > dayEnd && startAbs >= dayStart,
      isCrossMidnightEnd: startAbs < dayStart && endAbs <= dayEnd,
    });
  }

  return segments.sort((a, b) => a.segmentStartMin - b.segmentStartMin);
}

/**
 * Computes total scheduled study minutes for a given day.
 * Strictly counts ONLY `study` blocks (excludes Sleep and Free time).
 */
export function calculateDailyStudyMinutes(blocks: ScheduleBlock[], dayIndex: number): number {
  return blocks
    .filter((b) => b.type === 'study' && b.dayIndex === dayIndex)
    .reduce((sum, b) => sum + b.durationMin, 0);
}

/**
 * Builds the authoritative list of scheduled alerts derived from the current blocks
 * plus any active one-shot snoozed wake-up alert.
 *
 * Rules enforced:
 * - Study blocks emit an advance notification ONLY when advanceNoticeMin is 10 or 15,
 *   and a start alarm ONLY when ringAtStart is true.
 * - Sleep blocks NEVER emit an advance session notification; they emit at most one
 *   bedtime reminder at start and at most ONE wake-up alarm at the exact end timestamp.
 * - Free time blocks emit no alerts by default.
 * - Alert IDs include `block.revision` so rescheduling automatically cancels old alerts.
 */
export function buildAlertSchedule(
  blocks: ScheduleBlock[],
  subjects: CompanionSubject[],
  snoozedWakeUp: { sourceAlertId: string; blockId: string; triggerAbsMin: number } | null
): ScheduledAlert[] {
  const subjectMap = new Map(subjects.map((s) => [s.id, s]));
  const alerts: ScheduledAlert[] = [];

  for (const block of blocks) {
    const startAbs = getBlockStartAbs(block);
    const endAbs = getBlockEndAbs(block);

    if (block.type === 'study') {
      const subject = block.subjectId ? subjectMap.get(block.subjectId) : undefined;
      const startDate = fromAbsMin(startAbs);
      const exactTimeLabel = formatMinutes12h(startDate.minuteOfDay);
      const dateLabel = formatDayLabel(startDate.dayIndex);

      if (block.advanceNoticeMin > 0) {
        const triggerAbs = Math.max(0, startAbs - block.advanceNoticeMin);
        alerts.push({
          id: `study_headsup:${block.id}:r${block.revision}`,
          kind: 'study_headsup',
          blockId: block.id,
          blockRevision: block.revision,
          triggerAbsMin: triggerAbs,
          title: block.title,
          subtitle: `${subject ? `${subject.code} · ` : ''}Starts at ${exactTimeLabel}`,
          subjectId: block.subjectId,
          exactTimeLabel,
          dateLabel,
        });
      }

      if (block.ringAtStart) {
        alerts.push({
          id: `study_start_alarm:${block.id}:r${block.revision}`,
          kind: 'study_start_alarm',
          blockId: block.id,
          blockRevision: block.revision,
          triggerAbsMin: startAbs,
          title: block.title,
          subtitle: subject ? `${subject.code} · ${subject.name}` : 'Study session',
          subjectId: block.subjectId,
          exactTimeLabel,
          dateLabel,
        });
      }
    } else if (block.type === 'sleep') {
      const endDate = fromAbsMin(endAbs);
      const wakeTimeLabel = formatMinutes12h(endDate.minuteOfDay);
      const wakeDateLabel = formatDayLabel(endDate.dayIndex);

      if (block.remindAtBedtime) {
        const bedDate = fromAbsMin(startAbs);
        alerts.push({
          id: `bedtime_reminder:${block.id}:r${block.revision}`,
          kind: 'bedtime_reminder',
          blockId: block.id,
          blockRevision: block.revision,
          triggerAbsMin: startAbs,
          title: 'Bedtime reminder',
          subtitle: `Wake-up set for ${wakeTimeLabel}`,
          exactTimeLabel: formatMinutes12h(bedDate.minuteOfDay),
          dateLabel: formatDayLabel(bedDate.dayIndex),
        });
      }

      if (block.wakeAtEnd) {
        alerts.push({
          id: `sleep_wakeup_alarm:${block.id}:r${block.revision}`,
          kind: 'sleep_wakeup_alarm',
          blockId: block.id,
          blockRevision: block.revision,
          triggerAbsMin: endAbs,
          title: 'Wake up',
          subtitle: block.title,
          exactTimeLabel: wakeTimeLabel,
          dateLabel: wakeDateLabel,
        });
      }
    }
  }

  if (snoozedWakeUp) {
    const snoozeDate = fromAbsMin(snoozedWakeUp.triggerAbsMin);
    alerts.push({
      id: `sleep_wakeup_snooze:${snoozedWakeUp.sourceAlertId}:${snoozedWakeUp.triggerAbsMin}`,
      kind: 'sleep_wakeup_alarm',
      blockId: snoozedWakeUp.blockId,
      blockRevision: 0,
      triggerAbsMin: snoozedWakeUp.triggerAbsMin,
      title: 'Wake up (Snoozed)',
      subtitle: '5-minute snooze ended',
      exactTimeLabel: formatMinutes12h(snoozeDate.minuteOfDay),
      dateLabel: formatDayLabel(snoozeDate.dayIndex),
      isSnoozed: true,
      snoozeSourceId: snoozedWakeUp.sourceAlertId,
    });
  }

  return alerts.sort((a, b) => a.triggerAbsMin - b.triggerAbsMin);
}

/**
 * Evaluates which alert (if any) should fire at a specific simulated time.
 *
 * Non-replaying direct jump semantics:
 * - Only alerts whose `triggerAbsMin === targetAbsMin` (exact match) and which have NOT been
 *   dismissed are returned. Earlier skipped alerts are never replayed when jumping time.
 * - Full-screen alarms take precedence over quiet notifications if two share the exact minute.
 */
export function findExactAlertAtTime(
  alerts: ScheduledAlert[],
  targetAbsMin: number,
  dismissedAlertIds: Set<string>
): ScheduledAlert | null {
  const matches = alerts.filter(
    (a) => a.triggerAbsMin === targetAbsMin && !dismissedAlertIds.has(a.id)
  );
  if (matches.length === 0) return null;

  const priorityOrder: Record<ScheduledAlert['kind'], number> = {
    sleep_wakeup_alarm: 4,
    study_start_alarm: 3,
    focus_break_prompt: 2,
    study_headsup: 1,
    bedtime_reminder: 1,
  };

  matches.sort((a, b) => priorityOrder[b.kind] - priorityOrder[a.kind]);
  return matches[0];
}

/**
 * Resolves the primary Today hero study session (current in-progress session first,
 * otherwise the next upcoming study session today), plus remaining study sessions today.
 */
export function resolveTodayStudyView(
  blocks: ScheduleBlock[],
  nowAbsMin: number
): {
  heroSession: ScheduleBlock | null;
  heroStatus: 'in_progress' | 'upcoming' | null;
  heroStatusText: string;
  remainingSessions: ScheduleBlock[];
} {
  const { dayIndex } = fromAbsMin(nowAbsMin);
  const todayStudies = blocks
    .filter((b) => b.type === 'study' && b.dayIndex === dayIndex)
    .sort((a, b) => a.startMin - b.startMin);

  const inProgress = todayStudies.find((b) => {
    const start = getBlockStartAbs(b);
    const end = getBlockEndAbs(b);
    return nowAbsMin >= start && nowAbsMin < end;
  });

  if (inProgress) {
    const endLabel = formatMinutes12h(inProgress.startMin + inProgress.durationMin);
    const remaining = todayStudies.filter((b) => getBlockStartAbs(b) > nowAbsMin && b.id !== inProgress.id);
    return {
      heroSession: inProgress,
      heroStatus: 'in_progress',
      heroStatusText: `In progress · ends at ${endLabel}`,
      remainingSessions: remaining,
    };
  }

  const upcoming = todayStudies.filter((b) => getBlockStartAbs(b) > nowAbsMin);
  if (upcoming.length > 0) {
    const next = upcoming[0];
    const diffMin = getBlockStartAbs(next) - nowAbsMin;
    let statusText = '';
    if (diffMin < 60) {
      statusText = `Starts in ${diffMin} min`;
    } else {
      const hrs = Math.floor(diffMin / 60);
      const mins = diffMin % 60;
      statusText = mins === 0 ? `Starts in ${hrs}h` : `Starts in ${hrs}h ${mins}m`;
    }
    return {
      heroSession: next,
      heroStatus: 'upcoming',
      heroStatusText: statusText,
      remainingSessions: upcoming.slice(1),
    };
  }

  return {
    heroSession: null,
    heroStatus: null,
    heroStatusText: '',
    remainingSessions: [],
  };
}

/**
 * Resolves the next relevant sleep block (currently sleeping or upcoming tonight)
 * and exact bedtime/wake-up display metadata.
 */
export function resolveNextSleepSummary(
  blocks: ScheduleBlock[],
  nowAbsMin: number,
  snoozedWakeUp: { sourceAlertId: string; blockId: string; triggerAbsMin: number } | null
): {
  sleepBlock: ScheduleBlock | null;
  bedtimeLabel: string;
  wakeUpLabel: string;
  wakeUpDateText: string;
  wakeUpRelativeText: string;
  isSnoozed: boolean;
} {
  const { dayIndex: currentDayIndex } = fromAbsMin(nowAbsMin);
  const sleepBlocks = blocks
    .filter((b) => b.type === 'sleep')
    .sort((a, b) => getBlockStartAbs(a) - getBlockStartAbs(b));

  const activeOrNext =
    sleepBlocks.find((b) => getBlockEndAbs(b) > nowAbsMin) ?? sleepBlocks[0] ?? null;

  if (!activeOrNext) {
    return {
      sleepBlock: null,
      bedtimeLabel: 'Not scheduled',
      wakeUpLabel: 'Not scheduled',
      wakeUpDateText: '',
      wakeUpRelativeText: '',
      isSnoozed: false,
    };
  }

  const bedtimeLabel = formatMinutes12h(activeOrNext.startMin);
  const wakeAbs =
    snoozedWakeUp && snoozedWakeUp.triggerAbsMin >= nowAbsMin
      ? snoozedWakeUp.triggerAbsMin
      : getBlockEndAbs(activeOrNext);
  const wakeParts = fromAbsMin(wakeAbs);
  const wakeUpLabel = formatMinutes12h(wakeParts.minuteOfDay);
  const wakeUpDateText = formatDayLabel(wakeParts.dayIndex);
  const relDay = formatRelativeDayName(wakeParts.dayIndex, currentDayIndex);

  return {
    sleepBlock: activeOrNext,
    bedtimeLabel,
    wakeUpLabel,
    wakeUpDateText,
    wakeUpRelativeText: `${relDay}, ${wakeUpLabel}`,
    isSnoozed: Boolean(snoozedWakeUp && snoozedWakeUp.triggerAbsMin >= nowAbsMin),
  };
}

export function getWakeUpReadiness(
  blocks: ScheduleBlock[],
  nowAbsMin: number,
  permissions: AndroidPermissionsState,
  snoozedWakeUp: { sourceAlertId: string; blockId: string; triggerAbsMin: number } | null
): {
  ready: boolean;
  statusText: string;
  blockerReason: string | null;
} {
  const sleepInfo = resolveNextSleepSummary(blocks, nowAbsMin, snoozedWakeUp);
  if (!sleepInfo.sleepBlock || !sleepInfo.sleepBlock.wakeAtEnd) {
    return {
      ready: true,
      statusText: 'Wake-up alarm is turned off for your next sleep block.',
      blockerReason: null,
    };
  }

  if (!permissions.exactAlarms) {
    return {
      ready: false,
      statusText: `Wake-up for ${sleepInfo.wakeUpRelativeText} is blocked by Android exact alarm access.`,
      blockerReason: 'Exact alarm access is required so wake-up and study start alarms ring on time.',
    };
  }

  if (!permissions.notifications) {
    return {
      ready: false,
      statusText: `Notifications are paused — heads-ups and alarm banners will not show.`,
      blockerReason: 'Allow notifications so StudyFlow can display session reminders and full-screen alarms.',
    };
  }

  return {
    ready: true,
    statusText: sleepInfo.isSnoozed
      ? `Snoozed wake-up set for ${sleepInfo.wakeUpRelativeText}.`
      : `Next wake-up set for ${sleepInfo.wakeUpRelativeText}.`,
    blockerReason: null,
  };
}
