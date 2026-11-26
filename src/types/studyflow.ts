export type ThemeId = 'light' | 'dark' | 'midnight' | 'ocean' | 'forest' | 'warm';
export type DensityMode = 'compact' | 'comfortable';

export type NavRoute =
  | 'dashboard'
  | 'planner'
  | 'focus'
  | 'tasks'
  | 'goals'
  | 'subjects'
  | 'notes'
  | 'flashcards'
  | 'practice'
  | 'exams'
  | 'lab'
  | 'analytics'
  | 'assistant'
  | 'achievements'
  | 'settings';

export type Priority = 'high' | 'medium' | 'low';
export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'done';

export interface Subtask {
  id: string;
  title: string;
  done: boolean;
}

export interface TaskItem {
  id: string;
  title: string;
  subjectId: string;
  dueDate: string; // YYYY-MM-DD
  dueLabel: string;
  priority: Priority;
  status: TaskStatus;
  estimatedMinutes: number;
  description: string;
  subtasks: Subtask[];
}

export interface TopicItem {
  id: string;
  title: string;
  completed: boolean;
  difficulty: 'easy' | 'medium' | 'hard';
  confidence: number; // 1-5
  revisionStatus: 'not_started' | 'in_review' | 'mastered';
}

export interface UnitItem {
  id: string;
  title: string;
  archived?: boolean;
}

export interface ChapterItem {
  unitId?: string;
  id: string;
  title: string;
  topics: TopicItem[];
  archived?: boolean;
}

export interface Subject {
  id: string;
  code: string;
  name: string;
  instructor: string;
  color: string;
  icon: 'code' | 'sigma' | 'flask' | 'brain' | 'chart';
  totalHours: number;
  weeklyTargetHours: number;
  lastStudied: string;
  nextExamDate: string;
  nextExamTitle: string;
  currentGrade: string;
  targetGrade: string;
  units?: UnitItem[];
  chapters: ChapterItem[];
  archived?: boolean;
}

export type SessionStatus = 'upcoming' | 'completed' | 'missed';

export type ScheduleBlockType = 'study' | 'sleep' | 'free';
export type AdvanceNoticeOption = 0 | 10 | 15;

export interface CalendarAlarmSettings {
  advanceNoticeMin: AdvanceNoticeOption;
  ringAtStart: boolean;
  remindAtBedtime: boolean;
  wakeAtEnd: boolean;
}

export interface StudySession {
  id: string;
  title: string;
  subjectId: string;
  dayIndex: number; // 0 = Mon ... 6 = Sun
  date: string; // YYYY-MM-DD
  startHour: number; // e.g. 9.5 for 09:30
  durationHours: number; // e.g. 1.5
  status: SessionStatus;
  countsTowardStudy?: boolean;
  blockType?: ScheduleBlockType;
  alarms?: CalendarAlarmSettings;
  recurring?: boolean;
  notes?: string;
  location?: string;
}

export interface GoalMilestone {
  id: string;
  label: string;
  done: boolean;
  date: string;
  taskId?: string;
}

export interface GoalItem {
  createdAt?: string;
  completedAt?: string;
  id: string;
  title: string;
  category: 'daily' | 'weekly' | 'subject' | 'tasks' | 'syllabus' | 'revision';
  subjectId?: string;
  current: number;
  target: number;
  unit: string;
  deadline: string;
  milestones: GoalMilestone[];
}

export interface NoteAttachment {
  id: string;
  name: string;
  type: 'pdf' | 'slide' | 'sheet' | 'doc' | 'markdown' | 'text' | 'image' | 'file';
  size: string;
  markdown?: string;
  originalFont?: string;
  uploadedAt?: string;
}

export interface PdfHighlight {
  id: string;
  page: number;
  excerpt: string;
  note: string;
  color: 'amber' | 'sky' | 'emerald';
}

export interface NoteItem {
  syllabusLinks?: import('../utils/syllabusHierarchy').SyllabusLinks;
  pdf?: import('../notes/pdf').PdfSource;
  originalFont?: string;
  fontMode?: 'original' | 'unicode' | 'sans' | 'serif' | 'mono';
  id: string;
  folderId: string;
  subjectId: string;
  title: string;
  updatedAt: string;
  pinned: boolean;
  content: string;
  tags: string[];
  linkedResources: string[];
  attachments: NoteAttachment[];
  pdfHighlights: PdfHighlight[];
}

export interface NoteFolder {
  id: string;
  name: string;
  subjectId?: string;
}

export interface FlashcardItem {
  id: string;
  deckId: string;
  front: string;
  back: string;
  hint?: string;
  intervalDays: number;
  easeFactor: number;
  dueToday: boolean;
  nextReviewDate?: string;
  lastReviewedAt?: string;
  reviewCount?: number;
  lapses?: number;
  mastery: 'new' | 'learning' | 'mature';
}

export type StudyLabLanguage = 'math' | 'python' | 'javascript' | 'sql' | 'cpp';

export interface StudyLabLaunchState {
  tab: 'playground' | 'whiteboard';
  language?: StudyLabLanguage;
  code?: string;
  svg?: string;
  title?: string;
  targetNoteId?: string;
  targetQuizId?: string;
  targetQuestionId?: string;
}

export interface SyllabusExtractedExam {
  title: string;
  date: string;
  time?: string;
  room?: string;
  weightPercent: number;
  syllabusTopics?: string[];
}

export interface SyllabusExtractedTask {
  title: string;
  dueDate: string;
  priority: Priority;
  estimatedMinutes: number;
  description?: string;
}

export interface SyllabusExtractedChapter {
  unitTitle?: string;
  title: string;
  topics: string[];
}

export interface SyllabusExtractedGoal {
  title: string;
  deadline: string;
  category: GoalItem['category'];
  milestones: Array<{ label: string; date: string }>;
}

export interface SyllabusExtractionBundle {
  courseTitle?: string;
  exams: SyllabusExtractedExam[];
  tasks: SyllabusExtractedTask[];
  chapters: SyllabusExtractedChapter[];
  goals: SyllabusExtractedGoal[];
}

export interface FlashcardDeck {
  syllabusLinks?: import('../utils/syllabusHierarchy').SyllabusLinks;
  id: string;
  title: string;
  subjectId: string;
  description: string;
  lastReviewed: string;
  retentionRate: number;
}

export interface ExamItem {
  id: string;
  title: string;
  subjectId: string;
  date: string;
  time: string;
  room: string;
  weightPercent: number;
  prepProgress: number;
  targetGrade: string;
  syllabusTopics: string[];
  mockHistory: { date: string; score: number; label: string }[];
}

export interface QuizQuestion {
  id: string;
  type: 'mcq' | 'multi' | 'short';
  topic: string;
  prompt: string;
  options?: string[];
  correctAnswer: string;
  rubric?: string;
  explanation: string;
}

export interface PracticeAttempt {
  id?: string;
  at: string;
  score: number;
  review?: {
    questions: QuizQuestion[];
    answers: Record<string, string>;
    marks: Record<string, { correct: boolean; feedback: string }>;
  };
}

export interface PracticeQuiz {
  syllabusLinks?: import('../utils/syllabusHierarchy').SyllabusLinks;
  sourceNoteId?: string;
  sourceSection?: string;
  attempts?: PracticeAttempt[];
  id: string;
  title: string;
  subjectId: string;
  durationMinutes: number;
  difficulty: 'Standard' | 'Exam Level' | 'Challenge';
  lastScore?: number;
  questions: QuizQuestion[];
}

export interface FocusHistoryItem {
  startedAtMs?: number;
  endedAtMs?: number;
  source?: 'pc' | 'phone';
  calendarSessionId?: string | null;
  id: string;
  subjectId: string;
  taskTitle: string;
  mode: 'Pomodoro' | 'Countdown' | 'Stopwatch' | 'Custom';
  durationMinutes: number;
  completedAt: string;
  qualityRating: number; // 1-5
}

export interface AnalyticsSessionRow {
  id: string;
  date: string;
  subjectId: string;
  topic: string;
  plannedMin: number;
  actualMin: number;
  focusScore: number;
  mode: string;
}

export interface AchievementBadge {
  id: string;
  title: string;
  description: string;
  unlocked: boolean;
  unlockedDate?: string;
  progress: number;
  target: number;
  xpReward: number;
  category: 'Focus' | 'Consistency' | 'Mastery' | 'Planning';
}

export interface ChallengeItem {
  id: string;
  title: string;
  current: number;
  target: number;
  unit: string;
  xp: number;
  claimed: boolean;
}

export interface NotificationItem {
  id: string;
  title: string;
  detail: string;
  time: string;
  read: boolean;
  route: NavRoute;
}

export interface DashboardWidgetConfig {
  id:
    | 'kpi_strip'
    | 'planned_actual_chart'
    | 'today_schedule'
    | 'quick_focus'
    | 'subject_progress'
    | 'upcoming_exams'
    | 'recent_notes'
    | 'ai_insight';
  label: string;
  visible: boolean;
}

export type ActiveModalType =
  | null
  | 'create_task'
  | 'create_subject'
  | 'create_session'
  | 'create_goal'
  | 'create_flashcard'
  | 'create_exam';
