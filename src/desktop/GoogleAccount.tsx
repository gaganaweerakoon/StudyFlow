import { useState, type ChangeEvent } from 'react';
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

  async function signIn(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';
    if (!file) return;
    setWorking(true);
    setMessage('');
    try {
      if (file.size > 32_000) throw new Error('Choose the Google Desktop app OAuth JSON file.');
      const { installed } = JSON.parse(await file.text());
      if (typeof installed?.client_id !== 'string' || typeof installed?.client_secret !== 'string') {
        throw new Error('Choose a Google OAuth client JSON file for a Desktop app.');
      }
      const profile = await invoke<GoogleProfile>('google_sign_in', {
        clientId: installed.client_id, clientSecret: installed.client_secret,
      });
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
          onClick={() => updatePreferences({ googleAccount: undefined })}>Disconnect Google</button>
      </> : <>
        <label className="inline-block rounded-lg border border-[var(--border-subtle)] px-3 py-2 text-[13px] focus-within:ring-2 cursor-pointer">
          {working ? 'Waiting for Google…' : 'Sign in with Google'}
          <input className="sr-only" type="file" accept=".json,application/json" disabled={working} onChange={event => void signIn(event)} />
        </label>
        <p className="text-[12px] text-[var(--text-muted)]">Select your Google Desktop OAuth configuration to connect your profile in your browser.</p>
      </>}
      {message && <p role="status" className="text-[12px]">{message}</p>}
    </div>
  );
}
