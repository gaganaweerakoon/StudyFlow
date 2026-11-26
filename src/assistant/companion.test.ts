import test from 'node:test';
import assert from 'node:assert/strict';
import {
  APP_LANGUAGES,
  ASSISTANT_LANGUAGES,
  buildCompanionContext,
  buildCompanionSystemInstructions,
  buildLanguageGuidance,
  countUnreadCompanion,
  extractRecentConversationTopic,
  isDetailedStudyRequest,
  isValidAppLanguage,
  isValidAssistantLanguage,
  markCompanionRead,
  normalizeCompanionThread,
  resolveContextualReference,
  splitCompanionBubbles,
  type CompanionMessage,
  type CompanionThreadState,
} from './companion';
import { requestClock } from './workspaceContext';

function makeMessage(overrides: Partial<CompanionMessage> & { id: string; role: 'user' | 'assistant'; text: string }): CompanionMessage {
  return {
    createdAt: Date.parse('2026-11-26T10:00:00Z'),
    timeLabel: '10:00',
    date: '2026-11-26',
    kind: 'chat',
    read: overrides.role === 'user',
    state: 'complete',
    ...overrides,
  };
}

test('international language catalogs validate app and assistant languages separately', () => {
  assert.ok(APP_LANGUAGES.length >= 10);
  assert.ok(ASSISTANT_LANGUAGES.includes('English'));
  assert.ok(ASSISTANT_LANGUAGES.includes('Sinhala'));
  assert.ok(ASSISTANT_LANGUAGES.includes('Japanese'));
  assert.ok(ASSISTANT_LANGUAGES.includes('Spanish'));
  assert.equal(isValidAssistantLanguage('French'), true);
  assert.equal(isValidAssistantLanguage('Klingon'), false);
  assert.equal(isValidAppLanguage('en'), true);
  assert.equal(isValidAppLanguage('si'), true);
  assert.equal(isValidAppLanguage('ja'), true);
  assert.equal(isValidAppLanguage('xx'), false);
});

test('splitCompanionBubbles splits explicit multi-thought divider without chopping paragraphs or lessons', () => {
  const twoThoughts = 'oh nice 😄 what made it click?\n[Pip follow-up]\nAlso, want me to check in after chemistry tonight?';
  assert.deepEqual(splitCompanionBubbles(twoThoughts), [
    'oh nice 😄 what made it click?',
    'Also, want me to check in after chemistry tonight?',
  ]);

  // Normal multi-sentence paragraph stays in one bubble (never artificially chopped)
  const paragraph = 'That sounds like a full day. Take a breather and let me know if you want to vent or just leave it for tonight.';
  assert.deepEqual(splitCompanionBubbles(paragraph), [paragraph]);

  // Worked markdown study explanation stays together even if divider appears
  const markdownLesson = '## Oxidation Numbers\n1. Elements in free state are 0.\n[Pip follow-up]\n2. Oxygen is usually -2.';
  assert.equal(splitCompanionBubbles(markdownLesson).length, 1);
});

test('unread state persists across normalization and clears cleanly when marked read', () => {
  const thread: CompanionThreadState = {
    lastReadAt: 0,
    updatedAt: 1000,
    messages: [
      makeMessage({ id: 'm1', role: 'assistant', text: 'how did redox go today?', read: false }),
      makeMessage({ id: 'm2', role: 'assistant', text: 'no rush if you are busy', read: false }),
      makeMessage({ id: 'm3', role: 'assistant', text: 'broken', state: 'error', read: false }),
    ],
  };

  // Normalization drops failed error turns and preserves unread flags
  const reloaded = normalizeCompanionThread(JSON.parse(JSON.stringify(thread)));
  assert.equal(reloaded.messages.length, 2);
  assert.equal(countUnreadCompanion(reloaded), 2);

  const read = markCompanionRead(reloaded, 2000);
  assert.equal(countUnreadCompanion(read), 0);
  assert.equal(read.lastReadAt, 2000);
});

test('resolveContextualReference binds short replies to the preceding Companion message', () => {
  const recent: CompanionMessage[] = [
    makeMessage({ id: 'u1', role: 'user', text: 'Redox balancing has been kicking my butt all week' }),
    makeMessage({ id: 'a1', role: 'assistant', text: 'how did redox go today?', timeLabel: '17:30' }),
  ];

  const ref1 = resolveContextualReference('finally got it', recent);
  assert.equal(ref1.isShortReference, true);
  assert.equal(ref1.referencedMessage?.id, 'a1');
  assert.match(ref1.recentTopic ?? '', /redox/i);

  const ref2 = resolveContextualReference('already did it', recent);
  assert.equal(ref2.isShortReference, true);
  assert.equal(ref2.referencedMessage?.id, 'a1');

  const ref3 = resolveContextualReference('still stuck', recent);
  assert.equal(ref3.isShortReference, true);

  const ref4 = resolveContextualReference('later', recent);
  assert.equal(ref4.isShortReference, true);
});

test('extractRecentConversationTopic finds topic from recent Companion turns', () => {
  const messages: CompanionMessage[] = [
    makeMessage({ id: 'u1', role: 'user', text: 'Been working on redox reactions and oxidation numbers' }),
    makeMessage({ id: 'a1', role: 'assistant', text: 'Which part felt trickiest?' }),
  ];
  const topic = extractRecentConversationTopic(messages);
  assert.ok(topic);
  assert.match(topic, /redox/i);
});

test('isDetailedStudyRequest detects English and Sinhala detailed study questions', () => {
  assert.equal(isDetailedStudyRequest('long day'), false);
  assert.equal(isDetailedStudyRequest('finally got oxidation numbers'), false);
  assert.equal(isDetailedStudyRequest('Explain how oxidation numbers work in redox reactions step by step'), true);
  assert.equal(isDetailedStudyRequest('රෙඩොක්ස් ප්‍රතික්‍රියා වල ඔක්සිකරණ අංක සොයන හැටි පියවරෙන් පියවර පැහැදිලි කරන්න'), true);
});

test('language guidance and system instructions support English, Sinhala, bilingual mix, and detailed Sinhala study space', () => {
  const clock = requestClock('UTC', new Date('2026-11-26T15:00:00Z'));

  const mixGuidance = buildLanguageGuidance('English', 'Sinhala', false);
  assert.match(mixGuidance, /English/);
  assert.match(mixGuidance, /Sinhala/);
  assert.match(mixGuidance, /blend/i);

  const casualInstructions = buildCompanionSystemInstructions({
    clock,
    language: 'English',
    casualMixLanguage: 'Sinhala',
    detailRequested: false,
    memory: { homework: 'Keep 4-5 pm free for homework' },
  });
  assert.match(casualInstructions, /ONE short sentence/);
  assert.match(casualInstructions, /Want to talk about it\?/);
  assert.match(casualInstructions, /Keep 4-5 pm free for homework/);
  assert.match(casualInstructions, /Never claim the student "didn't study"/);

  const detailedInstructions = buildCompanionSystemInstructions({
    clock,
    language: 'Sinhala',
    detailRequested: true,
  });
  assert.match(detailedInstructions, /detailed study explanation/i);
  assert.match(detailedInstructions, /keep the explanation together/i);
});

test('buildCompanionContext includes verified focus records and recent excerpts without guessing unlogged study', () => {
  const clock = requestClock('UTC', new Date('2026-11-26T16:00:00Z'));
  const ctx = buildCompanionContext(
    {
      subjects: [
        {
          id: 'chem',
          code: 'CHEM',
          name: 'Chemistry',
          instructor: '',
          color: '#10B981',
          icon: 'flask',
          totalHours: 10,
          weeklyTargetHours: 6,
          lastStudied: 'Today',
          nextExamDate: '2026-12-10',
          nextExamTitle: 'Chemistry Paper',
          currentGrade: 'A',
          targetGrade: 'A',
          chapters: [],
        },
      ],
      tasks: [],
      sessions: [
        {
          id: 's1',
          title: 'Redox Practice',
          subjectId: 'chem',
          dayIndex: 3,
          date: '2026-11-26',
          startHour: 14,
          durationHours: 1,
          status: 'upcoming',
        },
      ],
      goals: [],
      notes: [],
      focusHistory: [],
    },
    [makeMessage({ id: 'm1', role: 'assistant', text: 'how did redox go today?' })],
    'finally got it',
    clock,
  );
  assert.match(ctx, /Redox Practice/);
  assert.match(ctx, /focusLogRecorded: false/);
  assert.match(ctx, /how did redox go today\?/);
});
