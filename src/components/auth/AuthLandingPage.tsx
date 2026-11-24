import React, { useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { invoke, isTauri } from '@tauri-apps/api/core';
import { ArrowRight, Loader2, Moon, Sun } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../firebase/AuthContext';
import { GoogleMark, type GoogleProfile } from '../../desktop/GoogleAccount';
import { StudyFlowHeroSvg } from './StudyFlowHeroSvg';

export const AuthLoadingScreen: React.FC = () => {
  const prefersReduced = useReducedMotion();

  return (
    <div
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
          <span>Preparing your StudyFlow workspace…</span>
        </div>
      </div>
    </div>
  );
};

export const AuthLandingPage: React.FC = () => {
  const { theme, setTheme, updatePreferences, pushToast } = useApp();
  const { signingIn, authError, clearAuthError, signInWithGoogle } = useAuth();
  const prefersReduced = useReducedMotion();

  const [desktopBusy, setDesktopBusy] = useState(false);
  const [desktopError, setDesktopError] = useState('');

  const desktopMode = isTauri();
  const busy = desktopMode ? desktopBusy : signingIn;
  const errorMessage = desktopMode ? desktopError : authError;
  const isDark = theme !== 'light' && theme !== 'warm';

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
      className="min-h-screen w-full flex flex-col overflow-x-hidden"
      style={{ backgroundColor: 'var(--bg-canvas)', color: 'var(--text-primary)' }}
    >
      {/* Quiet Top Bar */}
      <header
        className="w-full px-6 lg:px-10 h-16 flex items-center justify-between gap-8 shrink-0"
        style={{ borderBottom: '1px solid var(--border-subtle)' }}
      >
        <div className="flex items-center gap-2.5 whitespace-nowrap shrink-0">
          <span
            className="w-8 h-8 rounded-lg flex items-center justify-center font-display text-[15px] font-bold"
            style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' }}
          >
            S
          </span>
          <span className="font-display text-[17px] font-bold tracking-tight text-[var(--text-primary)]">
            StudyFlow
          </span>
        </div>

        <button
          type="button"
          onClick={() => setTheme(isDark ? 'light' : 'dark')}
          aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-[12.5px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] transition-colors whitespace-nowrap shrink-0"
          style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          {isDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
          <span>{isDark ? 'Light' : 'Dark'}</span>
        </button>
      </header>

      {/* Main Split Hero */}
      <main className="flex-1 flex items-center">
        <div className="w-full max-w-[1280px] mx-auto px-6 lg:px-10 py-10 lg:py-14">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            {/* Left Column: Proposition + Google Sign-In Gate */}
            <motion.div
              className="lg:col-span-5 space-y-6"
              initial={prefersReduced ? false : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="space-y-4">
                <p className="text-[13px] font-medium text-[var(--text-muted)]">
                  Academic workspace · Notes, schedule &amp; active recall
                </p>

                <h1
                  className="font-display font-bold tracking-tight text-[var(--text-primary)] leading-[1.08]"
                  style={{
                    fontSize: 'clamp(2.25rem, 3.8vw, 3.35rem)',
                    textWrap: 'balance',
                  }}
                >
                  Your entire semester, organized in one calm space.
                </h1>

                <p className="text-[15.5px] leading-[1.65] text-[var(--text-secondary)] max-w-[48ch]">
                  Plan weekly study blocks, convert lecture PDFs into clean math-ready Markdown,
                  practice with spaced repetition, and let Pip guide your exam prep.
                </p>
              </div>

              {/* Single Dominant Primary CTA: Google Sign-In */}
              <div className="space-y-3 pt-1">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void handleContinueWithGoogle()}
                  className="w-full sm:w-auto min-w-[272px] h-12 px-6 rounded-xl inline-flex items-center justify-center gap-3 text-[14.5px] font-semibold transition-all duration-150 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-65 disabled:hover:translate-y-0 cursor-pointer whitespace-nowrap"
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

                {errorMessage && (
                  <p
                    role="alert"
                    className="text-[12.5px] leading-relaxed text-rose-600 dark:text-rose-400 max-w-md"
                  >
                    {errorMessage}
                  </p>
                )}

                <p className="text-[12.5px] text-[var(--text-muted)] max-w-[44ch]">
                  Sign in with your Google account to unlock StudyFlow. Your Google account name,
                  avatar, and study preferences sync automatically.
                </p>
              </div>

              {/* Editorial Numbered Highlights (Zero-Pill, Hairline Separated) */}
              <div
                className="pt-6 grid grid-cols-1 sm:grid-cols-3 gap-4"
                style={{ borderTop: '1px solid var(--border-subtle)' }}
              >
                <div>
                  <div className="font-display text-[13px] font-semibold text-[var(--text-primary)]">
                    01. Study Planner
                  </div>
                  <p className="text-[12px] text-[var(--text-muted)] mt-1 leading-relaxed">
                    Time-blocked schedules and Pomodoro focus sessions.
                  </p>
                </div>
                <div>
                  <div className="font-display text-[13px] font-semibold text-[var(--text-primary)]">
                    02. Smart Notes
                  </div>
                  <p className="text-[12px] text-[var(--text-muted)] mt-1 leading-relaxed">
                    Auto-Markdown imports with LaTeX formulas &amp; Unicode.
                  </p>
                </div>
                <div>
                  <div className="font-display text-[13px] font-semibold text-[var(--text-primary)]">
                    03. Pip AI Coach
                  </div>
                  <p className="text-[12px] text-[var(--text-muted)] mt-1 leading-relaxed">
                    Generate flashcards, practice quizzes, and daily plans.
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Right Column: Bespoke Animated SVG Graphic */}
            <motion.div
              className="lg:col-span-7 flex items-center justify-center"
              initial={prefersReduced ? false : { opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.65, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
            >
              <StudyFlowHeroSvg />
            </motion.div>
          </div>
        </div>
      </main>

      {/* Quiet Footer */}
      <footer
        className="w-full px-6 lg:px-10 py-4 flex flex-wrap items-center justify-between gap-3 text-[12px] text-[var(--text-muted)]"
        style={{ borderTop: '1px solid var(--border-subtle)' }}
      >
        <span>StudyFlow Academic Workspace</span>
        <span>Private Google-authenticated profile · Owner-only cloud sync</span>
      </footer>
    </div>
  );
};
