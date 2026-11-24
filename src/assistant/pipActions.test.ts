import test from 'node:test';
import assert from 'node:assert/strict';
import { parseWorkspaceEdit, splitWorkspaceResponse, type Workspace } from './workspaceEdit';
import { workspaceContext } from './workspaceContext';
import { computeWorkspaceDiagnostics, findOpenSlotsForDay } from './workspaceDiagnostics';
import { readGeneratedCards, readGeneratedQuestions } from '../notes/generatedStudyItems';
import { normalizeMarkdownForDisplay } from './markdownNormalize';

function createMockWorkspace(): Workspace {
  const subjects = [
    {
      id: 'chem210',
      code: 'CHEM 210',
      name: 'Organic Chemistry II',
      color: '#4F46E5',
      instructor: 'Dr. Patel',
      credits: 4,
      targetHoursPerWeek: 8,
      completedHoursThisWeek: 5,
      chapters: [
        {
          id: 'ch1',
          title: 'Carbonyl Chemistry',
          topics: [
            { id: 't1', title: 'Aldol Condensation', completed: true, difficulty: 'hard' as const, confidence: 4, revisionStatus: 'mastered' as const },
            { id: 't2', title: 'Wittig Reaction', completed: false, difficulty: 'hard' as const, confidence: 2, revisionStatus: 'in_review' as const },
          ],
        },
      ],
    },
  ];
  const tasks = [
    {
      id: 'tsk-1',
      title: 'Complete Carbonyl Mechanism Worksheet',
      subjectId: 'chem210',
      dueDate: '2026-11-20',
      dueLabel: '2026-11-20',
      priority: 'high' as const,
      status: 'todo' as const,
      estimatedMinutes: 60,
      description: 'Focus on enolate selectivity',
      subtasks: [],
    },
  ];
  const sessions = [
    {
      id: 'ses-1',
      title: 'Organic Chemistry Lecture',
      subjectId: 'chem210',
      date: '2026-11-23',
      dayIndex: 0,
      startHour: 9,
      durationHours: 2,
      status: 'upcoming' as const,
      blockType: 'study' as const,
      countsTowardStudy: true,
    },
  ];
  const exams = [
    {
      id: 'ex-1',
      title: 'CHEM 210 Midterm III',
      subjectId: 'chem210',
      date: '2026-11-28',
      time: '10:00',
      room: 'Science 204',
      weightPercent: 25,
      targetGrade: 'A',
      prepProgress: 52,
      syllabusTopics: [],
      mockHistory: [],
    },
  ];
  const goals = [
    {
      id: 'g-1',
      title: 'Master Carbonyl Reactions',
      category: 'revision' as const,
      current: 4,
      target: 10,
      unit: 'mechanisms',
      deadline: '2026-11-28',
      subjectId: 'chem210',
      milestones: [],
    },
  ];
  const notes = [
    {
      id: 'note-1',
      folderId: 'notes',
      subjectId: 'chem210',
      title: 'Primary Standards & Redox Titrations',
      updatedAt: 'Today',
      pinned: true,
      tags: ['Chemistry'],
      content: '## Primary Standards\nCommon primary standards include Na₂CO₃, KIO₃, and K₂Cr₂O₇. They must have high purity and stable molar mass.',
      linkedResources: [],
      attachments: [],
    },
  ];
  const decks = [
    {
      id: 'deck-1',
      title: 'CHEM 210 Core',
      subjectId: 'chem210',
      description: 'Core organic mechanisms',
      lastReviewed: 'Yesterday',
      retentionRate: 88,
    },
  ];
  const flashcards = [
    {
      id: 'fc-1',
      deckId: 'deck-1',
      front: 'What reagent converts aldehydes to alkenes?',
      back: 'Phosphonium ylide (Wittig reaction)',
      intervalDays: 1,
      easeFactor: 2.5,
      dueToday: true,
      mastery: 'learning' as 'new' | 'learning' | 'mastered',
    },
  ];
  const quizzes = [
    {
      id: 'qz-1',
      title: 'Carbonyl Diagnostic',
      subjectId: 'chem210',
      difficulty: 'Standard' as const,
      durationMinutes: 15,
      lastScore: 68,
      questions: [
        {
          id: 'q1',
          type: 'mcq' as const,
          topic: 'Wittig Reaction',
          prompt: 'Which intermediate forms in a Wittig reaction?',
          options: ['Oxaphosphetane', 'Carbocation', 'Carbene', 'Epoxide'],
          correctAnswer: 'Oxaphosphetane',
          explanation: 'The Wittig reaction proceeds through a four-membered oxaphosphetane intermediate.',
        },
      ],
    },
  ];
  const focusHistory = [
    {
      id: 'fh-1',
      subjectId: 'chem210',
      taskTitle: 'Aldol practice',
      mode: 'Pomodoro' as const,
      durationMinutes: 50,
      completedAt: '2026-11-22',
      qualityRating: 5,
    },
  ];

  const state = {
    route: 'dashboard' as Workspace['route'],
    selectedNoteId: 'note-1',
    subjects,
    tasks,
    sessions,
    exams,
    goals,
    notes,
    decks,
    flashcards,
    quizzes,
    focusHistory,
    recurringSeries: [],
    focusTimer: {
      mode: 'Pomodoro' as Workspace['focusTimer']['mode'],
      phase: 'focus' as const,
      secondsLeft: 1500,
      totalSeconds: 1500,
      elapsedSeconds: 0,
      running: false,
      subjectId: '',
      taskTitle: '',
      cycleCount: 0,
      miniVisible: false,
      completionModalOpen: false,
      lastCompletedMinutes: 25,
    },
    preferences: {
      dailyGoalHours: 4,
      weeklyGoalHours: 24,
    },
    setRoute(r: Workspace['route']) {
      state.route = r;
    },
    setSelectedNoteId(id: string) {
      state.selectedNoteId = id;
    },
    addSession(s: Omit<(typeof sessions)[number], 'id'>) {
      sessions.push({ ...s, id: `ses-${sessions.length + 1}` });
    },
    updateSession(id: string, patch: Partial<(typeof sessions)[number]>) {
      const target = sessions.find((x) => x.id === id);
      if (target) Object.assign(target, patch);
    },
    deleteSession(id: string) {
      const idx = sessions.findIndex((x) => x.id === id);
      if (idx >= 0) sessions.splice(idx, 1);
    },
    addTask(t: Omit<(typeof tasks)[number], 'id'>) {
      const id = `tsk-${tasks.length + 1}`;
      tasks.push({ ...t, id });
      return id;
    },
    updateTask(id: string, patch: Partial<(typeof tasks)[number]>) {
      const target = tasks.find((x) => x.id === id);
      if (target) Object.assign(target, patch);
    },
    deleteTasks(ids: string[]) {
      for (const id of ids) {
        const idx = tasks.findIndex((x) => x.id === id);
        if (idx >= 0) tasks.splice(idx, 1);
      }
    },
    addDeck(d: Omit<(typeof decks)[number], 'id' | 'lastReviewed' | 'retentionRate'>) {
      const id = `deck-${decks.length + 1}`;
      decks.push({ ...d, id, lastReviewed: 'Just created', retentionRate: 0 });
      return id;
    },
    addFlashcard(c: Omit<(typeof flashcards)[number], 'id' | 'intervalDays' | 'easeFactor' | 'dueToday' | 'mastery'>) {
      flashcards.push({
        ...c,
        id: `fc-${flashcards.length + 1}`,
        intervalDays: 1,
        easeFactor: 2.5,
        dueToday: true,
        mastery: 'new',
      });
    },
    addQuiz(q: (typeof quizzes)[number]) {
      quizzes.push(q);
    },
    addGoal(g: Omit<(typeof goals)[number], 'id'>) {
      goals.push({ ...g, id: `g-${goals.length + 1}` });
    },
    updateGoal(id: string, patch: Partial<(typeof goals)[number]>) {
      const target = goals.find((x) => x.id === id);
      if (target) Object.assign(target, patch);
    },
    addExam(e: Omit<(typeof exams)[number], 'id' | 'mockHistory'>) {
      exams.push({ ...e, id: `ex-${exams.length + 1}`, mockHistory: [] });
    },
    updateExam(id: string, patch: Partial<(typeof exams)[number]>) {
      const target = exams.find((x) => x.id === id);
      if (target) Object.assign(target, patch);
    },
    deleteExam(id: string) {
      const idx = exams.findIndex((x) => x.id === id);
      if (idx >= 0) exams.splice(idx, 1);
    },
    createNote(subjectId: string, folderId: string, draft?: { title?: string; content?: string }) {
      const id = `note-${notes.length + 1}`;
      notes.push({
        id,
        folderId,
        subjectId,
        title: draft?.title ?? 'Untitled',
        content: draft?.content ?? '',
        updatedAt: 'Just now',
        pinned: false,
        tags: [],
        linkedResources: [],
        attachments: [],
      });
      return id;
    },
    updateNote(id: string, patch: Partial<(typeof notes)[number]>) {
      const target = notes.find((x) => x.id === id);
      if (target) Object.assign(target, patch);
    },
    deleteNote(id: string) {
      const idx = notes.findIndex((x) => x.id === id);
      if (idx >= 0) notes.splice(idx, 1);
    },
    setFocusMode(mode: Workspace['focusTimer']['mode'], customMinutes?: number) {
      state.focusTimer.mode = mode;
      if (customMinutes) state.focusTimer.totalSeconds = customMinutes * 60;
    },
    setFocusContext(subjectId: string, taskTitle: string) {
      state.focusTimer.subjectId = subjectId;
      state.focusTimer.taskTitle = taskTitle;
    },
    applyPhoneFocusAction(cmd: { action: string }) {
      if (cmd.action === 'start') state.focusTimer.running = true;
    },
  };

  return state as unknown as Workspace;
}

test('computeWorkspaceDiagnostics calculates overdue tasks, open slots, exams, and weak topics', () => {
  const ws = createMockWorkspace();
  const diag = computeWorkspaceDiagnostics(
    {
      subjects: ws.subjects,
      tasks: ws.tasks,
      sessions: ws.sessions,
      exams: ws.exams,
      goals: ws.goals,
      notes: ws.notes,
      decks: ws.decks,
      flashcards: ws.flashcards,
      quizzes: ws.quizzes,
      focusHistory: ws.focusHistory,
      dailyGoalHours: 4,
      weeklyGoalHours: 24,
    },
    '2026-11-23',
    8,
  );

  assert.equal(diag.todayPlannedHours, 2);
  assert.equal(diag.overdueTasks.length, 1);
  assert.equal(diag.dueFlashcardsCount, 1);
  assert.equal(diag.upcomingExams[0].daysUntil, 5);
  assert.deepEqual(diag.weakQuizTopics, ['Wittig Reaction']);
  assert.ok(diag.openSlotsToday.length >= 1);
  assert.equal(diag.openSlotsToday[0].startHour, 8);
  assert.equal(diag.openSlotsToday[0].endHour, 9);
});

test('findOpenSlotsForDay detects gaps cleanly around scheduled blocks', () => {
  const slots = findOpenSlotsForDay(
    [
      { id: '1', title: 'A', subjectId: '', date: '2026-11-23', dayIndex: 0, startHour: 10, durationHours: 2, status: 'upcoming' },
      { id: '2', title: 'B', subjectId: '', date: '2026-11-23', dayIndex: 0, startHour: 14, durationHours: 2, status: 'upcoming' },
    ],
    '2026-11-23',
    8,
    18,
  );
  assert.equal(slots.length, 3);
  assert.equal(slots[0].label, '8:00 AM–10:00 AM');
  assert.equal(slots[1].label, '12:00 PM–2:00 PM');
  assert.equal(slots[2].label, '4:00 PM–6:00 PM');
});

test('workspaceContext includes full diagnostics for analysis/advice prompts and notes for flashcard prompts', () => {
  const ws = createMockWorkspace();
  const clock = { date: '2026-11-23', time: '08:30', label: '2026-11-23 08:30 (UTC, GMT)' };

  const adviceCtx = workspaceContext(ws, 'dashboard', 'Analyze my work and give me advice', clock);
  assert.match(adviceCtx.text, /Workspace Overview:/);
  assert.match(adviceCtx.text, /Calendar:/);
  assert.match(adviceCtx.text, /Tasks:/);
  assert.match(adviceCtx.text, /Exams:/);
  assert.match(adviceCtx.text, /Decks:/);
  assert.match(adviceCtx.text, /Practice Tests:/);

  const fcCtx = workspaceContext(ws, 'dashboard', 'Create 5 flashcards from my notes', clock);
  assert.match(fcCtx.text, /Notes:/);
  assert.match(fcCtx.text, /Primary Standards & Redox Titrations/);
  assert.match(fcCtx.text, /Decks:/);
});

test('parseWorkspaceEdit handles create_event with HH:MM startTime, subject code matching, and default duration', () => {
  const ws = createMockWorkspace();
  const edit = parseWorkspaceEdit(
    JSON.stringify({
      action: 'create_event',
      title: 'Wittig Reaction Drills',
      date: '2026-11-23',
      startTime: '14:30',
      subjectId: 'CHEM 210',
    }),
    ws,
  );
  assert.ok(edit);
  assert.equal(edit.confirmation, undefined);
  assert.equal(edit.route, 'planner');
  assert.equal(edit.apply(ws), true);
  assert.equal(ws.sessions.length, 2);
  assert.equal(ws.sessions[1].subjectId, 'chem210');
  assert.equal(ws.sessions[1].startHour, 14.5);
  assert.equal(ws.sessions[1].durationHours, 1);
});

test('parseWorkspaceEdit handles create_flashcards with auto-created new deck via deckTitle', () => {
  const ws = createMockWorkspace();
  const edit = parseWorkspaceEdit(
    JSON.stringify({
      action: 'create_flashcards',
      noteId: 'Primary Standards',
      deckTitle: 'Redox Titration Standards',
      cards: [
        { front: 'Name two primary standards.', back: 'Na₂CO₃ and KIO₃' },
        { front: 'Why must a primary standard be pure?', back: 'So molar concentration is known accurately by mass.' },
      ],
    }),
    ws,
  );
  assert.ok(edit);
  assert.equal(edit.route, 'flashcards');
  assert.equal(edit.apply(ws), true);
  assert.equal(ws.decks.length, 2);
  assert.equal(ws.decks[1].title, 'Redox Titration Standards');
  assert.equal(ws.flashcards.length, 3);
});

test('parseWorkspaceEdit handles create_practice_test, create_goal, add_goal_milestone, and start_focus_session', () => {
  const ws = createMockWorkspace();

  const quizEdit = parseWorkspaceEdit(
    JSON.stringify({
      action: 'create_practice_test',
      noteId: 'note-1',
      title: 'Primary Standards Check',
      questions: [
        {
          type: 'mcq',
          prompt: 'Which is a primary standard?',
          options: ['NaOH', 'Na₂CO₃', 'HCl', 'KMnO₄'],
          answer: 'B',
          explanation: 'Na₂CO₃ is a primary standard.',
        },
      ],
    }),
    ws,
  );
  assert.ok(quizEdit);
  assert.equal(quizEdit.apply(ws), true);
  assert.equal(ws.quizzes.length, 2);
  assert.equal(ws.quizzes[1].questions[0].correctAnswer, 'Na₂CO₃');

  const msEdit = parseWorkspaceEdit(
    JSON.stringify({ action: 'add_goal_milestone', goalId: 'Master Carbonyl', title: 'Complete 15 synthesis problems' }),
    ws,
  );
  assert.ok(msEdit);
  assert.equal(msEdit.apply(ws), true);
  assert.equal(ws.goals[0].milestones?.length, 1);

  const focusEdit = parseWorkspaceEdit(
    JSON.stringify({ action: 'start_focus_session', taskTitle: 'Redox review', mode: 'Custom', minutes: 30, subjectId: 'CHEM 210' }),
    ws,
  );
  assert.ok(focusEdit);
  assert.equal(focusEdit.apply(ws), true);
  assert.equal(ws.focusTimer.running, true);
  assert.equal(ws.focusTimer.totalSeconds, 1800);
});

test('destructive edits require confirmation and splitWorkspaceResponse extracts multiple pip-edit blocks', () => {
  const ws = createMockWorkspace();
  const delEdit = parseWorkspaceEdit(JSON.stringify({ action: 'delete_tasks', ids: ['tsk-1'] }), ws);
  assert.ok(delEdit);
  assert.equal(delEdit.confirmation, true);

  const multi = splitWorkspaceResponse(
    'Scheduled both blocks for you.\n```pip-edit\n{"action":"create_task","title":"Review notes"}\n```\n```pip-edit\n{"action":"create_event","title":"Study","date":"2026-11-23","startHour":15}\n```',
    true,
  );
  assert.equal(multi.text, 'Scheduled both blocks for you.');
  assert.equal(multi.commands.length, 2);
});

test('readGeneratedCards, readGeneratedQuestions, and normalizeMarkdownForDisplay handle edge cases cleanly', () => {
  const cards = readGeneratedCards([{ front: ' Q1 ', back: ' A1 ' }], 5);
  assert.equal(cards.length, 1);
  assert.equal(cards[0].front, 'Q1');

  const qs = readGeneratedQuestions(
    [
      {
        type: 'mcq',
        prompt: 'Pick the salt',
        options: ['Na₂CO₃', 'H₂O'],
        answer: 'na₂co₃',
        explanation: 'Sodium carbonate is a salt.',
      },
    ],
    'Chemistry',
  );
  assert.equal(qs[0].correctAnswer, 'Na₂CO₃');

  const md = normalizeMarkdownForDisplay('Use $\\text{Na}_2\\text{CO}_3$ in titration.');
  assert.ok(md.includes('Na'));
});
