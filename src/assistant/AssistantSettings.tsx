import { useMemo, useState, type FormEvent } from 'react';
import { BarChart3, KeyRound, Table2 } from 'lucide-react';
import { useAssistant } from './AssistantContext';
import { GEMINI_MODELS, PROVIDERS, isModelId } from './protocol';
import { filterUsageEntries, summarizeUsageEntries } from './usageAnalytics';
import { UsageDetailsModal } from './UsageDetailsModal';
import './assistant.css';

const timezones = [...new Set(['Asia/Colombo', 'UTC', ...Intl.supportedValuesOf('timeZone')])].sort();

function ProviderSettings() {
  const assistant = useAssistant();
  const { provider, models } = assistant.settings;
  const [key, setKey] = useState('');
  const [model, setModel] = useState(assistant.model);
  const [message, setMessage] = useState('');
  const connected = assistant.configured.includes(provider);
  const [pending, setPending] = useState(false);
  const persistent = assistant.keyStorage === 'windows';
  const loading = assistant.keyStorage === 'loading';

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (pending || loading) return;
    const nextModel = model.trim() || PROVIDERS[provider].model;
    if (!isModelId(nextModel)) {
      setMessage('Enter a valid provider model ID.');
      return;
    }
    const nextKey = key.trim();
    if (nextKey && !/^[\x21-\x7E]{1,512}$/.test(nextKey)) {
      setMessage('The API key contains unsupported characters.');
      return;
    }
    assistant.updateSettings({ ...assistant.settings, models: { ...models, [provider]: nextModel } });
    if (!nextKey) {
      setModel(nextModel);
      setMessage('Model saved.');
      return;
    }
    await saveKey(nextKey);
  }

  async function saveKey(value: string) {
    setPending(true);
    try {
      await assistant.setKey(provider, value);
      setKey('');
      setMessage(value
        ? persistent ? 'Key saved on this device.' : 'Key saved for this tab.'
        : 'Key removed.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="pip-settings-form">
      <label>
        Model
        <select value={model} onChange={event => setModel(event.target.value)}>
          {GEMINI_MODELS.map(choice => <option key={choice} value={choice}>{choice}</option>)}
        </select>
      </label>
      <label>
        API key
        <input
          type="password" autoComplete="off" spellCheck={false} maxLength={512} value={key}
          onChange={event => setKey(event.target.value)} disabled={!assistant.available || pending || loading}
          placeholder={connected ? persistent ? 'Key saved · Paste a new key to replace it' : 'Key set for this tab' : `Paste your ${PROVIDERS[provider].label} key`}
        />
      </label>
      <div className="pip-settings-actions">
        <button type="submit" className="pip-settings-primary" disabled={pending || loading}>
          {connected && key.trim() ? 'Replace key' : 'Save'}
        </button>
        {connected && <button type="button" disabled={pending} onClick={() => void saveKey('')}>Remove key</button>}
        {message && <span role="status">{message}</span>}
      </div>
    </form>
  );
}

export function AssistantSettings() {
  const assistant = useAssistant();
  const { settings, usage } = assistant;
  const [usageModalOpen, setUsageModalOpen] = useState(false);

  const weeklyTotals = useMemo(
    () => summarizeUsageEntries(filterUsageEntries(usage, { windowDays: 7, provider: 'all' })),
    [usage],
  );

  return (
    <section className="pip-settings">
      <div className="pip-settings-heading"><h2><KeyRound size={18} /> AI Connection</h2></div>
      <p>{assistant.keyStorage === 'windows'
        ? 'Your Gemini API key is saved in Windows Credential Manager.'
        : assistant.keyStorage === 'loading' ? 'Checking for saved API keys…' : 'Keys stay in memory for this tab.'}
        {' '}Messages, selected workspace context, and attached PDFs, documents, or images go to Gemini.</p>
      {assistant.keyStorageError && <p role="status">{assistant.keyStorageError}</p>}
      {!assistant.available && <p role="status">Open StudyFlow at localhost to enter a key and use the assistant.</p>}
      <div className="pip-settings-form">
        <label>Default response language
          <select value={settings.language ?? ''} onChange={event => assistant.updateSettings({ ...settings, language: event.target.value || undefined })}>
            <option value="">Match my message</option>
            {['English', 'Sinhala', 'Tamil'].map(language => <option key={language}>{language}</option>)}
          </select>
        </label>
        <label>Pip timezone
          <select value={settings.timezone ?? ''} onChange={event => assistant.updateSettings({ ...settings, timezone: event.target.value || undefined })}>
            <option value="">Use device timezone</option>
            {timezones.map(zone => <option key={zone}>{zone}</option>)}
          </select>
        </label>
      </div>
      <ProviderSettings key={settings.provider} />

      {/* Compact Usage Overview + Popup Table Trigger */}
      <div
        className="pt-4 mt-1 flex flex-wrap items-center justify-between gap-4"
        style={{ borderTop: '1px solid var(--border-subtle)' }}
      >
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2 text-[14px] font-semibold text-[var(--text-primary)] font-display">
            <BarChart3 className="w-4 h-4 shrink-0" style={{ color: 'var(--accent)' }} />
            <span>AI Usage</span>
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-[var(--text-muted)] font-mono tabular-nums">
            <span>Last 7 days</span>
            <span aria-hidden="true">·</span>
            <span>{weeklyTotals.requests.toLocaleString()} {weeklyTotals.requests === 1 ? 'request' : 'requests'}</span>
            <span aria-hidden="true">·</span>
            <span>{weeklyTotals.total.toLocaleString()} tokens</span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setUsageModalOpen(true)}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-[12.5px] font-semibold transition-colors hover:bg-[var(--bg-surface-hover)] whitespace-nowrap shrink-0"
          style={{
            backgroundColor: 'var(--bg-surface-subtle)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--text-primary)',
          }}
        >
          <Table2 className="w-4 h-4" style={{ color: 'var(--accent)' }} />
          View usage
        </button>
      </div>

      <UsageDetailsModal
        open={usageModalOpen}
        onClose={() => setUsageModalOpen(false)}
        usage={usage}
      />
    </section>
  );
}
