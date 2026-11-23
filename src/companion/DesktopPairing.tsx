import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useApp } from '../context/AppContext';
import { relayOrigin, type CompanionCalendar, type CompanionEvent } from './client';

const storageKey = 'studyflow.companion.desktop';
interface DesktopPair { origin: string; token: string }

export function DesktopPairing() {
  const { sessions } = useApp();
  const [pair, setPair] = useState<DesktopPair | null>(() => {
    try { return JSON.parse(localStorage.getItem(storageKey) ?? 'null'); } catch { return null; }
  });
  const [address, setAddress] = useState(pair?.origin ?? '');
  const [enrollmentKey, setEnrollmentKey] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');

  async function run(operation: () => Promise<void>) {
    setBusy(true);
    setStatus('');
    try { await operation(); }
    catch (error) { setStatus(error instanceof Error ? error.message : String(error)); }
    finally { setBusy(false); }
  }

  function request<T>(credentials: DesktopPair, action: string, body?: unknown) {
    return invoke<T>('companion_request', { ...credentials, action, body });
  }

  async function publish(credentials: DesktopPair) {
    const calendar = await request<CompanionCalendar>(credentials, 'read');
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    const events = sessions.flatMap((session): CompanionEvent[] => {
      const start = new Date(session.date + 'T00:00:00');
      start.setMinutes(Math.round(session.startHour * 60));
      const durationMinutes = Math.round(session.durationHours * 60);
      if (!Number.isFinite(+start) || +start < cutoff || durationMinutes < 1 || durationMinutes > 1440) return [];
      return [{
        id: session.id,
        title: session.title,
        startAt: start.toISOString(),
        durationMinutes,
        type: session.blockType ?? (session.countsTowardStudy === false ? 'free' : 'study'),
        alarms: session.alarms,
      }];
    });
    await request(credentials, 'publish', { revision: calendar.revision, events });
    return events.length;
  }

  return (
    <section className="space-y-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4">
      <h2 className="font-display text-base font-semibold">Mobile companion</h2>
      {!pair ? (
        <form className="grid max-w-lg gap-3 text-sm" onSubmit={event => {
          event.preventDefault();
          void run(async () => {
            const origin = relayOrigin(address);
            const { desktopToken, pairingCode } = await request<{ desktopToken: string; pairingCode: string }>(
              { origin, token: enrollmentKey.trim() }, 'enroll',
            );
            const created = { origin, token: desktopToken };
            localStorage.setItem(storageKey, JSON.stringify(created));
            setPair(created);
            setCode(pairingCode);
            setEnrollmentKey('');
            const count = await publish(created);
            setStatus(`Calendar shared with ${count} events. Open StudyFlow on your phone to pair.`);
          });
        }}>
          <label className="grid gap-1">Relay address<input required type="url" value={address} onChange={event => setAddress(event.target.value)} className="rounded border border-[var(--border-subtle)] p-2" placeholder="https://your-relay.example" /></label>
          <label className="grid gap-1">Relay enrollment key<input required type="password" value={enrollmentKey} onChange={event => setEnrollmentKey(event.target.value)} className="rounded border border-[var(--border-subtle)] p-2" /></label>
          <button disabled={busy} className="rounded bg-[var(--accent)] px-4 py-2 text-[var(--accent-fg)]">Create pairing code</button>
        </form>
      ) : (
        <div className="space-y-3 text-sm">
          <p>{pair.origin}</p>
          {code && <label className="grid max-w-lg gap-1">One-time pairing code<input readOnly value={code} onFocus={event => event.target.select()} className="rounded border border-[var(--border-subtle)] p-2 font-mono" /></label>}
          <div className="flex flex-wrap gap-3">
            <button disabled={busy} onClick={() => void run(async () => {
              const count = await publish(pair);
              setStatus(`Calendar shared with ${count} events.`);
            })} className="rounded bg-[var(--accent)] px-4 py-2 text-[var(--accent-fg)]">Share calendar</button>
            <button disabled={busy} onClick={() => void run(async () => {
              await request(pair, 'unpair');
              localStorage.removeItem(storageKey);
              setPair(null);
              setCode('');
              setStatus('Pairing revoked.');
            })} className="rounded border border-[var(--border-subtle)] px-4 py-2">Revoke pairing</button>
          </div>
        </div>
      )}
      {status && <p role="status" className="text-sm text-[var(--text-secondary)]">{status}</p>}
    </section>
  );
}
