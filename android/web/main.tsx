import { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { relayRequest, type CompanionCalendar } from '../../src/companion/client';
import { deviceAlerts } from '../../src/companion/alarms';
import { QrCode, Home, CalendarDays, Timer, Settings, RefreshCw, Play, Pause } from 'lucide-react';
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


type CompanionTab = 'today' | 'calendar' | 'focus' | 'settings';
type FocusPlan = { phase: 'idle' | 'running' | 'paused' | 'done'; minutes: number; remaining: number; endAt: number; title: string };
const focusKey = 'studyflow.companion.focus.v1';
const defaultFocus: FocusPlan = { phase: 'idle', minutes: 25, remaining: 1500, endAt: 0, title: 'Independent focus session' };
function readFocus(): FocusPlan {
  try {
    const value = JSON.parse(localStorage.getItem(focusKey) ?? 'null');
    if (value && ['idle', 'running', 'paused', 'done'].includes(value.phase)
        && Number.isFinite(value.remaining) && Number.isFinite(value.minutes)
        && typeof value.title === 'string' && Number.isFinite(value.endAt)) return value;
  } catch { /* Start with an empty timer on a new device. */ }
  return defaultFocus;
}
function dayId(date: Date): string {
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
}
function dateFromId(id: string): Date {
  return new Date(id + 'T12:00:00');
}
function addDays(id: string, offset: number): string {
  const d = dateFromId(id);
  d.setDate(d.getDate() + offset);
  return dayId(d);
}
function timeOf(date: Date): string {
  return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}
function shortDate(date: Date): string {
  return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}
function shortDuration(minutes: number): string {
  const h = Math.floor(minutes / 60), m = minutes % 60;
  return h ? String(h) + 'h' + (m ? ' ' + String(m) + 'm' : '') : String(m) + 'm';
}
function eventColor(type: string): string {
  return type === 'sleep' ? '#64748b' : type === 'free' ? '#10b981' : '#4f46e5';
}
function EventCard({ event, onOpen }: { event: import('../../src/companion/client').CompanionEvent; onOpen: () => void }) {
  const start = new Date(event.startAt);
  const end = new Date(start.getTime() + event.durationMinutes * 60000);
  return (
    <button type="button" onClick={onOpen} className="w-full rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 text-left flex items-start gap-3">
      <span className="mt-1 h-10 w-1 shrink-0 rounded-full" style={{ background: eventColor(event.type) }} />
      <span className="min-w-0 flex-1">
        <span className="block font-semibold text-[var(--text-primary)] break-words">{event.title}</span>
        <span className="mt-1 block text-xs text-[var(--text-secondary)]">{timeOf(start)} – {timeOf(end)} · {shortDuration(event.durationMinutes)}</span>
      </span>
      <span className="rounded-lg bg-[var(--bg-surface-subtle)] px-2 py-1 text-[11px] font-medium capitalize text-[var(--text-secondary)]">{event.type}</span>
    </button>
  );
}
function CompanionWorkspace({
  pair, busy, offline, lastSync, alarmStatus, armed, status, diagnosticPanel,
  onSync, onReconnect, onForget, onPair
}: {
  pair: PhonePair | null;
  busy: boolean;
  offline: boolean;
  lastSync: number | undefined;
  alarmStatus: AlarmStatus | null;
  armed: number | null;
  status: string;
  diagnosticPanel: React.ReactNode;
  onSync: () => void;
  onReconnect: () => void;
  onForget: () => void;
  onPair: () => void;
}) {
  const [tab, setTab] = useState<CompanionTab>('today');
  const [selectedDay, setSelectedDay] = useState(() => dayId(new Date()));
  const [selectedEvent, setSelectedEvent] = useState<import('../../src/companion/client').CompanionEvent | null>(null);
  const [focus, setFocus] = useState<FocusPlan>(readFocus);
  const [clock, setClock] = useState(Date.now());
  const todayId = dayId(new Date(clock));
  const allEvents = (pair?.calendar?.events ?? []).slice().sort((a, b) => a.startAt.localeCompare(b.startAt));
  const todayEvents = allEvents.filter(e => dayId(new Date(e.startAt)) === todayId);
  const futureEvents = allEvents.filter(e => Date.parse(e.startAt) + e.durationMinutes * 60000 >= clock);
  const todayStudyMinutes = todayEvents.filter(e => e.type === 'study').reduce((n, e) => n + e.durationMinutes, 0);
  const nextStudy = futureEvents.find(e => e.type === 'study') ?? null;
  const calendarEvents = allEvents.filter(e => dayId(new Date(e.startAt)) === selectedDay);
  const visibleWeek = Array.from({ length: 7 }, (_, i) => {
    const current = dateFromId(selectedDay);
    return addDays(selectedDay, -(current.getDay() + 6) % 7 + i);
  });
  const remaining = focus.phase === 'running' ? Math.max(0, Math.ceil((focus.endAt - clock) / 1000)) : focus.remaining;
  const progress = Math.min(1, Math.max(0, 1 - remaining / (focus.minutes * 60)));

  useEffect(() => { localStorage.setItem(focusKey, JSON.stringify(focus)); }, [focus]);
  useEffect(() => {
    const timer = window.setInterval(() => setClock(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    if (focus.phase === 'running' && remaining <= 0) setFocus(current => ({ ...current, phase: 'done', remaining: 0, endAt: 0 }));
  }, [focus.phase, remaining]);
  function chooseDuration(minutes: number) {
    setFocus({ phase: 'idle', minutes, remaining: minutes * 60, endAt: 0, title: focus.title });
  }
  function startFocus() {
    setFocus(current => ({
      ...current, phase: 'running',
      endAt: Date.now() + (current.phase === 'paused' ? current.remaining : current.minutes * 60) * 1000,
      remaining: current.phase === 'paused' ? current.remaining : current.minutes * 60,
    }));
  }
  function pauseFocus() {
    setFocus(current => ({ ...current, phase: 'paused', remaining: Math.max(0, Math.ceil((current.endAt - Date.now()) / 1000)), endAt: 0 }));
  }
  function focusOn(event: import('../../src/companion/client').CompanionEvent) {
    setFocus({ phase: 'idle', minutes: 25, remaining: 1500, title: event.title, endAt: 0 });
    setTab('focus');
    setSelectedEvent(null);
  }
  const tabs: { id: CompanionTab; title: string; Icon: typeof Home }[] = [
    { id: 'today', title: 'Today', Icon: Home },
    { id: 'calendar', title: 'Calendar', Icon: CalendarDays },
    { id: 'focus', title: 'Focus', Icon: Timer },
    { id: 'settings', title: 'Settings', Icon: Settings },
  ];
  return (
    <div className="flex min-h-dvh flex-col bg-[var(--bg-canvas)] text-[var(--text-primary)]">
      <div className="flex-1 w-full max-w-lg mx-auto px-4 pb-6 pt-5">
        <header className="mb-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <img src={logo} alt="" className="h-9 w-9 rounded-xl" />
            <span className="font-display text-lg font-bold tracking-tight">StudyFlow</span>
          </div>
          <button type="button" onClick={() => setTab('settings')} className="flex items-center gap-2 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-2 text-xs font-semibold">
            <span className={'size-2 rounded-full ' + (pair ? 'bg-emerald-500' : 'bg-amber-500')} />
            {pair ? 'PC paired' : 'Offline'}
          </button>
        </header>
        {tab === 'today' && (
          <section className="space-y-5">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-sm text-[var(--text-muted)]">{shortDate(new Date(clock))}</p>
                <h1 className="font-display text-2xl font-bold mt-1">Today</h1>
                <p className="text-sm text-[var(--text-secondary)] mt-1">{pair ? 'Schedule from ' + (pair.pc ?? 'your PC') : 'Offline companion'}</p>
              </div>
              {pair && <button type="button" disabled={busy} onClick={onSync} className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-2 text-sm font-semibold disabled:opacity-50"><RefreshCw size={16} className="inline mr-1" /> Sync</button>}
            </div>
            {!pair && <div className="rounded-2xl bg-[var(--accent-soft)] border border-[var(--accent-border)] p-4"><h2 className="font-semibold">Your schedule isn't connected</h2><p className="mt-1 text-sm text-[var(--text-secondary)]">Pair your computer to see your actual study plan. The focus timer works offline.</p><button type="button" onClick={onPair} className="mt-3 rounded-xl bg-[var(--accent)] text-[var(--accent-fg)] px-4 py-3 font-semibold">Pair with PC</button></div>}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4"><p className="text-xs text-[var(--text-muted)]">Planned study today</p><p className="text-2xl font-bold mt-2">{shortDuration(todayStudyMinutes)}</p></div>
              <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4"><p className="text-xs text-[var(--text-muted)]">Today's blocks</p><p className="text-2xl font-bold mt-2">{todayEvents.length}</p></div>
            </div>
            <div className="rounded-2xl bg-[var(--accent)] p-5 text-[var(--accent-fg)]">
              <p className="text-sm opacity-85">Next study session</p>
              <h2 className="mt-2 font-display text-xl font-bold">{nextStudy?.title ?? 'Nothing upcoming'}</h2>
              <p className="mt-1 text-sm opacity-85">{nextStudy ? shortDate(new Date(nextStudy.startAt)) + ', ' + timeOf(new Date(nextStudy.startAt)) : 'Your calendar is clear for now.'}</p>
              <button type="button" onClick={() => nextStudy ? focusOn(nextStudy) : setTab('focus')} className="mt-4 rounded-xl bg-white/20 px-4 py-2.5 text-sm font-semibold">Open focus timer</button>
            </div>
            <div className="flex items-center justify-between"><h2 className="font-display text-lg font-bold">Your schedule</h2><button type="button" onClick={() => { setSelectedDay(todayId); setTab('calendar'); }} className="text-sm font-semibold text-[var(--accent)]">View calendar</button></div>
            <div className="space-y-2">{todayEvents.length ? todayEvents.map(e => <EventCard key={e.id} event={e} onOpen={() => setSelectedEvent(e)} />) : <p className="rounded-xl border border-[var(--border-subtle)] p-4 text-sm text-[var(--text-muted)]">No study blocks scheduled for today.</p>}</div>
          </section>
        )}
        {tab === 'calendar' && (
          <section className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div><h1 className="font-display text-2xl font-bold">Calendar</h1><p className="text-sm text-[var(--text-secondary)]">{dateFromId(selectedDay).toLocaleDateString(undefined, {month:'long', year:'numeric'})}</p></div>
              <button type="button" onClick={() => setSelectedDay(todayId)} className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-2 text-sm font-semibold">Today</button>
            </div>
            <div className="flex gap-2 items-center justify-between">
              <button type="button" onClick={() => setSelectedDay(addDays(selectedDay, -7))} aria-label="Previous week" className="min-h-10 min-w-8 rounded-xl border border-[var(--border-subtle)]">‹</button>
              <div className="grid grid-cols-7 flex-1 gap-1">
                {visibleWeek.map(id => {
                  const d = dateFromId(id), active = selectedDay === id;
                  return <button type="button" key={id} onClick={() => setSelectedDay(id)} aria-pressed={active} className={'rounded-xl py-2 min-w-0 text-center ' + (active ? 'bg-[var(--accent)] text-[var(--accent-fg)]' : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border border-[var(--border-subtle)]')}>
                    <span className="block text-[10px]">{d.toLocaleDateString(undefined, {weekday:'short'})}</span>
                    <span className="block font-bold text-sm">{d.getDate()}</span>
                  </button>;
                })}
              </div>
              <button type="button" onClick={() => setSelectedDay(addDays(selectedDay, 7))} aria-label="Next week" className="min-h-10 min-w-8 rounded-xl border border-[var(--border-subtle)]">›</button>
            </div>
            <div className="flex items-center justify-between"><h2 className="font-semibold">{dateFromId(selectedDay).toLocaleDateString(undefined, {weekday:'long', month:'short', day:'numeric'})}</h2><span className="text-sm text-[var(--text-muted)]">{calendarEvents.length} blocks</span></div>
            <div className="space-y-2">{calendarEvents.length ? calendarEvents.map(e => <EventCard key={e.id} event={e} onOpen={() => setSelectedEvent(e)} />) : <p className="rounded-xl border border-[var(--border-subtle)] p-4 text-sm text-[var(--text-muted)]">Nothing planned on this day.</p>}</div>
            <p className="text-xs text-[var(--text-muted)]">Calendar changes are managed on the Windows app. This view displays synced data.</p>
          </section>
        )}
        {tab === 'focus' && (
          <section className="space-y-5">
            <div><h1 className="font-display text-2xl font-bold">Focus</h1><p className="mt-1 text-sm text-[var(--text-secondary)]">A quiet timer that works without the PC.</p></div>
            <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 text-center">
              <p className="text-sm font-semibold text-[var(--text-secondary)] break-words">{focus.title}</p>
              <div className="relative h-60 w-60 mx-auto my-5">
                <svg viewBox="0 0 240 240" className="h-full w-full -rotate-90" aria-hidden="true">
                  <circle cx="120" cy="120" r="102" fill="none" stroke="var(--border-subtle)" strokeWidth="9" />
                  <circle cx="120" cy="120" r="102" fill="none" stroke="var(--accent)" strokeWidth="9" strokeLinecap="round" strokeDasharray={2 * Math.PI * 102} strokeDashoffset={2 * Math.PI * 102 * (1 - progress)} />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <p className="text-xs uppercase tracking-widest text-[var(--text-muted)]">{focus.phase === 'done' ? 'Complete' : focus.phase === 'running' ? 'Focusing' : focus.phase === 'paused' ? 'Paused' : 'Ready'}</p>
                  <p className="font-mono text-[40px] font-bold tabular-nums">{String(Math.floor(remaining / 60)).padStart(2, '0')}:{String(remaining % 60).padStart(2, '0')}</p>
                </div>
              </div>
              <div className="flex gap-2 justify-center">
                {focus.phase === 'running' ? <button type="button" onClick={pauseFocus} className="min-h-12 rounded-xl bg-[var(--accent)] px-7 font-semibold text-[var(--accent-fg)]"><Pause size={16} className="inline mr-2" />Pause</button> :
                  <button type="button" onClick={startFocus} className="min-h-12 rounded-xl bg-[var(--accent)] px-7 font-semibold text-[var(--accent-fg)]"><Play size={16} className="inline mr-2" />{focus.phase === 'paused' ? 'Resume' : 'Start'}</button>}
                <button type="button" onClick={() => setFocus(current => ({ ...current, phase: 'idle', remaining: current.minutes * 60, endAt: 0 }))} className="min-h-12 rounded-xl border border-[var(--border-subtle)] px-4 font-semibold">Reset</button>
              </div>
            </div>
            <h2 className="font-semibold">Focus interval</h2>
            <div className="flex gap-2">{[25, 50, 60].map(n => <button type="button" key={n} disabled={focus.phase === 'running'} onClick={() => chooseDuration(n)} className={'flex-1 rounded-xl py-3 text-sm font-semibold border disabled:opacity-40 ' + (focus.minutes === n ? 'bg-[var(--accent-soft)] text-[var(--accent)] border-[var(--accent-border)]' : 'bg-[var(--bg-surface)] border-[var(--border-subtle)]')}>{n} min</button>)}</div>
            <p className="text-xs text-[var(--text-muted)]">This timer runs locally on your phone. Completed focus time is not yet written back to your Windows study records.</p>
          </section>
        )}
        {tab === 'settings' && (
          <section className="space-y-5">
            <div><h1 className="font-display text-2xl font-bold">Settings</h1><p className="mt-1 text-sm text-[var(--text-secondary)]">Connection, reminders, and your device.</p></div>
            <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 space-y-3">
              <h2 className="font-bold">PC connection</h2>
              <p className="text-sm">{pair ? pair.pc ?? 'Paired Windows PC' : 'No computer paired'}</p>
              <p className="text-sm text-[var(--text-muted)]">{pair && lastSync ? 'Last synced ' + new Date(lastSync).toLocaleTimeString() : pair ? 'Saved calendar is available offline.' : 'Pair to receive your calendar.'}</p>
              {pair ? <><button type="button" disabled={busy} onClick={onSync} className="w-full rounded-xl bg-[var(--accent)] text-[var(--accent-fg)] min-h-12 font-semibold">{busy ? 'Syncing…' : 'Sync calendar now'}</button>
                <button type="button" disabled={busy} onClick={onReconnect} className="w-full rounded-xl border border-[var(--border-subtle)] min-h-12 font-semibold">Reconnect / Scan new QR</button>
                <button type="button" disabled={busy} onClick={onForget} className="w-full min-h-12 text-red-600 text-sm font-semibold">Forget pairing on this phone</button></> :
                <button type="button" onClick={onPair} className="w-full rounded-xl bg-[var(--accent)] text-[var(--accent-fg)] min-h-12 font-semibold">Pair with PC</button>}
            </div>
            <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 space-y-3">
              <h2 className="font-bold">Alarms & reminders</h2>
              <p className="text-sm text-[var(--text-secondary)]">{armed !== null && armed >= 0 ? armed + ' alerts scheduled on this phone.' : armed === -1 ? 'Failed to schedule alerts on this phone.' : 'Checking notifications.'}</p>
              {alarmStatus && <p className="text-xs text-[var(--text-muted)]">Notifications: {alarmStatus.notifications ? 'Allowed' : 'Off'} · Exact alarms: {alarmStatus.exact ? 'Allowed' : 'Off'}</p>}
              {alarmStatus && !alarmStatus.notifications && <button type="button" onClick={() => window.StudyFlowAlarms?.enableNotifications()} className="rounded-xl border border-[var(--border-subtle)] px-4 py-3">Enable notifications</button>}
              {alarmStatus && !alarmStatus.exact && <button type="button" onClick={() => window.StudyFlowAlarms?.enableExact()} className="rounded-xl border border-[var(--border-subtle)] px-4 py-3">Enable exact alarms</button>}
            </div>
            {diagnosticPanel}
          </section>
        )}
        {status && <p role="status" className="mt-5 text-sm text-[var(--text-secondary)]">{status}</p>}
      </div>
      <nav aria-label="Mobile navigation" className="sticky bottom-0 z-20 border-t border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2 pb-[max(8px,env(safe-area-inset-bottom))] pt-2">
        <div className="mx-auto grid max-w-lg grid-cols-4 gap-1">
          {tabs.map(({ id, title, Icon }) => <button type="button" key={id} onClick={() => { setTab(id); setSelectedEvent(null); }} aria-current={tab === id ? 'page' : undefined} className={'min-h-14 rounded-xl flex flex-col items-center justify-center gap-1 text-[11px] font-semibold ' + (tab === id ? 'bg-[var(--accent-soft)] text-[var(--accent)]' : 'text-[var(--text-muted)]')}>
            <Icon size={20} strokeWidth={tab === id ? 2.5 : 1.8} />{title}
          </button>)}
        </div>
      </nav>
      {selectedEvent && <div role="presentation" className="fixed inset-0 z-30 flex items-end justify-center bg-black/50 p-3" onClick={() => setSelectedEvent(null)}>
        <section role="dialog" aria-modal="true" aria-label="Session details" onClick={e => e.stopPropagation()} className="w-full max-w-lg rounded-2xl bg-[var(--bg-surface)] text-[var(--text-primary)] p-5 space-y-3">
          <div className="flex justify-between items-start gap-3"><h2 className="font-display text-xl font-bold break-words">{selectedEvent.title}</h2><button type="button" aria-label="Close details" onClick={() => setSelectedEvent(null)} className="px-2 text-xl">×</button></div>
          <p className="text-sm text-[var(--text-secondary)]">{shortDate(new Date(selectedEvent.startAt))} · {timeOf(new Date(selectedEvent.startAt))} – {timeOf(new Date(Date.parse(selectedEvent.startAt) + selectedEvent.durationMinutes * 60000))}</p>
          <p className="text-sm text-[var(--text-secondary)]">Type: {selectedEvent.type} · {shortDuration(selectedEvent.durationMinutes)}</p>
          {selectedEvent.type === 'study' && <button type="button" onClick={() => focusOn(selectedEvent)} className="w-full rounded-xl bg-[var(--accent)] text-[var(--accent-fg)] min-h-12 font-semibold">Focus on this session</button>}
          <button type="button" onClick={() => setSelectedEvent(null)} className="w-full rounded-xl border border-[var(--border-subtle)] min-h-12 font-semibold">Close</button>
        </section>
      </div>}
    </div>
  );
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
  const [lastScannedCode, setLastScannedCode] = useState('');
  const [manualAddress, setManualAddress] = useState('');
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
          setLastScannedCode(code);
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

  function retryWithPcIp() {
    const input = manualAddress.trim();
    const octets = input.split('.').map(Number);
    if (octets.length !== 4 || octets.some((part) => !Number.isInteger(part) || part < 0 || part > 255) ||
      !(octets[0] === 10 || (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) ||
        (octets[0] === 192 && octets[1] === 168) || (octets[0] === 169 && octets[1] === 254))) {
      setStatus('Enter the laptop’s local IPv4 address from ipconfig (for example 192.168.43.100).');
      return;
    }
    if (!lastScannedCode) {
      setStatus('Scan the PC pairing QR code before entering an address.');
      return;
    }
    // Keep the QR certificate pin and pairing credentials. Override only the destination IP.
    const payload = JSON.parse(lastScannedCode);
    window.dispatchEvent(new CustomEvent('studyflow-scan', {
      detail: { code: JSON.stringify({ ...payload, hosts: [input] }) },
    }));
  }

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
          {lastScannedCode && !busy && status && status !== 'Calendar synced.' && (
            <form className="grid gap-2 rounded-xl border border-[var(--border-subtle)] p-3 text-left" onSubmit={(event) => {
              event.preventDefault();
              retryWithPcIp();
            }}>
              <label htmlFor="pc-ip" className="text-sm font-semibold">PC not found? Enter its Wi-Fi IPv4 address</label>
              <p className="text-xs text-[var(--text-secondary)]">On Windows, open PowerShell and run ipconfig. Use the IPv4 address of the active Wi-Fi or hotspot adapter, not a VPN or virtual adapter.</p>
              <input id="pc-ip" value={manualAddress} onChange={(event) => setManualAddress(event.target.value)}
                inputMode="decimal" autoComplete="off" placeholder="192.168.43.100"
                className="min-h-11 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 text-sm" />
              <button type="submit" className="min-h-11 rounded-lg bg-[var(--accent)] px-3 font-semibold text-[var(--accent-fg)]">Retry this PC address</button>
            </form>
          )}
          {diagnostics}
          {status && <p role="status" className="break-words text-sm text-[var(--text-secondary)]">{status}</p>}
        </div>
      </main>
    );
  }

  return (
    <CompanionWorkspace
      pair={pair}
      busy={busy}
      offline={offline}
      lastSync={lastSync}
      alarmStatus={alarmStatus}
      armed={armed}
      status={status}
      diagnosticPanel={diagnostics}
      onSync={() => void pull()}
      onReconnect={() => window.StudyFlowPairing?.scan()}
      onPair={() => setOffline(false)}
      onForget={() => {
        save(null);
        setLastSync(0);
        setDiagnostic('');
        setOffline(false);
        setStatus('');
      }}
    />
  );
}

createRoot(document.getElementById('root')!).render(<AndroidCompanion />);
