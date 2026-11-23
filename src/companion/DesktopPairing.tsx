import { useEffect, useState } from 'react';
import { invoke, isTauri } from '@tauri-apps/api/core';
import { QrCode, Smartphone } from 'lucide-react';
import { useApp } from '../context/AppContext';
import type { StudySession } from '../types/studyflow';
import type { CompanionEvent } from './client';

function calendarEvents(sessions: StudySession[]): CompanionEvent[] {
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  return sessions.flatMap(session => {
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
}

export function PublishCompanionCalendar() {
  const { sessions, focusClock, applyPhoneFocusAction } = useApp();

  // The desktop timer is authoritative. Publish immediately when its phase,
  // running state, subject, or time anchor changes, not just once a minute.
  useEffect(() => {
    if (!isTauri()) return;
    const publish = () => void invoke('local_companion', {
      action: 'publish',
      events: calendarEvents(sessions),
      focus: focusClock,
    }).catch(() => {});
    publish();
    const interval = window.setInterval(publish, 30_000);
    return () => window.clearInterval(interval);
  }, [sessions, focusClock]);

  // Phone commands are authenticated and queued by the TLS companion service.
  // Drain them on the desktop UI thread so the real React timer state changes.
  useEffect(() => {
    if (!isTauri()) return;
    let active = true;
    let pending = false;
    type Command = Parameters<typeof applyPhoneFocusAction>[0];
    const receive = async () => {
      if (!active || pending) return;
      pending = true;
      try {
        const commands = await invoke<Command[]>('local_companion', { action: 'focus_commands' });
        if (active) for (const command of commands) applyPhoneFocusAction(command);
      } catch {
        // The local companion may not be initialized until the PC is paired.
      } finally {
        pending = false;
      }
    };
    void receive();
    const interval = window.setInterval(() => void receive(), 1000);
    return () => { active = false; window.clearInterval(interval); };
  }, [applyPhoneFocusAction]);

  return null;
}

interface LinkStatus { pc: string; phone: string | null; lastSync: number | null }
interface Invitation { qr: string; seconds: number }

export function DesktopPairing() {
  const { sessions } = useApp();
  const [link, setLink] = useState<LinkStatus>();
  const [qr, setQr] = useState<Invitation>();
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');

  useEffect(() => {
    let active = true;
    const refresh = () => void invoke<LinkStatus>('local_companion', { action: 'status' }).then(result => {
      if (active) setLink(result);
    }).catch(() => {});
    refresh();
    const timer = window.setInterval(refresh, 2000);
    return () => { active = false; window.clearInterval(timer); };
  }, []);

  useEffect(() => {
    if (!qr) return;
    const timer = window.setTimeout(() => setQr(undefined), qr.seconds * 1000);
    return () => window.clearTimeout(timer);
  }, [qr]);

  useEffect(() => {
    if (link?.phone) setQr(undefined);
  }, [link?.phone]);

  async function run(action: 'invite' | 'disconnect' | 'test') {
    setBusy(true);
    setStatus('');
    try {
      if (action === 'invite') {
        setQr(await invoke<Invitation>('local_companion', { action, events: calendarEvents(sessions) }));
      } else if (action === 'test') {
        const result = await invoke<{ pc: string; addresses: string[]; port: number }>('local_companion', { action });
        setStatus(`${result.pc} is listening on TCP ${result.port}. Local addresses: ${result.addresses.join(', ') || 'none found'}. The phone must be able to reach one of these addresses.`);
      } else {
        setQr(undefined);
        setLink(await invoke<LinkStatus>('local_companion', { action }));
      }
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4">
      <h2 className="font-display text-base font-semibold">Mobile companion</h2>
      {link?.pc && <p className="text-sm text-[var(--text-secondary)]">This PC: {link.pc}</p>}
      {link?.phone ? (
        <div className="space-y-2 text-sm">
          <p className="flex items-center gap-2"><Smartphone size={16} /> {link.phone}</p>
          {link.lastSync && <p>Last synced {new Date(link.lastSync * 1000).toLocaleTimeString()}</p>}
          <button type="button" disabled={busy} onClick={() => void run('invite')} className="mr-2 rounded border border-[var(--border-subtle)] px-4 py-2">Reconnect phone</button>
          <button type="button" disabled={busy} onClick={() => void run('disconnect')} className="rounded border border-[var(--border-subtle)] px-4 py-2">Disconnect</button>
        </div>
      ) : (
        <div className="space-y-3 text-sm">
          <p>Connect both devices to the same Wi-Fi or hotspot.</p>
          <button type="button" disabled={busy} onClick={() => void run('invite')} className="inline-flex items-center gap-2 rounded bg-[var(--accent)] px-4 py-2 text-[var(--accent-fg)]">
            <QrCode size={16} /> {qr ? 'Show new code' : 'Pair phone'}
          </button>
        </div>
      )}
      {qr && (
            <div className="space-y-2">
              <img src={qr.qr} alt="StudyFlow phone pairing QR code" className="size-64 max-w-full rounded-lg bg-white [image-rendering:pixelated]" />
              <p>On your phone, tap {link?.phone ? 'Reconnect' : 'Scan QR code'}. This code expires in two minutes.</p>
            </div>
          )}
      <button type="button" disabled={busy} onClick={() => void run('test')} className="rounded border border-[var(--border-subtle)] px-4 py-2 text-sm">Test connection</button>
      {status && <p role="status" className="text-sm text-[var(--text-secondary)]">{status}</p>}
    </section>
  );
}
