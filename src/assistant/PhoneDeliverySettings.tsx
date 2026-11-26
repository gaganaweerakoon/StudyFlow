import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useApp } from '../context/AppContext';

export function PhoneDeliverySettings() {
  const {preferences, updatePreferences} = useApp();
  const [origin,setOrigin] = useState('');
  const [enrollment,setEnrollment] = useState('');
  const [status,setStatus] = useState('');
  const [busy,setBusy] = useState(false);
  const paired = preferences.pipCheckIns?.phoneDelivery;
  async function change() {
    if (busy) return;
    setBusy(true);
    try {
      const result = await invoke<{pairingCode?:string}>('pip_relay',{action:paired?'disconnect':'enroll',origin,enrollment});
      setEnrollment('');
      setStatus(result.pairingCode ? 'Enter this one-time code in Android Settings within ten minutes: ' + result.pairingCode : 'Disconnected.');
      updatePreferences({pipCheckIns:{...preferences.pipCheckIns,phoneDelivery:!paired}});
    } catch (error) { setStatus(String(error)); }
    finally { setBusy(false); }
  }
  return <details className="pip-settings-form"><summary>Android check-in delivery (experimental)</summary>
    <p>Send the trigger type and an anonymous delivery receipt to your paired HTTPS relay. Study text stays on this PC.</p>
    {!paired && <><label>Relay address<input type="url" value={origin} onChange={e=>setOrigin(e.target.value)} /></label>
      <label>Relay enrollment key<input type="password" autoComplete="off" value={enrollment} onChange={e=>setEnrollment(e.target.value)} /></label></>}
    <button type="button" disabled={busy || (!paired && (!origin || !enrollment))} onClick={change}>{paired?'Disconnect phone delivery':'Pair for phone delivery'}</button>
    <output>{status}</output>
  </details>;
}
