import type { FocusHistoryItem, GoalItem, NoteItem, StudySession, Subject, TaskItem } from '../types/studyflow';
import type { TokenUsage } from './protocol';
import type { StudyPreferences } from './studyPreferences';
import { requestClock } from './workspaceContext';

export type RequestClock = ReturnType<typeof requestClock>;

export interface LanguageOption {
  code: string;
  label: string;
  nativeLabel?: string;
  countryCode: string;
  region: string;
  keywords?: readonly string[];
}

export const APP_LANGUAGES: readonly LanguageOption[] = [
  { code: 'en', label: 'English (US)', nativeLabel: 'English', countryCode: 'US', region: 'Americas', keywords: ['english', 'usa', 'america', 'en-us'] },
  { code: 'en-GB', label: 'English (UK)', nativeLabel: 'English', countryCode: 'GB', region: 'Europe', keywords: ['english', 'uk', 'british', 'britain', 'en-gb'] },
  { code: 'si', label: 'Sinhala', nativeLabel: 'සිංහල', countryCode: 'LK', region: 'South Asia', keywords: ['sinhalese', 'sri lanka', 'lanka'] },
  { code: 'ta', label: 'Tamil', nativeLabel: 'தமிழ்', countryCode: 'IN', region: 'South Asia', keywords: ['tamil', 'india', 'sri lanka', 'singapore'] },
  { code: 'hi', label: 'Hindi', nativeLabel: 'हिन्दी', countryCode: 'IN', region: 'South Asia', keywords: ['india', 'hindustani'] },
  { code: 'es', label: 'Spanish', nativeLabel: 'Español', countryCode: 'ES', region: 'Europe & Americas', keywords: ['spain', 'castilian', 'latam', 'mexico'] },
  { code: 'fr', label: 'French', nativeLabel: 'Français', countryCode: 'FR', region: 'Europe', keywords: ['france', 'francais', 'canada'] },
  { code: 'de', label: 'German', nativeLabel: 'Deutsch', countryCode: 'DE', region: 'Europe', keywords: ['germany', 'austria', 'switzerland'] },
  { code: 'pt', label: 'Portuguese', nativeLabel: 'Português', countryCode: 'BR', region: 'Americas & Europe', keywords: ['brazil', 'portugal'] },
  { code: 'ja', label: 'Japanese', nativeLabel: '日本語', countryCode: 'JP', region: 'East Asia', keywords: ['japan', 'nihongo'] },
  { code: 'ko', label: 'Korean', nativeLabel: '한국어', countryCode: 'KR', region: 'East Asia', keywords: ['korea', 'south korea', 'hangul'] },
  { code: 'zh', label: 'Mandarin Chinese', nativeLabel: '中文 (简体)', countryCode: 'CN', region: 'East Asia', keywords: ['china', 'simplified', 'mandarin', 'chinese'] },
  { code: 'zh-TW', label: 'Traditional Chinese', nativeLabel: '中文 (繁體)', countryCode: 'TW', region: 'East Asia', keywords: ['taiwan', 'hong kong', 'traditional', 'chinese'] },
  { code: 'ar', label: 'Arabic', nativeLabel: 'العربية', countryCode: 'SA', region: 'Middle East', keywords: ['saudi', 'uae', 'egypt', 'middle east'] },
  { code: 'it', label: 'Italian', nativeLabel: 'Italiano', countryCode: 'IT', region: 'Europe', keywords: ['italy'] },
  { code: 'nl', label: 'Dutch', nativeLabel: 'Nederlands', countryCode: 'NL', region: 'Europe', keywords: ['netherlands', 'holland', 'belgium'] },
  { code: 'ru', label: 'Russian', nativeLabel: 'Русский', countryCode: 'RU', region: 'Europe & Asia', keywords: ['russia'] },
  { code: 'tr', label: 'Turkish', nativeLabel: 'Türkçe', countryCode: 'TR', region: 'Europe & Asia', keywords: ['turkey', 'turkiye'] },
  { code: 'vi', label: 'Vietnamese', nativeLabel: 'Tiếng Việt', countryCode: 'VN', region: 'Southeast Asia', keywords: ['vietnam'] },
  { code: 'id', label: 'Indonesian', nativeLabel: 'Bahasa Indonesia', countryCode: 'ID', region: 'Southeast Asia', keywords: ['indonesia', 'bahasa'] },
  { code: 'th', label: 'Thai', nativeLabel: 'ไทย', countryCode: 'TH', region: 'Southeast Asia', keywords: ['thailand'] },
  { code: 'ms', label: 'Malay', nativeLabel: 'Bahasa Melayu', countryCode: 'MY', region: 'Southeast Asia', keywords: ['malaysia', 'singapore', 'brunei'] },
  { code: 'tl', label: 'Filipino', nativeLabel: 'Filipino / Tagalog', countryCode: 'PH', region: 'Southeast Asia', keywords: ['philippines', 'tagalog'] },
  { code: 'bn', label: 'Bengali', nativeLabel: 'বাংলা', countryCode: 'BD', region: 'South Asia', keywords: ['bangladesh', 'bangla', 'india'] },
  { code: 'ur', label: 'Urdu', nativeLabel: 'اردو', countryCode: 'PK', region: 'South Asia', keywords: ['pakistan', 'india'] },
  { code: 'pl', label: 'Polish', nativeLabel: 'Polski', countryCode: 'PL', region: 'Europe', keywords: ['poland'] },
  { code: 'sv', label: 'Swedish', nativeLabel: 'Svenska', countryCode: 'SE', region: 'Europe', keywords: ['sweden'] },
  { code: 'nb', label: 'Norwegian', nativeLabel: 'Norsk', countryCode: 'NO', region: 'Europe', keywords: ['norway'] },
  { code: 'uk', label: 'Ukrainian', nativeLabel: 'Українська', countryCode: 'UA', region: 'Europe', keywords: ['ukraine'] },
  { code: 'el', label: 'Greek', nativeLabel: 'Ελληνικά', countryCode: 'GR', region: 'Europe', keywords: ['greece'] },
  { code: 'he', label: 'Hebrew', nativeLabel: 'עברית', countryCode: 'IL', region: 'Middle East', keywords: ['israel'] },
] as const;

export interface AssistantLanguageOption extends LanguageOption {
  value: string;
}

export const ASSISTANT_LANGUAGE_OPTIONS: readonly AssistantLanguageOption[] = [
  { value: 'English', code: 'en', label: 'English', nativeLabel: 'English', countryCode: 'US', region: 'Global', keywords: ['english', 'usa', 'uk', 'international'] },
  { value: 'Sinhala', code: 'si', label: 'Sinhala', nativeLabel: 'සිංහල', countryCode: 'LK', region: 'South Asia', keywords: ['sinhalese', 'sri lanka', 'lanka'] },
  { value: 'Tamil', code: 'ta', label: 'Tamil', nativeLabel: 'தமிழ்', countryCode: 'IN', region: 'South Asia', keywords: ['india', 'sri lanka', 'singapore'] },
  { value: 'Hindi', code: 'hi', label: 'Hindi', nativeLabel: 'हिन्दी', countryCode: 'IN', region: 'South Asia', keywords: ['india'] },
  { value: 'Spanish', code: 'es', label: 'Spanish', nativeLabel: 'Español', countryCode: 'ES', region: 'Europe & Americas', keywords: ['spain', 'mexico', 'latam'] },
  { value: 'French', code: 'fr', label: 'French', nativeLabel: 'Français', countryCode: 'FR', region: 'Europe', keywords: ['france', 'canada'] },
  { value: 'German', code: 'de', label: 'German', nativeLabel: 'Deutsch', countryCode: 'DE', region: 'Europe', keywords: ['germany', 'austria'] },
  { value: 'Portuguese', code: 'pt', label: 'Portuguese', nativeLabel: 'Português', countryCode: 'BR', region: 'Americas & Europe', keywords: ['brazil', 'portugal'] },
  { value: 'Japanese', code: 'ja', label: 'Japanese', nativeLabel: '日本語', countryCode: 'JP', region: 'East Asia', keywords: ['japan', 'nihongo'] },
  { value: 'Korean', code: 'ko', label: 'Korean', nativeLabel: '한국어', countryCode: 'KR', region: 'East Asia', keywords: ['korea', 'south korea'] },
  { value: 'Mandarin Chinese', code: 'zh', label: 'Mandarin Chinese', nativeLabel: '中文', countryCode: 'CN', region: 'East Asia', keywords: ['china', 'chinese', 'mandarin', 'taiwan'] },
  { value: 'Arabic', code: 'ar', label: 'Arabic', nativeLabel: 'العربية', countryCode: 'SA', region: 'Middle East', keywords: ['saudi', 'uae', 'egypt'] },
  { value: 'Italian', code: 'it', label: 'Italian', nativeLabel: 'Italiano', countryCode: 'IT', region: 'Europe', keywords: ['italy'] },
  { value: 'Dutch', code: 'nl', label: 'Dutch', nativeLabel: 'Nederlands', countryCode: 'NL', region: 'Europe', keywords: ['netherlands', 'holland'] },
  { value: 'Russian', code: 'ru', label: 'Russian', nativeLabel: 'Русский', countryCode: 'RU', region: 'Europe & Asia', keywords: ['russia'] },
  { value: 'Turkish', code: 'tr', label: 'Turkish', nativeLabel: 'Türkçe', countryCode: 'TR', region: 'Europe & Asia', keywords: ['turkey', 'turkiye'] },
  { value: 'Vietnamese', code: 'vi', label: 'Vietnamese', nativeLabel: 'Tiếng Việt', countryCode: 'VN', region: 'Southeast Asia', keywords: ['vietnam'] },
  { value: 'Indonesian', code: 'id', label: 'Indonesian', nativeLabel: 'Bahasa Indonesia', countryCode: 'ID', region: 'Southeast Asia', keywords: ['indonesia'] },
  { value: 'Thai', code: 'th', label: 'Thai', nativeLabel: 'ไทย', countryCode: 'TH', region: 'Southeast Asia', keywords: ['thailand'] },
  { value: 'Malay', code: 'ms', label: 'Malay', nativeLabel: 'Bahasa Melayu', countryCode: 'MY', region: 'Southeast Asia', keywords: ['malaysia', 'singapore'] },
  { value: 'Filipino', code: 'tl', label: 'Filipino', nativeLabel: 'Filipino / Tagalog', countryCode: 'PH', region: 'Southeast Asia', keywords: ['philippines', 'tagalog'] },
  { value: 'Bengali', code: 'bn', label: 'Bengali', nativeLabel: 'বাংলা', countryCode: 'BD', region: 'South Asia', keywords: ['bangladesh', 'bangla'] },
  { value: 'Urdu', code: 'ur', label: 'Urdu', nativeLabel: 'اردو', countryCode: 'PK', region: 'South Asia', keywords: ['pakistan'] },
  { value: 'Polish', code: 'pl', label: 'Polish', nativeLabel: 'Polski', countryCode: 'PL', region: 'Europe', keywords: ['poland'] },
  { value: 'Swedish', code: 'sv', label: 'Swedish', nativeLabel: 'Svenska', countryCode: 'SE', region: 'Europe', keywords: ['sweden'] },
  { value: 'Norwegian', code: 'nb', label: 'Norwegian', nativeLabel: 'Norsk', countryCode: 'NO', region: 'Europe', keywords: ['norway'] },
  { value: 'Ukrainian', code: 'uk', label: 'Ukrainian', nativeLabel: 'Українська', countryCode: 'UA', region: 'Europe', keywords: ['ukraine'] },
  { value: 'Greek', code: 'el', label: 'Greek', nativeLabel: 'Ελληνικά', countryCode: 'GR', region: 'Europe', keywords: ['greece'] },
  { value: 'Hebrew', code: 'he', label: 'Hebrew', nativeLabel: 'עברית', countryCode: 'IL', region: 'Middle East', keywords: ['israel'] },
] as const;

export const ASSISTANT_LANGUAGES: readonly string[] = ASSISTANT_LANGUAGE_OPTIONS.map((item) => item.value);

export function filterLanguageOptions<T extends LanguageOption>(
  options: readonly T[],
  query: string,
): T[] {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return [...options];
  return options.filter((opt) => {
    const haystack = [
      opt.label,
      opt.nativeLabel ?? '',
      opt.code,
      opt.countryCode,
      opt.region,
      ...(opt.keywords ?? []),
    ]
      .join(' ')
      .toLowerCase();
    return haystack.includes(trimmed);
  });
}

export function isValidAssistantLanguage(value: unknown): value is string {
  return typeof value === 'string' && ASSISTANT_LANGUAGES.includes(value);
}

export function isValidAppLanguage(value: unknown): value is string {
  return typeof value === 'string' && APP_LANGUAGES.some((item) => item.code === value);
}

export type CompanionMessageKind =
  | 'chat'
  | 'outreach_casual'
  | 'outreach_study'
  | 'outreach_suggestion'
  | 'followup';

export type CompanionSuggestionKind = 'focus' | 'note' | 'practice' | 'flashcards' | 'task';

export interface CompanionSuggestion {
  id: string;
  label: string;
  kind: CompanionSuggestionKind;
  minutes?: number;
  subjectId?: string;
  taskTitle?: string;
  noteId?: string;
  taskId?: string;
  dismissed?: boolean;
  accepted?: boolean;
}

export interface CompanionFollowUpOffer {
  id: string;
  topic: string;
  dueAt: number;
  dueDate: string;
  dueTime: string;
  dueLabel: string;
  accepted?: boolean;
  dismissed?: boolean;
}

export interface CompanionFollowUp {
  id: string;
  topic: string;
  dueAt: number;
  dueDate: string;
  dueTime: string;
  status: 'scheduled' | 'delivered' | 'cancelled' | 'skipped';
  createdAt: number;
  sourceMessageId?: string;
}

export interface CompanionOutreachLedger {
  lastUnsolicitedDate?: string;
  lastUnsolicitedBatchId?: string;
  lastUnsolicitedAt?: number;
  lastUnsolicitedAnswered?: boolean;
  deliveredKeys: string[];
  deliveredBatchIds: string[];
}

export interface CompanionMessage {
  id: string;
  batchId?: string;
  role: 'user' | 'assistant';
  text: string;
  createdAt: number;
  timeLabel: string;
  date: string;
  kind: CompanionMessageKind;
  read: boolean;
  triggerKey?: string;
  suggestion?: CompanionSuggestion;
  followUpOffer?: CompanionFollowUpOffer;
  tokens?: TokenUsage;
  state?: 'streaming' | 'complete' | 'stopped' | 'error';
}

export interface CompanionThreadState {
  messages: CompanionMessage[];
  lastReadAt: number;
  updatedAt: number;
}

export interface CompanionFailedReply {
  id: string;
  text: string;
  errorMessage: string;
  createdAt: number;
}

export interface CompanionWorkspaceSlice {
  subjects: Subject[];
  tasks: TaskItem[];
  sessions: StudySession[];
  goals: GoalItem[];
  notes: NoteItem[];
  focusHistory: FocusHistoryItem[];
  pipMemory?: StudyPreferences;
}

export function createEmptyCompanionThread(): CompanionThreadState {
  return {
    messages: [],
    lastReadAt: 0,
    updatedAt: 0,
  };
}

export function createEmptyOutreachLedger(): CompanionOutreachLedger {
  return {
    deliveredKeys: [],
    deliveredBatchIds: [],
  };
}

export function normalizeOutreachLedger(raw: unknown): CompanionOutreachLedger {
  if (!raw || typeof raw !== 'object') return createEmptyOutreachLedger();
  const obj = raw as Partial<CompanionOutreachLedger>;
  return {
    lastUnsolicitedDate: typeof obj.lastUnsolicitedDate === 'string' ? obj.lastUnsolicitedDate : undefined,
    lastUnsolicitedBatchId: typeof obj.lastUnsolicitedBatchId === 'string' ? obj.lastUnsolicitedBatchId : undefined,
    lastUnsolicitedAt: typeof obj.lastUnsolicitedAt === 'number' && Number.isFinite(obj.lastUnsolicitedAt) ? obj.lastUnsolicitedAt : undefined,
    lastUnsolicitedAnswered: typeof obj.lastUnsolicitedAnswered === 'boolean' ? obj.lastUnsolicitedAnswered : undefined,
    deliveredKeys: Array.isArray(obj.deliveredKeys)
      ? [...new Set(obj.deliveredKeys.filter((k): k is string => typeof k === 'string'))].slice(-200)
      : [],
    deliveredBatchIds: Array.isArray(obj.deliveredBatchIds)
      ? [...new Set(obj.deliveredBatchIds.filter((k): k is string => typeof k === 'string'))].slice(-200)
      : [],
  };
}

export function normalizeCompanionFollowUps(raw: unknown): CompanionFollowUp[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: CompanionFollowUp[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const f = item as Partial<CompanionFollowUp>;
    if (
      typeof f.id !== 'string' ||
      !f.id ||
      seen.has(f.id) ||
      typeof f.topic !== 'string' ||
      !f.topic.trim() ||
      typeof f.dueAt !== 'number' ||
      !Number.isFinite(f.dueAt)
    ) {
      continue;
    }
    seen.add(f.id);
    const status =
      f.status === 'scheduled' || f.status === 'delivered' || f.status === 'cancelled' || f.status === 'skipped'
        ? f.status
        : 'scheduled';
    out.push({
      id: f.id,
      topic: f.topic.trim().slice(0, 140),
      dueAt: f.dueAt,
      dueDate: typeof f.dueDate === 'string' ? f.dueDate : requestClock(undefined, new Date(f.dueAt)).date,
      dueTime: typeof f.dueTime === 'string' ? f.dueTime : requestClock(undefined, new Date(f.dueAt)).time,
      status,
      createdAt: typeof f.createdAt === 'number' && Number.isFinite(f.createdAt) ? f.createdAt : f.dueAt,
      sourceMessageId: typeof f.sourceMessageId === 'string' ? f.sourceMessageId : undefined,
    });
  }
  return out.sort((a, b) => a.dueAt - b.dueAt).slice(-50);
}

export function normalizeCompanionThread(raw: unknown): CompanionThreadState {
  if (!raw || typeof raw !== 'object') return createEmptyCompanionThread();
  const obj = raw as Partial<CompanionThreadState>;
  const rawMessages = Array.isArray(obj.messages) ? obj.messages : [];
  const seen = new Set<string>();
  const messages: CompanionMessage[] = [];
  for (const item of rawMessages) {
    if (!item || typeof item !== 'object') continue;
    const msg = item as Partial<CompanionMessage>;
    if (
      typeof msg.id !== 'string' ||
      !msg.id ||
      seen.has(msg.id) ||
      (msg.role !== 'user' && msg.role !== 'assistant') ||
      typeof msg.text !== 'string' ||
      !msg.text.trim()
    ) {
      continue;
    }
    if (msg.role === 'assistant' && msg.state === 'error') continue;
    seen.add(msg.id);
    const createdAt =
      typeof msg.createdAt === 'number' && Number.isFinite(msg.createdAt) ? msg.createdAt : Date.now();
    const clock = requestClock(undefined, new Date(createdAt));
    const kind: CompanionMessageKind =
      msg.kind === 'chat' ||
      msg.kind === 'outreach_casual' ||
      msg.kind === 'outreach_study' ||
      msg.kind === 'outreach_suggestion' ||
      msg.kind === 'followup'
        ? msg.kind
        : 'chat';
    messages.push({
      id: msg.id,
      batchId: typeof msg.batchId === 'string' ? msg.batchId : undefined,
      role: msg.role,
      text: msg.text,
      createdAt,
      timeLabel: typeof msg.timeLabel === 'string' && msg.timeLabel ? msg.timeLabel : clock.time,
      date: typeof msg.date === 'string' && msg.date ? msg.date : clock.date,
      kind,
      read: typeof msg.read === 'boolean' ? msg.read : msg.role === 'user',
      triggerKey: typeof msg.triggerKey === 'string' ? msg.triggerKey : undefined,
      suggestion: msg.suggestion,
      followUpOffer: msg.followUpOffer,
      tokens: msg.tokens,
      state: msg.state === 'streaming' ? 'stopped' : msg.state ?? 'complete',
    });
  }
  return {
    messages: messages.slice(-200),
    lastReadAt: typeof obj.lastReadAt === 'number' && Number.isFinite(obj.lastReadAt) ? obj.lastReadAt : 0,
    updatedAt: typeof obj.updatedAt === 'number' && Number.isFinite(obj.updatedAt) ? obj.updatedAt : 0,
  };
}

export function countUnreadCompanion(thread: CompanionThreadState): number {
  return thread.messages.filter((m) => m.role === 'assistant' && !m.read && m.state !== 'error').length;
}

export function markCompanionRead(thread: CompanionThreadState, now = Date.now()): CompanionThreadState {
  const hasUnread = thread.messages.some((m) => m.role === 'assistant' && !m.read);
  if (!hasUnread) return thread;
  return {
    ...thread,
    lastReadAt: Math.max(thread.lastReadAt, now),
    updatedAt: Math.max(thread.updatedAt, now),
    messages: thread.messages.map((m) => (m.role === 'assistant' && !m.read ? { ...m, read: true } : m)),
  };
}

/**
 * Returns the effective timestamp and RequestClock, honoring an optional
 * `globalThis.__STUDYFLOW_TEST_CLOCK__` (ms epoch or ISO string) for deterministic tests.
 */
export function getEffectiveNow(): number {
  const override = (globalThis as { __STUDYFLOW_TEST_CLOCK__?: number | string | (() => number) }).__STUDYFLOW_TEST_CLOCK__;
  if (typeof override === 'function') {
    const val = override();
    if (typeof val === 'number' && Number.isFinite(val)) return val;
  } else if (typeof override === 'number' && Number.isFinite(override)) {
    return override;
  } else if (typeof override === 'string') {
    const parsed = Date.parse(override);
    if (Number.isFinite(parsed)) return parsed;
  }
  return Date.now();
}

export function getEffectiveClock(timeZone?: string, nowMs = getEffectiveNow()): { now: number; clock: RequestClock } {
  return {
    now: nowMs,
    clock: requestClock(timeZone, new Date(nowMs)),
  };
}

/**
 * Splits Companion replies ONLY on explicit `[Pip follow-up]` dividers when the reply
 * contains genuinely separate short thoughts. Keeps detailed markdown/worked lessons intact
 * and never artificially chops paragraphs into texting fragments.
 */
export function splitCompanionBubbles(text: string): string[] {
  const divider = /^\[Pip follow-up\]\s*$/gim;
  const cleaned = text.trim();
  if (!cleaned) return [];
  if (cleaned.length > 900 || /^(?:#{1,6}\s|```|~~~|\|)/m.test(cleaned)) {
    return [cleaned.replace(divider, '\n\n').trim()];
  }
  const parts = cleaned
    .split(divider)
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length <= 1) return [cleaned];
  if (parts.length <= 3) return parts;
  return [parts[0], parts[1], parts.slice(2).join('\n\n')];
}

const DETAILED_STUDY_PATTERNS = [
  /\b(explain|explanation|derive|derivation|prove|proof|walk me through|step[- ]by[- ]step|how does .+ work|mechanism|difference between|compare|worked example|solve this|calculate|balance this equation|in detail|detailed)\b/i,
  /(පැහැදිලි|විස්තර|ගණනය|සමතුලිත|කොහොමද .+ වෙන්නේ|පියවරෙන් පියවර|හේතුව මොකක්ද|වෙනස මොකක්ද)/u,
];

export function isDetailedStudyRequest(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;
  if (trimmed.length >= 160 && /\?/.test(trimmed)) return true;
  return DETAILED_STUDY_PATTERNS.some((pattern) => pattern.test(trimmed));
}

const SHORT_CONTEXTUAL_PATTERNS = [
  /^(already did( it)?|did it|done|finished( it)?|completed( it)?|just finished|got it|finally got( it| that)?|nailed it|clicked|makes sense now)\b/i,
  /^(later|not now|maybe later|skip|pass|tomorrow|tonight|after dinner|in a bit)\b/i,
  /^(still stuck|stuck|nope|not yet|nah|haven'?t|didn'?t|can'?t|hard|tough|struggling|confused)\b/i,
  /^(yeah|yes|yep|sure|okay|ok|sounds good|let'?s do it|yes please|please do|check in)\b/i,
  /^(කළා|ඉවරයි|පස්සේ|තාම බෑ|තාම හිරවෙලා|තේරුණා|හරි|ඔව්|නෑ)\b/u,
];

export interface ContextualReference {
  isShortReference: boolean;
  referencedMessage?: CompanionMessage;
  recentTopic?: string;
}

/**
 * Resolves short conversational replies ("already did it", "later", "still stuck", "finally got it")
 * against the relevant preceding Companion message so Gemini understands what the user means.
 */
export function resolveContextualReference(
  userText: string,
  recentMessages: CompanionMessage[],
): ContextualReference {
  const trimmed = userText.trim();
  const wordCount = trimmed.split(/\s+/).filter(Boolean).length;
  const isShortReference =
    wordCount <= 8 &&
    (SHORT_CONTEXTUAL_PATTERNS.some((pattern) => pattern.test(trimmed)) ||
      /\b(it|that|this|those|them|one)\b/i.test(trimmed));

  const validMessages = recentMessages.filter((m) => m.state !== 'error' && m.text.trim().length > 0);
  const lastAssistant = [...validMessages].reverse().find((m) => m.role === 'assistant');
  const recentTopic = extractRecentConversationTopic(validMessages);

  if (!isShortReference) {
    return { isShortReference: false, referencedMessage: lastAssistant, recentTopic };
  }

  return {
    isShortReference: true,
    referencedMessage: lastAssistant,
    recentTopic,
  };
}

const STOP_WORDS = new Set([
  'the', 'and', 'for', 'with', 'that', 'this', 'from', 'have', 'just', 'been', 'today', 'tomorrow',
  'tonight', 'yesterday', 'about', 'what', 'when', 'where', 'which', 'your', 'you', 'how', 'did',
  'does', 'done', 'good', 'nice', 'okay', 'yeah', 'sure', 'later', 'still', 'stuck', 'long', 'day',
  'hello', 'hey', 'hi', 'pip', 'thanks', 'thank', 'want', 'talk', 'really', 'pretty', 'much', 'more',
  'some', 'time', 'minutes', 'hour', 'hours', 'study', 'studying', 'session', 'check', 'already',
]);

/**
 * Extracts a concise topic phrase from recent Companion messages for casual follow-ups
 * (e.g., "redox", "oxidation numbers", "organic chemistry", "calculus").
 */
export function extractRecentConversationTopic(messages: CompanionMessage[]): string | undefined {
  const recent = messages.filter((m) => m.state !== 'error' && m.text.trim()).slice(-10);
  if (!recent.length) return undefined;

  // Prefer explicit phrases from recent user turns first, then assistant prompts
  const userTurns = recent.filter((m) => m.role === 'user').reverse();
  const candidates = [...userTurns, ...recent.filter((m) => m.role === 'assistant').reverse()];

  for (const msg of candidates) {
    const text = msg.text.trim();
    // Look for explicit "about X", "with X", "on X", "did X", "got X", "stuck on X"
    const targeted = text.match(
      /(?:stuck on|working on|finished|got|studied|studying|reviewing|practicing|about|with|for|on)\s+([a-zA-Z0-9\u0D80-\u0DFF][a-zA-Z0-9\u0D80-\u0DFF\s'-]{2,36}?)(?:[.!?,]|$)/i,
    );
    if (targeted?.[1]) {
      const phrase = targeted[1].trim().replace(/\b(today|tonight|yesterday|now|yet|it|that|this)\b/gi, '').trim();
      if (phrase.length >= 3 && !STOP_WORDS.has(phrase.toLowerCase())) {
        return phrase.slice(0, 42);
      }
    }
  }

  // Fallback: meaningful keyword from recent messages
  for (const msg of candidates) {
    const words = msg.text
      .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
      .split(/\s+/)
      .filter((w) => w.length >= 4 && !STOP_WORDS.has(w.toLowerCase()));
    if (words.length > 0) {
      return words.slice(0, 2).join(' ').slice(0, 42);
    }
  }

  return undefined;
}

export function buildLanguageGuidance(language?: string, casualMixLanguage?: string, detailRequested = false): string {
  const primary = isValidAssistantLanguage(language) ? language : undefined;
  const secondary =
    isValidAssistantLanguage(casualMixLanguage) && casualMixLanguage !== primary
      ? casualMixLanguage
      : undefined;

  if (detailRequested) {
    if (primary) {
      return `Language: Reply in ${primary} (unless the student explicitly writes in another language—if so, match the student's language naturally and keep standard technical terms clear).`;
    }
    return "Language: Match the student's message language naturally (e.g., full clear Sinhala if asked in Sinhala, English if asked in English) and keep technical terms accurate.";
  }

  if (primary && secondary) {
    return `Casual language preference: Naturally blend ${primary} and ${secondary} for casual messages (warm, everyday bilingual mix) unless the student asks for a specific single language.`;
  }
  if (primary) {
    return `Casual language preference: Write casual replies in ${primary}.`;
  }
  if (secondary) {
    return `Casual language preference: Match the student's message, blending in ${secondary} casually when natural.`;
  }
  return "Casual language preference: Match the student's message language naturally.";
}

export function buildCompanionSystemInstructions(input: {
  clock: RequestClock;
  language?: string;
  casualMixLanguage?: string;
  detailRequested?: boolean;
  memory?: StudyPreferences;
  reference?: ContextualReference;
}): string {
  const { clock, language, casualMixLanguage, detailRequested = false, memory, reference } = input;
  const langLine = buildLanguageGuidance(language, casualMixLanguage, detailRequested);

  const memoryLines: string[] = [];
  if (memory?.materials?.trim()) memoryLines.push(`Study materials preference: ${memory.materials.trim().slice(0, 300)}`);
  if (memory?.lessons?.trim()) memoryLines.push(`Lesson times: ${memory.lessons.trim().slice(0, 300)}`);
  if (memory?.homework?.trim()) memoryLines.push(`Protected homework time: ${memory.homework.trim().slice(0, 300)}`);

  const lines = [
    'MODE: Pip Companion Inbox (dedicated casual conversation, separate from formal study coaching).',
    `Current local date and time: ${clock.label}.`,
    langLine,
    'Personality: Warm, direct, curious, and lightly playful.',
    detailRequested
      ? 'The student asked for a detailed study explanation—give it the full, clear, structured space it needs (keep the explanation together in one bubble).'
      : 'For casual messages, usually reply in ONE short sentence. Use emojis sparingly and only when they genuinely fit. Let the conversation stay casual—do not turn every message into study coaching or unsolicited advice. If the student says something like "long day", a simple "Want to talk about it?" is a complete reply.',
    'Praise something specific only when there is a real, verified reason to celebrate. Avoid fake enthusiasm, guilt, repeated encouragement, and claims about how the student feels.',
    'Bubbles: Usually reply in one bubble. Only put [Pip follow-up] on its own line when you genuinely have two separate thoughts (never chop up a paragraph to simulate texting).',
    'Verified facts only: Never claim the student "didn\'t study" just because no focus log exists; a missing log only means no focus session was recorded.',
    'Never claim to have changed calendar events, tasks, or workspace records yourself—Companion messages are read-only.',
    'Never infer or save preferences from uploaded documents; rely only on explicit preferences listed below.',
  ];

  if (memoryLines.length > 0) {
    lines.push(`Explicit saved preferences:\n- ${memoryLines.join('\n- ')}`);
  }

  if (reference?.isShortReference && reference.referencedMessage) {
    lines.push(
      `Contextual reply hint: The student's short reply likely refers to Pip's preceding Companion message (${reference.referencedMessage.timeLabel}): "${reference.referencedMessage.text.slice(0, 220)}". Respond directly to that context without asking them to repeat it.`,
    );
  }

  return lines.join('\n');
}

/**
 * Builds minimal scoped context for a Companion turn:
 * only verified workspace records relevant to the message or today's schedule,
 * avoiding full workspace dumps.
 */
export function buildCompanionContext(
  workspace: CompanionWorkspaceSlice,
  recentMessages: CompanionMessage[],
  userText: string,
  clock: RequestClock,
): string {
  const parts: string[] = [];
  const lower = userText.toLowerCase();

  const subjectById = new Map(workspace.subjects.map((s) => [s.id, s]));

  // Today's verified sessions (brief)
  const todaySessions = workspace.sessions
    .filter((s) => s.date === clock.date && (!s.blockType || s.blockType === 'study'))
    .sort((a, b) => a.startHour - b.startHour)
    .slice(0, 6)
    .map((s) => {
      const hh = Math.floor(s.startHour);
      const mm = Math.round((s.startHour - hh) * 60);
      const start = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
      const subj = subjectById.get(s.subjectId)?.name;
      const logged = workspace.focusHistory.some(
        (h) =>
          h.calendarSessionId === s.id ||
          (h.calendarSessionId == null && h.subjectId === s.subjectId && h.completedAt.startsWith(clock.date) && h.taskTitle === s.title),
      );
      return `${start} (${s.durationHours}h) ${s.title}${subj ? ` [${subj}]` : ''} — status: ${s.status}, focusLogRecorded: ${logged}`;
    });

  if (todaySessions.length > 0) {
    parts.push(`Today's schedule (${clock.date}):\n${todaySessions.map((line) => `- ${line}`).join('\n')}`);
  }

  // Recent verified focus logs (today)
  const todayFocus = workspace.focusHistory
    .filter((h) => h.completedAt.startsWith(clock.date))
    .slice(0, 4)
    .map((h) => `- ${h.taskTitle} (${h.durationMinutes}m logged)`);
  if (todayFocus.length > 0) {
    parts.push(`Verified focus sessions logged today:\n${todayFocus.join('\n')}`);
  }

  // Only include matching notes/tasks if the message mentions a subject/topic or asks for study help
  const topicWords = lower
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 4 && !STOP_WORDS.has(w));

  if (topicWords.length > 0) {
    const matchingTasks = workspace.tasks
      .filter(
        (t) =>
          t.status !== 'done' &&
          topicWords.some((w) => t.title.toLowerCase().includes(w) || (subjectById.get(t.subjectId)?.name.toLowerCase().includes(w) ?? false)),
      )
      .slice(0, 3)
      .map((t) => `- ${t.title} (due ${t.dueDate || t.dueLabel})`);
    if (matchingTasks.length > 0) {
      parts.push(`Relevant open tasks:\n${matchingTasks.join('\n')}`);
    }

    const matchingNotes = workspace.notes
      .filter((n) => topicWords.some((w) => n.title.toLowerCase().includes(w) || n.content.toLowerCase().includes(w)))
      .slice(0, 2)
      .map((n) => `- ${n.title}`);
    if (matchingNotes.length > 0) {
      parts.push(`Relevant notes:\n${matchingNotes.join('\n')}`);
    }
  }

  // Include concise excerpt of recent Companion conversation if available
  const excerpts = recentMessages
    .filter((m) => m.state !== 'error' && m.text.trim())
    .slice(-6)
    .map((m) => `${m.role === 'user' ? 'Student' : 'Pip'} (${m.timeLabel}): ${m.text.slice(0, 220)}`);
  if (excerpts.length > 0) {
    parts.push(`Recent Companion excerpt:\n${excerpts.join('\n')}`);
  }

  return parts.join('\n\n');
}

export function formatTimeLabel(hhmm: string): string {
  const [hStr, mStr] = hhmm.split(':');
  const h = Number(hStr);
  const m = Number(mStr);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return hhmm;
  const suffix = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')} ${suffix}`;
}
