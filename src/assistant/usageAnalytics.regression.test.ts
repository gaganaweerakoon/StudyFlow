import test from 'node:test';
import assert from 'node:assert/strict';
import type { UsageEntry } from './usage';
import { aggregateModelUsage, computeRateLimitSnapshot } from './usageAnalytics.ts';

const now = new Date(2026, 10, 25, 12).getTime();
const rows: UsageEntry[] = [
  { id: 'a', day: '2026-11-25', at: now - 15_000, provider: 'gemini', model: 'gemini-3.5-flash-lite', status: 'complete', tokens: { input: 600, output: 400, cached: 0, total: 1000 } },
  { id: 'b', day: '2026-11-25', at: now - 40_000, provider: 'gemini', model: 'gemini-4-hydrogen', status: 'complete', tokens: { input: 1500, output: 500, cached: 100, total: 2000 } },
  { id: 'c', day: '2026-11-25', at: now - 180_000, provider: 'gemini', model: 'gemini-3.5-flash-lite', status: 'error', errorStatus: 429 },
];
const model = 'gemini-3.5-flash-lite';

test('rolling counts and daily budget use actual reported usage', () => {
  const snap = computeRateLimitSnapshot(rows, model, 10_000, 0, now);
  assert.equal(snap.requestsLastMinute, 2);
  assert.equal(snap.tokensLastMinute, 3000);
  assert.equal(snap.modelRequestsLastMinute, 1);
  assert.equal(snap.requestsToday, 3);
  assert.equal(snap.tokensToday, 3000);
  assert.equal(snap.modelRequestsToday, 2);
  assert.equal(snap.modelTokensToday, 1000);
  assert.equal(snap.dailyTokenPct, 30);
  assert.equal(snap.remainingDailyTokens, 7000);
  assert.equal(snap.rateLimitedCount24h, 1);
  assert.equal(snap.status, 'healthy');
});

test('budget warning, exhaustion and cooldown have distinct states', () => {
  assert.equal(computeRateLimitSnapshot(rows, model, 3500, 0, now).status, 'near_limit');
  assert.equal(computeRateLimitSnapshot(rows, model, 3000, 0, now).status, 'limit_reached');
  assert.equal(computeRateLimitSnapshot(rows, model, 3000, 12, now).status, 'cooling_down');
  assert.equal(computeRateLimitSnapshot(rows, model, 0, 0, now).remainingDailyTokens, null);
});

test('per-model totals distinguish errors from reported tokens', () => {
  const summary = aggregateModelUsage(rows, now);
  assert.equal(summary.length, 2);
  const lite = summary.find(m => m.model === model);
  assert.equal(lite?.requestsToday, 2);
  assert.equal(lite?.tokensToday, 1000);
  assert.equal(lite?.rateLimited24h, 1);
});
