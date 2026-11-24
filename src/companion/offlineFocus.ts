import type { FocusTimerState } from '../context/AppContext';
import type { FocusHistoryItem } from '../types/studyflow';
import type { CompanionFocusState } from '../mobile/types';

export type OfflineReceipt = 'imported' | 'adopted' | 'pc-wins';
export type OfflineReceipts = Record<string, OfflineReceipt>;
export interface OfflineFocusRecord {
  id: string;
  subjectId: string;
  subjectName: string;
  title: string;
  calendarSessionId?: string;
  startedAt: number;
  endedAt: number;
  elapsedSeconds: number;
  totalSeconds: number;
  remainingSeconds: number;
  state: 'running' | 'paused' | 'completed';
}

export function validOfflineRecord(value: unknown): value is OfflineFocusRecord {
  if (!value || typeof value !== 'object') return false;
  const r = value as OfflineFocusRecord;
  return typeof r.id === 'string' && /^phone-[a-f0-9-]{36}$/.test(r.id)
    && typeof r.subjectId === 'string' && r.subjectId.length <= 128
    && typeof r.subjectName === 'string' && r.subjectName.length <= 100
    && typeof r.title === 'string' && r.title.length > 0 && r.title.length <= 200
    && (r.calendarSessionId === undefined || typeof r.calendarSessionId === 'string' && r.calendarSessionId.length <= 128)
    && ['running', 'paused', 'completed'].includes(r.state)
    && [r.startedAt, r.endedAt, r.elapsedSeconds, r.totalSeconds, r.remainingSeconds].every(Number.isSafeInteger)
    && r.startedAt > 0 && r.endedAt >= r.startedAt
    && r.elapsedSeconds >= 0 && r.elapsedSeconds <= 86400
    && r.totalSeconds >= 60 && r.totalSeconds <= 43200
    && r.remainingSeconds >= 0 && r.remainingSeconds <= r.totalSeconds;
}

function overlaps(a: number, b: number, c: number, d: number) { return a < d && c < b; }

/** Windows always wins for overlapping runs and the same calendar session. */
export function resolveOfflineFocus(record: OfflineFocusRecord, timer: FocusTimerState, history: FocusHistoryItem[], now: number): OfflineReceipt {
  if (history.some(h => h.id === record.id)) return 'imported';
  if (timer.mobileRunId === record.id) return record.state === 'completed' ? 'imported' : 'adopted';
  const sameSession = (id?: string | null) => Boolean(record.calendarSessionId && id === record.calendarSessionId);
  if (history.some(h => sameSession(h.calendarSessionId) ||
      (h.startedAtMs !== undefined && h.endedAtMs !== undefined &&
        overlaps(record.startedAt, record.endedAt, h.startedAtMs, h.endedAtMs)))) return 'pc-wins';
  const active = timer.running || timer.elapsedSeconds > 0 || timer.completionModalOpen;
  const pcStart = timer.startedAtMs ?? now - Math.max(timer.elapsedSeconds, timer.totalSeconds - timer.secondsLeft, 1) * 1000;
  if (active && (record.state !== 'completed' || sameSession(timer.calendarSessionId)
      || overlaps(record.startedAt, record.endedAt, pcStart, now))) return 'pc-wins';
  return record.state === 'completed' ? 'imported' : 'adopted';
}

export const QUEUE_KEY = 'studyflow.phone.unsyncedFocus';
export const ACTIVE_KEY = 'studyflow.phone.localFocus';
export function readOfflineQueue(): OfflineFocusRecord[] {
  try { const q = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]'); return Array.isArray(q) ? q.filter(validOfflineRecord) : []; }
  catch { return []; }
}
export function queueOfflineRecord(record: OfflineFocusRecord) {
  const q = readOfflineQueue().filter(r => r.id !== record.id);
  localStorage.setItem(QUEUE_KEY, JSON.stringify([...q, record]));
}
export function removeAcknowledgedOfflineRecords(receipts: OfflineReceipts) {
  const q = readOfflineQueue();
  const remaining = q.filter(r => receipts[r.id] !== 'imported' && receipts[r.id] !== 'pc-wins');
  if (remaining.length !== q.length) localStorage.setItem(QUEUE_KEY, JSON.stringify(remaining));
}
export function phoneRecord(f: CompanionFocusState, state: OfflineFocusRecord['state'], at: number, now = Date.now()): OfflineFocusRecord | undefined {
  if (!f.localRunId || !f.startedAtMs || f.origin !== 'phone') return;
  const advance = state === 'running' ? Math.min(f.secondsLeft, Math.max(0, Math.floor((now - at) / 1000))) : 0;
  const remaining = Math.max(0, f.secondsLeft - advance);
  const elapsed = f.elapsedActiveSeconds + advance;
  const record: OfflineFocusRecord = {
    id: f.localRunId, subjectId: f.subjectId.slice(0, 128),
    subjectName: (f.customSubject || '').slice(0, 100), title: f.sessionTitle.slice(0, 200),
    ...(f.sessionId !== 'local-focus' && !f.sessionId.startsWith('phone-') ? { calendarSessionId: f.sessionId.slice(0, 128) } : {}),
    startedAt: f.startedAtMs, endedAt: Math.max(f.startedAtMs, now),
    elapsedSeconds: elapsed, totalSeconds: f.intervalMinutes * 60, remainingSeconds: remaining,
    state: state === 'running' && remaining === 0 ? 'completed' : state,
  };
  return validOfflineRecord(record) ? record : undefined;
}
export function readActiveOfflineRecord(): OfflineFocusRecord | undefined {
  try {
    const saved = JSON.parse(localStorage.getItem(ACTIVE_KEY) || 'null');
    if (!saved?.focus?.pendingSyncWhenOnline) return;
    const f = saved.focus as CompanionFocusState;
    if (!['focus', 'paused', 'completed'].includes(f.phase)) return;
    return phoneRecord(f, f.phase === 'focus' ? 'running' : f.phase === 'completed' || f.secondsLeft === 0 ? 'completed' : 'paused', saved.at);
  } catch { return; }
}
