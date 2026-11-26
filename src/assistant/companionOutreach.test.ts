import test from 'node:test';
import assert from 'node:assert/strict';
import { chooseCheckIn } from './checkIns';
import { createEmptyOutreachLedger, type CompanionFollowUp, type CompanionMessage } from './companion';
import {
  buildOutreachSystemInstructions,
  evaluateCompanionOutreach,
  findDueFollowUp,
  isInProtectedHomeworkTime,
  isInQuietHours,
  parseProtectedHomeworkWindows,
  type EvaluateOutreachInput,
} from './companionOutreach';
import { requestClock } from './workspaceContext';

function baseInput(overrides: Partial<EvaluateOutreachInput> = {}): EvaluateOutreachInput {
  return {
    settings: { enabled: true, quietFrom: '21:30', quietUntil: '07:00' },
    date: '2026-11-26',
    time: '15:00',
    now: Date.parse('2026-11-26T15:00:00Z'),
    running: false,
    notifications: [],
    ledger: createEmptyOutreachLedger(),
    companionMessages: [],
    subjects: [
      {
        id: 'chem',
        code: 'CHEM',
        name: 'Chemistry',
        instructor: '',
        color: '#10B981',
        icon: 'flask',
        totalHours: 12,
        weeklyTargetHours: 6,
        lastStudied: 'Today',
        nextExamDate: '2026-12-10',
        nextExamTitle: 'Chemistry Final',
        currentGrade: 'A',
        targetGrade: 'A',
        chapters: [],
      },
    ],
    sessions: [],
    focusHistory: [],
    goals: [],
    newMilestones: new Set(),
    tasks: [],
    notes: [],
    ...overrides,
  };
}

test('opt-in is required before any unsolicited outreach fires', () => {
  const res = evaluateCompanionOutreach(baseInput({ settings: { enabled: false } }));
  assert.equal(res.candidate, undefined);
  assert.equal(res.suppressedBy, 'disabled');
});

test('quiet hours suppress outreach including across midnight wrap', () => {
  assert.equal(isInQuietHours('22:15', '21:30', '07:00'), true);
  assert.equal(isInQuietHours('06:45', '21:30', '07:00'), true);
  assert.equal(isInQuietHours('07:00', '21:30', '07:00'), false);
  assert.equal(isInQuietHours('15:00', '21:30', '07:00'), false);

  const quietRes = evaluateCompanionOutreach(baseInput({ time: '22:00' }));
  assert.equal(quietRes.candidate, undefined);
  assert.equal(quietRes.suppressedBy, 'quiet_hours');
});

test('snooze and active focus sessions suppress outreach', () => {
  const now = Date.parse('2026-11-26T15:00:00Z');
  const snoozed = evaluateCompanionOutreach(
    baseInput({
      now,
      settings: { enabled: true, snoozeUntil: now + 3_600_000 },
    }),
  );
  assert.equal(snoozed.suppressedBy, 'snoozed');

  const focused = evaluateCompanionOutreach(baseInput({ running: true }));
  assert.equal(focused.suppressedBy, 'focus_running');
});

test('protected homework time parsed from Pip memory suppresses outreach', () => {
  const windows = parseProtectedHomeworkWindows('Keep 4–5 pm free for homework');
  assert.deepEqual(windows, [{ startMin: 16 * 60, endMin: 17 * 60 }]);
  assert.equal(isInProtectedHomeworkTime('16:30', 'Keep 4–5 pm free for homework'), true);
  assert.equal(isInProtectedHomeworkTime('17:05', 'Keep 4–5 pm free for homework'), false);
  assert.equal(isInProtectedHomeworkTime('16:45', 'Homework 16:30 - 17:30'), true);

  const suppressed = evaluateCompanionOutreach(
    baseInput({
      time: '16:20',
      pipMemory: { homework: 'Keep 4–5 pm free for homework' },
    }),
  );
  assert.equal(suppressed.candidate, undefined);
  assert.equal(suppressed.suppressedBy, 'protected_homework');
});

test('daily limit of 1 unsolicited check-in is shared between legacy pip/ check-ins and Companion outreach', () => {
  // Existing pip/ notification blocks Companion outreach for the same day
  const blockedByLegacy = evaluateCompanionOutreach(
    baseInput({
      notifications: [{ id: 'pip/2026-11-26/task/t1' }],
    }),
  );
  assert.equal(blockedByLegacy.suppressedBy, 'daily_limit');

  // Existing companion/ notification blocks legacy chooseCheckIn for the same day
  const legacyBlockedByCompanion = chooseCheckIn({
    settings: { enabled: true },
    date: '2026-11-26',
    time: '19:00',
    now: Date.parse('2026-11-26T19:00:00Z'),
    running: false,
    notifications: [{ id: 'companion/2026-11-26/casual/topic/redox' }],
    sessions: [],
    focusHistory: [],
    goals: [],
    newMilestones: new Set(),
    tasks: [
      {
        id: 't1',
        title: 'Finish redox worksheet',
        subjectId: 'chem',
        dueDate: '2026-11-26',
        dueLabel: 'Today',
        priority: 'high',
        status: 'todo',
        estimatedMinutes: 30,
        description: '',
        subtasks: [],
      },
    ],
  });
  assert.equal(legacyBlockedByCompanion, undefined);
});

test('ignored unsolicited message rests and is never repeated or nagged', () => {
  const res = evaluateCompanionOutreach(
    baseInput({
      date: '2026-11-27',
      now: Date.parse('2026-11-27T15:00:00Z'),
      ledger: {
        lastUnsolicitedDate: '2026-11-26',
        lastUnsolicitedBatchId: 'companion/2026-11-26/casual/topic/redox',
        lastUnsolicitedAt: Date.parse('2026-11-26T15:00:00Z'),
        lastUnsolicitedAnswered: false,
        deliveredKeys: ['casual/topic/redox'],
        deliveredBatchIds: ['companion/2026-11-26/casual/topic/redox'],
      },
    }),
  );
  assert.equal(res.candidate, undefined);
  assert.equal(res.suppressedBy, 'ignored_rest');
});

test('casual outreach follows up on recent redox conversation and works without any study milestone or task', () => {
  const prior: CompanionMessage[] = [
    {
      id: 'seed-u1',
      role: 'user',
      text: 'Still getting tripped up on redox oxidation numbers today',
      createdAt: Date.parse('2026-11-26T10:00:00Z'),
      timeLabel: '10:00',
      date: '2026-11-26',
      kind: 'chat',
      read: true,
      state: 'complete',
    },
    {
      id: 'seed-a1',
      role: 'assistant',
      text: 'Those rules are sneaky at first—take a breather and hit them fresh later.',
      createdAt: Date.parse('2026-11-26T10:01:00Z'),
      timeLabel: '10:01',
      date: '2026-11-26',
      kind: 'chat',
      read: true,
      state: 'complete',
    },
  ];

  const res = evaluateCompanionOutreach(
    baseInput({
      time: '15:00',
      now: Date.parse('2026-11-26T15:00:00Z'),
      companionMessages: prior,
    }),
  );
  assert.ok(res.candidate);
  assert.equal(res.candidate.category, 'casual');
  assert.equal(res.candidate.kind, 'outreach_casual');
  assert.match(res.candidate.batchId, /^companion\/2026-11-26\/casual\/topic\//);
  assert.match(res.candidate.draftPrompt, /redox/i);

  // Even with ZERO messages, tasks, sessions, or milestones, a casual hello is eligible
  const helloRes = evaluateCompanionOutreach(baseInput());
  assert.ok(helloRes.candidate);
  assert.equal(helloRes.candidate.triggerKey, 'casual/hello/2026-11-26');
  assert.equal(helloRes.candidate.batchId, 'companion/2026-11-26/casual/hello/2026-11-26');
});

test('post-session check-in skips stale sessions after restart and uses verified facts without claiming "didn\'t study"', () => {
  // Fresh session ended 30 minutes ago (14:30 -> now 15:00)
  const fresh = evaluateCompanionOutreach(
    baseInput({
      time: '15:00',
      sessions: [
        {
          id: 'sess-1',
          title: 'Chemistry Redox Review',
          subjectId: 'chem',
          dayIndex: 3,
          date: '2026-11-26',
          startHour: 13.5,
          durationHours: 1,
          status: 'upcoming',
        },
      ],
    }),
  );
  assert.ok(fresh.candidate);
  assert.equal(fresh.candidate.category, 'studyMilestones');
  assert.equal(fresh.candidate.verifiedFacts.focusLogRecorded, false);
  assert.match(fresh.candidate.draftPrompt, /NEVER say or imply the student didn't study/i);

  // Stale session ended 4 hours ago (11:00 -> now 15:00): must NOT trigger a study session check-in
  const stale = evaluateCompanionOutreach(
    baseInput({
      time: '15:00',
      settings: { enabled: true, casual: false, suggestions: false, studyMilestones: true },
      sessions: [
        {
          id: 'sess-old',
          title: 'Morning Organic Chem',
          subjectId: 'chem',
          dayIndex: 3,
          date: '2026-11-26',
          startHour: 9,
          durationHours: 2,
          status: 'upcoming',
        },
      ],
    }),
  );
  assert.equal(stale.candidate, undefined);
  assert.equal(stale.suppressedBy, 'no_candidate');
});

test('timely pre-session suggestion creates a structured one-step suggestion when room exists before a session', () => {
  const res = evaluateCompanionOutreach(
    baseInput({
      time: '17:45',
      now: Date.parse('2026-11-26T17:45:00Z'),
      sessions: [
        {
          id: 'sess-chem-eve',
          title: 'Chemistry Redox Drill',
          subjectId: 'chem',
          dayIndex: 3,
          date: '2026-11-26',
          startHour: 18,
          durationHours: 1,
          status: 'upcoming',
        },
      ],
      notes: [
        {
          id: 'note-redox',
          folderId: 'f1',
          subjectId: 'chem',
          title: 'Redox Oxidation Rules',
          updatedAt: '2026-11-26',
          pinned: false,
          content: 'Oxidation is loss of electrons.',
          tags: [],
          linkedResources: [],
          attachments: [],
          pdfHighlights: [],
        },
      ],
    }),
  );
  assert.ok(res.candidate);
  assert.equal(res.candidate.category, 'suggestions');
  assert.equal(res.candidate.kind, 'outreach_suggestion');
  assert.ok(res.candidate.suggestion);
  assert.equal(res.candidate.suggestion.kind, 'focus');
  assert.equal(res.candidate.suggestion.minutes, 15);
  assert.equal(res.candidate.suggestion.noteId, 'note-redox');
});

test('category opt-outs suppress disabled outreach types independently', () => {
  const res = evaluateCompanionOutreach(
    baseInput({
      settings: { enabled: true, casual: false, studyMilestones: false, suggestions: false },
    }),
  );
  assert.equal(res.candidate, undefined);
  assert.equal(res.suppressedBy, 'no_candidate');
});

test('findDueFollowUp delivers due follow-ups, respects quiet hours, and skips stale follow-ups after restart', () => {
  const now = Date.parse('2026-11-26T20:00:00Z');
  const followUps: CompanionFollowUp[] = [
    {
      id: 'fu-stale',
      topic: 'morning physics sheet',
      dueAt: now - 5 * 3_600_000,
      dueDate: '2026-11-26',
      dueTime: '15:00',
      status: 'scheduled',
      createdAt: now - 8 * 3_600_000,
    },
    {
      id: 'fu-due',
      topic: 'chemistry tonight',
      dueAt: now - 5 * 60_000,
      dueDate: '2026-11-26',
      dueTime: '19:55',
      status: 'scheduled',
      createdAt: now - 2 * 3_600_000,
    },
  ];

  const eligible = findDueFollowUp({
    followUps,
    now,
    time: '20:00',
    running: false,
    settings: { enabled: true, quietFrom: '21:30', quietUntil: '07:00' },
  });
  assert.deepEqual(eligible.staleIds, ['fu-stale']);
  assert.equal(eligible.due?.id, 'fu-due');

  const inQuiet = findDueFollowUp({
    followUps,
    now,
    time: '22:00',
    running: false,
    settings: { enabled: true, quietFrom: '21:30', quietUntil: '07:00' },
  });
  assert.equal(inQuiet.due, undefined);
});

test('buildOutreachSystemInstructions enforces verified facts and no nagging about ignored messages', () => {
  const clock = requestClock('UTC', new Date('2026-11-26T15:00:00Z'));
  const inst = buildOutreachSystemInstructions({ clock, language: 'English', casualMixLanguage: 'Sinhala' });
  assert.match(inst, /Never say "you didn't study"/);
  assert.match(inst, /Never mention ignoring prior messages/);
  assert.match(inst, /English/);
  assert.match(inst, /Sinhala/);
});
