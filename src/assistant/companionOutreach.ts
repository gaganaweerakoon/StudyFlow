import type {
  FocusHistoryItem,
  GoalItem,
  NoteItem,
  NotificationItem,
  StudySession,
  Subject,
  TaskItem,
} from '../types/studyflow';
import type { CheckInSettings } from './checkIns';
import {
  buildLanguageGuidance,
  extractRecentConversationTopic,
  type CompanionFollowUp,
  type CompanionMessage,
  type CompanionMessageKind,
  type CompanionOutreachLedger,
  type CompanionSuggestion,
  type RequestClock,
} from './companion';
import type { StudyPreferences } from './studyPreferences';

export interface MinuteWindow {
  startMin: number;
  endMin: number;
}

export function timeToMinutes(hhmm: string): number {
  const [hStr, mStr] = hhmm.split(':');
  const h = Number(hStr);
  const m = Number(mStr);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return 0;
  return h * 60 + m;
}

export function isInQuietHours(time: string, quietFrom = '21:30', quietUntil = '07:00'): boolean {
  if (!quietFrom || !quietUntil || quietFrom === quietUntil) return false;
  return quietFrom > quietUntil
    ? time >= quietFrom || time < quietUntil
    : time >= quietFrom && time < quietUntil;
}

function parseClockPoint(hourRaw: number, minRaw: number | undefined, meridiem?: string): number | null {
  if (!Number.isFinite(hourRaw) || hourRaw < 0 || hourRaw > 24) return null;
  const min = minRaw ?? 0;
  if (!Number.isFinite(min) || min < 0 || min >= 60) return null;
  let hour = hourRaw;
  const mer = meridiem?.toLowerCase().replace(/\./g, '');
  if (mer === 'pm' && hour < 12) hour += 12;
  if (mer === 'am' && hour === 12) hour = 0;
  if (hour === 24 && min === 0) return 1440;
  if (hour >= 24) return null;
  return hour * 60 + min;
}

/**
 * Parses editable protected homework time preferences such as:
 * - "Keep 4–5 pm free for homework"
 * - "4:30-6:00 pm"
 * - "16:00 to 17:30"
 */
export function parseProtectedHomeworkWindows(homeworkText?: string): MinuteWindow[] {
  if (!homeworkText || !homeworkText.trim()) return [];
  const windows: MinuteWindow[] = [];
  const regex =
    /\b(\d{1,2})(?::(\d{2}))?\s*(am|pm|a\.m\.|p\.m\.)?\s*(?:[-–—]|to)\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm|a\.m\.|p\.m\.)?\b/gi;

  for (const match of homeworkText.matchAll(regex)) {
    const startHour = Number(match[1]);
    const startMinPart = match[2] ? Number(match[2]) : 0;
    const startMer = match[3];
    const endHour = Number(match[4]);
    const endMinPart = match[5] ? Number(match[5]) : 0;
    const endMer = match[6];

    // If only the end has am/pm (e.g. "4–5 pm"), inherit meridiem for start when sensible
    const effectiveStartMer = startMer ?? (endMer && startHour <= 12 && startHour <= endHour ? endMer : undefined);
    const startMin = parseClockPoint(startHour, startMinPart, effectiveStartMer);
    const endMin = parseClockPoint(endHour, endMinPart, endMer);
    if (startMin !== null && endMin !== null && startMin !== endMin) {
      windows.push({ startMin, endMin });
    }
  }
  return windows;
}

export function isInProtectedHomeworkTime(time: string, homeworkText?: string): boolean {
  const windows = parseProtectedHomeworkWindows(homeworkText);
  if (!windows.length) return false;
  const nowMin = timeToMinutes(time);
  return windows.some(({ startMin, endMin }) =>
    startMin < endMin ? nowMin >= startMin && nowMin < endMin : nowMin >= startMin || nowMin < endMin,
  );
}

export function hasUnsolicitedOutreachToday(
  date: string,
  notifications: Pick<NotificationItem, 'id'>[],
  ledger: CompanionOutreachLedger,
  messages: Pick<CompanionMessage, 'date' | 'kind' | 'role'>[] = [],
): boolean {
  if (ledger.lastUnsolicitedDate === date) return true;
  if (notifications.some((n) => n.id.startsWith(`pip/${date}/`) || n.id.startsWith(`companion/${date}/`))) {
    return true;
  }
  if (
    messages.some(
      (m) =>
        m.role === 'assistant' &&
        m.date === date &&
        (m.kind === 'outreach_casual' || m.kind === 'outreach_study' || m.kind === 'outreach_suggestion'),
    )
  ) {
    return true;
  }
  return false;
}

export type OutreachCategory = 'casual' | 'studyMilestones' | 'suggestions';

export interface OutreachCandidate {
  category: OutreachCategory;
  kind: CompanionMessageKind;
  triggerKey: string;
  batchId: string;
  verifiedFacts: Record<string, unknown>;
  suggestion?: CompanionSuggestion;
  draftPrompt: string;
}

export interface EvaluateOutreachInput {
  settings: CheckInSettings;
  date: string;
  time: string;
  now: number;
  running: boolean;
  notifications: Pick<NotificationItem, 'id'>[];
  ledger: CompanionOutreachLedger;
  companionMessages: CompanionMessage[];
  subjects: Subject[];
  sessions: StudySession[];
  focusHistory: FocusHistoryItem[];
  goals: GoalItem[];
  newMilestones: Set<string>;
  tasks: TaskItem[];
  notes: NoteItem[];
  pipMemory?: StudyPreferences;
}

export type OutreachSuppressionReason =
  | 'disabled'
  | 'focus_running'
  | 'quiet_hours'
  | 'snoozed'
  | 'protected_homework'
  | 'daily_limit'
  | 'ignored_rest'
  | 'no_candidate';

export interface EvaluateOutreachResult {
  candidate?: OutreachCandidate;
  suppressedBy?: OutreachSuppressionReason;
}

function alreadyDelivered(
  triggerKey: string,
  batchId: string,
  ledger: CompanionOutreachLedger,
  notifications: Pick<NotificationItem, 'id'>[],
  messages: CompanionMessage[],
): boolean {
  if (ledger.deliveredKeys.includes(triggerKey) || ledger.deliveredBatchIds.includes(batchId)) return true;
  if (notifications.some((n) => n.id === batchId || ((n.id.startsWith('pip/') || n.id.startsWith('companion/')) && n.id.endsWith('/' + triggerKey)))) {
    return true;
  }
  if (messages.some((m) => m.batchId === batchId || m.triggerKey === triggerKey)) return true;
  return false;
}

/**
 * Deterministic local outreach engine.
 * StudyFlow decides WHETHER and WHEN to send; Gemini only drafts wording from the verified facts returned here.
 */
export function evaluateCompanionOutreach(input: EvaluateOutreachInput): EvaluateOutreachResult {
  const { settings, date, time, now, running, notifications, ledger, companionMessages, pipMemory } = input;

  if (!settings.enabled) return { suppressedBy: 'disabled' };
  if (running) return { suppressedBy: 'focus_running' };
  if (isInQuietHours(time, settings.quietFrom ?? '21:30', settings.quietUntil ?? '07:00')) {
    return { suppressedBy: 'quiet_hours' };
  }
  if ((settings.snoozeUntil ?? 0) > now) return { suppressedBy: 'snoozed' };
  if (isInProtectedHomeworkTime(time, pipMemory?.homework)) {
    return { suppressedBy: 'protected_homework' };
  }
  if (hasUnsolicitedOutreachToday(date, notifications, ledger, companionMessages)) {
    return { suppressedBy: 'daily_limit' };
  }

  // Ignore-rest policy: if the last unsolicited message went unanswered without a user reply,
  // let it rest instead of repeating or asking why they didn't answer.
  if (ledger.lastUnsolicitedBatchId && ledger.lastUnsolicitedAnswered === false) {
    return { suppressedBy: 'ignored_rest' };
  }

  const nowMinutes = timeToMinutes(time);
  const nowHours = nowMinutes / 60;
  const subjectById = new Map(input.subjects.map((s) => [s.id, s]));

  // Category flags: all three default to true once opted in (also honor legacy flags if explicitly false)
  const studyMilestonesEnabled = settings.studyMilestones !== false;
  const suggestionsEnabled = settings.suggestions !== false;
  const casualEnabled = settings.casual !== false;

  // 1. Study milestone celebration or fresh post-session check-in (skip stale sessions > 90 min old)
  if (studyMilestonesEnabled) {
    if (settings.milestone !== false) {
      for (const goal of input.goals) {
        for (const step of goal.milestones) {
          const triggerKey = `milestone/${goal.id}/${step.id}`;
          const batchId = `companion/${date}/${triggerKey}`;
          if (step.done && input.newMilestones.has(triggerKey) && !alreadyDelivered(triggerKey, batchId, ledger, notifications, companionMessages)) {
            return {
              candidate: {
                category: 'studyMilestones',
                kind: 'outreach_study',
                triggerKey,
                batchId,
                verifiedFacts: {
                  type: 'verified_milestone',
                  goalTitle: goal.title,
                  milestoneLabel: step.label,
                },
                draftPrompt: `Draft one short, warm, grounded message congratulating the student on a real verified milestone they just completed: "${step.label}" in "${goal.title}". Keep it genuine and specific—one short sentence, no fake enthusiasm or guilt.`,
              },
            };
          }
        }
      }
    }

    if (settings.recovery !== false) {
      // Only consider sessions that ended recently (within 0 to 90 minutes) — never burst stale sessions after restart
      const recentSession = input.sessions.find((s) => {
        if (s.date !== date || s.status === 'completed') return false;
        if (s.countsTowardStudy === false || (s.blockType && s.blockType !== 'study')) return false;
        const endHour = s.startHour + s.durationHours;
        const minutesSinceEnd = Math.round((nowHours - endHour) * 60);
        if (minutesSinceEnd < 0 || minutesSinceEnd > 90) return false;
        const triggerKey = `session/${s.id}`;
        const batchId = `companion/${date}/${triggerKey}`;
        if (alreadyDelivered(triggerKey, batchId, ledger, notifications, companionMessages)) return false;
        return true;
      });

      if (recentSession) {
        const triggerKey = `session/${recentSession.id}`;
        const batchId = `companion/${date}/${triggerKey}`;
        const focusLogRecorded = input.focusHistory.some(
          (h) =>
            h.calendarSessionId === recentSession.id ||
            (h.calendarSessionId == null &&
              h.subjectId === recentSession.subjectId &&
              h.completedAt.startsWith(date) &&
              h.taskTitle === recentSession.title),
        );
        const subjectName = subjectById.get(recentSession.subjectId)?.name;

        return {
          candidate: {
            category: 'studyMilestones',
            kind: 'outreach_study',
            triggerKey,
            batchId,
            verifiedFacts: {
              type: 'post_session_checkin',
              sessionTitle: recentSession.title,
              subjectName: subjectName ?? null,
              focusLogRecorded,
            },
            draftPrompt: focusLogRecorded
              ? `Draft one short, casual check-in asking how the student's recent session "${recentSession.title}"${subjectName ? ` (${subjectName})` : ''} went. One short sentence.`
              : `Draft one short, warm check-in asking how "${recentSession.title}"${subjectName ? ` (${subjectName})` : ''} went. Verified fact: no focus timer log was recorded in StudyFlow—NEVER say or imply the student didn't study (they may have studied offline). Simply ask how it went in one short sentence.`,
          },
        };
      }
    }
  }

  // 2. Timely next-step suggestion when there is a clear upcoming slot/note/task and room for it
  if (suggestionsEnabled) {
    // 2a. Clear 10–40 min window before an upcoming study session today
    const upcomingSession = input.sessions
      .filter((s) => {
        if (s.date !== date || s.status !== 'upcoming') return false;
        if (s.countsTowardStudy === false || (s.blockType && s.blockType !== 'study')) return false;
        const minsUntilStart = Math.round((s.startHour - nowHours) * 60);
        return minsUntilStart >= 10 && minsUntilStart <= 40;
      })
      .sort((a, b) => a.startHour - b.startHour)[0];

    if (upcomingSession) {
      const triggerKey = `suggest/pre-session/${upcomingSession.id}`;
      const batchId = `companion/${date}/${triggerKey}`;
      if (!alreadyDelivered(triggerKey, batchId, ledger, notifications, companionMessages)) {
        const minsUntil = Math.max(10, Math.min(15, Math.floor(((upcomingSession.startHour - nowHours) * 60) / 5) * 5));
        const subjectName = subjectById.get(upcomingSession.subjectId)?.name ?? upcomingSession.title;
        const relatedNote = input.notes.find(
          (n) =>
            n.subjectId === upcomingSession.subjectId ||
            n.title.toLowerCase().includes(upcomingSession.title.toLowerCase().split(/\s+/)[0] ?? ''),
        );
        const suggestion: CompanionSuggestion = relatedNote
          ? {
              id: `sug-${upcomingSession.id}`,
              label: `Start ${minsUntil} min`,
              kind: 'focus',
              minutes: minsUntil,
              subjectId: upcomingSession.subjectId,
              taskTitle: upcomingSession.title,
              noteId: relatedNote.id,
            }
          : {
              id: `sug-${upcomingSession.id}`,
              label: `Start ${minsUntil} min`,
              kind: 'focus',
              minutes: minsUntil,
              subjectId: upcomingSession.subjectId,
              taskTitle: upcomingSession.title,
            };

        return {
          candidate: {
            category: 'suggestions',
            kind: 'outreach_suggestion',
            triggerKey,
            batchId,
            suggestion,
            verifiedFacts: {
              type: 'timely_pre_session_suggestion',
              minutesAvailable: minsUntil,
              upcomingSessionTitle: upcomingSession.title,
              subjectName,
              relatedNoteTitle: relatedNote?.title ?? null,
            },
            draftPrompt: `Draft one short, casual timely suggestion: the student has about ${minsUntil} minutes before "${upcomingSession.title}" (${subjectName}). Offer one light, low-pressure next step (like a quick warm-up or glancing at ${relatedNote ? `"${relatedNote.title}"` : 'a couple questions'}). One or two short sentences max. Never claim you changed their schedule.`,
          },
        };
      }
    }

    // 2b. Evening due task (only when evening flag isn't explicitly disabled and time >= 17:30)
    if (settings.evening !== false && time >= '17:30') {
      const openTask = input.tasks
        .filter((t) => t.status !== 'done' && t.dueDate && t.dueDate <= date)
        .sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0];
      if (openTask) {
        const triggerKey = `suggest/task/${openTask.id}`;
        const batchId = `companion/${date}/${triggerKey}`;
        if (!alreadyDelivered(triggerKey, batchId, ledger, notifications, companionMessages)) {
          const subjectName = subjectById.get(openTask.subjectId)?.name;
          const suggestion: CompanionSuggestion = {
            id: `sug-task-${openTask.id}`,
            label: 'Start 10 min',
            kind: 'focus',
            minutes: 10,
            subjectId: openTask.subjectId,
            taskTitle: openTask.title,
            taskId: openTask.id,
          };
          return {
            candidate: {
              category: 'suggestions',
              kind: 'outreach_suggestion',
              triggerKey,
              batchId,
              suggestion,
              verifiedFacts: {
                type: 'timely_task_suggestion',
                taskTitle: openTask.title,
                dueDate: openTask.dueDate,
                subjectName: subjectName ?? null,
              },
              draftPrompt: `Draft one short, gentle evening check-in noting "${openTask.title}" is still open and offering a quick 10-minute start if they feel up for it. No guilt or pressure. One short sentence.`,
            },
          };
        }
      }
    }
  }

  // 3. Casual hello or follow-up on a recent conversation topic (works even with zero study milestones/tasks)
  if (casualEnabled) {
    // Only send casual outreach during comfortable daytime/evening hours (09:00–20:30)
    if (time >= '09:00' && time <= '20:30') {
      const recentTopic = extractRecentConversationTopic(companionMessages);
      const lastMessage = [...companionMessages].filter((m) => m.state !== 'error').at(-1);
      // Avoid messaging immediately after the student just chatted (wait at least 2 hours since last turn)
      const msSinceLastMessage = lastMessage ? now - lastMessage.createdAt : Number.POSITIVE_INFINITY;

      if (msSinceLastMessage >= 2 * 60 * 60 * 1000) {
        if (recentTopic) {
          const slug = recentTopic.toLowerCase().replace(/[^a-z0-9\u0D80-\u0DFF]+/gu, '-').slice(0, 32) || 'topic';
          const triggerKey = `casual/topic/${slug}`;
          const batchId = `companion/${date}/${triggerKey}`;
          if (!alreadyDelivered(triggerKey, batchId, ledger, notifications, companionMessages)) {
            const recentExcerpt = companionMessages
              .filter((m) => m.state !== 'error')
              .slice(-4)
              .map((m) => `${m.role === 'user' ? 'Student' : 'Pip'}: ${m.text.slice(0, 160)}`)
              .join('\n');
            return {
              candidate: {
                category: 'casual',
                kind: 'outreach_casual',
                triggerKey,
                batchId,
                verifiedFacts: {
                  type: 'casual_topic_followup',
                  recentTopic,
                  recentExcerpt,
                },
                draftPrompt: `Draft one short, warm casual follow-up asking how "${recentTopic}" went or is going, based on the recent Companion chat excerpt below. Sound like a friendly peer texting (e.g., "how did ${recentTopic} go today?"). One short sentence, no coaching or guilt.\n\nRecent chat:\n${recentExcerpt}`,
              },
            };
          }
        }

        // Plain casual hello — can be sent without any study milestone, task, or prior topic
        const triggerKey = `casual/hello/${date}`;
        const batchId = `companion/${date}/${triggerKey}`;
        if (!alreadyDelivered(triggerKey, batchId, ledger, notifications, companionMessages)) {
          return {
            candidate: {
              category: 'casual',
              kind: 'outreach_casual',
              triggerKey,
              batchId,
              verifiedFacts: {
                type: 'casual_hello',
                localTime: time,
                date,
              },
              draftPrompt: `Draft one short, warm casual hello from Pip for ${time} local time. Keep it light and human—one short sentence, no study coaching, no assumptions about their mood, and no mention of missing study logs.`,
            },
          };
        }
      }
    }
  }

  return { suppressedBy: 'no_candidate' };
}

/**
 * Evaluates scheduled one-time user-agreed follow-ups (separate from the unsolicited 1/day cap
 * because the user explicitly asked Pip to check in on a topic at that time).
 * Skips follow-ups that are stale beyond the grace window (3 hours past due) instead of bursting after restart.
 */
export function findDueFollowUp(input: {
  followUps: CompanionFollowUp[];
  now: number;
  time: string;
  running: boolean;
  settings: CheckInSettings;
  pipMemory?: StudyPreferences;
}): { due?: CompanionFollowUp; staleIds: string[] } {
  const GRACE_MS = 3 * 60 * 60 * 1000;
  const staleIds: string[] = [];
  let due: CompanionFollowUp | undefined;

  for (const item of input.followUps) {
    if (item.status !== 'scheduled') continue;
    if (input.now > item.dueAt + GRACE_MS) {
      staleIds.push(item.id);
      continue;
    }
    if (input.now >= item.dueAt && !due) {
      // Respect active focus, quiet hours, snooze, and protected homework time
      const blocked =
        input.running ||
        isInQuietHours(input.time, input.settings.quietFrom ?? '21:30', input.settings.quietUntil ?? '07:00') ||
        (input.settings.snoozeUntil ?? 0) > input.now ||
        isInProtectedHomeworkTime(input.time, input.pipMemory?.homework);
      if (!blocked) {
        due = item;
      }
    }
  }

  return { due, staleIds };
}

export function buildOutreachSystemInstructions(input: {
  clock: RequestClock;
  language?: string;
  casualMixLanguage?: string;
  memory?: StudyPreferences;
}): string {
  const langLine = buildLanguageGuidance(input.language, input.casualMixLanguage, false);
  const lines = [
    'MODE: Pip Companion Outreach Draft (Pip is initiating a short local message in the Companion inbox).',
    `Current local date and time: ${input.clock.label}.`,
    langLine,
    'Tone: Warm, direct, curious, lightly playful. Usually ONE short sentence. Use at most one fitting emoji only when natural.',
    'STRICT RULES:',
    '- Base every study mention strictly on the verified facts provided. Never say "you didn\'t study" or imply failure.',
    '- Never mention ignoring prior messages or ask why the student didn\'t reply.',
    '- Never claim you edited their calendar, tasks, or workspace.',
    '- Return ONLY the message text Pip should send (no quotes, no preamble, no markdown headings).',
  ];
  if (input.memory?.materials?.trim()) {
    lines.push(`Explicit material preference: ${input.memory.materials.trim().slice(0, 200)}`);
  }
  return lines.join('\n');
}
