import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { GEMINI_CHAT_MODELS, GEMINI_MODELS, isModelId } from './protocol.ts';
import type { UsageEntry } from './usage.ts';
import { aggregateModelUsage, computeRateLimitSnapshot } from './usageAnalytics.ts';

describe('Gemini chat models & usageAnalytics rate limits', () => {
  it('includes gemini-3.5-flash-lite and only chat models in the catalog', () => {
    assert.ok(isModelId('gemini-4-hydrogen'));
    assert.ok(isModelId('gemini-3.5-flash-lite'));
    assert.deepEqual(GEMINI_MODELS, ['gemini-3.5-flash-lite', 'gemini-4-hydrogen', 'gemini-3.1-pro-preview', 'gemini-3.8-flash']);
    assert.deepEqual(GEMINI_CHAT_MODELS.map(model => model.id), GEMINI_MODELS);
    assert.equal(isModelId('gemini-4-neon'), false);

    // Non-chat and deprecated models remain excluded
    assert.equal(isModelId('gemini-3.5-transcribe'), false);
    assert.equal(isModelId('gemini-1.5-flash'), false);
    assert.equal(isModelId('gemini-2.0-flash'), false);
    assert.equal(GEMINI_CHAT_MODELS.length, GEMINI_MODELS.length);
  });

  it('computes rolling 60s RPM/TPM, today budget progress, 24h 429 count, and cooldown health', () => {
    const now = new Date('2026-11-24T12:00:00Z').getTime();
    const today = `${new Date(now).getFullYear()}-${String(new Date(now).getMonth() + 1).padStart(2, '0')}-${String(new Date(now).getDate()).padStart(2, '0')}`;

    const entries: UsageEntry[] = [
      {
        id: '1',
        day: today,
        at: now - 15_000,
        provider: 'gemini',
        model: 'gemini-3.5-flash-lite',
        tokens: { input: 600, output: 400, cached: 0, total: 1000 },
        status: 'complete',
      },
      {
        id: '2',
        day: today,
        at: now - 40_000,
        provider: 'gemini',
        model: 'gemini-4-hydrogen',
        tokens: { input: 1500, output: 500, cached: 100, total: 2000 },
        status: 'complete',
      },
      {
        id: '3',
        day: today,
        at: now - 180_000,
        provider: 'gemini',
        model: 'gemini-3.5-flash-lite',
        status: 'error',
        errorStatus: 429,
      },
    ];

    const snap = computeRateLimitSnapshot(entries, 'gemini-3.5-flash-lite', 10_000, 0, now);
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

    const cooling = computeRateLimitSnapshot(entries, 'gemini-3.5-flash-lite', 10_000, 12, now);
    assert.equal(cooling.status, 'cooling_down');
    assert.equal(cooling.cooldownSeconds, 12);

    const perModel = aggregateModelUsage(entries, now);
    assert.equal(perModel.length, 2);
    const lite = perModel.find((m) => m.model === 'gemini-3.5-flash-lite');
    assert.equal(lite?.requestsToday, 2);
    assert.equal(lite?.rateLimited24h, 1);
  });
});
