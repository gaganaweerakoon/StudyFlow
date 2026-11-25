import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, useReducedMotion } from 'motion/react';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  Gauge,
  Search,
  X,
} from 'lucide-react';
import {
  GEMINI_CHAT_MODELS,
  PROVIDERS,
  getGeminiModelInfo,
  isProvider,
  type Provider,
} from './protocol';
import type { UsageEntry } from './usage';
import {
  aggregateDailyUsage,
  aggregateModelUsage,
  buildUsageCsv,
  computeRateLimitSnapshot,
  filterUsageEntries,
  summarizeUsageEntries,
  type UsageWindowDays,
} from './usageAnalytics';

export type UsageModalTab = 'requests' | 'daily' | 'limits';

interface UsageDetailsModalProps {
  open: boolean;
  onClose: () => void;
  usage: UsageEntry[];
  activeModel?: string;
  dailyTokenLimit?: number;
  cooldownSeconds?: number;
  initialTab?: UsageModalTab;
}

const PAGE_SIZE = 40;

const WINDOW_LABELS: Record<UsageWindowDays, string> = {
  1: 'Today',
  7: 'Last 7 days',
  30: 'Last 30 days',
  0: 'All time',
};

export const UsageDetailsModal: React.FC<UsageDetailsModalProps> = ({
  open,
  onClose,
  usage,
  activeModel = PROVIDERS.gemini.model,
  dailyTokenLimit = 50000,
  cooldownSeconds = 0,
  initialTab = 'requests',
}) => {
  const prefersReduced = useReducedMotion();
  const [tab, setTab] = useState<UsageModalTab>(initialTab);
  const [windowDays, setWindowDays] = useState<UsageWindowDays>(7);
  const [provider, setProvider] = useState<Provider | 'all'>('all');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (open) setTab(initialTab);
  }, [open, initialTab]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    setPage(1);
  }, [tab, windowDays, provider, query]);

  const filtered = useMemo(
    () => filterUsageEntries(usage, { windowDays, provider, query }),
    [usage, windowDays, provider, query],
  );
  const totals = useMemo(() => summarizeUsageEntries(filtered), [filtered]);
  const dailyRows = useMemo(() => aggregateDailyUsage(filtered), [filtered]);
  const rateSnapshot = useMemo(
    () => computeRateLimitSnapshot(usage, activeModel, dailyTokenLimit, cooldownSeconds),
    [usage, activeModel, dailyTokenLimit, cooldownSeconds],
  );
  const modelUsage = useMemo(() => aggregateModelUsage(usage), [usage]);
  const modelUsageById = useMemo(
    () => new Map(modelUsage.map((row) => [row.model, row])),
    [modelUsage],
  );

  if (!open) return null;

  const totalRows = tab === 'requests' ? filtered.length : dailyRows.length;
  const pageCount = Math.max(1, Math.ceil(totalRows / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const startIndex = (safePage - 1) * PAGE_SIZE;
  const pagedRequests = filtered.slice(startIndex, startIndex + PAGE_SIZE);
  const pagedDaily = dailyRows.slice(startIndex, startIndex + PAGE_SIZE);
  const hasFilters = windowDays !== 0 || provider !== 'all' || query.trim().length > 0;

  const handleExportCsv = () => {
    const csv = buildUsageCsv(filtered, tab === 'daily' ? 'daily' : 'requests');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `studyflow-ai-usage-${tab}-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const statusTone = (row: UsageEntry) => {
    if (row.status === 'complete') return 'text-emerald-600 dark:text-emerald-400';
    if (row.status === 'stopped' || row.errorStatus === 429) return 'text-amber-600 dark:text-amber-400';
    return 'text-rose-600 dark:text-rose-400';
  };

  const statusLabel = (row: UsageEntry) => {
    if (row.status === 'complete') return 'Complete';
    if (row.status === 'stopped') return 'Stopped';
    if (row.errorStatus === 429) return 'Rate limited (429)';
    if (row.errorStatus) return `Error (${row.errorStatus})`;
    return 'Error';
  };

  const healthMeta = {
    healthy: { label: 'Within limits', color: '#16A34A' },
    near_limit: { label: 'Near daily budget', color: '#D97706' },
    limit_reached: { label: 'Daily budget reached', color: '#E11D48' },
    cooling_down: { label: `Cooling down (${rateSnapshot.cooldownSeconds}s)`, color: '#D97706' },
  }[rateSnapshot.status];

  const activeInfo = getGeminiModelInfo(activeModel);

  const modalContent = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6"
      style={{ backgroundColor: 'rgba(15, 23, 42, 0.56)', backdropFilter: 'blur(4px)' }}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="ai-usage-modal-title"
        initial={prefersReduced ? false : { opacity: 0, scale: 0.98, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-5xl max-h-[86vh] rounded-2xl flex flex-col overflow-hidden"
        style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          boxShadow: 'var(--shadow-floating)',
          color: 'var(--text-primary)',
        }}
      >
        {/* Modal Header */}
        <div
          className="px-5 py-4 flex items-center justify-between gap-4 shrink-0"
          style={{ borderBottom: '1px solid var(--border-subtle)' }}
        >
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4.5 h-4.5 shrink-0" style={{ color: 'var(--accent)' }} />
              <h2
                id="ai-usage-modal-title"
                className="font-display text-[17px] font-semibold tracking-tight text-[var(--text-primary)] truncate"
              >
                API Usage &amp; Rate Limits
              </h2>
            </div>
            <p className="text-[12px] text-[var(--text-muted)] mt-0.5 tabular-nums">
              {tab === 'limits'
                ? `Active model: ${activeModel} · ${healthMeta.label}`
                : `${WINDOW_LABELS[windowDays]} · ${totals.requests.toLocaleString()} ${totals.requests === 1 ? 'request' : 'requests'} · ${totals.total.toLocaleString()} tokens`}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {tab !== 'limits' && (
              <button
                type="button"
                disabled={!totalRows}
                onClick={handleExportCsv}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] disabled:opacity-45 transition-colors whitespace-nowrap shrink-0"
                style={{
                  backgroundColor: 'var(--bg-surface-subtle)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <Download className="w-3.5 h-3.5" />
                Export CSV
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close API usage and rate limits"
              className="w-8 h-8 rounded-lg inline-flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Summary KPI Strip */}
        <div
          className="grid grid-cols-2 sm:grid-cols-5 shrink-0"
          style={{
            backgroundColor: 'var(--bg-surface-subtle)',
            borderBottom: '1px solid var(--border-subtle)',
          }}
        >
          {(
            [
              ['Total tokens', totals.total],
              ['Input tokens', totals.input],
              ['Output tokens', totals.output],
              ['Cached input', totals.cached],
              ['Requests', totals.requests],
            ] as const
          ).map(([label, value], idx) => (
            <div
              key={label}
              className="px-4 py-3"
              style={{
                borderRight: idx < 4 ? '1px solid var(--border-subtle)' : undefined,
              }}
            >
              <div className="text-[11px] font-medium text-[var(--text-muted)]">{label}</div>
              <div className="font-mono tabular-nums text-[16px] font-semibold text-[var(--text-primary)] mt-0.5">
                {value.toLocaleString()}
              </div>
            </div>
          ))}
        </div>

        {/* Filter & Tab Toolbar */}
        <div
          className="px-5 py-3 flex flex-wrap items-center justify-between gap-3 shrink-0"
          style={{ borderBottom: '1px solid var(--border-subtle)' }}
        >
          {/* Segmented View Toggle */}
          <div
            className="inline-flex items-center p-0.5 rounded-lg"
            style={{
              backgroundColor: 'var(--bg-surface-subtle)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <button
              type="button"
              onClick={() => setTab('requests')}
              className="px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors whitespace-nowrap"
              style={
                tab === 'requests'
                  ? { backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)', boxShadow: '0 1px 2px rgba(0,0,0,0.06)' }
                  : { color: 'var(--text-muted)' }
              }
            >
              Request Log ({filtered.length})
            </button>
            <button
              type="button"
              onClick={() => setTab('daily')}
              className="px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors whitespace-nowrap"
              style={
                tab === 'daily'
                  ? { backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)', boxShadow: '0 1px 2px rgba(0,0,0,0.06)' }
                  : { color: 'var(--text-muted)' }
              }
            >
              Daily Summary ({dailyRows.length})
            </button>
            <button
              type="button"
              onClick={() => setTab('limits')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors whitespace-nowrap"
              style={
                tab === 'limits'
                  ? { backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)', boxShadow: '0 1px 2px rgba(0,0,0,0.06)' }
                  : { color: 'var(--text-muted)' }
              }
            >
              <Gauge className="w-3.5 h-3.5" />
              Rate Limits &amp; Quotas
            </button>
          </div>

          {tab !== 'limits' && (
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-[var(--text-muted)] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search model or status…"
                  aria-label="Search usage records"
                  className="h-8 pl-8 pr-3 rounded-lg text-[12px] w-48 sm:w-56 outline-none"
                  style={{
                    backgroundColor: 'var(--bg-surface-subtle)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-primary)',
                  }}
                />
              </div>

              <select
                aria-label="Usage date range"
                value={windowDays}
                onChange={(e) => setWindowDays(Number(e.target.value) as UsageWindowDays)}
                className="h-8 px-2.5 rounded-lg text-[12px]"
                style={{
                  backgroundColor: 'var(--bg-surface-subtle)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-primary)',
                }}
              >
                <option value={1}>Today</option>
                <option value={7}>Last 7 days</option>
                <option value={30}>Last 30 days</option>
                <option value={0}>All time</option>
              </select>

              <select
                aria-label="Filter usage by provider"
                value={provider}
                onChange={(e) => setProvider(isProvider(e.target.value) ? e.target.value : 'all')}
                className="h-8 px-2.5 rounded-lg text-[12px]"
                style={{
                  backgroundColor: 'var(--bg-surface-subtle)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-primary)',
                }}
              >
                <option value="all">All providers</option>
                {Object.entries(PROVIDERS).map(([id, item]) => (
                  <option key={id} value={id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-auto min-h-0">
          {tab === 'limits' ? (
            <div className="p-5 space-y-5">
              {/* Live Rate Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div
                  className="rounded-xl p-3.5"
                  style={{
                    backgroundColor: 'var(--bg-surface-subtle)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <div className="flex items-center justify-between text-[11.5px] text-[var(--text-muted)]">
                    <span>Rolling 60s Rate</span>
                    <Activity className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} />
                  </div>
                  <div className="font-mono tabular-nums text-[18px] font-semibold text-[var(--text-primary)] mt-1">
                    {rateSnapshot.requestsLastMinute} <span className="text-[12px] font-normal text-[var(--text-muted)]">RPM</span>
                  </div>
                  <div className="font-mono tabular-nums text-[11.5px] text-[var(--text-secondary)] mt-0.5">
                    {rateSnapshot.tokensLastMinute.toLocaleString()} TPM
                  </div>
                </div>

                <div
                  className="rounded-xl p-3.5"
                  style={{
                    backgroundColor: 'var(--bg-surface-subtle)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <div className="flex items-center justify-between text-[11.5px] text-[var(--text-muted)]">
                    <span>Today&apos;s Requests</span>
                    <Clock className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                  </div>
                  <div className="font-mono tabular-nums text-[18px] font-semibold text-[var(--text-primary)] mt-1">
                    {rateSnapshot.requestsToday.toLocaleString()} <span className="text-[12px] font-normal text-[var(--text-muted)]">RPD</span>
                  </div>
                  <div className="font-mono tabular-nums text-[11.5px] text-[var(--text-secondary)] mt-0.5">
                    {rateSnapshot.modelRequestsToday.toLocaleString()} on {activeModel}
                  </div>
                </div>

                <div
                  className="rounded-xl p-3.5"
                  style={{
                    backgroundColor: 'var(--bg-surface-subtle)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <div className="flex items-center justify-between text-[11.5px] text-[var(--text-muted)]">
                    <span>Daily Token Budget</span>
                    <span className="font-mono tabular-nums font-medium" style={{ color: healthMeta.color }}>
                      {rateSnapshot.dailyTokenLimit > 0 ? `${rateSnapshot.dailyTokenPct}%` : 'No cap'}
                    </span>
                  </div>
                  <div className="font-mono tabular-nums text-[18px] font-semibold text-[var(--text-primary)] mt-1">
                    {rateSnapshot.tokensToday.toLocaleString()}
                    {rateSnapshot.dailyTokenLimit > 0 && (
                      <span className="text-[12px] font-normal text-[var(--text-muted)]">
                        {' '}/ {rateSnapshot.dailyTokenLimit.toLocaleString()}
                      </span>
                    )}
                  </div>
                  {rateSnapshot.dailyTokenLimit > 0 && (
                    <div
                      className="h-1.5 w-full rounded-full overflow-hidden mt-2"
                      style={{ backgroundColor: 'var(--bg-surface-hover)' }}
                    >
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${rateSnapshot.dailyTokenPct}%`,
                          backgroundColor: healthMeta.color,
                        }}
                      />
                    </div>
                  )}
                </div>

                <div
                  className="rounded-xl p-3.5"
                  style={{
                    backgroundColor: 'var(--bg-surface-subtle)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <div className="flex items-center justify-between text-[11.5px] text-[var(--text-muted)]">
                    <span>Rate Limit Events (24h)</span>
                    <AlertTriangle
                      className="w-3.5 h-3.5"
                      style={{ color: rateSnapshot.rateLimitedCount24h > 0 ? '#D97706' : 'var(--text-muted)' }}
                    />
                  </div>
                  <div className="font-mono tabular-nums text-[18px] font-semibold text-[var(--text-primary)] mt-1">
                    {rateSnapshot.rateLimitedCount24h} <span className="text-[12px] font-normal text-[var(--text-muted)]">HTTP 429</span>
                  </div>
                  <div className="text-[11.5px] mt-0.5" style={{ color: healthMeta.color }}>
                    {healthMeta.label}
                  </div>
                </div>
              </div>

              {/* Per-Model Catalog & Usage Table */}
              <div className="space-y-2">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="text-[13px] font-semibold text-[var(--text-primary)]">
                    Available Gemini Chat Models &amp; Usage
                  </h3>
                  <span className="text-[11.5px] text-[var(--text-muted)]">
                    Active: <span className="font-mono text-[var(--text-secondary)]">{activeInfo.id}</span> ({activeInfo.tier === 'paid' ? 'Paid API key' : 'Free & Paid'})
                  </span>
                </div>

                <div
                  className="rounded-xl overflow-hidden"
                  style={{ border: '1px solid var(--border-subtle)' }}
                >
                  <table className="w-full border-collapse text-left text-[12.5px]">
                    <thead
                      className="text-[11px] font-semibold text-[var(--text-muted)]"
                      style={{
                        backgroundColor: 'var(--bg-surface-subtle)',
                        borderBottom: '1px solid var(--border-subtle)',
                      }}
                    >
                      <tr>
                        <th className="py-2.5 px-3.5 font-semibold">Chat Model</th>
                        <th className="py-2.5 px-3.5 font-semibold">Access Tier</th>
                        <th className="py-2.5 px-3.5 font-semibold text-right">Today Req</th>
                        <th className="py-2.5 px-3.5 font-semibold text-right">Today Tokens</th>
                        <th className="py-2.5 px-3.5 font-semibold text-right">7d Tokens</th>
                        <th className="py-2.5 px-3.5 font-semibold text-right">24h 429s</th>
                      </tr>
                    </thead>
                    <tbody>
                      {GEMINI_CHAT_MODELS.map((item) => {
                        const stats = modelUsageById.get(item.id);
                        const isCurrent = item.id === activeModel;
                        return (
                          <tr
                            key={item.id}
                            style={{
                              borderBottom: '1px solid var(--border-subtle)',
                              backgroundColor: isCurrent ? 'var(--bg-surface-subtle)' : undefined,
                            }}
                          >
                            <td className="py-2.5 px-3.5">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-[12px] font-medium text-[var(--text-primary)]">
                                  {item.id}
                                </span>
                                {isCurrent && (
                                  <span
                                    className="text-[10.5px] font-medium px-1.5 py-0.5 rounded"
                                    style={{
                                      backgroundColor: 'var(--bg-surface-hover)',
                                      color: 'var(--accent)',
                                    }}
                                  >
                                    Active
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-[var(--text-muted)] mt-0.5">{item.summary}</div>
                            </td>
                            <td className="py-2.5 px-3.5 whitespace-nowrap text-[12px]">
                              <span
                                className={
                                  item.tier === 'paid'
                                    ? 'text-amber-600 dark:text-amber-400 font-medium'
                                    : 'text-emerald-600 dark:text-emerald-400 font-medium'
                                }
                              >
                                {item.tier === 'paid' ? 'Paid API key' : 'Free & Paid'}
                              </span>
                            </td>
                            <td className="py-2.5 px-3.5 text-right font-mono tabular-nums text-[var(--text-secondary)]">
                              {(stats?.requestsToday ?? 0).toLocaleString()}
                            </td>
                            <td className="py-2.5 px-3.5 text-right font-mono tabular-nums text-[var(--text-secondary)]">
                              {(stats?.tokensToday ?? 0).toLocaleString()}
                            </td>
                            <td className="py-2.5 px-3.5 text-right font-mono tabular-nums font-semibold text-[var(--text-primary)]">
                              {(stats?.tokens7d ?? 0).toLocaleString()}
                            </td>
                            <td className="py-2.5 px-3.5 text-right font-mono tabular-nums text-[var(--text-secondary)]">
                              {(stats?.rateLimited24h ?? 0).toLocaleString()}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <p className="text-[11.5px] text-[var(--text-muted)] leading-relaxed">
                  Exact RPM, TPM, and daily quotas are enforced by Google Gemini based on your API key&apos;s billing tier.
                  StudyFlow tracks your live client-observed request/token pace, HTTP 429 cooldowns, and local daily token budget.
                </p>
              </div>
            </div>
          ) : !totalRows ? (
            <div className="py-16 px-6 text-center space-y-2.5">
              <div className="text-[14px] font-semibold text-[var(--text-primary)]">
                No AI requests found for this view
              </div>
              <p className="text-[12.5px] text-[var(--text-muted)] max-w-md mx-auto">
                {usage.length > 0
                  ? 'Try expanding the date range or clearing your provider and search filters.'
                  : 'Once you chat with Pip, restructure notes, or generate study materials, token usage will appear here.'}
              </p>
              {hasFilters && usage.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setWindowDays(0);
                    setProvider('all');
                    setQuery('');
                  }}
                  className="mt-1 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors"
                  style={{
                    backgroundColor: 'var(--accent)',
                    color: 'var(--accent-fg)',
                  }}
                >
                  Reset filters
                </button>
              )}
            </div>
          ) : tab === 'requests' ? (
            <table className="w-full border-collapse text-left text-[12.5px]">
              <thead
                className="sticky top-0 z-10 text-[11px] font-semibold text-[var(--text-muted)]"
                style={{
                  backgroundColor: 'var(--bg-surface-subtle)',
                  borderBottom: '1px solid var(--border-subtle)',
                }}
              >
                <tr>
                  <th className="py-2.5 px-4 font-semibold whitespace-nowrap">Time</th>
                  <th className="py-2.5 px-4 font-semibold whitespace-nowrap">Provider / Model</th>
                  <th className="py-2.5 px-4 font-semibold whitespace-nowrap">Status</th>
                  <th className="py-2.5 px-4 font-semibold text-right whitespace-nowrap">Input</th>
                  <th className="py-2.5 px-4 font-semibold text-right whitespace-nowrap">Output</th>
                  <th className="py-2.5 px-4 font-semibold text-right whitespace-nowrap">Cached</th>
                  <th className="py-2.5 px-4 font-semibold text-right whitespace-nowrap">Total</th>
                </tr>
              </thead>
              <tbody>
                {pagedRequests.map((row) => (
                  <tr
                    key={row.id}
                    className="hover:bg-[var(--bg-surface-hover)] transition-colors"
                    style={{ borderBottom: '1px solid var(--border-subtle)' }}
                  >
                    <td className="py-2.5 px-4 font-mono tabular-nums text-[12px] text-[var(--text-secondary)] whitespace-nowrap">
                      {new Date(row.at).toLocaleString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="py-2.5 px-4 whitespace-nowrap">
                      <span className="font-medium text-[var(--text-primary)]">
                        {PROVIDERS[row.provider]?.label ?? row.provider}
                      </span>
                      <span className="text-[var(--text-muted)]"> · </span>
                      <span className="font-mono text-[12px] text-[var(--text-secondary)]">{row.model}</span>
                    </td>
                    <td className={`py-2.5 px-4 font-medium whitespace-nowrap ${statusTone(row)}`}>
                      {statusLabel(row)}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono tabular-nums text-[var(--text-secondary)] whitespace-nowrap">
                      {row.tokens ? row.tokens.input.toLocaleString() : '—'}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono tabular-nums text-[var(--text-secondary)] whitespace-nowrap">
                      {row.tokens ? row.tokens.output.toLocaleString() : '—'}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono tabular-nums text-[var(--text-muted)] whitespace-nowrap">
                      {row.tokens ? row.tokens.cached.toLocaleString() : '—'}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono tabular-nums font-semibold text-[var(--text-primary)] whitespace-nowrap">
                      {row.tokens ? row.tokens.total.toLocaleString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="w-full border-collapse text-left text-[12.5px]">
              <thead
                className="sticky top-0 z-10 text-[11px] font-semibold text-[var(--text-muted)]"
                style={{
                  backgroundColor: 'var(--bg-surface-subtle)',
                  borderBottom: '1px solid var(--border-subtle)',
                }}
              >
                <tr>
                  <th className="py-2.5 px-4 font-semibold whitespace-nowrap">Date</th>
                  <th className="py-2.5 px-4 font-semibold whitespace-nowrap">Provider / Model</th>
                  <th className="py-2.5 px-4 font-semibold text-right whitespace-nowrap">Requests</th>
                  <th className="py-2.5 px-4 font-semibold text-right whitespace-nowrap">Input</th>
                  <th className="py-2.5 px-4 font-semibold text-right whitespace-nowrap">Output</th>
                  <th className="py-2.5 px-4 font-semibold text-right whitespace-nowrap">Cached</th>
                  <th className="py-2.5 px-4 font-semibold text-right whitespace-nowrap">Total</th>
                </tr>
              </thead>
              <tbody>
                {pagedDaily.map((row) => (
                  <tr
                    key={row.key}
                    className="hover:bg-[var(--bg-surface-hover)] transition-colors"
                    style={{ borderBottom: '1px solid var(--border-subtle)' }}
                  >
                    <td className="py-2.5 px-4 font-mono tabular-nums text-[12px] text-[var(--text-secondary)] whitespace-nowrap">
                      {row.day}
                    </td>
                    <td className="py-2.5 px-4 whitespace-nowrap">
                      <span className="font-medium text-[var(--text-primary)]">
                        {PROVIDERS[row.provider]?.label ?? row.provider}
                      </span>
                      <span className="text-[var(--text-muted)]"> · </span>
                      <span className="font-mono text-[12px] text-[var(--text-secondary)]">{row.model}</span>
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono tabular-nums text-[var(--text-secondary)] whitespace-nowrap">
                      {row.requests.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono tabular-nums text-[var(--text-secondary)] whitespace-nowrap">
                      {row.input.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono tabular-nums text-[var(--text-secondary)] whitespace-nowrap">
                      {row.output.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono tabular-nums text-[var(--text-muted)] whitespace-nowrap">
                      {row.cached.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono tabular-nums font-semibold text-[var(--text-primary)] whitespace-nowrap">
                      {row.total.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer with Unreported Note & Pagination */}
        <div
          className="px-5 py-3 flex flex-wrap items-center justify-between gap-3 text-[12px] text-[var(--text-muted)] shrink-0"
          style={{
            backgroundColor: 'var(--bg-surface-subtle)',
            borderTop: '1px solid var(--border-subtle)',
          }}
        >
          <div>
            {tab === 'limits' ? (
              <span>Adjust your daily token limit and visibility toggles in AI Settings.</span>
            ) : totals.unreported > 0 ? (
              <span>
                {totals.unreported} {totals.unreported === 1 ? 'request had' : 'requests had'} no provider-reported
                token count.
              </span>
            ) : (
              <span className="tabular-nums">
                {totalRows > 0
                  ? `Showing ${(startIndex + 1).toLocaleString()}–${Math.min(startIndex + PAGE_SIZE, totalRows).toLocaleString()} of ${totalRows.toLocaleString()} ${tab === 'requests' ? 'requests' : 'daily summaries'}`
                  : 'Stored locally for your StudyFlow workspace'}
              </span>
            )}
          </div>

          {tab !== 'limits' && pageCount > 1 && (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={safePage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[12px] font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)] disabled:opacity-40"
                style={{ border: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-surface)' }}
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                Prev
              </button>
              <span className="px-2 font-mono tabular-nums text-[11.5px] text-[var(--text-secondary)]">
                {safePage} / {pageCount}
              </span>
              <button
                type="button"
                disabled={safePage >= pageCount}
                onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[12px] font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)] disabled:opacity-40"
                style={{ border: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-surface)' }}
              >
                Next
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
};
