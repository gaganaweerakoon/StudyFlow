import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Clock, Globe, Search, X } from 'lucide-react';
import {
  describeTimezone,
  filterTimezones,
  getAllTimezoneOptions,
  getDeviceTimeZone,
  TIMEZONE_REGIONS,
  type TimezoneOption,
} from '../../utils/timezones';

export interface TimezonePickerProps {
  value: string;
  onChange: (nextTimezone: string) => void;
  ariaLabel?: string;
  id?: string;
  disabled?: boolean;
  className?: string;
}

type RenderRow =
  | { kind: 'device'; value: ''; option: TimezoneOption }
  | { kind: 'zone'; value: string; option: TimezoneOption };

export const TimezonePicker: React.FC<TimezonePickerProps> = ({
  value,
  onChange,
  ariaLabel = 'Select timezone',
  id,
  disabled = false,
  className = '',
}) => {
  const autoId = useId();
  const controlId = id ?? `tz-picker-${autoId}`;
  const listboxId = `${controlId}-listbox`;

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [regionFilter, setRegionFilter] = useState<(typeof TIMEZONE_REGIONS)[number]>('All');
  const [activeIndex, setActiveIndex] = useState(0);
  const [openUpward, setOpenUpward] = useState(false);
  const [nowTick, setNowTick] = useState(() => Date.now());

  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const deviceZoneId = useMemo(() => getDeviceTimeZone(), []);
  const nowDate = useMemo(() => new Date(nowTick), [nowTick]);

  const deviceZone = useMemo(
    () => describeTimezone(deviceZoneId, nowDate),
    [deviceZoneId, nowDate],
  );

  const allZones = useMemo(() => getAllTimezoneOptions(nowDate), [nowDate]);

  const selectedZone = useMemo(() => {
    if (!value) return null;
    return allZones.find((zone) => zone.id === value) ?? describeTimezone(value, nowDate);
  }, [allZones, value, nowDate]);

  const rows = useMemo<RenderRow[]>(() => {
    const filtered = filterTimezones(allZones, query, regionFilter);
    const trimmed = query.trim().toLowerCase();
    const list: RenderRow[] = [];

    const showDeviceRow =
      !trimmed ||
      'device local automatic system'.includes(trimmed) ||
      deviceZone.city.toLowerCase().includes(trimmed) ||
      deviceZone.id.toLowerCase().includes(trimmed) ||
      deviceZone.offsetLabel.toLowerCase().includes(trimmed);

    if (showDeviceRow && (trimmed || regionFilter === 'All')) {
      list.push({ kind: 'device', value: '', option: deviceZone });
    }

    for (const option of filtered) {
      list.push({ kind: 'zone', value: option.id, option });
    }
    return list;
  }, [allZones, query, regionFilter, deviceZone]);

  useEffect(() => {
    if (!open) return;
    setNowTick(Date.now());

    const triggerRect = triggerRef.current?.getBoundingClientRect();
    if (triggerRect) {
      const spaceBelow = window.innerHeight - triggerRect.bottom;
      setOpenUpward(spaceBelow < 360 && triggerRect.top > spaceBelow);
    }

    const focusTimer = window.setTimeout(() => {
      searchInputRef.current?.focus();
    }, 10);

    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener('mousedown', handlePointerDown);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const selectedIdx = rows.findIndex((row) => row.value === value);
    setActiveIndex(selectedIdx >= 0 ? selectedIdx : 0);
  }, [open, rows, value]);

  useEffect(() => {
    if (!open || !listRef.current) return;
    const activeEl = listRef.current.querySelector<HTMLElement>(`[data-tz-index="${activeIndex}"]`);
    activeEl?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, open]);

  const closeMenu = (restoreFocus = false) => {
    setOpen(false);
    setQuery('');
    if (restoreFocus) {
      window.requestAnimationFrame(() => triggerRef.current?.focus());
    }
  };

  const selectTimezone = (nextValue: string) => {
    onChange(nextValue);
    closeMenu(true);
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (!open) {
      if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        if (!disabled) setOpen(true);
      }
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      closeMenu(true);
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((prev) => (rows.length ? (prev + 1) % rows.length : 0));
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((prev) => (rows.length ? (prev - 1 + rows.length) % rows.length : 0));
      return;
    }

    if (event.key === 'Home') {
      event.preventDefault();
      setActiveIndex(0);
      return;
    }

    if (event.key === 'End') {
      event.preventDefault();
      setActiveIndex(Math.max(0, rows.length - 1));
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      const target = rows[activeIndex];
      if (target) selectTimezone(target.value);
    }
  };

  const displayZone = selectedZone ?? deviceZone;

  return (
    <div ref={rootRef} className={`relative ${className}`} onKeyDown={handleKeyDown}>
      <button
        ref={triggerRef}
        id={controlId}
        type="button"
        disabled={disabled}
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={open ? listboxId : undefined}
        aria-label={ariaLabel}
        onClick={() => {
          if (disabled) return;
          setOpen((prev) => {
            if (prev) setQuery('');
            return !prev;
          });
        }}
        className="w-full flex items-center justify-between gap-2.5 px-3 py-2 rounded-lg text-[13px] text-left transition-colors disabled:opacity-55 hover:border-[var(--border-strong)]"
        style={{
          backgroundColor: 'var(--bg-surface-subtle)',
          border: open ? '1px solid var(--accent)' : '1px solid var(--border-subtle)',
          color: 'var(--text-primary)',
        }}
      >
        <span className="flex items-center gap-2.5 min-w-0">
          <Globe className="w-4 h-4 shrink-0" style={{ color: 'var(--accent)' }} />
          <span className="truncate font-medium text-[var(--text-primary)]">
            {selectedZone ? `${selectedZone.city} (${selectedZone.id})` : `Device timezone (${deviceZone.city})`}
          </span>
        </span>

        <span className="flex items-center gap-2 shrink-0">
          <span className="font-mono-num tabular-nums text-[11.5px] text-[var(--text-muted)]">
            {displayZone.offsetLabel}
            {displayZone.currentTime ? ` · ${displayZone.currentTime}` : ''}
          </span>
          <ChevronDown
            className={`w-4 h-4 shrink-0 text-[var(--text-muted)] transition-transform duration-150 ${
              open ? 'rotate-180' : ''
            }`}
          />
        </span>
      </button>

      {open && (
        <div
          className={`absolute left-0 right-0 z-50 rounded-xl shadow-lg overflow-hidden ${
            openUpward ? 'bottom-full mb-1.5' : 'top-full mt-1.5'
          }`}
          style={{
            backgroundColor: 'var(--bg-elevated)',
            border: '1px solid var(--border-subtle)',
            minWidth: '300px',
          }}
        >
          {/* Search Input */}
          <div
            className="flex items-center gap-2 px-2.5 py-2"
            style={{ borderBottom: '1px solid var(--border-subtle)' }}
          >
            <Search className="w-3.5 h-3.5 shrink-0 text-[var(--text-muted)]" />
            <input
              ref={searchInputRef}
              type="text"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setActiveIndex(0);
              }}
              placeholder="Search city, country, UTC offset, or code (e.g. Colombo, +5:30, PST)…"
              aria-label="Search timezones"
              className="w-full bg-transparent text-[12.5px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none border-none p-0"
            />
            {query && (
              <button
                type="button"
                aria-label="Clear timezone search"
                onClick={() => {
                  setQuery('');
                  setActiveIndex(0);
                  searchInputRef.current?.focus();
                }}
                className="p-0.5 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Region Tabs when not searching */}
          {!query.trim() && (
            <div
              className="flex items-center gap-1 px-2 py-1.5 overflow-x-auto"
              style={{ borderBottom: '1px solid var(--border-subtle)' }}
            >
              {TIMEZONE_REGIONS.map((region) => {
                const active = regionFilter === region;
                return (
                  <button
                    key={region}
                    type="button"
                    onClick={() => {
                      setRegionFilter(region);
                      setActiveIndex(0);
                    }}
                    className="px-2 py-1 rounded-md text-[11.5px] font-medium whitespace-nowrap transition-colors"
                    style={{
                      backgroundColor: active ? 'var(--accent-soft)' : 'transparent',
                      color: active ? 'var(--accent)' : 'var(--text-secondary)',
                    }}
                  >
                    {region}
                  </button>
                );
              })}
            </div>
          )}

          {/* Timezone Rows */}
          <div
            ref={listRef}
            id={listboxId}
            role="listbox"
            aria-label={ariaLabel}
            className="max-h-68 overflow-y-auto p-1"
          >
            {rows.length === 0 ? (
              <div className="px-3 py-5 text-center text-[12px] text-[var(--text-muted)]">
                No timezones matching “{query}”
              </div>
            ) : (
              rows.map((row, index) => {
                const isSelected = row.value === value;
                const isHighlighted = index === activeIndex;
                const isDevice = row.kind === 'device';
                return (
                  <button
                    key={isDevice ? '__device__' : row.value}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    data-tz-index={index}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => selectTimezone(row.value)}
                    className="w-full flex items-center justify-between gap-3 px-2.5 py-2 rounded-lg text-left transition-colors"
                    style={{
                      backgroundColor: isSelected
                        ? 'var(--accent-soft)'
                        : isHighlighted
                          ? 'var(--bg-surface-hover)'
                          : 'transparent',
                      borderBottom:
                        isDevice && rows.length > 1 ? '1px solid var(--border-subtle)' : undefined,
                      marginBottom: isDevice && rows.length > 1 ? '4px' : undefined,
                    }}
                  >
                    <span className="min-w-0 flex-1">
                      <span
                        className="flex items-center gap-1.5 text-[12.5px] font-medium truncate"
                        style={{ color: isSelected ? 'var(--accent)' : 'var(--text-primary)' }}
                      >
                        {isDevice ? (
                          <>
                            <Clock className="w-3.5 h-3.5 shrink-0" />
                            <span>Use device timezone</span>
                          </>
                        ) : (
                          <span className="truncate">{row.option.city}</span>
                        )}
                      </span>
                      <span className="block truncate text-[11px] text-[var(--text-muted)]">
                        {isDevice
                          ? `Detected: ${row.option.id}`
                          : row.option.countryHint
                            ? `${row.option.id} · ${row.option.countryHint.split(' ').slice(0, 3).join(' ')}`
                            : row.option.id}
                      </span>
                    </span>

                    <span className="flex items-center gap-2 shrink-0 font-mono-num tabular-nums">
                      <span className="text-[11.5px] text-[var(--text-secondary)]">
                        {row.option.offsetLabel}
                      </span>
                      {row.option.currentTime && (
                        <span className="text-[11px] text-[var(--text-muted)] w-10 text-right">
                          {row.option.currentTime}
                        </span>
                      )}
                      <span className="w-3.5 flex items-center justify-center">
                        {isSelected && (
                          <Check className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} />
                        )}
                      </span>
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
