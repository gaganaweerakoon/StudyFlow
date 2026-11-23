import { CHAT_LIMITS, isModelId, isProvider, type Provider, type ReplyLimit, type TokenUsage } from './protocol';
import { localDay, validTimeZone } from './workspaceContext';

export interface AssistantSettings {
  provider: Provider;
  models: Partial<Record<Provider, string>>;
  maxOutput: ReplyLimit;
  dailyLimit: number;
  language?: string;
  timezone?: string;
}

export interface UsageEntry {
  id: string;
  day: string;
  at: number;
  provider: Provider;
  model: string;
  tokens?: TokenUsage;
  status: 'complete' | 'stopped' | 'error';
}

const settingsKey = 'studyflow.assistant.settings.v1';
export const usageKey = 'studyflow.assistant.usage.v1';
const defaults: AssistantSettings = { provider: 'openai', models: {}, maxOutput: 650, dailyLimit: 12000 };

function read(key: string) {
  try { return JSON.parse(localStorage.getItem(key) ?? 'null'); }
  catch { return null; }
}

function save(key: string, data: unknown) {
  try { localStorage.setItem(key, JSON.stringify(data)); }
  catch { /* Storage can be disabled. Keep settings and counts in memory. */ }
}

export function readSettings(): AssistantSettings {
  const saved = read(settingsKey);
  if (!saved) return defaults;
  const models: AssistantSettings['models'] = {};
  for (const id of ['openai', 'gemini', 'claude'] as const) {
    if (isModelId(saved.models?.[id])) models[id] = saved.models[id];
  }
  return {
    provider: isProvider(saved.provider) ? saved.provider : defaults.provider,
    maxOutput: CHAT_LIMITS.response.some(limit => limit === saved.maxOutput) ? saved.maxOutput : defaults.maxOutput,
    dailyLimit: Number.isInteger(saved.dailyLimit) && saved.dailyLimit >= 0 && saved.dailyLimit <= 1_000_000
      ? saved.dailyLimit : defaults.dailyLimit,
    models,
    language: ['English', 'Sinhala', 'Tamil'].includes(saved.language) ? saved.language : undefined,
    timezone: validTimeZone(saved.timezone) ? saved.timezone : undefined,
  };
}

export function writeSettings(settings: AssistantSettings) {
  save(settingsKey, settings);
}

export function readUsage(): UsageEntry[] {
  const records = read(usageKey);
  return Array.isArray(records) ? records : [];
}

export function mergeUsage(...groups: UsageEntry[][]) {
  const olderThan = Date.now() - 90 * 86_400_000;
  const unique = new Map<string, UsageEntry>();
  for (const entry of groups.flat()) {
    if (entry && typeof entry.id === 'string' && entry.at > olderThan) unique.set(entry.id, entry);
  }
  return [...unique.values()].sort((a, b) => b.at - a.at).slice(0, 5000);
}

export function writeUsage(records: UsageEntry[]) {
  const merged = mergeUsage(readUsage(), records);
  save(usageKey, merged);
  return merged;
}

export function todayTokens(records: UsageEntry[]) {
  const today = localDay();
  return records.reduce((sum, record) => sum + (record.day === today ? record.tokens?.total ?? 0 : 0), 0);
}
