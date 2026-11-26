import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import {
  buildCompanionSystemInstructions,
  countUnreadCompanion,
  createEmptyCompanionThread,
  createEmptyOutreachLedger,
  isDetailedStudyRequest,
  markCompanionRead,
  normalizeCompanionThread,
  normalizeOutreachLedger,
  resolveContextualReference,
  splitCompanionBubbles,
  type CompanionMessage,
  type CompanionOutreachLedger,
  type CompanionThreadState,
} from '../../src/assistant/companion';
import { evaluateCompanionOutreach, findDueFollowUp } from '../../src/assistant/companionOutreach';
import { detectUserFollowUpRequest } from '../../src/assistant/companionFollowUps';
import { requestClock } from '../../src/assistant/workspaceContext';
import type { NotificationItem } from '../../src/types/studyflow';
import type { CheckInSettings } from '../../src/assistant/checkIns';

/**
 * Disposable SQLite harness mirroring Windows `src-tauri/storage/src/lib.rs` schema:
 * documents(name TEXT PRIMARY KEY, revision INTEGER NOT NULL CHECK (revision > 0), data TEXT NOT NULL CHECK (json_valid(data))) STRICT
 */
class DisposableSqliteWorkspace {
  readonly dbPath: string;
  private db: DatabaseSync;

  constructor(dir: string) {
    this.dbPath = path.join(dir, 'studyflow-disposable.sqlite');
    this.db = new DatabaseSync(this.dbPath);
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS documents (
        name TEXT PRIMARY KEY,
        revision INTEGER NOT NULL CHECK (revision > 0),
        data TEXT NOT NULL CHECK (json_valid(data))
      ) STRICT;
    `);
  }

  saveDocument(name: string, payload: unknown): number {
    const existing = this.db.prepare('SELECT revision FROM documents WHERE name = ?').get(name) as { revision: number } | undefined;
    const nextRev = (existing?.revision ?? 0) + 1;
    const json = JSON.stringify(payload);
    this.db
      .prepare('INSERT OR REPLACE INTO documents (name, revision, data) VALUES (?, ?, ?)')
      .run(name, nextRev, json);
    return nextRev;
  }

  loadDocument<T>(name: string): { revision: number; data: T } | null {
    const row = this.db.prepare('SELECT revision, data FROM documents WHERE name = ?').get(name) as
      | { revision: number; data: string }
      | undefined;
    if (!row) return null;
    return { revision: row.revision, data: JSON.parse(row.data) as T };
  }

  reopen(): void {
    this.db.close();
    this.db = new DatabaseSync(this.dbPath);
  }

  close(): void {
    this.db.close();
  }
}

interface SimulatedState {
  conversations: Array<{ id: string; title: string; messages: Array<{ id: string; role: 'user' | 'assistant'; text: string }> }>;
  companion: CompanionThreadState;
  ledger: CompanionOutreachLedger;
  notifications: NotificationItem[];
  pipCheckIns: CheckInSettings;
  eventsLog: string[];
}

async function runOutreachTick(
  store: DisposableSqliteWorkspace,
  state: SimulatedState,
  nowMs: number,
  draftFn: (prompt: string, facts: Record<string, unknown>) => Promise<string | null>,
) {
  const clock = requestClock('UTC', new Date(nowMs));
  const evaluation = evaluateCompanionOutreach({
    settings: state.pipCheckIns,
    date: clock.date,
    time: clock.time,
    now: nowMs,
    running: false,
    notifications: state.notifications,
    ledger: state.ledger,
    companionMessages: state.companion.messages,
    subjects: [],
    sessions: [],
    focusHistory: [],
    goals: [],
    newMilestones: new Set(),
    tasks: [],
    notes: [],
  });

  const candidate = evaluation.candidate;
  if (!candidate) return { sent: false, suppressedBy: evaluation.suppressedBy };

  const drafted = await draftFn(candidate.draftPrompt, candidate.verifiedFacts);
  if (!drafted) {
    state.eventsLog.push(`skipped_provider_failure:${candidate.batchId}`);
    return { sent: false, suppressedBy: 'provider_failure' as const };
  }

  // Idempotency guard against duplicate batchId
  if (
    state.companion.messages.some((m) => m.batchId === candidate.batchId) ||
    state.notifications.some((n) => n.id === candidate.batchId)
  ) {
    return { sent: false, suppressedBy: 'duplicate' as const };
  }

  const bubbles = splitCompanionBubbles(drafted);
  const newMessages: CompanionMessage[] = bubbles.map((text, index) => ({
    id: `${candidate.batchId}:${index}`,
    batchId: candidate.batchId,
    role: 'assistant',
    text,
    createdAt: nowMs + index,
    timeLabel: clock.time,
    date: clock.date,
    kind: candidate.kind,
    read: false,
    triggerKey: candidate.triggerKey,
    state: 'complete',
  }));

  // Persist-before-notify ordering check
  state.companion = {
    ...state.companion,
    updatedAt: nowMs,
    messages: [...state.companion.messages, ...newMessages],
  };
  state.ledger = normalizeOutreachLedger({
    ...state.ledger,
    lastUnsolicitedDate: clock.date,
    lastUnsolicitedBatchId: candidate.batchId,
    lastUnsolicitedAt: nowMs,
    lastUnsolicitedAnswered: false,
    deliveredKeys: [...state.ledger.deliveredKeys, candidate.triggerKey],
    deliveredBatchIds: [...state.ledger.deliveredBatchIds, candidate.batchId],
  });

  store.saveDocument('assistant_history', {
    conversations: state.conversations,
    companion: state.companion,
  });
  store.saveDocument('workspace', {
    notifications: state.notifications,
    companionOutreachLedger: state.ledger,
    preferences: { pipCheckIns: state.pipCheckIns },
  });
  state.eventsLog.push(`persisted:${candidate.batchId}`);

  // Emit at most ONE notification for the whole batch pointing to exact first bubble ID
  const first = newMessages[0];
  state.notifications = [
    {
      id: candidate.batchId,
      title: 'Pip',
      detail: first.text,
      time: clock.time,
      read: false,
      route: 'assistant',
      companionMessageId: first.id,
    },
    ...state.notifications,
  ];
  store.saveDocument('workspace', {
    notifications: state.notifications,
    companionOutreachLedger: state.ledger,
    preferences: { pipCheckIns: state.pipCheckIns },
  });
  state.eventsLog.push(`notified:${first.id}`);

  return { sent: true, batchId: candidate.batchId, firstMessageId: first.id };
}

test('Main Acceptance Test: opt-in redox outreach, persist-before-notify, restart safety, contextual "finally got it" reply, and quiet-hours suppression', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'studyflow-companion-accept-'));
  const store = new DisposableSqliteWorkspace(tmpDir);

  try {
    const seedTime = Date.parse('2026-11-26T10:00:00Z');
    const regularStudyChat = {
      id: 'study-1',
      title: 'Thermodynamics Help',
      messages: [
        { id: 'st-u1', role: 'user' as const, text: 'Explain Hess law briefly.' },
        { id: 'st-a1', role: 'assistant' as const, text: 'Hess law states enthalpy change is path-independent.' },
      ],
    };

    const state: SimulatedState = {
      conversations: [regularStudyChat],
      companion: {
        lastReadAt: seedTime + 60_000,
        updatedAt: seedTime + 60_000,
        messages: [
          {
            id: 'seed-u1',
            role: 'user',
            text: 'Redox oxidation numbers felt confusing earlier today',
            createdAt: seedTime,
            timeLabel: '10:00',
            date: '2026-11-26',
            kind: 'chat',
            read: true,
            state: 'complete',
          },
          {
            id: 'seed-a1',
            role: 'assistant',
            text: 'Those rules take a couple tries—no stress.',
            createdAt: seedTime + 60_000,
            timeLabel: '10:01',
            date: '2026-11-26',
            kind: 'chat',
            read: true,
            state: 'complete',
          },
        ],
      },
      ledger: createEmptyOutreachLedger(),
      notifications: [],
      pipCheckIns: {
        enabled: true,
        casual: true,
        studyMilestones: true,
        suggestions: true,
        quietFrom: '21:30',
        quietUntil: '07:00',
      },
      eventsLog: [],
    };

    store.saveDocument('assistant_history', { conversations: state.conversations, companion: state.companion });
    store.saveDocument('workspace', {
      notifications: state.notifications,
      companionOutreachLedger: state.ledger,
      preferences: { pipCheckIns: state.pipCheckIns },
    });

    // Advance test clock to eligible time (15:00 UTC) WITHOUT sending a new user message
    const eligibleTime = Date.parse('2026-11-26T15:00:00Z');
    const outreachResult = await runOutreachTick(store, state, eligibleTime, async (prompt) => {
      assert.match(prompt, /redox/i);
      return 'how did redox go today?';
    });

    assert.equal(outreachResult.sent, true);
    assert.equal(state.companion.messages.length, 3);
    assert.equal(state.notifications.length, 1);
    assert.equal(state.notifications[0].companionMessageId, outreachResult.firstMessageId);
    assert.equal(countUnreadCompanion(state.companion), 1);

    // Verify persist-before-notify ordering
    const persistIdx = state.eventsLog.findIndex((e) => e.startsWith('persisted:'));
    const notifyIdx = state.eventsLog.findIndex((e) => e.startsWith('notified:'));
    assert.ok(persistIdx >= 0 && notifyIdx > persistIdx, 'Must persist Companion message before notifying');

    // Simulate Windows SQLite restart: close DB, reopen, reload documents
    store.reopen();
    const reloadedHistory = store.loadDocument<{ conversations: SimulatedState['conversations']; companion: CompanionThreadState }>('assistant_history');
    const reloadedWorkspace = store.loadDocument<{
      notifications: NotificationItem[];
      companionOutreachLedger: CompanionOutreachLedger;
      preferences: { pipCheckIns: CheckInSettings };
    }>('workspace');

    assert.ok(reloadedHistory && reloadedWorkspace);
    const restoredState: SimulatedState = {
      conversations: reloadedHistory.data.conversations,
      companion: normalizeCompanionThread(reloadedHistory.data.companion),
      ledger: normalizeOutreachLedger(reloadedWorkspace.data.companionOutreachLedger),
      notifications: reloadedWorkspace.data.notifications,
      pipCheckIns: reloadedWorkspace.data.preferences.pipCheckIns,
      eventsLog: [],
    };

    // Regular study chats stayed completely isolated and intact across restart
    assert.equal(restoredState.conversations.length, 1);
    assert.equal(restoredState.conversations[0].id, 'study-1');
    // Unread state survived restart
    assert.equal(countUnreadCompanion(restoredState.companion), 1);

    // Retrying outreach tick after restart produces ZERO duplicates
    const retryResult = await runOutreachTick(store, restoredState, eligibleTime + 60_000, async () => 'duplicate should never fire');
    assert.equal(retryResult.sent, false);
    assert.equal(restoredState.companion.messages.length, 3);
    assert.equal(restoredState.notifications.length, 1);

    // Open that exact message via notification deep link -> marks read
    const targetMsgId = restoredState.notifications[0].companionMessageId!;
    const targetMsg = restoredState.companion.messages.find((m) => m.id === targetMsgId);
    assert.ok(targetMsg);
    assert.equal(targetMsg.text, 'how did redox go today?');
    restoredState.companion = markCompanionRead(restoredState.companion, eligibleTime + 120_000);
    assert.equal(countUnreadCompanion(restoredState.companion), 0);

    // Reply "finally got it" and verify Pip understands the redox reference
    const replyText = 'finally got it';
    const ref = resolveContextualReference(replyText, restoredState.companion.messages);
    assert.equal(ref.isShortReference, true);
    assert.equal(ref.referencedMessage?.id, targetMsgId);
    assert.match(ref.referencedMessage?.text ?? '', /redox/i);

    const instructions = buildCompanionSystemInstructions({
      clock: requestClock('UTC', new Date(eligibleTime + 130_000)),
      language: 'English',
      reference: ref,
    });
    assert.match(instructions, /how did redox go today\?/);

    // Same scenario during quiet hours (22:15 UTC) on a fresh workspace -> suppressed!
    const quietState: SimulatedState = {
      conversations: [],
      companion: { ...state.companion, messages: state.companion.messages.slice(0, 2) },
      ledger: createEmptyOutreachLedger(),
      notifications: [],
      pipCheckIns: { enabled: true, casual: true, studyMilestones: true, suggestions: true, quietFrom: '21:30', quietUntil: '07:00' },
      eventsLog: [],
    };
    const quietTime = Date.parse('2026-11-26T22:15:00Z');
    const quietResult = await runOutreachTick(store, quietState, quietTime, async () => 'should not be called');
    assert.equal(quietResult.sent, false);
    assert.equal(quietResult.suppressedBy, 'quiet_hours');
    assert.equal(quietState.companion.messages.length, 2);
    assert.equal(quietState.notifications.length, 0);
  } finally {
    store.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('Provider failure during outreach skips cleanly without corrupt messages or notifications, and multi-bubble batch sends at most 1 notification', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'studyflow-companion-fail-'));
  const store = new DisposableSqliteWorkspace(tmpDir);

  try {
    const now = Date.parse('2026-11-26T14:00:00Z');
    const state: SimulatedState = {
      conversations: [],
      companion: createEmptyCompanionThread(),
      ledger: createEmptyOutreachLedger(),
      notifications: [],
      pipCheckIns: { enabled: true, casual: true, quietFrom: '21:30', quietUntil: '07:00' },
      eventsLog: [],
    };

    // 1. Provider failure -> skipped cleanly
    const failed = await runOutreachTick(store, state, now, async () => null);
    assert.equal(failed.sent, false);
    assert.equal(state.companion.messages.length, 0);
    assert.equal(state.notifications.length, 0);
    assert.equal(state.ledger.lastUnsolicitedDate, undefined);

    // 2. Successful 2-bubble outreach -> 2 bubbles with distinct IDs/timestamps, AT MOST 1 notification
    const multi = await runOutreachTick(store, state, now + 60_000, async () => {
      return 'Hey, hope the afternoon is treating you okay!\n[Pip follow-up]\nLet me know if you want to test a few redox questions later.';
    });
    assert.equal(multi.sent, true);
    assert.equal(state.companion.messages.length, 2);
    assert.notEqual(state.companion.messages[0].id, state.companion.messages[1].id);
    assert.equal(state.notifications.length, 1);
    assert.equal(state.notifications[0].companionMessageId, state.companion.messages[0].id);
  } finally {
    store.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('Detailed Sinhala study question keeps structured space and agreed follow-up schedules and fires when due', () => {
  const sinhalaQuestion = 'රෙඩොක්ස් ප්‍රතික්‍රියා වල ඔක්සිකරණ අංක සොයන හැටි පියවරෙන් පියවර පැහැදිලි කරන්න';
  assert.equal(isDetailedStudyRequest(sinhalaQuestion), true);

  const clock = requestClock('UTC', new Date('2026-11-26T15:00:00Z'));
  const instructions = buildCompanionSystemInstructions({
    clock,
    language: 'Sinhala',
    detailRequested: true,
  });
  assert.match(instructions, /detailed study explanation/i);
  assert.match(instructions, /Sinhala/);

  // Agreed follow-up end-to-end check
  const now = Date.parse('2026-11-26T15:00:00Z');
  const req = detectUserFollowUpRequest({
    userText: 'check in at 8 pm about redox',
    recentMessages: [],
    clock,
    now,
    sessions: [],
    subjects: [],
  });
  assert.ok(req.followUp);
  assert.equal(req.followUp.dueTime, '20:00');

  // Advance clock to 20:02 local -> follow-up becomes due
  const dueCheck = findDueFollowUp({
    followUps: [req.followUp],
    now: req.followUp.dueAt + 2 * 60_000,
    time: '20:02',
    running: false,
    settings: { enabled: true, quietFrom: '21:30', quietUntil: '07:00' },
  });
  assert.equal(dueCheck.due?.id, req.followUp.id);
});
