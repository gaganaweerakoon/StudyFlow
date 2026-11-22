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

export const USER_AVATAR_URL = '/src/assets/images/avatar_student_profile_1795370871897.jpg';
export const COMPANION_DESK_URL = '/src/assets/images/study_companion_desk_1795370873168.jpg';

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

export const INITIAL_DASHBOARD_WIDGETS: DashboardWidgetConfig[] = [
  { id: 'kpi_strip', label: 'Key Metrics Overview', visible: true },
  { id: 'planned_actual_chart', label: 'Planned vs Actual Study Time', visible: true },
  { id: 'today_schedule', label: "Today's Study Schedule", visible: true },
  { id: 'quick_focus', label: 'Quick-Start Focus Timer', visible: true },
  { id: 'subject_progress', label: 'Subject Progress', visible: true },
  { id: 'upcoming_exams', label: 'Upcoming Exams', visible: true },
  { id: 'recent_notes', label: 'Recent Notes', visible: true },
  { id: 'ai_insight', label: 'Productivity Insight', visible: true },
];

export const INITIAL_SUBJECTS: Subject[] = [
  {
    id: 'cs340',
    code: 'CS 340',
    name: 'Algorithms & Complexity',
    instructor: 'Prof. Elena Rostova',
    color: '#4F46E5',
    icon: 'code',
    totalHours: 46.5,
    weeklyTargetHours: 8,
    lastStudied: 'Today, 9:15 AM',
    nextExamDate: '2026-12-04',
    nextExamTitle: 'Final Examination',
    currentGrade: 'A-',
    targetGrade: 'A',
    chapters: [
      {
        id: 'cs-ch1',
        title: '1. Divide & Conquer and Recurrences',
        topics: [
          { id: 'cs-t1', title: 'Master Theorem & Akra-Bazzi Bounds', completed: true, difficulty: 'medium', confidence: 5, revisionStatus: 'mastered' },
          { id: 'cs-t2', title: 'Fast Fourier Transform (FFT)', completed: true, difficulty: 'hard', confidence: 4, revisionStatus: 'mastered' },
        ],
      },
      {
        id: 'cs-ch2',
        title: '2. Dynamic Programming & Greedy Choice',
        topics: [
          { id: 'cs-t3', title: 'Optimal Substructure & Memoization', completed: true, difficulty: 'medium', confidence: 5, revisionStatus: 'mastered' },
          { id: 'cs-t4', title: 'Sequence Alignment & Edit Distance', completed: true, difficulty: 'medium', confidence: 4, revisionStatus: 'in_review' },
          { id: 'cs-t5', title: 'Matroid Exchange Arguments', completed: false, difficulty: 'hard', confidence: 3, revisionStatus: 'in_review' },
        ],
      },
      {
        id: 'cs-ch3',
        title: '3. Network Flows & NP-Completeness',
        topics: [
          { id: 'cs-t6', title: 'Ford-Fulkerson & Max-Flow Min-Cut', completed: true, difficulty: 'medium', confidence: 4, revisionStatus: 'in_review' },
          { id: 'cs-t7', title: 'Polynomial-Time Reductions (3-SAT to Clique)', completed: false, difficulty: 'hard', confidence: 2, revisionStatus: 'not_started' },
          { id: 'cs-t8', title: 'Approximation Ratios for Vertex Cover', completed: false, difficulty: 'hard', confidence: 2, revisionStatus: 'not_started' },
        ],
      },
    ],
  },
  {
    id: 'math241',
    code: 'MATH 241',
    name: 'Multivariable Calculus',
    instructor: 'Dr. Marcus Chen',
    color: '#0D9488',
    icon: 'sigma',
    totalHours: 38.2,
    weeklyTargetHours: 7,
    lastStudied: 'Yesterday, 6:40 PM',
    nextExamDate: '2026-11-29',
    nextExamTitle: 'Midterm III: Vector Fields',
    currentGrade: 'A',
    targetGrade: 'A',
    chapters: [
      {
        id: 'ma-ch1',
        title: '1. Partial Derivatives & Gradients',
        topics: [
          { id: 'ma-t1', title: 'Directional Derivatives & Tangent Planes', completed: true, difficulty: 'easy', confidence: 5, revisionStatus: 'mastered' },
          { id: 'ma-t2', title: 'Lagrange Multipliers with Two Constraints', completed: true, difficulty: 'medium', confidence: 4, revisionStatus: 'mastered' },
        ],
      },
      {
        id: 'ma-ch2',
        title: '2. Multiple Integrals',
        topics: [
          { id: 'ma-t3', title: 'Triple Integrals in Spherical Coordinates', completed: true, difficulty: 'medium', confidence: 4, revisionStatus: 'mastered' },
          { id: 'ma-t4', title: 'Jacobian Change of Variables', completed: true, difficulty: 'medium', confidence: 4, revisionStatus: 'in_review' },
        ],
      },
      {
        id: 'ma-ch3',
        title: '3. Vector Calculus Theorems',
        topics: [
          { id: 'ma-t5', title: "Green's Theorem & Flux Form", completed: true, difficulty: 'medium', confidence: 4, revisionStatus: 'in_review' },
          { id: 'ma-t6', title: "Stokes' Theorem on Oriented Surfaces", completed: false, difficulty: 'hard', confidence: 3, revisionStatus: 'in_review' },
          { id: 'ma-t7', title: 'Gauss Divergence Theorem Applications', completed: false, difficulty: 'hard', confidence: 2, revisionStatus: 'not_started' },
        ],
      },
    ],
  },
  {
    id: 'chem210',
    code: 'CHEM 210',
    name: 'Organic Chemistry II',
    instructor: 'Dr. Clara Lindqvist',
    color: '#D97706',
    icon: 'flask',
    totalHours: 34.0,
    weeklyTargetHours: 6.5,
    lastStudied: 'Yesterday, 3:10 PM',
    nextExamDate: '2026-12-08',
    nextExamTitle: 'Synthesis & Spectroscopy Final',
    currentGrade: 'B+',
    targetGrade: 'A-',
    chapters: [
      {
        id: 'ch-ch1',
        title: '1. Aromaticity & EAS Mechanisms',
        topics: [
          { id: 'ch-t1', title: 'Hückel Rule & Annulene Stability', completed: true, difficulty: 'easy', confidence: 5, revisionStatus: 'mastered' },
          { id: 'ch-t2', title: 'Friedel-Crafts Acylation & Directing Effects', completed: true, difficulty: 'medium', confidence: 4, revisionStatus: 'mastered' },
        ],
      },
      {
        id: 'ch-ch2',
        title: '2. Carbonyl Condensations',
        topics: [
          { id: 'ch-t3', title: 'Aldol Addition vs Condensation Kinetics', completed: true, difficulty: 'medium', confidence: 3, revisionStatus: 'in_review' },
          { id: 'ch-t4', title: 'Claisen & Dieckmann Ester Cyclization', completed: false, difficulty: 'hard', confidence: 2, revisionStatus: 'in_review' },
          { id: 'ch-t5', title: 'Michael Addition & Robinson Annulation', completed: false, difficulty: 'hard', confidence: 2, revisionStatus: 'not_started' },
        ],
      },
    ],
  },
  {
    id: 'neur302',
    code: 'NEUR 302',
    name: 'Systems Neuroscience',
    instructor: 'Prof. Samuel Okafor',
    color: '#E11D48',
    icon: 'brain',
    totalHours: 29.4,
    weeklyTargetHours: 5.5,
    lastStudied: '2 days ago',
    nextExamDate: '2026-12-11',
    nextExamTitle: 'Cortical Circuits Practical',
    currentGrade: 'A-',
    targetGrade: 'A',
    chapters: [
      {
        id: 'ne-ch1',
        title: '1. Sensory Encoding & Retinotopy',
        topics: [
          { id: 'ne-t1', title: 'Center-Surround Receptive Fields in LGN', completed: true, difficulty: 'medium', confidence: 5, revisionStatus: 'mastered' },
          { id: 'ne-t2', title: 'V1 Orientation Columns & Ocular Dominance', completed: true, difficulty: 'medium', confidence: 4, revisionStatus: 'mastered' },
        ],
      },
      {
        id: 'ne-ch2',
        title: '2. Synaptic Plasticity & Memory',
        topics: [
          { id: 'ne-t3', title: 'NMDA Coincidence Detection in Hippocampal CA1', completed: true, difficulty: 'hard', confidence: 4, revisionStatus: 'in_review' },
          { id: 'ne-t4', title: 'Spike-Timing Dependent Plasticity (STDP)', completed: false, difficulty: 'hard', confidence: 3, revisionStatus: 'in_review' },
        ],
      },
    ],
  },
  {
    id: 'econ205',
    code: 'ECON 205',
    name: 'Econometrics',
    instructor: 'Dr. Henrik Solberg',
    color: '#7C3AED',
    icon: 'chart',
    totalHours: 21.8,
    weeklyTargetHours: 4.5,
    lastStudied: '3 days ago',
    nextExamDate: '2026-12-14',
    nextExamTitle: 'Causal Inference Paper & Exam',
    currentGrade: 'A',
    targetGrade: 'A',
    chapters: [
      {
        id: 'ec-ch1',
        title: '1. Linear Regression & Gauss-Markov',
        topics: [
          { id: 'ec-t1', title: 'OLS Asymptotics & Heteroskedasticity-Robust SE', completed: true, difficulty: 'medium', confidence: 5, revisionStatus: 'mastered' },
          { id: 'ec-t2', title: 'Omitted Variable Bias Derivation', completed: true, difficulty: 'easy', confidence: 5, revisionStatus: 'mastered' },
        ],
      },
      {
        id: 'ec-ch2',
        title: '2. Identification Strategies',
        topics: [
          { id: 'ec-t3', title: 'Instrumental Variables & Two-Stage Least Squares', completed: true, difficulty: 'hard', confidence: 4, revisionStatus: 'in_review' },
          { id: 'ec-t4', title: 'Difference-in-Differences Parallel Trends', completed: false, difficulty: 'medium', confidence: 3, revisionStatus: 'not_started' },
        ],
      },
    ],
  },
];

export const INITIAL_TASKS: TaskItem[] = [
  {
    id: 'tsk-1',
    title: 'Complete Problem Set 8: NP-Completeness Reductions',
    subjectId: 'cs340',
    dueDate: '2026-11-22',
    dueLabel: 'Today, 11:59 PM',
    priority: 'high',
    status: 'in_progress',
    estimatedMinutes: 90,
    description: 'Prove polynomial-time reduction from 3-SAT to Independent Set and write clean LaTeX proofs for Questions 3 & 4.',
    subtasks: [
      { id: 'st-1', title: 'Draft 3-SAT gadget construction diagram', done: true },
      { id: 'st-2', title: 'Verify forward and backward soundness proofs', done: true },
      { id: 'st-3', title: 'Typeset complexity analysis in LaTeX', done: false },
    ],
  },
  {
    id: 'tsk-2',
    title: "Solve 12 practice integrals for Stokes' Theorem",
    subjectId: 'math241',
    dueDate: '2026-11-22',
    dueLabel: 'Today, 6:00 PM',
    priority: 'high',
    status: 'todo',
    estimatedMinutes: 75,
    description: 'Focus on surface orientation consistency and boundary curve parametrization from Stewart Ch. 16.8.',
    subtasks: [
      { id: 'st-4', title: 'Paraboloid & hemisphere curl evaluations (Q1–Q6)', done: true },
      { id: 'st-5', title: 'Intersecting cylinder-plane boundary curves (Q7–Q12)', done: false },
    ],
  },
  {
    id: 'tsk-3',
    title: 'Map Robinson Annulation retrosynthesis pathways',
    subjectId: 'chem210',
    dueDate: '2026-11-23',
    dueLabel: 'Tomorrow',
    priority: 'medium',
    status: 'todo',
    estimatedMinutes: 60,
    description: 'Annotate regioselectivity of kinetic vs thermodynamic enolates across 6 multistep targets.',
    subtasks: [
      { id: 'st-6', title: 'Review Michael donor pKa table', done: true },
      { id: 'st-7', title: 'Draw arrow-pushing mechanism for Wieland-Miescher ketone', done: false },
    ],
  },
  {
    id: 'tsk-4',
    title: 'Annotate Bliss & Lømo (1973) LTP paper figures',
    subjectId: 'neur302',
    dueDate: '2026-11-24',
    dueLabel: 'Tue, Nov 24',
    priority: 'medium',
    status: 'review',
    estimatedMinutes: 45,
    description: 'Summarize perforant path population spike potentiation duration and prepare 2 seminar discussion questions.',
    subtasks: [
      { id: 'st-8', title: 'Highlight Figure 4 EPSP slope baseline shifts', done: true },
      { id: 'st-9', title: 'Draft 2 discussion prompts on late-phase LTP', done: true },
    ],
  },
  {
    id: 'tsk-5',
    title: 'Run 2SLS IV regression diagnostics in R Markdown',
    subjectId: 'econ205',
    dueDate: '2026-11-25',
    dueLabel: 'Wed, Nov 25',
    priority: 'low',
    status: 'todo',
    estimatedMinutes: 50,
    description: 'Compute first-stage F-statistic for weak instrument check and report Hausman test p-value.',
    subtasks: [
      { id: 'st-10', title: 'Clean CPS panel microdata missing rows', done: true },
      { id: 'st-11', title: 'Export publication-ready stargazer table', done: false },
    ],
  },
  {
    id: 'tsk-6',
    title: 'Review Max-Flow Min-Cut proof & residual graphs',
    subjectId: 'cs340',
    dueDate: '2026-11-22',
    dueLabel: 'Today, 10:00 AM',
    priority: 'medium',
    status: 'done',
    estimatedMinutes: 40,
    description: 'Walk through Edmonds-Karp BFS augmenting path bound O(VE^2).',
    subtasks: [
      { id: 'st-12', title: 'Trace bipartite matching reduction example', done: true },
    ],
  },
  {
    id: 'tsk-7',
    title: 'Complete Hückel aromaticity flashcard deck',
    subjectId: 'chem210',
    dueDate: '2026-11-21',
    dueLabel: 'Yesterday',
    priority: 'low',
    status: 'done',
    estimatedMinutes: 25,
    description: 'Achieve >90% recall across heterocyclic pi-electron counts.',
    subtasks: [
      { id: 'st-13', title: 'Review pyridine vs pyrrole lone-pair hybridization', done: true },
    ],
  },
];

export const INITIAL_SESSIONS: StudySession[] = [
  {
    id: 'ses-1',
    title: 'NP-Completeness Reductions Deep Work',
    subjectId: 'cs340',
    dayIndex: 6, // Today (Sun Nov 22)
    date: '2026-11-22',
    startHour: 9,
    durationHours: 1.5,
    status: 'completed',
    recurring: true,
    location: 'Science Library · Desk 4B',
    notes: 'Completed 3-SAT to Independent Set proof draft.',
  },
  {
    id: 'ses-2',
    title: "Stokes' Theorem Problem Drill",
    subjectId: 'math241',
    dayIndex: 6,
    date: '2026-11-22',
    startHour: 11,
    durationHours: 1.5,
    status: 'upcoming',
    recurring: false,
    location: 'Home Desk',
    notes: 'Timed 45m problem sets + 30m error log review.',
  },
  {
    id: 'ses-3',
    title: 'Carbonyl Condensation Mechanisms',
    subjectId: 'chem210',
    dayIndex: 6,
    date: '2026-11-22',
    startHour: 14,
    durationHours: 1.5,
    status: 'upcoming',
    recurring: true,
    location: 'Chemistry Commons',
    notes: 'Aldol & Claisen arrow-pushing practice.',
  },
  {
    id: 'ses-4',
    title: 'Active Recall: Cortical Plasticity',
    subjectId: 'neur302',
    dayIndex: 6,
    date: '2026-11-22',
    startHour: 16.5,
    durationHours: 1.0,
    status: 'upcoming',
    location: 'Home Desk',
    notes: '24 flashcards due + Bliss & Lømo summary.',
  },
  {
    id: 'ses-5',
    title: 'Dynamic Programming Recitation Prep',
    subjectId: 'cs340',
    dayIndex: 0, // Mon Nov 16
    date: '2026-11-16',
    startHour: 9.5,
    durationHours: 2.0,
    status: 'completed',
    recurring: true,
    location: 'Gates Hall 204',
  },
  {
    id: 'ses-6',
    title: 'Multiple Integrals & Jacobians',
    subjectId: 'math241',
    dayIndex: 1, // Tue Nov 17
    date: '2026-11-17',
    startHour: 13,
    durationHours: 1.5,
    status: 'completed',
    location: 'Science Library',
  },
  {
    id: 'ses-7',
    title: 'Aromatic Substitution Synthesis Drill',
    subjectId: 'chem210',
    dayIndex: 2, // Wed Nov 18
    date: '2026-11-18',
    startHour: 10,
    durationHours: 1.5,
    status: 'completed',
    recurring: true,
    location: 'Home Desk',
  },
  {
    id: 'ses-8',
    title: 'Econometrics 2SLS Lab Walkthrough',
    subjectId: 'econ205',
    dayIndex: 3, // Thu Nov 19
    date: '2026-11-19',
    startHour: 15,
    durationHours: 1.5,
    status: 'missed',
    location: 'Quant Lab',
    notes: 'Deferred due to seminar overrun — suggested for Monday 10:00 AM.',
  },
  {
    id: 'ses-9',
    title: 'Hippocampal LTP & STDP Reading',
    subjectId: 'neur302',
    dayIndex: 4, // Fri Nov 20
    date: '2026-11-20',
    startHour: 11,
    durationHours: 1.5,
    status: 'completed',
    location: 'Bio Library',
  },
  {
    id: 'ses-10',
    title: 'Vector Calculus Mock Midterm',
    subjectId: 'math241',
    dayIndex: 5, // Sat Nov 21
    date: '2026-11-21',
    startHour: 10,
    durationHours: 2.0,
    status: 'completed',
    location: 'Quiet Reading Room',
  },
];

export const INITIAL_GOALS: GoalItem[] = [
  {
    id: 'g-1',
    title: 'Daily Deep Study Target',
    category: 'daily',
    current: 3.4,
    target: 4.5,
    unit: 'hrs',
    deadline: 'Today, 10:00 PM',
    milestones: [
      { id: 'm1', label: 'Morning 90m Algorithms block', done: true, date: '09:00 AM' },
      { id: 'm2', label: 'Midday Vector Calculus set', done: true, date: '11:30 AM' },
      { id: 'm3', label: 'Afternoon Organic Mechanisms', done: false, date: '02:00 PM' },
    ],
  },
  {
    id: 'g-2',
    title: 'Weekly Focused Study Hours',
    category: 'weekly',
    current: 28.6,
    target: 32.0,
    unit: 'hrs',
    deadline: 'Sun, Nov 22',
    milestones: [
      { id: 'm4', label: 'Cross 15h midpoint by Wednesday', done: true, date: 'Nov 18' },
      { id: 'm5', label: 'Complete weekend exam simulation', done: true, date: 'Nov 21' },
      { id: 'm6', label: 'Finish final 3.4h Sunday blocks', done: false, date: 'Nov 22' },
    ],
  },
  {
    id: 'g-3',
    title: 'Master CS 340 NP-Completeness Syllabus',
    category: 'syllabus',
    subjectId: 'cs340',
    current: 5,
    target: 8,
    unit: 'topics',
    deadline: 'Dec 2, 2026',
    milestones: [
      { id: 'm7', label: 'Network Flow & Cut theorems', done: true, date: 'Nov 16' },
      { id: 'm8', label: 'Karp 21 canonical reductions', done: false, date: 'Nov 26' },
      { id: 'm9', label: '2-Approximation proofs', done: false, date: 'Dec 1' },
    ],
  },
  {
    id: 'g-4',
    title: 'Spaced Repetition Revision Target',
    category: 'revision',
    subjectId: 'chem210',
    current: 142,
    target: 180,
    unit: 'cards',
    deadline: 'Nov 28, 2026',
    milestones: [
      { id: 'm10', label: 'Aromaticity & EAS deck >90%', done: true, date: 'Nov 19' },
      { id: 'm11', label: 'Carbonyl condensations 60 cards', done: false, date: 'Nov 25' },
    ],
  },
  {
    id: 'g-5',
    title: 'Complete Weekly Problem Sets On Time',
    category: 'tasks',
    current: 11,
    target: 14,
    unit: 'tasks',
    deadline: 'Nov 25, 2026',
    milestones: [
      { id: 'm12', label: 'MATH 241 PSet 9 submitted', done: true, date: 'Nov 19' },
      { id: 'm13', label: 'CS 340 PSet 8 submitted', done: false, date: 'Nov 22' },
    ],
  },
];

export const INITIAL_FOLDERS: NoteFolder[] = [
  { id: 'fld-all', name: 'All Notes' },
  { id: 'fld-cs', name: 'CS 340 · Algorithms', subjectId: 'cs340' },
  { id: 'fld-math', name: 'MATH 241 · Vector Calc', subjectId: 'math241' },
  { id: 'fld-chem', name: 'CHEM 210 · Organic II', subjectId: 'chem210' },
  { id: 'fld-neur', name: 'NEUR 302 · Neuroscience', subjectId: 'neur302' },
];

export const INITIAL_NOTES: NoteItem[] = [
  {
    id: 'note-1',
    folderId: 'fld-cs',
    subjectId: 'cs340',
    title: 'Polynomial-Time Reductions & NP-Completeness Playbook',
    updatedAt: 'Today, 9:42 AM',
    pinned: true,
    tags: ['NP-Complete', 'Proofs', 'Final Review'],
    content: `# Polynomial-Time Reductions & NP-Completeness

A decision problem $B$ is **NP-complete** if:
1. $B \\in \\text{NP}$ (a polynomial-time verifier exists for any certificate $c$).
2. Every problem $A \\in \\text{NP}$ satisfies $A \\le_p B$.

## Canonical Reduction Chain
- **Circuit-SAT** -> **3-SAT** (Tseitin transformation introduces auxiliary variables per gate)
- **3-SAT** -> **Independent Set** (build a triangle per clause, link contradictory literals $x_i$ and $\\neg x_i$)
- **Independent Set** -> **Vertex Cover** ($S$ is an independent set iff $V \\setminus S$ is a vertex cover)

## Proof Verification Checklist
- [x] Confirm reduction runs in $O(n^k)$ time
- [x] Prove forward implication: YES instance of $A \\implies$ YES instance of $B$
- [ ] Verify edge cases for duplicate literals inside a single 3-SAT clause

| Problem | Certificate Size | Known Reduction Source |
| :--- | :--- | :--- |
| 3-SAT | $n$ Boolean assignments | Circuit-SAT |
| Clique | $k$ vertex indices | Independent Set (complement graph) |
| Subset Sum | Subset indices | 3-SAT (base-10 digit gadgets) |`,
    linkedResources: ['CLRS Chapter 34 — NP-Completeness', 'Lecture 19 Slides: Reduction Gadgets'],
    attachments: [
      { id: 'att-1', name: 'Lecture19_NP_Reductions.pdf', type: 'pdf', size: '2.4 MB' },
      { id: 'att-2', name: 'Karp_21_Summary_Sheet.pdf', type: 'sheet', size: '640 KB' },
    ],
    pdfHighlights: [
      {
        id: 'hl-1',
        page: 4,
        excerpt: 'If any NP-complete problem can be solved in polynomial time, then P = NP.',
        note: 'Core theorem statement needed for exam Q1.',
        color: 'amber',
      },
      {
        id: 'hl-2',
        page: 7,
        excerpt: 'The gadget maps each clause C_j to a 3-clique where at most one literal vertex can be selected.',
        note: 'Remember to state why k = m (number of clauses).',
        color: 'sky',
      },
    ],
  },
  {
    id: 'note-2',
    folderId: 'fld-math',
    subjectId: 'math241',
    title: "Stokes' Theorem & Surface Orientation Rules",
    updatedAt: 'Yesterday, 7:15 PM',
    pinned: true,
    tags: ['Vector Calculus', 'Midterm III'],
    content: `# Stokes' Theorem

Let $S$ be an oriented piecewise-smooth surface bounded by a simple, closed, positively oriented boundary curve $C$.

$$\\iint_S (\\nabla \\times \\mathbf{F}) \\cdot d\\mathbf{S} = \\oint_C \\mathbf{F} \\cdot d\\mathbf{r}$$

## Key Computation Strategy
- If the surface $S$ is complicated (e.g., an elliptical paraboloid with cap), replace $S$ with a **simpler surface $S_2$** sharing the exact same boundary curve $C$ and orientation.
- Check right-hand rule: thumb along unit normal $\\mathbf{n}$, fingers curl along $C$.

## Practice Checklist
- [x] Verify curl of conservative field vanishes ($\\nabla \\times \\nabla f = \\mathbf{0}$)
- [ ] Practice flux orientation across downward-facing cones`,
    linkedResources: ['Stewart Ch. 16.8 Problem Bank', 'MIT 18.02 Recitation Notes'],
    attachments: [
      { id: 'att-3', name: 'Vector_Theorems_Reference.pdf', type: 'pdf', size: '1.8 MB' },
    ],
    pdfHighlights: [
      {
        id: 'hl-3',
        page: 2,
        excerpt: 'Two surfaces sharing a positively oriented boundary curve have identical curl flux.',
        note: 'Huge shortcut for closed domes over flat disks.',
        color: 'emerald',
      },
    ],
  },
  {
    id: 'note-3',
    folderId: 'fld-chem',
    subjectId: 'chem210',
    title: 'Carbonyl Enolate Selectivity: Kinetic vs Thermodynamic',
    updatedAt: 'Nov 20, 4:05 PM',
    pinned: false,
    tags: ['Mechanisms', 'Enolates'],
    content: `# Kinetic vs. Thermodynamic Enolates

## Conditions Comparison
| Parameter | Kinetic Enolate | Thermodynamic Enolate |
| :--- | :--- | :--- |
| Base | LDA (bulky, strong) | NaOEt / NaH (smaller, reversible) |
| Temperature | $-78^\\circ\\text{C}$ | $25^\\circ\\text{C}$ to reflux |
| Solvent | Aprotic (THF) | Protic (EtOH) |
| Product | Less substituted double bond | More substituted double bond |

## Robinson Annulation Sequence
1. **Michael Addition** of resonance-stabilized enolate to $\\alpha,\\beta$-unsaturated ketone.
2. **Intramolecular Aldol Condensation** forming a 6-membered cyclohexenone ring.`,
    linkedResources: ['Clayden Organic Chemistry Ch. 26', 'Spectroscopy IR/NMR Table'],
    attachments: [
      { id: 'att-4', name: 'Carbonyl_Reaction_Map.pdf', type: 'pdf', size: '3.1 MB' },
    ],
    pdfHighlights: [],
  },
  {
    id: 'note-4',
    folderId: 'fld-neur',
    subjectId: 'neur302',
    title: 'NMDA Receptors & Synaptic Plasticity (LTP / LTD)',
    updatedAt: 'Nov 19, 8:20 PM',
    pinned: false,
    tags: ['Hippocampus', 'Plasticity'],
    content: `# Hippocampal CA1 Long-Term Potentiation

## Coincidence Detection
NMDA glutamate receptors require **two simultaneous events** to pass $\\text{Ca}^{2+}$:
1. Presynaptic release of **glutamate** binding to GluN2 subunit.
2. Postsynaptic **depolarization** (via AMPA receptors) expelling the extracellular $\\text{Mg}^{2+}$ block.

## Downstream Signaling
- High, rapid $\\text{Ca}^{2+}$ influx activates **CaMKII** -> phosphorylation and exocytosis of new AMPA receptors (**LTP**).
- Modest, prolonged $\\text{Ca}^{2+}$ influx activates **calcineurin (PP2B)** -> AMPA endocytosis (**LTD**).`,
    linkedResources: ['Bliss & Lømo (1973) J. Physiol.', 'Kandel Principles Ch. 67'],
    attachments: [
      { id: 'att-5', name: 'Bliss_Lomo_1973_Annotated.pdf', type: 'pdf', size: '4.2 MB' },
    ],
    pdfHighlights: [],
  },
];

export const INITIAL_DECKS: FlashcardDeck[] = [
  {
    id: 'deck-cs',
    title: 'Algorithms Complexity & Reductions',
    subjectId: 'cs340',
    description: 'Asymptotic bounds, amortized analysis, and NP-complete reduction pairs.',
    lastReviewed: 'Today, 8:30 AM',
    retentionRate: 92,
  },
  {
    id: 'deck-chem',
    title: 'Organic II Reagents & Enolates',
    subjectId: 'chem210',
    description: 'Selectivity, carbonyl condensations, and aromatic directing groups.',
    lastReviewed: 'Yesterday',
    retentionRate: 84,
  },
  {
    id: 'deck-neur',
    title: 'Cortical Pathways & Plasticity',
    subjectId: 'neur302',
    description: 'Visual stream anatomy, receptive fields, and NMDA signaling cascades.',
    lastReviewed: '2 days ago',
    retentionRate: 89,
  },
  {
    id: 'deck-math',
    title: 'Vector Calculus Identities',
    subjectId: 'math241',
    description: 'Curl, divergence, Jacobians, and oriented surface integrals.',
    lastReviewed: 'Today, 10:15 AM',
    retentionRate: 94,
  },
];

export const INITIAL_FLASHCARDS: FlashcardItem[] = [
  {
    id: 'fc-1',
    deckId: 'deck-cs',
    front: 'What two conditions must hold for a decision problem B to be NP-complete?',
    back: '1) B belongs to NP (polynomial-time certificate verifier exists).\n2) B is NP-hard: every problem A in NP reduces to B in polynomial time (or an existing NP-complete problem reduces to B).',
    hint: 'Membership + Hardness',
    intervalDays: 4,
    easeFactor: 2.5,
    dueToday: true,
    mastery: 'learning',
  },
  {
    id: 'fc-2',
    deckId: 'deck-cs',
    front: 'What is the worst-case time complexity of Edmonds-Karp Max-Flow?',
    back: 'O(V · E²). Choosing the shortest augmenting path via BFS guarantees at most O(V · E) augmentations, each found in O(E) time.',
    hint: 'BFS shortest augmenting paths',
    intervalDays: 7,
    easeFactor: 2.6,
    dueToday: true,
    mastery: 'learning',
  },
  {
    id: 'fc-3',
    deckId: 'deck-cs',
    front: 'State the Master Theorem solution when f(n) = Θ(n^(log_b a) · log^k n).',
    back: 'Case 2: T(n) = Θ(n^(log_b a) · log^(k+1) n). The work per recursion level is balanced across log_b n levels.',
    hint: 'Balanced recursion tree',
    intervalDays: 14,
    easeFactor: 2.7,
    dueToday: true,
    mastery: 'mature',
  },
  {
    id: 'fc-4',
    deckId: 'deck-chem',
    front: 'Which base and temperature favor the kinetic enolate of 2-methylcyclohexanone?',
    back: 'LDA (lithium diisopropylamide) in THF at −78 °C. Bulky steric hindrance selectively deprotonates the less substituted α-carbon irreversibly.',
    hint: 'Bulky base, cryogenic temp',
    intervalDays: 3,
    easeFactor: 2.4,
    dueToday: true,
    mastery: 'learning',
  },
  {
    id: 'fc-5',
    deckId: 'deck-chem',
    front: 'Name the two consecutive reactions that compose a Robinson Annulation.',
    back: '1) Michael addition (1,4-conjugate addition of an enolate to an α,β-unsaturated carbonyl).\n2) Intramolecular aldol condensation forming a cyclohexenone ring.',
    hint: '1,4-addition followed by ring closure',
    intervalDays: 2,
    easeFactor: 2.3,
    dueToday: true,
    mastery: 'new',
  },
  {
    id: 'fc-6',
    deckId: 'deck-neur',
    front: 'Why is the NMDA receptor called a Hebbian coincidence detector?',
    back: 'Channel opening requires BOTH presynaptic glutamate binding AND postsynaptic depolarization to relieve the voltage-dependent extracellular Mg²⁺ block.',
    hint: 'Ligand + Voltage',
    intervalDays: 6,
    easeFactor: 2.5,
    dueToday: true,
    mastery: 'learning',
  },
  {
    id: 'fc-7',
    deckId: 'deck-math',
    front: 'What is the spherical coordinates volume element dV?',
    back: 'dV = ρ² sin(φ) dρ dφ dθ, where ρ is radial distance, φ is polar angle from +z axis, and θ is azimuthal angle.',
    hint: 'Jacobian determinant of spherical map',
    intervalDays: 10,
    easeFactor: 2.6,
    dueToday: true,
    mastery: 'mature',
  },
];

export const INITIAL_EXAMS: ExamItem[] = [
  {
    id: 'ex-1',
    title: 'Midterm III: Vector Fields & Stokes',
    subjectId: 'math241',
    date: '2026-11-29',
    time: '09:30 AM – 11:15 AM',
    room: 'Hilbert Hall 108',
    weightPercent: 25,
    prepProgress: 81,
    targetGrade: 'A (93%+)',
    syllabusTopics: ["Green's Theorem", "Stokes' Theorem", 'Divergence Theorem', 'Flux Integrals'],
    mockHistory: [
      { date: 'Nov 14', score: 78, label: 'Diagnostic Quiz' },
      { date: 'Nov 18', score: 86, label: 'Timed Mock A' },
      { date: 'Nov 21', score: 91, label: 'Timed Mock B' },
    ],
  },
  {
    id: 'ex-2',
    title: 'Algorithms Final Examination',
    subjectId: 'cs340',
    date: '2026-12-04',
    time: '01:00 PM – 04:00 PM',
    room: 'Turing Auditorium',
    weightPercent: 35,
    prepProgress: 74,
    targetGrade: 'A (92%+)',
    syllabusTopics: ['Divide & Conquer', 'Dynamic Programming', 'Network Flows', 'NP-Completeness'],
    mockHistory: [
      { date: 'Nov 12', score: 80, label: 'Practice Paper 2024' },
      { date: 'Nov 20', score: 88, label: 'Practice Paper 2025' },
    ],
  },
  {
    id: 'ex-3',
    title: 'Synthesis & Spectroscopy Final',
    subjectId: 'chem210',
    date: '2026-12-08',
    time: '10:00 AM – 12:30 PM',
    room: 'Curie Science 302',
    weightPercent: 30,
    prepProgress: 64,
    targetGrade: 'A- (89%+)',
    syllabusTopics: ['Aromaticity', 'EAS Mechanisms', 'Aldol & Claisen', 'Robinson Annulation', 'NMR'],
    mockHistory: [
      { date: 'Nov 15', score: 74, label: 'Mechanism Drill' },
      { date: 'Nov 21', score: 82, label: 'Synthesis Mock 1' },
    ],
  },
  {
    id: 'ex-4',
    title: 'Cortical Circuits Practical',
    subjectId: 'neur302',
    date: '2026-12-11',
    time: '02:00 PM – 04:00 PM',
    room: 'Pavlov Lab 12',
    weightPercent: 30,
    prepProgress: 78,
    targetGrade: 'A (94%+)',
    syllabusTopics: ['Retinotopy', 'V1 Columns', 'NMDA Plasticity', 'STDP'],
    mockHistory: [{ date: 'Nov 19', score: 89, label: 'Lab Practical Mock' }],
  },
];

export const INITIAL_QUIZZES: PracticeQuiz[] = [
  {
    id: 'qz-cs',
    title: 'CS 340 — Flows & NP-Completeness Timed Drill',
    subjectId: 'cs340',
    durationMinutes: 15,
    difficulty: 'Exam Level',
    lastScore: 84,
    questions: [
      {
        id: 'q-cs-1',
        type: 'mcq',
        topic: 'Network Flows',
        prompt: 'In any flow network with integer capacities, the value of the maximum s-t flow equals the capacity of which cut?',
        options: [
          'The maximum-capacity s-t cut',
          'The minimum-capacity s-t cut',
          'The average-capacity global cut',
          'Any cut containing no saturated edges',
        ],
        correctAnswer: 'The minimum-capacity s-t cut',
        explanation: 'By the Max-Flow Min-Cut Theorem, max |f| = min c(S, T) over all s-t cuts (S, T).',
      },
      {
        id: 'q-cs-2',
        type: 'mcq',
        topic: 'NP-Completeness',
        prompt: 'To prove a new problem Y in NP is NP-complete using a known NP-complete problem X, which reduction direction must be constructed?',
        options: [
          'Y ≤_p X (reduce new problem to known problem)',
          'X ≤_p Y (reduce known NP-complete problem to new problem)',
          'Either direction suffices if polynomial time',
          'Reduce Y to 2-SAT in O(n) time',
        ],
        correctAnswer: 'X ≤_p Y (reduce known NP-complete problem to new problem)',
        explanation: 'Showing X ≤_p Y proves Y is at least as hard as X, establishing NP-hardness.',
      },
      {
        id: 'q-cs-3',
        type: 'short',
        topic: 'Dynamic Programming',
        prompt: 'What is the name of the graph shortest-path algorithm that handles negative edge weights in O(VE) time?',
        correctAnswer: 'Bellman-Ford',
        explanation: 'Bellman-Ford relaxes all E edges V−1 times, detecting negative cycles on pass V.',
      },
      {
        id: 'q-cs-4',
        type: 'mcq',
        topic: 'Approximation Algorithms',
        prompt: 'Selecting both endpoints of every edge in a maximal matching gives what approximation ratio for Minimum Vertex Cover?',
        options: ['1.5-approximation', '2-approximation', 'ln(n)-approximation', 'Optimal exact solution'],
        correctAnswer: '2-approximation',
        explanation: 'Any vertex cover must include at least one endpoint from each edge in the matching, so |C| ≤ 2|M| ≤ 2·OPT.',
      },
    ],
  },
  {
    id: 'qz-math',
    title: 'MATH 241 — Vector Calculus Theorems Check',
    subjectId: 'math241',
    durationMinutes: 12,
    difficulty: 'Standard',
    lastScore: 91,
    questions: [
      {
        id: 'q-ma-1',
        type: 'mcq',
        topic: "Stokes' Theorem",
        prompt: 'If F is a conservative vector field on R³ (F = ∇f), what is the value of the surface integral of (∇ × F) · dS over any oriented surface S?',
        options: ['Always 1', 'Always 0', 'Equal to the surface area of S', 'Depends on the boundary curve C'],
        correctAnswer: 'Always 0',
        explanation: 'The curl of any gradient field is identically the zero vector: ∇ × (∇f) = 0.',
      },
      {
        id: 'q-ma-2',
        type: 'mcq',
        topic: 'Divergence Theorem',
        prompt: 'Gauss Divergence Theorem converts a closed outward surface flux integral into what type of integral?',
        options: [
          'A line integral around the equator',
          'A triple integral of div(F) over the enclosed solid E',
          'A double integral of curl(F)',
          'A scalar path integral',
        ],
        correctAnswer: 'A triple integral of div(F) over the enclosed solid E',
        explanation: '∬_∂E F · dS = ∭_E (∇ · F) dV for smoothly bounded solid E.',
      },
      {
        id: 'q-ma-3',
        type: 'short',
        topic: 'Multiple Integrals',
        prompt: 'What is the determinant factor used when changing variables in a double or triple integral called?',
        correctAnswer: 'Jacobian',
        explanation: 'The absolute value of the Jacobian determinant |∂(x,y)/∂(u,v)| scales the area or volume element.',
      },
    ],
  },
];

export const INITIAL_FOCUS_HISTORY: FocusHistoryItem[] = [
  { id: 'fh-1', subjectId: 'cs340', taskTitle: 'NP-Completeness Reductions', mode: 'Pomodoro', durationMinutes: 50, completedAt: 'Today, 10:15 AM', qualityRating: 5 },
  { id: 'fh-2', subjectId: 'math241', taskTitle: "Stokes' Theorem Integrals", mode: 'Pomodoro', durationMinutes: 45, completedAt: 'Yesterday, 7:05 PM', qualityRating: 4 },
  { id: 'fh-3', subjectId: 'chem210', taskTitle: 'Carbonyl Enolate Mechanisms', mode: 'Countdown', durationMinutes: 40, completedAt: 'Yesterday, 3:55 PM', qualityRating: 4 },
  { id: 'fh-4', subjectId: 'neur302', taskTitle: 'Bliss & Lømo LTP Figures', mode: 'Pomodoro', durationMinutes: 25, completedAt: 'Nov 20, 4:30 PM', qualityRating: 5 },
  { id: 'fh-5', subjectId: 'econ205', taskTitle: '2SLS Weak Instruments', mode: 'Custom', durationMinutes: 60, completedAt: 'Nov 19, 11:20 AM', qualityRating: 3 },
];

export const DASHBOARD_CHART_DATA = {
  daily: [
    { label: '08:00', planned: 0.5, actual: 0.5 },
    { label: '10:00', planned: 1.5, actual: 1.6 },
    { label: '12:00', planned: 2.0, actual: 1.9 },
    { label: '14:00', planned: 3.0, actual: 2.8 },
    { label: '16:00', planned: 3.8, actual: 3.4 },
    { label: '18:00', planned: 4.5, actual: 4.1 },
    { label: '20:00', planned: 5.0, actual: 4.6 },
  ],
  weekly: [
    { label: 'Mon', planned: 4.5, actual: 4.2 },
    { label: 'Tue', planned: 4.0, actual: 4.6 },
    { label: 'Wed', planned: 5.0, actual: 4.8 },
    { label: 'Thu', planned: 4.5, actual: 3.4 },
    { label: 'Fri', planned: 4.0, actual: 4.3 },
    { label: 'Sat', planned: 5.5, actual: 5.1 },
    { label: 'Sun', planned: 4.5, actual: 3.8 },
  ],
  monthly: [
    { label: 'Wk 1', planned: 28, actual: 26.4 },
    { label: 'Wk 2', planned: 30, actual: 31.2 },
    { label: 'Wk 3', planned: 32, actual: 29.8 },
    { label: 'Wk 4', planned: 32, actual: 30.2 },
  ],
};

export const ANALYTICS_PRODUCTIVITY_TREND = [
  { label: 'Nov 09', score: 76, focusHours: 3.8 },
  { label: 'Nov 11', score: 81, focusHours: 4.4 },
  { label: 'Nov 13', score: 79, focusHours: 4.1 },
  { label: 'Nov 15', score: 86, focusHours: 5.0 },
  { label: 'Nov 17', score: 88, focusHours: 4.7 },
  { label: 'Nov 19', score: 84, focusHours: 4.0 },
  { label: 'Nov 21', score: 92, focusHours: 5.2 },
  { label: 'Nov 22', score: 90, focusHours: 4.6 },
];

export const ANALYTICS_FOCUS_DURATION = [
  { bucket: '15–25m', sessions: 14 },
  { bucket: '25–45m', sessions: 28 },
  { bucket: '45–60m', sessions: 22 },
  { bucket: '60–90m', sessions: 11 },
  { bucket: '90m+', sessions: 4 },
];

export const ANALYTICS_GOAL_COMPARISON = [
  { subject: 'CS 340', target: 8.0, actual: 8.4 },
  { subject: 'MATH 241', target: 7.0, actual: 6.8 },
  { subject: 'CHEM 210', target: 6.5, actual: 5.4 },
  { subject: 'NEUR 302', target: 5.5, actual: 5.1 },
  { subject: 'ECON 205', target: 4.5, actual: 3.9 },
];

export const ANALYTICS_TASK_TRENDS = [
  { week: 'Oct W4', completed: 14, pending: 4 },
  { week: 'Nov W1', completed: 17, pending: 3 },
  { week: 'Nov W2', completed: 19, pending: 5 },
  { week: 'Nov W3', completed: 21, pending: 2 },
  { week: 'Nov W4', completed: 16, pending: 4 },
];

export const ANALYTICS_RETENTION_CURVE = [
  { day: 'Day 1', retention: 96, benchmark: 85 },
  { day: 'Day 3', retention: 92, benchmark: 76 },
  { day: 'Day 7', retention: 89, benchmark: 68 },
  { day: 'Day 14', retention: 87, benchmark: 60 },
  { day: 'Day 30', retention: 85, benchmark: 52 },
];

export const ANALYTICS_EXAM_PROGRESSION = [
  { exam: 'Quiz 1', cs340: 82, math241: 85, chem210: 76 },
  { exam: 'Midterm I', cs340: 86, math241: 88, chem210: 79 },
  { exam: 'Quiz 2', cs340: 89, math241: 90, chem210: 83 },
  { exam: 'Midterm II', cs340: 91, math241: 93, chem210: 86 },
  { exam: 'Mock Final', cs340: 93, math241: 94, chem210: 88 },
];

export const ANALYTICS_SESSIONS_TABLE: AnalyticsSessionRow[] = [
  { id: 'as-1', date: '2026-11-22', subjectId: 'cs340', topic: 'NP-Completeness Reductions', plannedMin: 90, actualMin: 95, focusScore: 94, mode: 'Pomodoro' },
  { id: 'as-2', date: '2026-11-21', subjectId: 'math241', topic: 'Vector Calculus Mock Midterm', plannedMin: 120, actualMin: 118, focusScore: 92, mode: 'Countdown' },
  { id: 'as-3', date: '2026-11-21', subjectId: 'chem210', topic: 'Aldol Condensation Kinetics', plannedMin: 75, actualMin: 65, focusScore: 81, mode: 'Pomodoro' },
  { id: 'as-4', date: '2026-11-20', subjectId: 'neur302', topic: 'Hippocampal CA1 LTP', plannedMin: 60, actualMin: 62, focusScore: 90, mode: 'Pomodoro' },
  { id: 'as-5', date: '2026-11-19', subjectId: 'econ205', topic: '2SLS Instrument Diagnostics', plannedMin: 60, actualMin: 50, focusScore: 78, mode: 'Custom' },
  { id: 'as-6', date: '2026-11-18', subjectId: 'cs340', topic: 'Ford-Fulkerson & Bipartite Matching', plannedMin: 90, actualMin: 92, focusScore: 95, mode: 'Pomodoro' },
  { id: 'as-7', date: '2026-11-17', subjectId: 'math241', topic: 'Spherical Triple Integrals', plannedMin: 90, actualMin: 85, focusScore: 88, mode: 'Countdown' },
  { id: 'as-8', date: '2026-11-16', subjectId: 'chem210', topic: 'Friedel-Crafts Directing Groups', plannedMin: 60, actualMin: 64, focusScore: 86, mode: 'Pomodoro' },
];

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
  { day: 'Mon', slots: [3, 4, 2, 3, 4, 2, 1, 0] },
  { day: 'Tue', slots: [2, 4, 3, 2, 3, 3, 2, 0] },
  { day: 'Wed', slots: [4, 4, 2, 3, 4, 2, 1, 1] },
  { day: 'Thu', slots: [2, 3, 2, 1, 3, 2, 2, 0] },
  { day: 'Fri', slots: [3, 4, 3, 2, 2, 1, 1, 0] },
  { day: 'Sat', slots: [1, 4, 4, 3, 3, 2, 1, 0] },
  { day: 'Sun', slots: [2, 4, 3, 4, 3, 2, 1, 0] },
];

export const INITIAL_ACHIEVEMENTS: AchievementBadge[] = [
  { id: 'ach-1', title: 'Fourteen-Day Cadence', description: 'Log focused study blocks for 14 consecutive days.', unlocked: true, unlockedDate: 'Nov 20, 2026', progress: 14, target: 14, xpReward: 350, category: 'Consistency' },
  { id: 'ach-2', title: 'Deep Work Architect', description: 'Complete 25 uninterrupted Pomodoro blocks rated 4+ stars.', unlocked: true, unlockedDate: 'Nov 18, 2026', progress: 25, target: 25, xpReward: 400, category: 'Focus' },
  { id: 'ach-3', title: 'Active Recall Scholar', description: 'Maintain 85%+ flashcard retention over 7 consecutive days.', unlocked: true, unlockedDate: 'Nov 15, 2026', progress: 7, target: 7, xpReward: 300, category: 'Mastery' },
  { id: 'ach-4', title: 'Schedule Precision', description: 'Achieve 90% Planned vs Actual study adherence in a week.', unlocked: true, unlockedDate: 'Nov 10, 2026', progress: 92, target: 90, xpReward: 250, category: 'Planning' },
  { id: 'ach-5', title: 'Centurion Hours', description: 'Accumulate 200 total focused study hours this semester.', unlocked: false, progress: 170, target: 200, xpReward: 600, category: 'Focus' },
  { id: 'ach-6', title: 'Exam Ready', description: 'Reach 90% syllabus completion across all enrolled courses.', unlocked: false, progress: 68, target: 90, xpReward: 500, category: 'Mastery' },
];

export const INITIAL_CHALLENGES: ChallengeItem[] = [
  { id: 'chl-1', title: 'Log 30 focused study hours this week', current: 28.6, target: 30, unit: 'hrs', xp: 250, claimed: false },
  { id: 'chl-2', title: 'Review 80 spaced-repetition flashcards', current: 80, target: 80, unit: 'cards', xp: 150, claimed: false },
  { id: 'chl-3', title: 'Score 85%+ on two timed practice quizzes', current: 2, target: 2, unit: 'quizzes', xp: 200, claimed: true },
];

export const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  { id: 'not-1', title: 'Study session starting in 35 min', detail: "MATH 241 · Stokes' Theorem Problem Drill at 11:00 AM", time: '10m ago', read: false, route: 'planner' },
  { id: 'not-2', title: 'Smart reschedule suggestion ready', detail: 'Move deferred ECON 205 lab block to Monday 10:00 AM', time: '42m ago', read: false, route: 'planner' },
  { id: 'not-3', title: '7 flashcards due for review today', detail: 'Algorithms Complexity & Organic II decks ready', time: '2h ago', read: false, route: 'flashcards' },
  { id: 'not-4', title: 'Weekly challenge completed', detail: 'Reviewed 80 spaced-repetition cards (+150 XP available)', time: 'Yesterday', read: true, route: 'achievements' },
];
