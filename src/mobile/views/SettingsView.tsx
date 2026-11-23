import React from 'react';
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  ChevronRight,
  Laptop,
  Moon,
  QrCode,
  ShieldCheck,
} from 'lucide-react';
import { ADVANCE_NOTICE_CHOICES, useCompanion } from '../CompanionContext';
import { THEME_OPTIONS, ACCENT_PRESETS } from '../../data/mockData';
import { getWakeUpReadiness } from '../companionLogic';

export const SettingsView: React.FC = () => {
  const {
    nowAbsMin,
    blocks,
    liveMode,
    syncOptions,
    snoozedWakeUp,
    connection,
    permissions,
    settings,
    updateSettings,
    setTheme,
    setPermission,
    setConnectionSheetOpen,
    setPairingOpen,
    showPhoneToast,
  } = useCompanion();

  const readiness = getWakeUpReadiness(blocks, nowAbsMin, permissions, snoozedWakeUp);

  const sectionCardStyle: React.CSSProperties = {
    backgroundColor: 'var(--bg-surface)',
    border: '1px solid var(--border-subtle)',
    boxShadow: 'var(--shadow-subtle)',
  };

  return (
    <div className="px-4 pb-8 pt-3 space-y-5">
      <header>
        <h1 className="font-display text-[calc(20px*var(--sf-font-scale,1))] font-semibold text-[var(--text-primary)]">
          Settings
        </h1>
        <p className="text-[calc(12.5px*var(--sf-font-scale,1))] text-[var(--text-muted)] mt-0.5">
          Sync, reminders, sleep alarms, and Android permissions
        </p>
      </header>

      {/* 1. Paired PC */}
      <section aria-label="Paired PC" className="space-y-2">
        <h2 className="font-display text-[calc(13px*var(--sf-font-scale,1))] font-semibold text-[var(--text-secondary)] px-0.5">
          Paired PC
        </h2>
        <div className="rounded-xl overflow-hidden divide-y" style={sectionCardStyle}>
          <button
            type="button"
            onClick={() => setConnectionSheetOpen(true)}
            className="w-full min-h-[64px] px-4 py-3 flex items-center justify-between gap-3 text-left transition-colors hover:bg-[var(--bg-surface-hover)]"
            style={{ borderColor: 'var(--border-subtle)' }}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                style={{
                  backgroundColor: 'var(--bg-surface-subtle)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--accent)',
                }}
              >
                <Laptop className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-[calc(14px*var(--sf-font-scale,1))] font-semibold text-[var(--text-primary)] truncate">
                  {connection.isPaired ? connection.pcName : 'No PC paired'}
                </div>
                <div className="text-[calc(12px*var(--sf-font-scale,1))] text-[var(--text-muted)] truncate">
                  {connection.isPaired
                    ? `${
                        connection.mode === 'internet'
                          ? 'Internet'
                          : connection.mode === 'bluetooth'
                          ? 'Bluetooth nearby'
                          : connection.mode === 'syncing'
                          ? 'Syncing…'
                          : 'Offline'
                      } · Last sync ${connection.lastSyncedLabel}`
                    : 'Pair with StudyFlow on Windows to sync schedule and focus'}
                </div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 shrink-0 text-[var(--text-muted)]" />
          </button>

          <button
            type="button"
            onClick={() => setPairingOpen(true)}
            className="w-full min-h-[52px] px-4 py-2.5 flex items-center justify-between gap-2 text-left text-[calc(13.5px*var(--sf-font-scale,1))] font-medium transition-colors hover:bg-[var(--bg-surface-hover)]"
            style={{ borderColor: 'var(--border-subtle)', color: 'var(--accent)' }}
          >
            <span className="inline-flex items-center gap-2">
              <QrCode className="w-4 h-4" />
              {connection.isPaired ? 'Replay PC pairing flow' : 'Pair a Windows PC'}
            </span>
            <ChevronRight className="w-4 h-4 text-[var(--text-muted)]" />
          </button>
        </div>
      </section>

      {liveMode && syncOptions && (
        <section aria-label="Live sync options" className="space-y-2">
          <h2 className="font-display text-[calc(13px*var(--sf-font-scale,1))] font-semibold text-[var(--text-secondary)] px-0.5">Live synchronization</h2>
          <div className="rounded-xl p-4 space-y-3" style={sectionCardStyle}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-[var(--text-primary)]">Auto-sync calendar & focus</p>
                <p className="text-xs text-[var(--text-muted)] mt-1">While this app is open, follow PC starts, pauses, resumes and completions.</p>
              </div>
              <button type="button" role="switch" aria-checked={syncOptions.autoSync} onClick={() => syncOptions.setAutoSync(!syncOptions.autoSync)}
                className="min-w-[52px] min-h-[44px] flex items-center justify-center" aria-label="Automatically sync with PC">
                <span className="flex w-11 h-6 rounded-full p-0.5" style={{ background: syncOptions.autoSync ? 'var(--accent)' : 'var(--border-strong)', justifyContent: syncOptions.autoSync ? 'flex-end' : 'flex-start' }}><span className="h-5 w-5 rounded-full bg-white shadow-sm" /></span>
              </button>
            </div>
            <label className="flex items-center justify-between gap-3 text-sm">
              <span className="font-medium text-[var(--text-primary)]">Refresh interval</span>
              <select aria-label="Automatic sync interval" disabled={!syncOptions.autoSync} value={syncOptions.intervalSeconds}
                onChange={event => syncOptions.setIntervalSeconds(Number(event.target.value))}
                className="min-h-11 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 text-sm">
                <option value={2}>2 seconds</option><option value={5}>5 seconds</option>
                <option value={15}>15 seconds</option><option value={30}>30 seconds</option>
              </select>
            </label>
            <p className="text-xs text-[var(--text-muted)]">Focus state comes from Windows. Android can request timer controls, but focus history is still logged on Windows. Updates may pause when Android suspends the app.</p>
          </div>
        </section>
      )}

      {/* 2. Session Reminders */}
      <section aria-label="Session reminders" className="space-y-2">
        <h2 className="font-display text-[calc(13px*var(--sf-font-scale,1))] font-semibold text-[var(--text-secondary)] px-0.5">
          Session reminders
        </h2>
        <div className="rounded-xl p-4 space-y-4" style={sectionCardStyle}>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-[calc(13.5px*var(--sf-font-scale,1))] font-medium text-[var(--text-primary)]">
              <Bell className="w-4 h-4 text-[var(--text-secondary)]" />
              Default advance heads-up
            </div>
            <div
              className="grid grid-cols-3 gap-1 p-1 rounded-xl"
              style={{
                backgroundColor: 'var(--bg-surface-subtle)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              {ADVANCE_NOTICE_CHOICES.map((opt) => {
                const active = settings.defaultAdvanceNotice === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      updateSettings({ defaultAdvanceNotice: opt.value });
                      showPhoneToast(
                        opt.value === 0
                          ? 'Default heads-up turned off'
                          : `Default heads-up set to ${opt.label}`
                      );
                    }}
                    className="min-h-[42px] rounded-lg text-[calc(13px*var(--sf-font-scale,1))] font-medium transition-colors"
                    style={{
                      backgroundColor: active ? 'var(--bg-surface)' : 'transparent',
                      color: active ? 'var(--text-primary)' : 'var(--text-muted)',
                      boxShadow: active ? 'var(--shadow-subtle)' : 'none',
                    }}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div
            className="pt-3 flex items-center justify-between gap-3"
            style={{ borderTop: '1px solid var(--border-subtle)' }}
          >
            <div>
              <div className="text-[calc(13.5px*var(--sf-font-scale,1))] font-medium text-[var(--text-primary)]">
                Ring at session start
              </div>
              <div className="text-[calc(12px*var(--sf-font-scale,1))] text-[var(--text-muted)]">
                Full-screen alarm for new study sessions
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={settings.defaultRingAtStart}
              aria-label="Ring at session start by default"
              onClick={() => updateSettings({ defaultRingAtStart: !settings.defaultRingAtStart })}
              className="min-w-[52px] min-h-[48px] flex items-center justify-end"
            >
              <span
                className="w-11 h-6 rounded-full p-0.5 transition-colors flex items-center"
                style={{
                  backgroundColor: settings.defaultRingAtStart
                    ? 'var(--accent)'
                    : 'var(--border-strong)',
                  justifyContent: settings.defaultRingAtStart ? 'flex-end' : 'flex-start',
                }}
              >
                <span className="w-5 h-5 rounded-full bg-white shadow-sm" />
              </span>
            </button>
          </div>
        </div>
      </section>

      <section aria-label="Appearance" className="space-y-2">
        <h2 className="font-display text-[calc(13px*var(--sf-font-scale,1))] font-semibold text-[var(--text-secondary)] px-0.5">
          Appearance
        </h2>
        <div className="rounded-xl p-4 space-y-4" style={sectionCardStyle}>
          <div className="grid grid-cols-2 gap-2">
            {THEME_OPTIONS.map(theme => (
              <button type="button" key={theme.id} aria-pressed={settings.theme === theme.id}
                onClick={() => setTheme(theme.id)}
                className="min-h-[70px] rounded-xl p-3 flex flex-col items-start gap-2 text-left"
                style={{ border: settings.theme === theme.id ? '2px solid var(--accent)' : '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-surface-subtle)' }}>
                <span className="flex gap-1">
                  {theme.swatches.map((color,index) => (
                    <span key={index} className="h-4 w-6 rounded border border-black/10" style={{ backgroundColor: color }} />
                  ))}
                </span>
                <span className="text-[12px] font-semibold text-[var(--text-primary)]">{theme.name}{settings.theme === theme.id ? ' ✓' : ''}</span>
              </button>
            ))}
          </div>
          <div>
            <p className="text-xs font-medium text-[var(--text-secondary)] mb-2">Accent color</p>
            <div className="flex flex-wrap gap-2">
              {ACCENT_PRESETS.map(accent => <button key={accent.name} type="button"
                title={accent.name} aria-label={accent.name + ' accent'}
                aria-pressed={settings.accentColor === accent.hex}
                onClick={() => updateSettings({ accentColor: accent.hex })}
                className="h-10 w-10 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: accent.hex, border: settings.accentColor === accent.hex ? '3px solid var(--text-primary)' : '2px solid var(--bg-surface)' }}>
                {settings.accentColor === accent.hex && <span className="text-white font-bold">✓</span>}
              </button>)}
            </div>
          </div>
          <p className="text-xs text-[var(--text-muted)]">Theme choices are saved on this phone. The Windows theme is not changed.</p>
        </div>
      </section>

      {/* 3. Sleep and Wake-Up */}
      <section aria-label="Sleep and wake-up" className="space-y-2">
        <h2 className="font-display text-[calc(13px*var(--sf-font-scale,1))] font-semibold text-[var(--text-secondary)] px-0.5">
          Sleep and wake-up
        </h2>
        <div className="rounded-xl p-4 space-y-3.5" style={sectionCardStyle}>
          {/* Readiness Status Banner */}
          <div
            className="rounded-xl p-3 space-y-2"
            style={{
              backgroundColor: 'var(--bg-surface-subtle)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <div className="flex items-start gap-2.5">
              {readiness.ready ? (
                <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-emerald-600" />
              ) : (
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-amber-600" />
              )}
              <div className="space-y-1 min-w-0">
                <p className="text-[calc(13px*var(--sf-font-scale,1))] font-semibold text-[var(--text-primary)] leading-snug">
                  {readiness.statusText}
                </p>
                {readiness.blockerReason && (
                  <p className="text-[calc(12px*var(--sf-font-scale,1))] text-[var(--text-secondary)]">
                    {readiness.blockerReason}
                  </p>
                )}
              </div>
            </div>

            {!permissions.exactAlarms && (
              <button
                type="button"
                onClick={() => {
                  setPermission('exactAlarms', true);
                  showPhoneToast('Exact alarm access enabled');
                }}
                className="w-full min-h-[48px] rounded-xl text-[calc(13px*var(--sf-font-scale,1))] font-semibold transition-opacity hover:opacity-90"
                style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' }}
              >
                Enable exact alarms
              </button>
            )}
          </div>

          <div className="flex items-center justify-between gap-2 text-[calc(12.5px*var(--sf-font-scale,1))] text-[var(--text-secondary)]">
            <span className="inline-flex items-center gap-1.5">
              <Moon className="w-3.5 h-3.5 text-[var(--text-muted)]" />
              Sleep blocks never fire advance alerts
            </span>
          </div>

        </div>
      </section>

      {/* 4. Permissions (Notifications, Exact Alarms, Usage Access separately) */}
      <section aria-label="Permissions" className="space-y-2">
        <h2 className="font-display text-[calc(13px*var(--sf-font-scale,1))] font-semibold text-[var(--text-secondary)] px-0.5">
          Permissions
        </h2>
        <div className="rounded-xl overflow-hidden divide-y" style={sectionCardStyle}>
          {(
            [
              {
                key: 'notifications' as const,
                title: 'Notifications',
                desc: 'Required for 10/15-min heads-ups, bedtime reminders, and break prompts.',
                actionLabel: 'Allow notifications',
              },
              {
                key: 'exactAlarms' as const,
                title: 'Exact alarm access',
                desc: 'Required for on-time study start and morning wake-up alarms.',
                actionLabel: 'Enable exact alarms',
              },
              {
                key: 'usageAccess' as const,
                title: 'Usage access',
                desc: 'Enables app screen-time tracking inside active focus intervals.',
                actionLabel: 'Allow usage access',
              },
            ] as const
          ).map((perm) => {
            const granted = permissions[perm.key];
            return (
              <div
                key={perm.key}
                className="p-3.5 space-y-2.5"
                style={{ borderColor: 'var(--border-subtle)' }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      {granted ? (
                        <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-600" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
                      )}
                      <span className="text-[calc(13.5px*var(--sf-font-scale,1))] font-semibold text-[var(--text-primary)]">
                        {perm.title}
                      </span>
                    </div>
                    <p className="text-[calc(12px*var(--sf-font-scale,1))] text-[var(--text-muted)] mt-0.5 leading-snug">
                      {perm.desc}
                    </p>
                  </div>

                  <button
                    type="button"
                    role="switch"
                    aria-checked={granted}
                    aria-label={perm.title}
                    onClick={() => {
                      setPermission(perm.key, !granted);
                      if (liveMode) showPhoneToast('Manage this permission in Android settings');
                      else showPhoneToast(
                        !granted ? `${perm.title} enabled` : `${perm.title} turned off`
                      );
                    }}
                    className="min-w-[52px] min-h-[48px] flex items-center justify-end shrink-0"
                  >
                    <span
                      className="w-11 h-6 rounded-full p-0.5 transition-colors flex items-center"
                      style={{
                        backgroundColor: granted ? 'var(--accent)' : 'var(--border-strong)',
                        justifyContent: granted ? 'flex-end' : 'flex-start',
                      }}
                    >
                      <span className="w-5 h-5 rounded-full bg-white shadow-sm" />
                    </span>
                  </button>
                </div>

                {!granted && (
                  <button
                    type="button"
                    onClick={() => {
                      setPermission(perm.key, true);
                      if (!liveMode) showPhoneToast(`${perm.title} granted`);
                    }}
                    className="w-full min-h-[44px] rounded-lg text-[calc(12.5px*var(--sf-font-scale,1))] font-semibold transition-opacity hover:opacity-90"
                    style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' }}
                  >
                    {perm.actionLabel}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};
