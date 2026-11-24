import type { AdvanceNoticeOption, ScheduleBlockType, ThemeId } from '../types/studyflow';

export type MobileTabId = 'today' | 'calendar' | 'focus' | 'settings';

export type { AdvanceNoticeOption, ScheduleBlockType } from '../types/studyflow';

export interface CompanionSubject {
  id: string;
  code: string;
  name: string;
  color: string;
}

export interface ScheduleBlock {
  id: string;
  revision: number;
  type: ScheduleBlockType;
  title: string;
  subjectId?: string;
  /** Day index relative to week start (0 = Mon Nov 23, 1 = Tue Nov 24, ...) */
  dayIndex: number;
  /** Minutes from 00:00 on dayIndex (0..1439) */
  startMin: number;
  /** Duration in minutes (may cross midnight into dayIndex + 1) */
  durationMin: number;
  /** Study-only: 10 min, 15 min, or 0 (Off) */
  advanceNoticeMin: AdvanceNoticeOption;
  /** Study-only: full-screen alarm at exact start time */
  ringAtStart: boolean;
  /** Study-only: focus interval length in minutes */
  focusIntervalMin?: number;
  /** Sleep-only: gentle reminder at bedtime */
  remindAtBedtime: boolean;
  /** Sleep-only: wake-up alarm at exact end of sleep */
  wakeAtEnd: boolean;
  /** Optional subtitle / location */
  note?: string;
}

export interface TimelineSegment {
  block: ScheduleBlock;
  dayIndex: number;
  segmentStartMin: number;
  segmentEndMin: number;
  isCrossMidnightStart: boolean;
  isCrossMidnightEnd: boolean;
}

export type AlertKind =
  | 'study_headsup'
  | 'study_start_alarm'
  | 'bedtime_reminder'
  | 'sleep_wakeup_alarm'
  | 'focus_break_prompt';

export interface ScheduledAlert {
  id: string;
  kind: AlertKind;
  blockId?: string;
  blockRevision: number;
  /** Absolute minutes from Mon 00:00 (dayIndex * 1440 + minuteOfDay) */
  triggerAbsMin: number;
  title: string;
  subtitle: string;
  subjectId?: string;
  exactTimeLabel: string;
  dateLabel: string;
  isSnoozed?: boolean;
  snoozeSourceId?: string;
  suggestedBreakMin?: number;
}

export type FocusPhase = 'idle' | 'focus' | 'paused' | 'break' | 'break_paused' | 'completed';
export type FocusOrigin = 'phone' | 'pc' | 'alarm';

export interface CompanionFocusState {
  sessionId: string;
  subjectId: string;
  customSubject?: string;
  sessionTitle: string;
  phase: FocusPhase;
  origin: FocusOrigin;
  pcMode?: 'Pomodoro' | 'Countdown' | 'Stopwatch' | 'Custom';
  intervalMinutes: number;
  breakMinutes: number;
  totalSeconds: number;
  secondsLeft: number;
  elapsedActiveSeconds: number;
  startedAtAbsMin: number | null;
  pendingSyncWhenOnline: boolean;
  showFullScreen: boolean;
  showBreakSheet: boolean;
}

export type ScreenTimeStateMode = 'measured' | 'zero' | 'permission_needed';

export interface AppUsageEntry {
  id: string;
  name: string;
  category: string;
  minutes: number;
  color: string;
}

export type ConnectionMode = 'internet' | 'bluetooth' | 'syncing' | 'offline';

export interface PendingPcEdit {
  id: string;
  summary: string;
  blockId: string;
  newTitle: string;
  newStartMin: number;
  newDurationMin: number;
}

export interface CompanionConnectionState {
  isPaired: boolean;
  pcName: string;
  mode: ConnectionMode;
  internetAvailable: boolean;
  bluetoothNearby: boolean;
  lastSyncedLabel: string;
  pendingPcEdit: PendingPcEdit | null;
}

export interface AndroidPermissionsState {
  notifications: boolean;
  exactAlarms: boolean;
  usageAccess: boolean;
}

export interface CompanionSettingsState {
  theme: ThemeId;
  deepFocus?: boolean;
  accentColor: string;
  defaultAdvanceNotice: AdvanceNoticeOption;
  defaultRingAtStart: boolean;
  defaultRemindAtBedtime: boolean;
  defaultWakeAtEnd: boolean;
}

export interface ViewportPreviewConfig {
  widthDp: 390 | 360;
  fontScale: 1 | 1.15 | 1.3;
}
