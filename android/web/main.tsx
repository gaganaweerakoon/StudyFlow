import { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { relayRequest, type CompanionCalendar } from '../../src/companion/client';
import { deviceAlerts } from '../../src/companion/alarms';
import { QrCode } from 'lucide-react';
import logo from '../../src-tauri/icons/icon.png';
import './index.css';

interface AlarmStatus { exact: boolean; notifications: boolean }

declare global {
  interface Window {
    StudyFlowPairing?: {
      scan(): void;
      request(id: string, endpoint: string, token: string | null): void;
    };
    StudyFlowAlarms?: {
      status(): string;
      replace(alerts: string): number;
      enableExact(): void;
      enableNotifications(): void;
    };
  }
}

const storageKey = 'studyflow.companion.phone';
const pendingKey = 'studyflow.companion.pending';
type PhonePair = { token: string; calendar?: CompanionCalendar } & (
  { origin: string; endpoint?: never; pc?: never } | { origin?: never; endpoint: string; pc: string }
);
interface LocalReply { id: string; diagnostic?: string; error?: string; token?: string; calendar?: CompanionCalendar }

function localRequest(endpoint: string, token: string | null): Promise<LocalReply> {
  const bridge = window.StudyFlowPairing;
  if (!bridge) return Promise.reject(new Error('Open the installed StudyFlow app to pair.'));
  return new Promise((resolve, reject) => {
    const id = crypto.randomUUID();
    const result = (event: Event) => {
      const data = (event as CustomEvent<LocalReply>).detail;
      if (data.id !== id) return;
      cleanup();
      if (data.error) reject(Object.assign(new Error(data.error), { diagnostic: data.diagnostic }));
      else resolve(data);
    };
    const timer = window.setTimeout(() => {
      cleanup();
      reject(new Error('The PC did not respond. Check the Wi-Fi connection and try again.'));
    }, 40_000);
    function cleanup() {
      window.clearTimeout(timer);
      window.removeEventListener('studyflow-pairing-result', result);
    }
    window.addEventListener('studyflow-pairing-result', result);
    bridge.request(id, endpoint, token);
  });
}

function AndroidCompanion() {
  const [offline, setOffline] = useState(false);
  const [pair, setPair] = useState<PhonePair | null>(() => {
    try { return JSON.parse(localStorage.getItem(storageKey) ?? 'null'); } catch { return null; }
  });
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [diagnostic, setDiagnostic] = useState('');
  const [attemptedPc, setAttemptedPc] = useState('');
  const [lastSync, setLastSync] = useState(pair?.calendar ? undefined : 0);
  const latestPair = useRef(pair);
  const syncing = useRef(false);

  const [alarmStatus, setAlarmStatus] = useState<AlarmStatus | null>(null);
  const [armed, setArmed] = useState<number | null>(null);

  useEffect(() => {
    const bridge = window.StudyFlowAlarms;
    if (!bridge) return;
    const refresh = () => setAlarmStatus(JSON.parse(bridge.status()));
    refresh();
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, []);

  useEffect(() => {
    const bridge = window.StudyFlowAlarms;
    if (!bridge) return;
    const alerts = deviceAlerts(pair?.calendar?.events ?? [], Date.now());
    setArmed(bridge.replace(JSON.stringify(alerts)));
  }, [pair, alarmStatus?.exact]);

  function save(next: PhonePair | null) {
    if (next) localStorage.setItem(storageKey, JSON.stringify(next));
    else localStorage.removeItem(storageKey);
    latestPair.current = next;
    setPair(next);
  }

  async function pull() {
    const credentials = latestPair.current;
    if (!credentials || syncing.current) return;
    syncing.current = true;
    setBusy(true);
    try {
      const result = credentials.endpoint ? await localRequest(credentials.endpoint, credentials.token) : undefined;
      const calendar = result?.calendar ?? (credentials.origin
        ? await relayRequest<CompanionCalendar>(credentials.origin, '/v1/calendar', 'GET', credentials.token)
        : undefined);
      if (!calendar) throw new Error('The PC did not return a calendar.');
      if (latestPair.current?.token !== credentials.token) return;
      if (JSON.stringify(calendar.events) !== JSON.stringify(credentials.calendar?.events)) save({ ...credentials, calendar });
      setDiagnostic(result?.diagnostic ?? '');
      setLastSync(Date.now());
      setStatus('Calendar synced.');
    } catch (error) {
      if (latestPair.current?.token === credentials.token) {
        setStatus(error instanceof Error ? error.message : String(error));
        setDiagnostic((error as { diagnostic?: string })?.diagnostic ?? '');
      }
    } finally {
      syncing.current = false;
      setBusy(false);
    }
  }

  useEffect(() => {
    const onScan = (event: Event) => {
      const { code, error } = (event as CustomEvent<{ code?: string; error?: string }>).detail;
      if (!code || syncing.current) {
        if (error) setStatus(error);
        return;
      }
      syncing.current = true;
      setBusy(true);
      setStatus('Connecting to your PC…');
      void (async () => {
        try {
          let payload;
          try { payload = JSON.parse(code); } catch { throw new Error('Scan the QR code shown in StudyFlow on your PC.'); }
          if (!payload || payload.v !== 1 || typeof payload.pc !== 'string' || !Array.isArray(payload.hosts) ||
              (payload.code !== null && typeof payload.code !== 'string') || typeof payload.pin !== 'string' || payload.port !== 8475) {
            throw new Error('Scan the QR code shown in StudyFlow on your PC.');
          }
          setAttemptedPc(payload.pc);
          const endpoint = JSON.stringify({ v: payload.v, hosts: payload.hosts, port: payload.port, pin: payload.pin });
          const existing = latestPair.current;
          let result: LocalReply;
          if (existing?.endpoint && JSON.parse(existing.endpoint).pin === payload.pin) {
            result = await localRequest(endpoint, existing.token);
            if (!result.calendar) throw new Error('The PC did not return a calendar.');
            save({ ...existing, endpoint, pc: payload.pc, calendar: result.calendar });
          } else {
            if (existing) throw new Error('Disconnect the current pairing before connecting to a different PC.');
            if (payload.code === null) throw new Error('This code is for the paired phone. Disconnect it on the PC to pair a new phone.');
            const pending = JSON.parse(localStorage.getItem(pendingKey) ?? 'null');
            const token = pending?.code === payload.code && pending?.pin === payload.pin
              ? pending.token
              : Array.from(crypto.getRandomValues(new Uint8Array(32)), byte => byte.toString(16).padStart(2, '0')).join('');
            localStorage.setItem(pendingKey, JSON.stringify({ code: payload.code, pin: payload.pin, token }));
            result = await localRequest(JSON.stringify({ ...payload, token }), null);
            if (!result.token || !result.calendar) throw new Error('The PC did not complete pairing.');
            save({ endpoint, pc: payload.pc, token: result.token, calendar: result.calendar });
            localStorage.removeItem(pendingKey);
          }
          setDiagnostic(result.diagnostic ?? '');
          setLastSync(Date.now());
          setStatus('Calendar synced.');
        } catch (failure) {
          setStatus(failure instanceof Error ? failure.message : String(failure));
          setDiagnostic((failure as { diagnostic?: string })?.diagnostic ?? '');
        } finally {
          syncing.current = false;
          setBusy(false);
        }
      })();
    };
    window.addEventListener('studyflow-scan', onScan);
    return () => window.removeEventListener('studyflow-scan', onScan);
  }, []);

  useEffect(() => {
    if (!pair?.token) return;
    const refresh = () => {
      if (document.visibilityState === 'visible') void pull();
    };
    refresh();
    const timer = window.setInterval(refresh, 10_000);
    window.addEventListener('focus', refresh);
    window.addEventListener('online', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', refresh);
      window.removeEventListener('online', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [pair?.token]);

  const today = new Date();
  const currentEvents = (pair?.calendar?.events ?? []).filter(event => {
    return Date.parse(event.startAt) + event.durationMinutes * 60000 >= +today;
  }).sort((a, b) => a.startAt.localeCompare(b.startAt));
  const dateTime = new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

  const diagnostics = diagnostic && (
    <details className="text-left text-sm text-[var(--text-secondary)]">
      <summary>Connection details</summary>
      <pre className="mt-2 whitespace-pre-wrap break-all">{diagnostic}</pre>
      <button type="button" className="mt-2 underline" onClick={() => void navigator.clipboard.writeText(`StudyFlow companion
${diagnostic}`).then(
        () => setStatus('Connection details copied.'),
        () => setStatus('Select and copy the connection details above.'),
      )}>Copy details</button>
    </details>
  );

  if (!pair && !offline) {
    return (
      <main className="flex min-h-dvh w-full px-6 py-8">
        <div className="mx-auto my-auto grid w-full max-w-xs gap-6 text-center">
          <img src={logo} alt="" className="mx-auto size-20 rounded-2xl" />
          <header className="space-y-2">
            <h1 className="font-display text-3xl font-bold tracking-tight">StudyFlow</h1>
            <p className="text-sm leading-relaxed text-[var(--text-secondary)]">Bring your study schedule to your phone.</p>
          </header>
          <div className="grid gap-2">
            <button type="button" disabled={busy} onClick={() => {
              setStatus('');
              if (window.StudyFlowPairing) window.StudyFlowPairing.scan();
              else setStatus('Open the installed StudyFlow app to scan your PC.');
            }} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-4 font-semibold text-[var(--accent-fg)] disabled:opacity-60">
              <QrCode aria-hidden="true" size={20} /> {busy ? 'Connecting…' : 'Scan QR code'}
            </button>
            <button type="button" disabled={busy} onClick={() => setOffline(true)} className="min-h-11 rounded-xl px-4 text-sm font-medium text-[var(--text-secondary)]">Use offline</button>
          </div>
          {attemptedPc && <p className="text-sm">PC: {attemptedPc}</p>}
          {diagnostics}
          {status && <p role="status" className="break-words text-sm text-[var(--text-secondary)]">{status}</p>}
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col gap-5 px-5 py-8">
      <header>
        <h1 className="font-display text-2xl font-semibold">Today</h1>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">{pair ? (pair.pc ? `Calendar from ${pair.pc}` : 'Calendar from your paired Windows app') : 'Pair your PC to bring your schedule here.'}</p>
        {!!lastSync && <p className="text-sm text-[var(--text-secondary)]">Last synced {new Date(lastSync).toLocaleTimeString()}</p>}
      </header>
      {pair ? (
        <>
          <button disabled={busy} className="min-h-12 rounded-xl bg-[var(--accent)] px-4 font-medium text-[var(--accent-fg)]" onClick={() => void pull()}>{busy ? 'Syncing…' : 'Sync calendar'}</button>
          {pair.endpoint && <button type="button" disabled={busy} className="min-h-12 rounded-xl border border-[var(--border-subtle)] px-4" onClick={() => window.StudyFlowPairing?.scan()}>Reconnect</button>}
          {alarmStatus && (
            <section className="space-y-2 rounded-xl border border-[var(--border-subtle)] p-3 text-sm">
              <h2 className="font-semibold">Alarms and reminders</h2>
              {!alarmStatus.notifications && <button className="min-h-12 underline" onClick={() => window.StudyFlowAlarms?.enableNotifications()}>Enable notifications</button>}
              {!alarmStatus.exact && <button className="min-h-12 underline" onClick={() => window.StudyFlowAlarms?.enableExact()}>Enable exact alarms</button>}
              {armed === -1 && <p>Could not save the alarm schedule on this phone.</p>}
              {armed !== null && armed >= 0 && alarmStatus.notifications && <p>{armed} upcoming alerts scheduled on this phone.</p>}
            </section>
          )}
          {currentEvents.length ? (
            <ul className="space-y-2">
              {currentEvents.map(event => (
                <li key={event.id} className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-3">
                  <p className="break-words font-semibold">{event.title}</p>
                  <p className="text-sm text-[var(--text-secondary)]">{dateTime.format(new Date(event.startAt))} · {event.durationMinutes} min</p>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-[var(--text-muted)]">No upcoming events in the synced calendar.</p>}
          <button disabled={busy} className="min-h-12 rounded-xl border border-[var(--border-subtle)] px-4" onClick={() => {
            save(null);
            setLastSync(0);
            setDiagnostic('');
            setOffline(false);
            setStatus('');
          }}>Forget this pairing</button>
        </>
      ) : <button type="button" className="min-h-12 rounded-xl bg-[var(--accent)] px-4 font-medium text-[var(--accent-fg)]" onClick={() => setOffline(false)}>Pair with PC</button>}
      {diagnostics}
      {status && <p role="status" className="break-words text-sm text-[var(--text-secondary)]">{status}</p>}
    </main>
  );
}

createRoot(document.getElementById('root')!).render(<AndroidCompanion />);
