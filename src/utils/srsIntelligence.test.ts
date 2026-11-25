import test from 'node:test';
import assert from 'node:assert/strict';
import {
  analyzeSrsRetention,
  buildForgettingCurveSeries,
  classifyRetentionRisk,
  computeCardStabilityDays,
  exportDeckToAnkiTsv,
  parseAnkiTsvCsv,
  planMicroReviewSessions,
  recallPercentAtElapsed,
} from './srsIntelligence';
import type { ExamItem, FlashcardDeck, FlashcardItem, StudySession, Subject } from '../types/studyflow';

test('computeCardStabilityDays and recallPercentAtElapsed reflect mastery, lapses, and elapsed decay', () => {
  const matureCard: FlashcardItem = {
    id: 'c1',
    deckId: 'd1',
    front: 'Merge sort runtime?',
    back: 'O(n log n)',
    intervalDays: 10,
    easeFactor: 2.6,
    dueToday: false,
    mastery: 'mature',
    lapses: 0,
  };
  const fragileCard: FlashcardItem = {
    id: 'c2',
    deckId: 'd1',
    front: 'Wittig intermediate?',
    back: 'Oxaphosphetane',
    intervalDays: 1,
    easeFactor: 1.6,
    dueToday: true,
    mastery: 'new',
    lapses: 3,
  };

  const sMature = computeCardStabilityDays(matureCard);
  const sFragile = computeCardStabilityDays(fragileCard);
  assert.ok(sMature > sFragile * 5);

  const rDay0 = recallPercentAtElapsed(sFragile, 0);
  const rDay5 = recallPercentAtElapsed(sFragile, 5);
  assert.equal(rDay0, 100);
  assert.ok(rDay5 < 65);
  assert.equal(classifyRetentionRisk(rDay5), 'at_risk');
  assert.equal(classifyRetentionRisk(75), 'watch');
  assert.equal(classifyRetentionRisk(90), 'safe');
});

test('analyzeSrsRetention, buildForgettingCurveSeries, and planMicroReviewSessions predict exam risk and find open slots', () => {
  const subjects: Subject[] = [
    {
      id: 'cs340',
      code: 'CS 340',
      name: 'Algorithms',
      color: '#4F46E5',
      instructor: 'Prof. Lin',
      icon: 'code',
      totalHours: 24,
      weeklyTargetHours: 8,
      lastStudied: 'Today',
      nextExamDate: '2026-11-30',
      nextExamTitle: 'CS 340 Final',
      currentGrade: 'A-',
      targetGrade: 'A',
      chapters: [],
    },
  ];
  const decks: FlashcardDeck[] = [
    {
      id: 'd-algo',
      title: 'NP-Completeness & Graph Theory',
      subjectId: 'cs340',
      description: 'Reductions and shortest paths',
      lastReviewed: '3 days ago',
      retentionRate: 72,
    },
  ];
  const flashcards: FlashcardItem[] = [
    {
      id: 'f1',
      deckId: 'd-algo',
      front: '3-SAT to CLIQUE reduction?',
      back: 'Connect literals from distinct clauses that are not negations.',
      intervalDays: 1,
      easeFactor: 2.0,
      dueToday: true,
      mastery: 'learning',
      lastReviewedAt: '2026-11-20',
      lapses: 2,
    },
    {
      id: 'f2',
      deckId: 'd-algo',
      front: 'Dijkstra invariant?',
      back: 'Once extracted from min-heap, shortest distance is final for non-negative weights.',
      intervalDays: 6,
      easeFactor: 2.5,
      dueToday: false,
      mastery: 'mature',
      lastReviewedAt: '2026-11-22',
      lapses: 0,
    },
  ];
  const exams: ExamItem[] = [
    {
      id: 'ex-algo',
      title: 'CS 340 Final',
      subjectId: 'cs340',
      date: '2026-11-30',
      time: '09:00',
      room: 'Gates 104',
      weightPercent: 35,
      targetGrade: 'A',
      prepProgress: 60,
      syllabusTopics: ['NP-Completeness', 'Dijkstra'],
      mockHistory: [],
    },
  ];
  const sessions: StudySession[] = [
    {
      id: 's1',
      title: 'Morning Lecture',
      subjectId: 'cs340',
      date: '2026-11-24',
      dayIndex: 1,
      startHour: 9,
      durationHours: 2,
      status: 'upcoming',
      blockType: 'study',
    },
  ];

  const analysis = analyzeSrsRetention(decks, flashcards, exams, subjects, '2026-11-24');
  assert.equal(analysis.decks.length, 1);
  assert.equal(analysis.decks[0].nextExamTitle, 'CS 340 Final');
  assert.equal(analysis.decks[0].daysUntilExam, 6);
  assert.ok(analysis.atRiskTotal >= 1);

  const curve = buildForgettingCurveSeries(flashcards, exams, '2026-11-24', 10);
  assert.equal(curve.length, 11);
  assert.equal(curve[0].dayLabel, 'Today');
  assert.ok(curve[0].avgRetention >= curve[10].avgRetention);
  assert.deepEqual(curve[6].examTitles, ['CS 340 Final']);

  const proposals = planMicroReviewSessions(analysis.decks, sessions, '2026-11-24', 9, 3);
  assert.equal(proposals.length, 1);
  assert.equal(proposals[0].date, '2026-11-24');
  // Must avoid 9..11 busy slot and schedule at 11:00 or later
  assert.ok(proposals[0].startHour >= 11);
});

test('parseAnkiTsvCsv and exportDeckToAnkiTsv round-trip cleanly with TSV and quoted CSV', () => {
  const tsvInput = '#separator:tab\nFront\tBack\tHint\nBig-O of Heap Sort\tO(n log n)\tIn-place\nSN2 stereochemistry\tWalden inversion\tBackside attack\n';
  const parsedTsv = parseAnkiTsvCsv(tsvInput);
  assert.equal(parsedTsv.length, 2);
  assert.equal(parsedTsv[0].front, 'Big-O of Heap Sort');
  assert.equal(parsedTsv[0].hint, 'In-place');

  const csvInput = '"Front","Back"\n"What is a gradient?","Vector of partial derivatives, pointing steepest ascent"';
  const parsedCsv = parseAnkiTsvCsv(csvInput);
  assert.equal(parsedCsv.length, 1);
  assert.equal(parsedCsv[0].back, 'Vector of partial derivatives, pointing steepest ascent');

  const exported = exportDeckToAnkiTsv([
    {
      id: 'x1',
      deckId: 'd1',
      front: 'Eigenvalue equation',
      back: 'A v = lambda v',
      hint: 'Linear algebra',
      intervalDays: 1,
      easeFactor: 2.5,
      dueToday: true,
      mastery: 'new',
    },
  ]);
  assert.match(exported, /^#separator:tab/);
  assert.match(exported, /Eigenvalue equation\tA v = lambda v\tLinear algebra/);
});
