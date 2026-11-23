import React from 'react';
import {
  AlarmClock,
  Bluetooth,
  CheckCircle2,
  ChevronRight,
  CloudOff,
  Moon,
  Play,
  RefreshCw,
  Timer,
  Wifi,
} from 'lucide-react';
import { useCompanion } from '../CompanionContext';
import {
  formatCountdownMMSS,
  formatDayLabel,
  formatDurationLabel,
  formatTimeRange,
  fromAbsMin,
  getWakeUpReadiness,
  resolveNextSleepSummary,
  resolveTodayStudyView,
} from '../companionLogic';

export const TodayView: React.FC = () => {
  const {
    nowAbsMin,
    liveMode,
    blocks,
    subjects,
    focus,
    connection,
    permissions,
    snoozedWakeUp,
    openEventSheet,
    setConnectionSheetOpen,
    startFocusForBlock,
    setActiveTab,
    setFocusFullScreen,
  } = useCompanion();

  const { dayIndex, minuteOfDay } = fromAbsMin(nowAbsMin);
  const subjectMap = new Map(subjects.map((s) => [s.id, s]));

  const { heroSession, heroStatus, heroStatusText, remainingSessions } = resolveTodayStudyView(
    blocks,
    nowAbsMin
  );
  const sleepSummary = resolveNextSleepSummary(blocks, nowAbsMin, snoozedWakeUp);
  const readiness = getWakeUpReadiness(blocks, nowAbsMin, permissions, snoozedWakeUp);

  const greeting =
    minuteOfDay < 12 * 60
      ? 'Good morning'
      : minuteOfDay < 17 * 60
      ? 'Good afternoon'
      : 'Good evening';

  const isTimerActive =
    focus.phase === 'focus' ||
    focus.phase === 'paused' ||
    focus.phase === 'break' ||
    focus.phase === 'break_paused';

  const heroSubject = heroSession?.subjectId ? subjectMap.get(heroSession.subjectId) : undefined;
  const activeFocusSubject = subjectMap.get(focus.subjectId);

  const connectionLabel = !connection.isPaired
    ? 'Not paired'
    : connection.mode === 'syncing'
    ? 'Syncing'
    : connection.mode === 'internet'
    ? (liveMode ? 'PC · Wi-Fi' : 'PC · Internet')
    : connection.mode === 'bluetooth'
    ? 'PC · Nearby'
    : 'PC · Offline';

  const ConnectionIcon = !connection.isPaired
    ? CloudOff
    : connection.mode === 'syncing'
    ? RefreshCw
    : connection.mode === 'internet'
    ? Wifi
    : connection.mode === 'bluetooth'
    ? Bluetooth
    : CloudOff;

  return (
    <div className="px-4 pb-6 pt-3 space-y-4">
      {/* Header with Date/Greeting + Tappable PC Connection Indicator */}
      <header className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[calc(12px*var(--sf-font-scale,1))] text-[var(--text-muted)] truncate">
            {formatDayLabel(dayIndex)}
          </p>
          <h1 className="font-display text-[calc(20px*var(--sf-font-scale,1))] font-semibold tracking-tight text-[var(--text-primary)] leading-snug">
            {liveMode ? greeting : `${greeting}, Maya`}
          </h1>
        </div>

        <button
          type="button"
          onClick={() => setConnectionSheetOpen(true)}
          aria-label={`PC connection status: ${connectionLabel}. Tap to manage connection.`}
          className="min-h-[48px] px-3 rounded-xl inline-flex items-center gap-1.5 text-[calc(12px*var(--sf-font-scale,1))] font-medium shrink-0 transition-colors hover:bg-[var(--bg-surface-hover)]"
          style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            color:
              connection.mode === 'offline' || !connection.isPaired
                ? 'var(--text-muted)'
                : 'var(--text-primary)',
            boxShadow: 'var(--shadow-subtle)',
          }}
        >
          <ConnectionIcon
            className={`w-3.5 h-3.5 shrink-0 ${connection.mode === 'syncing' ? 'animate-spin' : ''}`}
            style={{
              color:
                connection.mode === 'offline' || !connection.isPaired
                  ? 'var(--text-muted)'
                  : 'var(--accent)',
            }}
          />
          <span className="whitespace-nowrap">{connectionLabel}</span>
        </button>
      </header>

      {/* Offline saved-schedule banner (quiet inline surface using PC tokens) */}
      {connection.mode === 'offline' && (
        <div
          role="status"
          className="rounded-xl px-3.5 py-2.5 flex items-center justify-between gap-2 text-[calc(12px*var(--sf-font-scale,1))]"
          style={{
            backgroundColor: 'var(--bg-surface-subtle)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--text-secondary)',
          }}
        >
          <div className="flex items-center gap-2 min-w-0">
            <CloudOff className="w-4 h-4 shrink-0 text-[var(--text-muted)]" />
            <span className="truncate">
              Offline · Saved schedule · Last synced {connection.lastSyncedLabel}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setConnectionSheetOpen(true)}
            className="text-[calc(12px*var(--sf-font-scale,1))] font-medium shrink-0 underline underline-offset-2"
            style={{ color: 'var(--accent)' }}
          >
            Details
          </button>
        </div>
      )}

      {/* Pending PC edit notice when online */}
      {connection.pendingPcEdit && connection.mode !== 'offline' && (
        <button
          type="button"
          onClick={() => setConnectionSheetOpen(true)}
          className="w-full min-h-[48px] rounded-xl px-3.5 py-2.5 flex items-center justify-between gap-2 text-left text-[calc(12px*var(--sf-font-scale,1))] transition-colors"
          style={{
            backgroundColor: 'var(--accent-soft)',
            border: '1px solid var(--accent-border)',
            color: 'var(--text-primary)',
          }}
        >
          <span className="truncate font-medium">
            Update ready from {connection.pcName}
          </span>
          <span className="font-semibold shrink-0" style={{ color: 'var(--accent)' }}>
            Review sync
          </span>
        </button>
      )}

      {/* Prominent Hero Card: Active Timer OR Current/Next Study Session OR End-of-Day State */}
      {isTimerActive ? (
        <section
          aria-label="Active focus session"
          className="rounded-xl p-4 space-y-3"
          style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            boxShadow: 'var(--shadow-subtle)',
          }}
        >
          <div className="flex items-center justify-between gap-2 text-[calc(12px*var(--sf-font-scale,1))]">
            <div className="flex items-center gap-1.5 min-w-0">
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: activeFocusSubject?.color ?? 'var(--accent)' }}
              />
              <span className="font-semibold truncate" style={{ color: activeFocusSubject?.color ?? 'var(--accent)' }}>
                {activeFocusSubject?.code ?? 'Focus'}
              </span>
              <span aria-hidden="true" className="text-[var(--text-muted)]">·</span>
              <span className="text-[var(--text-secondary)] truncate">
                {focus.phase === 'break' || focus.phase === 'break_paused'
                  ? '5-minute break'
                  : focus.origin === 'pc'
                  ? 'Started on PC'
                  : focus.phase === 'paused'
                  ? 'Paused'
                  : 'Focus running'}
              </span>
            </div>
            {focus.pendingSyncWhenOnline && (
              <span className="text-[calc(11px*var(--sf-font-scale,1))] text-[var(--text-muted)] shrink-0">Offline</span>
            )}
          </div>

          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0">
              <h2 className="font-display text-[calc(17px*var(--sf-font-scale,1))] font-semibold text-[var(--text-primary)] leading-snug">
                {focus.sessionTitle}
              </h2>
              <div
                data-testid="today-live-countdown"
                className="font-mono-num text-[34px] font-semibold tracking-tight leading-none mt-2"
                style={{ color: 'var(--text-primary)' }}
              >
                {formatCountdownMMSS(focus.secondsLeft)}
              </div>
              <p className="text-[calc(12px*var(--sf-font-scale,1))] text-[var(--text-muted)] mt-1.5">
                {focus.pendingSyncWhenOnline
                  ? 'Offline · will sync when connected'
                  : focus.phase === 'break'
                  ? 'Break timer active'
                  : `${focus.intervalMinutes}-min interval`}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setActiveTab('focus');
              setFocusFullScreen(false);
            }}
            className="w-full min-h-[48px] rounded-xl inline-flex items-center justify-center gap-2 text-[calc(14px*var(--sf-font-scale,1))] font-semibold transition-opacity hover:opacity-90"
            style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' }}
          >
            <Timer className="w-4 h-4" />
            Open focus
          </button>
        </section>
      ) : heroSession ? (
        <section
          aria-label="Current or next study session"
          className="rounded-xl p-4 space-y-3"
          style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            boxShadow: 'var(--shadow-subtle)',
          }}
        >
          <div className="flex items-center justify-between gap-2 text-[calc(12px*var(--sf-font-scale,1))]">
            <div className="flex items-center gap-1.5 min-w-0">
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: heroSubject?.color ?? 'var(--accent)' }}
              />
              <span
                className="font-semibold truncate"
                style={{ color: heroSubject?.color ?? 'var(--accent)' }}
              >
                {heroSubject?.code ?? 'STUDY'} · {heroSubject?.name ?? 'Study'}
              </span>
            </div>
            <span
              className="text-[calc(12px*var(--sf-font-scale,1))] font-medium shrink-0"
              style={{
                color: heroStatus === 'in_progress' ? 'var(--accent)' : 'var(--text-secondary)',
              }}
            >
              {heroStatusText}
            </span>
          </div>

          <button
            type="button"
            onClick={() => openEventSheet(heroSession.id)}
            className="w-full text-left group"
          >
            <h2 className="font-display text-[calc(18px*var(--sf-font-scale,1))] font-semibold text-[var(--text-primary)] leading-snug group-hover:underline underline-offset-2">
              {heroSession.title}
            </h2>
            <p className="font-mono-num text-[calc(13px*var(--sf-font-scale,1))] text-[var(--text-secondary)] mt-1">
              {formatTimeRange(heroSession)} · {formatDurationLabel(heroSession.durationMin)}
            </p>
            <p className="text-[calc(12px*var(--sf-font-scale,1))] text-[var(--text-muted)] mt-1">
              {heroSession.advanceNoticeMin > 0
                ? `${heroSession.advanceNoticeMin} min heads-up`
                : 'Heads-up off'}
              {' · '}
              {heroSession.ringAtStart ? 'Start alarm on' : 'Start alarm off'}
            </p>
          </button>

          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => startFocusForBlock(heroSession.id, 'phone', false)}
              className="flex-1 min-h-[48px] px-4 rounded-xl inline-flex items-center justify-center gap-2 text-[calc(14px*var(--sf-font-scale,1))] font-semibold transition-opacity hover:opacity-90"
              style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' }}
            >
              <Play className="w-4 h-4" />
              Start focus
            </button>
            <button
              type="button"
              onClick={() => openEventSheet(heroSession.id)}
              className="min-h-[48px] px-3.5 rounded-xl text-[calc(13px*var(--sf-font-scale,1))] font-medium transition-colors hover:bg-[var(--bg-surface-hover)]"
              style={{
                backgroundColor: 'var(--bg-surface-subtle)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-primary)',
              }}
            >
              Details
            </button>
          </div>
        </section>
      ) : (
        <section
          aria-label="Study sessions complete"
          className="rounded-xl p-4 space-y-1.5"
          style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            boxShadow: 'var(--shadow-subtle)',
          }}
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: 'var(--accent)' }} />
            <h2 className="font-display text-[calc(15px*var(--sf-font-scale,1))] font-semibold text-[var(--text-primary)]">
              Today’s study sessions are done
            </h2>
          </div>
          <p className="text-[calc(13px*var(--sf-font-scale,1))] text-[var(--text-secondary)]">
            No more study blocks scheduled today. Your next sleep and wake-up plan is ready below.
          </p>
        </section>
      )}

      {/* Remaining Study Sessions in Chronological Order */}
      {remainingSessions.length > 0 && (
        <section aria-label="Remaining study sessions" className="space-y-2">
          <div className="flex items-center justify-between px-0.5">
            <h3 className="font-display text-[calc(13px*var(--sf-font-scale,1))] font-semibold text-[var(--text-secondary)]">
              Up next today
            </h3>
            <button
              type="button"
              onClick={() => setActiveTab('calendar')}
              className="min-h-[48px] -my-3 px-1 inline-flex items-center text-[calc(12px*var(--sf-font-scale,1))] font-medium"
              style={{ color: 'var(--accent)' }}
            >
              Full calendar
            </button>
          </div>

          <div
            className="rounded-xl overflow-hidden divide-y"
            style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderColor: 'var(--border-subtle)',
              boxShadow: 'var(--shadow-subtle)',
            }}
          >
            {remainingSessions.map((ses) => {
              const sub = ses.subjectId ? subjectMap.get(ses.subjectId) : undefined;
              return (
                <button
                  key={ses.id}
                  type="button"
                  onClick={() => openEventSheet(ses.id)}
                  className="w-full min-h-[60px] px-3.5 py-3 flex items-center justify-between gap-3 text-left transition-colors hover:bg-[var(--bg-surface-hover)]"
                  style={{ borderColor: 'var(--border-subtle)' }}
                >
                  <div className="flex items-start gap-2.5 min-w-0">
                    <span
                      className="w-2.5 h-2.5 rounded-full mt-1.5 shrink-0"
                      style={{ backgroundColor: sub?.color ?? 'var(--accent)' }}
                    />
                    <div className="min-w-0">
                      <div className="text-[calc(13.5px*var(--sf-font-scale,1))] font-medium text-[var(--text-primary)] truncate">
                        {ses.title}
                      </div>
                      <div className="text-[calc(12px*var(--sf-font-scale,1))] text-[var(--text-muted)] font-mono-num mt-0.5">
                        {sub?.code} · {formatTimeRange(ses)}
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 shrink-0 text-[var(--text-muted)]" />
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* Next Bedtime and Wake-Up (Always visible, including after study sessions end or offline) */}
      <section aria-label="Next sleep and wake-up" className="space-y-2">
        <h3 className="font-display text-[calc(13px*var(--sf-font-scale,1))] font-semibold text-[var(--text-secondary)] px-0.5">
          Sleep & wake-up
        </h3>

        <button
          type="button"
          onClick={() => sleepSummary.sleepBlock && openEventSheet(sleepSummary.sleepBlock.id)}
          className="w-full min-h-[72px] rounded-xl p-3.5 text-left transition-colors hover:bg-[var(--bg-surface-hover)]"
          style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            boxShadow: 'var(--shadow-subtle)',
          }}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                style={{
                  backgroundColor: 'var(--bg-surface-subtle)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-primary)',
                }}
              >
                <Moon className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  <span className="text-[calc(13.5px*var(--sf-font-scale,1))] font-semibold text-[var(--text-primary)]">
                    Bedtime {sleepSummary.bedtimeLabel}
                  </span>
                  <span aria-hidden="true" className="text-[var(--text-muted)]">·</span>
                  <span className="text-[calc(13.5px*var(--sf-font-scale,1))] font-semibold font-mono-num text-[var(--text-primary)]">
                    Wake {sleepSummary.wakeUpLabel}
                  </span>
                </div>
                <p className="text-[calc(12px*var(--sf-font-scale,1))] text-[var(--text-secondary)] mt-1 flex items-center gap-1.5">
                  <AlarmClock className="w-3.5 h-3.5 shrink-0 text-[var(--text-muted)]" />
                  <span className="truncate">{readiness.statusText}</span>
                </p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 shrink-0 text-[var(--text-muted)] mt-1" />
          </div>
        </button>
      </section>
    </div>
  );
};
