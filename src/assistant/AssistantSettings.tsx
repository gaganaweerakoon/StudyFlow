import { useApp } from '../context/AppContext';
import { memoryFields } from './studyPreferences';
import { useMemo, useState, type FormEvent } from 'react';
import { isTauri } from '@tauri-apps/api/core';
import { BarChart3, Gauge, KeyRound, Table2 } from 'lucide-react';
import { useAssistant } from './AssistantContext';
import {
  CHAT_LIMITS,
  GEMINI_CHAT_MODELS,
  PROVIDERS,
  isModelId,
  type ReplyLimit,
} from './protocol';
import {
  computeRateLimitSnapshot,
  filterUsageEntries,
  summarizeUsageEntries,
} from './usageAnalytics';
import { UsageDetailsModal, type UsageModalTab } from './UsageDetailsModal';
import './assistant.css';

const timezones = [...new Set(['Asia/Colombo', 'UTC', ...Intl.supportedValuesOf('timeZone')])].sort();

function ProviderSettings() {
  const assistant = useAssistant();
  const { provider, models } = assistant.settings;
  const desktop = isTauri();
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
      setMessage('Select a valid Gemini chat model.');
      return;
    }
    assistant.updateSettings({ ...assistant.settings, models: { ...models, [provider]: nextModel } });
    const nextKey = key.trim();
    if (nextKey && !/^[\x21-\x7E]{1,512}$/.test(nextKey)) {
      setMessage('The API key contains unsupported characters.');
      return;
    }
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
      setMessage(
        value
          ? persistent
            ? 'Key saved on this device.'
            : 'Key saved for this tab.'
          : 'Key removed.',
      );
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
        <select value={model} onChange={(event) => setModel(event.target.value)}>
          {GEMINI_CHAT_MODELS.map((choice) => (
            <option key={choice.id} value={choice.id}>
              {choice.id}
              {choice.tier === 'paid' ? ' (Paid)' : ''}
            </option>
          ))}
        </select>
      </label>

      {
        <label>
          API key
          <input
            type="password"
            autoComplete="off"
            spellCheck={false}
            maxLength={512}
            value={key}
            onChange={(event) => setKey(event.target.value)}
            disabled={!assistant.available || pending || loading}
            placeholder={
              connected
                ? persistent
                  ? 'Key saved · Paste a new key to replace it'
                  : 'Key set for this tab'
                : `Paste your ${PROVIDERS[provider].label} key`
            }
          />
        </label>
      }
      {!desktop && <p className="text-[12px] text-[var(--text-muted)]">Browser keys are held in memory for this tab. A server-owned key is available only to a direct localhost connection.</p>}

      <div className="pip-settings-actions">
        <button type="submit" className="pip-settings-primary" disabled={pending || loading}>
          {connected && key.trim() ? 'Replace key' : 'Save'}
        </button>
        {connected && (
          <button type="button" disabled={pending} onClick={() => void saveKey('')}>
            Remove key
          </button>
        )}
        {message && <span role="status">{message}</span>}
      </div>
    </form>
  );
}

export function AssistantSettings() {
  const {preferences, updatePreferences} = useApp();
  const assistant = useAssistant();
  const { settings, usage } = assistant;
  const desktop = isTauri();
  const [usageModalOpen, setUsageModalOpen] = useState(false);
  const [usageModalTab, setUsageModalTab] = useState<UsageModalTab>('requests');

  const weeklyTotals = useMemo(
    () => summarizeUsageEntries(filterUsageEntries(usage, { windowDays: 7, provider: 'all' })),
    [usage],
  );

  const rateSnapshot = useMemo(
    () =>
      computeRateLimitSnapshot(
        usage,
        assistant.model,
        settings.dailyLimit,
        assistant.cooldown,
      ),
    [usage, assistant.model, settings.dailyLimit, assistant.cooldown],
  );

  const openModal = (tab: UsageModalTab) => {
    setUsageModalTab(tab);
    setUsageModalOpen(true);
  };

  return (
    <section className="pip-settings">
      <div className="pip-settings-heading">
        <h2>
          <KeyRound size={18} /> AI Connection
        </h2>
      </div>
      <p>
        {desktop
          ? assistant.keyStorage === 'windows'
            ? 'Your Gemini API key is saved in Windows Credential Manager.'
            : assistant.keyStorage === 'loading'
              ? 'Checking for saved API keys…'
              : 'Keys stay in memory for this tab.'
          : 'Pip connects through the StudyFlow server using your configured server-side Gemini API key.'}{' '}
        Messages, selected workspace context, and attached PDFs, documents, or images go to Gemini.
      </p>
      {assistant.keyStorageError && <p role="status">{assistant.keyStorageError}</p>}

      <div className="pip-settings-form">
        <label>
          Default response language
          <select
            value={settings.language ?? ''}
            onChange={(event) =>
              assistant.updateSettings({
                ...settings,
                language: event.target.value || undefined,
              })
            }
          >
            <option value="">Match my message</option>
            {['English', 'Sinhala', 'Tamil'].map((language) => (
              <option key={language}>{language}</option>
            ))}
          </select>
        </label>
        <label>
          Pip timezone
          <select
            value={settings.timezone ?? ''}
            onChange={(event) =>
              assistant.updateSettings({
                ...settings,
                timezone: event.target.value || undefined,
              })
            }
          >
            <option value="">Use device timezone</option>
            {timezones.map((zone) => (
              <option key={zone}>{zone}</option>
            ))}
          </select>
        </label>
      </div>

      <ProviderSettings key={`${settings.provider}-${assistant.model}`} />

      <details className="pip-settings-form">
        <summary>What Pip remembers</summary>
        {memoryFields.map(field => <label key={field.key}>{field.label}
          <input maxLength={300} placeholder={field.example} value={preferences.pipMemory?.[field.key] ?? ''}
            onChange={event => updatePreferences({pipMemory:{...preferences.pipMemory, [field.key]:event.target.value}})} />
          {preferences.pipMemory?.[field.key] && <button type="button" onClick={() => {
            const memory = {...preferences.pipMemory};
            delete memory[field.key];
            updatePreferences({pipMemory:memory});
          }}>Forget {field.label.toLowerCase()}</button>}
        </label>)}
      </details>
      <details className="pip-settings-form">
        <summary>Local study check-ins</summary>
        <label><input type="checkbox" checked={Boolean(preferences.pipCheckIns?.enabled)}
          onChange={e => updatePreferences({pipCheckIns:{...preferences.pipCheckIns,enabled:e.target.checked}})} />Allow one check-in per day</label>
        {preferences.pipCheckIns?.enabled && <>
          {([['recovery','Unlogged study sessions'],['milestone','Completed milestones'],['evening','Evening next step']] as const).map(([key,label]) =>
            <label key={key}><input type="checkbox" checked={preferences.pipCheckIns?.[key] !== false} onChange={e =>
              updatePreferences({pipCheckIns:{...preferences.pipCheckIns,[key]:e.target.checked}})} />{label}</label>)}
          {([['quietFrom','Quiet hours start','21:30'],['quietUntil','Quiet hours end','07:00']] as const).map(([key,label,fallback]) =>
            <label key={key}>{label}<input type="time" value={preferences.pipCheckIns?.[key] ?? fallback}
              onChange={e => updatePreferences({pipCheckIns:{...preferences.pipCheckIns,[key]:e.target.value || fallback}})} /></label>)}
          <button onClick={() => updatePreferences({pipCheckIns:{...preferences.pipCheckIns,snoozeUntil:Date.now()+86400000}})}>Snooze for 24 hours</button>
          {Number(preferences.pipCheckIns.snoozeUntil) > Date.now() && <button onClick={() => updatePreferences({pipCheckIns:{...preferences.pipCheckIns,snoozeUntil:0}})}>Resume check-ins</button>}
        </>}
      </details>
      {/* Usage & Rate Limits Options */}
      <div
        className="pt-4 mt-1 space-y-3"
        style={{ borderTop: '1px solid var(--border-subtle)' }}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2 text-[14px] font-semibold text-[var(--text-primary)] font-display">
              <BarChart3 className="w-4 h-4 shrink-0" style={{ color: 'var(--accent)' }} />
              <span>API Usage &amp; Rate Limits</span>
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-[var(--text-muted)] font-mono tabular-nums">
              <span>Last 7 days</span>
              <span aria-hidden="true">·</span>
              <span>
                {weeklyTotals.requests.toLocaleString()}{' '}
                {weeklyTotals.requests === 1 ? 'request' : 'requests'}
              </span>
              <span aria-hidden="true">·</span>
              <span>{weeklyTotals.total.toLocaleString()} tokens</span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => openModal('limits')}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12.5px] font-semibold transition-colors hover:bg-[var(--bg-surface-hover)] whitespace-nowrap"
              style={{
                backgroundColor: 'var(--bg-surface-subtle)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-primary)',
              }}
            >
              <Gauge className="w-4 h-4" style={{ color: 'var(--accent)' }} />
              Rate limits
            </button>
            <button
              type="button"
              onClick={() => openModal('requests')}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12.5px] font-semibold transition-colors hover:bg-[var(--bg-surface-hover)] whitespace-nowrap"
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
        </div>

        {/* Limit Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="text-[12px] text-[var(--text-secondary)] flex flex-col gap-1">
            Max output tokens per reply
            <select
              value={settings.maxOutput}
              onChange={(event) => {
                const next = Number(event.target.value) as ReplyLimit;
                if (CHAT_LIMITS.response.includes(next)) {
                  assistant.updateSettings({ ...settings, maxOutput: next });
                }
              }}
              className="px-2.5 py-2 rounded-lg text-[12.5px] font-mono"
              style={{
                backgroundColor: 'var(--bg-surface-subtle)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-primary)',
              }}
            >
              <option value={0}>Model default</option>
              <option value={300}>300 tokens (Concise)</option>
              <option value={650}>650 tokens (Balanced)</option>
              <option value={1200}>1,200 tokens (Standard)</option>
              <option value={16384}>16,384 tokens (Long)</option>
            </select>
          </label>

          <label className="text-[12px] text-[var(--text-secondary)] flex flex-col gap-1">
            Daily token limit (0 = no cap)
            <input
              type="number"
              min={0}
              max={1000000}
              step={5000}
              value={settings.dailyLimit}
              onChange={(event) => {
                const raw = Math.max(0, Math.min(1_000_000, Math.round(Number(event.target.value) || 0)));
                assistant.updateSettings({ ...settings, dailyLimit: raw });
              }}
              className="px-2.5 py-2 rounded-lg text-[12.5px] font-mono tabular-nums"
              style={{
                backgroundColor: 'var(--bg-surface-subtle)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-primary)',
              }}
            />
          </label>
        </div>

        {/* Live Rate Limit Summary Strip */}
        <div
          className="rounded-xl p-3.5 space-y-2"
          style={{
            backgroundColor: 'var(--bg-surface-subtle)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <div className="flex flex-wrap items-center justify-between gap-2 text-[12px]">
            <span className="font-medium text-[var(--text-primary)]">
              Live Rate &amp; Daily Quota ({assistant.model})
            </span>
            <span className="font-mono tabular-nums text-[var(--text-secondary)]">
              60s: {rateSnapshot.requestsLastMinute} req · {rateSnapshot.tokensLastMinute.toLocaleString()} tok
              {rateSnapshot.cooldownSeconds > 0 ? ` · Cooldown ${rateSnapshot.cooldownSeconds}s` : ''}
            </span>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 text-[11.5px] text-[var(--text-muted)] font-mono tabular-nums">
            <span>
              Today: {rateSnapshot.requestsToday.toLocaleString()} req ·{' '}
              {rateSnapshot.tokensToday.toLocaleString()}
              {rateSnapshot.dailyTokenLimit > 0
                ? ` / ${rateSnapshot.dailyTokenLimit.toLocaleString()} tok (${rateSnapshot.dailyTokenPct}%)`
                : ' tok'}
            </span>
            <span>24h rate limits (429): {rateSnapshot.rateLimitedCount24h}</span>
          </div>
          {rateSnapshot.dailyTokenLimit > 0 && (
            <div
              className="h-1.5 w-full rounded-full overflow-hidden"
              style={{ backgroundColor: 'var(--bg-surface-hover)' }}
            >
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${rateSnapshot.dailyTokenPct}%`,
                  backgroundColor:
                    rateSnapshot.status === 'limit_reached'
                      ? '#E11D48'
                      : rateSnapshot.status === 'near_limit' || rateSnapshot.status === 'cooling_down'
                        ? '#D97706'
                        : 'var(--accent)',
                }}
              />
            </div>
          )}
        </div>
      </div>

      <UsageDetailsModal
        open={usageModalOpen}
        onClose={() => setUsageModalOpen(false)}
        usage={usage}
        activeModel={assistant.model}
        dailyTokenLimit={settings.dailyLimit}
        cooldownSeconds={assistant.cooldown}
        initialTab={usageModalTab}
      />
    </section>
  );
}
