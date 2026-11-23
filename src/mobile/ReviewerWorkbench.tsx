import React from 'react';
import {
  AlarmClock,
  ArrowLeft,
  Bell,
  Bluetooth,
  Clock,
  CloudOff,
  Coffee,
  Laptop,
  Moon,
  Palette,
  Play,
  QrCode,
  RotateCcw,
  ShieldAlert,
  Smartphone,
  Wifi,
} from 'lucide-react';
import { ACCENT_PRESETS, THEME_OPTIONS } from '../data/mockData';
import { useCompanion } from './CompanionContext';
import {
  formatDayLabel,
  formatMinutes12h,
  fromAbsMin,
  toAbsMin,
} from './companionLogic';
import { COMPANION_TIMEZONE, COMPANION_UTC_OFFSET } from './sampleData';

export const ReviewerWorkbench: React.FC<{ onBackToDesktop?: () => void }> = ({
  onBackToDesktop,
}) => {
  const {
    nowAbsMin,
    jumpToAbsMin,
    advanceClockMinutes,
    resetDemoState,
    blocks,
    updateBlock,
    openEventSheet,
    setActiveTab,
    setSelectedDayIndex,
    triggerAlertPreview,
    startFocusForBlock,
    connection,
    setConnectionMode,
    toggleBluetoothRange,
    stagePcCalendarEdit,
    setConnectionSheetOpen,
    setPairingOpen,
    screenTimeMode,
    setScreenTimeMode,
    permissions,
    setPermission,
    settings,
    setTheme,
    updateSettings,
    viewport,
    setViewport,
  } = useCompanion();

  const { dayIndex, minuteOfDay } = fromAbsMin(nowAbsMin);
  const chemBlock = blocks.find((b) => b.id === 'blk-chem-mon');
  const chemStartMin = chemBlock?.startMin ?? 7 * 60 + 30;
  const chemHeadsUpMin =
    chemBlock && chemBlock.advanceNoticeMin > 0
      ? chemStartMin - chemBlock.advanceNoticeMin
      : null;

  const panelCardStyle: React.CSSProperties = {
    backgroundColor: 'var(--bg-surface)',
    border: '1px solid var(--border-subtle)',
  };

  return (
    <aside
      aria-label="Prototype reviewer workbench"
      className="w-full lg:w-[400px] xl:w-[430px] shrink-0 space-y-2.5"
    >
      {/* Header */}
      <div className="rounded-xl p-3 space-y-2" style={panelCardStyle}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className="w-7 h-7 rounded-lg flex items-center justify-center text-[13px] font-bold shrink-0"
              style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' }}
            >
              S
            </span>
            <div className="min-w-0">
              <h1 className="font-display text-[14.5px] font-semibold text-[var(--text-primary)] leading-tight truncate">
                StudyFlow Android Companion
              </h1>
              <p className="text-[11px] text-[var(--text-muted)]">
                Reviewer workbench · {COMPANION_TIMEZONE} ({COMPANION_UTC_OFFSET})
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={resetDemoState}
            title="Reset demo to 7:15 AM"
            className="h-8 px-2.5 rounded-lg inline-flex items-center gap-1 text-[12px] font-medium shrink-0 transition-colors hover:bg-[var(--bg-surface-hover)]"
            style={{
              backgroundColor: 'var(--bg-surface-subtle)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-secondary)',
            }}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset
          </button>
        </div>

        {onBackToDesktop && (
          <button
            type="button"
            onClick={onBackToDesktop}
            className="w-full h-8 px-3 rounded-lg inline-flex items-center justify-center gap-1.5 text-[12px] font-medium transition-colors hover:bg-[var(--bg-surface-hover)]"
            style={{
              backgroundColor: 'var(--bg-surface-subtle)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-secondary)',
            }}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Open StudyFlow Windows Desktop Workspace
          </button>
        )}
      </div>

      {/* 1. Preview Clock Control */}
      <section className="rounded-xl p-3 space-y-2" style={panelCardStyle}>
        <div className="flex items-center justify-between gap-2">
          <span className="text-[12px] font-semibold text-[var(--text-primary)] inline-flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} />
            Simulated clock
          </span>
          <span className="font-mono-num text-[12.5px] font-semibold text-[var(--text-primary)]">
            {formatDayLabel(dayIndex).split(',')[0]} · {formatMinutes12h(minuteOfDay)}
          </span>
        </div>

        {/* Step Controls */}
        <div className="grid grid-cols-4 gap-1.5">
          {[
            { label: '-15m', delta: -15 },
            { label: '+5m', delta: 5 },
            { label: '+15m', delta: 15 },
            { label: '+25m', delta: 25 },
          ].map((btn) => (
            <button
              key={btn.label}
              type="button"
              onClick={() => advanceClockMinutes(btn.delta)}
              className="h-8 rounded-lg font-mono-num text-[12px] font-medium transition-colors hover:bg-[var(--bg-surface-hover)]"
              style={{
                backgroundColor: 'var(--bg-surface-subtle)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-primary)',
              }}
            >
              {btn.label}
            </button>
          ))}
        </div>

        {/* Non-Replaying Direct Clock Jumps */}
        <div className="flex flex-wrap gap-1.5">
          {[
            { label: '7:15 AM', abs: toAbsMin(0, 7 * 60 + 15) },
            { label: '7:30 AM', abs: toAbsMin(0, 7 * 60 + 30) },
            { label: '7:55 AM', abs: toAbsMin(0, 7 * 60 + 55) },
            { label: '9:15 PM (Done)', abs: toAbsMin(0, 21 * 60 + 15) },
            { label: '11:00 PM Bed', abs: toAbsMin(0, 23 * 60) },
            { label: '6:30 AM Wake', abs: toAbsMin(1, 6 * 60 + 30) },
            { label: '6:35 AM Snooze', abs: toAbsMin(1, 6 * 60 + 35) },
          ].map((preset) => {
            const isCurrent = nowAbsMin === preset.abs;
            return (
              <button
                key={preset.label}
                type="button"
                onClick={() => jumpToAbsMin(preset.abs)}
                className="h-7 px-2.5 rounded-lg text-[11.5px] font-mono-num font-medium transition-colors"
                style={{
                  backgroundColor: isCurrent ? 'var(--accent)' : 'var(--bg-surface-subtle)',
                  color: isCurrent ? 'var(--accent-fg)' : 'var(--text-secondary)',
                  border: isCurrent
                    ? '1px solid var(--accent)'
                    : '1px solid var(--border-subtle)',
                }}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
      </section>

      {/* 2. Five Interactive Notification & Alarm Previews */}
      <section className="rounded-xl p-3 space-y-2" style={panelCardStyle}>
        <div className="text-[12px] font-semibold text-[var(--text-primary)] inline-flex items-center gap-1.5">
          <Bell className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} />
          5 Notification & alarm moments
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
          <button
            type="button"
            onClick={() => triggerAlertPreview('study_headsup')}
            className="h-9 px-2.5 rounded-lg text-left text-[12px] font-medium flex items-center gap-1.5 transition-colors hover:bg-[var(--bg-surface-hover)]"
            style={{
              backgroundColor: 'var(--bg-surface-subtle)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-primary)',
            }}
          >
            <Bell className="w-3.5 h-3.5 shrink-0 text-amber-600" />
            <span className="truncate">
              Heads-up ({chemHeadsUpMin !== null ? formatMinutes12h(chemHeadsUpMin) : 'Off'})
            </span>
          </button>

          <button
            type="button"
            onClick={() => triggerAlertPreview('study_start_alarm')}
            className="h-9 px-2.5 rounded-lg text-left text-[12px] font-medium flex items-center gap-1.5 transition-colors hover:bg-[var(--bg-surface-hover)]"
            style={{
              backgroundColor: 'var(--bg-surface-subtle)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-primary)',
            }}
          >
            <AlarmClock className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--accent)' }} />
            <span className="truncate">Study alarm ({formatMinutes12h(chemStartMin)})</span>
          </button>

          <button
            type="button"
            onClick={() => triggerAlertPreview('bedtime_reminder')}
            className="h-9 px-2.5 rounded-lg text-left text-[12px] font-medium flex items-center gap-1.5 transition-colors hover:bg-[var(--bg-surface-hover)]"
            style={{
              backgroundColor: 'var(--bg-surface-subtle)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-primary)',
            }}
          >
            <Moon className="w-3.5 h-3.5 shrink-0 text-[var(--text-secondary)]" />
            <span className="truncate">Bedtime (11:00 PM)</span>
          </button>

          <button
            type="button"
            onClick={() => triggerAlertPreview('sleep_wakeup_alarm')}
            className="h-9 px-2.5 rounded-lg text-left text-[12px] font-medium flex items-center gap-1.5 transition-colors hover:bg-[var(--bg-surface-hover)]"
            style={{
              backgroundColor: 'var(--bg-surface-subtle)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-primary)',
            }}
          >
            <AlarmClock className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
            <span className="truncate">Wake-up (6:30 AM)</span>
          </button>

          <button
            type="button"
            onClick={() => triggerAlertPreview('focus_break_prompt')}
            className="sm:col-span-2 h-9 px-2.5 rounded-lg text-left text-[12px] font-medium flex items-center gap-1.5 transition-colors hover:bg-[var(--bg-surface-hover)]"
            style={{
              backgroundColor: 'var(--bg-surface-subtle)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-primary)',
            }}
          >
            <Coffee className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
            <span className="truncate">End of focus interval · Break prompt (7:55 AM)</span>
          </button>
        </div>
      </section>

      {/* 3. Walkthrough & PC Simulation Triggers */}
      <section className="rounded-xl p-3 space-y-2" style={panelCardStyle}>
        <div className="text-[12px] font-semibold text-[var(--text-primary)] inline-flex items-center gap-1.5">
          <Laptop className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} />
          PC & walkthrough simulations
        </div>

        <div className="grid grid-cols-2 gap-1.5">
          <button
            type="button"
            onClick={() => startFocusForBlock('blk-chem-mon', 'pc', false)}
            className="h-8 px-2.5 rounded-lg text-[11.5px] font-medium inline-flex items-center gap-1.5 transition-colors hover:bg-[var(--bg-surface-hover)]"
            style={{
              backgroundColor: 'var(--bg-surface-subtle)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-primary)',
            }}
          >
            <Play className="w-3 h-3 shrink-0" style={{ color: 'var(--accent)' }} />
            <span className="truncate">Start focus on PC</span>
          </button>

          <button
            type="button"
            onClick={() => {
              updateBlock('blk-chem-mon', { startMin: 8 * 60 });
              setSelectedDayIndex(0);
              setActiveTab('calendar');
              openEventSheet('blk-chem-mon');
            }}
            className="h-8 px-2.5 rounded-lg text-[11.5px] font-medium inline-flex items-center gap-1.5 transition-colors hover:bg-[var(--bg-surface-hover)]"
            style={{
              backgroundColor: 'var(--bg-surface-subtle)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-primary)',
            }}
          >
            <Clock className="w-3 h-3 shrink-0 text-amber-600" />
            <span className="truncate">Move Chem → 8:00 AM</span>
          </button>

          <button
            type="button"
            onClick={() => {
              stagePcCalendarEdit();
              setConnectionSheetOpen(true);
            }}
            className="h-8 px-2.5 rounded-lg text-[11.5px] font-medium inline-flex items-center gap-1.5 transition-colors hover:bg-[var(--bg-surface-hover)]"
            style={{
              backgroundColor: 'var(--bg-surface-subtle)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-primary)',
            }}
          >
            <Wifi className="w-3 h-3 shrink-0" style={{ color: 'var(--accent)' }} />
            <span className="truncate">Stage PC edit</span>
          </button>

          <button
            type="button"
            onClick={() => setPairingOpen(true)}
            className="h-8 px-2.5 rounded-lg text-[11.5px] font-medium inline-flex items-center gap-1.5 transition-colors hover:bg-[var(--bg-surface-hover)]"
            style={{
              backgroundColor: 'var(--bg-surface-subtle)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-primary)',
            }}
          >
            <QrCode className="w-3 h-3 shrink-0" style={{ color: 'var(--accent)' }} />
            <span className="truncate">Replay pairing</span>
          </button>
        </div>

        {/* Connection & Permission Toggles */}
        <div className="flex flex-wrap gap-1.5 pt-1">
          {(
            [
              { id: 'internet' as const, label: 'Internet', Icon: Wifi },
              { id: 'bluetooth' as const, label: 'BT nearby', Icon: Bluetooth },
              { id: 'offline' as const, label: 'Offline', Icon: CloudOff },
            ] as const
          ).map(({ id, label, Icon }) => {
            const active = connection.mode === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setConnectionMode(id)}
                className="h-7 px-2.5 rounded-lg text-[11.5px] font-medium inline-flex items-center gap-1 transition-colors"
                style={{
                  backgroundColor: active ? 'var(--accent)' : 'var(--bg-surface-subtle)',
                  color: active ? 'var(--accent-fg)' : 'var(--text-secondary)',
                  border: active
                    ? '1px solid var(--accent)'
                    : '1px solid var(--border-subtle)',
                }}
              >
                <Icon className="w-3 h-3" />
                {label}
              </button>
            );
          })}

          <button
            type="button"
            onClick={toggleBluetoothRange}
            className="h-7 px-2.5 rounded-lg text-[11.5px] font-medium transition-colors"
            style={{
              backgroundColor: 'var(--bg-surface-subtle)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-secondary)',
            }}
          >
            BT range: {connection.bluetoothNearby ? 'In' : 'Out'}
          </button>

          <button
            type="button"
            onClick={() => setPermission('exactAlarms', !permissions.exactAlarms)}
            className="h-7 px-2.5 rounded-lg text-[11.5px] font-medium inline-flex items-center gap-1 transition-colors"
            style={{
              backgroundColor: !permissions.exactAlarms
                ? 'var(--accent-soft)'
                : 'var(--bg-surface-subtle)',
              border: '1px solid var(--border-subtle)',
              color: !permissions.exactAlarms ? 'var(--accent)' : 'var(--text-secondary)',
            }}
          >
            <ShieldAlert className="w-3 h-3" />
            Exact alarms: {permissions.exactAlarms ? 'On' : 'Blocked'}
          </button>
        </div>

        {/* Screen-Time State Preview */}
        <div
          className="pt-2 space-y-1.5"
          style={{ borderTop: '1px solid var(--border-subtle)' }}
        >
          <div className="text-[11.5px] text-[var(--text-muted)]">Screen-time state (Focus tab)</div>
          <div className="grid grid-cols-3 gap-1">
            {(
              [
                { id: 'measured' as const, label: 'Measured' },
                { id: 'zero' as const, label: 'Zero (0m)' },
                { id: 'permission_needed' as const, label: 'No access' },
              ] as const
            ).map((st) => {
              const active = screenTimeMode === st.id;
              return (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => {
                    setScreenTimeMode(st.id);
                    setActiveTab('focus');
                  }}
                  className="h-7 rounded-lg text-[11.5px] font-medium transition-colors"
                  style={{
                    backgroundColor: active ? 'var(--accent)' : 'var(--bg-surface-subtle)',
                    color: active ? 'var(--accent-fg)' : 'var(--text-secondary)',
                    border: active
                      ? '1px solid var(--accent)'
                      : '1px solid var(--border-subtle)',
                  }}
                >
                  {st.label}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* 4. Exact PC Theme Switcher (All 6 Modes) & Android Viewport Audit */}
      <section className="rounded-xl p-3 space-y-2.5" style={panelCardStyle}>
        <div className="flex items-center justify-between">
          <span className="text-[12px] font-semibold text-[var(--text-primary)] inline-flex items-center gap-1.5">
            <Palette className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} />
            StudyFlow PC themes (6)
          </span>
          <span className="text-[11px] text-[var(--text-muted)] capitalize">{settings.theme}</span>
        </div>

        <div className="grid grid-cols-3 gap-1.5">
          {THEME_OPTIONS.map((t) => {
            const active = settings.theme === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTheme(t.id)}
                className="h-9 px-2 rounded-lg flex items-center gap-1.5 text-[11.5px] font-medium transition-colors"
                style={{
                  backgroundColor: active ? 'var(--accent-soft)' : 'var(--bg-surface-subtle)',
                  border: active
                    ? '1px solid var(--accent-border)'
                    : '1px solid var(--border-subtle)',
                  color: active ? 'var(--accent)' : 'var(--text-primary)',
                }}
              >
                <span
                  className="w-3.5 h-3.5 rounded-full shrink-0 border"
                  style={{
                    backgroundColor: t.swatches[0],
                    borderColor: t.swatches[2],
                  }}
                />
                <span className="truncate">{t.name.split(' ')[0]}</span>
              </button>
            );
          })}
        </div>

        {/* Accent Swatches */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11.5px] text-[var(--text-muted)]">PC accent</span>
          <div className="flex items-center gap-1.5">
            {ACCENT_PRESETS.slice(0, 6).map((preset) => {
              const active = settings.accentColor.toLowerCase() === preset.hex.toLowerCase();
              return (
                <button
                  key={preset.hex}
                  type="button"
                  aria-label={`Accent ${preset.name}`}
                  onClick={() => updateSettings({ accentColor: preset.hex })}
                  className="w-5 h-5 rounded-full transition-transform hover:scale-110"
                  style={{
                    backgroundColor: preset.hex,
                    outline: active ? '2px solid var(--text-primary)' : 'none',
                    outlineOffset: '2px',
                  }}
                />
              );
            })}
          </div>
        </div>

        {/* Viewport Width (390dp / 360dp) & System Text Scale (100% / 115% / 130%) */}
        <div
          className="pt-2.5 flex items-center justify-between gap-2"
          style={{ borderTop: '1px solid var(--border-subtle)' }}
        >
          <div className="flex items-center gap-1">
            <Smartphone className="w-3.5 h-3.5 text-[var(--text-muted)] mr-0.5" />
            {([390, 360] as const).map((w) => (
              <button
                key={w}
                type="button"
                onClick={() => setViewport({ widthDp: w })}
                className="h-7 px-2 rounded-md font-mono-num text-[11.5px] font-medium"
                style={{
                  backgroundColor:
                    viewport.widthDp === w ? 'var(--accent)' : 'var(--bg-surface-subtle)',
                  color: viewport.widthDp === w ? 'var(--accent-fg)' : 'var(--text-secondary)',
                }}
              >
                {w}dp
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1">
            {(
              [
                { scale: 1 as const, label: '100%' },
                { scale: 1.15 as const, label: '115%' },
                { scale: 1.3 as const, label: '130%' },
              ] as const
            ).map((fs) => (
              <button
                key={fs.label}
                type="button"
                onClick={() => setViewport({ fontScale: fs.scale })}
                className="h-7 px-2 rounded-md font-mono-num text-[11.5px] font-medium"
                style={{
                  backgroundColor:
                    viewport.fontScale === fs.scale ? 'var(--accent)' : 'var(--bg-surface-subtle)',
                  color:
                    viewport.fontScale === fs.scale ? 'var(--accent-fg)' : 'var(--text-secondary)',
                }}
              >
                {fs.label}
              </button>
            ))}
          </div>
        </div>
      </section>
    </aside>
  );
};
