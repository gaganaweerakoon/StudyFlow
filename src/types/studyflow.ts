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

export interface ChapterItem {
  id: string;
  title: string;
  topics: TopicItem[];
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
  chapters: ChapterItem[];
}

export type SessionStatus = 'upcoming' | 'completed' | 'missed';

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
  recurring?: boolean;
  notes?: string;
  location?: string;
}

export interface GoalItem {
  completedAt?: string;
  id: string;
  title: string;
  category: 'daily' | 'weekly' | 'subject' | 'tasks' | 'syllabus' | 'revision';
  subjectId?: string;
  current: number;
  target: number;
  unit: string;
  deadline: string;
  milestones: { id: string; label: string; done: boolean; date: string }[];
}

export interface NoteAttachment {
  id: string;
  name: string;
  type: 'pdf' | 'slide' | 'sheet';
  size: string;
}

export interface PdfHighlight {
  id: string;
  page: number;
  excerpt: string;
  note: string;
  color: 'amber' | 'sky' | 'emerald';
}

export interface NoteItem {
  pdf?: import('../notes/pdf').PdfSource;
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
  mastery: 'new' | 'learning' | 'mature';
}

export interface FlashcardDeck {
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
  explanation: string;
}

export interface PracticeQuiz {
  sourceNoteId?: string;
  attempts?: {at:string;score:number}[];
  id: string;
  title: string;
  subjectId: string;
  durationMinutes: number;
  difficulty: 'Standard' | 'Exam Level' | 'Challenge';
  lastScore?: number;
  questions: QuizQuestion[];
}

export interface FocusHistoryItem {
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
