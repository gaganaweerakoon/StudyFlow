import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, useReducedMotion } from 'motion/react';
import { BarChart3, ChevronLeft, ChevronRight, Download, Search, X } from 'lucide-react';
import { PROVIDERS, isProvider, type Provider } from './protocol';
import type { UsageEntry } from './usage';
import {
  aggregateDailyUsage,
  buildUsageCsv,
  filterUsageEntries,
  summarizeUsageEntries,
  type UsageWindowDays,
} from './usageAnalytics';

interface UsageDetailsModalProps {
  open: boolean;
  onClose: () => void;
  usage: UsageEntry[];
}

const PAGE_SIZE = 40;

const WINDOW_LABELS: Record<UsageWindowDays, string> = {
  1: 'Today',
  7: 'Last 7 days',
  30: 'Last 30 days',
  0: 'All time',
};

export const UsageDetailsModal: React.FC<UsageDetailsModalProps> = ({ open, onClose, usage }) => {
  const prefersReduced = useReducedMotion();
  const [tab, setTab] = useState<'requests' | 'daily'>('requests');
  const [windowDays, setWindowDays] = useState<UsageWindowDays>(7);
  const [provider, setProvider] = useState<Provider | 'all'>('all');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);

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

  if (!open) return null;

  const totalRows = tab === 'requests' ? filtered.length : dailyRows.length;
  const pageCount = Math.max(1, Math.ceil(totalRows / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const startIndex = (safePage - 1) * PAGE_SIZE;
  const pagedRequests = filtered.slice(startIndex, startIndex + PAGE_SIZE);
  const pagedDaily = dailyRows.slice(startIndex, startIndex + PAGE_SIZE);
  const hasFilters = windowDays !== 0 || provider !== 'all' || query.trim().length > 0;

  const handleExportCsv = () => {
    const csv = buildUsageCsv(filtered, tab);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `studyflow-ai-usage-${tab}-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const statusTone = (status: UsageEntry['status']) => {
    if (status === 'complete') return 'text-emerald-600 dark:text-emerald-400';
    if (status === 'stopped') return 'text-amber-600 dark:text-amber-400';
    return 'text-rose-600 dark:text-rose-400';
  };

  const statusLabel = (status: UsageEntry['status']) =>
    status === 'complete' ? 'Complete' : status === 'stopped' ? 'Stopped' : 'Error';

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
                AI Usage Details
              </h2>
            </div>
            <p className="text-[12px] text-[var(--text-muted)] mt-0.5 tabular-nums">
              {WINDOW_LABELS[windowDays]} · {totals.requests.toLocaleString()}{' '}
              {totals.requests === 1 ? 'request' : 'requests'} · {totals.total.toLocaleString()} tokens
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
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
            <button
              type="button"
              onClick={onClose}
              aria-label="Close AI usage details"
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
          </div>

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
        </div>

        {/* Scrollable Sticky-Header Table Area */}
        <div className="flex-1 overflow-auto min-h-0">
          {!totalRows ? (
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
                    <td className={`py-2.5 px-4 font-medium whitespace-nowrap ${statusTone(row.status)}`}>
                      {statusLabel(row.status)}
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
            {totals.unreported > 0 ? (
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

          {pageCount > 1 && (
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
