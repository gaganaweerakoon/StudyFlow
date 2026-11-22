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
  PracticeQuiz,
  StudySession,
  Subject,
  TaskItem,
  ThemeId,
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
import { scheduleFlashcardReview, type ReviewRating } from '../utils/studyLogic';

export interface ToastMessage {
  id: string;
  text: string;
}

export interface FocusTimerState {
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
}

export interface UserPreferences {
  name: string;
  email: string;
  major: string;
  dailyGoalHours: number;
  weeklyGoalHours: number;
  pomodoroFocusMin: number;
  pomodoroBreakMin: number;
  autoStartBreaks: boolean;
  ambientSound: 'None' | 'Soft Rain' | 'Library Hum' | 'Brown Noise';
  desktopNotifications: boolean;
  examReminders: boolean;
  weeklyDigest: boolean;
  reducedMotion: boolean;
  highContrastText: boolean;
  showFocusStreak: boolean;
  localBackupAuto: boolean;
}

interface AppContextValue {
  // Navigation & Shell
  route: NavRoute;
  setRoute: (r: NavRoute) => void;
  selectedSubjectId: string | null;
  setSelectedSubjectId: (id: string | null) => void;
  selectedNoteId: string;
  setSelectedNoteId: (id: string) => void;
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
  addSubject: (s: Omit<Subject, 'id' | 'chapters'>) => void;
  toggleTopicCompletion: (subjectId: string, chapterId: string, topicId: string) => void;
  updateTopicConfidence: (subjectId: string, chapterId: string, topicId: string, confidence: number) => void;

  tasks: TaskItem[];
  addTask: (t: Omit<TaskItem, 'id'>) => void;
  updateTask: (id: string, patch: Partial<TaskItem>) => void;
  deleteTasks: (ids: string[]) => void;
  toggleTaskStatus: (id: string) => void;
  toggleSubtask: (taskId: string, subtaskId: string) => void;

  sessions: StudySession[];
  addSession: (s: Omit<StudySession, 'id'>) => void;
  updateSession: (id: string, patch: Partial<StudySession>) => void;
  deleteSession: (id: string) => void;

  goals: GoalItem[];
  addGoal: (g: Omit<GoalItem, 'id'>) => void;
  updateGoal: (id: string, patch: Partial<GoalItem>) => void;

  folders: NoteFolder[];
  notes: NoteItem[];
  updateNote: (id: string, patch: Partial<NoteItem>) => void;
  createNote: (subjectId: string, folderId: string) => string;

  decks: FlashcardDeck[];
  flashcards: FlashcardItem[];
  addFlashcard: (card: Omit<FlashcardItem, 'id' | 'intervalDays' | 'easeFactor' | 'dueToday' | 'mastery'>) => void;
  reviewFlashcard: (cardId: string, rating: ReviewRating) => void;

  exams: ExamItem[];
  addExam: (exam: Omit<ExamItem, 'id' | 'mockHistory'>) => void;

  quizzes: PracticeQuiz[];
  recordQuizScore: (quizId: string, score: number) => void;

  focusTimer: FocusTimerState;
  setFocusMode: (mode: FocusTimerState['mode'], customMinutes?: number) => void;
  toggleFocusRunning: () => void;
  resetFocusTimer: () => void;
  setFocusContext: (subjectId: string, taskTitle: string) => void;
  setMiniTimerVisible: (visible: boolean) => void;
  triggerCompleteFocusSession: () => void;
  submitFocusCompletion: (rating: number) => void;
  dismissFocusCompletion: () => void;
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
  pushToast: (text: string) => void;
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

export const AppProvider: React.FC<{ children: React.ReactNode; workspace?: WorkspacePersistence }> = ({ children, workspace }) => {
  const initial = workspace?.initial;
  const [route, setRoute] = useState<NavRoute>('dashboard');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  const [selectedNoteId, setSelectedNoteId] = useState<string>(() => (initial?.notes ?? INITIAL_NOTES)[0]?.id ?? '');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [activeModal, setActiveModal] = useState<ActiveModalType>(null);

  const [theme, setTheme] = useState<ThemeId>(initial?.theme ?? 'light');
  const [accentColor, setAccentColor] = useState<string>(initial?.accentColor ?? '#4F46E5');
  const [density, setDensity] = useState<DensityMode>(initial?.density ?? 'compact');

  const [dashboardWidgets, setDashboardWidgets] = useState<DashboardWidgetConfig[]>(initial?.dashboardWidgets ?? INITIAL_DASHBOARD_WIDGETS);
  const [subjects, setSubjects] = useState<Subject[]>(initial?.subjects ?? INITIAL_SUBJECTS);
  const [tasks, setTasks] = useState<TaskItem[]>(initial?.tasks ?? INITIAL_TASKS);
  const [sessions, setSessions] = useState<StudySession[]>(initial?.sessions ?? INITIAL_SESSIONS);
  const [goals, setGoals] = useState<GoalItem[]>(initial?.goals ?? INITIAL_GOALS);
  const [folders] = useState<NoteFolder[]>(initial?.folders ?? INITIAL_FOLDERS);
  const [notes, setNotes] = useState<NoteItem[]>(initial?.notes ?? INITIAL_NOTES);
  const [decks] = useState<FlashcardDeck[]>(initial?.decks ?? INITIAL_DECKS);
  const [flashcards, setFlashcards] = useState<FlashcardItem[]>(initial?.flashcards ?? INITIAL_FLASHCARDS);
  const [exams, setExams] = useState<ExamItem[]>(initial?.exams ?? INITIAL_EXAMS);
  const [quizzes, setQuizzes] = useState<PracticeQuiz[]>(initial?.quizzes ?? INITIAL_QUIZZES);
  const [focusHistory, setFocusHistory] = useState<FocusHistoryItem[]>(initial?.focusHistory ?? INITIAL_FOCUS_HISTORY);
  const [achievements] = useState<AchievementBadge[]>(INITIAL_ACHIEVEMENTS);
  const [challenges, setChallenges] = useState<ChallengeItem[]>(initial?.challenges ?? INITIAL_CHALLENGES);
  const [xpPoints, setXpPoints] = useState<number>(initial?.xpPoints ?? 4280);
  const [notifications, setNotifications] = useState<NotificationItem[]>(initial?.notifications ?? INITIAL_NOTIFICATIONS);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const [preferences, setPreferences] = useState<UserPreferences>(initial?.preferences ?? {
    name: 'Maya Lin',
    email: 'maya.lin@university.edu',
    major: 'Computer Science & Quantitative Biology',
    dailyGoalHours: 4.5,
    weeklyGoalHours: 32,
    pomodoroFocusMin: 25,
    pomodoroBreakMin: 5,
    autoStartBreaks: true,
    ambientSound: 'None',
    desktopNotifications: true,
    examReminders: true,
    weeklyDigest: true,
    reducedMotion: false,
    highContrastText: false,
    showFocusStreak: true,
    localBackupAuto: true,
  });

  const [focusTimer, setFocusTimer] = useState<FocusTimerState>({
    mode: 'Pomodoro',
    phase: 'focus',
    secondsLeft: 25 * 60,
    totalSeconds: 25 * 60,
    elapsedSeconds: 0,
    running: false,
    subjectId: 'cs340',
    taskTitle: 'Complete Problem Set 8: NP-Completeness Reductions',
    cycleCount: 2,
    miniVisible: false,
    completionModalOpen: false,
    lastCompletedMinutes: 25,
  });

  const snapshot = useMemo<WorkspaceSnapshot>(() => ({
    theme, accentColor, density, dashboardWidgets, subjects, tasks, sessions, goals, folders, notes, decks, flashcards, exams, quizzes, focusHistory, challenges, xpPoints, notifications, preferences,
  }), [theme, accentColor, density, dashboardWidgets, subjects, tasks, sessions, goals, folders, notes, decks, flashcards, exams, quizzes, focusHistory, challenges, xpPoints, notifications, preferences]);
  const [saveError, setSaveError] = useState('');
  const savedSnapshot = useRef(snapshot);

  const saveWorkspace = useCallback(() => {
    if (!workspace || savedSnapshot.current === snapshot) return;
    void workspace.writer.save(snapshot).then(() => {
      savedSnapshot.current = snapshot;
      setSaveError('');
    }, error => setSaveError(String(error)));
  }, [workspace, snapshot]);

  useEffect(saveWorkspace, [saveWorkspace]);

  const toastTimerRef = useRef<number[]>([]);

  const pushToast = useCallback((text: string) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev.slice(-2), { id, text }]);
    const timer = window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
    toastTimerRef.current.push(timer);
  }, []);

  useEffect(() => {
    return () => {
      toastTimerRef.current.forEach((id) => window.clearTimeout(id));
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
    const interval = window.setInterval(() => {
      setFocusTimer((prev) => {
        if (!prev.running) return prev;
        if (prev.mode === 'Stopwatch') {
          return { ...prev, elapsedSeconds: prev.elapsedSeconds + 1 };
        }
        if (prev.secondsLeft <= 1) {
          const completedMin = Math.max(1, Math.round(prev.totalSeconds / 60));
          return {
            ...prev,
            secondsLeft: 0,
            running: false,
            completionModalOpen: true,
            lastCompletedMinutes: completedMin,
          };
        }
        return {
          ...prev,
          secondsLeft: prev.secondsLeft - 1,
          elapsedSeconds: prev.elapsedSeconds + 1,
        };
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, [focusTimer.running]);

  const setFocusMode = useCallback((mode: FocusTimerState['mode'], customMinutes?: number) => {
    const mins =
      mode === 'Pomodoro'
        ? 25
        : mode === 'Countdown'
          ? 45
          : mode === 'Custom'
            ? customMinutes ?? 35
            : 0;
    setFocusTimer((prev) => ({
      ...prev,
      mode,
      phase: 'focus',
      running: false,
      secondsLeft: mins * 60,
      totalSeconds: Math.max(60, mins * 60),
      elapsedSeconds: 0,
    }));
  }, []);

  const toggleFocusRunning = useCallback(() => {
    setFocusTimer((prev) => ({ ...prev, running: !prev.running }));
  }, []);

  const resetFocusTimer = useCallback(() => {
    setFocusTimer((prev) => ({
      ...prev,
      running: false,
      secondsLeft: prev.mode === 'Stopwatch' ? 0 : prev.totalSeconds,
      elapsedSeconds: 0,
    }));
  }, []);

  const setFocusContext = useCallback((subjectId: string, taskTitle: string) => {
    setFocusTimer((prev) => ({ ...prev, subjectId, taskTitle }));
  }, []);

  const setMiniTimerVisible = useCallback((visible: boolean) => {
    setFocusTimer((prev) => ({ ...prev, miniVisible: visible }));
  }, []);

  const triggerCompleteFocusSession = useCallback(() => {
    setFocusTimer((prev) => {
      const mins =
        prev.mode === 'Stopwatch'
          ? Math.max(1, Math.round(prev.elapsedSeconds / 60) || 25)
          : Math.max(1, Math.round((prev.totalSeconds - prev.secondsLeft) / 60) || Math.round(prev.totalSeconds / 60));
      return {
        ...prev,
        running: false,
        completionModalOpen: true,
        lastCompletedMinutes: mins,
      };
    });
  }, []);

  const submitFocusCompletion = useCallback(
    (rating: number) => {
      setFocusHistory((prev) => [
        {
          id: `fh-${Date.now()}`,
          subjectId: focusTimer.subjectId,
          taskTitle: focusTimer.taskTitle,
          mode: focusTimer.mode,
          durationMinutes: focusTimer.lastCompletedMinutes,
          completedAt: 'Just now',
          qualityRating: rating,
        },
        ...prev,
      ]);
      setXpPoints((x) => x + 60);
      setFocusTimer((prev) => ({
        ...prev,
        completionModalOpen: false,
        cycleCount: prev.cycleCount + 1,
        phase: prev.phase === 'focus' ? 'break' : 'focus',
        secondsLeft: prev.phase === 'focus' ? 5 * 60 : prev.totalSeconds,
        elapsedSeconds: 0,
      }));
      pushToast(`Focus session logged (+60 XP)`);
    },
    [focusTimer.lastCompletedMinutes, focusTimer.mode, focusTimer.subjectId, focusTimer.taskTitle, pushToast]
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
      setSubjects((prev) => [...prev, newSub]);
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

  // Task mutations
  const addTask = useCallback(
    (t: Omit<TaskItem, 'id'>) => {
      setTasks((prev) => [{ ...t, id: `tsk-${Date.now()}` }, ...prev]);
      pushToast(`Task created: ${t.title}`);
    },
    [pushToast]
  );

  const updateTask = useCallback((id: string, patch: Partial<TaskItem>) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }, []);

  const deleteTasks = useCallback(
    (ids: string[]) => {
      setTasks((prev) => prev.filter((t) => !ids.includes(t.id)));
      pushToast(`Deleted ${ids.length} task${ids.length === 1 ? '' : 's'}`);
    },
    [pushToast]
  );

  const toggleTaskStatus = useCallback((id: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status: t.status === 'done' ? 'todo' : 'done' } : t))
    );
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
    (s: Omit<StudySession, 'id'>) => {
      setSessions((prev) => [...prev, { ...s, id: `ses-${Date.now()}` }]);
      pushToast(`Scheduled: ${s.title}`);
    },
    [pushToast]
  );

  const updateSession = useCallback((id: string, patch: Partial<StudySession>) => {
    setSessions((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }, []);

  const deleteSession = useCallback(
    (id: string) => {
      setSessions((prev) => prev.filter((s) => s.id !== id));
      pushToast('Study session removed');
    },
    [pushToast]
  );

  // Goal mutations
  const addGoal = useCallback(
    (g: Omit<GoalItem, 'id'>) => {
      setGoals((prev) => [{ ...g, id: `g-${Date.now()}` }, ...prev]);
      pushToast(`Goal added: ${g.title}`);
    },
    [pushToast]
  );

  const updateGoal = useCallback((id: string, patch: Partial<GoalItem>) => {
    setGoals((prev) => prev.map((g) => (g.id === id ? { ...g, ...patch } : g)));
  }, []);

  // Notes mutations
  const updateNote = useCallback((id: string, patch: Partial<NoteItem>) => {
    setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, ...patch } : n)));
  }, []);

  const createNote = useCallback(
    (subjectId: string, folderId: string) => {
      const id = `note-${Date.now()}`;
      const newNote: NoteItem = {
        id,
        folderId: folderId === 'fld-all' ? 'fld-cs' : folderId,
        subjectId,
        title: 'Untitled Study Note',
        updatedAt: 'Just now',
        pinned: false,
        tags: ['Draft'],
        content: '# Untitled Study Note\n\nStart capturing concepts, proofs, or key lecture takeaways...\n\n- [ ] Review lecture recording\n- [ ] Add practice problems',
        linkedResources: [],
        attachments: [],
        pdfHighlights: [],
      };
      setNotes((prev) => [newNote, ...prev]);
      setSelectedNoteId(id);
      pushToast('New note created');
      return id;
    },
    [pushToast]
  );

  // Flashcards mutations
  const addFlashcard = useCallback(
    (card: Omit<FlashcardItem, 'id' | 'intervalDays' | 'easeFactor' | 'dueToday' | 'mastery'>) => {
      setFlashcards((prev) => [
        {
          ...card,
          id: `fc-${Date.now()}`,
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

  const reviewFlashcard = useCallback((cardId: string, rating: ReviewRating) => {
    setFlashcards((prev) =>
      prev.map((c) => {
        if (c.id !== cardId) return c;
        const next = scheduleFlashcardReview(c, rating);
        return {
          ...c,
          intervalDays: next.intervalDays,
          easeFactor: next.easeFactor,
          mastery: next.mastery,
          dueToday: rating === 'again',
        };
      })
    );
  }, []);

  // Exams mutations
  const addExam = useCallback(
    (exam: Omit<ExamItem, 'id' | 'mockHistory'>) => {
      setExams((prev) => [...prev, { ...exam, id: `ex-${Date.now()}`, mockHistory: [] }]);
      pushToast(`Exam added: ${exam.title}`);
    },
    [pushToast]
  );

  const recordQuizScore = useCallback((quizId: string, score: number) => {
    setQuizzes((prev) => prev.map((q) => (q.id === quizId ? { ...q, lastScore: score } : q)));
    setXpPoints((x) => x + 80);
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

  return (
    <AppContext.Provider
      value={{
        route,
        setRoute,
        selectedSubjectId,
        setSelectedSubjectId,
        selectedNoteId,
        setSelectedNoteId,
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
        addSubject,
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
        folders,
        notes,
        updateNote,
        createNote,
        decks,
        flashcards,
        addFlashcard,
        reviewFlashcard,
        exams,
        addExam,
        quizzes,
        recordQuizScore,
        focusTimer,
        setFocusMode,
        toggleFocusRunning,
        resetFocusTimer,
        setFocusContext,
        setMiniTimerVisible,
        triggerCompleteFocusSession,
        submitFocusCompletion,
        dismissFocusCompletion,
        focusHistory,
        achievements,
        challenges,
        claimChallenge,
        xpPoints,
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
          <button type="button" className="underline" onClick={saveWorkspace}>Retry save</button>
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
