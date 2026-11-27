import type { StudySession, Subject } from '../types/studyflow';
import type {
  CompanionFollowUp,
  CompanionFollowUpOffer,
  CompanionMessage,
  RequestClock,
} from './companion';
import { formatTimeLabel } from './companion';
import { requestClock } from './workspaceContext';

const OFFER_TAG_RE = /\[Pip follow-up-offer:\s*([^|\]]+?)\s*\|\s*([^\]]+)\]/i;

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

export function buildLocalTimestamp(
  dueDate: string,
  dueTime: string,
  fallbackNow: number,
  timezone = '',
): number {
  const wallTime = Date.parse(`${dueDate}T${dueTime}:00Z`);
  if (!Number.isFinite(wallTime)) return fallbackNow + 3_600_000;
  const offsetAt = (timestamp: number) => {
    const clock = requestClock(timezone, new Date(timestamp));
    return Date.parse(`${clock.date}T${clock.time}:00Z`) - timestamp;
  };
  // Sample both sides of a DST transition. Use the earlier occurrence when a clock
  // time repeats, and move forward by the gap when the clock skips that time.
  const offsets = new Set([offsetAt(wallTime - 86_400_000), offsetAt(wallTime + 86_400_000)]);
  const candidates = [...offsets].map(offset => wallTime - offset).sort((a, b) => a - b);
  return candidates.find(candidate => candidate + offsetAt(candidate) === wallTime) ?? candidates[candidates.length - 1];
}

function addDaysToDate(dateStr: string, days: number): string {
  const date = new Date(`${dateStr}T00:00:00Z`);
  if (!Number.isFinite(date.getTime())) return dateStr;
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function parseExplicitClockTime(text: string): string | null {
  // Match 12h like "8 pm", "8:30pm", "9:15 am"
  const m12 = text.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm|a\.m\.|p\.m\.)\b/i);
  if (m12) {
    let h = Number(m12[1]);
    const min = m12[2] ? Number(m12[2]) : 0;
    const mer = m12[3].toLowerCase().replace(/\./g, '');
    if (h >= 1 && h <= 12 && min >= 0 && min < 60) {
      if (mer === 'pm' && h < 12) h += 12;
      if (mer === 'am' && h === 12) h = 0;
      return `${pad2(h)}:${pad2(min)}`;
    }
  }
  // Match 24h like "20:30"
  const m24 = text.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);
  if (m24) {
    return `${pad2(Number(m24[1]))}:${m24[2]}`;
  }
  return null;
}

function resolveSessionEndTime(
  text: string,
  date: string,
  sessions: StudySession[],
  subjects: Subject[],
): { topic: string; time: string } | null {
  const lower = text.toLowerCase();
  const subjectById = new Map(subjects.map((s) => [s.id, s]));

  const matchingSession = sessions
    .filter((s) => s.date === date && (!s.blockType || s.blockType === 'study'))
    .find((s) => {
      const subjName = subjectById.get(s.subjectId)?.name.toLowerCase() ?? '';
      const subjCode = subjectById.get(s.subjectId)?.code.toLowerCase() ?? '';
      const titleLower = s.title.toLowerCase();
      return (
        (subjName && lower.includes(subjName)) ||
        (subjCode && subjCode.length >= 3 && lower.includes(subjCode)) ||
        titleLower.split(/\s+/).some((word) => word.length >= 4 && lower.includes(word))
      );
    });

  if (!matchingSession) return null;
  const endHour = matchingSession.startHour + matchingSession.durationHours;
  const hh = Math.min(23, Math.floor(endHour));
  const mm = Math.round((endHour - Math.floor(endHour)) * 60) % 60;
  return {
    topic: matchingSession.title,
    time: `${pad2(hh)}:${pad2(mm)}`,
  };
}

/**
 * Parses an optional structured `[Pip follow-up-offer: topic | HH:mm]` or
 * `[Pip follow-up-offer: topic | YYYY-MM-DD HH:mm]` marker from Pip's reply,
 * or detects an explicit one-time follow-up offer in natural text.
 */
export function parseFollowUpOfferFromReply(
  text: string,
  clock: RequestClock,
  now: number,
  sessions: StudySession[],
  subjects: Subject[],
  timezone = '',
): { cleanedText: string; offer?: CompanionFollowUpOffer } {
  const tagMatch = text.match(OFFER_TAG_RE);
  if (tagMatch) {
    const cleanedText = text.replace(OFFER_TAG_RE, '').trim();
    const rawTopic = tagMatch[1].trim().slice(0, 120);
    const rawWhen = tagMatch[2].trim();
    const dateTimeMatch = rawWhen.match(/^(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2})$/);
    const timeOnlyMatch = rawWhen.match(/^(\d{1,2}:\d{2})$/);

    let dueDate = clock.date;
    let dueTime = '20:00';
    if (dateTimeMatch) {
      dueDate = dateTimeMatch[1];
      dueTime = dateTimeMatch[2];
    } else if (timeOnlyMatch) {
      const [h, m] = timeOnlyMatch[1].split(':');
      dueTime = `${pad2(Number(h))}:${m}`;
      if (dueTime <= clock.time) {
        dueDate = addDaysToDate(clock.date, 1);
      }
    } else {
      const parsedClock = parseExplicitClockTime(rawWhen);
      if (parsedClock) {
        dueTime = parsedClock;
        if (dueTime <= clock.time) dueDate = addDaysToDate(clock.date, 1);
      }
    }

    const dueAt = buildLocalTimestamp(dueDate, dueTime, now, timezone);
    const dayPrefix = dueDate === clock.date ? 'Today' : dueDate;
    return {
      cleanedText,
      offer: {
        id: `offer-${dueDate}-${dueTime}-${rawTopic.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 24)}`,
        topic: rawTopic,
        dueAt,
        dueDate,
        dueTime,
        dueLabel: `${dayPrefix} at ${formatTimeLabel(dueTime)}`,
      },
    };
  }

  // Natural offer detection (e.g., "Want me to check in after chemistry tonight?")
  if (/\b(want me to|should i|i can|shall i)\s+(check in|follow up|ping you|message you)\b/i.test(text)) {
    const sessionEnd = resolveSessionEndTime(text, clock.date, sessions, subjects);
    const explicitTime = parseExplicitClockTime(text);
    const isTomorrow = /\btomorrow\b/i.test(text);
    const dueDate = isTomorrow ? addDaysToDate(clock.date, 1) : clock.date;
    const dueTime = explicitTime ?? sessionEnd?.time ?? (/\btonight|evening\b/i.test(text) ? '20:00' : '19:00');
    const topicMatch = text.match(/(?:after|about|on)\s+([a-zA-Z0-9\u0D80-\u0DFF\s'-]{3,36}?)(?:\s+(?:tonight|tomorrow|today|at|later)|[?.!]|$)/i);
    const topic = (sessionEnd?.topic ?? topicMatch?.[1]?.trim() ?? 'your study session').slice(0, 100);
    const dueAt = buildLocalTimestamp(dueDate, dueTime, now, timezone);
    const dayPrefix = dueDate === clock.date ? 'Today' : dueDate;

    return {
      cleanedText: text,
      offer: {
        id: `offer-${dueDate}-${dueTime}-${topic.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 24)}`,
        topic,
        dueAt,
        dueDate,
        dueTime,
        dueLabel: `${dayPrefix} at ${formatTimeLabel(dueTime)}`,
      },
    };
  }

  return { cleanedText: text };
}

/**
 * Detects when the user directly asks for a one-time follow-up ("check in after chemistry tonight")
 * or explicitly agrees ("yes", "sure", "please do") to Pip's most recent pending follow-up offer.
 */
export function detectUserFollowUpRequest(input: {
  userText: string;
  recentMessages: CompanionMessage[];
  clock: RequestClock;
  now: number;
  sessions: StudySession[];
  subjects: Subject[];
  timezone?: string;
}): { followUp?: CompanionFollowUp; acceptedOfferMessageId?: string } {
  const trimmed = input.userText.trim();

  // 1. Check agreement to Pip's latest pending follow-up offer
  const lastAssistantWithOffer = [...input.recentMessages]
    .reverse()
    .find((m) => m.role === 'assistant' && m.followUpOffer && !m.followUpOffer.accepted && !m.followUpOffer.dismissed);

  const acceptsOffer =
    /^(yes|yeah|yep|sure|okay|ok|please|please do|sounds good|do it|check in)\b/i.test(trimmed) ||
    /^(?:ඔව්|හරි)[.!]*$/.test(trimmed);
  if (lastAssistantWithOffer?.followUpOffer && acceptsOffer) {
    const offer = lastAssistantWithOffer.followUpOffer;
    return {
      acceptedOfferMessageId: lastAssistantWithOffer.id,
      followUp: {
        id: `fu-${offer.dueDate}-${offer.dueTime}-${offer.topic.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 24)}`,
        topic: offer.topic,
        dueAt: offer.dueAt,
        dueDate: offer.dueDate,
        dueTime: offer.dueTime,
        status: 'scheduled',
        createdAt: input.now,
        sourceMessageId: lastAssistantWithOffer.id,
      },
    };
  }

  // 2. Check direct user request ("check in after chemistry tonight", "follow up at 8 pm about redox")
  if (/\b(check in|follow up|remind me|ping me|text me)\b/i.test(trimmed)) {
    const sessionEnd = resolveSessionEndTime(trimmed, input.clock.date, input.sessions, input.subjects);
    const explicitTime = parseExplicitClockTime(trimmed);
    const isTomorrow = /\btomorrow\b/i.test(trimmed);
    let dueDate = isTomorrow ? addDaysToDate(input.clock.date, 1) : input.clock.date;
    let dueTime = explicitTime ?? sessionEnd?.time ?? (/\btonight|evening\b/i.test(trimmed) ? '20:00' : null);

    let relativeDueAt: number | undefined;
    if (!dueTime) {
      // Handle relative "in N hours/minutes"
      const rel = trimmed.match(/\bin\s+(\d+)\s*(hour|hr|hours|hrs|minute|min|minutes|mins)\b/i);
      if (rel) {
        const amount = Number(rel[1]);
        const unit = rel[2].toLowerCase();
        const deltaMs = unit.startsWith('h') ? amount * 3_600_000 : amount * 60_000;
        relativeDueAt = input.now + deltaMs;
        const target = requestClock(input.timezone, new Date(relativeDueAt));
        dueDate = target.date;
        dueTime = target.time;
      }
    }

    if (dueTime) {
      if (!isTomorrow && !/\bin\s+\d+/i.test(trimmed) && dueTime <= input.clock.time) {
        dueDate = addDaysToDate(input.clock.date, 1);
      }
      const topicMatch = trimmed.match(/(?:after|about|on)\s+([a-zA-Z0-9\u0D80-\u0DFF\s'-]{3,42}?)(?:\s+(?:tonight|tomorrow|today|at|in|later)|[?.!]|$)/i);
      const topic = (sessionEnd?.topic ?? topicMatch?.[1]?.trim() ?? 'follow-up check-in').slice(0, 120);
      const dueAt = relativeDueAt ?? buildLocalTimestamp(dueDate, dueTime, input.now, input.timezone);

      return {
        followUp: {
          id: `fu-${dueDate}-${dueTime}-${topic.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 24)}`,
          topic,
          dueAt,
          dueDate,
          dueTime,
          status: 'scheduled',
          createdAt: input.now,
        },
      };
    }
  }

  return {};
}

export function buildRescheduledFollowUp(
  item: CompanionFollowUp,
  dueDate: string,
  dueTime: string,
  fallbackNow = Date.now(),
  timezone = '',
): CompanionFollowUp {
  const dueAt = buildLocalTimestamp(dueDate, dueTime, fallbackNow, timezone);
  return {
    ...item,
    dueDate,
    dueTime,
    dueAt,
    status: 'scheduled',
  };
}
