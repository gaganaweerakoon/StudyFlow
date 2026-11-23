import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { relayOrigin, relayRequest, type CompanionCalendar } from '../../src/companion/client';
import { deviceAlerts } from '../../src/companion/alarms';
import { MobileCompanionApp } from '../../src/mobile/MobileCompanionApp';
import './index.css';

interface AlarmStatus { exact: boolean; notifications: boolean }

declare global {
  interface Window {
    StudyFlowAlarms?: {
      status(): string;
      replace(alerts: string): number;
      enableExact(): void;
      enableNotifications(): void;
    };
  }
}

const storageKey = 'studyflow.companion.phone';
interface PhonePair {
  origin: string;
  token: string;
  calendar?: CompanionCalendar;
}

function AndroidCompanion() {
  const [showDemo, setShowDemo] = useState(false);
  const [pair, setPair] = useState<PhonePair | null>(() => {
    try { return JSON.parse(localStorage.getItem(storageKey) ?? 'null'); } catch { return null; }
  });
  const [address, setAddress] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');

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

  function save(next: PhonePair) {
    localStorage.setItem(storageKey, JSON.stringify(next));
    setPair(next);
  }

  async function pull(credentials: PhonePair) {
    const calendar = await relayRequest<CompanionCalendar>(credentials.origin, '/v1/calendar', 'GET', credentials.token);
    save({ ...credentials, calendar });
    setStatus('Calendar synced.');
  }

  async function run(operation: () => Promise<void>) {
    setBusy(true);
    setStatus('');
    try { await operation(); }
    catch (error) { setStatus(error instanceof Error ? error.message : String(error)); }
    finally { setBusy(false); }
  }

  if (showDemo) return <MobileCompanionApp installed />;

  const today = new Date();
  const currentEvents = (pair?.calendar?.events ?? []).filter(event => {
    return Date.parse(event.startAt) + event.durationMinutes * 60000 >= +today;
  }).sort((a, b) => a.startAt.localeCompare(b.startAt));
  const dateTime = new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col gap-5 px-5 py-8">
      <header>
        <h1 className="font-display text-2xl font-semibold">{pair ? 'Your schedule' : 'Welcome to StudyFlow'}</h1>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          {pair ? 'Calendar from your paired Windows app' : 'Open Mobile companion in Windows Settings to create a pairing code.'}
        </p>
      </header>
      {!pair ? (
        <>
          <form className="grid gap-3" onSubmit={event => {
            event.preventDefault();
            void run(async () => {
              const origin = relayOrigin(address);
              const { phoneToken } = await relayRequest<{ phoneToken: string }>(origin, '/v1/claim', 'POST', undefined, { pairingCode: code.trim() });
              const credentials = { origin, token: phoneToken };
              save(credentials);
              setCode('');
              await pull(credentials);
            });
          }}>
            <label className="grid gap-1">Relay address<input required type="url" value={address} onChange={event => setAddress(event.target.value)} placeholder="https://your-relay.example" className="min-h-12 min-w-0 rounded-xl border border-[var(--border-subtle)] px-3" /></label>
            <label className="grid gap-1">Pairing code<input required autoCapitalize="none" autoCorrect="off" value={code} onChange={event => setCode(event.target.value)} className="min-h-12 min-w-0 rounded-xl border border-[var(--border-subtle)] px-3 font-mono" /></label>
            <button disabled={busy} className="min-h-12 rounded-xl bg-[var(--accent)] px-4 font-medium text-[var(--accent-fg)]">Pair with Windows</button>
          </form>
          <button disabled={busy} className="min-h-12 rounded-xl border border-[var(--border-subtle)] px-4" onClick={() => setShowDemo(true)}>Explore the demo</button>
        </>
      ) : (
        <>
          <button disabled={busy} className="min-h-12 rounded-xl bg-[var(--accent)] px-4 font-medium text-[var(--accent-fg)]" onClick={() => void run(() => pull(pair))}>{busy ? 'Syncing…' : 'Sync calendar'}</button>
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
            localStorage.removeItem(storageKey);
            setPair(null);
            setStatus('');
          }}>Forget this pairing</button>
        </>
      )}
      {status && <p role="status" className="break-words text-sm text-[var(--text-secondary)]">{status}</p>}
    </main>
  );
}

createRoot(document.getElementById('root')!).render(<AndroidCompanion />);
