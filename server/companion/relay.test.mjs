import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { createCompanionRelay } from './relay.mjs';

test('pairing is single-use and expiring, calendar changes persist, and stale writes and revoked phones are rejected', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'studyflow-relay-'));
  const database = join(directory, 'relay.sqlite');
  const key = 'test-enrollment-key-test-enrollment-key';
  let now = 0;
  let server;
  let origin;
  async function start() {
    server = createCompanionRelay(database, key, { now: () => now });
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    origin = 'http://127.0.0.1:' + server.address().port;
  }
  async function stop() {
    if (!server?.listening) return;
    await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
  async function call(path, method, credential, body) {
    const headers = { 'Content-Type': 'application/json' };
    if (credential) headers.Authorization = 'Bearer ' + credential;
    const response = await fetch(origin + path, { method, headers, body: JSON.stringify(body) });
    return { status: response.status, data: await response.json() };
  }
  try {
    await start();
    assert.equal((await call('/v1/pairs', 'POST')).status, 401);
    const { data: expired } = await call('/v1/pairs', 'POST', key);
    now = expired.expiresAt;
    assert.equal((await call('/v1/claim', 'POST', null, expired)).status, 404);

    const { data: pair } = await call('/v1/pairs', 'POST', key);
    const { data: phone } = await call('/v1/claim', 'POST', null, pair);
    assert.ok(phone.phoneToken);
    assert.equal((await call('/v1/claim', 'POST', null, pair)).status, 404);

    const event = { id: 'chemistry', title: 'Chemistry', startAt: '2026-11-24T02:00:00Z', durationMinutes: 90 };
    const first = { revision: 0, events: [event] };
    assert.equal((await call('/v1/calendar', 'PUT', pair.desktopToken, first)).data.revision, 1);
    assert.equal((await call('/v1/calendar', 'PUT', phone.phoneToken, first)).status, 409);
    assert.equal((await call('/v1/calendar', 'PUT', phone.phoneToken, {revision: 1, events: [event, event]})).status, 400);
    assert.equal((await call('/v1/calendar', 'PUT', phone.phoneToken, {revision: 1, events: [{...event, title: 'Organic chemistry'}]})).data.revision, 2);

    await stop();
    await start();
    const { data: calendar } = await call('/v1/calendar', 'GET', pair.desktopToken);
    assert.equal(calendar.revision, 2);
    assert.equal(calendar.events[0].title, 'Organic chemistry');
    assert.equal((await call('/v1/pair', 'DELETE', phone.phoneToken)).status, 403);
    assert.equal((await call('/v1/pair', 'DELETE', pair.desktopToken)).status, 200);
    assert.equal((await call('/v1/calendar', 'GET', phone.phoneToken)).status, 401);
  } finally {
    await stop();
    await rm(directory, { recursive: true, force: true });
  }
});
