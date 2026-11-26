import type {
  AchievementBadge,
  AnalyticsSessionRow,
  ChallengeItem,
  DashboardWidgetConfig,
  ExamItem,
  FlashcardDeck,
  FlashcardItem,
  FocusHistoryItem,
  GoalItem,
  NoteFolder,
  NoteItem,
  NotificationItem,
  PracticeQuiz,
  StudySession,
  Subject,
  TaskItem,
  ThemeId,
} from '../types/studyflow';
import type { RewardLedger } from '../utils/rewards';
import { DEMO_WORKSPACE } from './demoWorkspace';

export const USER_AVATAR_URL = '/src/assets/images/avatar_student_profile_1795370871897.jpg';
export const COMPANION_DESK_URL = '/src/assets/images/study_companion_desk_1795370873168.jpg';

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 86_400_000;

function toLocalIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function parseLocalIsoDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1, 12, 0, 0, 0);
}

function offsetLocalDate(daysOffset: number, base = new Date()): Date {
  const d = new Date(base.getFullYear(), base.getMonth(), base.getDate(), 12, 0, 0, 0);
  d.setDate(d.getDate() + daysOffset);
  return d;
}

function offsetIso(daysOffset: number, base = new Date()): string {
  return toLocalIsoDate(offsetLocalDate(daysOffset, base));
}

function diffIsoDays(fromIso: string, toIso: string): number {
  const from = parseLocalIsoDate(fromIso);
  const to = parseLocalIsoDate(toIso);
  return Math.round((to.getTime() - from.getTime()) / DAY_MS);
}

function shiftIsoDate(iso: string, deltaDays: number): string {
  if (!ISO_DATE_RE.test(iso) || deltaDays === 0) return iso;
  return toLocalIsoDate(offsetLocalDate(deltaDays, parseLocalIsoDate(iso)));
}

function weekdayIndexFromIso(iso: string): number {
  const d = parseLocalIsoDate(iso);
  return (d.getDay() + 6) % 7; // Mon=0..Sun=6
}

function formatShortMonthDay(daysOffset: number, base = new Date()): string {
  return offsetLocalDate(daysOffset, base).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

function formatFullMonthDayYear(daysOffset: number, base = new Date()): string {
  return offsetLocalDate(daysOffset, base).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

const ANCHOR_TODAY = new Date();
const TODAY_ISO = toLocalIsoDate(ANCHOR_TODAY);
const DEMO_DELTA_DAYS = diffIsoDays(DEMO_WORKSPACE.anchorDate, TODAY_ISO);

export const THEME_OPTIONS: {
  id: ThemeId;
  name: string;
  subtitle: string;
  swatches: [string, string, string];
  isDark: boolean;
}[] = [
  { id: 'light', name: 'Light', subtitle: 'Crisp studio paper', swatches: ['#F8F9FB', '#FFFFFF', '#111827'], isDark: false },
  { id: 'dark', name: 'Dark', subtitle: 'Carbon graphite', swatches: ['#0D0F14', '#14171F', '#F1F3F8'], isDark: true },
  { id: 'midnight', name: 'Midnight', subtitle: 'Deep indigo ink', swatches: ['#060913', '#0C1222', '#EEF2FF'], isDark: true },
  { id: 'ocean', name: 'Ocean Blue', subtitle: 'Nordic fjord slate', swatches: ['#07131B', '#0D1E2A', '#EBF6FC'], isDark: true },
  { id: 'forest', name: 'Forest Green', subtitle: 'Pine conservatory', swatches: ['#09120E', '#0F1D17', '#ECF7F1'], isDark: true },
  { id: 'warm', name: 'Warm Neutral', subtitle: 'Archival linen', swatches: ['#F6F4EF', '#FDFCF9', '#1F1C18'], isDark: false },
];

export const ACCENT_PRESETS: { name: string; hex: string }[] = [
  { name: 'Indigo', hex: '#4F46E5' },
  { name: 'Teal', hex: '#0D9488' },
  { name: 'Cobalt', hex: '#2563EB' },
  { name: 'Emerald', hex: '#059669' },
  { name: 'Amber', hex: '#D97706' },
  { name: 'Rose', hex: '#E11D48' },
  { name: 'Violet', hex: '#7C3AED' },
  { name: 'Slate', hex: '#475569' },
];

export const INITIAL_DASHBOARD_WIDGETS: DashboardWidgetConfig[] = DEMO_WORKSPACE.dashboardWidgets.map((widget) => ({
  ...widget,
}));

export const INITIAL_SUBJECTS: Subject[] = DEMO_WORKSPACE.subjects.map((subject) => ({
  ...subject,
  nextExamDate: subject.nextExamDate ? shiftIsoDate(subject.nextExamDate, DEMO_DELTA_DAYS) : subject.nextExamDate,
  units: subject.units?.map((unit) => ({ ...unit })),
  chapters: subject.chapters.map((chapter) => ({
    ...chapter,
    topics: chapter.topics.map((topic) => ({ ...topic })),
  })),
}));

export const INITIAL_TASKS: TaskItem[] = DEMO_WORKSPACE.tasks.map((task) => {
  const shiftedDue = shiftIsoDate(task.dueDate, DEMO_DELTA_DAYS);
  return {
    ...task,
    dueDate: shiftedDue,
    dueLabel: ISO_DATE_RE.test(task.dueLabel) ? shiftedDue : task.dueLabel,
    subtasks: task.subtasks.map((sub) => ({ ...sub })),
  };
});

export const INITIAL_SESSIONS: StudySession[] = DEMO_WORKSPACE.sessions.map((session) => {
  const shiftedDate = shiftIsoDate(session.date, DEMO_DELTA_DAYS);
  return {
    ...session,
    date: shiftedDate,
    dayIndex: ISO_DATE_RE.test(shiftedDate) ? weekdayIndexFromIso(shiftedDate) : session.dayIndex,
    alarms: session.alarms ? { ...session.alarms } : undefined,
  };
});

export const INITIAL_GOALS: GoalItem[] = DEMO_WORKSPACE.goals.map((goal) => ({
  ...goal,
  deadline: shiftIsoDate(goal.deadline, DEMO_DELTA_DAYS),
  milestones: goal.milestones.map((ms) => ({
    ...ms,
    date: shiftIsoDate(ms.date, DEMO_DELTA_DAYS),
  })),
}));

export const INITIAL_FOLDERS: NoteFolder[] = DEMO_WORKSPACE.folders.map((folder) => ({ ...folder }));

export const INITIAL_NOTES: NoteItem[] = DEMO_WORKSPACE.notes.map((note) => ({
  ...note,
  tags: [...note.tags],
  linkedResources: [...note.linkedResources],
  attachments: note.attachments.map((att) => ({ ...att })),
  pdfHighlights: note.pdfHighlights.map((hl) => ({ ...hl })),
  syllabusLinks: note.syllabusLinks
    ? {
        unitIds: note.syllabusLinks.unitIds ? [...note.syllabusLinks.unitIds] : undefined,
        chapterIds: note.syllabusLinks.chapterIds ? [...note.syllabusLinks.chapterIds] : undefined,
      }
    : undefined,
}));

export const INITIAL_DECKS: FlashcardDeck[] = DEMO_WORKSPACE.decks.map((deck) => ({
  ...deck,
  syllabusLinks: deck.syllabusLinks
    ? {
        unitIds: deck.syllabusLinks.unitIds ? [...deck.syllabusLinks.unitIds] : undefined,
        chapterIds: deck.syllabusLinks.chapterIds ? [...deck.syllabusLinks.chapterIds] : undefined,
      }
    : undefined,
}));

export const INITIAL_FLASHCARDS: FlashcardItem[] = DEMO_WORKSPACE.flashcards.map((card) => ({
  ...card,
  nextReviewDate: card.nextReviewDate ? shiftIsoDate(card.nextReviewDate, DEMO_DELTA_DAYS) : undefined,
}));

export const INITIAL_EXAMS: ExamItem[] = DEMO_WORKSPACE.exams.map((exam) => ({
  ...exam,
  date: shiftIsoDate(exam.date, DEMO_DELTA_DAYS),
  syllabusTopics: [...exam.syllabusTopics],
  mockHistory: exam.mockHistory.map((m) => ({ ...m })),
}));

export const INITIAL_QUIZZES: PracticeQuiz[] = DEMO_WORKSPACE.quizzes.map((quiz) => ({
  ...quiz,
  syllabusLinks: quiz.syllabusLinks
    ? {
        unitIds: quiz.syllabusLinks.unitIds ? [...quiz.syllabusLinks.unitIds] : undefined,
        chapterIds: quiz.syllabusLinks.chapterIds ? [...quiz.syllabusLinks.chapterIds] : undefined,
      }
    : undefined,
  questions: quiz.questions.map((q) => ({
    ...q,
    options: q.options ? [...q.options] : undefined,
  })),
  attempts: quiz.attempts?.map((a) => ({ ...a })),
}));

export const INITIAL_FOCUS_HISTORY: FocusHistoryItem[] = DEMO_WORKSPACE.focusHistory.map((item) => ({
  ...item,
  completedAt: shiftIsoDate(item.completedAt, DEMO_DELTA_DAYS),
  startedAtMs: item.startedAtMs != null ? item.startedAtMs + DEMO_DELTA_DAYS * DAY_MS : undefined,
  endedAtMs: item.endedAtMs != null ? item.endedAtMs + DEMO_DELTA_DAYS * DAY_MS : undefined,
}));

export const INITIAL_CARD_REVIEWS: Record<string, number> = Object.fromEntries(
  Object.entries(DEMO_WORKSPACE.cardReviews).map(([day, count]) => [shiftIsoDate(day, DEMO_DELTA_DAYS), count]),
);

export const INITIAL_REWARD_LEDGER: RewardLedger = { ...DEMO_WORKSPACE.rewardLedger };

export const INITIAL_XP_POINTS: number = DEMO_WORKSPACE.xpPoints;

export const DASHBOARD_CHART_DATA = {
  daily: [
    { label: '06:00', planned: 1.5, actual: 1.5 },
    { label: '08:00', planned: 3.5, actual: 3.2 },
    { label: '10:00', planned: 5.5, actual: 5.0 },
    { label: '12:00', planned: 7.5, actual: 6.8 },
    { label: '14:00', planned: 9.0, actual: 8.1 },
    { label: '16:00', planned: 11.5, actual: 10.2 },
    { label: '18:00', planned: 13.5, actual: 12.0 },
  ],
  weekly: [
    { label: 'Mon', planned: 13.5, actual: 11.8 },
    { label: 'Tue', planned: 13.5, actual: 12.4 },
    { label: 'Wed', planned: 14.5, actual: 13.0 },
    { label: 'Thu', planned: 13.5, actual: 11.5 },
    { label: 'Fri', planned: 13.5, actual: 12.2 },
    { label: 'Sat', planned: 14.5, actual: 13.4 },
    { label: 'Sun', planned: 13.5, actual: 12.0 },
  ],
  monthly: [
    { label: 'Wk 1', planned: 84, actual: 76.5 },
    { label: 'Wk 2', planned: 88, actual: 82.0 },
    { label: 'Wk 3', planned: 90, actual: 84.5 },
    { label: 'Wk 4', planned: 92, actual: 86.3 },
  ],
};

export const ANALYTICS_PRODUCTIVITY_TREND = [
  { label: formatShortMonthDay(-13, ANCHOR_TODAY), score: 78, focusHours: 6.2 },
  { label: formatShortMonthDay(-11, ANCHOR_TODAY), score: 82, focusHours: 7.5 },
  { label: formatShortMonthDay(-9, ANCHOR_TODAY), score: 80, focusHours: 6.8 },
  { label: formatShortMonthDay(-7, ANCHOR_TODAY), score: 86, focusHours: 8.4 },
  { label: formatShortMonthDay(-5, ANCHOR_TODAY), score: 88, focusHours: 8.0 },
  { label: formatShortMonthDay(-3, ANCHOR_TODAY), score: 85, focusHours: 7.6 },
  { label: formatShortMonthDay(-1, ANCHOR_TODAY), score: 91, focusHours: 9.2 },
  { label: formatShortMonthDay(0, ANCHOR_TODAY), score: 90, focusHours: 8.5 },
];

export const ANALYTICS_FOCUS_DURATION = [
  { bucket: '15–25m', sessions: 6 },
  { bucket: '25–45m', sessions: 12 },
  { bucket: '45–60m', sessions: 18 },
  { bucket: '60–90m', sessions: 14 },
  { bucket: '90m+', sessions: 16 },
];

export const ANALYTICS_GOAL_COMPARISON = [
  { subject: 'CHEM', target: 30.0, actual: 28.5 },
  { subject: 'PHY', target: 28.0, actual: 24.0 },
  { subject: 'CM', target: 30.0, actual: 27.5 },
];

export const ANALYTICS_TASK_TRENDS = [
  { week: 'Oct W4', completed: 10, pending: 4 },
  { week: 'Nov W1', completed: 12, pending: 3 },
  { week: 'Nov W2', completed: 14, pending: 5 },
  { week: 'Nov W3', completed: 15, pending: 4 },
  { week: 'Nov W4', completed: 11, pending: 6 },
];

export const ANALYTICS_RETENTION_CURVE = [
  { day: 'Day 1', retention: 96, benchmark: 85 },
  { day: 'Day 3', retention: 92, benchmark: 76 },
  { day: 'Day 7', retention: 89, benchmark: 68 },
  { day: 'Day 14', retention: 87, benchmark: 60 },
  { day: 'Day 30', retention: 85, benchmark: 52 },
];

export const ANALYTICS_EXAM_PROGRESSION = [
  { exam: 'Unit Test 1', chem: 78, phy: 74, cm: 80 },
  { exam: 'Term Test I', chem: 82, phy: 79, cm: 84 },
  { exam: 'Unit Test 2', chem: 86, phy: 83, cm: 87 },
  { exam: 'Term Test II', chem: 90, phy: 86, cm: 89 },
  { exam: 'Revision Paper', chem: 94, phy: 88, cm: 92 },
];

export const ANALYTICS_SESSIONS_TABLE: AnalyticsSessionRow[] = INITIAL_FOCUS_HISTORY.map((item) => ({
  id: item.id,
  date: item.completedAt,
  subjectId: item.subjectId,
  topic: item.taskTitle,
  plannedMin: item.durationMinutes,
  actualMin: item.durationMinutes,
  focusScore: item.qualityRating * 20,
  mode: item.mode,
}));

// 14 weeks x 7 days consistency matrix (0..4 intensity)
export const CONSISTENCY_HEATMAP: number[][] = [
  [2, 3, 2, 1, 3, 4, 2],
  [3, 4, 3, 2, 3, 3, 1],
  [2, 2, 4, 3, 2, 4, 3],
  [1, 3, 3, 4, 3, 2, 2],
  [3, 4, 4, 3, 4, 3, 2],
  [2, 3, 2, 3, 2, 4, 3],
  [4, 3, 4, 4, 3, 2, 1],
  [3, 3, 4, 2, 4, 4, 3],
  [2, 4, 3, 3, 4, 3, 2],
  [4, 4, 3, 4, 3, 4, 3],
  [3, 2, 4, 4, 3, 3, 2],
  [4, 3, 4, 3, 4, 4, 3],
  [3, 4, 4, 2, 4, 4, 3],
  [4, 4, 3, 3, 4, 4, 3],
];

// 7 days x 8 time slots (8AM..10PM in 2h blocks)
export const PEAK_HOURS_HEATMAP: { day: string; slots: number[] }[] = [
  { day: 'Mon', slots: [4, 4, 3, 4, 4, 3, 1, 1] },
  { day: 'Tue', slots: [4, 4, 3, 3, 4, 3, 2, 1] },
  { day: 'Wed', slots: [4, 4, 4, 3, 4, 3, 1, 1] },
  { day: 'Thu', slots: [3, 4, 3, 3, 4, 2, 2, 1] },
  { day: 'Fri', slots: [4, 4, 3, 4, 3, 2, 1, 1] },
  { day: 'Sat', slots: [3, 4, 4, 4, 4, 3, 1, 1] },
  { day: 'Sun', slots: [3, 4, 4, 4, 3, 2, 1, 1] },
];

export const INITIAL_ACHIEVEMENTS: AchievementBadge[] = [
  { id: 'ach-1', title: 'Fourteen-Day Cadence', description: 'Log focused study blocks for 14 consecutive days.', unlocked: true, unlockedDate: formatFullMonthDayYear(-2, ANCHOR_TODAY), progress: 14, target: 14, xpReward: 350, category: 'Consistency' },
  { id: 'ach-2', title: 'Deep Work Architect', description: 'Complete 25 uninterrupted focus blocks rated 4+ stars.', unlocked: true, unlockedDate: formatFullMonthDayYear(-4, ANCHOR_TODAY), progress: 25, target: 25, xpReward: 400, category: 'Focus' },
  { id: 'ach-3', title: 'Active Recall Scholar', description: 'Maintain 85%+ flashcard retention over 7 consecutive days.', unlocked: true, unlockedDate: formatFullMonthDayYear(-7, ANCHOR_TODAY), progress: 7, target: 7, xpReward: 300, category: 'Mastery' },
  { id: 'ach-4', title: 'Schedule Precision', description: 'Achieve 90% Planned vs Actual study adherence in a week.', unlocked: true, unlockedDate: formatFullMonthDayYear(-12, ANCHOR_TODAY), progress: 92, target: 90, xpReward: 250, category: 'Planning' },
  { id: 'ach-5', title: 'Centurion Hours', description: 'Accumulate 200 total focused study hours this term.', unlocked: false, progress: 142, target: 200, xpReward: 600, category: 'Focus' },
  { id: 'ach-6', title: 'Exam Ready', description: 'Reach 90% syllabus completion across all A/L subjects.', unlocked: false, progress: 35, target: 90, xpReward: 500, category: 'Mastery' },
];

export const INITIAL_CHALLENGES: ChallengeItem[] = [
  { id: 'chl-1', title: 'Log 32 focused study hours this week', current: 24.5, target: 32, unit: 'hrs', xp: 250, claimed: false },
  { id: 'chl-2', title: 'Review 20 Chemical Calculations flashcards', current: 6, target: 20, unit: 'cards', xp: 150, claimed: false },
  { id: 'chl-3', title: 'Score 90%+ on a Chemical Calculations practice test', current: 1, target: 1, unit: 'quizzes', xp: 200, claimed: true },
];

export const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  { id: 'not-1', title: 'Today’s Chemistry block scheduled', detail: 'CHEM · රසායනික ගණනය - Redox Seminar (06:00 – 13:30)', time: '10m ago', read: false, route: 'planner' },
  { id: 'not-2', title: 'Afternoon Combined Maths session', detail: 'CM · ත්‍රිකෝණමිතිය - Trigonometry Day 03 (14:00 – 20:00)', time: '35m ago', read: false, route: 'planner' },
  { id: 'not-3', title: 'Flashcards ready for review', detail: 'Chemical Calculations RB 1–3 decks waiting in Active Recall', time: '2h ago', read: false, route: 'flashcards' },
  { id: 'not-4', title: 'Practice Test 1 completed (100%)', detail: 'පුහුණු පරීක්ෂණය 1 • මවුලයෙන් අංශු ගණනට හා ප්‍රතික්‍රියා ඵලදාවට', time: 'Today', read: true, route: 'practice' },
];

export { offsetIso };
