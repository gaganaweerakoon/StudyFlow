import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useApp } from '../context/AppContext';

export interface GoogleProfile {
  id: string;
  name: string;
  email: string;
}

export function GoogleAccount() {
  const { preferences, updatePreferences } = useApp();

  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState('');

  async function signIn() {
    setWorking(true);
    setMessage('');
    try {
      const profile = await invoke<GoogleProfile>('google_sign_in');
      updatePreferences({ googleAccount: profile, name: profile.name, email: profile.email });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setWorking(false);
    }
  }

  return (
    <div className="space-y-2 border-t border-[var(--border-subtle)] pt-4">
      {preferences.googleAccount ? <>
        <p className="text-[13px]">Connected to Google as {preferences.googleAccount.email}</p>
        <button type="button" className="rounded-lg border border-[var(--border-subtle)] px-3 py-2 text-[13px]"
          onClick={() => {
            const profile = preferences.googleAccount;
            updatePreferences({
              googleAccount: undefined,
              ...(preferences.name === profile?.name ? { name: 'Student' } : {}),
              ...(preferences.email === profile?.email ? { email: '' } : {}),
            });
            setMessage('Signed out of Google in StudyFlow.');
          }}>Sign out of Google</button>
      </> : <>
        <button type="button" disabled={working} onClick={() => void signIn()}
          className="rounded-lg border border-[var(--border-subtle)] px-3 py-2 text-[13px] disabled:opacity-60">
          {working ? 'Waiting for Google…' : 'Sign in with Google'}
        </button>
      </>}
      {message && <p role="status" className="text-[12px]">{message}</p>}
    </div>
  );
}
