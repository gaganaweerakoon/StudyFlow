import { useState, type FormEvent } from 'react';
import { BarChart3, KeyRound } from 'lucide-react';
import { useAssistant } from './AssistantContext';
import { PROVIDERS, isModelId, isProvider, type Provider } from './protocol';
import { type UsageEntry } from './usage';
import './assistant.css';

const MODEL_CHOICES: Record<Provider, string[]> = {
  openai: ['gpt-4.1-mini', 'gpt-4.1', 'gpt-5-mini', 'gpt-5.4-mini', 'gpt-6.2-sol', 'gpt-6.2-astra'],
  gemini: ['gemini-3.1-flash-lite', 'gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-4-hydrogen', 'gemini-4-carbon', 'gemini-4-neon', 'gemini-4-argon'],
  claude: ['claude-haiku-5-5', 'claude-haiku-4-5'],
};

function ProviderSettings() {
  const assistant = useAssistant();
  const { provider, models } = assistant.settings;
  const [key, setKey] = useState('');
  const [model, setModel] = useState(assistant.model);
  const choices = MODEL_CHOICES[provider];
  const [custom, setCustom] = useState(!choices.includes(assistant.model));
  const [message, setMessage] = useState('');
  const connected = assistant.configured.includes(provider);

  function submit(event: FormEvent) {
    event.preventDefault();
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
    if (nextKey) assistant.setKey(provider, nextKey);
    setKey('');
    setModel(nextModel);
    setMessage(nextKey ? 'Key saved for this tab. Send a chat message to verify it.' : 'Model saved.');
  }

  return (
    <form onSubmit={submit} className="pip-settings-form">
      <label>
        Model
        <select value={custom ? 'custom' : model} onChange={event => {
          const value = event.target.value;
          setCustom(value === 'custom');
          if (value !== 'custom') setModel(value);
        }}>
          {choices.map(choice => <option key={choice} value={choice}>{choice}</option>)}
          <option value="custom">Custom model</option>
        </select>
      </label>
      {custom && <label>Custom model ID
        <input value={model} maxLength={100} onChange={event => setModel(event.target.value)} />
      </label>}
      <label>
        API key
        <input
          type="password" autoComplete="off" spellCheck={false} maxLength={512} value={key}
          onChange={event => setKey(event.target.value)} disabled={!assistant.available}
          placeholder={connected ? '••••••••••••  Key set for this tab' : `Paste your ${PROVIDERS[provider].label} key`}
        />
      </label>
      <div className="pip-settings-actions">
        <button type="submit" className="pip-settings-primary">Save</button>
        {connected && <button type="button" onClick={() => {
          assistant.setKey(provider, '');
          setKey('');
          setMessage('Key removed.');
        }}>Remove key</button>}
        {message && <span role="status">{message}</span>}
      </div>
    </form>
  );
}

function UsageViewer({ usage }: { usage: UsageEntry[] }) {
  const [windowDays, setWindowDays] = useState(7);
  const [provider, setProvider] = useState<Provider | 'all'>('all');
  const from = new Date();
  from.setHours(0, 0, 0, 0);
  from.setDate(from.getDate() - windowDays + 1);
  const rows = usage.filter(row => row.at >= from.getTime() && (provider === 'all' || row.provider === provider));
  const unreported = rows.filter(row => !row.tokens).length;
  const totals = rows.reduce((total, record) => ({
    input: total.input + (record.tokens?.input ?? 0),
    output: total.output + (record.tokens?.output ?? 0),
    total: total.total + (record.tokens?.total ?? 0),
  }), { input: 0, output: 0, total: 0 });
  const daily = new Map<string, { row: UsageEntry; input: number; output: number; cached: number; total: number; requests: number }>();
  for (const row of rows) {
    const key = JSON.stringify([row.day, row.provider, row.model]);
    const group = daily.get(key) ?? { row, input: 0, output: 0, cached: 0, total: 0, requests: 0 };
    group.input += row.tokens?.input ?? 0;
    group.output += row.tokens?.output ?? 0;
    group.cached += row.tokens?.cached ?? 0;
    group.total += row.tokens?.total ?? 0;
    group.requests++;
    daily.set(key, group);
  }
  const fmt = (n: number) => n.toLocaleString();

  return (
    <div className="pip-usage">
      <div className="pip-settings-heading">
        <h2><BarChart3 size={18} /> AI Usage</h2>
        <div className="pip-actions">
          <select aria-label="Usage date range" value={windowDays} onChange={event => setWindowDays(Number(event.target.value))}>
            <option value={1}>Today</option>
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
          </select>
          <select aria-label="Filter usage by provider" value={provider} onChange={event => setProvider(isProvider(event.target.value) ? event.target.value : 'all')}>
            <option value="all">All providers</option>
            {Object.entries(PROVIDERS).map(([id, item]) => <option key={id} value={id}>{item.label}</option>)}
          </select>
        </div>
      </div>
      <div className="pip-stats">
        {([['Total tokens', totals.total], ['Input tokens', totals.input], ['Output tokens', totals.output]] as const)
          .map(([label, count]) => <div key={label}><span>{label}</span><strong>{fmt(count)}</strong></div>)}
      </div>
      {!rows.length ? <p>No assistant requests for this period.</p> : <>
        {unreported > 0 && <p>{unreported} {unreported === 1 ? 'request has' : 'requests have'} no provider-reported usage. These are excluded from token totals.</p>}
        <div className="pip-table-wrap">
          <table>
            <caption>Daily totals by model</caption>
            <thead><tr><th>Date</th><th>Provider / model</th><th>Input</th><th>Output</th><th>Cached input</th><th>Total</th><th>Requests</th></tr></thead>
            <tbody>{[...daily.values()].map(({ row, input, output, cached, total, requests }) => (
              <tr key={JSON.stringify([row.day, row.provider, row.model])}>
                <td>{row.day}</td><td>{PROVIDERS[row.provider]?.label} · {row.model}</td>
                <td>{fmt(input)}</td><td>{fmt(output)}</td><td>{fmt(cached)}</td><td>{fmt(total)}</td><td>{fmt(requests)}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
        <div className="pip-table-wrap">
          <table>
            <caption>Latest requests</caption>
            <thead><tr><th>Time</th><th>Model</th><th>Status</th><th>Input</th><th>Output</th><th>Total</th></tr></thead>
            <tbody>{rows.slice(0, 15).map(row => (
              <tr key={row.id}>
                <td>{new Date(row.at).toLocaleString()}</td><td>{row.model}</td><td>{row.status}</td>
                <td>{row.tokens ? fmt(row.tokens.input) : '—'}</td><td>{row.tokens ? fmt(row.tokens.output) : '—'}</td><td>{row.tokens ? fmt(row.tokens.total) : '—'}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </>}
    </div>
  );
}

export function AssistantSettings() {
  const assistant = useAssistant();
  const { settings } = assistant;
  return (
    <section className="pip-settings">
      <div className="pip-settings-heading"><h2><KeyRound size={18} /> AI Connection</h2></div>
      <p>Keys stay in memory for this tab. Messages, selected workspace context, and attached images go to your chosen provider.</p>
      {!assistant.available && <p role="status">Open StudyFlow at localhost to enter a key and use the assistant.</p>}
      <label>
        Provider
        <select value={settings.provider} onChange={event => {
          const provider = event.target.value;
          if (isProvider(provider)) assistant.updateSettings({ ...settings, provider });
        }}>
          {Object.entries(PROVIDERS).map(([id, item]) => <option key={id} value={id}>{item.label}</option>)}
        </select>
      </label>
      <ProviderSettings key={settings.provider} />
      <details><summary>View usage</summary><UsageViewer usage={assistant.usage} /></details>
    </section>
  );
}
