import type { Subject, NoteItem, FlashcardDeck, PracticeQuiz } from '../types/studyflow';
import { mergeImportedChapters, type IncomingChapter } from '../utils/syllabusHierarchy';
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseWorkspaceEdit, splitWorkspaceResponse, type Workspace } from './workspaceEdit';
import { workspaceContext } from './workspaceContext';
import { computeWorkspaceDiagnostics, findOpenSlotsForDay } from './workspaceDiagnostics';
import { readGeneratedCards, readGeneratedQuestions } from '../notes/generatedStudyItems';
import { normalizeMarkdownForDisplay } from './markdownNormalize';

function createMockWorkspace(): Workspace {
  const subjects: Subject[] = [
    {
      id: 'chem210',
      code: 'CHEM 210',
      name: 'Organic Chemistry II',
      color: '#4F46E5',
      instructor: 'Dr. Patel',
      icon: 'flask',
      totalHours: 5,
      weeklyTargetHours: 8,
      lastStudied: '2026-11-23',
      nextExamDate: '2026-11-28',
      nextExamTitle: 'Midterm III',
      currentGrade: '',
      targetGrade: 'A',
      chapters: [
        {
          id: 'ch1',
          title: 'Carbonyl Chemistry',
          topics: [
            { id: 't1', title: 'Aldol Condensation', completed: true, difficulty: 'hard' as 'easy' | 'medium' | 'hard', confidence: 4, revisionStatus: 'mastered' as 'not_started' | 'in_review' | 'mastered' },
            { id: 't2', title: 'Wittig Reaction', completed: false, difficulty: 'hard' as 'easy' | 'medium' | 'hard', confidence: 2, revisionStatus: 'in_review' as 'not_started' | 'in_review' | 'mastered' },
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
  const notes: NoteItem[] = [
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
      pdfHighlights: [],
    },
  ];
  const decks: FlashcardDeck[] = [
    {
      id: 'deck-1',
      title: 'CHEM 210 Core',
      subjectId: 'chem210',
      description: 'Core organic mechanisms',
      lastReviewed: 'Yesterday',
      retentionRate: 88,
    },
  ];
  const flashcards: Array<{
    id: string;
    deckId: string;
    front: string;
    back: string;
    hint?: string;
    intervalDays: number;
    easeFactor: number;
    dueToday: boolean;
    mastery: 'new' | 'learning' | 'mastered';
  }> = [
    {
      id: 'fc-1',
      deckId: 'deck-1',
      front: 'What reagent converts aldehydes to alkenes?',
      back: 'Phosphonium ylide (Wittig reaction)',
      intervalDays: 1,
      easeFactor: 2.5,
      dueToday: true,
      mastery: 'learning',
    },
  ];
  const quizzes: PracticeQuiz[] = [
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
      const id = `ses-${sessions.length + 1}`;
      sessions.push({ ...s, id });
      return id;
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
    deleteDeck(id: string) {
      const idx = decks.findIndex((x) => x.id === id);
      if (idx >= 0) decks.splice(idx, 1);
      for (let i = flashcards.length - 1; i >= 0; i--) {
        if (flashcards[i].deckId === id) flashcards.splice(i, 1);
      }
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
    importFlashcardsBulk(deckId: string, cards: Array<{ front: string; back: string; hint?: string }>) {
      let count = 0;
      for (const c of cards) {
        if (!c.front.trim() || !c.back.trim()) continue;
        flashcards.push({
          id: `fc-${flashcards.length + 1}`,
          deckId,
          front: c.front.trim(),
          back: c.back.trim(),
          hint: c.hint?.trim(),
          intervalDays: 1,
          easeFactor: 2.5,
          dueToday: true,
          mastery: 'new',
        });
        count++;
      }
      return count;
    },
    appendChapters(subjectId: string, chapters: IncomingChapter[]) {
      const index = subjects.findIndex(s => s.id === subjectId);
      if (index >= 0) subjects[index] = mergeImportedChapters(subjects[index], chapters);
    },
    addChapter(subjectId: string, title: string) {
      const target = subjects.find((s) => s.id === subjectId);
      if (!target) return;
      target.chapters.push({
        id: `ch-${target.chapters.length + 1}`,
        title,
        topics: [],
      });
    },
    addTopic(subjectId: string, chapterId: string, title: string) {
      const target = subjects.find((s) => s.id === subjectId);
      const chapter = target?.chapters.find((c) => c.id === chapterId);
      if (!chapter) return;
      chapter.topics.push({
        id: `tp-${chapter.topics.length + 1}`,
        title,
        completed: false,
        difficulty: 'medium',
        confidence: 2,
        revisionStatus: 'not_started',
      });
    },
    addChapters(subjectId: string, chapters: Array<{ title: string; topics: string[] }>) {
      const target = subjects.find((s) => s.id === subjectId);
      if (!target) return;
      for (const ch of chapters) {
        target.chapters.push({
          id: `ch-${target.chapters.length + 1}`,
          title: ch.title,
          topics: ch.topics.map((t, idx) => ({
            id: `tp-${target.chapters.length + 1}-${idx + 1}`,
            title: t,
            completed: false,
            difficulty: 'medium',
            confidence: 2,
            revisionStatus: 'not_started',
          })),
        });
      }
    },
    studyLabLaunch: null as unknown,
    openStudyLab(launch?: Record<string, unknown>) {
      state.studyLabLaunch = launch ?? { tab: 'playground' };
      state.route = 'lab';
    },
    addQuiz(q: (typeof quizzes)[number]) {
      quizzes.push(q);
    },
    deleteQuiz(id: string) {
      const idx = quizzes.findIndex((x) => x.id === id);
      if (idx >= 0) quizzes.splice(idx, 1);
    },
    addGoal(g: Omit<(typeof goals)[number], 'id'>) {
      goals.push({ ...g, id: `g-${goals.length + 1}` });
    },
    updateGoal(id: string, patch: Partial<(typeof goals)[number]>) {
      const target = goals.find((x) => x.id === id);
      if (target) Object.assign(target, patch);
    },
    deleteGoal(id: string) {
      const idx = goals.findIndex((x) => x.id === id);
      if (idx >= 0) goals.splice(idx, 1);
    },
    deleteSubject(id: string) {
      const idx = subjects.findIndex((x) => x.id === id);
      if (idx >= 0) subjects.splice(idx, 1);
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
    createNote(subjectId: string, folderId: string, draft?: { title?: string; content?: string; syllabusLinks?: NoteItem['syllabusLinks'] }) {
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
        pdfHighlights: [],
        syllabusLinks: draft?.syllabusLinks,
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
  assert.deepEqual(diag.weakQuizTopics, [], 'aggregate scores alone do not identify weak topics');
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

test('parseWorkspaceEdit handles create_flashcards with auto-created new deck and mandatory approval gate', () => {
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
  assert.equal(edit.confirmation, true);
  assert.equal(edit.reviewKind, 'approval');
  assert.equal(edit.reviewItems?.length, 2);
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
  assert.equal(quizEdit.confirmation, true);
  assert.equal(quizEdit.reviewKind, 'approval');
  assert.equal(quizEdit.reviewItems?.length, 1);
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

test('delete_event and delete_events require confirmation, resolve by title/date/id, and remove calendar events on apply', () => {
  const ws = createMockWorkspace();
  ws.addSession({
    title: 'Afternoon Physics Review',
    subjectId: '',
    date: '2026-11-23',
    dayIndex: 0,
    startHour: 15,
    durationHours: 1.5,
    status: 'upcoming',
    blockType: 'study',
    recurring: true,
  });

  // Single event deletion by title + date (even on recurring event without explicit scope)
  const delSingle = parseWorkspaceEdit(
    JSON.stringify({ action: 'delete_event', title: 'Afternoon Physics Review', date: '2026-11-23' }),
    ws,
  );
  assert.ok(delSingle);
  assert.equal(delSingle.confirmation, true);
  assert.equal(delSingle.destructive, true);
  assert.match(delSingle.title, /this occurrence only/);
  assert.equal(ws.sessions.length, 2); // Not deleted until confirmed!
  assert.equal(delSingle.apply(ws), true);
  assert.equal(ws.sessions.length, 1);

  // Add another session on the same day and test bulk delete_events by date
  ws.addSession({
    title: 'Evening Lab Prep',
    subjectId: 'chem210',
    date: '2026-11-23',
    dayIndex: 0,
    startHour: 18,
    durationHours: 1,
    status: 'upcoming',
    blockType: 'study',
  });
  // Empty filter must be rejected so entire calendar cannot be wiped accidentally
  assert.equal(parseWorkspaceEdit(JSON.stringify({ action: 'delete_events' }), ws), undefined);

  const delDay = parseWorkspaceEdit(JSON.stringify({ action: 'delete_events', date: '2026-11-23' }), ws);
  assert.ok(delDay);
  assert.equal(delDay.confirmation, true);
  assert.equal(delDay.destructive, true);
  assert.equal(delDay.details?.length, 2);
  assert.equal(delDay.apply(ws), true);
  assert.equal(ws.sessions.length, 0);
});

test('negative & destructive actions across tasks, notes, exams, goals, milestones, decks, quizzes, and subjects require confirmation and execute cleanly', () => {
  const ws = createMockWorkspace();

  // Clear completed tasks via completedOnly
  ws.addTask({
    title: 'Already finished reading',
    subjectId: 'chem210',
    dueDate: '2026-11-20',
    dueLabel: '2026-11-20',
    priority: 'low',
    status: 'done',
    estimatedMinutes: 20,
    description: '',
    subtasks: [],
  });
  // Reopening a completed task should also require confirmation
  const reopenEdit = parseWorkspaceEdit(
    JSON.stringify({ action: 'update_task', id: ws.tasks[ws.tasks.length - 1].id, status: 'todo' }),
    ws,
  );
  assert.ok(reopenEdit);
  assert.equal(reopenEdit.confirmation, true);
  assert.equal(reopenEdit.destructive, true);

  const clearDone = parseWorkspaceEdit(JSON.stringify({ action: 'delete_tasks', completedOnly: true }), ws);
  assert.ok(clearDone);
  assert.equal(clearDone.confirmation, true);
  assert.equal(clearDone.destructive, true);
  assert.equal(clearDone.apply(ws), true);
  assert.equal(ws.tasks.some((t) => t.status === 'done'), false);

  // Delete task by title
  const delTaskByTitle = parseWorkspaceEdit(
    JSON.stringify({ action: 'delete_tasks', titles: ['Complete Carbonyl Mechanism Worksheet'] }),
    ws,
  );
  assert.ok(delTaskByTitle);
  assert.equal(delTaskByTitle.confirmation, true);
  assert.equal(delTaskByTitle.destructive, true);
  assert.equal(delTaskByTitle.apply(ws), true);
  assert.equal(ws.tasks.some((t) => t.title === 'Complete Carbonyl Mechanism Worksheet'), false);

  // Delete goal milestone then delete goal
  ws.updateGoal('g-1', {
    milestones: [{ id: 'ms-1', label: 'Finish chapter 8', date: '2026-11-26', done: false }],
  });
  const delMs = parseWorkspaceEdit(
    JSON.stringify({ action: 'delete_goal_milestone', goalId: 'Master Carbonyl', title: 'Finish chapter 8' }),
    ws,
  );
  assert.ok(delMs);
  assert.equal(delMs.confirmation, true);
  assert.equal(delMs.destructive, true);
  assert.equal(delMs.apply(ws), true);
  assert.equal(ws.goals[0].milestones.length, 0);

  const delGoal = parseWorkspaceEdit(JSON.stringify({ action: 'delete_goal', title: 'Master Carbonyl' }), ws);
  assert.ok(delGoal);
  assert.equal(delGoal.confirmation, true);
  assert.equal(delGoal.destructive, true);
  assert.equal(delGoal.apply(ws), true);
  assert.equal(ws.goals.length, 0);

  // Delete deck (and its cards), practice test, exam, note, and subject by title/code
  const delDeck = parseWorkspaceEdit(JSON.stringify({ action: 'delete_deck', title: 'CHEM 210 Core' }), ws);
  assert.ok(delDeck);
  assert.equal(delDeck.confirmation, true);
  assert.equal(delDeck.destructive, true);
  assert.equal(delDeck.apply(ws), true);
  assert.equal(ws.decks.length, 0);
  assert.equal(ws.flashcards.length, 0);

  const delQuiz = parseWorkspaceEdit(
    JSON.stringify({ action: 'delete_practice_test', title: 'Carbonyl Diagnostic' }),
    ws,
  );
  assert.ok(delQuiz);
  assert.equal(delQuiz.confirmation, true);
  assert.equal(delQuiz.destructive, true);
  assert.equal(delQuiz.apply(ws), true);
  assert.equal(ws.quizzes.length, 0);

  const delExam = parseWorkspaceEdit(JSON.stringify({ action: 'delete_exam', title: 'CHEM 210 Midterm III' }), ws);
  assert.ok(delExam);
  assert.equal(delExam.confirmation, true);
  assert.equal(delExam.destructive, true);
  assert.equal(delExam.apply(ws), true);
  assert.equal(ws.exams.length, 0);

  // Overwriting a substantial note with tiny content requires confirmation
  const shrinkNote = parseWorkspaceEdit(
    JSON.stringify({ action: 'update_note', id: 'note-1', content: 'short' }),
    ws,
  );
  assert.ok(shrinkNote);
  assert.equal(shrinkNote.confirmation, true);
  assert.equal(shrinkNote.destructive, true);

  const existingContent = ws.notes.find(n => n.id === 'note-1')!.content;
  const equalLengthOverwrite = parseWorkspaceEdit(JSON.stringify({ action: 'update_note', id: 'note-1', content: 'x'.repeat(existingContent.length) }), ws);
  assert.equal(equalLengthOverwrite?.confirmation, true);
  assert.equal(equalLengthOverwrite?.destructive, true);
  const unchanged = parseWorkspaceEdit(JSON.stringify({ action: 'update_note', id: 'note-1', content: existingContent }), ws);
  assert.notEqual(unchanged?.destructive, true);

  const delNote = parseWorkspaceEdit(JSON.stringify({ action: 'delete_note', title: 'Primary Standards' }), ws);
  assert.ok(delNote);
  assert.equal(delNote.confirmation, true);
  assert.equal(delNote.destructive, true);
  assert.equal(delNote.apply(ws), true);
  assert.equal(ws.notes.length, 0);

  const delSubject = parseWorkspaceEdit(JSON.stringify({ action: 'delete_subject', title: 'CHEM 210' }), ws);
  assert.ok(delSubject);
  assert.equal(delSubject.confirmation, true);
  assert.equal(delSubject.destructive, true);
  assert.equal(delSubject.apply(ws), true);
  assert.equal(ws.subjects.length, 0);
});

test('workspaceContext includes relevant item catalogs for destructive prompts', () => {
  const ws = createMockWorkspace();
  const clock = { date: '2026-11-23', time: '08:30', label: '2026-11-23 08:30 (UTC, GMT)' };
  const ctx = workspaceContext(ws, 'dashboard', 'Delete Organic Chemistry Lecture', clock);
  assert.match(ctx.text, /Calendar:/);
  assert.match(ctx.text, /Organic Chemistry Lecture/);
  assert.match(ctx.text, /Notes Catalog:/);
  assert.match(ctx.text, /Goals:/);
});

test('mass additions (create_events, create_tasks, schedule_micro_reviews, import_syllabus_bundle, create_goal with 2+ milestones) require review approval and support partial applySelected', () => {
  const ws = createMockWorkspace();

  // create_events with 2 blocks -> partial selection adds only 1
  const bulkEvents = parseWorkspaceEdit(
    JSON.stringify({
      action: 'create_events',
      events: [
        { title: 'Algorithm Proof Session', date: '2026-11-24', startTime: '10:00', durationHours: 1.5, subjectId: 'CHEM 210' },
        { title: 'Organic Synthesis Drill', date: '2026-11-25', startTime: '14:00', durationHours: 1, subjectId: 'CHEM 210' },
      ],
    }),
    ws,
  );
  assert.ok(bulkEvents);
  assert.equal(bulkEvents.confirmation, true);
  assert.equal(bulkEvents.reviewKind, 'approval');
  assert.equal(bulkEvents.reviewItems?.length, 2);
  assert.ok(bulkEvents.applySelected);
  assert.equal(bulkEvents.applySelected(ws, [bulkEvents.reviewItems![0].id]), true);
  assert.equal(ws.sessions.length, 2);
  assert.equal(ws.sessions[1].title, 'Algorithm Proof Session');

  // create_tasks with 3 tasks -> partial selection adds only 2
  const bulkTasks = parseWorkspaceEdit(
    JSON.stringify({
      action: 'create_tasks',
      tasks: [
        { title: 'Read Chapter 9', subjectId: 'CHEM 210', priority: 'high' },
        { title: 'Practice NMR Spectra', subjectId: 'CHEM 210', priority: 'medium' },
        { title: 'Optional Bonus Sheet', subjectId: 'CHEM 210', priority: 'low' },
      ],
    }),
    ws,
  );
  assert.ok(bulkTasks);
  assert.equal(bulkTasks.confirmation, true);
  assert.equal(bulkTasks.reviewKind, 'approval');
  assert.equal(bulkTasks.reviewItems?.length, 3);
  assert.ok(bulkTasks.applySelected);
  const pickTwo = [bulkTasks.reviewItems![0].id, bulkTasks.reviewItems![1].id];
  assert.equal(bulkTasks.applySelected(ws, pickTwo), true);
  assert.equal(ws.tasks.length, 3);

  // schedule_micro_reviews -> approval gate + adds sessions when approved
  const micro = parseWorkspaceEdit(
    JSON.stringify({
      action: 'schedule_micro_reviews',
      maxBlocks: 2,
    }),
    ws,
  );
  assert.ok(micro);
  assert.equal(micro.confirmation, true);
  assert.equal(micro.reviewKind, 'approval');
  assert.ok((micro.reviewItems?.length ?? 0) >= 1);
  const sessionsBeforeMicro = ws.sessions.length;
  assert.equal(micro.apply(ws), true);
  assert.equal(ws.sessions.length, sessionsBeforeMicro + micro.reviewItems!.length);

  // import_syllabus_bundle -> approval gate + selective import
  const syl = parseWorkspaceEdit(
    JSON.stringify({
      action: 'import_syllabus_bundle',
      subjectId: 'CHEM 210',
      exams: [{ title: 'CHEM 210 Final Exam', date: '2026-12-12', weightPercent: 40 }],
      tasks: [{ title: 'Lab Report 4', dueDate: '2026-12-01', priority: 'high' }],
      chapters: [{ title: 'Aromatic Substitution', topics: ['EAS Mechanism', 'Directing Groups'] }],
      goals: [{ title: 'Complete Fall Syllabus', target: 4, unit: 'modules', milestones: ['Finish EAS', 'Review Finals'] }],
    }),
    ws,
  );
  assert.ok(syl);
  assert.equal(syl.confirmation, true);
  assert.equal(syl.reviewKind, 'approval');
  assert.equal(syl.reviewItems?.length, 4);
  assert.equal(syl.apply(ws), true);
  assert.equal(ws.exams.some((e) => e.title === 'CHEM 210 Final Exam'), true);
  assert.equal(ws.tasks.some((t) => t.title === 'Lab Report 4'), true);
  assert.equal(ws.subjects[0].chapters.some((c) => c.title === 'Aromatic Substitution'), true);
  assert.equal(ws.goals.some((g) => g.title === 'Complete Fall Syllabus'), true);

  // create_goal with 2+ milestones requires approval
  const multiMsGoal = parseWorkspaceEdit(
    JSON.stringify({
      action: 'create_goal',
      title: 'Ace Algorithms Final',
      milestones: ['Dynamic Programming', 'NP-Completeness'],
    }),
    ws,
  );
  assert.ok(multiMsGoal);
  assert.equal(multiMsGoal.confirmation, true);
  assert.equal(multiMsGoal.reviewKind, 'approval');
});

test('disabled lab routes are rejected and note diagrams remain available', () => {
  const ws = createMockWorkspace();

  const openLab = parseWorkspaceEdit(
    JSON.stringify({
      action: 'open_study_lab',
      tab: 'playground',
      language: 'python',
      code: 'print(2 + 2)',
      title: 'Quick Check',
    }),
    ws,
  );
  assert.equal(openLab, undefined);
  assert.equal(parseWorkspaceEdit(JSON.stringify({ action: 'navigate_to_view', route: 'lab' }), ws), undefined);

  const insertDiagram = parseWorkspaceEdit(
    JSON.stringify({
      action: 'insert_note_diagram',
      noteId: 'note-1',
      title: 'Titration Curve',
      svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 180"><script>alert(1)</script><rect width="320" height="180" fill="#fff"/></svg>',
    }),
    ws,
  );
  assert.ok(insertDiagram);
  assert.equal(insertDiagram.apply(ws), true);
  assert.match(ws.notes[0].content, /```svg/);
  assert.doesNotMatch(ws.notes[0].content, /<script/i);
});

test('create_goal links actual tasks, rejects unknown IDs, and preserves completed state', () => {
  const ws = createMockWorkspace();
  ws.tasks[0].status = 'done';
  const args = { action: 'create_goal', title: 'Linked lessons', subjectId: 'chem210', category: 'subject', target: 1, unit: 'lessons', taskIds: ['tsk-1'] };
  const edit = parseWorkspaceEdit(JSON.stringify(args), ws);
  assert.ok(edit);
  assert.equal(edit.confirmation, true);
  assert.equal(edit.apply(ws), true);
  const goal = ws.goals.find(g => g.title === args.title);
  assert.ok(goal);
  assert.equal(goal.milestones[0].taskId, 'tsk-1');
  assert.equal(goal.current, 1);
  assert.equal(goal.milestones[0].done, true);
  assert.equal(parseWorkspaceEdit(JSON.stringify({ ...args, taskIds: ['missing-id'] }), ws), undefined);
  assert.equal(ws.tasks.length, 1);
});
test('link existing tasks is idempotent and unlink preserves task', () => {
  const ws = createMockWorkspace();
  const args = { action: 'bulk_link_tasks_to_goal', goalId: 'g-1', taskIds: ['tsk-1', 'tsk-1'] };
  const edit = parseWorkspaceEdit(JSON.stringify(args), ws);
  assert.ok(edit);
  assert.equal(edit.apply(ws), true);
  assert.equal(edit.apply(ws), true);
  assert.equal(ws.goals[0].milestones.length, 1);
  assert.equal(ws.goals[0].milestones[0].taskId, 'tsk-1');
  const unlink = parseWorkspaceEdit(JSON.stringify({ action: 'unlink_task_from_goal', goalId: 'g-1', taskId: 'tsk-1' }), ws);
  assert.ok(unlink);
  assert.equal(unlink.apply(ws), true);
  assert.equal(ws.goals[0].milestones.length, 0);
  assert.equal(ws.tasks.length, 1);
});


test('Pip note links accept real syllabus IDs and reject invalid references', () => {
  const ws = createMockWorkspace();
  const action = parseWorkspaceEdit(JSON.stringify({action:'create_note',title:'Linked note',content:'Theory',subjectId:'chem210',syllabusLinks:{chapterIds:['ch1','ch1']}}),ws);
  assert.ok(action?.confirmation);
  assert.equal(action.apply(ws),true);
  assert.deepEqual(ws.notes.find(note=>note.title==='Linked note')?.syllabusLinks?.chapterIds,['ch1']);
  assert.equal(parseWorkspaceEdit(JSON.stringify({action:'create_note',title:'Bad note',content:'Theory',subjectId:'chem210',syllabusLinks:{chapterIds:['missing']}}),ws),undefined);
});

test('note Markdown preserves fenced and raw SVG while normalizing surrounding math and Sinhala', () => {
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><title>Bond diagram</title><circle cx="50" cy="50" r="10"/></svg>';
  const md = normalizeMarkdownForDisplay(`## බන්ධන\n\n${svg}\n\n$C=\\frac{n}{V}$`);
  assert.ok(md.includes('```svg\n'+svg+'\n```'));
  assert.ok(md.includes('බන්ධන'));
  assert.ok(md.includes('$C=\\frac{n}{V}$'));
  assert.ok(normalizeMarkdownForDisplay('```svg\n'+svg+'\n```').includes(svg));
});


test('Pip resource generation inherits source links, rejects unknown chapters and never overwrites by title', () => {
  const ws=createMockWorkspace();
  ws.notes[0].syllabusLinks={chapterIds:['ch1']};
  const create=()=>parseWorkspaceEdit(JSON.stringify({action:'create_flashcards',noteId:'note-1',deckTitle:'Same title',cards:[{front:'Q?',back:'A'}]}),ws);
  const first=create();assert.ok(first);assert.ok(first.title.includes('1.1.1'));assert.equal(first.apply(ws),true);
  assert.deepEqual(ws.decks.at(-1)?.syllabusLinks?.chapterIds,['ch1']);
  const second=create();assert.ok(second);assert.ok(second.title.includes('1.1.2'));assert.equal(second.apply(ws),true);
  assert.notEqual(ws.decks.at(-1)?.id,ws.decks.at(-2)?.id);
  assert.equal(parseWorkspaceEdit(JSON.stringify({action:'create_flashcards',noteId:'note-1',syllabusLinks:{chapterIds:['missing']},cards:[{front:'Q?',back:'A'}]}),ws),undefined);
  const testEdit=parseWorkspaceEdit(JSON.stringify({action:'create_practice_test',noteId:'note-1',title:'Check',questions:[{type:'short',prompt:'Explain',answer:'Answer',explanation:'Explanation'}]}),ws);
  assert.ok(testEdit);assert.ok(testEdit.title.includes('1.1.1'));assert.equal(testEdit.apply(ws),true);
  assert.deepEqual(ws.quizzes.at(-1)?.syllabusLinks?.chapterIds,['ch1']);
});

test('a locally resolved unit accepts a single direct note and supplies its exact ID', async () => {
  const {noteDestination} = await import('./noteDestination');
  const ws = createMockWorkspace();
  ws.subjects[0].units = [{id:'redox',title:'Redox'}];
  const prompt = 'Save a Sinhala note from this PDF in Organic Chemistry II Unit 1';
  assert.deepEqual(noteDestination(prompt, ws.subjects), {subjectId:'chem210',unitId:'redox'});
  assert.ok(noteDestination(prompt.replace('Unit 1','Unit 99'), ws.subjects).question);
  const calendar = structuredClone(ws.sessions);
  const count = ws.notes.length;
  const action = parseWorkspaceEdit(JSON.stringify({action:'create_note',title:'ඔක්සිකරණය',content:'ඉලෙක්ට්‍රෝන ඉවත් වීම',subjectId:'chem210',syllabusLinks:{unitIds:['redox']}}), ws, true);
  assert.ok(action && !action.confirmation);
  assert.ok(action.apply(ws));
  assert.equal(ws.notes.length, count + 1);
  assert.deepEqual(ws.notes.find(note => note.id === action.itemId?.())?.syllabusLinks?.unitIds, ['redox']);
  assert.deepEqual(ws.sessions, calendar);
});
