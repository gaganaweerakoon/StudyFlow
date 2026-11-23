import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  BatteryMedium,
  Bluetooth,
  CalendarDays,
  Home,
  Settings,
  SlidersHorizontal,
  Timer,
  Wifi,
  WifiOff,
  X,
} from 'lucide-react';
import { THEME_OPTIONS } from '../data/mockData';
import { CompanionProvider, useCompanion } from './CompanionContext';
import type { LiveCompanionData } from './CompanionContext';
import { formatMinutes12h, fromAbsMin } from './companionLogic';
import {
  FullScreenAlarmOverlay,
  NotificationBanner,
  PairingFlowOverlay,
} from './overlays/AlertsAndPairing';
import {
  BreakPromptSheet,
  ConnectionSheet,
  EventDetailSheet,
} from './overlays/BottomSheets';
import { ReviewerWorkbench } from './ReviewerWorkbench';
import type { MobileTabId } from './types';
import { CalendarView } from './views/CalendarView';
import { FocusView } from './views/FocusView';
import { SettingsView } from './views/SettingsView';
import { TodayView } from './views/TodayView';

function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return `rgba(79, 70, 229, ${alpha})`;
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

const BOTTOM_TABS: { id: MobileTabId; label: string; Icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'today', label: 'Today', Icon: Home },
  { id: 'calendar', label: 'Calendar', Icon: CalendarDays },
  { id: 'focus', label: 'Focus', Icon: Timer },
  { id: 'settings', label: 'Settings', Icon: Settings },
];

interface CompanionAppProps {
  onBackToDesktop?: () => void;
  installed?: boolean;
  live?: LiveCompanionData;
}

const AndroidDeviceShell: React.FC<CompanionAppProps> = ({ onBackToDesktop, installed = false }) => {
  const {
    activeTab,
    setActiveTab,
    nowAbsMin,
    connection,
    focus,
    settings,
    viewport,
    phoneToast,
    handleAndroidBack,
  } = useCompanion();

  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  // Sync exact StudyFlow PC theme + accent tokens onto document root for full visual fidelity
  useEffect(() => {
    const root = document.documentElement;
    if (settings.theme === 'light') {
      root.removeAttribute('data-theme');
      root.classList.remove('dark');
    } else {
      root.setAttribute('data-theme', settings.theme);
      const themeMeta = THEME_OPTIONS.find((t) => t.id === settings.theme);
      if (themeMeta?.isDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    }
    root.style.setProperty('--accent', settings.accentColor);
    root.style.setProperty('--accent-hover', settings.accentColor);
    root.style.setProperty('--accent-soft', hexToRgba(settings.accentColor, 0.12));
    root.style.setProperty('--accent-border', hexToRgba(settings.accentColor, 0.30));
  }, [settings.theme, settings.accentColor]);

  // Android system Back navigation via Escape key
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleAndroidBack();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleAndroidBack]);

  const { minuteOfDay } = fromAbsMin(nowAbsMin);
  const statusClock = formatMinutes12h(minuteOfDay).replace(/\s?(AM|PM)$/, '');
  const isTimerRunning = focus.phase === 'focus' || focus.phase === 'break';

  const phoneStyle = {
    width: installed ? '100%' : `${viewport.widthDp}px`,
    height: installed ? '100dvh' : '844px',
    maxWidth: '100%',
    backgroundColor: 'var(--bg-canvas)',
    color: 'var(--text-primary)',
    border: installed ? undefined : '1px solid var(--border-strong)',
    boxShadow: installed ? undefined : 'var(--shadow-floating)',
    ['--sf-font-scale' as string]: String(viewport.fontScale),
  } as React.CSSProperties;

  return (
    <div
      className={installed ? "w-full" : "min-h-screen w-full flex flex-col items-center justify-center p-3 sm:p-6"}
      style={{ backgroundColor: 'var(--bg-sidebar)', color: 'var(--text-primary)' }}
    >
      {/* Narrow-viewport toggle for Reviewer Workbench drawer */}
      {!installed && <div className="lg:hidden w-full max-w-[420px] flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <span
            className="w-6 h-6 rounded-md flex items-center justify-center text-[12px] font-bold"
            style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' }}
          >
            S
          </span>
          <span className="font-display text-[14px] font-semibold">StudyFlow Android</span>
        </div>
        <button
          type="button"
          onClick={() => setMobileDrawerOpen(true)}
          className="h-9 px-3 rounded-lg inline-flex items-center gap-1.5 text-[12.5px] font-medium"
          style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--text-primary)',
          }}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          Workbench
        </button>
      </div>}

      {/* Main Side-by-Side Layout: Android Phone Frame + Reviewer Workbench */}
      <div className={installed ? "w-full" : "w-full max-w-[1160px] flex flex-col lg:flex-row items-center lg:items-start justify-center gap-6 xl:gap-8"}>
        {/* Android Device Viewport (390 × 844 dp or 360 × 844 dp) */}
        <div className={installed ? "w-full" : "flex flex-col items-center shrink-0"}>
          <div
            data-testid="android-phone-frame"
            data-theme={settings.theme}
            data-width-dp={installed ? undefined : viewport.widthDp}
            data-font-scale={viewport.fontScale}
            className={`relative overflow-hidden flex flex-col select-none ${installed ? "" : "rounded-[32px] transition-[width] duration-200"}`}
            style={phoneStyle}
          >
            {/* Simulated status bar belongs only to the browser preview. Android supplies its own. */}
            {!installed && <div
              className="h-[34px] px-5 flex items-center justify-between text-[12px] font-medium shrink-0 z-20"
              style={{
                backgroundColor:
                  activeTab === 'calendar' ? 'var(--bg-surface)' : 'var(--bg-canvas)',
                color: 'var(--text-primary)',
              }}
            >
              <span className="font-mono-num font-semibold">{statusClock}</span>
              <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                {connection.bluetoothNearby && connection.isPaired && (
                  <Bluetooth className="w-3.5 h-3.5" />
                )}
                {connection.mode === 'offline' ? (
                  <WifiOff className="w-3.5 h-3.5" />
                ) : (
                  <Wifi className="w-3.5 h-3.5" />
                )}
                <BatteryMedium className="w-4 h-4" />
              </div>
            </div>}

            {/* Quiet Top Android Notification Banner */}
            <NotificationBanner />

            {/* Scalable Main Scrollable Content Area */}
            <main
              className={`flex-1 min-h-0 relative ${
                activeTab === 'calendar' ? 'overflow-hidden flex flex-col' : 'overflow-y-auto'
              }`}
              style={{
                fontSize: `${14 * viewport.fontScale}px`,
                zoom: viewport.fontScale === 1 ? undefined : 1,
              }}
            >
              <div
                className={activeTab === 'calendar' ? 'h-full flex flex-col' : 'min-h-full'}
                style={
                  viewport.fontScale !== 1
                    ? {
                        transformOrigin: 'top left',
                      }
                    : undefined
                }
              >
                {activeTab === 'today' && <TodayView />}
                {activeTab === 'calendar' && <CalendarView />}
                {activeTab === 'focus' && <FocusView />}
                {activeTab === 'settings' && <SettingsView />}
              </div>
            </main>

            {/* In-Phone Transient Toast Feedback */}
            {phoneToast && (
              <div
                role="status"
                aria-live="polite"
                className="absolute bottom-[92px] left-4 right-4 z-40 rounded-xl px-3.5 py-2.5 text-[12.5px] font-medium text-center pointer-events-none"
                style={{
                  backgroundColor: 'var(--bg-elevated)',
                  border: '1px solid var(--border-strong)',
                  color: 'var(--text-primary)',
                  boxShadow: 'var(--shadow-floating)',
                }}
              >
                {phoneToast}
              </div>
            )}

            {/* 4-Tab Android Bottom Navigation Bar (Today, Calendar, Focus, Settings) */}
            <nav
              aria-label="Android bottom navigation"
              className="shrink-0 grid grid-cols-4 h-[64px] px-1 z-20"
              style={{
                backgroundColor: 'var(--bg-surface)',
                borderTop: '1px solid var(--border-subtle)',
              }}
            >
              {BOTTOM_TABS.map(({ id, label, Icon }) => {
                const active = activeTab === id;
                return (
                  <button
                    key={id}
                    type="button"
                    aria-current={active ? 'page' : undefined}
                    onClick={() => setActiveTab(id)}
                    className="min-h-[48px] flex flex-col items-center justify-center gap-1 rounded-xl transition-colors relative"
                    style={{
                      color: active ? 'var(--accent)' : 'var(--text-muted)',
                    }}
                  >
                    <span
                      className="w-12 h-7 rounded-full flex items-center justify-center transition-colors relative"
                      style={{
                        backgroundColor: active ? 'var(--accent-soft)' : 'transparent',
                      }}
                    >
                      <Icon className="w-[18px] h-[18px]" />
                      {id === 'focus' && isTimerRunning && (
                        <span
                          className="w-2 h-2 rounded-full absolute top-1 right-2.5"
                          style={{ backgroundColor: 'var(--accent)' }}
                          aria-label="Timer running"
                        />
                      )}
                    </span>
                    <span className="text-[11px] font-medium leading-none">{label}</span>
                  </button>
                );
              })}
            </nav>

            {/* Demo-only gesture strip and Back button. Android's system back handles the installed app. */}
            {!installed && <div
              className="h-[26px] px-6 flex items-center justify-between shrink-0 z-20"
              style={{ backgroundColor: 'var(--bg-surface)' }}
            >
              <button
                type="button"
                onClick={handleAndroidBack}
                aria-label="Android back"
                title="Android back (Esc)"
                className="h-6 px-2 -ml-2 inline-flex items-center gap-1 text-[11px] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                <ArrowLeft className="w-3 h-3" />
                Back
              </button>
              <span
                className="w-28 h-1 rounded-full"
                style={{ backgroundColor: 'var(--border-strong)' }}
                aria-hidden="true"
              />
              <span className="w-10 text-right font-mono-num text-[10px] text-[var(--text-muted)]">
                `${viewport.widthDp}dp`
              </span>
            </div>}

            {/* Bottom Sheets Layer */}
            <EventDetailSheet />
            <ConnectionSheet />
            <BreakPromptSheet />

            {/* Full-Screen Overlays (Alarms & Pairing) */}
            <FullScreenAlarmOverlay />
            <PairingFlowOverlay />
          </div>
        </div>

        {/* Desktop Side-by-Side Reviewer Workbench */}
        {!installed && <div className="hidden lg:block">
          <ReviewerWorkbench onBackToDesktop={onBackToDesktop} />
        </div>}
      </div>

      {/* Mobile Drawer for Reviewer Workbench on Narrow Screens */}
      {mobileDrawerOpen && (
        <div
          className="fixed inset-0 z-50 lg:hidden flex justify-end"
          role="dialog"
          aria-modal="true"
          aria-label="Reviewer workbench drawer"
        >
          <button
            type="button"
            aria-label="Close workbench drawer"
            onClick={() => setMobileDrawerOpen(false)}
            className="absolute inset-0 bg-black/50"
          />
          <div
            className="relative z-10 w-full max-w-[380px] h-full overflow-y-auto p-4"
            style={{ backgroundColor: 'var(--bg-canvas)' }}
          >
            <div className="flex justify-end mb-2">
              <button
                type="button"
                onClick={() => setMobileDrawerOpen(false)}
                aria-label="Close workbench"
                className="min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-primary)',
                }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <ReviewerWorkbench onBackToDesktop={onBackToDesktop} />
          </div>
        </div>
      )}
    </div>
  );
};

export const MobileCompanionApp: React.FC<CompanionAppProps> = ({
  onBackToDesktop, installed, live,
}) => {
  return (
    <CompanionProvider live={live}>
      <AndroidDeviceShell onBackToDesktop={onBackToDesktop} installed={installed} />
    </CompanionProvider>
  );
};
