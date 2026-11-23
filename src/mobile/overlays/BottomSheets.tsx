import React, { useEffect, useState } from 'react';
import {
  AlarmClock,
  Bell,
  Bluetooth,
  Check,
  CloudOff,
  Coffee,
  Laptop,
  Moon,
  RefreshCw,
  Wifi,
  X,
} from 'lucide-react';
import { ADVANCE_NOTICE_CHOICES, useCompanion } from '../CompanionContext';
import {
  formatDayLabel,
  formatDurationLabel,
  formatMinutes12h,
  formatMinutes24hInput,
  fromAbsMin,
  getBlockEndAbs,
  parse24hInput,
} from '../companionLogic';
import type { AdvanceNoticeOption } from '../types';

const BottomSheetFrame: React.FC<{
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}> = ({ title, onClose, children }) => {
  return (
    <div
      className="absolute inset-0 z-40 flex flex-col justify-end"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <button
        type="button"
        aria-label="Close sheet"
        onClick={onClose}
        className="absolute inset-0 bg-black/45 transition-opacity"
      />
      <div
        className="relative z-10 rounded-t-2xl max-h-[84%] flex flex-col overflow-hidden"
        style={{
          backgroundColor: 'var(--bg-elevated)',
          borderTop: '1px solid var(--border-subtle)',
          boxShadow: 'var(--shadow-floating)',
        }}
      >
        <div className="pt-2.5 pb-1 flex justify-center shrink-0">
          <span
            className="w-9 h-1 rounded-full"
            style={{ backgroundColor: 'var(--border-strong)' }}
          />
        </div>
        <div
          className="px-4 pb-3 flex items-center justify-between gap-2 shrink-0"
          style={{ borderBottom: '1px solid var(--border-subtle)' }}
        >
          <h2 className="font-display text-[calc(16px*var(--sf-font-scale,1))] font-semibold text-[var(--text-primary)] truncate">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="min-w-[48px] min-h-[48px] -mr-2 rounded-xl flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="overflow-y-auto px-4 py-4 space-y-4">{children}</div>
      </div>
    </div>
  );
};

export const EventDetailSheet: React.FC = () => {
  const {
    selectedBlockId,
    closeEventSheet,
    blocks,
    subjects,
    updateBlock,
    startFocusForBlock,
    showPhoneToast,
    liveMode,
  } = useCompanion();

  const block = blocks.find((b) => b.id === selectedBlockId) ?? null;
  const [startInput, setStartInput] = useState('');
  const [endInput, setEndInput] = useState('');

  useEffect(() => {
    if (!block) return;
    setStartInput(formatMinutes24hInput(block.startMin));
    setEndInput(formatMinutes24hInput(block.startMin + block.durationMin));
  }, [block?.id, block?.startMin, block?.durationMin]);

  if (!block) return null;

  if (liveMode) return (
    <BottomSheetFrame title={block.title} onClose={closeEventSheet}>
      <div className="rounded-xl p-4 space-y-2" style={{ backgroundColor: 'var(--bg-surface-subtle)', border: '1px solid var(--border-subtle)' }}>
        <p className="text-[calc(13px*var(--sf-font-scale,1))] text-[var(--text-secondary)]">{formatDayLabel(block.dayIndex)}</p>
        <p className="font-semibold text-[var(--text-primary)]">{formatMinutes12h(block.startMin)} – {formatMinutes12h(block.startMin + block.durationMin)}</p>
        <p className="text-sm text-[var(--text-secondary)]">{formatDurationLabel(block.durationMin)} · {block.type === 'study' ? 'Study session' : block.type === 'sleep' ? 'Sleep' : 'Free time'}</p>
      </div>
      <p className="text-xs text-[var(--text-muted)]">The calendar is synced from your PC. Edit sessions in the Windows app, then sync again here.</p>
      {block.type === 'study' && <button type="button" onClick={() => { closeEventSheet(); startFocusForBlock(block.id); }} className="w-full min-h-[48px] rounded-xl font-semibold" style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' }}>Start focus timer</button>}
    </BottomSheetFrame>
  );

  const subject = block.subjectId ? subjects.find((s) => s.id === block.subjectId) : undefined;
  const endAbs = getBlockEndAbs(block);
  const endParts = fromAbsMin(endAbs);
  const headsUpLabel =
    block.type === 'study' && block.advanceNoticeMin > 0
      ? formatMinutes12h(block.startMin - block.advanceNoticeMin)
      : null;

  const applyTimeChange = (nextStartStr: string, nextEndStr: string) => {
    const parsedStart = parse24hInput(nextStartStr);
    const parsedEnd = parse24hInput(nextEndStr);
    if (parsedStart === null || parsedEnd === null) return;

    let nextDuration = parsedEnd - parsedStart;
    if (block.type === 'sleep' && nextDuration <= 0) {
      nextDuration += 1440; // cross-midnight sleep
    }
    if (nextDuration < 15) {
      nextDuration = 15;
    }

    updateBlock(block.id, {
      startMin: parsedStart,
      durationMin: nextDuration,
    });
    showPhoneToast(
      block.type === 'study'
        ? `Updated · ${formatMinutes12h(parsedStart)} (${
            block.advanceNoticeMin > 0
              ? `heads-up ${formatMinutes12h(parsedStart - block.advanceNoticeMin)}`
              : 'heads-up off'
          })`
        : `Updated to ${formatMinutes12h(parsedStart)}`
    );
  };

  const shiftStartBy = (deltaMin: number) => {
    const nextStart = ((block.startMin + deltaMin) % 1440 + 1440) % 1440;
    updateBlock(block.id, { startMin: nextStart });
    const headsUpText =
      block.type === 'study' && block.advanceNoticeMin > 0
        ? ` · heads-up ${formatMinutes12h(nextStart - block.advanceNoticeMin)}`
        : '';
    showPhoneToast(`Moved to ${formatMinutes12h(nextStart)}${headsUpText}`);
  };

  return (
    <BottomSheetFrame title={block.title} onClose={closeEventSheet}>
      {/* Type & Subject Metadata */}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[calc(12.5px*var(--sf-font-scale,1))] text-[var(--text-secondary)]">
        {block.type === 'study' && (
          <>
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: subject?.color ?? 'var(--accent)' }}
            />
            <span className="font-semibold" style={{ color: subject?.color ?? 'var(--accent)' }}>
              {subject?.code} · {subject?.name}
            </span>
            <span aria-hidden="true">·</span>
            <span>Study block</span>
          </>
        )}
        {block.type === 'sleep' && (
          <>
            <Moon className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
            <span className="font-semibold text-[var(--text-primary)]">Sleep block</span>
            <span aria-hidden="true">·</span>
            <span>Crosses midnight</span>
          </>
        )}
        {block.type === 'free' && (
          <>
            <Coffee className="w-3.5 h-3.5 text-[var(--text-muted)]" />
            <span className="font-semibold text-[var(--text-primary)]">Free time</span>
            <span aria-hidden="true">·</span>
            <span>Excluded from study total</span>
          </>
        )}
      </div>

      {/* Date & Editable Start / End Times */}
      <div
        className="rounded-xl p-3.5 space-y-3"
        style={{
          backgroundColor: 'var(--bg-surface-subtle)',
          border: '1px solid var(--border-subtle)',
        }}
      >
        <div className="flex items-center justify-between text-[calc(12px*var(--sf-font-scale,1))] text-[var(--text-secondary)]">
          <span>{formatDayLabel(block.dayIndex)}</span>
          <span className="font-mono-num font-semibold text-[var(--text-primary)]">
            {formatDurationLabel(block.durationMin)}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <label className="block space-y-1">
            <span className="text-[calc(11.5px*var(--sf-font-scale,1))] font-medium text-[var(--text-muted)]">Start time</span>
            <input
              type="time"
              aria-label="Start time"
              value={startInput}
              onChange={(e) => {
                setStartInput(e.target.value);
                applyTimeChange(e.target.value, endInput);
              }}
              className="w-full min-h-[48px] px-3 rounded-lg font-mono-num text-[calc(13.5px*var(--sf-font-scale,1))] text-[var(--text-primary)]"
              style={{
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-strong)',
              }}
            />
          </label>

          <label className="block space-y-1">
            <span className="text-[calc(11.5px*var(--sf-font-scale,1))] font-medium text-[var(--text-muted)]">End time</span>
            <input
              type="time"
              aria-label="End time"
              value={endInput}
              onChange={(e) => {
                setEndInput(e.target.value);
                applyTimeChange(startInput, e.target.value);
              }}
              className="w-full min-h-[48px] px-3 rounded-lg font-mono-num text-[calc(13.5px*var(--sf-font-scale,1))] text-[var(--text-primary)]"
              style={{
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-strong)',
              }}
            />
          </label>
        </div>

        {/* Quick thumb-friendly time shift buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => shiftStartBy(-15)}
            className="flex-1 min-h-[44px] rounded-lg text-[calc(12px*var(--sf-font-scale,1))] font-medium font-mono-num transition-colors hover:bg-[var(--bg-surface-hover)]"
            style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-primary)',
            }}
          >
            -15 min
          </button>
          <button
            type="button"
            onClick={() => shiftStartBy(15)}
            className="flex-1 min-h-[44px] rounded-lg text-[calc(12px*var(--sf-font-scale,1))] font-medium font-mono-num transition-colors hover:bg-[var(--bg-surface-hover)]"
            style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-primary)',
            }}
          >
            +15 min
          </button>
          <button
            type="button"
            onClick={() => shiftStartBy(30)}
            className="flex-1 min-h-[44px] rounded-lg text-[calc(12px*var(--sf-font-scale,1))] font-medium font-mono-num transition-colors hover:bg-[var(--bg-surface-hover)]"
            style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-primary)',
            }}
          >
            +30 min
          </button>
        </div>
      </div>

      {/* Study-specific controls */}
      {block.type === 'study' && (
        <div className="space-y-3.5">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[calc(13px*var(--sf-font-scale,1))]">
              <span className="font-medium text-[var(--text-primary)] inline-flex items-center gap-1.5">
                <Bell className="w-4 h-4 text-[var(--text-secondary)]" />
                Advance notification
              </span>
              <span className="font-mono-num text-[calc(12px*var(--sf-font-scale,1))] text-[var(--text-muted)]">
                {headsUpLabel ? `Heads-up at ${headsUpLabel}` : 'Off'}
              </span>
            </div>

            <div
              className="grid grid-cols-3 gap-1 p-1 rounded-xl"
              style={{
                backgroundColor: 'var(--bg-surface-subtle)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              {ADVANCE_NOTICE_CHOICES.map((opt) => {
                const active = block.advanceNoticeMin === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() =>
                      updateBlock(block.id, { advanceNoticeMin: opt.value as AdvanceNoticeOption })
                    }
                    className="min-h-[44px] rounded-lg text-[calc(13px*var(--sf-font-scale,1))] font-medium transition-colors"
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
            className="rounded-xl px-3.5 py-2.5 flex items-center justify-between gap-3"
            style={{
              backgroundColor: 'var(--bg-surface-subtle)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <div>
              <div className="text-[calc(13.5px*var(--sf-font-scale,1))] font-medium text-[var(--text-primary)]">
                Ring at session start
              </div>
              <div className="text-[calc(12px*var(--sf-font-scale,1))] text-[var(--text-muted)] font-mono-num">
                {block.ringAtStart
                  ? `Start alarm set for ${formatMinutes12h(block.startMin)}`
                  : 'Silent at session start'}
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={block.ringAtStart}
              aria-label="Ring at session start"
              onClick={() => updateBlock(block.id, { ringAtStart: !block.ringAtStart })}
              className="min-w-[52px] min-h-[48px] flex items-center justify-end"
            >
              <span
                className="w-11 h-6 rounded-full p-0.5 transition-colors flex items-center"
                style={{
                  backgroundColor: block.ringAtStart ? 'var(--accent)' : 'var(--border-strong)',
                  justifyContent: block.ringAtStart ? 'flex-end' : 'flex-start',
                }}
              >
                <span className="w-5 h-5 rounded-full bg-white shadow-sm" />
              </span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              closeEventSheet();
              startFocusForBlock(block.id, 'phone', false);
            }}
            className="w-full min-h-[48px] rounded-xl text-[calc(14px*var(--sf-font-scale,1))] font-semibold transition-opacity hover:opacity-90"
            style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' }}
          >
            Start focus for this session
          </button>
        </div>
      )}

      {/* Sleep-specific controls */}
      {block.type === 'sleep' && (
        <div className="space-y-3">
          <div
            className="rounded-xl p-3.5 space-y-1"
            style={{
              backgroundColor: 'var(--bg-surface-subtle)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <div className="text-[calc(12px*var(--sf-font-scale,1))] text-[var(--text-muted)]">Scheduled wake-up</div>
            <div className="font-mono-num text-[calc(16px*var(--sf-font-scale,1))] font-semibold text-[var(--text-primary)]">
              {formatDayLabel(endParts.dayIndex)} · {formatMinutes12h(endParts.minuteOfDay)}
            </div>
            <p className="text-[calc(12px*var(--sf-font-scale,1))] text-[var(--text-secondary)]">
              One wake-up alarm at the end of sleep. No advance session alert is sent before wake-up.
            </p>
          </div>

          <div
            className="rounded-xl overflow-hidden divide-y"
            style={{
              backgroundColor: 'var(--bg-surface-subtle)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <div
              className="px-3.5 py-2.5 flex items-center justify-between gap-3"
              style={{ borderColor: 'var(--border-subtle)' }}
            >
              <div>
                <div className="text-[calc(13.5px*var(--sf-font-scale,1))] font-medium text-[var(--text-primary)]">
                  Remind me at bedtime
                </div>
                <div className="text-[calc(12px*var(--sf-font-scale,1))] text-[var(--text-muted)] font-mono-num">
                  Gentle notification at {formatMinutes12h(block.startMin)}
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={block.remindAtBedtime}
                aria-label="Remind me at bedtime"
                onClick={() => updateBlock(block.id, { remindAtBedtime: !block.remindAtBedtime })}
                className="min-w-[52px] min-h-[48px] flex items-center justify-end"
              >
                <span
                  className="w-11 h-6 rounded-full p-0.5 transition-colors flex items-center"
                  style={{
                    backgroundColor: block.remindAtBedtime
                      ? 'var(--accent)'
                      : 'var(--border-strong)',
                    justifyContent: block.remindAtBedtime ? 'flex-end' : 'flex-start',
                  }}
                >
                  <span className="w-5 h-5 rounded-full bg-white shadow-sm" />
                </span>
              </button>
            </div>

            <div
              className="px-3.5 py-2.5 flex items-center justify-between gap-3"
              style={{ borderColor: 'var(--border-subtle)' }}
            >
              <div>
                <div className="text-[calc(13.5px*var(--sf-font-scale,1))] font-medium text-[var(--text-primary)]">
                  Wake me at the end
                </div>
                <div className="text-[calc(12px*var(--sf-font-scale,1))] text-[var(--text-muted)] font-mono-num">
                  Full-screen alarm at {formatMinutes12h(endParts.minuteOfDay)}
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={block.wakeAtEnd}
                aria-label="Wake me at the end"
                onClick={() => updateBlock(block.id, { wakeAtEnd: !block.wakeAtEnd })}
                className="min-w-[52px] min-h-[48px] flex items-center justify-end"
              >
                <span
                  className="w-11 h-6 rounded-full p-0.5 transition-colors flex items-center"
                  style={{
                    backgroundColor: block.wakeAtEnd ? 'var(--accent)' : 'var(--border-strong)',
                    justifyContent: block.wakeAtEnd ? 'flex-end' : 'flex-start',
                  }}
                >
                  <span className="w-5 h-5 rounded-full bg-white shadow-sm" />
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Free-time info */}
      {block.type === 'free' && (
        <div
          className="rounded-xl p-3.5 text-[calc(12.5px*var(--sf-font-scale,1))] text-[var(--text-secondary)] space-y-1"
          style={{
            backgroundColor: 'var(--bg-surface-subtle)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <p className="font-semibold text-[var(--text-primary)]">Alerts off by default</p>
          <p>
            Free time blocks reserve breathing room on your timeline and are excluded from your
            daily scheduled study total.
          </p>
        </div>
      )}
    </BottomSheetFrame>
  );
};

export const ConnectionSheet: React.FC = () => {
  const {
    connectionSheetOpen,
    setConnectionSheetOpen,
    connection,
    liveMode,
    setConnectionMode,
    triggerSyncNow,
    stagePcCalendarEdit,
    setPairingOpen,
  } = useCompanion();

  if (!connectionSheetOpen) return null;

  if (liveMode) return (
    <BottomSheetFrame title="PC connection & sync" onClose={() => setConnectionSheetOpen(false)}>
      <div className="rounded-xl p-4 space-y-2" style={{ backgroundColor: 'var(--bg-surface-subtle)', border: '1px solid var(--border-subtle)' }}>
        <p className="font-semibold text-[var(--text-primary)]">{connection.isPaired ? connection.pcName : 'No PC paired'}</p>
        <p className="text-xs text-[var(--text-secondary)]">{connection.isPaired ? 'Paired over the local Wi-Fi / hotspot connection' : 'Pair your Windows PC to sync the calendar'}</p>
        <p className="text-xs text-[var(--text-muted)]">Last sync: {connection.lastSyncedLabel}</p>
      </div>
      <button type="button" onClick={() => triggerSyncNow('internet')} disabled={connection.mode === 'syncing'} className="w-full min-h-[48px] rounded-xl font-semibold disabled:opacity-60" style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' }}>{connection.mode === 'syncing' ? 'Syncing…' : 'Sync calendar now'}</button>
      <button type="button" onClick={() => { setConnectionSheetOpen(false); setPairingOpen(true); }} className="w-full min-h-[48px] rounded-xl border border-[var(--border-subtle)] text-sm font-semibold">Scan pairing QR code</button>
      <p className="text-xs text-[var(--text-muted)]">Bluetooth and PC calendar editing are not available in this Android build.</p>
    </BottomSheetFrame>
  );

  const methodSummary =
    connection.mode === 'syncing'
      ? 'Syncing changes…'
      : connection.mode === 'offline'
      ? 'Offline · Saved schedule available'
      : connection.internetAvailable && connection.bluetoothNearby
      ? connection.mode === 'bluetooth'
        ? 'Bluetooth nearby (Internet also ready)'
        : 'Internet (Bluetooth nearby ready)'
      : connection.mode === 'bluetooth'
      ? 'Bluetooth nearby'
      : 'Internet';

  return (
    <BottomSheetFrame
      title="PC connection & sync"
      onClose={() => setConnectionSheetOpen(false)}
    >
      {/* Unified Single Paired PC Card */}
      <div
        className="rounded-xl p-3.5 space-y-2.5"
        style={{
          backgroundColor: 'var(--bg-surface-subtle)',
          border: '1px solid var(--border-subtle)',
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5 min-w-0">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
              style={{
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--accent)',
              }}
            >
              <Laptop className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-[calc(14.5px*var(--sf-font-scale,1))] font-semibold text-[var(--text-primary)] truncate">
                {connection.isPaired ? connection.pcName : 'No PC paired'}
              </div>
              <div className="text-[calc(12px*var(--sf-font-scale,1))] text-[var(--text-secondary)] mt-0.5">
                {connection.isPaired ? methodSummary : 'Pair to sync calendar & focus timer'}
              </div>
            </div>
          </div>
        </div>

        <div
          className="pt-2 flex items-center justify-between text-[calc(12px*var(--sf-font-scale,1))] text-[var(--text-muted)]"
          style={{ borderTop: '1px solid var(--border-subtle)' }}
        >
          <span>Last successful sync</span>
          <span className="font-mono-num text-[var(--text-primary)]">
            {connection.lastSyncedLabel}
          </span>
        </div>
      </div>

      {/* Transport Mode Switcher (Internet / Bluetooth nearby / Offline) */}
      <div className="space-y-2">
        <div className="text-[calc(12px*var(--sf-font-scale,1))] font-medium text-[var(--text-secondary)]">
          Connection state
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {(
            [
              { id: 'internet' as const, label: 'Internet', Icon: Wifi },
              { id: 'bluetooth' as const, label: 'Bluetooth', Icon: Bluetooth },
              { id: 'offline' as const, label: 'Offline', Icon: CloudOff },
            ] as const
          ).map(({ id, label, Icon }) => {
            const active = connection.mode === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setConnectionMode(id)}
                className="min-h-[48px] px-2 rounded-xl flex flex-col items-center justify-center gap-1 text-[calc(12px*var(--sf-font-scale,1))] font-medium transition-colors"
                style={{
                  backgroundColor: active ? 'var(--accent-soft)' : 'var(--bg-surface-subtle)',
                  border: active
                    ? '1px solid var(--accent-border)'
                    : '1px solid var(--border-subtle)',
                  color: active ? 'var(--accent)' : 'var(--text-secondary)',
                }}
              >
                <Icon className="w-4 h-4" />
                <span>{label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Simulated PC-Side Calendar Edit Preview */}
      <div
        className="rounded-xl p-3.5 space-y-2.5"
        style={{
          backgroundColor: 'var(--bg-surface-subtle)',
          border: '1px solid var(--border-subtle)',
        }}
      >
        <div className="flex items-center justify-between gap-2">
          <span className="text-[calc(12.5px*var(--sf-font-scale,1))] font-semibold text-[var(--text-primary)]">
            PC schedule changes
          </span>
          {connection.pendingPcEdit ? (
            <span className="text-[calc(11.5px*var(--sf-font-scale,1))] font-semibold" style={{ color: 'var(--accent)' }}>
              1 pending edit
            </span>
          ) : (
            <span className="text-[calc(11.5px*var(--sf-font-scale,1))] text-[var(--text-muted)] inline-flex items-center gap-1">
              <Check className="w-3 h-3" /> Up to date
            </span>
          )}
        </div>

        {connection.pendingPcEdit ? (
          <p className="text-[calc(12.5px*var(--sf-font-scale,1))] text-[var(--text-secondary)]">
            {connection.pendingPcEdit.summary}. Tap Sync now or Sync nearby to apply it on this
            phone.
          </p>
        ) : (
          <button
            type="button"
            onClick={stagePcCalendarEdit}
            className="w-full min-h-[44px] rounded-lg text-[calc(12.5px*var(--sf-font-scale,1))] font-medium transition-colors hover:bg-[var(--bg-surface-hover)]"
            style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-primary)',
            }}
          >
            Simulate PC calendar edit
          </button>
        )}
      </div>

      {/* Sync Actions */}
      <div className="space-y-2">
        <button
          type="button"
          onClick={() => triggerSyncNow('internet')}
          disabled={connection.mode === 'syncing'}
          className="w-full min-h-[48px] rounded-xl inline-flex items-center justify-center gap-2 text-[calc(14px*var(--sf-font-scale,1))] font-semibold transition-opacity hover:opacity-90 disabled:opacity-60"
          style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' }}
        >
          <RefreshCw
            className={`w-4 h-4 ${connection.mode === 'syncing' ? 'animate-spin' : ''}`}
          />
          {connection.mode === 'syncing' ? 'Syncing…' : 'Sync now'}
        </button>

        {connection.bluetoothNearby && (
          <button
            type="button"
            onClick={() => triggerSyncNow('bluetooth')}
            disabled={connection.mode === 'syncing'}
            className="w-full min-h-[48px] rounded-xl inline-flex items-center justify-center gap-2 text-[calc(13.5px*var(--sf-font-scale,1))] font-semibold transition-colors hover:bg-[var(--bg-surface-hover)]"
            style={{
              backgroundColor: 'var(--bg-surface-subtle)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-primary)',
            }}
          >
            <Bluetooth className="w-4 h-4" style={{ color: 'var(--accent)' }} />
            Sync nearby
          </button>
        )}

        <button
          type="button"
          onClick={() => {
            setConnectionSheetOpen(false);
            setPairingOpen(true);
          }}
          className="w-full min-h-[44px] rounded-xl text-[calc(12.5px*var(--sf-font-scale,1))] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        >
          Pair a different PC
        </button>
      </div>
    </BottomSheetFrame>
  );
};

export const BreakPromptSheet: React.FC = () => {
  const { focus, startBreakInterval, skipBreakInterval } = useCompanion();
  if (!focus.showBreakSheet) return null;

  return (
    <BottomSheetFrame title="Take a break?" onClose={skipBreakInterval}>
      <div className="flex items-start gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{
            backgroundColor: 'var(--accent-soft)',
            border: '1px solid var(--accent-border)',
            color: 'var(--accent)',
          }}
        >
          <AlarmClock className="w-5 h-5" />
        </div>
        <div className="space-y-1">
          <p className="text-[calc(14px*var(--sf-font-scale,1))] font-semibold text-[var(--text-primary)]">
            {focus.intervalMinutes}-minute focus interval finished
          </p>
          <p className="text-[calc(13px*var(--sf-font-scale,1))] text-[var(--text-secondary)]">
            Take a short {focus.breakMinutes}-minute pause before continuing {focus.sessionTitle}.
            Screen time during breaks is never counted.
          </p>
        </div>
      </div>

      <div className="space-y-2 pt-1">
        <button
          type="button"
          onClick={startBreakInterval}
          className="w-full min-h-[48px] rounded-xl text-[calc(14px*var(--sf-font-scale,1))] font-semibold transition-opacity hover:opacity-90"
          style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' }}
        >
          Start 5-minute break
        </button>
        <button
          type="button"
          onClick={skipBreakInterval}
          className="w-full min-h-[48px] rounded-xl text-[calc(13.5px*var(--sf-font-scale,1))] font-medium transition-colors hover:bg-[var(--bg-surface-hover)]"
          style={{
            backgroundColor: 'var(--bg-surface-subtle)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--text-primary)',
          }}
        >
          Skip break
        </button>
      </div>
    </BottomSheetFrame>
  );
};
