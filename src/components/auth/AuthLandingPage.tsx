import React, { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { invoke, isTauri } from '@tauri-apps/api/core';
import { ArrowRight, Loader2, Moon, Sun } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../firebase/AuthContext';
import { GoogleMark, type GoogleProfile } from '../../desktop/GoogleAccount';
import { StudyFlowShowcaseStage, type ShowcaseSceneId } from './StudyFlowHeroSvg';

const CHAPTERS: { id: ShowcaseSceneId; num: string; label: string }[] = [
  { id: 'planner', num: '01', label: 'Planner' },
  { id: 'focus', num: '02', label: 'Focus' },
  { id: 'notes', num: '03', label: 'Notes' },
  { id: 'pip', num: '04', label: 'Pip AI' },
];

export const AuthLoadingScreen: React.FC = () => {
  const prefersReduced = useReducedMotion();

  return (
    <div
      role="status"
      aria-label="Loading StudyFlow"
      className="min-h-screen w-screen flex flex-col items-center justify-center p-6"
      style={{ backgroundColor: 'var(--bg-canvas)', color: 'var(--text-primary)' }}
    >
      <div className="flex flex-col items-center gap-4">
        <motion.div
          className="w-12 h-12 rounded-2xl flex items-center justify-center font-display text-[20px] font-bold"
          style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' }}
          animate={prefersReduced ? {} : { scale: [1, 1.06, 1] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
        >
          S
        </motion.div>
        <div className="flex items-center gap-2 text-[13px] text-[var(--text-muted)]">
          <Loader2 className="w-4 h-4 animate-spin" style={{ color: 'var(--accent)' }} />
          <span>Opening StudyFlow…</span>
        </div>
      </div>
    </div>
  );
};

export const AuthLandingPage: React.FC<{ onEnterDemo?: () => void }> = ({ onEnterDemo }) => {
  const { theme, setTheme, updatePreferences, pushToast } = useApp();
  const { signingIn, authError, clearAuthError, signInWithGoogle } = useAuth();
  const prefersReduced = useReducedMotion();

  const [desktopBusy, setDesktopBusy] = useState(false);
  const [desktopError, setDesktopError] = useState('');
  const [activeScene, setActiveScene] = useState<ShowcaseSceneId>('planner');
  const [cycleKey, setCycleKey] = useState(0);
  const [paused, setPaused] = useState(false);

  const desktopMode = isTauri();
  const busy = desktopMode ? desktopBusy : signingIn;
  const errorMessage = desktopMode ? desktopError : authError;
  const isDark = theme !== 'light' && theme !== 'warm';

  useEffect(() => {
    if (prefersReduced || paused) return;
    const timer = window.setInterval(() => {
      setActiveScene((current) => {
        const idx = CHAPTERS.findIndex((c) => c.id === current);
        return CHAPTERS[(idx + 1) % CHAPTERS.length].id;
      });
      setCycleKey((k) => k + 1);
    }, 5200);
    return () => window.clearInterval(timer);
  }, [prefersReduced, paused]);

  const handleSelectScene = (scene: ShowcaseSceneId) => {
    setActiveScene(scene);
    setCycleKey((k) => k + 1);
    setPaused(true);
  };

  const handleContinueWithGoogle = async () => {
    setDesktopError('');
    clearAuthError();

    if (desktopMode) {
      setDesktopBusy(true);
      try {
        const profile = await invoke<GoogleProfile>('google_sign_in');
        updatePreferences({
          googleAccount: profile,
          name: profile.name,
          email: profile.email,
        });
        pushToast(`Signed in as ${profile.name || profile.email}`);
      } catch (err) {
        setDesktopError(err instanceof Error ? err.message : String(err));
      } finally {
        setDesktopBusy(false);
      }
      return;
    }

    await signInWithGoogle();
  };

  return (
    <div
      className="min-h-screen w-full grid grid-cols-1 lg:grid-cols-12 overflow-x-hidden"
      style={{ backgroundColor: 'var(--bg-canvas)', color: 'var(--text-primary)' }}
    >
      {/* LEFT SANCTUARY: Editorial Sign-In & Feature Chapters */}
      <section className="lg:col-span-5 flex flex-col justify-between px-7 sm:px-10 lg:px-12 xl:px-16 py-7 lg:py-9">
        {/* Top Brand Row */}
        <header className="flex items-center justify-between gap-6">
          <div className="flex items-center gap-2.5 whitespace-nowrap shrink-0">
            <span
              className="w-9 h-9 rounded-xl flex items-center justify-center font-display text-[16px] font-bold"
              style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' }}
            >
              S
            </span>
            <span className="font-display text-[18px] font-bold tracking-tight text-[var(--text-primary)]">
              StudyFlow
            </span>
          </div>

          <button
            type="button"
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
            className="w-9 h-9 rounded-xl inline-flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] transition-colors cursor-pointer shrink-0"
            style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </header>

        {/* Center Statement & Primary Google Sign-In */}
        <motion.div
          className="my-12 lg:my-0 max-w-[420px] space-y-7"
          initial={prefersReduced ? false : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="space-y-4">
            <h1
              className="font-display font-bold tracking-[-0.035em] text-[var(--text-primary)] leading-[1.05]"
              style={{
                fontSize: 'clamp(2.35rem, 3.6vw, 3.35rem)',
                textWrap: 'balance',
              }}
            >
              Study with clarity, not chaos.
            </h1>

            <p className="text-[15.5px] leading-[1.65] text-[var(--text-secondary)] max-w-[38ch]">
              Your timetable, lecture notes, active recall, and Pip AI—orchestrated in one calm
              workspace.
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                disabled={busy}
                onClick={() => void handleContinueWithGoogle()}
                className="w-full sm:w-auto min-w-[240px] h-[52px] px-6 rounded-xl inline-flex items-center justify-center gap-3 text-[15px] font-semibold transition-all duration-150 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-65 disabled:hover:translate-y-0 cursor-pointer whitespace-nowrap"
                style={{
                  backgroundColor: 'var(--text-primary)',
                  color: 'var(--bg-surface)',
                  boxShadow: 'var(--shadow-floating)',
                }}
              >
                {busy ? (
                  <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                ) : (
                  <span className="w-6 h-6 rounded-full bg-white flex items-center justify-center shrink-0">
                    <GoogleMark className="w-4 h-4" />
                  </span>
                )}
                <span>{busy ? 'Signing in with Google…' : 'Continue with Google'}</span>
                {!busy && <ArrowRight className="w-4 h-4 shrink-0 opacity-75" />}
              </button>

              {!desktopMode && onEnterDemo && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={onEnterDemo}
                  className="w-full sm:w-auto h-[52px] px-5 rounded-xl inline-flex items-center justify-center gap-2 text-[14px] font-medium text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] transition-colors cursor-pointer whitespace-nowrap"
                  style={{
                    backgroundColor: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  Explore Demo
                </button>
              )}
            </div>

            {errorMessage && (
              <p
                role="alert"
                className="text-[12.5px] leading-relaxed text-rose-600 dark:text-rose-400"
              >
                {errorMessage}
              </p>
            )}

            <p className="text-[12.5px] text-[var(--text-muted)]">
              Syncs your Google profile and study preferences privately.
            </p>
          </div>
        </motion.div>

        {/* Bottom Interactive Editorial Chapter Rail */}
        <nav
          aria-label="StudyFlow capabilities"
          className="pt-5 grid grid-cols-4 gap-3"
          style={{ borderTop: '1px solid var(--border-subtle)' }}
        >
          {CHAPTERS.map((chapter) => {
            const active = activeScene === chapter.id;
            return (
              <button
                key={chapter.id}
                type="button"
                onClick={() => handleSelectScene(chapter.id)}
                className="group text-left pt-1 pb-2 relative transition-colors cursor-pointer"
              >
                <div
                  className="font-mono text-[11px] tabular-nums transition-colors"
                  style={{ color: active ? 'var(--accent)' : 'var(--text-muted)' }}
                >
                  {chapter.num}
                </div>
                <div
                  className="text-[13px] font-semibold mt-0.5 whitespace-nowrap transition-colors"
                  style={{
                    color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
                  }}
                >
                  {chapter.label}
                </div>
                <span
                  className="absolute left-0 right-0 bottom-0 h-[2px] rounded-full transition-opacity"
                  style={{
                    backgroundColor: active ? 'var(--accent)' : 'transparent',
                    opacity: active ? 1 : 0,
                  }}
                />
              </button>
            );
          })}
        </nav>
      </section>

      {/* RIGHT STAGE: Full-Height Atmospheric Interactive Showcase */}
      <section className="lg:col-span-7 p-4 sm:p-5 lg:p-6 flex items-stretch">
        <StudyFlowShowcaseStage
          activeScene={activeScene}
          onSelectScene={handleSelectScene}
          cycleKey={cycleKey}
        />
      </section>
    </div>
  );
};
