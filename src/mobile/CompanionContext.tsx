import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ThemeId } from '../types/studyflow';
import type { CompanionCalendar, CompanionFocusCommand, CompanionFocusUpdate } from '../companion/client';
import {
  buildAlertSchedule,
  findExactAlertAtTime,
  formatMinutes12h,
  fromAbsMin,
  getBlockStartAbs,
  toAbsMin,
} from './companionLogic';
import {
  COMPANION_SUBJECTS,
  DEMO_START_ABS_MIN,
  INITIAL_SCHEDULE_BLOCKS,
  SESSION_SCREEN_TIME_APPS,
  SIMULATED_PC_CALENDAR_EDIT,
  TODAY_SCREEN_TIME_APPS,
} from './sampleData';
import type {
  AdvanceNoticeOption,
  AndroidPermissionsState,
  AppUsageEntry,
  CompanionConnectionState,
  CompanionFocusState,
  CompanionSettingsState,
  CompanionSubject,
  ConnectionMode,
  MobileTabId,
  ScheduleBlock,
  ScheduledAlert,
  ScreenTimeStateMode,
  ViewportPreviewConfig,
} from './types';

export interface LiveCompanionData {
  pcName: string;
  profileName?: string;
  calendar?: CompanionCalendar;
  isPaired: boolean;
  connected?: boolean;
  lastSync?: number;
  busy: boolean;
  pcFocus?: CompanionFocusUpdate;
  onFocusCommand?: (action: CompanionFocusCommand, sessionId?: string) => void;
  autoSync?: boolean;
  syncIntervalSeconds?: number;
  setAutoSync?: (enabled: boolean) => void;
  setSyncIntervalSeconds?: (seconds: number) => void;
  onSync: () => void;
  onReconnect: () => void;
  onForget: () => void;
  onPair: () => void;
  alarmStatus?: { exact: boolean; notifications: boolean } | null;
}

interface UsageResult {
  granted: boolean;
  today: { id: string; name: string; category?: string; minutes: number }[];
  session: { id: string; name: string; category?: string; minutes: number }[];
}
interface NativeUsageBridge {
  status: () => string;
  snapshot: (sessionStartMs: number) => string;
  request: () => void;
}
function usageBridge(): NativeUsageBridge | undefined {
  return (window as unknown as { StudyFlowUsage?: NativeUsageBridge }).StudyFlowUsage;
}
function currentAbsoluteMinute(): number {
  const d = new Date();
  return ((d.getDay() + 6) % 7) * 1440 + d.getHours() * 60 + d.getMinutes();
}
function calendarToBlocks(calendar?: CompanionCalendar): ScheduleBlock[] {
  if (!calendar) return [];
  const now = new Date();
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (now.getDay() + 6) % 7);
  return calendar.events.flatMap(event => {
    const date = new Date(event.startAt);
    if (!Number.isFinite(date.getTime())) return [];
    const day = Math.round((new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime() - monday.getTime()) / 86400000);
    if (day < -1 || day > 7) return [];
    return [{
      id: event.id, revision: calendar.revision, type: event.type, title: event.title,
      subjectId: event.type === 'study' ? 'synced-study' : undefined,
      dayIndex: day, startMin: date.getHours() * 60 + date.getMinutes(),
      durationMin: event.durationMinutes, advanceNoticeMin: (event.alarms?.advanceNoticeMin ?? 0) as AdvanceNoticeOption,
      ringAtStart: Boolean(event.alarms?.ringAtStart),
      focusIntervalMin: 25, remindAtBedtime: Boolean(event.alarms?.remindAtBedtime),
      wakeAtEnd: Boolean(event.alarms?.wakeAtEnd),
    }];
  });
}
const LIVE_SUBJECTS: CompanionSubject[] = [
  { id: 'synced-study', code: 'STUDY', name: 'Study session', color: '#4F46E5' },
];
function liveInitialFocus(): CompanionFocusState {
  return { ...makeInitialFocus(), sessionId: 'local-focus', subjectId: 'synced-study',
    sessionTitle: 'Focus session', startedAtAbsMin: null, pendingSyncWhenOnline: false };
}

interface SnoozedWakeUp {
  sourceAlertId: string;
  blockId: string;
  triggerAbsMin: number;
}

interface CompanionContextValue {
  // Navigation & overlays
  liveMode: boolean;
  profileName?: string;
  syncOptions?: { autoSync: boolean; intervalSeconds: number; setAutoSync: (enabled: boolean) => void; setIntervalSeconds: (seconds: number) => void };
  activeTab: MobileTabId;
  setActiveTab: (tab: MobileTabId) => void;
  selectedDayIndex: number;
  setSelectedDayIndex: (dayIndex: number) => void;
  selectedBlockId: string | null;
  openEventSheet: (blockId: string) => void;
  closeEventSheet: () => void;
  connectionSheetOpen: boolean;
  setConnectionSheetOpen: (open: boolean) => void;
  pairingOpen: boolean;
  setPairingOpen: (open: boolean) => void;
  handleAndroidBack: () => void;

  // Simulated clock (Asia/Colombo)
  nowAbsMin: number;
  jumpToAbsMin: (targetAbsMin: number) => void;
  advanceClockMinutes: (deltaMin: number) => void;
  resetDemoState: () => void;

  // Data
  subjects: CompanionSubject[];
  blocks: ScheduleBlock[];
  updateBlock: (
    blockId: string,
    patch: Partial<
      Pick<
        ScheduleBlock,
        | 'title'
        | 'startMin'
        | 'durationMin'
        | 'advanceNoticeMin'
        | 'ringAtStart'
        | 'remindAtBedtime'
        | 'wakeAtEnd'
      >
    >
  ) => void;

  // Alerts & notifications
  scheduledAlerts: ScheduledAlert[];
  activeBanner: ScheduledAlert | null;
  activeAlarm: ScheduledAlert | null;
  snoozedWakeUp: SnoozedWakeUp | null;
  dismissActiveBanner: () => void;
  dismissActiveAlarm: () => void;
  snoozeWakeUpAlarm: () => void;
  triggerAlertPreview: (kind: ScheduledAlert['kind']) => void;
  triggerTestAlarm: () => void;

  // Focus & screen time
  focus: CompanionFocusState;
  startFocusForBlock: (blockId?: string, origin?: 'phone' | 'pc' | 'alarm', openFullScreen?: boolean) => void;
  startCustomFocus: (subject: string, minutes: number) => void;
  pauseFocus: () => void;
  resumeFocus: () => void;
  finishFocus: () => void;
  startBreakInterval: () => void;
  skipBreakInterval: () => void;
  setFocusFullScreen: (open: boolean) => void;
  simulateFocusIntervalEnd: () => void;

  screenTimeMode: ScreenTimeStateMode;
  setScreenTimeMode: (mode: ScreenTimeStateMode) => void;
  screenTimeTab: 'session' | 'today';
  setScreenTimeTab: (tab: 'session' | 'today') => void;
  sessionScreenTimeApps: AppUsageEntry[];
  todayScreenTimeApps: AppUsageEntry[];

  // Connection, pairing & sync
  connection: CompanionConnectionState;
  completePairing: (pcName?: string) => void;
  skipPairing: () => void;
  setConnectionMode: (mode: ConnectionMode) => void;
  toggleBluetoothRange: () => void;
  triggerSyncNow: (via?: 'internet' | 'bluetooth') => void;
  stagePcCalendarEdit: () => void;

  // Permissions & settings
  permissions: AndroidPermissionsState;
  setPermission: (key: keyof AndroidPermissionsState, enabled: boolean) => void;
  settings: CompanionSettingsState;
  updateSettings: (patch: Partial<CompanionSettingsState>) => void;
  setTheme: (theme: ThemeId) => void;

  // Reviewer preview viewport controls
  viewport: ViewportPreviewConfig;
  setViewport: (patch: Partial<ViewportPreviewConfig>) => void;

  // Toast feedback inside phone
  phoneToast: string | null;
  showPhoneToast: (msg: string) => void;
}

const CompanionContext = createContext<CompanionContextValue | null>(null);

function makeInitialFocus(): CompanionFocusState {
  return {
    sessionId: 'blk-chem-mon',
    subjectId: 'chem210',
    sessionTitle: 'Organic Reaction Mechanisms',
    phase: 'idle',
    origin: 'phone',
    intervalMinutes: 25,
    breakMinutes: 5,
    totalSeconds: 25 * 60,
    secondsLeft: 25 * 60,
    elapsedActiveSeconds: 0,
    startedAtAbsMin: null,
    pendingSyncWhenOnline: false,
    showFullScreen: false,
    showBreakSheet: false,
  };
}

export const CompanionProvider: React.FC<{ children: React.ReactNode; live?: LiveCompanionData }> = ({ children, live }) => {
  const [activeTab, setActiveTabState] = useState<MobileTabId>('today');
  const [tabHistory, setTabHistory] = useState<MobileTabId[]>(['today']);
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(0);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [connectionSheetOpen, setConnectionSheetOpen] = useState(false);
  const [pairingOpen, setPairingOpenState] = useState(false);
  const setPairingOpen = useCallback((open: boolean) => {
    if (open && live) { live.onReconnect(); return; }
    setPairingOpenState(open);
  }, [live]);

  const [nowAbsMin, setNowAbsMin] = useState<number>(live ? currentAbsoluteMinute() : DEMO_START_ABS_MIN);
  const [blocks, setBlocks] = useState<ScheduleBlock[]>(live ? calendarToBlocks(live.calendar) : INITIAL_SCHEDULE_BLOCKS);
  const [snoozedWakeUp, setSnoozedWakeUp] = useState<SnoozedWakeUp | null>(null);
  const [dismissedAlertIds, setDismissedAlertIds] = useState<Set<string>>(() => new Set());
  const [activeBanner, setActiveBanner] = useState<ScheduledAlert | null>(null);
  const [activeAlarm, setActiveAlarm] = useState<ScheduledAlert | null>(null);

  const [focus, setFocus] = useState<CompanionFocusState>(() => {
    if (!live) return makeInitialFocus();
    try {
      const saved = JSON.parse(localStorage.getItem('studyflow.phone.localFocus') || 'null');
      if (saved?.focus?.origin === 'phone' && saved.focus.pendingSyncWhenOnline) {
        const f = saved.focus as CompanionFocusState;
        const passed = f.phase === 'focus' || f.phase === 'break'
          ? Math.max(0, Math.floor((Date.now() - Number(saved.at)) / 1000)) : 0;
        const elapsed = Math.min(f.secondsLeft, passed);
        return { ...f, secondsLeft: Math.max(0, f.secondsLeft - elapsed),
          elapsedActiveSeconds: f.elapsedActiveSeconds + (f.phase === 'focus' ? elapsed : 0),
          phase: elapsed && elapsed >= f.secondsLeft ? 'completed' : f.phase,
          showFullScreen: false };
      }
    } catch { /* Invalid local state is ignored. */ }
    return liveInitialFocus();
  });
  useEffect(() => {
    if (!live) return;
    if (focus.origin === 'phone' && focus.pendingSyncWhenOnline)
      localStorage.setItem('studyflow.phone.localFocus', JSON.stringify({ at: Date.now(), focus }));
    else localStorage.removeItem('studyflow.phone.localFocus');
  }, [Boolean(live), focus]);
  const pcWasRunning = useRef(false);
  const [sessionStartEpoch, setSessionStartEpoch] = useState(0);
  const [measuredSessionUsage, setMeasuredSessionUsage] = useState<AppUsageEntry[]>([]);
  const [measuredTodayUsage, setMeasuredTodayUsage] = useState<AppUsageEntry[]>([]);
  const [screenTimeMode, setScreenTimeModeState] = useState<ScreenTimeStateMode>(live ? 'permission_needed' : 'measured');
  const [screenTimeTab, setScreenTimeTab] = useState<'session' | 'today'>('session');

  const [connection, setConnection] = useState<CompanionConnectionState>(live ? {
    isPaired: live.isPaired, pcName: live.pcName, mode: live.connected ? 'internet' : 'offline',
    internetAvailable: Boolean(live.connected), bluetoothNearby: false,
    lastSyncedLabel: live.lastSync ? new Date(live.lastSync).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : 'Not synced',
    pendingPcEdit: null,
  } : {
    isPaired: true,
    pcName: "Maya's StudyFlow PC",
    mode: 'internet',
    internetAvailable: true,
    bluetoothNearby: true,
    lastSyncedLabel: '7:12 AM',
    pendingPcEdit: null,
  });

  const [permissions, setPermissions] = useState<AndroidPermissionsState>(live ? {
    notifications: Boolean(live.alarmStatus?.notifications),
    exactAlarms: Boolean(live.alarmStatus?.exact),
    usageAccess: false,
  } : {
    notifications: true,
    exactAlarms: true,
    usageAccess: true,
  });

  const [settings, setSettings] = useState<CompanionSettingsState>(() => {
    const defaults: CompanionSettingsState = {
      theme: 'light', accentColor: '#4F46E5', deepFocus: false,
      defaultAdvanceNotice: 15, defaultRingAtStart: true,
      defaultRemindAtBedtime: true, defaultWakeAtEnd: true,
    };
    if (!live) return defaults;
    try {
      const saved = JSON.parse(localStorage.getItem('studyflow.phone.appearance') || 'null');
      if (saved && typeof saved === 'object') return {
        ...defaults,
        deepFocus: saved.deepFocus === true,
        theme: ['light', 'dark', 'midnight', 'ocean', 'forest', 'warm'].includes(saved.theme) ? saved.theme : defaults.theme,
        accentColor: /^#[0-9A-Fa-f]{6}$/.test(saved.accentColor) ? saved.accentColor : defaults.accentColor,
      };
    } catch { /* Keep defaults. */ }
    return defaults;
  });

  useEffect(() => {
    if (!live) return;
    localStorage.setItem('studyflow.phone.appearance', JSON.stringify({
      theme: settings.theme, accentColor: settings.accentColor, deepFocus: settings.deepFocus === true,
    }));
  }, [Boolean(live), settings.theme, settings.accentColor, settings.deepFocus]);

  const [viewport, setViewportState] = useState<ViewportPreviewConfig>({
    widthDp: 390,
    fontScale: 1,
  });

  const [phoneToast, setPhoneToast] = useState<string | null>(null);

  const showPhoneToast = useCallback((msg: string) => {
    setPhoneToast(msg);
  }, []);

  useEffect(() => {
    if (!phoneToast) return;
    const t = window.setTimeout(() => setPhoneToast(null), 2800);
    return () => window.clearTimeout(t);
  }, [phoneToast]);

  const scheduledAlerts = useMemo(
    () => buildAlertSchedule(blocks, COMPANION_SUBJECTS, snoozedWakeUp),
    [blocks, snoozedWakeUp]
  );

  // The installed app uses native Android alarms, not the preview's simulated alarm.
  useEffect(() => {
    if (live) return;
    const initial = findExactAlertAtTime(scheduledAlerts, DEMO_START_ABS_MIN, new Set());
    if (initial && initial.kind === 'study_headsup') {
      setActiveBanner(initial);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!live) return;
    setBlocks(calendarToBlocks(live.calendar));
    setConnection(prev => ({
      ...prev,
      isPaired: live.isPaired,
      pcName: live.pcName,
      mode: live.busy ? 'syncing' : live.connected ? 'internet' : 'offline',
      internetAvailable: Boolean(live.connected),
      bluetoothNearby: false,
      lastSyncedLabel: live.lastSync ? new Date(live.lastSync).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : 'Not synced',
      pendingPcEdit: null,
    }));
  }, [live?.calendar, live?.pcName, live?.isPaired, live?.connected, live?.lastSync, live?.busy]);

  useEffect(() => {
    if (!live) return;
    const tick = () => setNowAbsMin(currentAbsoluteMinute());
    tick();
    const timer = window.setInterval(tick, 15000);
    return () => window.clearInterval(timer);
  }, [Boolean(live)]);

  useEffect(() => {
    if (!live) return;
    const refresh = () => {
      try {
        const bridge = usageBridge();
        if (!bridge) throw new Error('Usage bridge unavailable');
        const result = JSON.parse(bridge.snapshot(sessionStartEpoch)) as UsageResult;
        setPermissions(prev => ({
          ...prev,
          usageAccess: result.granted,
          notifications: Boolean(live.alarmStatus?.notifications),
          exactAlarms: Boolean(live.alarmStatus?.exact),
        }));
        setScreenTimeModeState(result.granted ? 'measured' : 'permission_needed');
        const colorSet = ['#4F46E5', '#0D9488', '#E87929', '#7C3AED', '#0284C7', '#DC2626'];
        const convert = (rows: UsageResult['today']): AppUsageEntry[] =>
          (rows ?? []).map((item, index) => ({
            id: item.id, name: item.name, category: item.category || 'Other',
            minutes: item.minutes, color: colorSet[index % colorSet.length],
          }));
        setMeasuredSessionUsage(convert(result.session));
        setMeasuredTodayUsage(convert(result.today));
      } catch {
        setScreenTimeModeState('permission_needed');
        setMeasuredSessionUsage([]);
        setMeasuredTodayUsage([]);
      }
    };
    refresh();
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    const interval = window.setInterval(refresh, 15000);
    return () => {
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
      window.clearInterval(interval);
    };
  }, [Boolean(live), sessionStartEpoch, live?.alarmStatus?.notifications, live?.alarmStatus?.exact]);

  // PC is the source of truth. Time correction uses the server time returned by
  // the companion protocol, not the phone clock or a simulated demo clock.
  useEffect(() => {
    const remote = live?.pcFocus;
    if (!live?.connected || !remote?.focus?.timer) return;
    const timer = remote.focus.timer;
    const pcElapsed = timer.running
      ? Math.max(0, Math.floor((remote.serverNowMs - remote.focus.at) / 1000))
      : 0;
    const secondsLeft = timer.mode === 'Stopwatch'
      ? 0 : Math.max(0, timer.secondsLeft - pcElapsed);
    const elapsed = Math.max(0, timer.elapsedSeconds + pcElapsed);
    const phase: CompanionFocusState['phase'] = timer.completionModalOpen
      ? 'completed'
      : timer.running
      ? timer.phase === 'break' ? 'break' : 'focus'
      : timer.elapsedSeconds > 0
      ? timer.phase === 'break' ? 'break_paused' : 'paused'
      : 'idle';
    setFocus(prev => {
      // Preserve a locally running timer if Windows reports no active session.
      if (prev.origin === 'phone' && prev.pendingSyncWhenOnline && phase === 'idle') return prev;
      return ({
      ...prev,
      sessionId: timer.calendarSessionId ?? 'pc-timer',
      subjectId: 'synced-study',
      customSubject: undefined,
      sessionTitle: timer.taskTitle || 'PC Focus Timer',
      phase,
      origin: 'pc',
      pcMode: timer.mode,
      intervalMinutes: Math.max(1, Math.round(timer.totalSeconds / 60)),
      breakMinutes: 5,
      totalSeconds: timer.totalSeconds,
      secondsLeft,
      elapsedActiveSeconds: elapsed,
      startedAtAbsMin: currentAbsoluteMinute(),
      pendingSyncWhenOnline: false,
      showBreakSheet: false,
    }); });
    if (timer.running && !pcWasRunning.current) {
      setActiveTabState('focus');
      if (timer.phase === 'focus') showPhoneToast('Focus started on your PC · timer synchronized');
      if (!sessionStartEpoch) setSessionStartEpoch(Date.now() - elapsed * 1000);
    }
    if (!timer.running && timer.elapsedSeconds === 0) setSessionStartEpoch(0);
    pcWasRunning.current = timer.running;
  }, [live?.pcFocus, live?.connected]);

  // Live 1-second timer tick when focus or break is actively running
  useEffect(() => {
    if (focus.phase !== 'focus' && focus.phase !== 'break') return;
    let lastTick = Date.now();
    const interval = window.setInterval(() => {
      const step = Math.max(1, Math.floor((Date.now() - lastTick) / 1000));
      lastTick = Date.now();
      setFocus((prev) => {
        if (prev.phase !== 'focus' && prev.phase !== 'break') return prev;
        if (prev.origin === 'pc' && prev.pcMode === 'Stopwatch') {
          return { ...prev, elapsedActiveSeconds: prev.elapsedActiveSeconds + step };
        }
        if (prev.secondsLeft <= step) {
          if (prev.phase === 'focus') {
            return {
              ...prev,
              secondsLeft: 0,
              elapsedActiveSeconds: prev.elapsedActiveSeconds + prev.secondsLeft,
              phase: 'paused',
              showBreakSheet: true,
            };
          }
          return {
            ...prev,
            secondsLeft: 0,
            phase: 'completed',
          };
        }
        return {
          ...prev,
          secondsLeft: prev.secondsLeft - step,
          elapsedActiveSeconds:
            prev.phase === 'focus' ? prev.elapsedActiveSeconds + step : prev.elapsedActiveSeconds,
        };
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, [focus.phase]);

  const setActiveTab = useCallback((tab: MobileTabId) => {
    setActiveTabState(tab);
    setTabHistory((prev) => (prev[prev.length - 1] === tab ? prev : [...prev.slice(-6), tab]));
  }, []);

  const openEventSheet = useCallback((blockId: string) => {
    setSelectedBlockId(blockId);
  }, []);

  const closeEventSheet = useCallback(() => {
    setSelectedBlockId(null);
  }, []);

  /**
   * Evaluates and surfaces ONLY the exact alert matching `targetAbsMin`.
   * Never replays skipped earlier notifications on direct clock jumps.
   */
  const activateAlertForMinute = useCallback(
    (
      targetAbsMin: number,
      alertsList: ScheduledAlert[],
      dismissedSet: Set<string>,
      perms: AndroidPermissionsState,
      currentFocus: CompanionFocusState
    ) => {
      // Check if an active 25-min focus interval ends at this exact target minute
      if (
        currentFocus.phase === 'focus' &&
        currentFocus.startedAtAbsMin !== null &&
        targetAbsMin >= currentFocus.startedAtAbsMin + currentFocus.intervalMinutes
      ) {
        setFocus((prev) => ({
          ...prev,
          secondsLeft: 0,
          elapsedActiveSeconds: prev.intervalMinutes * 60,
          phase: 'paused',
          showBreakSheet: true,
        }));
        if (perms.notifications) {
          const targetDate = fromAbsMin(targetAbsMin);
          setActiveBanner({
            id: `focus_break_prompt:${currentFocus.sessionId}:${targetAbsMin}`,
            kind: 'focus_break_prompt',
            blockId: currentFocus.sessionId,
            blockRevision: 0,
            triggerAbsMin: targetAbsMin,
            title: 'Focus interval complete',
            subtitle: `Take a ${currentFocus.breakMinutes}-minute break before resuming`,
            subjectId: currentFocus.subjectId,
            exactTimeLabel: formatMinutes12h(targetDate.minuteOfDay),
            dateLabel: 'Today',
            suggestedBreakMin: currentFocus.breakMinutes,
          });
        }
        setActiveAlarm(null);
        return;
      }

      const exact = findExactAlertAtTime(alertsList, targetAbsMin, dismissedSet);
      if (!exact) {
        setActiveBanner(null);
        setActiveAlarm(null);
        return;
      }

      if (exact.kind === 'study_start_alarm' || exact.kind === 'sleep_wakeup_alarm') {
        if (!perms.exactAlarms) {
          setActiveAlarm(null);
          setActiveBanner(null);
          showPhoneToast('Alarm blocked — enable Exact alarms in Settings');
          return;
        }
        setActiveBanner(null);
        setActiveAlarm(exact);
      } else {
        if (!perms.notifications) {
          setActiveBanner(null);
          return;
        }
        setActiveAlarm(null);
        setActiveBanner(exact);
      }
    },
    [showPhoneToast]
  );

  const jumpToAbsMin = useCallback(
    (targetAbsMin: number) => {
      const clamped = Math.max(0, Math.min(6 * 1440 + 1439, Math.round(targetAbsMin)));
      const { dayIndex } = fromAbsMin(clamped);
      setNowAbsMin(clamped);
      setSelectedDayIndex(dayIndex);

      // If focus is running and we jump forward inside the focus interval, advance timer smoothly
      let nextFocusState = focus;
      if (focus.phase === 'focus' && focus.startedAtAbsMin !== null) {
        const elapsedMin = Math.max(0, clamped - focus.startedAtAbsMin);
        const remainingSec = Math.max(0, (focus.intervalMinutes - elapsedMin) * 60);
        nextFocusState = {
          ...focus,
          secondsLeft: remainingSec,
          elapsedActiveSeconds: Math.min(focus.intervalMinutes * 60, elapsedMin * 60),
        };
        setFocus(nextFocusState);
      }

      activateAlertForMinute(clamped, scheduledAlerts, dismissedAlertIds, permissions, nextFocusState);
    },
    [activateAlertForMinute, dismissedAlertIds, focus, permissions, scheduledAlerts]
  );

  const advanceClockMinutes = useCallback(
    (deltaMin: number) => {
      jumpToAbsMin(nowAbsMin + deltaMin);
    },
    [jumpToAbsMin, nowAbsMin]
  );

  /**
   * Edits a block and increments its revision so any previously scheduled or currently
   * displayed alert belonging to the old schedule is immediately cancelled and replaced.
   */
  const updateBlock = useCallback(
    (
      blockId: string,
      patch: Partial<
        Pick<
          ScheduleBlock,
          | 'title'
          | 'startMin'
          | 'durationMin'
          | 'advanceNoticeMin'
          | 'ringAtStart'
          | 'remindAtBedtime'
          | 'wakeAtEnd'
        >
      >
    ) => {
      let updatedBlocks: ScheduleBlock[] = [];
      setBlocks((prev) => {
        updatedBlocks = prev.map((b) =>
          b.id === blockId ? { ...b, ...patch, revision: b.revision + 1 } : b
        );
        return updatedBlocks;
      });

      // Cancel stale snooze if the edited block is the snoozed sleep block
      const nextSnooze =
        snoozedWakeUp && snoozedWakeUp.blockId === blockId ? null : snoozedWakeUp;
      if (nextSnooze !== snoozedWakeUp) {
        setSnoozedWakeUp(null);
      }

      // Immediately recompute alerts and cancel any currently visible stale banner/alarm for this block
      const recomputed = buildAlertSchedule(updatedBlocks, COMPANION_SUBJECTS, nextSnooze);
      setActiveBanner((curr) => (curr?.blockId === blockId ? null : curr));
      setActiveAlarm((curr) => (curr?.blockId === blockId ? null : curr));

      // Check if an updated alert now matches the current simulated minute
      const exactNow = findExactAlertAtTime(recomputed, nowAbsMin, dismissedAlertIds);
      if (exactNow && exactNow.blockId === blockId) {
        if (exactNow.kind === 'study_headsup' || exactNow.kind === 'bedtime_reminder') {
          if (permissions.notifications) setActiveBanner(exactNow);
        } else if (permissions.exactAlarms) {
          setActiveAlarm(exactNow);
        }
      }

      // Sync focus title if linked to the edited block
      if (patch.title && focus.sessionId === blockId) {
        setFocus((prev) => ({ ...prev, sessionTitle: patch.title! }));
      }
    },
    [dismissedAlertIds, focus.sessionId, nowAbsMin, permissions, snoozedWakeUp]
  );

  const dismissActiveBanner = useCallback(() => {
    if (activeBanner) {
      setDismissedAlertIds((prev) => new Set(prev).add(activeBanner.id));
    }
    setActiveBanner(null);
  }, [activeBanner]);

  const dismissActiveAlarm = useCallback(() => {
    if (activeAlarm) {
      setDismissedAlertIds((prev) => new Set(prev).add(activeAlarm.id));
      if (activeAlarm.isSnoozed) {
        setSnoozedWakeUp(null);
      }
    }
    setActiveAlarm(null);
  }, [activeAlarm]);

  const snoozeWakeUpAlarm = useCallback(() => {
    if (!activeAlarm || activeAlarm.kind !== 'sleep_wakeup_alarm') return;
    const snoozeTarget = nowAbsMin + 5;
    setDismissedAlertIds((prev) => new Set(prev).add(activeAlarm.id));
    setSnoozedWakeUp({
      sourceAlertId: activeAlarm.snoozeSourceId ?? activeAlarm.id,
      blockId: activeAlarm.blockId ?? 'blk-sleep-mon',
      triggerAbsMin: snoozeTarget,
    });
    setActiveAlarm(null);
    const { minuteOfDay } = fromAbsMin(snoozeTarget);
    showPhoneToast(`Snoozed · will ring once at ${formatMinutes12h(minuteOfDay)}`);
  }, [activeAlarm, nowAbsMin, showPhoneToast]);

  const startFocusForBlock = useCallback(
    (blockId?: string, origin: 'phone' | 'pc' | 'alarm' = 'phone', openFullScreen = false) => {
      const target: ScheduleBlock =
        blocks.find((b) => b.id === blockId) ??
        blocks.find((b) => b.type === 'study' && b.dayIndex === fromAbsMin(nowAbsMin).dayIndex) ??
        blocks.find((b) => b.type === 'study') ??
        { id: 'local-focus', revision: 0, type: 'study', title: 'Focus session',
          subjectId: 'synced-study', dayIndex: fromAbsMin(nowAbsMin).dayIndex,
          startMin: fromAbsMin(nowAbsMin).minuteOfDay, durationMin: 25, advanceNoticeMin: 0,
          ringAtStart: false, focusIntervalMin: 25, remindAtBedtime: false, wakeAtEnd: false };

      if (live?.connected && live.onFocusCommand) {
        live.onFocusCommand('start', target.id === 'local-focus' ? '' : target.id);
        setActiveTab('focus');
        showPhoneToast('Start request sent to PC');
        return;
      }

      const intervalMin = target.focusIntervalMin ?? 25;
      const startMinute =
        origin === 'alarm' ? getBlockStartAbs(target) : nowAbsMin;

      if (activeAlarm) {
        setDismissedAlertIds((prev) => new Set(prev).add(activeAlarm.id));
        setActiveAlarm(null);
      }
      setActiveBanner(null);

      if (live) setSessionStartEpoch(Date.now());
      setFocus({
        sessionId: target.id,
        subjectId: target.subjectId ?? 'chem210',
        sessionTitle: target.title,
        phase: 'focus',
        origin,
        intervalMinutes: intervalMin,
        breakMinutes: 5,
        totalSeconds: intervalMin * 60,
        secondsLeft: intervalMin * 60,
        elapsedActiveSeconds: 0,
        startedAtAbsMin: startMinute,
        pendingSyncWhenOnline: connection.mode === 'offline',
        showFullScreen: openFullScreen,
        showBreakSheet: false,
      });

      setActiveTab('focus');
      if (live) {
        showPhoneToast('Focus timer started locally on your phone');
      } else if (origin === 'pc') {
        showPhoneToast(`Focus started on ${connection.pcName}`);
      } else if (origin === 'alarm') {
        showPhoneToast(`Focus started · ${intervalMin} min interval`);
      }
    },
    [activeAlarm, blocks, connection.mode, connection.pcName, nowAbsMin, setActiveTab, showPhoneToast, live]
  );

  const startCustomFocus = useCallback((subject: string, minutes: number) => {
    const title = subject.trim();
    if (!title || !Number.isInteger(minutes) || minutes < 1 || minutes > 720) return;
    if (focus.phase !== 'idle' && focus.phase !== 'completed') return;
    setSessionStartEpoch(Date.now());
    setFocus({
      ...liveInitialFocus(), sessionId: 'phone-' + crypto.randomUUID(),
      sessionTitle: title, customSubject: title, subjectId: 'synced-study',
      phase: 'focus', origin: 'phone', intervalMinutes: minutes,
      totalSeconds: minutes * 60, secondsLeft: minutes * 60,
      startedAtAbsMin: currentAbsoluteMinute(), pendingSyncWhenOnline: true,
    });
    setActiveTab('focus');
    showPhoneToast('Custom timer started on this phone');
  }, [focus.phase, setActiveTab, showPhoneToast]);

  const pauseFocus = useCallback(() => {
    if (live?.connected && live.onFocusCommand && focus.origin === 'pc') {
      live.onFocusCommand('pause'); showPhoneToast('Pause request sent to PC'); return;
    }
    setFocus((prev) => ({
      ...prev,
      phase: prev.phase === 'break' ? 'break_paused' : 'paused',
      pendingSyncWhenOnline: connection.mode === 'offline' ? true : prev.pendingSyncWhenOnline,
    }));
  }, [connection.mode, live, showPhoneToast, focus.origin]);

  const resumeFocus = useCallback(() => {
    if (live?.connected && live.onFocusCommand && focus.origin === 'pc') {
      live.onFocusCommand('resume'); showPhoneToast('Resume request sent to PC'); return;
    }
    setFocus((prev) => ({
      ...prev,
      phase: prev.phase === 'break_paused' ? 'break' : 'focus',
      pendingSyncWhenOnline: connection.mode === 'offline' ? true : prev.pendingSyncWhenOnline,
    }));
  }, [connection.mode, live, showPhoneToast, focus.origin]);

  const finishFocus = useCallback(() => {
    if (live?.connected && live.onFocusCommand && focus.origin === 'pc') {
      live.onFocusCommand('complete'); showPhoneToast('Finish request sent to PC; rate it on Windows'); return;
    }
    if (live && focus.origin === 'phone' && focus.elapsedActiveSeconds > 0) {
      try {
        const key = 'studyflow.phone.unsyncedFocus';
        const queue = JSON.parse(localStorage.getItem(key) || '[]') as unknown[];
        localStorage.setItem(key, JSON.stringify([...queue, { ...focus, completedAt: new Date().toISOString() }]));
      } catch { showPhoneToast('Could not save the local session'); return; }
    }
    setFocus((prev) => ({
      ...prev,
      phase: 'idle',
      secondsLeft: prev.intervalMinutes * 60,
      totalSeconds: prev.intervalMinutes * 60,
      startedAtAbsMin: null,
      showFullScreen: false,
      showBreakSheet: false,
      pendingSyncWhenOnline: false,
    }));
    showPhoneToast(live
      ? 'Focus session saved on phone · PC import not supported yet'
      : connection.mode === 'offline'
        ? 'Session saved locally · will sync when connected'
        : 'Focus session completed & synced'
    );
  }, [connection.mode, showPhoneToast, live, focus]);

  const startBreakInterval = useCallback(() => {
    setActiveBanner(null);
    setFocus((prev) => ({
      ...prev,
      phase: 'break',
      totalSeconds: prev.breakMinutes * 60,
      secondsLeft: prev.breakMinutes * 60,
      showBreakSheet: false,
    }));
    setActiveTab('focus');
    showPhoneToast('5-minute break started');
  }, [setActiveTab, showPhoneToast]);

  const skipBreakInterval = useCallback(() => {
    setActiveBanner(null);
    setFocus((prev) => ({
      ...prev,
      phase: 'focus',
      totalSeconds: prev.intervalMinutes * 60,
      secondsLeft: prev.intervalMinutes * 60,
      startedAtAbsMin: nowAbsMin,
      showBreakSheet: false,
    }));
    showPhoneToast('Break skipped · next 25-min focus started');
  }, [nowAbsMin, showPhoneToast]);

  const setFocusFullScreen = useCallback((open: boolean) => {
    setFocus((prev) => ({ ...prev, showFullScreen: open }));
  }, []);

  const simulateFocusIntervalEnd = useCallback(() => {
    const endTime =
      focus.startedAtAbsMin !== null
        ? focus.startedAtAbsMin + focus.intervalMinutes
        : toAbsMin(0, 7 * 60 + 55);
    setNowAbsMin(endTime);
    setFocus((prev) => ({
      ...prev,
      phase: 'paused',
      secondsLeft: 0,
      elapsedActiveSeconds: prev.intervalMinutes * 60,
      showBreakSheet: true,
    }));
    if (permissions.notifications) {
      const endDate = fromAbsMin(endTime);
      setActiveBanner({
        id: `focus_break_prompt:preview:${endTime}`,
        kind: 'focus_break_prompt',
        blockId: focus.sessionId,
        blockRevision: 0,
        triggerAbsMin: endTime,
        title: 'Focus interval complete',
        subtitle: `Take a ${focus.breakMinutes}-minute break`,
        subjectId: focus.subjectId,
        exactTimeLabel: formatMinutes12h(endDate.minuteOfDay),
        dateLabel: 'Today',
        suggestedBreakMin: focus.breakMinutes,
      });
    }
    setActiveAlarm(null);
  }, [focus.breakMinutes, focus.intervalMinutes, focus.sessionId, focus.startedAtAbsMin, focus.subjectId, permissions.notifications]);

  const triggerAlertPreview = useCallback(
    (kind: ScheduledAlert['kind']) => {
      if (kind === 'focus_break_prompt') {
        simulateFocusIntervalEnd();
        return;
      }

      const match = scheduledAlerts.find((a) => a.kind === kind);
      if (!match) {
        showPhoneToast('No scheduled event matches that alert type');
        return;
      }

      // Jump clock directly to that event's exact timestamp without replaying skipped alerts
      const targetMin = match.triggerAbsMin;
      setNowAbsMin(targetMin);
      setSelectedDayIndex(fromAbsMin(targetMin).dayIndex);
      setDismissedAlertIds((prev) => {
        const next = new Set(prev);
        next.delete(match.id);
        return next;
      });

      if (kind === 'study_start_alarm' || kind === 'sleep_wakeup_alarm') {
        if (!permissions.exactAlarms) {
          setActiveAlarm(null);
          showPhoneToast('Blocked by Exact alarm permission — enable in Settings');
          return;
        }
        setActiveBanner(null);
        setActiveAlarm(match);
      } else {
        if (!permissions.notifications) {
          setActiveBanner(null);
          showPhoneToast('Blocked by Notification permission — enable in Settings');
          return;
        }
        setActiveAlarm(null);
        setActiveBanner(match);
      }
    },
    [permissions.exactAlarms, permissions.notifications, scheduledAlerts, showPhoneToast, simulateFocusIntervalEnd]
  );

  const triggerTestAlarm = useCallback(() => {
    if (!permissions.exactAlarms) {
      showPhoneToast('Enable exact alarms first to test full-screen ringing');
      return;
    }
    const wake = scheduledAlerts.find((a) => a.kind === 'sleep_wakeup_alarm');
    setActiveBanner(null);
    setActiveAlarm(
      wake ?? {
        id: `test-alarm-${Date.now()}`,
        kind: 'sleep_wakeup_alarm',
        blockRevision: 0,
        triggerAbsMin: toAbsMin(1, 6 * 60 + 30),
        title: 'Wake up (Test alarm)',
        subtitle: 'Overnight Sleep',
        exactTimeLabel: '6:30 AM',
        dateLabel: 'Tuesday, Nov 24',
      }
    );
  }, [permissions.exactAlarms, scheduledAlerts, showPhoneToast]);

  const setScreenTimeMode = useCallback((mode: ScreenTimeStateMode) => {
    if (live) {
      if (mode === 'measured' && !permissions.usageAccess) usageBridge()?.request();
      return;
    }
    setScreenTimeModeState(mode);
    setPermissions(prev => ({ ...prev, usageAccess: mode !== 'permission_needed' }));
  }, [live, permissions.usageAccess]);

  const setPermission = useCallback((key: keyof AndroidPermissionsState, enabled: boolean) => {
    if (live) {
      if (key === 'usageAccess') {
        usageBridge()?.request();
      } else {
        const alarms = (window as unknown as { StudyFlowAlarms?: {
          enableNotifications: () => void; enableExact: () => void;
        } }).StudyFlowAlarms;
        if (enabled) {
          if (key === 'notifications') alarms?.enableNotifications();
          if (key === 'exactAlarms') alarms?.enableExact();
        }
      }
      return;
    }
    setPermissions(prev => ({ ...prev, [key]: enabled }));
    if (key === 'usageAccess') setScreenTimeModeState(enabled ? 'measured' : 'permission_needed');
  }, [live]);

  const completePairing = useCallback(
    (pcName = "Maya's StudyFlow PC") => {
      setConnection((prev) => ({
        ...prev,
        isPaired: true,
        pcName,
        mode: prev.internetAvailable ? 'internet' : prev.bluetoothNearby ? 'bluetooth' : 'offline',
        lastSyncedLabel: formatMinutes12h(fromAbsMin(nowAbsMin).minuteOfDay),
      }));
      setPairingOpen(false);
      setActiveTab('today');
      showPhoneToast(`Paired with ${pcName}`);
    },
    [nowAbsMin, setActiveTab, showPhoneToast]
  );

  const skipPairing = useCallback(() => {
    setConnection((prev) => ({
      ...prev,
      isPaired: false,
      mode: 'offline',
    }));
    setPairingOpen(false);
    setActiveTab('today');
  }, [setActiveTab]);

  const setConnectionMode = useCallback(
    (mode: ConnectionMode) => {
      setConnection((prev) => ({
        ...prev,
        mode,
        isPaired: true,
        internetAvailable: mode === 'internet' || mode === 'syncing',
        bluetoothNearby: mode === 'bluetooth' ? true : prev.bluetoothNearby,
      }));
      if (mode === 'offline') {
        setFocus((prev) =>
          prev.phase === 'focus' || prev.phase === 'paused'
            ? { ...prev, pendingSyncWhenOnline: true }
            : prev
        );
      } else {
        setFocus((prev) => ({ ...prev, pendingSyncWhenOnline: false }));
      }
    },
    []
  );

  const toggleBluetoothRange = useCallback(() => {
    if (live) { showPhoneToast('Bluetooth sync is not available in this build'); return; }
    setConnection((prev) => {
      const nextBt = !prev.bluetoothNearby;
      const nextMode: ConnectionMode =
        !nextBt && prev.mode === 'bluetooth'
          ? prev.internetAvailable
            ? 'internet'
            : 'offline'
          : prev.mode;
      return {
        ...prev,
        bluetoothNearby: nextBt,
        mode: nextMode,
      };
    });
  }, [live, showPhoneToast]);

  const stagePcCalendarEdit = useCallback(() => {
    if (live) { showPhoneToast('Use StudyFlow on Windows to edit the calendar'); return; }
    setConnection((prev) => ({
      ...prev,
      pendingPcEdit: SIMULATED_PC_CALENDAR_EDIT,
    }));
    showPhoneToast('PC calendar edit ready — tap Sync now to pull');
  }, [showPhoneToast, live]);

  const triggerSyncNow = useCallback(
    (via?: 'internet' | 'bluetooth') => {
      if (live) { live.onSync(); return; }
      if (!connection.isPaired) {
        setPairingOpen(true);
        return;
      }
      const targetTransport: ConnectionMode =
        via === 'bluetooth'
          ? 'bluetooth'
          : via === 'internet'
          ? 'internet'
          : connection.internetAvailable
          ? 'internet'
          : connection.bluetoothNearby
          ? 'bluetooth'
          : 'offline';

      if (targetTransport === 'offline') {
        showPhoneToast('PC is offline — cached schedule kept locally');
        return;
      }

      setConnection((prev) => ({ ...prev, mode: 'syncing' }));
      const pending = connection.pendingPcEdit;

      window.setTimeout(() => {
        if (pending) {
          updateBlock(pending.blockId, {
            title: pending.newTitle,
            startMin: pending.newStartMin,
            durationMin: pending.newDurationMin,
          });
        }
        const syncedAt = formatMinutes12h(fromAbsMin(nowAbsMin).minuteOfDay);
        setConnection((prev) => ({
          ...prev,
          mode: targetTransport,
          lastSyncedLabel: syncedAt,
          pendingPcEdit: null,
        }));
        setFocus((prev) => ({ ...prev, pendingSyncWhenOnline: false }));
        showPhoneToast(
          pending
            ? `Synced via ${targetTransport === 'bluetooth' ? 'Bluetooth nearby' : 'Internet'} · schedule updated`
            : `Synced via ${targetTransport === 'bluetooth' ? 'Bluetooth nearby' : 'Internet'}`
        );
      }, 650);
    },
    [connection.bluetoothNearby, connection.internetAvailable, connection.isPaired, connection.pendingPcEdit, nowAbsMin, showPhoneToast, updateBlock, live]
  );

  const updateSettings = useCallback((patch: Partial<CompanionSettingsState>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
  }, []);

  const setTheme = useCallback((theme: ThemeId) => {
    setSettings((prev) => ({ ...prev, theme }));
  }, []);

  const setViewport = useCallback((patch: Partial<ViewportPreviewConfig>) => {
    setViewportState((prev) => ({ ...prev, ...patch }));
  }, []);

  const handleAndroidBack = useCallback(() => {
    if (activeAlarm) {
      dismissActiveAlarm();
      return;
    }
    if (pairingOpen) {
      setPairingOpen(false);
      return;
    }
    if (focus.showBreakSheet) {
      setFocus((prev) => ({ ...prev, showBreakSheet: false }));
      return;
    }
    if (focus.showFullScreen) {
      setFocus((prev) => ({ ...prev, showFullScreen: false }));
      return;
    }
    if (selectedBlockId) {
      setSelectedBlockId(null);
      return;
    }
    if (connectionSheetOpen) {
      setConnectionSheetOpen(false);
      return;
    }
    if (tabHistory.length > 1) {
      const nextHist = tabHistory.slice(0, -1);
      setTabHistory(nextHist);
      setActiveTabState(nextHist[nextHist.length - 1]);
      return;
    }
    if (activeTab !== 'today') {
      setActiveTabState('today');
    }
  }, [activeAlarm, activeTab, connectionSheetOpen, dismissActiveAlarm, focus.showBreakSheet, focus.showFullScreen, pairingOpen, selectedBlockId, tabHistory]);

  const resetDemoState = useCallback(() => {
    setBlocks(INITIAL_SCHEDULE_BLOCKS);
    setSnoozedWakeUp(null);
    setDismissedAlertIds(new Set());
    setNowAbsMin(DEMO_START_ABS_MIN);
    setSelectedDayIndex(0);
    setSelectedBlockId(null);
    setConnectionSheetOpen(false);
    setPairingOpen(false);
    setActiveTabState('today');
    setTabHistory(['today']);
    setFocus(makeInitialFocus());
    setScreenTimeModeState('measured');
    setScreenTimeTab('session');
    setPermissions({ notifications: true, exactAlarms: true, usageAccess: true });
    setConnection({
      isPaired: true,
      pcName: "Maya's StudyFlow PC",
      mode: 'internet',
      internetAvailable: true,
      bluetoothNearby: true,
      lastSyncedLabel: '7:12 AM',
      pendingPcEdit: null,
    });
    const freshAlerts = buildAlertSchedule(INITIAL_SCHEDULE_BLOCKS, COMPANION_SUBJECTS, null);
    const headsUp = findExactAlertAtTime(freshAlerts, DEMO_START_ABS_MIN, new Set());
    setActiveAlarm(null);
    setActiveBanner(headsUp);
    showPhoneToast('Demo reset to 7:15 AM (Asia/Colombo)');
  }, [showPhoneToast]);

  const value: CompanionContextValue = {
    liveMode: Boolean(live),
    profileName: live?.profileName,
    syncOptions: live?.setAutoSync && live.setSyncIntervalSeconds ? {
      autoSync: live.autoSync !== false,
      intervalSeconds: live.syncIntervalSeconds ?? 2,
      setAutoSync: live.setAutoSync,
      setIntervalSeconds: live.setSyncIntervalSeconds,
    } : undefined,
    activeTab,
    setActiveTab,
    selectedDayIndex,
    setSelectedDayIndex,
    selectedBlockId,
    openEventSheet,
    closeEventSheet,
    connectionSheetOpen,
    setConnectionSheetOpen,
    pairingOpen,
    setPairingOpen,
    handleAndroidBack,
    nowAbsMin,
    jumpToAbsMin,
    advanceClockMinutes,
    resetDemoState,
    subjects: live ? LIVE_SUBJECTS : COMPANION_SUBJECTS,
    blocks,
    updateBlock,
    scheduledAlerts,
    activeBanner,
    activeAlarm,
    snoozedWakeUp,
    dismissActiveBanner,
    dismissActiveAlarm,
    snoozeWakeUpAlarm,
    triggerAlertPreview,
    triggerTestAlarm,
    focus,
    startFocusForBlock,
    startCustomFocus,
    pauseFocus,
    resumeFocus,
    finishFocus,
    startBreakInterval,
    skipBreakInterval,
    setFocusFullScreen,
    simulateFocusIntervalEnd,
    screenTimeMode,
    setScreenTimeMode,
    screenTimeTab,
    setScreenTimeTab,
    sessionScreenTimeApps: live ? measuredSessionUsage : SESSION_SCREEN_TIME_APPS,
    todayScreenTimeApps: live ? measuredTodayUsage : TODAY_SCREEN_TIME_APPS,
    connection,
    completePairing,
    skipPairing,
    setConnectionMode,
    toggleBluetoothRange,
    triggerSyncNow,
    stagePcCalendarEdit,
    permissions,
    setPermission,
    settings,
    updateSettings,
    setTheme,
    viewport,
    setViewport,
    phoneToast,
    showPhoneToast,
  };

  return <CompanionContext.Provider value={value}>{children}</CompanionContext.Provider>;
};

export function useCompanion(): CompanionContextValue {
  const ctx = useContext(CompanionContext);
  if (!ctx) throw new Error('useCompanion must be used within CompanionProvider');
  return ctx;
}

export const ADVANCE_NOTICE_CHOICES: { value: AdvanceNoticeOption; label: string }[] = [
  { value: 10, label: '10 min' },
  { value: 15, label: '15 min' },
  { value: 0, label: 'Off' },
];
