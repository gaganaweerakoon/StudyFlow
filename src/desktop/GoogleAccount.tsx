import React, { useState } from 'react';
import { invoke, isTauri } from '@tauri-apps/api/core';
import { CheckCircle2, Cloud, Loader2, LogOut } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../firebase/AuthContext';

export interface GoogleProfile {
  id: string;
  name: string;
  email: string;
  photoURL?: string;
}

export const GoogleMark: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
    <path
      fill="#4285F4"
      d="M23.49 12.27c0-.79-.07-1.55-.2-2.27H12v4.51h6.47a5.53 5.53 0 0 1-2.4 3.63v3h3.88c2.27-2.09 3.54-5.17 3.54-8.87Z"
    />
    <path
      fill="#34A853"
      d="M12 24c3.24 0 5.95-1.07 7.93-2.91l-3.88-3c-1.07.72-2.45 1.15-4.05 1.15-3.12 0-5.76-2.1-6.7-4.93H1.3v3.09A12 12 0 0 0 12 24Z"
    />
    <path
      fill="#FBBC05"
      d="M5.3 14.31A7.2 7.2 0 0 1 4.92 12c0-.8.14-1.58.38-2.31V6.6H1.3A12 12 0 0 0 0 12c0 1.94.46 3.77 1.3 5.4l4-3.09Z"
    />
    <path
      fill="#EA4335"
      d="M12 4.77c1.76 0 3.34.61 4.59 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.3 6.6l4 3.09c.94-2.83 3.58-4.92 6.7-4.92Z"
    />
  </svg>
);

interface GoogleAccountProps {
  compact?: boolean;
  onSignedIn?: () => void;
}

export function GoogleAccount({ compact = false, onSignedIn }: GoogleAccountProps) {
  const { preferences, updatePreferences, pushToast } = useApp();
  const {
    user,
    authReady,
    signingIn,
    syncing,
    authError,
    clearAuthError,
    signInWithGoogle,
    signOutGoogle,
  } = useAuth();

  const [tauriWorking, setTauriWorking] = useState(false);
  const [localMessage, setLocalMessage] = useState('');

  const desktopMode = isTauri();
  const busy = desktopMode ? tauriWorking : signingIn;

  const connectedAccount: GoogleProfile | null = desktopMode
    ? preferences.googleAccount ?? null
    : user
      ? {
          id: user.uid,
          name: user.displayName || preferences.name || 'Student',
          email: user.email || preferences.email || '',
          photoURL: user.photoURL || undefined,
        }
      : null;

  async function handleSignIn() {
    setLocalMessage('');
    clearAuthError();

    if (desktopMode) {
      setTauriWorking(true);
      try {
        const profile = await invoke<GoogleProfile>('google_sign_in');
        updatePreferences({ googleAccount: profile, name: profile.name, email: profile.email });
        pushToast(`Signed in as ${profile.email}`);
        onSignedIn?.();
      } catch (error) {
        setLocalMessage(error instanceof Error ? error.message : String(error));
      } finally {
        setTauriWorking(false);
      }
      return;
    }

    await signInWithGoogle();
    onSignedIn?.();
  }

  async function handleSignOut() {
    setLocalMessage('');
    clearAuthError();

    if (desktopMode) {
      const profile = preferences.googleAccount;
      updatePreferences({
        googleAccount: undefined,
        ...(preferences.name === profile?.name ? { name: 'Student' } : {}),
        ...(preferences.email === profile?.email ? { email: '' } : {}),
      });
      pushToast('Signed out of Google');
      return;
    }

    await signOutGoogle();
  }

  const statusError = localMessage || authError;

  if (compact) {
    return (
      <div className="px-1.5 py-1.5 mb-1 border-b border-[var(--border-subtle)] space-y-1.5">
        {connectedAccount ? (
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 px-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span className="text-[11.5px] text-[var(--text-secondary)] truncate">
                {syncing ? 'Syncing profile…' : connectedAccount.email}
              </span>
            </div>
            <button
              type="button"
              onClick={() => void handleSignOut()}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-[12px] font-medium text-[var(--text-secondary)] hover:text-rose-500 hover:bg-[var(--bg-surface-hover)] transition-colors"
            >
              <LogOut className="w-3.5 h-3.5 shrink-0" />
              Sign out of Google
            </button>
          </div>
        ) : (
          <button
            type="button"
            disabled={busy || (!desktopMode && !authReady)}
            onClick={() => void handleSignIn()}
            className="w-full flex items-center justify-center gap-2 px-2.5 py-2 rounded-lg text-[12.5px] font-medium transition-colors hover:bg-[var(--bg-surface-hover)] disabled:opacity-60"
            style={{
              backgroundColor: 'var(--bg-surface-subtle)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-primary)',
            }}
          >
            {busy ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
            ) : (
              <GoogleMark className="w-3.5 h-3.5 shrink-0" />
            )}
            <span>{busy ? 'Signing in…' : 'Sign in with Google'}</span>
          </button>
        )}
        {statusError && (
          <p role="alert" className="px-1 text-[11px] leading-snug text-rose-500">
            {statusError}
          </p>
        )}
      </div>
    );
  }

  return (
    <div
      className="rounded-xl p-4 space-y-3"
      style={{
        backgroundColor: 'var(--bg-surface-subtle)',
        border: '1px solid var(--border-subtle)',
      }}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {connectedAccount?.photoURL ? (
            <img
              src={connectedAccount.photoURL}
              alt={connectedAccount.name}
              referrerPolicy="no-referrer"
              className="w-9 h-9 rounded-full object-cover shrink-0"
              style={{ border: '1px solid var(--border-subtle)' }}
            />
          ) : (
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
              style={{
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <GoogleMark className="w-4 h-4" />
            </div>
          )}

          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-[13px] font-semibold text-[var(--text-primary)]">
              <span className="truncate">
                {connectedAccount ? connectedAccount.name : 'Google Account'}
              </span>
              {connectedAccount && (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 shrink-0">
                  <Cloud className="w-3 h-3" />
                  {syncing ? 'Syncing…' : 'Connected'}
                </span>
              )}
            </div>
            <div className="text-[12px] text-[var(--text-muted)] truncate">
              {connectedAccount
                ? connectedAccount.email
                : 'Sign in with Google to verify your student account and sync preferences'}
            </div>
          </div>
        </div>

        {connectedAccount ? (
          <button
            type="button"
            onClick={() => void handleSignOut()}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12.5px] font-medium text-[var(--text-secondary)] hover:text-rose-500 hover:bg-[var(--bg-surface-hover)] transition-colors shrink-0"
            style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign out
          </button>
        ) : (
          <button
            type="button"
            disabled={busy || (!desktopMode && !authReady)}
            onClick={() => void handleSignIn()}
            className="inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-[12.5px] font-medium transition-colors hover:bg-[var(--bg-surface-hover)] disabled:opacity-60 shrink-0"
            style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-primary)',
            }}
          >
            {busy ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <GoogleMark className="w-4 h-4" />
            )}
            <span>{busy ? 'Waiting for Google…' : 'Sign in with Google'}</span>
          </button>
        )}
      </div>

      {statusError && (
        <p role="alert" className="text-[12px] text-rose-500">
          {statusError}
        </p>
      )}
    </div>
  );
}
