import React, { useState } from 'react';
import {
  AlarmClock,
  Bell,
  BookOpen,
  CheckCircle2,
  Coffee,
  Keyboard,
  Moon,
  Play,
  QrCode,
  ScanLine,
  Sun,
  X,
} from 'lucide-react';
import { useCompanion } from '../CompanionContext';

/**
 * Quiet Android notification banner for:
 * 1. Study heads-up (10 or 15 min before study) -> "View session"
 * 2. Bedtime reminder (11:00 PM) -> "View sleep block"
 * 3. End of focus interval (7:55 AM) -> "Start break" / "Skip"
 */
export const NotificationBanner: React.FC = () => {
  const {
    activeBanner,
    dismissActiveBanner,
    openEventSheet,
    startBreakInterval,
    skipBreakInterval,
    subjects,
  } = useCompanion();

  if (!activeBanner) return null;

  const subject = activeBanner.subjectId
    ? subjects.find((s) => s.id === activeBanner.subjectId)
    : undefined;

  const Icon =
    activeBanner.kind === 'bedtime_reminder'
      ? Moon
      : activeBanner.kind === 'focus_break_prompt'
      ? Coffee
      : Bell;

  return (
    <div
      role="status"
      aria-live="polite"
      className="mx-3 mt-2 rounded-2xl p-3.5 space-y-2.5 shrink-0 z-30"
      style={{
        backgroundColor: 'var(--bg-elevated)',
        border: '1px solid var(--border-strong)',
        boxShadow: 'var(--shadow-floating)',
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2.5 min-w-0">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
            style={{
              backgroundColor: subject ? `${subject.color}18` : 'var(--accent-soft)',
              color: subject ? subject.color : 'var(--accent)',
            }}
          >
            <Icon className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="text-[calc(11px*var(--sf-font-scale,1))] font-medium text-[var(--text-muted)]">
              StudyFlow ·{' '}
              {activeBanner.kind === 'study_headsup'
                ? 'Upcoming session'
                : activeBanner.kind === 'bedtime_reminder'
                ? 'Bedtime'
                : 'Focus break'}
            </div>
            <div className="text-[calc(13.5px*var(--sf-font-scale,1))] font-semibold text-[var(--text-primary)] leading-snug truncate">
              {activeBanner.title}
            </div>
            <div className="text-[calc(12px*var(--sf-font-scale,1))] text-[var(--text-secondary)] mt-0.5">
              {activeBanner.subtitle}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={dismissActiveBanner}
          aria-label="Dismiss notification"
          className="min-w-[36px] min-h-[36px] -mt-1 -mr-1 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)]"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Contextual notification actions */}
      <div className="flex items-center gap-2">
        {activeBanner.kind === 'study_headsup' && (
          <button
            type="button"
            onClick={() => {
              const targetId = activeBanner.blockId;
              dismissActiveBanner();
              if (targetId) openEventSheet(targetId);
            }}
            className="min-h-[40px] px-3.5 rounded-lg text-[calc(12.5px*var(--sf-font-scale,1))] font-semibold"
            style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' }}
          >
            View session
          </button>
        )}

        {activeBanner.kind === 'bedtime_reminder' && (
          <button
            type="button"
            onClick={() => {
              const targetId = activeBanner.blockId;
              dismissActiveBanner();
              if (targetId) openEventSheet(targetId);
            }}
            className="min-h-[40px] px-3.5 rounded-lg text-[calc(12.5px*var(--sf-font-scale,1))] font-semibold"
            style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' }}
          >
            View sleep block
          </button>
        )}

        {activeBanner.kind === 'focus_break_prompt' && (
          <>
            <button
              type="button"
              onClick={startBreakInterval}
              className="min-h-[40px] px-3.5 rounded-lg text-[calc(12.5px*var(--sf-font-scale,1))] font-semibold"
              style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' }}
            >
              Start break
            </button>
            <button
              type="button"
              onClick={skipBreakInterval}
              className="min-h-[40px] px-3.5 rounded-lg text-[calc(12.5px*var(--sf-font-scale,1))] font-medium"
              style={{
                backgroundColor: 'var(--bg-surface-subtle)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-primary)',
              }}
            >
              Skip
            </button>
          </>
        )}
      </div>
    </div>
  );
};

/**
 * Full-Screen Alarm Layer:
 * Renders visually distinct Study Start Alarm vs Sleep Wake-Up Alarm,
 * both strictly adhering to the active StudyFlow PC theme tokens.
 */
export const FullScreenAlarmOverlay: React.FC = () => {
  const {
    activeAlarm,
    subjects,
    startFocusForBlock,
    dismissActiveAlarm,
    snoozeWakeUpAlarm,
  } = useCompanion();

  if (!activeAlarm) return null;

  if (activeAlarm.kind === 'study_start_alarm') {
    const subject = activeAlarm.subjectId
      ? subjects.find((s) => s.id === activeAlarm.subjectId)
      : undefined;
    const color = subject?.color ?? 'var(--accent)';

    return (
      <div
        role="alertdialog"
        aria-modal="true"
        aria-label={`Study session starting: ${activeAlarm.title}`}
        className="absolute inset-0 z-50 flex flex-col justify-between p-6"
        style={{ backgroundColor: 'var(--bg-canvas)' }}
      >
        <div className="pt-4 text-center space-y-1">
          <div className="inline-flex items-center gap-1.5 text-[calc(12px*var(--sf-font-scale,1))] font-semibold text-[var(--text-muted)]">
            <BookOpen className="w-3.5 h-3.5" />
            <span>Study session starting</span>
          </div>
          <p className="font-mono-num text-[calc(13px*var(--sf-font-scale,1))] text-[var(--text-secondary)]">
            {activeAlarm.dateLabel}
          </p>
        </div>

        {/* Center Study Alarm Card */}
        <div
          className="rounded-2xl p-6 text-center space-y-4"
          style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            boxShadow: 'var(--shadow-floating)',
          }}
        >
          <div
            className="w-12 h-12 rounded-xl mx-auto flex items-center justify-center"
            style={{
              backgroundColor: `${color}18`,
              border: `1px solid ${color}45`,
              color,
            }}
          >
            <AlarmClock className="w-6 h-6" />
          </div>

          <div className="space-y-1">
            <div className="text-[calc(12.5px*var(--sf-font-scale,1))] font-semibold" style={{ color }}>
              {subject ? `${subject.code} · ${subject.name}` : 'Study'}
            </div>
            <h1 className="font-display text-[calc(22px*var(--sf-font-scale,1))] font-semibold text-[var(--text-primary)] leading-snug">
              {activeAlarm.title}
            </h1>
          </div>

          <div className="font-mono-num text-[42px] font-semibold tracking-tight text-[var(--text-primary)] leading-none">
            {activeAlarm.exactTimeLabel}
          </div>
          <p className="text-[calc(12.5px*var(--sf-font-scale,1))] text-[var(--text-muted)]">
            25-minute focus interval ready to start
          </p>
        </div>

        {/* Primary Study Alarm Actions */}
        <div className="space-y-2.5 pb-4">
          <button
            type="button"
            onClick={() => startFocusForBlock(activeAlarm.blockId, 'alarm', false)}
            className="w-full min-h-[52px] rounded-xl inline-flex items-center justify-center gap-2 text-[calc(15px*var(--sf-font-scale,1))] font-semibold transition-opacity hover:opacity-90"
            style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' }}
          >
            <Play className="w-4 h-4" />
            Start focus
          </button>
          <button
            type="button"
            onClick={dismissActiveAlarm}
            className="w-full min-h-[48px] rounded-xl text-[calc(14px*var(--sf-font-scale,1))] font-medium transition-colors hover:bg-[var(--bg-surface-hover)]"
            style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-secondary)',
            }}
          >
            Dismiss
          </button>
        </div>
      </div>
    );
  }

  // Visually distinct Sleep Wake-Up Alarm (large clock digits, date, Snooze 5 min + Dismiss)
  const [digits, meridiem] = activeAlarm.exactTimeLabel.split(' ');
  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-label={`Wake-up alarm: ${activeAlarm.exactTimeLabel}`}
      className="absolute inset-0 z-50 flex flex-col justify-between p-6"
      style={{ backgroundColor: 'var(--bg-canvas)' }}
    >
      <div className="pt-6 text-center space-y-2">
        <div
          className="w-11 h-11 rounded-full mx-auto flex items-center justify-center"
          style={{
            backgroundColor: 'var(--bg-surface-subtle)',
            border: '1px solid var(--border-strong)',
            color: 'var(--text-primary)',
          }}
        >
          <Sun className="w-5 h-5" />
        </div>
        <div className="text-[calc(13px*var(--sf-font-scale,1))] font-semibold text-[var(--text-secondary)]">
          {activeAlarm.isSnoozed ? 'Wake-up alarm · Snoozed' : 'End of scheduled sleep'}
        </div>
      </div>

      {/* Oversized Wake-Up Clock Digits + Date */}
      <div className="text-center space-y-2 py-4">
        <div className="flex items-baseline justify-center gap-2">
          <span
            data-testid="wakeup-alarm-time"
            className="font-mono-num text-[68px] font-semibold tracking-tight leading-none text-[var(--text-primary)]"
          >
            {digits}
          </span>
          <span className="font-mono-num text-[calc(22px*var(--sf-font-scale,1))] font-semibold text-[var(--text-muted)]">
            {meridiem}
          </span>
        </div>
        <p className="font-display text-[calc(17px*var(--sf-font-scale,1))] font-medium text-[var(--text-secondary)]">
          {activeAlarm.dateLabel}
        </p>
        <p className="text-[calc(12.5px*var(--sf-font-scale,1))] text-[var(--text-muted)] pt-1">
          {activeAlarm.subtitle}
        </p>
      </div>

      {/* Wake-Up Alarm Actions */}
      <div className="space-y-2.5 pb-4">
        <button
          type="button"
          onClick={snoozeWakeUpAlarm}
          className="w-full min-h-[52px] rounded-xl text-[calc(15px*var(--sf-font-scale,1))] font-semibold transition-colors hover:bg-[var(--bg-surface-hover)]"
          style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-strong)',
            color: 'var(--text-primary)',
          }}
        >
          Snooze 5 min
        </button>
        <button
          type="button"
          onClick={dismissActiveAlarm}
          className="w-full min-h-[52px] rounded-xl text-[calc(15px*var(--sf-font-scale,1))] font-semibold transition-opacity hover:opacity-90"
          style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' }}
        >
          Dismiss
        </button>
      </div>
    </div>
  );
};

/**
 * First-Run / Replayable PC Pairing Flow:
 * Scan PC QR code, Enter pairing code, Skip for now -> Paired confirmation with PC name.
 */
export const PairingFlowOverlay: React.FC = () => {
  const { pairingOpen, setPairingOpen, completePairing, skipPairing } = useCompanion();
  const [step, setStep] = useState<'choose' | 'qr' | 'code' | 'confirmed'>('choose');
  const [codeValue, setCodeValue] = useState('SF-4829');
  const [pairedPcName, setPairedPcName] = useState("Maya's StudyFlow PC");

  if (!pairingOpen) return null;

  const resetAndClose = () => {
    setStep('choose');
    setPairingOpen(false);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Pair StudyFlow PC"
      className="absolute inset-0 z-50 flex flex-col justify-between p-5"
      style={{ backgroundColor: 'var(--bg-canvas)' }}
    >
      {/* Top Bar */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-2">
          <span
            className="w-7 h-7 rounded-lg flex items-center justify-center text-[calc(13px*var(--sf-font-scale,1))] font-bold"
            style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' }}
          >
            S
          </span>
          <span className="font-display text-[calc(15px*var(--sf-font-scale,1))] font-semibold text-[var(--text-primary)]">
            StudyFlow
          </span>
        </div>
        <button
          type="button"
          onClick={resetAndClose}
          aria-label="Close pairing"
          className="min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)]"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Main Content */}
      <div className="my-auto py-4 space-y-5">
        {step === 'choose' && (
          <>
            <div className="space-y-1.5">
              <h1 className="font-display text-[calc(22px*var(--sf-font-scale,1))] font-semibold text-[var(--text-primary)] leading-tight">
                Connect your StudyFlow PC
              </h1>
              <p className="text-[calc(13.5px*var(--sf-font-scale,1))] text-[var(--text-secondary)] leading-relaxed">
                Keep your study blocks, overnight wake-up alarms, and focus timer synced between
                Windows and Android.
              </p>
            </div>

            <div className="space-y-2.5">
              <button
                type="button"
                onClick={() => setStep('qr')}
                className="w-full min-h-[56px] px-4 rounded-xl flex items-center gap-3 text-left transition-opacity hover:opacity-90"
                style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' }}
              >
                <QrCode className="w-5 h-5 shrink-0" />
                <div>
                  <div className="text-[calc(14px*var(--sf-font-scale,1))] font-semibold">Scan PC QR code</div>
                  <div className="text-[calc(11.5px*var(--sf-font-scale,1))] opacity-85">
                    Open Settings → Companion on StudyFlow PC
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setStep('code')}
                className="w-full min-h-[56px] px-4 rounded-xl flex items-center gap-3 text-left transition-colors hover:bg-[var(--bg-surface-hover)]"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-primary)',
                }}
              >
                <Keyboard className="w-5 h-5 shrink-0 text-[var(--text-secondary)]" />
                <div>
                  <div className="text-[calc(14px*var(--sf-font-scale,1))] font-semibold">Enter pairing code</div>
                  <div className="text-[calc(11.5px*var(--sf-font-scale,1))] text-[var(--text-muted)]">
                    Type the 6-character code shown on desktop
                  </div>
                </div>
              </button>
            </div>
          </>
        )}

        {step === 'qr' && (
          <div className="space-y-4 text-center">
            <h1 className="font-display text-[calc(19px*var(--sf-font-scale,1))] font-semibold text-[var(--text-primary)]">
              Scan PC QR code
            </h1>
            <div
              className="mx-auto w-56 h-56 rounded-2xl flex flex-col items-center justify-center gap-3 relative overflow-hidden"
              style={{
                backgroundColor: 'var(--bg-surface)',
                border: '1.5px solid var(--accent-border)',
              }}
            >
              <ScanLine className="w-16 h-16" style={{ color: 'var(--accent)' }} />
              <span className="text-[calc(12px*var(--sf-font-scale,1))] font-mono-num text-[var(--text-muted)]">
                Camera preview ready
              </span>
            </div>
            <p className="text-[calc(12.5px*var(--sf-font-scale,1))] text-[var(--text-secondary)]">
              Point at the QR code in StudyFlow Windows Settings.
            </p>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => {
                  setPairedPcName("Maya's StudyFlow PC");
                  setStep('confirmed');
                }}
                className="w-full min-h-[48px] rounded-xl text-[calc(14px*var(--sf-font-scale,1))] font-semibold"
                style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' }}
              >
                Simulate successful scan
              </button>
              <button
                type="button"
                onClick={() => setStep('choose')}
                className="w-full min-h-[44px] rounded-xl text-[calc(13px*var(--sf-font-scale,1))] font-medium text-[var(--text-secondary)]"
              >
                Back
              </button>
            </div>
          </div>
        )}

        {step === 'code' && (
          <div className="space-y-4">
            <div className="space-y-1">
              <h1 className="font-display text-[calc(19px*var(--sf-font-scale,1))] font-semibold text-[var(--text-primary)]">
                Enter pairing code
              </h1>
              <p className="text-[calc(12.5px*var(--sf-font-scale,1))] text-[var(--text-secondary)]">
                Enter the code shown in StudyFlow PC → Settings → Pair phone.
              </p>
            </div>
            <input
              type="text"
              aria-label="Pairing code"
              value={codeValue}
              onChange={(e) => setCodeValue(e.target.value.toUpperCase())}
              className="w-full min-h-[52px] px-4 rounded-xl font-mono-num text-[calc(20px*var(--sf-font-scale,1))] font-semibold tracking-widest text-center text-[var(--text-primary)]"
              style={{
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-strong)',
              }}
            />
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => {
                  setPairedPcName("Maya's StudyFlow PC");
                  setStep('confirmed');
                }}
                disabled={codeValue.trim().length < 4}
                className="w-full min-h-[48px] rounded-xl text-[calc(14px*var(--sf-font-scale,1))] font-semibold disabled:opacity-50"
                style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' }}
              >
                Pair PC
              </button>
              <button
                type="button"
                onClick={() => setStep('choose')}
                className="w-full min-h-[44px] rounded-xl text-[calc(13px*var(--sf-font-scale,1))] font-medium text-[var(--text-secondary)]"
              >
                Back
              </button>
            </div>
          </div>
        )}

        {step === 'confirmed' && (
          <div
            className="rounded-2xl p-5 text-center space-y-3"
            style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              boxShadow: 'var(--shadow-subtle)',
            }}
          >
            <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-600" />
            <div className="space-y-1">
              <h1 className="font-display text-[calc(19px*var(--sf-font-scale,1))] font-semibold text-[var(--text-primary)]">
                Paired with {pairedPcName}
              </h1>
              <p className="text-[calc(13px*var(--sf-font-scale,1))] text-[var(--text-secondary)]">
                Your Asia/Colombo schedule, sleep alarms, and focus timer are synced over Internet
                and Bluetooth nearby.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setStep('choose');
                completePairing(pairedPcName);
              }}
              className="w-full min-h-[48px] rounded-xl text-[calc(14px*var(--sf-font-scale,1))] font-semibold mt-2"
              style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' }}
            >
              Open Today
            </button>
          </div>
        )}
      </div>

      {/* Bottom Skip Option */}
      {step === 'choose' ? (
        <button
          type="button"
          onClick={() => {
            setStep('choose');
            skipPairing();
          }}
          className="w-full min-h-[48px] rounded-xl text-[calc(13.5px*var(--sf-font-scale,1))] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        >
          Skip for now
        </button>
      ) : (
        <div className="h-4" />
      )}
    </div>
  );
};
