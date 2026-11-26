// The relay only needs an opaque event fingerprint, trigger, delivery window and local day.
export function checkInQueue(db, now) {
  db.exec(`
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS pip_delivery (
      pair TEXT NOT NULL REFERENCES companion_pairs(desktop_hash) ON DELETE CASCADE,
      day TEXT NOT NULL, fingerprint TEXT NOT NULL, kind TEXT NOT NULL,
      available_at INTEGER NOT NULL, expires_at INTEGER NOT NULL, claimed INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY(pair, day), UNIQUE(pair, fingerprint)
    );
  `);
  const insert = db.prepare('INSERT OR IGNORE INTO pip_delivery(pair, day, fingerprint, kind, available_at, expires_at) VALUES (?, ?, ?, ?, ?, ?)');
  const consume = db.prepare(`UPDATE pip_delivery SET claimed=1 WHERE pair=? AND claimed=0 AND available_at<=? AND expires_at>? RETURNING day, kind, fingerprint, expires_at AS expiresAt`);
  const cancel = db.prepare('UPDATE pip_delivery SET claimed=1 WHERE pair=? AND claimed=0');
  return {
    enqueue(pair, envelope) {
      const { day, fingerprint, kind, observedAt, expiresAt } = envelope;
      const clock = now();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !/^[a-f0-9]{64}$/.test(fingerprint) ||
          !['session','milestone','task'].includes(kind) || !Number.isSafeInteger(observedAt) ||
          !Number.isSafeInteger(expiresAt) || observedAt > clock + 5000 || observedAt < clock - 60000 ||
          expiresAt <= clock || expiresAt > observedAt + 20*60000) return false;
      insert.run(pair, day, fingerprint, kind, clock, expiresAt);
      return true;
    },
    cancel(pair) { cancel.run(pair); },
    claim(pair) { const at = now(); return consume.get(pair, at, at) ?? null; },
  };
}
