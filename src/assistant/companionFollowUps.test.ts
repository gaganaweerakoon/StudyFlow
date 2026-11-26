import test from 'node:test';
import assert from 'node:assert/strict';
import type { StudySession, Subject } from '../types/studyflow';
import type { CompanionMessage } from './companion';
import {
  buildRescheduledFollowUp,
  detectUserFollowUpRequest,
  parseFollowUpOfferFromReply,
} from './companionFollowUps';
import { requestClock } from './workspaceContext';

const subjects: Subject[] = [
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
    nextExamTitle: 'Chemistry Exam',
    currentGrade: 'A',
    targetGrade: 'A',
    chapters: [],
  },
];

const sessions: StudySession[] = [
  {
    id: 'sess-chem',
    title: 'Chemistry Redox Revision',
    subjectId: 'chem',
    dayIndex: 3,
    date: '2026-11-26',
    startHour: 18.5,
    durationHours: 1,
    status: 'upcoming',
  },
];

test('parseFollowUpOfferFromReply strips structured marker and creates local follow-up offer', () => {
  const now = Date.parse('2026-11-26T15:00:00Z');
  const clock = requestClock('UTC', new Date(now));
  const raw = 'Sounds like a solid plan.\n[Pip follow-up-offer: Chemistry Redox | 19:30]';
  const parsed = parseFollowUpOfferFromReply(raw, clock, now, sessions, subjects);
  assert.equal(parsed.cleanedText, 'Sounds like a solid plan.');
  assert.ok(parsed.offer);
  assert.equal(parsed.offer.topic, 'Chemistry Redox');
  assert.equal(parsed.offer.dueDate, '2026-11-26');
  assert.equal(parsed.offer.dueTime, '19:30');
});

test('parseFollowUpOfferFromReply detects natural offer tied to Chemistry session end time', () => {
  const now = Date.parse('2026-11-26T15:00:00Z');
  const clock = requestClock('UTC', new Date(now));
  const raw = 'Want me to check in after chemistry tonight?';
  const parsed = parseFollowUpOfferFromReply(raw, clock, now, sessions, subjects);
  assert.ok(parsed.offer);
  assert.equal(parsed.offer.dueTime, '19:30');
  assert.match(parsed.offer.topic, /Chemistry/i);
});

test('detectUserFollowUpRequest saves direct "check in after chemistry tonight" locally', () => {
  const now = Date.parse('2026-11-26T15:00:00Z');
  const clock = requestClock('UTC', new Date(now));
  const res = detectUserFollowUpRequest({
    userText: 'check in after chemistry tonight',
    recentMessages: [],
    clock,
    now,
    sessions,
    subjects,
  });
  assert.ok(res.followUp);
  assert.equal(res.followUp.status, 'scheduled');
  assert.equal(res.followUp.dueDate, '2026-11-26');
  assert.equal(res.followUp.dueTime, '19:30');
  assert.match(res.followUp.topic, /Chemistry/i);
});

test('detectUserFollowUpRequest saves agreed follow-up when user says "yes" to Pip offer', () => {
  const now = Date.parse('2026-11-26T15:00:00Z');
  const clock = requestClock('UTC', new Date(now));
  const offerMsg: CompanionMessage = {
    id: 'cmp-1',
    role: 'assistant',
    text: 'Want me to check in after chemistry tonight?',
    createdAt: now - 60_000,
    timeLabel: '14:59',
    date: '2026-11-26',
    kind: 'chat',
    read: true,
    state: 'complete',
    followUpOffer: {
      id: 'offer-1',
      topic: 'Chemistry Redox Revision',
      dueAt: Date.parse('2026-11-26T19:30:00Z'),
      dueDate: '2026-11-26',
      dueTime: '19:30',
      dueLabel: 'Today at 7:30 PM',
    },
  };

  const res = detectUserFollowUpRequest({
    userText: 'sure, please do',
    recentMessages: [offerMsg],
    clock,
    now,
    sessions,
    subjects,
  });
  assert.equal(res.acceptedOfferMessageId, 'cmp-1');
  assert.ok(res.followUp);
  assert.equal(res.followUp.topic, 'Chemistry Redox Revision');
  assert.equal(res.followUp.dueTime, '19:30');
});

test('buildRescheduledFollowUp updates dueDate, dueTime, and dueAt cleanly', () => {
  const original = {
    id: 'fu-1',
    topic: 'Chemistry Redox',
    dueAt: Date.parse('2026-11-26T19:30:00Z'),
    dueDate: '2026-11-26',
    dueTime: '19:30',
    status: 'scheduled' as const,
    createdAt: Date.parse('2026-11-26T15:00:00Z'),
  };
  const updated = buildRescheduledFollowUp(original, '2026-11-27', '20:15');
  assert.equal(updated.dueDate, '2026-11-27');
  assert.equal(updated.dueTime, '20:15');
  assert.equal(updated.status, 'scheduled');
  assert.ok(updated.dueAt > original.dueAt);
});

test('follow-up scheduling uses the selected timezone for offers, requests and rescheduling', () => {
  const timezone = 'Asia/Colombo';
  const now = Date.parse('2026-11-26T13:00:00Z');
  const clock = requestClock(timezone, new Date(now));
  const { offer } = parseFollowUpOfferFromReply(
    '[Pip follow-up-offer: redox | 20:00]', clock, now, [], [], timezone,
  );
  assert.equal(offer?.dueAt, Date.parse('2026-11-26T14:30:00Z'));

  const { followUp } = detectUserFollowUpRequest({
    userText: 'Remind me in 8 hours about redox',
    recentMessages: [],
    clock,
    now,
    sessions: [],
    subjects: [],
    timezone,
  });
  assert.ok(followUp);
  assert.equal(followUp.dueAt, Date.parse('2026-11-26T21:00:00Z'));
  assert.equal(followUp.dueDate, '2026-11-27');
  assert.equal(followUp.dueTime, '02:30');
  assert.equal(
    buildRescheduledFollowUp(followUp, '2026-11-27', '09:00', now, timezone).dueAt,
    Date.parse('2026-11-27T03:30:00Z'),
  );
});
