import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Search, X } from 'lucide-react';
import { filterLanguageOptions, type LanguageOption } from '../../assistant/companion';
import { CountryFlag } from './CountryFlag';

export interface LanguageSelectorItem extends LanguageOption {
  value: string;
}

export interface LanguageSelectorProps {
  value: string;
  onChange: (nextValue: string) => void;
  options: readonly LanguageSelectorItem[];
  emptyOption?: {
    label: string;
    description?: string;
    countryCode?: string;
  };
  selectedPrefix?: string;
  searchPlaceholder?: string;
  ariaLabel?: string;
  id?: string;
  disabled?: boolean;
  className?: string;
}

type RenderChoice =
  | { kind: 'empty'; value: ''; label: string; subtitle?: string; countryCode: string }
  | { kind: 'option'; value: string; item: LanguageSelectorItem };

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  value,
  onChange,
  options,
  emptyOption,
  selectedPrefix = '',
  searchPlaceholder = 'Search language, script, or country…',
  ariaLabel = 'Select language',
  id,
  disabled = false,
  className = '',
}) => {
  const autoId = useId();
  const controlId = id ?? `lang-select-${autoId}`;
  const listboxId = `${controlId}-listbox`;

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [openUpward, setOpenUpward] = useState(false);

  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const selectedOption = useMemo(
    () => options.find((opt) => opt.value === value),
    [options, value],
  );

  const choices = useMemo<RenderChoice[]>(() => {
    const filtered = filterLanguageOptions(options, query);
    const result: RenderChoice[] = [];
    const q = query.trim().toLowerCase();

    if (emptyOption) {
      const emptyMatches =
        !q ||
        emptyOption.label.toLowerCase().includes(q) ||
        (emptyOption.description?.toLowerCase().includes(q) ?? false) ||
        'auto default automatic single'.includes(q);
      if (emptyMatches) {
        result.push({
          kind: 'empty',
          value: '',
          label: emptyOption.label,
          subtitle: emptyOption.description,
          countryCode: emptyOption.countryCode ?? 'AUTO',
        });
      }
    }

    for (const item of filtered) {
      result.push({ kind: 'option', value: item.value, item });
    }
    return result;
  }, [options, query, emptyOption]);

  useEffect(() => {
    if (!open) return;
    const selectedIdx = choices.findIndex((choice) => choice.value === value);
    setActiveIndex(selectedIdx >= 0 ? selectedIdx : 0);
  }, [open, choices, value]);

  useEffect(() => {
    if (!open) return;

    const triggerRect = triggerRef.current?.getBoundingClientRect();
    if (triggerRect) {
      const spaceBelow = window.innerHeight - triggerRect.bottom;
      setOpenUpward(spaceBelow < 320 && triggerRect.top > spaceBelow);
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
    if (!open || !listRef.current) return;
    const activeEl = listRef.current.querySelector<HTMLElement>(`[data-option-index="${activeIndex}"]`);
    activeEl?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, open]);

  const closeMenu = (restoreFocus = false) => {
    setOpen(false);
    setQuery('');
    if (restoreFocus) {
      window.requestAnimationFrame(() => triggerRef.current?.focus());
    }
  };

  const selectValue = (nextValue: string) => {
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
      setActiveIndex((prev) => (choices.length ? (prev + 1) % choices.length : 0));
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((prev) => (choices.length ? (prev - 1 + choices.length) % choices.length : 0));
      return;
    }

    if (event.key === 'Home') {
      event.preventDefault();
      setActiveIndex(0);
      return;
    }

    if (event.key === 'End') {
      event.preventDefault();
      setActiveIndex(Math.max(0, choices.length - 1));
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      const target = choices[activeIndex];
      if (target) selectValue(target.value);
    }
  };

  const triggerLabel = selectedOption
    ? `${selectedPrefix}${selectedOption.label}`
    : emptyOption?.label ?? 'Select language';

  const triggerNative =
    selectedOption?.nativeLabel && selectedOption.nativeLabel !== selectedOption.label
      ? selectedOption.nativeLabel
      : undefined;

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
          <CountryFlag
            code={selectedOption ? selectedOption.countryCode : (emptyOption?.countryCode ?? 'AUTO')}
            size="md"
          />
          <span className="truncate font-medium text-[var(--text-primary)]">{triggerLabel}</span>
          {triggerNative && (
            <span className="truncate text-[12px] text-[var(--text-muted)]">{triggerNative}</span>
          )}
        </span>
        <ChevronDown
          className={`w-4 h-4 shrink-0 text-[var(--text-muted)] transition-transform duration-150 ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>

      {open && (
        <div
          className={`absolute left-0 right-0 z-50 rounded-xl shadow-lg overflow-hidden ${
            openUpward ? 'bottom-full mb-1.5' : 'top-full mt-1.5'
          }`}
          style={{
            backgroundColor: 'var(--bg-elevated)',
            border: '1px solid var(--border-subtle)',
            minWidth: '260px',
          }}
        >
          {/* Sticky Search Input */}
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
              placeholder={searchPlaceholder}
              aria-label={searchPlaceholder}
              className="w-full bg-transparent text-[12.5px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none border-none p-0"
            />
            {query && (
              <button
                type="button"
                aria-label="Clear language search"
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

          {/* Options List */}
          <div
            ref={listRef}
            id={listboxId}
            role="listbox"
            aria-label={ariaLabel}
            className="max-h-64 overflow-y-auto p-1"
          >
            {choices.length === 0 ? (
              <div className="px-3 py-5 text-center text-[12px] text-[var(--text-muted)]">
                No languages matching “{query}”
              </div>
            ) : (
              choices.map((choice, index) => {
                const isSelected = choice.value === value;
                const isHighlighted = index === activeIndex;
                return (
                  <button
                    key={choice.kind === 'empty' ? '__empty__' : choice.value}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    data-option-index={index}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => selectValue(choice.value)}
                    className="w-full flex items-center justify-between gap-2.5 px-2.5 py-2 rounded-lg text-left transition-colors"
                    style={{
                      backgroundColor: isSelected
                        ? 'var(--accent-soft)'
                        : isHighlighted
                          ? 'var(--bg-surface-hover)'
                          : 'transparent',
                    }}
                  >
                    <span className="flex items-center gap-2.5 min-w-0">
                      <CountryFlag
                        code={choice.kind === 'empty' ? choice.countryCode : choice.item.countryCode}
                        size="md"
                      />
                      <span className="min-w-0">
                        <span
                          className="block truncate text-[12.5px] font-medium"
                          style={{ color: isSelected ? 'var(--accent)' : 'var(--text-primary)' }}
                        >
                          {choice.kind === 'empty'
                            ? choice.label
                            : `${selectedPrefix}${choice.item.label}`}
                        </span>
                        {choice.kind === 'empty' && choice.subtitle && (
                          <span className="block truncate text-[11px] text-[var(--text-muted)]">
                            {choice.subtitle}
                          </span>
                        )}
                        {choice.kind === 'option' && (
                          <span className="block truncate text-[11px] text-[var(--text-muted)]">
                            {choice.item.nativeLabel && choice.item.nativeLabel !== choice.item.label
                              ? `${choice.item.nativeLabel} · ${choice.item.region}`
                              : choice.item.region}
                          </span>
                        )}
                      </span>
                    </span>

                    <span className="flex items-center gap-2 shrink-0">
                      {choice.kind === 'option' && (
                        <span className="font-mono-num text-[10.5px] uppercase text-[var(--text-muted)]">
                          {choice.item.code}
                        </span>
                      )}
                      {isSelected && (
                        <Check className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--accent)' }} />
                      )}
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
