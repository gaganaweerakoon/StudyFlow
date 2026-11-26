import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { ChevronDown, Link2, Smartphone, Unlink2 } from 'lucide-react';
import { useApp } from '../context/AppContext';

export function PhoneDeliverySettings() {
  const { preferences, updatePreferences } = useApp();
  const [expanded, setExpanded] = useState(Boolean(preferences.pipCheckIns?.phoneDelivery));
  const [origin, setOrigin] = useState('');
  const [enrollment, setEnrollment] = useState('');
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);

  const paired = Boolean(preferences.pipCheckIns?.phoneDelivery);

  async function change() {
    if (busy) return;
    setBusy(true);
    try {
      const result = await invoke<{ pairingCode?: string }>('pip_relay', {
        action: paired ? 'disconnect' : 'enroll',
        origin,
        enrollment,
      });
      setEnrollment('');
      setStatus(
        result.pairingCode
          ? 'Enter this one-time code in Android Settings within ten minutes: ' + result.pairingCode
          : 'Disconnected.',
      );
      updatePreferences({
        pipCheckIns: { ...preferences.pipCheckIns, phoneDelivery: !paired },
      });
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="pt-5 space-y-3"
      style={{ borderTop: '1px solid var(--border-subtle)' }}
    >
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        aria-expanded={expanded}
        className="w-full flex items-center justify-between gap-3 text-left group"
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[14px] font-semibold text-[var(--text-primary)] font-display">
            <Smartphone className="w-4 h-4 shrink-0" style={{ color: 'var(--accent)' }} />
            <span>Android Check-in Delivery</span>
            <span className="text-[11.5px] font-normal text-[var(--text-muted)]">
              · {paired ? 'Paired' : 'Experimental'}
            </span>
          </div>
          <p className="text-[12px] text-[var(--text-muted)] mt-0.5">
            Send only the trigger type and an anonymous delivery receipt to your paired HTTPS relay. Study text stays on this PC.
          </p>
        </div>
        <ChevronDown
          className={`w-4 h-4 shrink-0 text-[var(--text-muted)] transition-transform duration-150 ${
            expanded ? 'rotate-180' : ''
          }`}
        />
      </button>

      {expanded && (
        <div className="pt-1 space-y-3.5">
          {!paired && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="block space-y-1">
                <span className="block text-[12px] font-medium text-[var(--text-secondary)]">
                  Relay address
                </span>
                <input
                  type="url"
                  placeholder="https://relay.example.com"
                  value={origin}
                  onChange={(e) => setOrigin(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-[13px] outline-none focus:ring-1 focus:ring-[var(--accent)]"
                  style={{
                    backgroundColor: 'var(--bg-surface-subtle)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-primary)',
                  }}
                />
              </label>

              <label className="block space-y-1">
                <span className="block text-[12px] font-medium text-[var(--text-secondary)]">
                  Relay enrollment key
                </span>
                <input
                  type="password"
                  autoComplete="off"
                  placeholder="Paste enrollment secret"
                  value={enrollment}
                  onChange={(e) => setEnrollment(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-[13px] outline-none focus:ring-1 focus:ring-[var(--accent)]"
                  style={{
                    backgroundColor: 'var(--bg-surface-subtle)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-primary)',
                  }}
                />
              </label>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              disabled={busy || (!paired && (!origin.trim() || !enrollment.trim()))}
              onClick={() => void change()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[12.5px] font-medium transition-colors disabled:opacity-50"
              style={
                paired
                  ? {
                      backgroundColor: 'var(--bg-surface-subtle)',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--text-primary)',
                    }
                  : {
                      backgroundColor: 'var(--accent)',
                      color: 'var(--accent-fg)',
                    }
              }
            >
              {paired ? (
                <>
                  <Unlink2 className="w-3.5 h-3.5" />
                  {busy ? 'Disconnecting…' : 'Disconnect phone delivery'}
                </>
              ) : (
                <>
                  <Link2 className="w-3.5 h-3.5" />
                  {busy ? 'Pairing…' : 'Pair for phone delivery'}
                </>
              )}
            </button>
          </div>

          {status && (
            <output
              className="block rounded-lg px-3 py-2 text-[12px] text-[var(--text-secondary)] font-mono-num"
              style={{
                backgroundColor: 'var(--bg-surface-subtle)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              {status}
            </output>
          )}
        </div>
      )}
    </div>
  );
}
