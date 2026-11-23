import { createHash, randomBytes } from 'node:crypto';
import { createServer } from 'node:http';
import { DatabaseSync } from 'node:sqlite';

const hash = (value) => createHash('sha256').update(value).digest('hex');
const token = () => randomBytes(32).toString('base64url');
const MAX_BODY_BYTES = 256 * 1024;
const PAIRING_LIFETIME_MS = 10 * 60 * 1000;
const ANDROID_ORIGIN = 'https://appassets.androidplatform.net';

class RequestError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

async function jsonBody(request) {
  const chunks = [];
  let total = 0;
  for await (const chunk of request) {
    total += chunk.length;
    if (total > MAX_BODY_BYTES) throw new RequestError(413, 'Calendar data is too large.');
    chunks.push(chunk);
  }
  let parsed;
  try {
    parsed = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new RequestError(400, 'Expected a JSON request.');
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new RequestError(400, 'Expected a JSON object.');
  }
  return parsed;
}

export function createCompanionRelay(database, enrollmentKey, { now = Date.now } = {}) {
  if (!enrollmentKey || enrollmentKey.length < 32) throw new Error('Set a private enrollment key of at least 32 characters.');
  const enrollmentHash = hash(enrollmentKey);
  const db = new DatabaseSync(database);
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA busy_timeout = 5000;
    CREATE TABLE IF NOT EXISTS companion_pairs (
      desktop_hash TEXT PRIMARY KEY,
      phone_hash TEXT UNIQUE,
      claim_hash TEXT UNIQUE,
      claim_expires INTEGER NOT NULL,
      revision INTEGER NOT NULL DEFAULT 0,
      calendar TEXT NOT NULL DEFAULT '[]'
    );
  `);
  const enroll = db.prepare('INSERT INTO companion_pairs (desktop_hash, claim_hash, claim_expires) VALUES (?, ?, ?)');
  const claim = db.prepare(`
    UPDATE companion_pairs SET phone_hash = ?, claim_hash = NULL
    WHERE claim_hash = ? AND claim_expires > ? AND phone_hash IS NULL
    RETURNING revision
  `);
  const lookup = db.prepare('SELECT * FROM companion_pairs WHERE desktop_hash = ? OR phone_hash = ?');
  const update = db.prepare(`
    UPDATE companion_pairs SET revision = revision + 1, calendar = ?
    WHERE desktop_hash = ? AND revision = ?
  `);
  const remove = db.prepare('DELETE FROM companion_pairs WHERE desktop_hash = ?');

  async function route(request) {
    const auth = /^Bearer ([A-Za-z0-9_-]{1,256})$/.exec(request.headers.authorization ?? '')?.[1];
    const credential = auth ? hash(auth) : '';
    const path = request.url;
    if (path === '/v1/pairs' && request.method === 'POST') {
      if (credential !== enrollmentHash) throw new RequestError(401, 'Enrollment authorization required.');
      const desktopToken = token();
      const pairingCode = token();
      const expiresAt = now() + PAIRING_LIFETIME_MS;
      enroll.run(hash(desktopToken), hash(pairingCode), expiresAt);
      return { desktopToken, pairingCode, expiresAt };
    }
    if (path === '/v1/claim' && request.method === 'POST') {
      const { pairingCode } = await jsonBody(request);
      if (typeof pairingCode !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(pairingCode)) {
        throw new RequestError(400, 'Enter a valid pairing code.');
      }
      const phoneToken = token();
      if (!claim.get(hash(phoneToken), hash(pairingCode), now())) {
        throw new RequestError(404, 'Pairing code is expired or already used.');
      }
      return { phoneToken };
    }
    if (path !== '/v1/calendar' && path !== '/v1/pair') throw new RequestError(404, 'Unknown endpoint.');
    if (!credential) throw new RequestError(401, 'Pair this device first.');
    const pair = lookup.get(credential, credential);
    if (!pair) throw new RequestError(401, 'This pairing is no longer active.');
    if (path === '/v1/pair' && request.method === 'DELETE') {
      if (pair.desktop_hash !== credential) throw new RequestError(403, 'Unpair from StudyFlow on Windows.');
      remove.run(credential);
      return { unpaired: true };
    }
    if (path === '/v1/calendar' && request.method === 'GET') {
      return { revision: pair.revision, events: JSON.parse(pair.calendar), paired: Boolean(pair.phone_hash) };
    }
    if (path === '/v1/calendar' && request.method === 'PUT') {
      const { revision, events } = await jsonBody(request);
      if (!Number.isSafeInteger(revision) || revision < 0 || !Array.isArray(events) ||
          events.some(event => !event || typeof event !== 'object' ||
            typeof event.id !== 'string' || !event.id || typeof event.title !== 'string' ||
            typeof event.startAt !== 'string' || !Number.isFinite(Date.parse(event.startAt)) ||
            !Number.isSafeInteger(event.durationMinutes) || event.durationMinutes < 1 || event.durationMinutes > 1440) ||
          new Set(events.map(event => event.id)).size !== events.length) {
        throw new RequestError(400, 'Expected a calendar revision and dated events with unique IDs.');
      }
      const result = update.run(JSON.stringify(events), pair.desktop_hash, revision);
      if (result.changes !== 1) throw new RequestError(409, 'Calendar changed on another device. Fetch the latest revision.');
      return { revision: revision + 1 };
    }
    throw new RequestError(405, 'Method not supported.');
  }

  const server = createServer(async (request, response) => {
    response.setHeader('Content-Type', 'application/json; charset=utf-8');
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('Vary', 'Origin');
    if (request.headers.origin === ANDROID_ORIGIN) {
      response.setHeader('Access-Control-Allow-Origin', ANDROID_ORIGIN);
      response.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
      response.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
      if (request.method === 'OPTIONS') {
        response.writeHead(204).end();
        return;
      }
    }
    try {
      response.end(JSON.stringify(await route(request)));
    } catch (error) {
      response.statusCode = error instanceof RequestError ? error.status : 500;
      response.end(JSON.stringify({ error: error instanceof RequestError ? error.message : 'Could not process sync request.' }));
    }
  });
  server.once('close', () => db.close());
  return server;
}
