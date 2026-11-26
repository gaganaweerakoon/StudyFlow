import { useEffect, useRef, useState } from 'react';
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
      subjectId: session.subjectId,
      startAt: start.toISOString(),
      durationMinutes,
      type: session.blockType ?? (session.countsTowardStudy === false ? 'free' : 'study'),
      alarms: session.alarms,
    }];
  });
}

export function PublishCompanionCalendar() {
  const { sessions, subjects, focusClock, preferences, applyPhoneFocusAction, saveWorkspace } = useApp();
  const commandHandler = useRef(applyPhoneFocusAction);
  commandHandler.current = applyPhoneFocusAction;

  // The desktop timer is authoritative. Publish immediately when its phase,
  // running state, subject, or time anchor changes, not just once a minute.
  useEffect(() => {
    if (!isTauri()) return;
    let active = true;
    const publish = async () => {
      try {
        // Only acknowledge offline records after the corresponding workspace is saved.
        await saveWorkspace();
        if (!active) return;
        await invoke('local_companion', {
          action: 'publish', events: calendarEvents(sessions),
          focus: { ...focusClock, profileName: preferences.name, offlineSyncVersion: 1,
            offlineReceipts: preferences.offlineFocusReceipts,
            subjects: subjects.filter(s => !s.archived).slice(0, 100).map(({ id, code, name, color }) => ({ id, code, name, color })) },
        });
      } catch { /* The next publish retries. */ }
    };
    void publish();
    const interval = window.setInterval(() => void publish(), 30_000);
    return () => { active = false; window.clearInterval(interval); };
  }, [sessions, subjects, focusClock, preferences.name, preferences.offlineFocusReceipts, saveWorkspace]);

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
        if (active) for (const command of commands) commandHandler.current(command);
      } catch {
        // The local companion may not be initialized until the PC is paired.
      } finally {
        pending = false;
      }
    };
    void receive();
    const interval = window.setInterval(() => void receive(), 1000);
    return () => { active = false; window.clearInterval(interval); };
  }, []);

  return null;
}

interface LinkStatus { pc: string; phone: string | null; lastSync: number | null }
interface Invitation { qr: string; seconds: number }

export function DesktopPairing() {
  const { sessions, subjects, focusClock, preferences } = useApp();
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
        setQr(await invoke<Invitation>('local_companion', { action, events: calendarEvents(sessions), focus: { ...focusClock, profileName: preferences.name, offlineSyncVersion: 1, offlineReceipts: preferences.offlineFocusReceipts, subjects: subjects.filter(s => !s.archived).slice(0, 100).map(({ id, code, name, color }) => ({ id, code, name, color })) } }));
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
    <section className="space-y-5">
      <div>
        <h2 className="font-display text-[16px] font-semibold text-[var(--text-primary)]">
          Mobile Companion
        </h2>
        <p className="text-[12.5px] text-[var(--text-muted)] mt-0.5">
          Sync your desktop schedule and focus timer over local Wi-Fi with the StudyFlow mobile companion.
        </p>
      </div>

      {link?.pc && (
        <div
          className="rounded-lg px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2 text-[12.5px]"
          style={{
            backgroundColor: 'var(--bg-surface-subtle)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <span className="text-[var(--text-secondary)]">
            This PC: <strong className="font-semibold text-[var(--text-primary)]">{link.pc}</strong>
          </span>
          {link.phone && link.lastSync && (
            <span className="font-mono-num tabular-nums text-[11.5px] text-[var(--text-muted)]">
              Last synced {new Date(link.lastSync * 1000).toLocaleTimeString()}
            </span>
          )}
        </div>
      )}

      {link?.phone ? (
        <div className="space-y-3 text-[13px]">
          <p className="flex items-center gap-2 font-medium text-[var(--text-primary)]">
            <Smartphone size={16} style={{ color: 'var(--accent)' }} />
            <span>{link.phone}</span>
          </p>
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              disabled={busy}
              onClick={() => void run('invite')}
              className="inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-[12.5px] font-medium text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] transition-colors disabled:opacity-55"
              style={{
                backgroundColor: 'var(--bg-surface-subtle)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              Reconnect phone
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void run('disconnect')}
              className="inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-[12.5px] font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition-colors disabled:opacity-55"
              style={{ border: '1px solid rgba(225, 29, 72, 0.35)' }}
            >
              Disconnect
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3 text-[13px]">
          <p className="text-[var(--text-secondary)]">
            Connect both devices to the same Wi-Fi network or hotspot, then scan the pairing code.
          </p>
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              disabled={busy}
              onClick={() => void run('invite')}
              className="inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-[12.5px] font-semibold transition-opacity hover:opacity-95 disabled:opacity-55"
              style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' }}
            >
              <QrCode size={15} />
              {qr ? 'Show new code' : 'Pair phone'}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void run('test')}
              className="inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-[12.5px] font-medium text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] transition-colors disabled:opacity-55"
              style={{
                backgroundColor: 'var(--bg-surface-subtle)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              Test connection
            </button>
          </div>
        </div>
      )}

      {link?.phone && (
        <div className="pt-1">
          <button
            type="button"
            disabled={busy}
            onClick={() => void run('test')}
            className="inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-[12.5px] font-medium text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] transition-colors disabled:opacity-55"
            style={{
              backgroundColor: 'var(--bg-surface-subtle)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            Test connection
          </button>
        </div>
      )}

      {qr && (
        <div
          className="rounded-xl p-4 space-y-2.5 inline-block"
          style={{
            backgroundColor: 'var(--bg-surface-subtle)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <img
            src={qr.qr}
            alt="StudyFlow phone pairing QR code"
            className="size-56 max-w-full rounded-lg bg-white p-2 [image-rendering:pixelated]"
          />
          <p className="text-[12px] text-[var(--text-secondary)] max-w-xs">
            On your phone, tap {link?.phone ? 'Reconnect' : 'Scan QR code'}. This code expires in two minutes.
          </p>
        </div>
      )}

      {status && (
        <p
          role="status"
          className="rounded-lg px-3 py-2 text-[12px] text-[var(--text-secondary)] font-mono-num"
          style={{
            backgroundColor: 'var(--bg-surface-subtle)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          {status}
        </p>
      )}
    </section>
  );
}
