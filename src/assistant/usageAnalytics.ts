import { PROVIDERS, type Provider } from './protocol';
import type { UsageEntry } from './usage';

export type UsageWindowDays = 1 | 7 | 30 | 0; // 0 = All time

export interface UsageFilterOptions {
  windowDays: UsageWindowDays;
  provider: Provider | 'all';
  query?: string;
  now?: Date;
}

export interface UsageTotals {
  input: number;
  output: number;
  cached: number;
  total: number;
  requests: number;
  unreported: number;
}

export interface DailyUsageRow {
  key: string;
  day: string;
  provider: Provider;
  model: string;
  input: number;
  output: number;
  cached: number;
  total: number;
  requests: number;
}

export function filterUsageEntries(entries: UsageEntry[], options: UsageFilterOptions): UsageEntry[] {
  const now = options.now ?? new Date();
  let cutoff = 0;
  if (options.windowDays > 0) {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - options.windowDays + 1);
    cutoff = start.getTime();
  }

  const normalizedQuery = (options.query ?? '').trim().toLowerCase();

  return entries.filter((entry) => {
    if (cutoff > 0 && entry.at < cutoff) return false;
    if (options.provider !== 'all' && entry.provider !== options.provider) return false;
    if (normalizedQuery) {
      const providerLabel = PROVIDERS[entry.provider]?.label?.toLowerCase() ?? '';
      const haystack = `${entry.day} ${entry.provider} ${providerLabel} ${entry.model} ${entry.status}`.toLowerCase();
      if (!haystack.includes(normalizedQuery)) return false;
    }
    return true;
  });
}

export function summarizeUsageEntries(entries: UsageEntry[]): UsageTotals {
  let input = 0;
  let output = 0;
  let cached = 0;
  let total = 0;
  let unreported = 0;

  for (const row of entries) {
    if (!row.tokens) {
      unreported++;
      continue;
    }
    input += row.tokens.input;
    output += row.tokens.output;
    cached += row.tokens.cached;
    total += row.tokens.total;
  }

  return {
    input,
    output,
    cached,
    total,
    requests: entries.length,
    unreported,
  };
}

export function aggregateDailyUsage(entries: UsageEntry[]): DailyUsageRow[] {
  const groups = new Map<string, DailyUsageRow>();
  for (const row of entries) {
    const key = `${row.day}|${row.provider}|${row.model}`;
    const existing = groups.get(key) ?? {
      key,
      day: row.day,
      provider: row.provider,
      model: row.model,
      input: 0,
      output: 0,
      cached: 0,
      total: 0,
      requests: 0,
    };
    existing.input += row.tokens?.input ?? 0;
    existing.output += row.tokens?.output ?? 0;
    existing.cached += row.tokens?.cached ?? 0;
    existing.total += row.tokens?.total ?? 0;
    existing.requests++;
    groups.set(key, existing);
  }
  return Array.from(groups.values()).sort((a, b) =>
    b.day.localeCompare(a.day) || b.total - a.total || a.model.localeCompare(b.model),
  );
}

function escapeCsvCell(value: string | number): string {
  const str = String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function buildUsageCsv(entries: UsageEntry[], view: 'requests' | 'daily'): string {
  if (view === 'daily') {
    const daily = aggregateDailyUsage(entries);
    const header = ['Date', 'Provider', 'Model', 'Requests', 'Input Tokens', 'Output Tokens', 'Cached Tokens', 'Total Tokens'];
    const lines = daily.map((row) =>
      [
        row.day,
        PROVIDERS[row.provider]?.label ?? row.provider,
        row.model,
        row.requests,
        row.input,
        row.output,
        row.cached,
        row.total,
      ]
        .map(escapeCsvCell)
        .join(','),
    );
    return [header.join(','), ...lines].join('\n');
  }

  const header = ['Timestamp', 'Day', 'Provider', 'Model', 'Status', 'Input Tokens', 'Output Tokens', 'Cached Tokens', 'Total Tokens'];
  const lines = entries.map((row) =>
    [
      new Date(row.at).toISOString(),
      row.day,
      PROVIDERS[row.provider]?.label ?? row.provider,
      row.model,
      row.status,
      row.tokens?.input ?? '',
      row.tokens?.output ?? '',
      row.tokens?.cached ?? '',
      row.tokens?.total ?? '',
    ]
      .map(escapeCsvCell)
      .join(','),
  );
  return [header.join(','), ...lines].join('\n');
}

export type RateLimitHealth = 'healthy' | 'near_limit' | 'limit_reached' | 'cooling_down';

export interface RateLimitSnapshot {
  requestsLastMinute: number;
  tokensLastMinute: number;
  modelRequestsLastMinute: number;
  requestsToday: number;
  tokensToday: number;
  modelRequestsToday: number;
  modelTokensToday: number;
  dailyTokenLimit: number;
  dailyTokenPct: number;
  remainingDailyTokens: number | null;
  rateLimitedCount24h: number;
  errorCount24h: number;
  cooldownSeconds: number;
  status: RateLimitHealth;
}

export interface ModelUsageSummary {
  model: string;
  requestsToday: number;
  tokensToday: number;
  requests7d: number;
  tokens7d: number;
  rateLimited24h: number;
}

function localDayFromMs(nowMs: number): string {
  const d = new Date(nowMs);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function computeRateLimitSnapshot(
  entries: UsageEntry[],
  activeModel: string,
  dailyTokenLimit: number,
  cooldownSeconds: number,
  nowMs = Date.now(),
): RateLimitSnapshot {
  const oneMinuteAgo = nowMs - 60_000;
  const oneDayAgo = nowMs - 86_400_000;
  const today = localDayFromMs(nowMs);

  let requestsLastMinute = 0;
  let tokensLastMinute = 0;
  let modelRequestsLastMinute = 0;
  let requestsToday = 0;
  let tokensToday = 0;
  let modelRequestsToday = 0;
  let modelTokensToday = 0;
  let rateLimitedCount24h = 0;
  let errorCount24h = 0;

  for (const row of entries) {
    const total = row.tokens?.total ?? 0;
    if (row.at >= oneMinuteAgo) {
      requestsLastMinute++;
      tokensLastMinute += total;
      if (row.model === activeModel) modelRequestsLastMinute++;
    }
    if (row.day === today) {
      requestsToday++;
      tokensToday += total;
      if (row.model === activeModel) {
        modelRequestsToday++;
        modelTokensToday += total;
      }
    }
    if (row.at >= oneDayAgo) {
      if (row.errorStatus === 429) rateLimitedCount24h++;
      if (row.status === 'error') errorCount24h++;
    }
  }

  const safeLimit = Math.max(0, dailyTokenLimit);
  const dailyTokenPct = safeLimit > 0 ? Math.min(100, Math.round((tokensToday / safeLimit) * 100)) : 0;
  const remainingDailyTokens = safeLimit > 0 ? Math.max(0, safeLimit - tokensToday) : null;

  let status: RateLimitHealth = 'healthy';
  if (cooldownSeconds > 0) status = 'cooling_down';
  else if (safeLimit > 0 && tokensToday >= safeLimit) status = 'limit_reached';
  else if (safeLimit > 0 && dailyTokenPct >= 80) status = 'near_limit';

  return {
    requestsLastMinute,
    tokensLastMinute,
    modelRequestsLastMinute,
    requestsToday,
    tokensToday,
    modelRequestsToday,
    modelTokensToday,
    dailyTokenLimit: safeLimit,
    dailyTokenPct,
    remainingDailyTokens,
    rateLimitedCount24h,
    errorCount24h,
    cooldownSeconds: Math.max(0, Math.round(cooldownSeconds)),
    status,
  };
}

export function aggregateModelUsage(entries: UsageEntry[], nowMs = Date.now()): ModelUsageSummary[] {
  const today = localDayFromMs(nowMs);
  const sevenDaysAgo = nowMs - 7 * 86_400_000;
  const oneDayAgo = nowMs - 86_400_000;
  const byModel = new Map<string, ModelUsageSummary>();

  for (const row of entries) {
    const existing = byModel.get(row.model) ?? {
      model: row.model,
      requestsToday: 0,
      tokensToday: 0,
      requests7d: 0,
      tokens7d: 0,
      rateLimited24h: 0,
    };
    const total = row.tokens?.total ?? 0;
    if (row.day === today) {
      existing.requestsToday++;
      existing.tokensToday += total;
    }
    if (row.at >= sevenDaysAgo) {
      existing.requests7d++;
      existing.tokens7d += total;
    }
    if (row.at >= oneDayAgo && row.errorStatus === 429) {
      existing.rateLimited24h++;
    }
    byModel.set(row.model, existing);
  }

  return Array.from(byModel.values()).sort(
    (a, b) => b.tokensToday - a.tokensToday || b.tokens7d - a.tokens7d || a.model.localeCompare(b.model),
  );
}

