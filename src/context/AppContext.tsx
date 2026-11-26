import { collectRewards, rewardSummary, type RewardLedger } from '../utils/rewards';
import { removeTaskLinks, syncGoalsForTaskStatusChange } from '../utils/goalProgress';
import type { GoalViewPreferences } from '../utils/goalFilters';
import { wipeWorkspace, WIPE_OPTIONS, type WipeSection } from '../desktop/wipeWorkspace';
import React, { createContext, useContext, useEffect, useState, useCallback, useRef, useMemo } from 'react';
import type {
  AchievementBadge,
  ActiveModalType,
  ChallengeItem,
  DashboardWidgetConfig,
  DensityMode,
  ExamItem,
  FlashcardDeck,
  FlashcardItem,
  FocusHistoryItem,
  GoalItem,
  NavRoute,
  NoteFolder,
  NoteItem,
  NotificationItem,
  PracticeAttempt,
  PracticeQuiz,
  StudyLabLaunchState,
  StudySession,
  Subject,
  TaskItem,
  ThemeId,
  TopicItem,
} from '../types/studyflow';
import {
  INITIAL_ACHIEVEMENTS,
  INITIAL_CHALLENGES,
  INITIAL_DASHBOARD_WIDGETS,
  INITIAL_DECKS,
  INITIAL_EXAMS,
  INITIAL_FLASHCARDS,
  INITIAL_FOCUS_HISTORY,
  INITIAL_FOLDERS,
  INITIAL_GOALS,
  INITIAL_NOTES,
  INITIAL_NOTIFICATIONS,
  INITIAL_QUIZZES,
  INITIAL_SESSIONS,
  INITIAL_SUBJECTS,
  INITIAL_TASKS,
  THEME_OPTIONS,
} from '../data/mockData';
import type { snapshotWriter } from '../desktop/storage';
import { chooseLegacyBackup, legacyOccurrences, mapLegacyWorkspace, type LegacyArchive } from '../desktop/legacy';
import { localDay } from '../assistant/workspaceContext';
import { resolveOfflineFocus, validOfflineRecord, type OfflineFocusRecord, type OfflineReceipts } from '../companion/offlineFocus';
import { scheduleFlashcardReview, type ReviewRating } from '../utils/studyLogic';
import { removeLegacySubject, unassignSubject } from '../utils/subjectReferences';
import { normalizeSyllabus, moveChapter, moveSyllabusItem, mergeImportedChapters, sanitizeSyllabusLinks, removeChapterLink, stripSyllabusNumberPrefix, type SyllabusScope, type IncomingChapter } from '../utils/syllabusHierarchy';
import { calendarProjectionDates, formatSessionDurationCompact } from '../utils/calendarLayout';
import { plannedBlocksForDay } from '../utils/workspaceMetrics';
import {
  advanceFocusTimerState,
  clampBreakMinutes,
  clampFocusHoursMinutes,
  clampFocusMinutes,
  computeSwitchElapsedMinutes,
  currentStudySessionRemaining,
  detectPlannedSessionInterruption,
  endFocusBreakState,
  formatHoursMinutesCompact,
  studySessionRemainingSeconds,
  takeFocusBreakState,
  type PausedFocusSnapshot,
  type PendingSessionPrompt,
} from '../utils/focusTimerLogic';
import { playSessionStartChime, showBrowserSessionNotification } from '../utils/soundAlert';

export interface ToastMessage {
  id: string;
  text: string;
  replaceKey?: string;
}

export interface FocusTimerState {
  startedAtMs?: number;
  mobileRunId?: string;
  calendarSessionId?: string | null;
  mode: 'Pomodoro' | 'Countdown' | 'Stopwatch' | 'Custom';
  phase: 'focus' | 'break';
  secondsLeft: number;
  totalSeconds: number;
  elapsedSeconds: number;
  running: boolean;
  subjectId: string;
  taskTitle: string;
  cycleCount: number;
  miniVisible: boolean;
  completionModalOpen: boolean;
  lastCompletedMinutes: number;
  pausedFocus?: PausedFocusSnapshot;
  breakDurationMin?: number;
  manualDurationOverride?: boolean;
}

export type PhoneFocusAction = {
  action: 'start' | 'pause' | 'resume' | 'reset' | 'complete' | 'take_break' | 'end_break' | 'offline_sync';
  sessionId?: string;
  record?: OfflineFocusRecord;
};

export interface UserPreferences {
  offlineFocusReceipts?: OfflineReceipts;
  onboarding?: 'open'|'later'|'complete';
  focusScene?: string;
  focusTrack?: string;
  musicVolume?: number;
  musicMuted?: boolean;
  googleAccount?: import('../desktop/GoogleAccount').GoogleProfile;
  name: string;
  email: string;
  major: string;
  dailyGoalHours: number;
  weeklyGoalHours: number;
  pomodoroFocusMin: number;
  pomodoroBreakMin: number;
  breaksEnabled?: boolean;
  autoStartBreaks: boolean;
  ambientSound: 'None' | 'Soft Rain' | 'Library Hum' | 'Brown Noise';
  desktopNotifications: boolean;
  examReminders: boolean;
  weeklyDigest: boolean;
  reducedMotion: boolean;
  highContrastText: boolean;
  showFocusStreak: boolean;
  localBackupAuto: boolean;
  pipMemory?: import('../assistant/studyPreferences').StudyPreferences;
  goalsPrefs?: GoalViewPreferences;
}

interface AppContextValue {
  durableWorkspace: boolean;
  saveWorkspace: () => Promise<void>;
  recurringSeries: LegacyArchive[string];
  setCalendarProjectionAnchor?: (date: string | null) => void;
  updateRecurringSeries?: (id: number, title: string, startHour: number, durationHours: number, fields?: Pick<StudySession, 'blockType' | 'countsTowardStudy' | 'alarms'>, subjectId?: string, weekdays?: number[]) => void;
  wipeData?: (sections: WipeSection[]) => Promise<void>;
  importLegacyBackup?: () => Promise<void>;
  legacyCalendar: boolean;
  cardReviews: Record<string, number>;
  exportWorkspace: () => void;
  loadDemoData: () => void;
  // Navigation & Shell
  route: NavRoute;
  setRoute: (r: NavRoute) => void;
  selectedSubjectId: string | null;
  setSelectedSubjectId: (id: string | null) => void;
  selectedNoteId: string;
  setSelectedNoteId: (id: string) => void;
  notesSyllabusScope: SyllabusScope;
  setNotesSyllabusScope: (scope: SyllabusScope) => void;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
  mobileNavOpen: boolean;
  setMobileNavOpen: React.Dispatch<React.SetStateAction<boolean>>;
  commandPaletteOpen: boolean;
  setCommandPaletteOpen: React.Dispatch<React.SetStateAction<boolean>>;
  activeModal: ActiveModalType;
  setActiveModal: (m: ActiveModalType) => void;

  // Theme & Density
  theme: ThemeId;
  setTheme: (t: ThemeId) => void;
  accentColor: string;
  setAccentColor: (hex: string) => void;
  density: DensityMode;
  setDensity: (d: DensityMode) => void;

  // Dashboard customization
  dashboardWidgets: DashboardWidgetConfig[];
  toggleDashboardWidget: (id: DashboardWidgetConfig['id']) => void;
  moveDashboardWidget: (id: DashboardWidgetConfig['id'], dir: 'up' | 'down') => void;
  resetDashboardWidgets: () => void;

  // Core Data
  subjects: Subject[];
  appendChapters: (id: string, chapters: IncomingChapter[]) => void;
  addSubject: (s: Omit<Subject, 'id' | 'chapters'>) => void;
  updateSubject: (subjectId: string, patch: Partial<Omit<Subject, 'id' | 'chapters'>>) => void;
  deleteSubject: (subjectId: string) => void;
  toggleArchiveSubject: (subjectId: string) => void;
  toggleArchiveChapter: (subjectId: string, chapterId: string) => void;
  addUnit: (subjectId: string, title: string) => void;
  updateUnit: (subjectId: string, unitId: string, patch: { title?: string; archived?: boolean }) => void;
  reorderUnit: (subjectId: string, unitId: string, delta: -1 | 1) => void;
  reorderChapter: (subjectId: string, chapterId: string, delta: -1 | 1) => void;
  addChapter: (subjectId: string, title: string, topicTitles?: string[], unitId?: string) => void;
  updateChapter: (subjectId: string, chapterId: string, title: string, unitId?: string) => void;
  deleteChapter: (subjectId: string, chapterId: string) => void;
  addTopic: (subjectId: string, chapterId: string, title: string, difficulty?: TopicItem['difficulty']) => void;
  deleteTopic: (subjectId: string, chapterId: string, topicId: string) => void;
  toggleTopicCompletion: (subjectId: string, chapterId: string, topicId: string) => void;
  updateTopicConfidence: (subjectId: string, chapterId: string, topicId: string, confidence: number) => void;

  tasks: TaskItem[];
  addTask: (t: Omit<TaskItem, 'id'>) => string;
  updateTask: (id: string, patch: Partial<TaskItem>) => void;
  deleteTasks: (ids: string[]) => void;
  toggleTaskStatus: (id: string) => void;
  toggleSubtask: (taskId: string, subtaskId: string) => void;

  sessions: StudySession[];
  addSession: (s: Omit<StudySession, 'id'>, weekdays?: number[]) => void;
  updateSession: (id: string, patch: Partial<StudySession>) => void;
  deleteSession: (id: string) => void;

  goals: GoalItem[];
  addGoal: (g: Omit<GoalItem, 'id'>) => void;
  updateGoal: (id: string, patch: Partial<GoalItem>) => void;
  deleteGoal: (id: string) => void;

  createFolder: (name: string, subjectId?: string, unitId?: string) => string;
  renameFolder: (id: string, name: string) => void;
  folders: NoteFolder[];
  notes: NoteItem[];
  deleteNote: (id: string) => void;
  updateNote: (id: string, patch: Partial<NoteItem>) => void;
  createNote: (
    subjectId: string,
    folderId: string,
    draft?: Partial<Pick<NoteItem, 'title' | 'content' | 'attachments' | 'pdf' | 'originalFont' | 'fontMode' | 'tags' | 'syllabusLinks'>>
  ) => string;

  decks: FlashcardDeck[];
  updateDeckLinks: (id: string, subjectId: string, links: FlashcardDeck['syllabusLinks']) => void;
  addDeck: (deck: Omit<FlashcardDeck, 'id' | 'lastReviewed' | 'retentionRate'>) => string;
  deleteDeck: (id: string) => void;
  deleteFlashcard: (id: string) => void;
  flashcards: FlashcardItem[];
  addFlashcard: (card: Omit<FlashcardItem, 'id' | 'intervalDays' | 'easeFactor' | 'dueToday' | 'mastery'>) => void;
  importFlashcardsBulk: (deckId: string, cards: Array<{ front: string; back: string; hint?: string }>) => number;
  reviewFlashcard: (cardId: string, rating: ReviewRating) => void;

  exams: ExamItem[];
  updateExam: (id: string, patch: Partial<Omit<ExamItem, 'id' | 'mockHistory'>>) => void;
  deleteExam: (id: string) => void;
  addExam: (exam: Omit<ExamItem, 'id' | 'mockHistory'>) => void;

  quizzes: PracticeQuiz[];
  updateQuizLinks: (id: string, subjectId: string, links: PracticeQuiz['syllabusLinks']) => void;
  addQuiz: (quiz:PracticeQuiz) => void;
  deleteQuiz: (id: string) => void;
  updateQuizQuestionExplanation: (quizId: string, questionId: string, explanation: string) => void;
  recordQuizScore: (quizId: string, attempt: PracticeAttempt) => void;

  studyLabLaunch: StudyLabLaunchState | null;
  openStudyLab: (launch?: Partial<StudyLabLaunchState>) => void;
  clearStudyLabLaunch: () => void;

  focusTimer: FocusTimerState;
  focusClock: { at: number; timer: FocusTimerState };
  applyPhoneFocusAction: (command: PhoneFocusAction) => void;
  setFocusMode: (mode: FocusTimerState['mode'], customMinutes?: number) => void;
  setFocusDuration: (hours: number, minutes: number, mode?: 'Countdown' | 'Custom') => void;
  useCurrentSessionRemainder: () => void;
  startCurrentSessionFocus: () => void;
  toggleFocusRunning: () => void;
  takeFocusBreak: (breakMinutes?: number) => void;
  endFocusBreak: () => void;
  resetFocusTimer: () => void;
  setFocusContext: (subjectId: string, taskTitle: string, calendarSessionId?: string) => void;
  setMiniTimerVisible: (visible: boolean) => void;
  triggerCompleteFocusSession: () => void;
  submitFocusCompletion: (rating: number) => void;
  dismissFocusCompletion: () => void;
  pendingSessionPrompt: PendingSessionPrompt | null;
  switchToPendingSession: () => void;
  dismissPendingSessionPrompt: () => void;
  focusHistory: FocusHistoryItem[];


  achievements: AchievementBadge[];
  challenges: ChallengeItem[];
  claimChallenge: (id: string) => void;
  xpPoints: number;

  notifications: NotificationItem[];
  markAllNotificationsRead: () => void;
  markNotificationRead: (id: string) => void;

  preferences: UserPreferences;
  updatePreferences: (patch: Partial<UserPreferences>) => void;

  toasts: ToastMessage[];
  pushToast: (text: string, replaceKey?: string) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean;
  const num = parseInt(full, 16);
  if (Number.isNaN(num)) return `rgba(79, 70, 229, ${alpha})`;
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export interface WorkspaceSnapshot {
  legacyArchive?: LegacyArchive;
  rewardLedger?: RewardLedger;
  cardReviews?: Record<string, number>;
  focusClock?: { at: number; timer: FocusTimerState };
  removedOccurrences?: string[];
  previousWorkspace?: Omit<WorkspaceSnapshot, 'previousWorkspace'>;
  theme: ThemeId;
  accentColor: string;
  density: DensityMode;
  dashboardWidgets: DashboardWidgetConfig[];
  subjects: Subject[];
  tasks: TaskItem[];
  sessions: StudySession[];
  goals: GoalItem[];
  folders: NoteFolder[];
  notes: NoteItem[];
  decks: FlashcardDeck[];
  flashcards: FlashcardItem[];
  exams: ExamItem[];
  quizzes: PracticeQuiz[];
  focusHistory: FocusHistoryItem[];
  challenges: ChallengeItem[];
  xpPoints: number;
  notifications: NotificationItem[];
  preferences: UserPreferences;
}

export interface WorkspacePersistence {
  initial: WorkspaceSnapshot | undefined;
  writer: ReturnType<typeof snapshotWriter<WorkspaceSnapshot>>;
}

function advanceFocusTimer(timer: FocusTimerState, seconds: number): FocusTimerState {
  return advanceFocusTimerState(timer, seconds);
}

export const AppProvider: React.FC<{ children: React.ReactNode; workspace?: WorkspacePersistence }> = ({ children, workspace }) => {
  const initial = workspace?.initial;
  const desktop = !!workspace;
  const [route, setRoute] = useState<NavRoute>('dashboard');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  const [selectedNoteId, setSelectedNoteId] = useState<string>(() => (initial?.notes ?? (desktop ? [] : INITIAL_NOTES))[0]?.id ?? '');
  const [notesSyllabusScope, setNotesSyllabusScope] = useState<SyllabusScope>({subjectId: ''});
  useEffect(() => { if (route !== 'notes') setNotesSyllabusScope({subjectId: ''}); }, [route]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [activeModal, setActiveModal] = useState<ActiveModalType>(null);
  const [studyLabLaunch, setStudyLabLaunch] = useState<StudyLabLaunchState | null>(null);

  const [theme, setTheme] = useState<ThemeId>(initial?.theme ?? 'light');
  const [accentColor, setAccentColor] = useState<string>(initial?.accentColor ?? '#4F46E5');
  const [density, setDensity] = useState<DensityMode>(initial?.density ?? 'compact');

  const [dashboardWidgets, setDashboardWidgets] = useState<DashboardWidgetConfig[]>(initial?.dashboardWidgets ?? INITIAL_DASHBOARD_WIDGETS);
  const [subjects, setSubjects] = useState<Subject[]>(() => (initial?.subjects ?? (desktop ? [] : INITIAL_SUBJECTS)).map(normalizeSyllabus));
  const [tasks, setTasks] = useState<TaskItem[]>(initial?.tasks ?? (desktop ? [] : INITIAL_TASKS));
  const tasksRef = useRef<TaskItem[]>(tasks);
  tasksRef.current = tasks;
  const [savedSessions, setSessions] = useState<StudySession[]>(initial?.sessions ?? (desktop ? [] : INITIAL_SESSIONS));
  const [goals, setGoals] = useState<GoalItem[]>(initial?.goals ?? (desktop ? [] : INITIAL_GOALS));
  const [folders, setFolders] = useState<NoteFolder[]>(initial?.folders ?? (desktop ? [{ id: 'notes', name: 'Notes' }] : INITIAL_FOLDERS));
  const [notes, setNotes] = useState<NoteItem[]>(initial?.notes ?? (desktop ? [] : INITIAL_NOTES));
  const [decks, setDecks] = useState<FlashcardDeck[]>(initial?.decks ?? (desktop ? [{ id: 'review', title: 'General Review', subjectId: '', description: '', lastReviewed: '', retentionRate: 0 }] : INITIAL_DECKS));
  const [storedFlashcards, setFlashcards] = useState<FlashcardItem[]>(initial?.flashcards ?? (desktop ? [] : INITIAL_FLASHCARDS));
  const [exams, setExams] = useState<ExamItem[]>(initial?.exams ?? (desktop ? [] : INITIAL_EXAMS));
  const [quizzes, setQuizzes] = useState<PracticeQuiz[]>(initial?.quizzes ?? (desktop ? [] : INITIAL_QUIZZES));
  const [focusHistory, setFocusHistory] = useState<FocusHistoryItem[]>(initial?.focusHistory ?? (desktop ? [] : INITIAL_FOCUS_HISTORY));
  const [rewardLedger, setRewardLedger] = useState<RewardLedger>(initial?.rewardLedger ?? {});
  const [challenges, setChallenges] = useState<ChallengeItem[]>(initial?.challenges ?? (desktop ? [] : INITIAL_CHALLENGES));
  const [xpPoints, setXpPoints] = useState<number>(initial?.xpPoints ?? (desktop ? 0 : 4280));
  const [notifications, setNotifications] = useState<NotificationItem[]>(initial?.notifications ?? (desktop ? [] : INITIAL_NOTIFICATIONS));
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const [preferences, setPreferences] = useState<UserPreferences>(initial?.preferences ?? {
    onboarding: desktop ? 'open' : undefined,
    name: desktop ? 'Student' : 'Maya Lin',
    email: desktop ? '' : 'maya.lin@university.edu',
    major: desktop ? '' : 'Computer Science & Quantitative Biology',
    dailyGoalHours: 4.5,
    weeklyGoalHours: 32,
    pomodoroFocusMin: 25,
    pomodoroBreakMin: 5,
    breaksEnabled: true,
    autoStartBreaks: false,
    ambientSound: 'None',
    desktopNotifications: true,
    examReminders: true,
    weeklyDigest: true,
    reducedMotion: false,
    highContrastText: false,
    showFocusStreak: true,
    localBackupAuto: true,
  });

  const [focusTimer, setFocusTimer] = useState<FocusTimerState>(() => initial?.focusClock
    ? advanceFocusTimer(initial.focusClock.timer, Math.floor((Date.now() - initial.focusClock.at) / 1000))
    : ({
    mode: 'Pomodoro',
    phase: 'focus',
    secondsLeft: 25 * 60,
    totalSeconds: 25 * 60,
    elapsedSeconds: 0,
    running: false,
    subjectId: desktop ? subjects[0]?.id ?? '' : 'cs340',
    taskTitle: desktop ? '' : 'Complete Problem Set 8: NP-Completeness Reductions',
    cycleCount: desktop ? 0 : 2,
    miniVisible: false,
    completionModalOpen: false,
    lastCompletedMinutes: 25,
  }));

  const [removedOccurrences, setRemovedOccurrences] = useState(initial?.removedOccurrences ?? []);
  const [archive, setArchive] = useState(initial?.legacyArchive);
  const [calendarDay, setCalendarDay] = useState(() => localDay());
  const [calendarProjectionAnchor, setCalendarProjectionAnchor] = useState<string | null>(null);
  useEffect(() => {
    const id = window.setInterval(() => setCalendarDay(localDay()), 30_000);
    return () => window.clearInterval(id);
  }, []);
  const sessions = useMemo(() => {
    if (!archive) return savedSessions;
    const dates = calendarProjectionDates(calendarDay, calendarProjectionAnchor ?? calendarDay);
    const overridden = new Set([...savedSessions.map(item => item.id), ...removedOccurrences]);
    return [...savedSessions, ...legacyOccurrences(archive, dates).filter(item => !overridden.has(item.id))];
  }, [archive, calendarDay, calendarProjectionAnchor, removedOccurrences, savedSessions]);

  // Record timer commands and phase changes. The clock itself advances from the timestamp.
  const focusClock = useMemo(() => ({ at: Date.now(), timer: focusTimer }), [
    focusTimer.running, focusTimer.mode, focusTimer.phase, focusTimer.totalSeconds,
    focusTimer.subjectId, focusTimer.taskTitle, focusTimer.calendarSessionId, focusTimer.cycleCount, focusTimer.miniVisible,
    focusTimer.completionModalOpen, focusTimer.lastCompletedMinutes, focusTimer.startedAtMs, focusTimer.mobileRunId,
    focusTimer.pausedFocus, focusTimer.breakDurationMin, focusTimer.manualDurationOverride,
    focusTimer.running ? undefined : focusTimer.secondsLeft,
    focusTimer.running ? undefined : focusTimer.elapsedSeconds,
  ]);
  const [cardReviews, setCardReviews] = useState(initial?.cardReviews ?? {});
  const flashcards = useMemo(() => storedFlashcards.map(card => card.nextReviewDate
    ? { ...card, dueToday: card.nextReviewDate <= calendarDay } : card), [storedFlashcards, calendarDay]);
  const summary = useMemo(() => rewardSummary(rewardLedger), [rewardLedger]);
  const achievements = desktop ? summary.badges : INITIAL_ACHIEVEMENTS;
  useEffect(() => {
    if (desktop) setRewardLedger(previous => collectRewards(previous, tasks, focusHistory, goals, cardReviews, new Date().toISOString()));
  }, [desktop, tasks, focusHistory, goals, cardReviews]);
  const snapshot = useMemo<WorkspaceSnapshot>(() => ({
    focusClock, legacyArchive: archive, previousWorkspace: initial?.previousWorkspace, removedOccurrences,
    theme, accentColor, density, dashboardWidgets, subjects, tasks, sessions: savedSessions, goals, folders, notes, decks, flashcards: storedFlashcards, cardReviews, rewardLedger, exams, quizzes, focusHistory, challenges, xpPoints, notifications, preferences,
  }), [focusClock, archive, initial?.previousWorkspace, removedOccurrences, theme, accentColor, density, dashboardWidgets, subjects, tasks, savedSessions, goals, folders, notes, decks, storedFlashcards, cardReviews, rewardLedger, exams, quizzes, focusHistory, challenges, xpPoints, notifications, preferences]);
  const [saveError, setSaveError] = useState('');
  const savedSnapshot = useRef(initial?.focusClock?.timer.running && !focusTimer.running ? undefined : snapshot);

  const pendingSave = useRef<{ snapshot: WorkspaceSnapshot; promise: Promise<void> } | undefined>(undefined);

  const saveWorkspace = useCallback(async () => {
    if (!workspace || savedSnapshot.current === snapshot) return;
    if (pendingSave.current?.snapshot === snapshot) return pendingSave.current.promise;
    const promise = workspace.writer.save(snapshot).then(() => {
      savedSnapshot.current = snapshot;
      setSaveError('');
    }, error => {
      setSaveError(String(error));
      throw error;
    }).finally(() => {
      if (pendingSave.current?.promise === promise) pendingSave.current = undefined;
    });
    pendingSave.current = { snapshot, promise };
    return promise;
  }, [workspace, snapshot]);

  function autosave() {
    void saveWorkspace().catch(() => {});
  }

  useEffect(autosave, [saveWorkspace]);

  const toastTimerRef = useRef<Map<string, number>>(new Map());

  const pushToast = useCallback((text: string, replaceKey?: string) => {
    const id = replaceKey ? `toast-${replaceKey}` : `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const existingTimer = toastTimerRef.current.get(id);
    if (existingTimer !== undefined) {
      window.clearTimeout(existingTimer);
    }
    setToasts((prev) => {
      const filtered = replaceKey ? prev.filter((t) => t.replaceKey !== replaceKey) : prev;
      return [...filtered.slice(-2), { id, text, replaceKey }];
    });
    const timer = window.setTimeout(() => {
      toastTimerRef.current.delete(id);
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3200);
    toastTimerRef.current.set(id, timer);
  }, []);

  useEffect(() => {
    return () => {
      toastTimerRef.current.forEach((timerId) => window.clearTimeout(timerId));
      toastTimerRef.current.clear();
    };
  }, []);

  // Sync theme, dark class, density, and accent CSS variables on <html>
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', theme);
    root.setAttribute('data-density', density);
    const meta = THEME_OPTIONS.find((t) => t.id === theme);
    if (meta?.isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    root.style.setProperty('--accent', accentColor);
    root.style.setProperty('--accent-hover', accentColor);
    root.style.setProperty('--accent-soft', hexToRgba(accentColor, meta?.isDark ? 0.18 : 0.10));
    root.style.setProperty('--accent-border', hexToRgba(accentColor, meta?.isDark ? 0.40 : 0.28));
  }, [theme, accentColor, density]);

  // Global Ctrl+K / Cmd+K command palette shortcut
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandPaletteOpen((open) => !open);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // Live focus timer ticker
  useEffect(() => {
    if (!focusTimer.running) return;
    let lastTick = Date.now();
    const interval = window.setInterval(() => {
      const seconds = Math.floor((Date.now() - lastTick) / 1000);
      if (seconds <= 0) return;
      lastTick += seconds * 1000;
      setFocusTimer(current => advanceFocusTimer(current, seconds));
    }, 250);
    return () => window.clearInterval(interval);
  }, [focusTimer.running]);

  const actionPhase = focusTimer.completionModalOpen ? 'finished' : focusTimer.phase + (focusTimer.running ? '-running' : '-paused');
  const lastActionPhase = useRef(actionPhase);
  useEffect(() => {
    if (lastActionPhase.current !== actionPhase) {
      playSessionStartChime();
      lastActionPhase.current = actionPhase;
    }
  }, [actionPhase]);

  const overtimeReached = focusTimer.mode !== 'Stopwatch' && focusTimer.phase === 'focus' &&
    focusTimer.secondsLeft === 0 && focusTimer.elapsedSeconds >= focusTimer.totalSeconds;
  const overtimeNotified = useRef<number | undefined>(overtimeReached ? focusTimer.startedAtMs : undefined);
  useEffect(() => {
    if (!focusTimer.startedAtMs) { overtimeNotified.current = undefined; return; }
    if (overtimeReached && overtimeNotified.current !== focusTimer.startedAtMs) {
      overtimeNotified.current = focusTimer.startedAtMs;
      playSessionStartChime();
      if (preferences.desktopNotifications) showBrowserSessionNotification('Planned focus time reached', 'Your session is continuing in overtime. Finish when ready.');
    }
  }, [overtimeReached, focusTimer.startedAtMs, preferences.desktopNotifications]);

  // Planned-session interruption watcher: chimes & prompts when a scheduled session starts during another timer
  const [pendingSessionPrompt, setPendingSessionPrompt] = useState<PendingSessionPrompt | null>(null);
  const alertedSessionKeysRef = useRef<Set<string>>(new Set());

  const isFocusEngaged =
    focusTimer.running || focusTimer.elapsedSeconds > 0 || Boolean(focusTimer.pausedFocus);

  useEffect(() => {
    if (!isFocusEngaged) {
      setPendingSessionPrompt(null);
      return;
    }

    const evaluate = () => {
      const now = new Date();
      // Keep an existing banner's remaining countdown fresh, or clear it once the session ends / matches current timer
      setPendingSessionPrompt((existing) => {
        if (!existing) return null;
        if (focusTimer.calendarSessionId === existing.session.id) return null;
        const freshRemaining = studySessionRemainingSeconds(existing.session, now);
        if (freshRemaining === null) return null;
        return { ...existing, remainingSeconds: freshRemaining };
      });

      const detected = detectPlannedSessionInterruption({
        sessions,
        timer: focusTimer,
        now,
        alertedKeys: alertedSessionKeysRef.current,
      });
      if (detected) {
        alertedSessionKeysRef.current.add(detected.occurrenceKey);
        setPendingSessionPrompt(detected);
        playSessionStartChime();
        const sub = subjects.find((s) => s.id === detected.session.subjectId);
        if (preferences.desktopNotifications) {
          showBrowserSessionNotification(
            'Planned study session starting',
            `${sub ? `${sub.code} · ` : ''}${detected.session.title} (${formatHoursMinutesCompact(detected.remainingSeconds)} left)`
          );
        }
      }
    };

    evaluate();
    const interval = window.setInterval(evaluate, 1000);
    return () => window.clearInterval(interval);
  }, [
    isFocusEngaged,
    focusTimer.running,
    focusTimer.elapsedSeconds,
    focusTimer.pausedFocus,
    focusTimer.calendarSessionId,
    focusTimer.phase,
    sessions,
    subjects,
    preferences.desktopNotifications,
  ]);

  const dismissPendingSessionPrompt = useCallback(() => {
    setPendingSessionPrompt(null);
  }, []);

  const switchToPendingSession = useCallback(() => {
    if (!pendingSessionPrompt) return;
    const target = pendingSessionPrompt.session;
    const outgoingMinutes = computeSwitchElapsedMinutes(focusTimer);

    if (outgoingMinutes >= 1) {
      const outgoingMode = focusTimer.pausedFocus?.mode ?? focusTimer.mode;
      setFocusHistory((prev) => [
        {
          id: focusTimer.mobileRunId || `fh-${Date.now()}`,
          startedAtMs: focusTimer.startedAtMs ?? Date.now() - outgoingMinutes * 60000,
          endedAtMs: Date.now(),
          source: focusTimer.mobileRunId ? 'phone' : 'pc',
          subjectId: focusTimer.subjectId,
          taskTitle: focusTimer.taskTitle,
          calendarSessionId: focusTimer.calendarSessionId ?? null,
          mode: outgoingMode,
          durationMinutes: outgoingMinutes,
          completedAt: workspace ? localDay() : 'Just now',
          qualityRating: 4,
        },
        ...prev,
      ]);
      setXpPoints((x) => x + 60);
    }

    const freshRemaining =
      studySessionRemainingSeconds(target, new Date()) ?? pendingSessionPrompt.remainingSeconds;

    setFocusTimer((prev) => ({
      ...prev,
      mode: 'Custom',
      phase: 'focus',
      running: true,
      pausedFocus: undefined,
      manualDurationOverride: false,
      completionModalOpen: false,
      startedAtMs: Date.now(),
      mobileRunId: undefined,
      calendarSessionId: target.id,
      subjectId: target.subjectId,
      taskTitle: target.title,
      totalSeconds: freshRemaining,
      secondsLeft: freshRemaining,
      elapsedSeconds: 0,
    }));

    setPendingSessionPrompt(null);
    pushToast(
      outgoingMinutes >= 1
        ? `Logged ${outgoingMinutes}m & started ${target.title}`
        : `Started ${target.title}`
    );
  }, [pendingSessionPrompt, focusTimer, workspace, pushToast]);

  const setFocusMode = useCallback((mode: FocusTimerState['mode'], customMinutes?: number) => {
    const mins =
      mode === 'Pomodoro'
        ? clampFocusMinutes(preferences.pomodoroFocusMin || 25)
        : mode === 'Countdown'
          ? clampFocusMinutes(customMinutes ?? 45)
          : mode === 'Custom'
            ? clampFocusMinutes(customMinutes ?? 35)
            : 0;
    const manualOverride = true;
    setFocusTimer((prev) => ({
      ...prev,
      mode,
      phase: 'focus',
      pausedFocus: undefined,
      manualDurationOverride: manualOverride,
      calendarSessionId: null,
      startedAtMs: undefined, mobileRunId: undefined,
      running: false,
      secondsLeft: mins * 60,
      totalSeconds: Math.max(60, mins * 60),
      elapsedSeconds: 0,
    }));
  }, [preferences.pomodoroFocusMin]);

  const setFocusDuration = useCallback((hours: number, minutes: number, mode: 'Countdown' | 'Custom' = 'Custom') => {
    const clamped = clampFocusHoursMinutes(hours, minutes);
    setFocusTimer((prev) => ({
      ...prev,
      mode,
      phase: 'focus',
      pausedFocus: undefined,
      manualDurationOverride: true,
      calendarSessionId: null,
      startedAtMs: undefined,
      mobileRunId: undefined,
      running: false,
      secondsLeft: clamped.totalSeconds,
      totalSeconds: clamped.totalSeconds,
      elapsedSeconds: 0,
    }));
  }, []);

  const useCurrentSessionRemainder = useCallback(() => {
    const active = currentStudySessionRemaining(sessions);
    if (!active) return;
    setFocusTimer((prev) => ({
      ...prev,
      mode: 'Custom',
      phase: 'focus',
      pausedFocus: undefined,
      manualDurationOverride: false,
      startedAtMs: undefined,
      mobileRunId: undefined,
      running: false,
      calendarSessionId: active.session.id,
      subjectId: active.session.subjectId,
      taskTitle: active.session.title,
      totalSeconds: active.remainingSeconds,
      secondsLeft: active.remainingSeconds,
      elapsedSeconds: 0,
    }));
  }, [sessions]);

  const startCurrentSessionFocus = useCallback(() => {
    const active = currentStudySessionRemaining(sessions);
    setFocusTimer((prev) => {
      if (prev.phase === 'break') {
        return { ...prev, running: !prev.running };
      }
      const isIdle = !prev.running && prev.elapsedSeconds === 0 && !prev.pausedFocus &&
        (prev.mode === 'Stopwatch' || prev.secondsLeft === prev.totalSeconds);
      if (isIdle && active) {
        return {
          ...prev,
          mode: 'Custom',
          phase: 'focus',
          running: true,
          pausedFocus: undefined,
          manualDurationOverride: false,
          startedAtMs: Date.now(),
          mobileRunId: undefined,
          calendarSessionId: active.session.id,
          subjectId: active.session.subjectId,
          taskTitle: active.session.title,
          totalSeconds: active.remainingSeconds,
          secondsLeft: active.remainingSeconds,
          elapsedSeconds: 0,
        };
      }
      return {
        ...prev,
        running: !prev.running,
        startedAtMs: !prev.running && prev.elapsedSeconds === 0 ? Date.now() : prev.startedAtMs,
      };
    });
  }, [sessions]);

  const toggleFocusRunning = useCallback(() => {
    const active = currentStudySessionRemaining(sessions);
    setFocusTimer(prev => {
      if (prev.phase === 'break') {
        return { ...prev, running: !prev.running };
      }
      if (prev.manualDurationOverride && !prev.running && prev.elapsedSeconds === 0 && !prev.pausedFocus) {
        return { ...prev, running: true, startedAtMs: Date.now(), calendarSessionId: null, mobileRunId: undefined };
      }
      const isFreshIdle = !prev.running && prev.phase === 'focus' && prev.elapsedSeconds === 0 && !prev.pausedFocus &&
        (prev.mode === 'Stopwatch' || prev.secondsLeft === prev.totalSeconds) && prev.calendarSessionId !== null;
      if (!isFreshIdle) {
        return {
          ...prev,
          running: !prev.running,
          startedAtMs: !prev.running && prev.elapsedSeconds === 0 ? Date.now() : prev.startedAtMs,
        };
      }
      if (active && !prev.manualDurationOverride) {
        return {
          ...prev,
          mode: prev.mode === 'Stopwatch' ? 'Stopwatch' : 'Custom',
          running: true,
          startedAtMs: Date.now(),
          mobileRunId: undefined,
          calendarSessionId: active.session.id,
          subjectId: active.session.subjectId,
          taskTitle: active.session.title,
          totalSeconds: active.remainingSeconds,
          secondsLeft: prev.mode === 'Stopwatch' ? 0 : active.remainingSeconds,
        };
      }
      return {
        ...prev,
        running: true,
        startedAtMs: Date.now(),
        mobileRunId: undefined,
        calendarSessionId: prev.manualDurationOverride ? null : active?.session.id,
        subjectId: prev.manualDurationOverride ? prev.subjectId : active?.session.subjectId ?? prev.subjectId,
        taskTitle: prev.manualDurationOverride ? prev.taskTitle : active?.session.title ?? prev.taskTitle,
      };
    });
  }, [sessions]);

  const takeFocusBreak = useCallback((breakMinutes?: number) => {
    const mins = clampBreakMinutes(breakMinutes ?? preferences.pomodoroBreakMin ?? 5);
    setFocusTimer((prev) => takeFocusBreakState(prev, mins));
    pushToast(`Break started (${mins} min) · session paused`);
  }, [preferences.pomodoroBreakMin, pushToast]);

  const endFocusBreak = useCallback(() => {
    setFocusTimer((prev) => endFocusBreakState(prev, clampFocusMinutes(preferences.pomodoroFocusMin || 25) * 60));
    pushToast('Returned to paused session — press Resume when ready');
  }, [preferences.pomodoroFocusMin, pushToast]);

  const applyPhoneFocusAction = useCallback((command: PhoneFocusAction) => {
    if (command.action === 'offline_sync') {
      const record = command.record;
      if (!validOfflineRecord(record)) return;
      const prior = preferences.offlineFocusReceipts?.[record.id];
      if (prior === 'imported' || prior === 'pc-wins' || prior === 'adopted' && record.state !== 'completed') return;
      const now = Date.now();
      const decision = resolveOfflineFocus(record, focusTimer, focusHistory, now);
      const subject = subjects.find(s => s.id === record.subjectId) ??
        subjects.find(s => s.name.toLowerCase() === record.subjectName.toLowerCase() ||
          s.code.toLowerCase() === record.subjectName.toLowerCase());
      if (decision === 'imported' && record.state === 'completed') {
        setFocusHistory(prev => prev.some(h => h.id === record.id) ? prev : [{
          id: record.id, subjectId: subject?.id ?? '', taskTitle: record.title,
          calendarSessionId: record.calendarSessionId ?? null, mode: 'Custom',
          durationMinutes: Math.max(1, Math.round(record.elapsedSeconds / 60)),
          completedAt: localDay(new Date(record.endedAt)), qualityRating: 3,
          startedAtMs: record.startedAt, endedAtMs: record.endedAt, source: 'phone',
        }, ...prev]);
        setFocusTimer(prev => prev.mobileRunId !== record.id ? prev : {
          ...prev, running: false, elapsedSeconds: 0, secondsLeft: prev.totalSeconds,
          pausedFocus: undefined, completionModalOpen: false, startedAtMs: undefined, mobileRunId: undefined,
        });
      } else if (decision === 'adopted') {
        setFocusTimer(prev => ({
          ...prev, mode: 'Custom', phase: 'focus', pausedFocus: undefined,
          secondsLeft: record.remainingSeconds, totalSeconds: record.totalSeconds,
          elapsedSeconds: record.elapsedSeconds, running: record.state === 'running',
          subjectId: subject?.id ?? '', taskTitle: record.title,
          calendarSessionId: record.calendarSessionId ?? null,
          startedAtMs: record.startedAt, mobileRunId: record.id, completionModalOpen: false,
        }));
      }
      setPreferences(prev => ({ ...prev, offlineFocusReceipts: Object.fromEntries(
        Object.entries({ ...prev.offlineFocusReceipts, [record.id]: decision }).slice(-256)
      ) }));
      return;
    }
    const session = command.sessionId ? sessions.find(item => item.id === command.sessionId) : undefined;
    const active = currentStudySessionRemaining(sessions);
    setFocusTimer(prev => {
      switch (command.action) {
        case 'start': {
          if (prev.running) return prev;
          const nowDate = new Date();
          const targetSession = session ?? (prev.manualDurationOverride ? undefined : active?.session);
          const remainingSec = targetSession ? studySessionRemainingSeconds(targetSession, nowDate) : null;
          const isIdle = prev.elapsedSeconds === 0 && !prev.pausedFocus && prev.phase === 'focus';
          if (isIdle && targetSession && remainingSec !== null) {
            return {
              ...prev,
              mode: 'Custom',
              phase: 'focus',
              running: true,
              pausedFocus: undefined,
              manualDurationOverride: false,
              completionModalOpen: false,
              startedAtMs: Date.now(),
              calendarSessionId: targetSession.id,
              subjectId: targetSession.subjectId ?? '',
              taskTitle: targetSession.title,
              totalSeconds: remainingSec,
              secondsLeft: remainingSec,
              elapsedSeconds: 0,
            };
          }
          return {
            ...prev,
            running: true,
            completionModalOpen: false,
            startedAtMs: prev.elapsedSeconds === 0 ? Date.now() : prev.startedAtMs,
            ...(session ? { calendarSessionId: session.id, subjectId: session.subjectId ?? '', taskTitle: session.title } : {}),
          };
        }
        case 'pause':
          return prev.running ? { ...prev, running: false } : prev;
        case 'resume':
          return !prev.running && !prev.completionModalOpen
            ? { ...prev, running: true, startedAtMs: prev.startedAtMs ?? Date.now() } : prev;
        case 'take_break':
          return takeFocusBreakState(prev, clampBreakMinutes(preferences.pomodoroBreakMin ?? 5));
        case 'end_break':
          return endFocusBreakState(prev, clampFocusMinutes(preferences.pomodoroFocusMin || 25) * 60);
        case 'reset':
          return {
            ...prev,
            phase: 'focus',
            pausedFocus: undefined,
            manualDurationOverride: false,
            running: false,
            elapsedSeconds: 0,
            completionModalOpen: false,
            startedAtMs: undefined,
            mobileRunId: undefined,
            secondsLeft: prev.mode === 'Stopwatch' ? 0 : prev.totalSeconds,
          };
        case 'complete': {
          if (prev.completionModalOpen) return prev;
          const source = prev.pausedFocus ?? prev;
          const minutes = source.mode === 'Stopwatch'
            ? Math.max(1, Math.round(source.elapsedSeconds / 60) || 25)
            : Math.max(1, Math.round((source.elapsedSeconds || (source.totalSeconds - source.secondsLeft)) / 60) || Math.round(source.totalSeconds / 60));
          return {
            ...prev,
            phase: 'focus',
            mode: source.mode,
            pausedFocus: undefined,
            running: false,
            completionModalOpen: true,
            lastCompletedMinutes: minutes,
          };
        }
        default:
          return prev;
      }
    });
  }, [sessions, subjects, focusTimer, focusHistory, preferences.offlineFocusReceipts, preferences.pomodoroBreakMin, preferences.pomodoroFocusMin]);

  const resetFocusTimer = useCallback(() => {
    setFocusTimer((prev) => ({
      ...prev,
      phase: 'focus',
      pausedFocus: undefined,
      manualDurationOverride: prev.manualDurationOverride,
      running: false,
      startedAtMs: undefined, mobileRunId: undefined,
      secondsLeft: prev.mode === 'Stopwatch' ? 0 : prev.totalSeconds,
      elapsedSeconds: 0,
    }));
  }, []);

  const setFocusContext = useCallback((subjectId: string, taskTitle: string, calendarSessionId?: string) => {
    setFocusTimer((prev) => ({ ...prev, subjectId, taskTitle, calendarSessionId: calendarSessionId ?? null }));
  }, []);

  const setMiniTimerVisible = useCallback((visible: boolean) => {
    setFocusTimer((prev) => ({ ...prev, miniVisible: visible }));
  }, []);

  const triggerCompleteFocusSession = useCallback(() => {
    setFocusTimer((prev) => {
      const source = prev.pausedFocus ?? prev;
      const mins =
        source.mode === 'Stopwatch'
          ? Math.max(1, Math.round(source.elapsedSeconds / 60) || 25)
          : Math.max(1, Math.round((source.elapsedSeconds || (source.totalSeconds - source.secondsLeft)) / 60) || Math.round(source.totalSeconds / 60));
      return {
        ...prev,
        phase: 'focus',
        mode: source.mode,
        pausedFocus: undefined,
        running: false,
        completionModalOpen: true,
        lastCompletedMinutes: mins,
      };
    });
  }, []);

  const submitFocusCompletion = useCallback(
    (rating: number) => {
      const breaksEnabled = preferences.breaksEnabled !== false;
      const breakSec = clampBreakMinutes(preferences.pomodoroBreakMin ?? 5) * 60;
      setFocusHistory((prev) => [
        {
          id: focusTimer.mobileRunId || `fh-${Date.now()}`,
          startedAtMs: focusTimer.startedAtMs ?? Date.now() - focusTimer.lastCompletedMinutes * 60000,
          endedAtMs: Date.now(), source: focusTimer.mobileRunId ? 'phone' : 'pc',
          subjectId: focusTimer.subjectId,
          taskTitle: focusTimer.taskTitle,
          calendarSessionId: focusTimer.calendarSessionId ?? null,
          mode: focusTimer.mode,
          durationMinutes: focusTimer.lastCompletedMinutes,
          completedAt: workspace ? localDay() : 'Just now',
          qualityRating: rating,
        },
        ...prev,
      ]);
      setXpPoints((x) => x + 60);
      setFocusTimer((prev) => ({
        ...prev,
        completionModalOpen: false,
        pausedFocus: undefined,
        manualDurationOverride: false,
        cycleCount: prev.cycleCount + 1,
        startedAtMs: undefined, mobileRunId: undefined,
        running: false,
        phase: breaksEnabled && prev.phase === 'focus' ? 'break' : 'focus',
        breakDurationMin: clampBreakMinutes(preferences.pomodoroBreakMin ?? 5),
        totalSeconds: breaksEnabled && prev.phase === 'focus' ? breakSec : prev.totalSeconds,
        secondsLeft: breaksEnabled && prev.phase === 'focus' ? breakSec : prev.mode === 'Stopwatch' ? 0 : prev.totalSeconds,
        elapsedSeconds: 0,
      }));
      pushToast(`Focus session logged (+60 XP)`);
    },
    [focusTimer.lastCompletedMinutes, focusTimer.mode, focusTimer.subjectId, focusTimer.taskTitle, focusTimer.calendarSessionId, focusTimer.startedAtMs, focusTimer.mobileRunId, preferences.breaksEnabled, preferences.pomodoroBreakMin, pushToast, workspace]
  );

  const dismissFocusCompletion = useCallback(() => {
    setFocusTimer((prev) => ({ ...prev, completionModalOpen: false }));
  }, []);

  // Dashboard widget handlers
  const toggleDashboardWidget = useCallback((id: DashboardWidgetConfig['id']) => {
    setDashboardWidgets((prev) =>
      prev.map((w) => (w.id === id ? { ...w, visible: !w.visible } : w))
    );
  }, []);

  const moveDashboardWidget = useCallback((id: DashboardWidgetConfig['id'], dir: 'up' | 'down') => {
    setDashboardWidgets((prev) => {
      const idx = prev.findIndex((w) => w.id === id);
      if (idx === -1) return prev;
      const target = dir === 'up' ? idx - 1 : idx + 1;
      if (target < 0 || target >= prev.length) return prev;
      const copy = [...prev];
      const [item] = copy.splice(idx, 1);
      copy.splice(target, 0, item);
      return copy;
    });
  }, []);

  const resetDashboardWidgets = useCallback(() => {
    setDashboardWidgets(INITIAL_DASHBOARD_WIDGETS);
    pushToast('Dashboard layout restored to default');
  }, [pushToast]);

  // Subject mutations
  const addSubject = useCallback(
    (s: Omit<Subject, 'id' | 'chapters'>) => {
      const newSub: Subject = {
        ...s,
        id: `sub-${Date.now()}`,
        chapters: [
          {
            id: `ch-${Date.now()}`,
            title: '1. Foundations & Core Concepts',
            topics: [
              {
                id: `tp-${Date.now()}`,
                title: 'Syllabus Overview & Key Readings',
                completed: false,
                difficulty: 'medium',
                confidence: 3,
                revisionStatus: 'not_started',
              },
            ],
          },
        ],
      };
      setSubjects((prev) => [...prev, normalizeSyllabus(newSub)]);
      pushToast(`Added ${s.code} — ${s.name}`);
    },
    [pushToast]
  );

  const toggleTopicCompletion = useCallback((subjectId: string, chapterId: string, topicId: string) => {
    setSubjects((prev) =>
      prev.map((sub) => {
        if (sub.id !== subjectId) return sub;
        return {
          ...sub,
          chapters: sub.chapters.map((ch) => {
            if (ch.id !== chapterId) return ch;
            return {
              ...ch,
              topics: ch.topics.map((tp) =>
                tp.id === topicId
                  ? {
                      ...tp,
                      completed: !tp.completed,
                      revisionStatus: !tp.completed ? 'mastered' : 'in_review',
                    }
                  : tp
              ),
            };
          }),
        };
      })
    );
  }, []);

  const updateTopicConfidence = useCallback(
    (subjectId: string, chapterId: string, topicId: string, confidence: number) => {
      setSubjects((prev) =>
        prev.map((sub) => {
          if (sub.id !== subjectId) return sub;
          return {
            ...sub,
            chapters: sub.chapters.map((ch) => {
              if (ch.id !== chapterId) return ch;
              return {
                ...ch,
                topics: ch.topics.map((tp) => (tp.id === topicId ? { ...tp, confidence } : tp)),
              };
            }),
          };
        })
      );
    },
    []
  );

  const toggleArchiveSubject = useCallback(
    (subjectId: string) => {
      setSubjects((prev) =>
        prev.map((sub) => {
          if (sub.id !== subjectId) return sub;
          const nextArchived = !sub.archived;
          pushToast(nextArchived ? `Archived ${sub.code}` : `Restored ${sub.code}`);
          return { ...sub, archived: nextArchived };
        })
      );
    },
    [pushToast]
  );

  const toggleArchiveChapter = useCallback(
    (subjectId: string, chapterId: string) => {
      setSubjects((prev) =>
        prev.map((sub) => {
          if (sub.id !== subjectId) return sub;
          return {
            ...sub,
            chapters: sub.chapters.map((ch) => {
              if (ch.id !== chapterId) return ch;
              const nextArchived = !ch.archived;
              pushToast(nextArchived ? `Archived chapter "${ch.title}"` : `Restored chapter "${ch.title}"`);
              return { ...ch, archived: nextArchived };
            }),
          };
        })
      );
    },
    [pushToast]
  );

  const addUnit = useCallback((subjectId: string, title: string) => {
    const cleanTitle = stripSyllabusNumberPrefix(title);
    if (!cleanTitle) return;
    const unit = { id: `unit-${crypto.randomUUID()}`, title: cleanTitle };
    setSubjects(previous => previous.map(subject => {
      if (subject.id !== subjectId) return subject;
      const next = normalizeSyllabus(subject);
      return { ...next, units: [...(next.units ?? []), unit] };
    }));
  }, []);
  const updateUnit = useCallback((subjectId: string, unitId: string, patch: { title?: string; archived?: boolean }) => {
    const cleanTitle = patch.title !== undefined ? stripSyllabusNumberPrefix(patch.title) : undefined;
    if (patch.title !== undefined && !cleanTitle) return;
    setSubjects(previous => previous.map(subject => subject.id !== subjectId ? subject : {
      ...subject, units: (normalizeSyllabus(subject).units ?? []).map(unit => unit.id !== unitId ? unit : { ...unit, ...patch, ...(cleanTitle !== undefined ? { title: cleanTitle } : {}) }),
    }));
  }, []);
  const reorderUnit = useCallback((subjectId: string, unitId: string, delta: -1 | 1) => {
    setSubjects(previous => previous.map(subject => subject.id !== subjectId ? subject : { ...subject, units: moveSyllabusItem(normalizeSyllabus(subject).units ?? [], unitId, delta) }));
  }, []);
  const reorderChapter = useCallback((subjectId: string, chapterId: string, delta: -1 | 1) => {
    setSubjects(previous => previous.map(subject => subject.id === subjectId ? moveChapter(subject, chapterId, delta) : subject));
  }, []);
  const addChapter = useCallback(
    (subjectId: string, title: string, topicTitles: string[] = [], unitId?: string) => {
      const cleanTitle = stripSyllabusNumberPrefix(title);
      if (!cleanTitle) return;
      const cleanTopics = topicTitles
        .map((t) => t.trim())
        .filter(Boolean)
        .map((t) => ({
          id: `tp-${crypto.randomUUID()}`,
          title: t,
          completed: false,
          difficulty: 'medium' as const,
          confidence: 3,
          revisionStatus: 'not_started' as const,
        }));
      const newChapter = {
        id: `ch-${crypto.randomUUID()}`,
        title: cleanTitle,
        topics: cleanTopics,
      };
      setSubjects((prev) =>
        prev.map((sub) =>
          sub.id === subjectId ? (() => {
            const next = normalizeSyllabus(sub);
            const selected = next.units?.find(unit => unit.id === unitId && !unit.archived) ?? next.units?.find(unit => !unit.archived);
            return selected ? { ...next, chapters: [...next.chapters, { ...newChapter, unitId: selected.id }] } : mergeImportedChapters(next, [newChapter]);
          })() : sub
        )
      );
      pushToast(`Added chapter "${cleanTitle}"`);
    },
    [pushToast]
  );

  const addTopic = useCallback(
    (subjectId: string, chapterId: string, title: string, difficulty: TopicItem['difficulty'] = 'medium') => {
      const cleanTitle = title.trim();
      if (!cleanTitle) return;
      const newTopic: TopicItem = {
        id: `tp-${crypto.randomUUID()}`,
        title: cleanTitle,
        completed: false,
        difficulty,
        confidence: 3,
        revisionStatus: 'not_started',
      };
      setSubjects((prev) =>
        prev.map((sub) => {
          if (sub.id !== subjectId) return sub;
          return {
            ...sub,
            chapters: sub.chapters.map((ch) =>
              ch.id === chapterId ? { ...ch, topics: [...ch.topics, newTopic] } : ch
            ),
          };
        })
      );
      pushToast(`Added topic "${cleanTitle}"`);
    },
    [pushToast]
  );

  const deleteTopic = useCallback(
    (subjectId: string, chapterId: string, topicId: string) => {
      setSubjects((prev) =>
        prev.map((sub) => {
          if (sub.id !== subjectId) return sub;
          return {
            ...sub,
            chapters: sub.chapters.map((ch) =>
              ch.id === chapterId
                ? { ...ch, topics: ch.topics.filter((tp) => tp.id !== topicId) }
                : ch
            ),
          };
        })
      );
      pushToast('Topic removed');
    },
    [pushToast]
  );

  const updateSubject = useCallback(
    (subjectId: string, patch: Partial<Omit<Subject, 'id' | 'chapters'>>) => {
      setSubjects((prev) =>
        prev.map((sub) => (sub.id === subjectId ? { ...sub, ...patch } : sub))
      );
      pushToast('Subject updated');
    },
    [pushToast]
  );

  const deleteSubject = useCallback(
    (subjectId: string) => {
      setSubjects((prev) => prev.filter((sub) => sub.id !== subjectId));
      setTasks(prev => unassignSubject(prev, subjectId));
      setSessions(prev => unassignSubject(prev, subjectId));
      setGoals(prev => unassignSubject(prev, subjectId));
      setNotes(prev => unassignSubject(prev, subjectId));
      setFolders(prev => unassignSubject(prev, subjectId));
      setDecks(prev => unassignSubject(prev, subjectId));
      setQuizzes(prev => unassignSubject(prev, subjectId));
      setExams(prev => unassignSubject(prev, subjectId));
      setFocusHistory(prev => unassignSubject(prev, subjectId));
      setFocusTimer(prev => prev.subjectId === subjectId ? { ...prev, subjectId: '' } : prev);
      setArchive(prev => removeLegacySubject(prev, subjectId));
      setSelectedSubjectId((curr) => (curr === subjectId ? null : curr));
      pushToast('Subject deleted; linked records kept as unassigned');
    },
    [pushToast]
  );

  const updateChapter = useCallback(
    (subjectId: string, chapterId: string, title: string, unitId?: string) => {
      const cleanTitle = stripSyllabusNumberPrefix(title);
      if (!cleanTitle) return;
      setSubjects((prev) =>
        prev.map((sub) => {
          if (sub.id !== subjectId) return sub;
          return {
            ...sub,
            chapters: sub.chapters.map((ch) =>
              ch.id === chapterId ? { ...ch, title: cleanTitle, ...(unitId && sub.units?.some(unit => unit.id === unitId && !unit.archived) ? { unitId } : {}) } : ch
            ),
          };
        })
      );
      pushToast('Chapter updated');
    },
    [pushToast]
  );

  const deleteChapter = useCallback(
    (subjectId: string, chapterId: string) => {
      setSubjects((prev) =>
        prev.map((sub) => {
          if (sub.id !== subjectId) return sub;
          return {
            ...sub,
            chapters: sub.chapters.filter((ch) => ch.id !== chapterId),
          };
        })
      );
      setNotes(previous => previous.map(note => removeChapterLink(note, subjectId, chapterId)));
      setDecks(previous => previous.map(deck => removeChapterLink(deck, subjectId, chapterId)));
      setQuizzes(previous => previous.map(quiz => removeChapterLink(quiz, subjectId, chapterId)));
      pushToast('Chapter deleted; linked resources kept');
    },
    [pushToast]
  );

  // Task mutations
  const addTask = useCallback(
    (t: Omit<TaskItem, 'id'>) => {
      const id = `tsk-${crypto.randomUUID()}`;
      setTasks((prev) => [{ ...t, id }, ...prev]);
      pushToast(`Task created: ${t.title}`);
      return id;
    },
    [pushToast]
  );

  const updateTask = useCallback((id: string, patch: Partial<TaskItem>) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
    if (patch.status !== undefined) {
      const nextDone = patch.status === 'done';
      setGoals((prev) => syncGoalsForTaskStatusChange(prev, id, nextDone));
    }
  }, []);

  const deleteTasks = useCallback(
    (ids: string[]) => {
      setTasks((prev) => prev.filter((t) => !ids.includes(t.id)));
      setGoals(prev => removeTaskLinks(prev, ids));
      pushToast(`Deleted ${ids.length} task${ids.length === 1 ? '' : 's'}`);
    },
    [pushToast]
  );

  const toggleTaskStatus = useCallback((id: string) => {
    const existing = tasksRef.current.find((t) => t.id === id);
    const nextDone = existing ? existing.status !== 'done' : true;
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status: nextDone ? 'done' : 'todo' } : t))
    );
    setGoals((prev) => syncGoalsForTaskStatusChange(prev, id, nextDone));
  }, []);

  const toggleSubtask = useCallback((taskId: string, subtaskId: string) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== taskId) return t;
        return {
          ...t,
          subtasks: t.subtasks.map((st) => (st.id === subtaskId ? { ...st, done: !st.done } : st)),
        };
      })
    );
  }, []);

  // Study Session mutations
  const addSession = useCallback(
    (session: Omit<StudySession, 'id'>, weekdays: number[] = []) => {
      const createdId = `ses-${crypto.randomUUID()}`;
      const previewEntry: StudySession = { ...session, id: createdId };
      const appliesToDate = weekdays.length === 0 || weekdays.includes(session.dayIndex);
      const nextSessions = appliesToDate ? [...sessions, previewEntry] : sessions;
      const dailyLoadHours = plannedBlocksForDay(nextSessions, session.date).reduce(
        (sum, block) => sum + (block.to - block.from),
        0,
      );

      if (weekdays.length) {
        const clock = (hours: number) => {
          const minutes = Math.round(hours * 60) % 1440;
          return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
        };
        setArchive(previous => {
          const archive = previous ?? { recurring_events: [], recurrence_exceptions: [], recurrence_overrides: [], tasks: [] };
          const id = archive.recurring_events.reduce((max, row) => Math.max(max, Number(row.id) || 0), 0) + 1;
          return {
            ...archive,
            recurring_events: [...archive.recurring_events, {
              id, title: session.title, weekdays: weekdays.join(','), valid_from: session.date,
              start_time: clock(session.startHour), end_time: clock(session.startHour + session.durationHours),
              subject_id: null, studyflowSubjectId: session.subjectId, blockType: session.blockType, countsTowardStudy: session.countsTowardStudy,
              alarms: session.alarms, location: session.location, notes: session.notes,
            }],
          };
        });
      } else {
        setSessions(previous => [...previous, previewEntry]);
      }

      const durationText = formatSessionDurationCompact(session.durationHours);
      const loadText = formatSessionDurationCompact(dailyLoadHours);
      pushToast(
        `Scheduled "${session.title}" · ${durationText} · ${loadText} daily load`,
        'session-activity',
      );
    },
    [pushToast, sessions],
  );

  const updateSession = useCallback((id: string, patch: Partial<StudySession>) => {
    const projected = sessions.find(item => item.id === id);
    setSessions(prev => {
      if (prev.some(item => item.id === id)) return prev.map(item => item.id === id ? { ...item, ...patch } : item);
      return projected ? [...prev, { ...projected, ...patch }] : prev;
    });

    if (
      projected &&
      patch.durationHours !== undefined &&
      Math.abs(patch.durationHours - projected.durationHours) > 0.001
    ) {
      const updated: StudySession = { ...projected, ...patch };
      const nextSessions = sessions.some(item => item.id === id)
        ? sessions.map(item => (item.id === id ? updated : item))
        : [...sessions, updated];
      const dailyLoadHours = plannedBlocksForDay(nextSessions, updated.date).reduce(
        (sum, block) => sum + (block.to - block.from),
        0,
      );
      const durationText = formatSessionDurationCompact(updated.durationHours);
      const loadText = formatSessionDurationCompact(dailyLoadHours);
      pushToast(
        `Resized "${updated.title}" to ${durationText} · ${loadText} daily load`,
        'session-activity',
      );
    }
  }, [sessions, pushToast]);

  const updateRecurringSeries = archive && ((id: number, title: string, startHour: number, durationHours: number, fields?: Pick<StudySession, 'blockType' | 'countsTowardStudy' | 'alarms'>, subjectId?: string, weekdays?: number[]) => {
    const clock = (hours: number) => {
      const minutes = Math.round(hours * 60) % 1440;
      return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
    };
    setArchive(previous => previous && ({
      ...previous,
      recurring_events: previous.recurring_events.map(row => row.id === id
        ? { ...row, title, ...fields, ...(weekdays && { weekdays: weekdays.join(',') }), subject_id: subjectId === undefined ? row.subject_id : Number(subjectId.replace('legacy-subject-', '')) || null, studyflowSubjectId: subjectId ?? row.studyflowSubjectId, start_time: clock(startHour), end_time: clock(startHour + durationHours) }
        : row),
    }));
  });

  const deleteSession = useCallback(
    (id: string) => {
      setSessions((prev) => prev.filter((s) => s.id !== id));
      if (id.startsWith('legacy-series-')) setRemovedOccurrences(previous => [...new Set([...previous, id])]);
      pushToast('Study session removed');
    },
    [pushToast]
  );

  // Goal mutations
  const addGoal = useCallback(
    (g: Omit<GoalItem, 'id'>) => {
      const nowIso = new Date().toISOString();
      const nextGoal: GoalItem = {
        ...g,
        id: `g-${crypto.randomUUID()}`,
        createdAt: g.createdAt ?? nowIso,
        ...(g.target > 0 && g.current >= g.target
          ? { completedAt: g.completedAt ?? nowIso }
          : {}),
      };
      setGoals((prev) => [nextGoal, ...prev]);
      pushToast(`Goal added: ${g.title}`);
    },
    [pushToast]
  );

  const updateGoal = useCallback((id: string, patch: Partial<GoalItem>) => {
    setGoals(previous => previous.map(goal => {
      if (goal.id !== id) return goal;
      const next = { ...goal, ...patch };
      if (next.target > 0 && next.current >= next.target) {
        next.completedAt = goal.completedAt ?? new Date().toISOString();
      } else {
        delete next.completedAt;
      }
      return next;
    }));
  }, []);

  const deleteGoal = useCallback((id: string) => {
    setGoals(previous => previous.filter(goal => goal.id !== id));
    pushToast('Goal removed');
  }, [pushToast]);

  // Notes mutations
  const updateNote = useCallback((id: string, patch: Partial<NoteItem>) => {
    setNotes((prev) => prev.map((n) => {
      if (n.id !== id) return n;
      const next = {...n, ...patch};
      return {...next, syllabusLinks: sanitizeSyllabusLinks(subjects.find(subject => subject.id === next.subjectId), next.syllabusLinks)};
    }));
  }, [subjects]);

  const createNote = useCallback(
    (
      subjectId: string,
      folderId: string,
      draft?: Partial<Pick<NoteItem, 'title' | 'content' | 'attachments' | 'pdf' | 'originalFont' | 'fontMode' | 'tags' | 'syllabusLinks'>>
    ) => {
      const id = `note-${crypto.randomUUID()}`;
      const folder = folders.find(item => item.id === folderId);
      subjectId = folder?.subjectId || subjectId;
      const links = folder?.unitId
        ? { ...draft?.syllabusLinks, unitIds: [...(draft?.syllabusLinks?.unitIds ?? []), folder.unitId] }
        : draft?.syllabusLinks;
      const newNote: NoteItem = {
        id,
        folderId: folderId === 'fld-all' ? 'notes' : folderId,
        subjectId,
        syllabusLinks: sanitizeSyllabusLinks(subjects.find(subject => subject.id === subjectId), links),
        title: draft?.title ?? 'Untitled Study Note',
        updatedAt: 'Just now',
        pinned: false,
        tags: draft?.tags ?? ['Draft'],
        content: draft?.content ?? '',
        linkedResources: [],
        attachments: draft?.attachments ?? [],
        pdf: draft?.pdf,
        originalFont: draft?.originalFont,
        fontMode: draft?.fontMode,
        pdfHighlights: [],
      };
      setNotes((prev) => [newNote, ...prev]);
      setSelectedNoteId(id);
      playSessionStartChime();
      pushToast('New note created');
      return id;
    },
    [pushToast, folders, subjects]
  );

  // Flashcards mutations
  const addDeck = useCallback(
    (deck: Omit<FlashcardDeck, 'id' | 'lastReviewed' | 'retentionRate'>) => {
      const id = `deck-${crypto.randomUUID()}`;
      setDecks((prev) => [
        {
          ...deck,
          syllabusLinks: sanitizeSyllabusLinks(subjects.find(subject=>subject.id===deck.subjectId),deck.syllabusLinks),
          id,
          lastReviewed: 'Just created',
          retentionRate: 0,
        },
        ...prev,
      ]);
      pushToast(`Deck created: ${deck.title}`);
      return id;
    },
    [pushToast, subjects]
  );

  const deleteDeck = useCallback(
    (id: string) => {
      setDecks((prev) => prev.filter((d) => d.id !== id));
      setFlashcards((prev) => prev.filter((c) => c.deckId !== id));
      playSessionStartChime();
      pushToast('Flashcard deck deleted');
    },
    [pushToast]
  );

  const addFlashcard = useCallback(
    (card: Omit<FlashcardItem, 'id' | 'intervalDays' | 'easeFactor' | 'dueToday' | 'mastery'>) => {
      setFlashcards((prev) => [
        {
          ...card,
          id: crypto.randomUUID(),
          intervalDays: 1,
          easeFactor: 2.5,
          dueToday: true,
          mastery: 'new',
        },
        ...prev,
      ]);
      pushToast('Flashcard added to deck');
    },
    [pushToast]
  );

  const importFlashcardsBulk = useCallback(
    (deckId: string, cards: Array<{ front: string; back: string; hint?: string }>) => {
      if (!cards.length) return 0;
      const newItems: FlashcardItem[] = cards.map((card) => ({
        id: crypto.randomUUID(),
        deckId,
        front: card.front,
        back: card.back,
        ...(card.hint ? { hint: card.hint } : {}),
        intervalDays: 1,
        easeFactor: 2.5,
        dueToday: true,
        mastery: 'new',
      }));
      setFlashcards((prev) => [...newItems, ...prev]);
      pushToast(`Imported ${newItems.length} flashcard${newItems.length === 1 ? '' : 's'}`);
      return newItems.length;
    },
    [pushToast]
  );

  const reviewFlashcard = useCallback((cardId: string, rating: ReviewRating) => {
    const today = localDay();
    if (desktop) setCardReviews(previous => ({ ...previous, [today]: (previous[today] ?? 0) + 1 }));
    setFlashcards((prev) =>
      prev.map((c) => {
        if (c.id !== cardId) return c;
        const next = scheduleFlashcardReview(c, rating);
        const date = new Date();
        date.setDate(date.getDate() + (rating === 'again' ? 0 : next.intervalDays));
        return {
          ...c,
          intervalDays: next.intervalDays,
          easeFactor: next.easeFactor,
          mastery: next.mastery,
          dueToday: rating === 'again',
          nextReviewDate: localDay(date),
          lastReviewedAt: new Date().toISOString(),
          reviewCount: (c.reviewCount ?? 0) + 1,
          lapses: (c.lapses ?? 0) + (rating === 'again' ? 1 : 0),
        };
      })
    );
  }, [desktop]);

  // Exams mutations
  const addExam = useCallback(
    (exam: Omit<ExamItem, 'id' | 'mockHistory'>) => {
      setExams((prev) => [...prev, { ...exam, id: `ex-${Date.now()}`, mockHistory: [] }]);
      pushToast(`Exam added: ${exam.title}`);
    },
    [pushToast]
  );

  const updateExam = useCallback((id: string, patch: Partial<Omit<ExamItem, 'id' | 'mockHistory'>>) => {
    setExams(previous => previous.map(exam => exam.id === id ? { ...exam, ...patch } : exam));
    pushToast('Exam updated');
  }, [pushToast]);

  const deleteExam = useCallback((id: string) => {
    setExams(previous => previous.filter(exam => exam.id !== id));
    pushToast('Exam deleted');
  }, [pushToast]);

  const deleteQuiz = useCallback((id: string) => {
    setQuizzes((previous) => previous.filter((quiz) => quiz.id !== id));
    playSessionStartChime();
    pushToast('Practice test deleted');
  }, [pushToast]);

  const updateQuizQuestionExplanation = useCallback(
    (quizId: string, questionId: string, explanation: string) => {
      setQuizzes((previous) =>
        previous.map((quiz) => {
          if (quiz.id !== quizId) return quiz;
          return {
            ...quiz,
            questions: quiz.questions.map((q) =>
              q.id === questionId ? { ...q, explanation } : q
            ),
          };
        })
      );
      pushToast('Explanation updated');
    },
    [pushToast]
  );

  const openStudyLab = useCallback((launch?: Partial<StudyLabLaunchState>) => {
    setStudyLabLaunch({
      tab: launch?.tab ?? 'playground',
      ...launch,
    });
    setRoute('lab');
  }, []);

  const clearStudyLabLaunch = useCallback(() => {
    setStudyLabLaunch(null);
  }, []);

  const recordQuizScore = useCallback((quizId: string, attempt: PracticeAttempt) => {
    setQuizzes(previous => previous.map(quiz => {
      if (quiz.id !== quizId) return quiz;
      return { ...quiz, lastScore: attempt.score, attempts: [...(quiz.attempts ?? []), attempt] };
    }));
    setXpPoints(points => points + 80);
  }, []);

  const claimChallenge = useCallback(
    (id: string) => {
      setChallenges((prev) =>
        prev.map((c) => {
          if (c.id !== id || c.claimed) return c;
          setXpPoints((x) => x + c.xp);
          pushToast(`Claimed +${c.xp} XP`);
          return { ...c, claimed: true };
        })
      );
    },
    [pushToast]
  );

  const markAllNotificationsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const markNotificationRead = useCallback((id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }, []);

  const updatePreferences = useCallback((patch: Partial<UserPreferences>) => {
    setPreferences((prev) => ({ ...prev, ...patch }));
  }, []);

  const importLegacyBackup = workspace && (async () => {
    try {
      const legacy = await chooseLegacyBackup();
      if (!legacy) return;
      if (JSON.stringify(legacy) === JSON.stringify(archive)) {
        pushToast('This backup is already imported.');
        return;
      }
      const summary = `${legacy.subjects.length} subjects, ${legacy.tasks.length} tasks, and ${legacy.recurring_events.length} recurring events`;
      if (!window.confirm(`Import ${summary}? Your previous workspace will be included in the exported workspace archive.`)) return;
      const { previousWorkspace: _previous, ...rollback } = snapshot;
      await workspace.writer.save({ ...mapLegacyWorkspace(legacy, snapshot), previousWorkspace: rollback, removedOccurrences: [], focusClock: undefined });
      window.location.reload();
    } catch (error) {
      window.alert(`Could not import backup. ${String(error)}`);
    }
  });

  const wipeData = workspace && (async (sections: WipeSection[]) => {
    if (!sections.length) return;
    try {
      await workspace.writer.save(sections.reduce(wipeWorkspace, snapshot));
      window.location.reload();
    } catch (error) {
      window.alert('Could not reset workspace data. '+String(error));
    }
  });

  const exportWorkspace = () => {
    const data = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(data);
    const link = document.createElement('a');
    link.href = url;
    link.download = `studyflow-workspace-${localDay()}.json`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    pushToast('Exported StudyFlow workspace archive (.json)');
  };

  const loadDemoData = () => {
    if (desktop) {
      const occupied = Boolean(snapshot.previousWorkspace || snapshot.legacyArchive || focusTimer.running || focusTimer.elapsedSeconds || focusTimer.pausedFocus ||
        [subjects, tasks, savedSessions, goals, notes, storedFlashcards, exams, quizzes, focusHistory, challenges, notifications].some(items => items.length > 0) ||
        decks.some(deck => deck.id !== 'review') || folders.some(folder => folder.id !== 'notes') ||
        Object.keys(rewardLedger).length || Object.keys(cardReviews).length || xpPoints);
      if (occupied) {
        window.alert('Demo data cannot replace an existing workspace. Use Explore Demo in the web preview instead.');
        return;
      }
      if (!window.confirm('Load sample data into this empty workspace? Sample records will be saved locally.')) return;
    }
    setSubjects(INITIAL_SUBJECTS.map(normalizeSyllabus));
    setTasks(INITIAL_TASKS);
    setSessions(INITIAL_SESSIONS);
    setRemovedOccurrences([]);
    setArchive(undefined);
    setGoals(INITIAL_GOALS);
    setFolders(INITIAL_FOLDERS);
    setNotes(INITIAL_NOTES);
    setSelectedNoteId(INITIAL_NOTES[0]?.id ?? '');
    setDecks(INITIAL_DECKS);
    setFlashcards(INITIAL_FLASHCARDS);
    setExams(INITIAL_EXAMS);
    setQuizzes(INITIAL_QUIZZES);
    setFocusHistory(INITIAL_FOCUS_HISTORY);
    setChallenges(INITIAL_CHALLENGES);
    setNotifications(INITIAL_NOTIFICATIONS);
    setXpPoints(4280);
    setRewardLedger({});
    setCardReviews({});
    pushToast('Loaded sample study workspace data');
  };

  return (
    <AppContext.Provider
      value={{
        durableWorkspace: Boolean(workspace),
        saveWorkspace,
        recurringSeries: archive?.recurring_events ?? [],
        setCalendarProjectionAnchor,
        updateRecurringSeries,
        importLegacyBackup,
        wipeData,
        legacyCalendar: desktop,
        cardReviews,
        exportWorkspace,
        loadDemoData,
        route,
        setRoute,
        selectedSubjectId,
        setSelectedSubjectId,
        selectedNoteId,
        setSelectedNoteId,
        notesSyllabusScope, setNotesSyllabusScope,
        sidebarCollapsed,
        setSidebarCollapsed,
        mobileNavOpen,
        setMobileNavOpen,
        commandPaletteOpen,
        setCommandPaletteOpen,
        activeModal,
        setActiveModal,
        theme,
        setTheme,
        accentColor,
        setAccentColor,
        density,
        setDensity,
        dashboardWidgets,
        toggleDashboardWidget,
        moveDashboardWidget,
        resetDashboardWidgets,
        subjects,
        appendChapters: (id, chapters) => setSubjects(prev => prev.map(subject => subject.id === id ? mergeImportedChapters(subject, chapters) : subject)),
        addSubject,
        updateSubject,
        deleteSubject,
        toggleArchiveSubject,
        toggleArchiveChapter,
        addUnit,
        updateUnit,
        reorderUnit,
        reorderChapter,
        addChapter,
        updateChapter,
        deleteChapter,
        addTopic,
        deleteTopic,
        toggleTopicCompletion,
        updateTopicConfidence,
        tasks,
        addTask,
        updateTask,
        deleteTasks,
        toggleTaskStatus,
        toggleSubtask,
        sessions,
        addSession,
        updateSession,
        deleteSession,
        goals,
        addGoal,
        updateGoal,
        deleteGoal,
        folders,
        createFolder: (name, subjectId, unitId) => {
          const id = crypto.randomUUID();
          setFolders(prev => [...prev, { id, name, subjectId, unitId }]);
          return id;
        },
        renameFolder: (id, name) => setFolders(prev => prev.map(folder => folder.id === id ? {...folder, name} : folder)),
        notes,
        deleteNote: id => {
          setNotes(prev => prev.filter(note => note.id !== id));
          playSessionStartChime();
        },
        updateNote,
        createNote,
        decks,
        addDeck,
        updateDeckLinks: (id, subjectId, links) => setDecks(prev=>prev.map(deck=>deck.id===id?{...deck,subjectId,syllabusLinks:sanitizeSyllabusLinks(subjects.find(s=>s.id===subjectId),links)}:deck)),
        deleteDeck,
        flashcards,
        addFlashcard,
        importFlashcardsBulk,
        deleteFlashcard: id => {
          setFlashcards(prev => prev.filter(card => card.id !== id));
          playSessionStartChime();
          pushToast('Flashcard deleted');
        },
        reviewFlashcard,
        exams,
        addExam, updateExam, deleteExam,
        quizzes,
        addQuiz: quiz=>setQuizzes(prev=>[{...quiz,syllabusLinks:sanitizeSyllabusLinks(subjects.find(s=>s.id===quiz.subjectId),quiz.syllabusLinks)},...prev]),
        updateQuizLinks: (id, subjectId, links) => setQuizzes(prev=>prev.map(quiz=>quiz.id===id?{...quiz,subjectId,syllabusLinks:sanitizeSyllabusLinks(subjects.find(s=>s.id===subjectId),links)}:quiz)),
        deleteQuiz,
        updateQuizQuestionExplanation,
        recordQuizScore,
        studyLabLaunch,
        openStudyLab,
        clearStudyLabLaunch,
        focusTimer,
        focusClock,
        applyPhoneFocusAction,
        setFocusMode,
        setFocusDuration,
        useCurrentSessionRemainder,
        startCurrentSessionFocus,
        toggleFocusRunning,
        takeFocusBreak,
        endFocusBreak,
        resetFocusTimer,
        setFocusContext,
        setMiniTimerVisible,
        triggerCompleteFocusSession,
        submitFocusCompletion,
        dismissFocusCompletion,
        pendingSessionPrompt,
        switchToPendingSession,
        dismissPendingSessionPrompt,
        focusHistory,
        achievements,
        challenges,
        claimChallenge,
        xpPoints: xpPoints + (desktop ? summary.xp : 0),
        notifications,
        markAllNotificationsRead,
        markNotificationRead,
        preferences,
        updatePreferences,
        toasts,
        pushToast,
      }}
    >
      {saveError && (
        <div role="alert" className="fixed inset-x-4 top-2 z-50 rounded-lg border border-red-600 bg-[var(--bg-surface)] p-3 text-sm">
          StudyFlow could not save workspace changes. {saveError}{' '}
          <button type="button" className="underline" onClick={autosave}>Retry save</button>
        </div>
      )}
      {children}
    </AppContext.Provider>
  );
};

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
