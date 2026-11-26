import { useMemo, useState, type FormEvent } from 'react';
import { isTauri } from '@tauri-apps/api/core';
import {
  BarChart3,
  Bell,
  Brain,
  ChevronDown,
  Clock,
  Eye,
  EyeOff,
  Gauge,
  Globe,
  KeyRound,
  Moon,
  Sparkles,
  Table2,
  Trash2,
  X,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { LanguageSelector } from '../components/ui/LanguageSelector';
import { TimezonePicker } from '../components/ui/TimezonePicker';
import { useAssistant } from './AssistantContext';
import { ASSISTANT_LANGUAGE_OPTIONS } from './companion';
import { PhoneDeliverySettings } from './PhoneDeliverySettings';
import {
  CHAT_LIMITS,
  GEMINI_CHAT_MODELS,
  PROVIDERS,
  isModelId,
  type ReplyLimit,
} from './protocol';
import { memoryFields } from './studyPreferences';
import {
  computeRateLimitSnapshot,
  filterUsageEntries,
  summarizeUsageEntries,
} from './usageAnalytics';
import { UsageDetailsModal, type UsageModalTab } from './UsageDetailsModal';
import './assistant.css';

function SettingsSwitch({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <div className="py-2.5 flex items-center justify-between gap-4">
      <div className="min-w-0">
        <div className="text-[13px] font-medium text-[var(--text-primary)]">{label}</div>
        {description && (
          <div className="text-[12px] text-[var(--text-muted)] mt-0.5 leading-snug">
            {description}
          </div>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className="w-10 h-5.5 rounded-full p-0.5 transition-colors shrink-0 relative"
        style={{ backgroundColor: checked ? 'var(--accent)' : 'var(--border-strong)' }}
      >
        <span
          className="block w-4.5 h-4.5 rounded-full bg-white transition-transform"
          style={{ transform: checked ? 'translateX(18px)' : 'translateX(0px)' }}
        />
      </button>
    </div>
  );
}

function ProviderSettings() {
  const assistant = useAssistant();
  const { provider, models } = assistant.settings;
  const desktop = isTauri();
  const [key, setKey] = useState('');
  const [showKey, setShowKey] = useState(false);
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
    assistant.updateSettings({
      ...assistant.settings,
      models: { ...models, [provider]: nextModel },
    });
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
      setShowKey(false);
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

  const fieldStyle = {
    backgroundColor: 'var(--bg-surface-subtle)',
    border: '1px solid var(--border-subtle)',
    color: 'var(--text-primary)',
  };

  return (
    <form onSubmit={submit} className="space-y-3.5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <label className="block space-y-1.5">
          <span className="block text-[12px] font-medium text-[var(--text-secondary)]">
            Gemini model
          </span>
          <select
            value={model}
            onChange={(event) => setModel(event.target.value)}
            className="w-full px-3 py-2 rounded-lg text-[13px] font-mono outline-none focus:ring-1 focus:ring-[var(--accent)]"
            style={fieldStyle}
          >
            {GEMINI_CHAT_MODELS.map((choice) => (
              <option key={choice.id} value={choice.id}>
                {choice.id}
                {choice.tier === 'paid' ? ' (Paid)' : ''}
              </option>
            ))}
          </select>
        </label>

        <label className="block space-y-1.5">
          <span className="flex items-center justify-between text-[12px] font-medium text-[var(--text-secondary)]">
            <span>API key</span>
            <span
              className="text-[11px] font-medium"
              style={{ color: connected ? '#16A34A' : 'var(--text-muted)' }}
            >
              {connected ? (persistent ? 'Saved on device' : 'Active') : 'Not configured'}
            </span>
          </span>
          <div className="relative">
            <input
              type={showKey ? 'text' : 'password'}
              autoComplete="off"
              spellCheck={false}
              maxLength={512}
              value={key}
              onChange={(event) => setKey(event.target.value)}
              disabled={!assistant.available || pending || loading}
              placeholder={
                connected
                  ? persistent
                    ? 'Saved · paste a new key to replace'
                    : 'Set for this tab · paste to replace'
                  : `Paste your ${PROVIDERS[provider].label} API key`
              }
              className="w-full pl-3 pr-9 py-2 rounded-lg text-[13px] outline-none focus:ring-1 focus:ring-[var(--accent)] disabled:opacity-55"
              style={fieldStyle}
            />
            <button
              type="button"
              onClick={() => setShowKey((prev) => !prev)}
              aria-label={showKey ? 'Hide API key' : 'Show API key'}
              disabled={!assistant.available || pending || loading}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] disabled:opacity-40"
            >
              {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          </div>
        </label>
      </div>

      {!desktop && (
        <p className="text-[12px] text-[var(--text-muted)] leading-relaxed">
          Browser keys are held in memory for this tab only. A server-owned key is available on direct localhost connections.
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2.5 pt-0.5">
        <button
          type="submit"
          disabled={pending || loading}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[12.5px] font-semibold transition-opacity hover:opacity-95 disabled:opacity-55"
          style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' }}
        >
          {pending ? 'Saving…' : connected && key.trim() ? 'Replace key' : 'Save settings'}
        </button>

        {connected && (
          <button
            type="button"
            disabled={pending}
            onClick={() => void saveKey('')}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12.5px] font-medium text-[var(--text-secondary)] hover:text-rose-500 hover:bg-[var(--bg-surface-hover)] transition-colors disabled:opacity-55"
            style={{
              backgroundColor: 'var(--bg-surface-subtle)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <Trash2 className="w-3.5 h-3.5" />
            Remove key
          </button>
        )}

        {message && (
          <span role="status" className="text-[12px] font-medium text-[var(--text-secondary)]">
            {message}
          </span>
        )}
      </div>
    </form>
  );
}

export function AssistantSettings() {
  const { preferences, updatePreferences } = useApp();
  const assistant = useAssistant();
  const { settings, usage } = assistant;
  const desktop = isTauri();
  const [usageModalOpen, setUsageModalOpen] = useState(false);
  const [usageModalTab, setUsageModalTab] = useState<UsageModalTab>('requests');
  const [memoryExpanded, setMemoryExpanded] = useState(() =>
    memoryFields.some((field) => Boolean(preferences.pipMemory?.[field.key]?.trim())),
  );

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

  const mixLanguageOptions = useMemo(
    () => ASSISTANT_LANGUAGE_OPTIONS.filter((opt) => opt.value !== settings.language),
    [settings.language],
  );

  const savedMemoryCount = useMemo(
    () => memoryFields.filter((field) => Boolean(preferences.pipMemory?.[field.key]?.trim())).length,
    [preferences.pipMemory],
  );

  const checkIns = preferences.pipCheckIns;
  const checkInsEnabled = Boolean(checkIns?.enabled);
  const snoozeUntilMs = Number(checkIns?.snoozeUntil ?? 0);
  const isSnoozed = snoozeUntilMs > Date.now();
  const snoozeUntilLabel = isSnoozed
    ? new Date(snoozeUntilMs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '';

  const openModal = (tab: UsageModalTab) => {
    setUsageModalTab(tab);
    setUsageModalOpen(true);
  };

  return (
    <section className="space-y-6 text-[var(--text-primary)]">
      {/* 1. AI Connection & Model */}
      <div className="space-y-4">
        <div>
          <div className="flex items-center gap-2">
            <KeyRound className="w-4 h-4 shrink-0" style={{ color: 'var(--accent)' }} />
            <h2 className="font-display text-[16px] font-semibold text-[var(--text-primary)]">
              AI Connection &amp; Model
            </h2>
          </div>
          <p className="text-[12.5px] text-[var(--text-muted)] mt-1 leading-relaxed">
            {desktop
              ? assistant.keyStorage === 'windows'
                ? 'Your Gemini API key is stored securely in Windows Credential Manager.'
                : assistant.keyStorage === 'loading'
                  ? 'Checking for saved API keys…'
                  : 'API keys stay in memory for this session.'
              : 'Pip connects through the StudyFlow server using your configured Gemini API key.'}{' '}
            Messages, selected workspace context, and attached documents go to Gemini.
          </p>
          {assistant.keyStorageError && (
            <p role="status" className="mt-2 text-[12px] text-amber-600 dark:text-amber-400">
              {assistant.keyStorageError}
            </p>
          )}
        </div>

        <ProviderSettings key={`${settings.provider}-${assistant.model}`} />
      </div>

      {/* 2. Language & Timezone */}
      <div
        className="pt-5 space-y-3.5"
        style={{ borderTop: '1px solid var(--border-subtle)' }}
      >
        <div>
          <div className="flex items-center gap-2 text-[14px] font-semibold text-[var(--text-primary)] font-display">
            <Globe className="w-4 h-4 shrink-0" style={{ color: 'var(--accent)' }} />
            <span>Language &amp; Timezone</span>
          </div>
          <p className="text-[12px] text-[var(--text-muted)] mt-0.5">
            Set Pip’s reply language, optional bilingual casual mix for Companion, and timezone for schedules and quiet hours.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div className="space-y-1.5">
            <label
              htmlFor="pip-primary-lang"
              className="block text-[12px] font-medium text-[var(--text-secondary)]"
            >
              Assistant response language
            </label>
            <LanguageSelector
              id="pip-primary-lang"
              ariaLabel="Assistant response language"
              value={settings.language ?? ''}
              options={ASSISTANT_LANGUAGE_OPTIONS}
              emptyOption={{
                label: 'Match my message',
                description: 'Automatic · replies in the language you write',
                countryCode: 'AUTO',
              }}
              onChange={(nextValue) => {
                const nextLang = nextValue || undefined;
                assistant.updateSettings({
                  ...settings,
                  language: nextLang,
                  casualMixLanguage:
                    settings.casualMixLanguage === nextLang ? undefined : settings.casualMixLanguage,
                });
              }}
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="pip-mix-lang"
              className="block text-[12px] font-medium text-[var(--text-secondary)]"
            >
              Companion casual mix (optional)
            </label>
            <LanguageSelector
              id="pip-mix-lang"
              ariaLabel="Companion casual bilingual mix"
              value={settings.casualMixLanguage ?? ''}
              options={mixLanguageOptions}
              selectedPrefix="Mix with "
              emptyOption={{
                label: 'Single language only',
                description: 'Do not blend a second language in casual chat',
                countryCode: 'AUTO',
              }}
              onChange={(nextValue) =>
                assistant.updateSettings({
                  ...settings,
                  casualMixLanguage: nextValue || undefined,
                })
              }
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="pip-timezone-picker"
            className="block text-[12px] font-medium text-[var(--text-secondary)]"
          >
            Pip timezone
          </label>
          <TimezonePicker
            id="pip-timezone-picker"
            ariaLabel="Pip timezone"
            value={settings.timezone ?? ''}
            onChange={(nextZone) =>
              assistant.updateSettings({
                ...settings,
                timezone: nextZone || undefined,
              })
            }
          />
        </div>
      </div>

      {/* 3. Companion & Local Check-ins */}
      <div
        className="pt-5 space-y-3"
        style={{ borderTop: '1px solid var(--border-subtle)' }}
      >
        <div>
          <div className="flex items-center gap-2 text-[14px] font-semibold text-[var(--text-primary)] font-display">
            <Sparkles className="w-4 h-4 shrink-0" style={{ color: 'var(--accent)' }} />
            <span>Companion &amp; Local Check-ins</span>
          </div>
          <p className="text-[12px] text-[var(--text-muted)] mt-0.5">
            Opt-in local messages from Pip while StudyFlow is open. Quiet hours, focus sessions, and homework windows are always respected.
          </p>
        </div>

        <div className="divide-y divide-[var(--border-subtle)]">
          <SettingsSwitch
            label="Allow Pip to message first in Companion"
            description="Up to 1 unsolicited check-in per local day, shared across Companion and check-in alerts."
            checked={checkInsEnabled}
            onChange={(enabled) => {
              const prev = checkIns ?? {};
              updatePreferences({
                pipCheckIns: enabled
                  ? {
                      ...prev,
                      enabled: true,
                      casual: prev.casual ?? true,
                      studyMilestones: prev.studyMilestones ?? true,
                      suggestions: prev.suggestions ?? true,
                    }
                  : { ...prev, enabled: false },
              });
            }}
          />

          {checkInsEnabled && (
            <>
              <SettingsSwitch
                label="Casual hellos & conversation follow-ups"
                description="Warm greetings or checking back in on a topic you brought up recently."
                checked={checkIns?.casual !== false}
                onChange={(next) =>
                  updatePreferences({ pipCheckIns: { ...checkIns, casual: next } })
                }
              />
              <SettingsSwitch
                label="Post-session check-ins & verified milestones"
                description="Ask how a study block went or acknowledge real completed goals."
                checked={checkIns?.studyMilestones !== false}
                onChange={(next) =>
                  updatePreferences({ pipCheckIns: { ...checkIns, studyMilestones: next } })
                }
              />
              <SettingsSwitch
                label="Timely next-step suggestions"
                description="Offer one helpful action (like a short focus block or note review) when there is room for it."
                checked={checkIns?.suggestions !== false}
                onChange={(next) =>
                  updatePreferences({ pipCheckIns: { ...checkIns, suggestions: next } })
                }
              />
            </>
          )}
        </div>

        {checkInsEnabled && (
          <div className="pt-2 space-y-3.5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <label className="block space-y-1.5">
                <span className="flex items-center gap-1.5 text-[12px] font-medium text-[var(--text-secondary)]">
                  <Moon className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                  Quiet hours start
                </span>
                <input
                  type="time"
                  value={checkIns?.quietFrom ?? '21:30'}
                  onChange={(e) =>
                    updatePreferences({
                      pipCheckIns: { ...checkIns, quietFrom: e.target.value || '21:30' },
                    })
                  }
                  className="w-full px-3 py-2 rounded-lg text-[13px] font-mono-num tabular-nums outline-none focus:ring-1 focus:ring-[var(--accent)]"
                  style={{
                    backgroundColor: 'var(--bg-surface-subtle)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-primary)',
                  }}
                />
              </label>

              <label className="block space-y-1.5">
                <span className="flex items-center gap-1.5 text-[12px] font-medium text-[var(--text-secondary)]">
                  <Clock className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                  Quiet hours end
                </span>
                <input
                  type="time"
                  value={checkIns?.quietUntil ?? '07:00'}
                  onChange={(e) =>
                    updatePreferences({
                      pipCheckIns: { ...checkIns, quietUntil: e.target.value || '07:00' },
                    })
                  }
                  className="w-full px-3 py-2 rounded-lg text-[13px] font-mono-num tabular-nums outline-none focus:ring-1 focus:ring-[var(--accent)]"
                  style={{
                    backgroundColor: 'var(--bg-surface-subtle)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-primary)',
                  }}
                />
              </label>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={() =>
                  updatePreferences({
                    pipCheckIns: { ...checkIns, snoozeUntil: Date.now() + 86_400_000 },
                  })
                }
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12.5px] font-medium transition-colors hover:bg-[var(--bg-surface-hover)]"
                style={{
                  backgroundColor: 'var(--bg-surface-subtle)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-primary)',
                }}
              >
                <Bell className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                Snooze for 24 hours
              </button>

              {isSnoozed && (
                <>
                  <button
                    type="button"
                    onClick={() =>
                      updatePreferences({
                        pipCheckIns: { ...checkIns, snoozeUntil: 0 },
                      })
                    }
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12.5px] font-semibold transition-opacity hover:opacity-95"
                    style={{
                      backgroundColor: 'var(--accent)',
                      color: 'var(--accent-fg)',
                    }}
                  >
                    Resume check-ins
                  </button>
                  <span className="text-[12px] text-[var(--text-muted)] font-mono-num tabular-nums">
                    Paused until {snoozeUntilLabel}
                  </span>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 4. What Pip Remembers */}
      <div
        className="pt-5 space-y-3"
        style={{ borderTop: '1px solid var(--border-subtle)' }}
      >
        <button
          type="button"
          onClick={() => setMemoryExpanded((prev) => !prev)}
          aria-expanded={memoryExpanded}
          className="w-full flex items-center justify-between gap-3 text-left"
        >
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[14px] font-semibold text-[var(--text-primary)] font-display">
              <Brain className="w-4 h-4 shrink-0" style={{ color: 'var(--accent)' }} />
              <span>What Pip Remembers</span>
              <span className="text-[11.5px] font-normal font-mono-num tabular-nums text-[var(--text-muted)]">
                · {savedMemoryCount} / {memoryFields.length} saved
              </span>
            </div>
            <p className="text-[12px] text-[var(--text-muted)] mt-0.5">
              Explicit preferences shared with Pip only when relevant. Pip never infers or saves preferences from uploaded documents.
            </p>
          </div>
          <ChevronDown
            className={`w-4 h-4 shrink-0 text-[var(--text-muted)] transition-transform duration-150 ${
              memoryExpanded ? 'rotate-180' : ''
            }`}
          />
        </button>

        {memoryExpanded && (
          <div className="pt-1 space-y-3">
            {memoryFields.map((field) => {
              const currentValue = preferences.pipMemory?.[field.key] ?? '';
              return (
                <div key={field.key} className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <label
                      htmlFor={`pip-memory-${field.key}`}
                      className="text-[12px] font-medium text-[var(--text-secondary)]"
                    >
                      {field.label}
                    </label>
                    {currentValue && (
                      <button
                        type="button"
                        onClick={() => {
                          const memory = { ...preferences.pipMemory };
                          delete memory[field.key];
                          updatePreferences({ pipMemory: memory });
                        }}
                        className="inline-flex items-center gap-1 text-[11.5px] font-medium text-[var(--text-muted)] hover:text-rose-500 transition-colors"
                      >
                        <X className="w-3 h-3" />
                        Forget
                      </button>
                    )}
                  </div>
                  <input
                    id={`pip-memory-${field.key}`}
                    type="text"
                    maxLength={300}
                    placeholder={field.example}
                    value={currentValue}
                    onChange={(event) =>
                      updatePreferences({
                        pipMemory: {
                          ...preferences.pipMemory,
                          [field.key]: event.target.value,
                        },
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg text-[13px] outline-none focus:ring-1 focus:ring-[var(--accent)]"
                    style={{
                      backgroundColor: 'var(--bg-surface-subtle)',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--text-primary)',
                    }}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 5. Desktop Android Relay Delivery */}
      {desktop && <PhoneDeliverySettings />}

      {/* 6. API Usage & Rate Limits */}
      <div
        className="pt-5 space-y-3.5"
        style={{ borderTop: '1px solid var(--border-subtle)' }}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2 text-[14px] font-semibold text-[var(--text-primary)] font-display">
              <BarChart3 className="w-4 h-4 shrink-0" style={{ color: 'var(--accent)' }} />
              <span>API Usage &amp; Rate Limits</span>
            </div>
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[12px] text-[var(--text-muted)] font-mono-num tabular-nums">
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <label className="block space-y-1.5">
            <span className="block text-[12px] font-medium text-[var(--text-secondary)]">
              Max output tokens per reply
            </span>
            <select
              value={settings.maxOutput}
              onChange={(event) => {
                const next = Number(event.target.value) as ReplyLimit;
                if (CHAT_LIMITS.response.includes(next)) {
                  assistant.updateSettings({ ...settings, maxOutput: next });
                }
              }}
              className="w-full px-3 py-2 rounded-lg text-[12.5px] font-mono outline-none focus:ring-1 focus:ring-[var(--accent)]"
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

          <label className="block space-y-1.5">
            <span className="block text-[12px] font-medium text-[var(--text-secondary)]">
              Daily token limit (0 = no cap)
            </span>
            <input
              type="number"
              min={0}
              max={1000000}
              step={5000}
              value={settings.dailyLimit}
              onChange={(event) => {
                const raw = Math.max(
                  0,
                  Math.min(1_000_000, Math.round(Number(event.target.value) || 0)),
                );
                assistant.updateSettings({ ...settings, dailyLimit: raw });
              }}
              className="w-full px-3 py-2 rounded-lg text-[12.5px] font-mono-num tabular-nums outline-none focus:ring-1 focus:ring-[var(--accent)]"
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
            <span className="font-mono-num tabular-nums text-[var(--text-secondary)]">
              60s: {rateSnapshot.requestsLastMinute} req ·{' '}
              {rateSnapshot.tokensLastMinute.toLocaleString()} tok
              {rateSnapshot.cooldownSeconds > 0
                ? ` · Cooldown ${rateSnapshot.cooldownSeconds}s`
                : ''}
            </span>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 text-[11.5px] text-[var(--text-muted)] font-mono-num tabular-nums">
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
                      : rateSnapshot.status === 'near_limit' ||
                          rateSnapshot.status === 'cooling_down'
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
