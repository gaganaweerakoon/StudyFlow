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
