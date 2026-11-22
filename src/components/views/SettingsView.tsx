import { GoogleAccount } from '../../desktop/GoogleAccount';
import React, { useEffect, useState } from 'react';
import {
  User,
  Monitor,
  Palette,
  BookOpen,
  Timer,
  Bell,
  Shield,
  Database,
  Keyboard,
  Accessibility,
  Check,
  Download,
  Sparkles,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useAssistant } from '../../assistant/AssistantContext';
import { AssistantSettings } from '../../assistant/AssistantSettings';
import { ACCENT_PRESETS, THEME_OPTIONS, USER_AVATAR_URL } from '../../data/mockData';

type SettingsSection =
  | 'profile'
  | 'appearance'
  | 'themes'
  | 'study'
  | 'timer'
  | 'notifications'
  | 'privacy'
  | 'backup'
  | 'assistant'
  | 'shortcuts'
  | 'accessibility';

const SECTIONS: { id: SettingsSection; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'appearance', label: 'Appearance', icon: Monitor },
  { id: 'themes', label: 'Themes', icon: Palette },
  { id: 'study', label: 'Study Preferences', icon: BookOpen },
  { id: 'timer', label: 'Focus Timer', icon: Timer },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'privacy', label: 'Privacy', icon: Shield },
  { id: 'assistant', label: 'AI Usage', icon: Sparkles },
  { id: 'backup', label: 'Data & Backup', icon: Database },
  { id: 'shortcuts', label: 'Keyboard Shortcuts', icon: Keyboard },
  { id: 'accessibility', label: 'Accessibility', icon: Accessibility },
];

export const SettingsView: React.FC = () => {
  const {
    theme,
    setTheme,
    accentColor,
    setAccentColor,
    density,
    setDensity,
    preferences,
    updatePreferences,
    exportWorkspace,
    importLegacyBackup,
    legacyCalendar,
    pushToast,
  } = useApp();

  const { settingsRequested, setSettingsRequested } = useAssistant();
  const [section, setSection] = useState<SettingsSection>(settingsRequested ? 'assistant' : 'themes');

  useEffect(() => {
    if (settingsRequested) {
      setSection('assistant');
      setSettingsRequested(false);
    }
  }, [settingsRequested, setSettingsRequested]);

  const surfaceStyle: React.CSSProperties = {
    backgroundColor: 'var(--bg-surface)',
    border: '1px solid var(--border-subtle)',
  };

  const inputStyle: React.CSSProperties = {
    backgroundColor: 'var(--bg-surface-subtle)',
    border: '1px solid var(--border-subtle)',
    color: 'var(--text-primary)',
  };

  const ToggleRow: React.FC<{
    label: string;
    description: string;
    checked: boolean;
    onChange: (next: boolean) => void;
  }> = ({ label, description, checked, onChange }) => (
    <div className="py-3 flex items-center justify-between gap-4">
      <div>
        <div className="text-[13px] font-medium text-[var(--text-primary)]">{label}</div>
        <div className="text-[12px] text-[var(--text-muted)]">{description}</div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className="w-10 h-5.5 rounded-full p-0.5 transition-colors shrink-0 relative"
        style={{ backgroundColor: checked ? 'var(--accent)' : 'var(--border-strong)' }}
      >
        <span
          className="block w-4.5 h-4.5 rounded-full bg-white transition-transform"
          style={{ transform: checked ? 'translateX(18px)' : 'translateX(0px)' }}
        />
      </button>
    </div>
  );

  return (
    <div className="space-y-4 pb-8">
      <div>
        <h1 className="font-display text-[19px] font-semibold text-[var(--text-primary)]">
          Settings
        </h1>
        <p className="text-[12.5px] text-[var(--text-muted)]">
          Customize workspace themes, density, study cadence, timer defaults, and shortcuts
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Settings Left Navigation */}
        <nav
          aria-label="Settings sections"
          className="lg:col-span-3 rounded-xl p-2 space-y-0.5"
          style={surfaceStyle}
        >
          {SECTIONS.map((s) => {
            const Icon = s.icon;
            const active = section === s.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setSection(s.id)}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-medium transition-colors text-left"
                style={{
                  backgroundColor: active ? 'var(--accent-soft)' : 'transparent',
                  color: active ? 'var(--accent)' : 'var(--text-secondary)',
                }}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{s.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Settings Main Panel */}
        <div className="lg:col-span-9 rounded-xl p-5 space-y-5" style={surfaceStyle}>
          {section === 'assistant' && <AssistantSettings />}
          {section === 'profile' && (
            <div className="space-y-4">
              <h2 className="font-display text-[16px] font-semibold text-[var(--text-primary)]">
                Student Profile
              </h2>
              <div className="flex items-center gap-4">
                {legacyCalendar ? <span aria-hidden="true" className="grid h-14 w-14 place-items-center rounded-full bg-[var(--accent-soft)] text-[var(--accent)]"><User className="h-6 w-6" /></span> : <img
                  src={USER_AVATAR_URL}
                  alt={preferences.name}
                  referrerPolicy="no-referrer"
                  className="w-14 h-14 rounded-full object-cover"
                  style={{ border: '1px solid var(--border-subtle)' }}
                />}
                <div>
                  <div className="text-[14px] font-semibold text-[var(--text-primary)]">{preferences.name}</div>
                  <div className="text-[12px] text-[var(--text-muted)]">{preferences.email}</div>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] text-[var(--text-muted)] mb-1">Display Name</label>
                  <input
                    type="text"
                    value={preferences.name}
                    onChange={(e) => updatePreferences({ name: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg text-[13px]"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label className="block text-[12px] text-[var(--text-muted)] mb-1">Academic Email</label>
                  <input
                    type="email"
                    value={preferences.email}
                    onChange={(e) => updatePreferences({ email: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg text-[13px]"
                    style={inputStyle}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[12px] text-[var(--text-muted)] mb-1">Major / Concentration</label>
                  <input
                    type="text"
                    value={preferences.major}
                    onChange={(e) => updatePreferences({ major: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg text-[13px]"
                    style={inputStyle}
                  />
                </div>
              </div>
              {legacyCalendar && <GoogleAccount />}
            </div>
          )}

          {section === 'appearance' && (
            <div className="space-y-5">
              <h2 className="font-display text-[16px] font-semibold text-[var(--text-primary)]">
                Appearance & Layout Density
              </h2>
              <div>
                <div className="text-[12.5px] font-medium text-[var(--text-primary)] mb-2">
                  Interface Density
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {(
                    [
                      { id: 'compact', title: 'Compact', desc: 'High information density tuned for desktop workflows' },
                      { id: 'comfortable', title: 'Comfortable', desc: 'Generous breathing room for long reading sessions' },
                    ] as const
                  ).map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        setDensity(opt.id);
                        pushToast(`Layout density set to ${opt.title}`);
                      }}
                      className="p-3.5 rounded-xl text-left transition-colors"
                      style={{
                        backgroundColor: density === opt.id ? 'var(--accent-soft)' : 'var(--bg-surface-subtle)',
                        border: density === opt.id ? '1.5px solid var(--accent)' : '1px solid var(--border-subtle)',
                      }}
                    >
                      <div className="text-[13.5px] font-semibold text-[var(--text-primary)]">{opt.title}</div>
                      <div className="text-[12px] text-[var(--text-muted)] mt-0.5">{opt.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="divide-y divide-[var(--border-subtle)]">
                <ToggleRow
                  label="Show study streak on Dashboard"
                  description="Display your consecutive study day tracker in the top KPI strip."
                  checked={preferences.showFocusStreak}
                  onChange={(v) => updatePreferences({ showFocusStreak: v })}
                />
              </div>
            </div>
          )}

          {section === 'themes' && (
            <div className="space-y-5">
              <div>
                <h2 className="font-display text-[16px] font-semibold text-[var(--text-primary)]">
                  Workspace Themes & Accent
                </h2>
                <p className="text-[12.5px] text-[var(--text-muted)]">
                  Every surface, chart, calendar grid, and dialog adapts immediately.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {THEME_OPTIONS.map((t) => {
                  const active = theme === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        setTheme(t.id);
                        pushToast(`Theme switched to ${t.name}`);
                      }}
                      className="rounded-xl p-3 text-left transition-all"
                      style={{
                        backgroundColor: active ? 'var(--accent-soft)' : 'var(--bg-surface-subtle)',
                        border: active ? '1.5px solid var(--accent)' : '1px solid var(--border-subtle)',
                      }}
                    >
                      {/* Mini UI Preview Swatch */}
                      <div
                        className="h-14 rounded-lg p-2 flex gap-1.5 mb-2.5"
                        style={{ backgroundColor: t.swatches[0], border: '1px solid rgba(128,128,128,0.2)' }}
                      >
                        <div className="w-5 rounded" style={{ backgroundColor: t.swatches[1] }} />
                        <div className="flex-1 flex flex-col gap-1">
                          <div className="h-2.5 w-14 rounded-sm" style={{ backgroundColor: t.swatches[2], opacity: 0.75 }} />
                          <div className="flex-1 rounded" style={{ backgroundColor: t.swatches[1] }} />
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-[13px] font-semibold text-[var(--text-primary)]">{t.name}</div>
                          <div className="text-[11px] text-[var(--text-muted)]">{t.subtitle}</div>
                        </div>
                        {active && <Check className="w-4 h-4" style={{ color: 'var(--accent)' }} />}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Custom Accent Color Picker */}
              <div className="pt-3 space-y-2.5" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-semibold text-[var(--text-primary)]">Accent Color</span>
                  <span className="font-mono-num text-[12px] text-[var(--text-muted)]">{accentColor.toUpperCase()}</span>
                </div>
                <div className="flex flex-wrap items-center gap-2.5">
                  {ACCENT_PRESETS.map((preset) => (
                    <button
                      key={preset.hex}
                      type="button"
                      onClick={() => setAccentColor(preset.hex)}
                      aria-label={`Select ${preset.name} accent`}
                      className="w-7 h-7 rounded-full flex items-center justify-center transition-transform hover:scale-110"
                      style={{ backgroundColor: preset.hex }}
                    >
                      {accentColor.toLowerCase() === preset.hex.toLowerCase() && (
                        <Check className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
                      )}
                    </button>
                  ))}
                  <label className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg text-[12px] text-[var(--text-secondary)] cursor-pointer" style={inputStyle}>
                    <span>Custom</span>
                    <input
                      type="color"
                      value={accentColor}
                      onChange={(e) => setAccentColor(e.target.value)}
                      aria-label="Pick custom accent color"
                      className="w-5 h-5 rounded cursor-pointer bg-transparent border-0 p-0"
                    />
                  </label>
                </div>
              </div>
            </div>
          )}

          {section === 'study' && (
            <div className="space-y-4">
              <h2 className="font-display text-[16px] font-semibold text-[var(--text-primary)]">
                Study Preferences
              </h2>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-[13px] mb-1.5">
                    <span className="text-[var(--text-primary)]">Daily Study Target</span>
                    <span className="font-mono-num font-semibold text-[var(--accent)]">{preferences.dailyGoalHours} hrs/day</span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={10}
                    step={0.5}
                    value={preferences.dailyGoalHours}
                    onChange={(e) => updatePreferences({ dailyGoalHours: Number(e.target.value) })}
                    className="w-full accent-[var(--accent)]"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-[13px] mb-1.5">
                    <span className="text-[var(--text-primary)]">Weekly Study Target</span>
                    <span className="font-mono-num font-semibold text-[var(--accent)]">{preferences.weeklyGoalHours} hrs/week</span>
                  </div>
                  <input
                    type="range"
                    min={10}
                    max={55}
                    step={1}
                    value={preferences.weeklyGoalHours}
                    onChange={(e) => updatePreferences({ weeklyGoalHours: Number(e.target.value) })}
                    className="w-full accent-[var(--accent)]"
                  />
                </div>
              </div>
            </div>
          )}

          {section === 'timer' && (
            <div className="space-y-4">
              <h2 className="font-display text-[16px] font-semibold text-[var(--text-primary)]">
                Focus Timer Defaults
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] text-[var(--text-muted)] mb-1">Pomodoro Focus (min)</label>
                  <input
                    type="number"
                    min={15}
                    max={90}
                    value={preferences.pomodoroFocusMin}
                    onChange={(e) => updatePreferences({ pomodoroFocusMin: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg text-[13px] font-mono-num"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label className="block text-[12px] text-[var(--text-muted)] mb-1">Short Break (min)</label>
                  <input
                    type="number"
                    min={3}
                    max={20}
                    value={preferences.pomodoroBreakMin}
                    onChange={(e) => updatePreferences({ pomodoroBreakMin: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg text-[13px] font-mono-num"
                    style={inputStyle}
                  />
                </div>
              </div>
              <div className="divide-y divide-[var(--border-subtle)]">
                <ToggleRow
                  label="Auto-start break countdown"
                  description="Immediately begin short break timer after saving focus quality."
                  checked={preferences.autoStartBreaks}
                  onChange={(v) => updatePreferences({ autoStartBreaks: v })}
                />
              </div>
            </div>
          )}

          {section === 'notifications' && (
            <div className="space-y-2 divide-y divide-[var(--border-subtle)]">
              <h2 className="font-display text-[16px] font-semibold text-[var(--text-primary)] pb-2">
                Notification Preferences
              </h2>
              <ToggleRow
                label="Session start reminders"
                description="Notify 15 minutes before a scheduled study block begins."
                checked={preferences.desktopNotifications}
                onChange={(v) => updatePreferences({ desktopNotifications: v })}
              />
              <ToggleRow
                label="Exam readiness alerts"
                description="Highlight syllabus gaps 7 days prior to upcoming midterms and finals."
                checked={preferences.examReminders}
                onChange={(v) => updatePreferences({ examReminders: v })}
              />
              <ToggleRow
                label="Weekly analytics summary"
                description="Compile planned vs actual study adherence every Sunday evening."
                checked={preferences.weeklyDigest}
                onChange={(v) => updatePreferences({ weeklyDigest: v })}
              />
            </div>
          )}

          {section === 'privacy' && (
            <div className="space-y-3">
              <h2 className="font-display text-[16px] font-semibold text-[var(--text-primary)]">
                Privacy & Workspace Isolation
              </h2>
              <p className="text-[13px] text-[var(--text-secondary)]">
                All notes, flashcards, focus logs, and exam schedules stay local to your study workspace session.
              </p>
              <ToggleRow
                label="Keep study history private"
                description="Disable public profile sharing and anonymous usage analytics."
                checked={true}
                onChange={() => pushToast('Privacy preference updated')}
              />
            </div>
          )}

          {section === 'backup' && (
            <div className="space-y-4">
              <h2 className="font-display text-[16px] font-semibold text-[var(--text-primary)]">
                Data & Local Backup
              </h2>
              <ToggleRow
                label="Automatic daily JSON snapshot"
                description="Prepare an offline-ready archive of notes, tasks, and flashcard intervals."
                checked={preferences.localBackupAuto}
                onChange={(v) => updatePreferences({ localBackupAuto: v })}
              />
              <div className="flex flex-wrap gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={exportWorkspace}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[12.5px] font-medium"
                  style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' }}
                >
                  <Download className="w-3.5 h-3.5" /> Export Workspace JSON
                </button>
                {importLegacyBackup && <button
                  type="button"
                  onClick={() => void importLegacyBackup()}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-subtle)] px-3.5 py-2 text-[12.5px] font-medium"
                >
                  <Database className="w-3.5 h-3.5" /> Import
                </button>}
              </div>
            </div>
          )}

          {section === 'shortcuts' && (
            <div className="space-y-3">
              <h2 className="font-display text-[16px] font-semibold text-[var(--text-primary)]">
                Keyboard Shortcuts
              </h2>
              <div className="divide-y divide-[var(--border-subtle)] text-[13px]">
                {[
                  { action: 'Open Global Command Palette', keys: 'Ctrl + K' },
                  { action: 'Close Active Modal / Palette', keys: 'Esc' },
                  { action: 'Navigate Search Results', keys: '↑ / ↓' },
                  { action: 'Select Highlighted Command', keys: 'Enter' },
                  { action: 'Flip Active Flashcard', keys: 'Click / Space' },
                ].map((row) => (
                  <div key={row.action} className="py-2.5 flex items-center justify-between">
                    <span className="text-[var(--text-primary)]">{row.action}</span>
                    <kbd
                      className="px-2 py-0.5 rounded font-mono-num text-[11.5px]"
                      style={inputStyle}
                    >
                      {row.keys}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          )}

          {section === 'accessibility' && (
            <div className="space-y-2 divide-y divide-[var(--border-subtle)]">
              <h2 className="font-display text-[16px] font-semibold text-[var(--text-primary)] pb-2">
                Accessibility
              </h2>
              <ToggleRow
                label="Reduce interface motion"
                description="Minimize view transitions and card-flip animations."
                checked={preferences.reducedMotion}
                onChange={(v) => updatePreferences({ reducedMotion: v })}
              />
              <ToggleRow
                label="Enhanced focus outlines"
                description="Display high-contrast keyboard focus rings across all interactive controls."
                checked={preferences.highContrastText}
                onChange={(v) => updatePreferences({ highContrastText: v })}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
