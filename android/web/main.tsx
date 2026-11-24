import { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { relayRequest, type CompanionCalendar, type CompanionFocusUpdate, type CompanionFocusSnapshot, type CompanionFocusCommand } from '../../src/companion/client';
import { MobileCompanionApp } from '../../src/mobile/MobileCompanionApp';
import { deviceAlerts } from '../../src/companion/alarms';
import { QrCode } from 'lucide-react';
import logo from './studyflow-icon.svg';
import './index.css';

interface AlarmStatus { exact: boolean; notifications: boolean }

declare global {
  interface Window {
    StudyFlowWidget?: { update(snapshot: string): void };
    StudyFlowPairing?: {
      scan(): void;
      request(id: string, endpoint: string, token: string | null): void;
      control(id: string, endpoint: string, token: string, command: CompanionFocusCommand, sessionId: string): void;
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
  { origin: string; endpoint?: never; pc?: never; userName?: string } | { origin?: never; endpoint: string; pc: string; userName?: string }
);
interface LocalReply {
  id: string; diagnostic?: string; error?: string;
  token?: string; calendar?: CompanionCalendar; accepted?: boolean;
  focus?: CompanionFocusSnapshot | null; serverNowMs?: number; userName?: string;
}

function localRequest(endpoint: string, token: string | null, command?: CompanionFocusCommand, sessionId = ''): Promise<LocalReply> {
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
    }, 75_000);
    function cleanup() {
      window.clearTimeout(timer);
      window.removeEventListener('studyflow-pairing-result', result);
    }
    window.addEventListener('studyflow-pairing-result', result);
    if (command && token) bridge.control(id, endpoint, token, command, sessionId);
    else bridge.request(id, endpoint, token);
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
  const [lastScannedCode, setLastScannedCode] = useState('');
  const [manualAddress, setManualAddress] = useState('');
  const [lastSync, setLastSync] = useState<number | undefined>(() => {
    const value = Number(localStorage.getItem('studyflow.phone.lastSync'));
    return Number.isFinite(value) && value > 0 ? value : 0;
  });
  useEffect(() => {
    if (lastSync) localStorage.setItem('studyflow.phone.lastSync', String(lastSync));
    else localStorage.removeItem('studyflow.phone.lastSync');
  }, [lastSync]);
  const [pcFocus, setPcFocus] = useState<CompanionFocusUpdate | undefined>();
  const [autoSync, setAutoSync] = useState(() => localStorage.getItem('studyflow.phone.autosync') !== 'false');
  const [syncIntervalSeconds, setSyncIntervalSeconds] = useState(() => {
    const stored = Number(localStorage.getItem('studyflow.phone.sync.interval'));
    return [2, 5, 15, 30].includes(stored) ? stored : 2;
  });
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

  function captureFocus(reply: LocalReply) {
    if (reply.serverNowMs && Object.prototype.hasOwnProperty.call(reply, 'focus')) {
      setPcFocus({
        focus: reply.focus ?? null, serverNowMs: reply.serverNowMs, receivedAtMs: Date.now(),
      });
    }
  }

  function updateAutoSync(enabled: boolean) {
    setAutoSync(enabled);
    localStorage.setItem('studyflow.phone.autosync', String(enabled));
  }
  function updateSyncInterval(seconds: number) {
    if (![2, 5, 15, 30].includes(seconds)) return;
    setSyncIntervalSeconds(seconds);
    localStorage.setItem('studyflow.phone.sync.interval', String(seconds));
  }

  async function sendFocusCommand(command: CompanionFocusCommand, sessionId = '') {
    const credentials = latestPair.current;
    if (!credentials?.endpoint) {
      setStatus('Connect your Windows PC before controlling its focus timer.');
      return;
    }
    try {
      const result = await localRequest(credentials.endpoint, credentials.token, command, sessionId);
      if (!result.accepted) throw new Error('PC did not accept the focus command.');
      captureFocus(result);
      setStatus('Focus command sent. Waiting for Windows to confirm…');
      // PC processes the command on its next 1-second check.
      window.setTimeout(() => void pull(true), 1200);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error));
    }
  }

  function save(next: PhonePair | null) {
    if (next) localStorage.setItem(storageKey, JSON.stringify(next));
    else localStorage.removeItem(storageKey);
    latestPair.current = next;
    setPair(next);
  }

  async function pull(silent = false) {
    const credentials = latestPair.current;
    if (!credentials || syncing.current) return;
    syncing.current = true;
    if (!silent) setBusy(true);
    try {
      const result = credentials.endpoint ? await localRequest(credentials.endpoint, credentials.token) : undefined;
      const calendar = result?.calendar ?? (credentials.origin
        ? await relayRequest<CompanionCalendar>(credentials.origin, '/v1/calendar', 'GET', credentials.token)
        : undefined);
      if (!calendar) throw new Error('The PC did not return a calendar.');
      if (latestPair.current?.token !== credentials.token) return;
      if (JSON.stringify(calendar.events) !== JSON.stringify(credentials.calendar?.events) ||
          (result?.userName && result.userName !== credentials.userName)) {
        save({ ...credentials, calendar, userName: result?.userName || credentials.userName });
      }
      if (result) captureFocus(result);
      setDiagnostic(result?.diagnostic ?? '');
      setLastSync(Date.now());
      if (!silent) setStatus('Calendar and focus synced.');
    } catch (error) {
      if (latestPair.current?.token === credentials.token) {
        if (!silent) setStatus(error instanceof Error ? error.message : String(error));
        setDiagnostic((error as { diagnostic?: string })?.diagnostic ?? '');
      }
    } finally {
      syncing.current = false;
      if (!silent) setBusy(false);
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
            save({ ...existing, endpoint, pc: payload.pc, calendar: result.calendar, userName: result.userName || existing.userName });
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
            save({ endpoint, pc: payload.pc, token: result.token, calendar: result.calendar, userName: result.userName });
            localStorage.removeItem(pendingKey);
          }
          captureFocus(result);
          setDiagnostic(result.diagnostic ?? '');
          setLastSync(Date.now());
          setStatus('Calendar and focus synced.');
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
      if (document.visibilityState === 'visible') void pull(true);
    };
    refresh();
    const timer = autoSync ? window.setInterval(refresh, syncIntervalSeconds * 1000) : undefined;
    window.addEventListener('focus', refresh);
    window.addEventListener('online', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      if (timer) window.clearInterval(timer);
      window.removeEventListener('focus', refresh);
      window.removeEventListener('online', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [pair?.token, autoSync, syncIntervalSeconds]);

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
    <MobileCompanionApp installed live={{
      isPaired: Boolean(pair),
      pcName: pair?.pc ?? 'StudyFlow PC',
      profileName: pair?.userName,
      calendar: pair?.calendar,
      lastSync,
      busy,
      onSync: () => void pull(),
      pcFocus,
      onFocusCommand: (action, sessionId) => void sendFocusCommand(action, sessionId),
      autoSync,
      syncIntervalSeconds,
      setAutoSync: updateAutoSync,
      setSyncIntervalSeconds: updateSyncInterval,
      onReconnect: () => window.StudyFlowPairing?.scan(),
      onPair: () => setOffline(false),
      onForget: () => {
        save(null);
        setLastSync(0);
        setPcFocus(undefined);
        setDiagnostic('');
        setStatus('');
        setOffline(false);
      },
      alarmStatus,
    }} />
  );
}

createRoot(document.getElementById('root')!).render(<AndroidCompanion />);
