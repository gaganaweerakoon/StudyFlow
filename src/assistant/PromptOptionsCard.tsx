import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  Check,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  Minus,
  Plus,
  RotateCcw,
} from 'lucide-react';
import {
  formatPromptResponse,
  type PromptField,
  type PromptOptionsSpec,
} from './interactiveSchema';

interface PromptOptionsCardProps {
  spec: PromptOptionsSpec;
  onSendPrompt?: (text: string) => void;
  busy?: boolean;
}

type PromptAnswerMap = Record<string, string | string[] | number | boolean>;

function buildInitialAnswers(spec: PromptOptionsSpec): PromptAnswerMap {
  const init: PromptAnswerMap = {};
  for (const field of spec.fields) {
    if (field.type === 'choice' || field.type === 'select') {
      init[field.id] = field.default ?? (field.type === 'select' ? field.options[0]?.value ?? '' : '');
    } else if (field.type === 'multi') {
      init[field.id] = field.default ?? [];
    } else if (field.type === 'slider' || field.type === 'stepper') {
      init[field.id] = field.default;
    } else if (field.type === 'toggle') {
      init[field.id] = field.default;
    } else if (field.type === 'text') {
      init[field.id] = field.default ?? '';
    }
  }
  return init;
}

function stepDecimals(step: number): number {
  const s = String(step);
  const idx = s.indexOf('.');
  return idx >= 0 ? Math.min(6, s.length - idx - 1) : 0;
}

export const PromptOptionsCard: React.FC<PromptOptionsCardProps> = ({
  spec,
  onSendPrompt,
  busy = false,
}) => {
  const [answers, setAnswers] = useState<PromptAnswerMap>(() => buildInitialAnswers(spec));
  const [submittedText, setSubmittedText] = useState<string | null>(null);

  const isSingleChoiceQuickCard =
    spec.fields.length === 1 && spec.fields[0].type === 'choice';

  const canSubmit = useMemo(() => {
    return spec.fields.some((field) => {
      const val = answers[field.id];
      if (field.type === 'choice' || field.type === 'select') return Boolean(val);
      if (field.type === 'multi') return Array.isArray(val) && val.length > 0;
      if (field.type === 'slider' || field.type === 'stepper') return typeof val === 'number';
      if (field.type === 'toggle') return true;
      if (field.type === 'text') return typeof val === 'string' && val.trim().length > 0;
      return false;
    });
  }, [spec.fields, answers]);

  const submitAnswers = (nextAnswers: PromptAnswerMap) => {
    if (!onSendPrompt || busy) return;
    const text = formatPromptResponse(spec, nextAnswers);
    setSubmittedText(text);
    onSendPrompt(text);
  };

  if (submittedText) {
    return (
      <div
        className="my-3 rounded-xl px-3.5 py-2.5 flex items-start justify-between gap-3 not-prose"
        style={{
          backgroundColor: 'var(--bg-surface-subtle)',
          border: '1px solid var(--border-subtle)',
        }}
      >
        <div className="min-w-0 flex items-start gap-2">
          <Check className="w-4 h-4 shrink-0 mt-0.5" style={{ color: 'var(--accent)' }} />
          <div className="min-w-0">
            <div className="text-[12px] font-semibold text-[var(--text-primary)]">
              {spec.title}
            </div>
            <div className="text-[12px] text-[var(--text-secondary)] mt-0.5 whitespace-pre-line">
              {submittedText}
            </div>
          </div>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={() => setSubmittedText(null)}
          className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11.5px] font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] shrink-0"
        >
          <RotateCcw className="w-3 h-3" />
          Change
        </button>
      </div>
    );
  }

  return (
    <section
      className="my-3 rounded-xl overflow-hidden not-prose"
      style={{
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--border-subtle)',
      }}
      aria-label={spec.title}
    >
      {/* Header */}
      <div
        className="px-4 py-3"
        style={{
          backgroundColor: 'var(--bg-surface-subtle)',
          borderBottom: '1px solid var(--border-subtle)',
        }}
      >
        <div className="flex items-center gap-2 text-[13.5px] font-semibold text-[var(--text-primary)] font-display">
          <HelpCircle className="w-4 h-4 shrink-0" style={{ color: 'var(--accent)' }} />
          <span>{spec.title}</span>
        </div>
        {spec.description && (
          <p className="text-[12px] text-[var(--text-muted)] mt-0.5 leading-snug">
            {spec.description}
          </p>
        )}
      </div>

      {/* Fields */}
      <div className="p-4 space-y-4">
        {spec.fields.map((field: PromptField) => {
          if (field.type === 'choice') {
            const selected = String(answers[field.id] ?? '');
            return (
              <div key={field.id} className="space-y-2">
                {!isSingleChoiceQuickCard && (
                  <div className="text-[12.5px] font-medium text-[var(--text-primary)]">
                    {field.label}
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {field.options.map((opt) => {
                    const active = selected === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        disabled={busy}
                        onClick={() => {
                          const next = { ...answers, [field.id]: opt.value };
                          setAnswers(next);
                          if (isSingleChoiceQuickCard && onSendPrompt) {
                            submitAnswers(next);
                          }
                        }}
                        className="group flex items-center justify-between gap-2.5 px-3 py-2.5 rounded-lg text-left transition-colors hover:bg-[var(--bg-surface-hover)] disabled:opacity-50"
                        style={{
                          backgroundColor: active
                            ? 'var(--accent-soft)'
                            : 'var(--bg-surface-subtle)',
                          border: active
                            ? '1.5px solid var(--accent)'
                            : '1px solid var(--border-subtle)',
                        }}
                      >
                        <div className="min-w-0">
                          <div
                            className="text-[12.5px] font-medium leading-snug"
                            style={{ color: active ? 'var(--accent)' : 'var(--text-primary)' }}
                          >
                            {opt.label}
                          </div>
                          {opt.description && (
                            <div className="text-[11.5px] text-[var(--text-muted)] mt-0.5 leading-snug">
                              {opt.description}
                            </div>
                          )}
                        </div>
                        {isSingleChoiceQuickCard ? (
                          <ArrowRight className="w-3.5 h-3.5 shrink-0 text-[var(--text-muted)] group-hover:text-[var(--accent)] transition-colors" />
                        ) : active ? (
                          <Check className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--accent)' }} />
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          }

          if (field.type === 'multi') {
            const selectedList = Array.isArray(answers[field.id])
              ? (answers[field.id] as string[])
              : [];
            return (
              <div key={field.id} className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[12.5px] font-medium text-[var(--text-primary)]">
                    {field.label}
                  </span>
                  <span className="text-[11px] text-[var(--text-muted)]">Select all that apply</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {field.options.map((opt) => {
                    const checked = selectedList.includes(opt.value);
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        role="checkbox"
                        aria-checked={checked}
                        disabled={busy}
                        onClick={() => {
                          const nextList = checked
                            ? selectedList.filter((v) => v !== opt.value)
                            : [...selectedList, opt.value];
                          setAnswers((prev) => ({ ...prev, [field.id]: nextList }));
                        }}
                        className="flex items-start gap-2.5 px-3 py-2.5 rounded-lg text-left transition-colors hover:bg-[var(--bg-surface-hover)]"
                        style={{
                          backgroundColor: checked
                            ? 'var(--accent-soft)'
                            : 'var(--bg-surface-subtle)',
                          border: checked
                            ? '1.5px solid var(--accent)'
                            : '1px solid var(--border-subtle)',
                        }}
                      >
                        <span
                          className="mt-0.5 w-4 h-4 rounded flex items-center justify-center shrink-0"
                          style={{
                            backgroundColor: checked ? 'var(--accent)' : 'var(--bg-surface)',
                            border: checked ? '1px solid var(--accent)' : '1px solid var(--border-strong)',
                          }}
                        >
                          {checked && <Check className="w-3 h-3 text-white" strokeWidth={2.5} />}
                        </span>
                        <span className="min-w-0">
                          <span className="block text-[12.5px] font-medium text-[var(--text-primary)] leading-snug">
                            {opt.label}
                          </span>
                          {opt.description && (
                            <span className="block text-[11.5px] text-[var(--text-muted)] mt-0.5">
                              {opt.description}
                            </span>
                          )}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          }

          if (field.type === 'select') {
            const currentVal = String(answers[field.id] ?? '');
            return (
              <label key={field.id} className="block space-y-1.5">
                <span className="block text-[12.5px] font-medium text-[var(--text-primary)]">
                  {field.label}
                </span>
                <select
                  value={currentVal}
                  disabled={busy}
                  onChange={(event) =>
                    setAnswers((prev) => ({ ...prev, [field.id]: event.target.value }))
                  }
                  className="w-full px-3 py-2 rounded-lg text-[12.5px] outline-none focus:ring-1 focus:ring-[var(--accent)]"
                  style={{
                    backgroundColor: 'var(--bg-surface-subtle)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-primary)',
                  }}
                >
                  {field.options.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>
            );
          }

          if (field.type === 'slider') {
            const currentVal = Number(answers[field.id] ?? field.default);
            const decimals = stepDecimals(field.step);
            return (
              <div key={field.id} className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-[12.5px] font-medium text-[var(--text-primary)]">
                    {field.label}
                  </label>
                  <span className="font-mono-num tabular-nums text-[12.5px] font-semibold text-[var(--text-primary)]">
                    {decimals > 0 ? currentVal.toFixed(decimals) : currentVal}
                    {field.unit ? ` ${field.unit}` : ''}
                  </span>
                </div>
                <input
                  type="range"
                  aria-label={field.label}
                  min={field.min}
                  max={field.max}
                  step={field.step}
                  value={currentVal}
                  disabled={busy}
                  onChange={(event) =>
                    setAnswers((prev) => ({ ...prev, [field.id]: Number(event.target.value) }))
                  }
                  className="w-full h-1.5 rounded-lg cursor-pointer accent-[var(--accent)]"
                />
                <div className="flex items-center justify-between text-[11px] font-mono-num tabular-nums text-[var(--text-muted)]">
                  <span>
                    {field.min}
                    {field.unit ? ` ${field.unit}` : ''}
                  </span>
                  <span>
                    {field.max}
                    {field.unit ? ` ${field.unit}` : ''}
                  </span>
                </div>
              </div>
            );
          }

          if (field.type === 'stepper') {
            const currentVal = Number(answers[field.id] ?? field.default);
            const decimals = stepDecimals(field.step);
            const adjust = (dir: 1 | -1, mult = 1) => {
              const clamped = Math.min(
                field.max,
                Math.max(field.min, currentVal + dir * field.step * mult),
              );
              setAnswers((prev) => ({
                ...prev,
                [field.id]: Number(clamped.toFixed(decimals)),
              }));
            };
            return (
              <div key={field.id} className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-[12.5px] font-medium text-[var(--text-primary)]">
                    {field.label}
                  </label>
                  <span className="text-[10.5px] text-[var(--text-muted)]">↑ / ↓ keys</span>
                </div>
                <div
                  className="flex items-center rounded-lg overflow-hidden max-w-xs"
                  style={{
                    backgroundColor: 'var(--bg-surface-subtle)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <button
                    type="button"
                    aria-label={`Decrease ${field.label}`}
                    disabled={busy || currentVal <= field.min}
                    onClick={() => adjust(-1)}
                    className="px-2.5 py-2 text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)] disabled:opacity-35"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <div className="flex-1 flex items-center justify-center gap-1 px-2">
                    <input
                      type="number"
                      aria-label={field.label}
                      min={field.min}
                      max={field.max}
                      step={field.step}
                      value={currentVal}
                      disabled={busy}
                      onChange={(event) => {
                        const parsed = Number(event.target.value);
                        if (Number.isFinite(parsed)) {
                          const clamped = Math.min(field.max, Math.max(field.min, parsed));
                          setAnswers((prev) => ({
                            ...prev,
                            [field.id]: Number(clamped.toFixed(decimals)),
                          }));
                        }
                      }}
                      onKeyDown={(event) => {
                        if (event.key === 'ArrowUp') {
                          event.preventDefault();
                          adjust(1, event.shiftKey ? 10 : 1);
                        } else if (event.key === 'ArrowDown') {
                          event.preventDefault();
                          adjust(-1, event.shiftKey ? 10 : 1);
                        }
                      }}
                      className="w-full min-w-[48px] bg-transparent text-center font-mono-num tabular-nums text-[13px] font-semibold text-[var(--text-primary)] outline-none border-none p-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    {field.unit && (
                      <span className="text-[11.5px] font-mono-num text-[var(--text-muted)]">
                        {field.unit}
                      </span>
                    )}
                  </div>
                  <div
                    className="flex flex-col"
                    style={{ borderLeft: '1px solid var(--border-subtle)' }}
                  >
                    <button
                      type="button"
                      aria-label={`Step up ${field.label}`}
                      disabled={busy || currentVal >= field.max}
                      onClick={() => adjust(1)}
                      className="px-2 py-0.5 text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)] disabled:opacity-35"
                    >
                      <ChevronUp className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      aria-label={`Step down ${field.label}`}
                      disabled={busy || currentVal <= field.min}
                      onClick={() => adjust(-1)}
                      className="px-2 py-0.5 text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)] disabled:opacity-35"
                      style={{ borderTop: '1px solid var(--border-subtle)' }}
                    >
                      <ChevronDown className="w-3 h-3" />
                    </button>
                  </div>
                  <button
                    type="button"
                    aria-label={`Increase ${field.label}`}
                    disabled={busy || currentVal >= field.max}
                    onClick={() => adjust(1)}
                    className="px-2.5 py-2 text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)] disabled:opacity-35"
                    style={{ borderLeft: '1px solid var(--border-subtle)' }}
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          }

          if (field.type === 'toggle') {
            const checked = Boolean(answers[field.id] ?? field.default);
            return (
              <div key={field.id} className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[12.5px] font-medium text-[var(--text-primary)]">
                    {field.label}
                  </div>
                  {field.description && (
                    <div className="text-[11.5px] text-[var(--text-muted)]">
                      {field.description}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={checked}
                  aria-label={field.label}
                  disabled={busy}
                  onClick={() => setAnswers((prev) => ({ ...prev, [field.id]: !checked }))}
                  className="w-9 h-5 rounded-full p-0.5 transition-colors shrink-0"
                  style={{
                    backgroundColor: checked ? 'var(--accent)' : 'var(--border-strong)',
                  }}
                >
                  <span
                    className="block w-4 h-4 rounded-full bg-white transition-transform"
                    style={{ transform: checked ? 'translateX(16px)' : 'translateX(0px)' }}
                  />
                </button>
              </div>
            );
          }

          if (field.type === 'text') {
            const val = String(answers[field.id] ?? '');
            return (
              <label key={field.id} className="block space-y-1.5">
                <span className="block text-[12.5px] font-medium text-[var(--text-primary)]">
                  {field.label}
                </span>
                <input
                  type="text"
                  value={val}
                  disabled={busy}
                  placeholder={field.placeholder ?? 'Type your answer…'}
                  onChange={(event) =>
                    setAnswers((prev) => ({ ...prev, [field.id]: event.target.value }))
                  }
                  className="w-full px-3 py-2 rounded-lg text-[12.5px] outline-none focus:ring-1 focus:ring-[var(--accent)]"
                  style={{
                    backgroundColor: 'var(--bg-surface-subtle)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-primary)',
                  }}
                />
              </label>
            );
          }

          return null;
        })}
      </div>

      {/* Footer Actions */}
      {onSendPrompt && (!isSingleChoiceQuickCard || spec.allowSkip) && (
        <div
          className="px-4 py-2.5 flex items-center justify-end gap-2"
          style={{
            backgroundColor: 'var(--bg-surface-subtle)',
            borderTop: '1px solid var(--border-subtle)',
          }}
        >
          {spec.allowSkip && (
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setSubmittedText('Let Pip choose the best defaults');
                onSendPrompt('Please go ahead using your recommended defaults.');
              }}
              className="px-3 py-1.5 rounded-lg text-[12px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] transition-colors disabled:opacity-50"
            >
              Skip
            </button>
          )}
          {!isSingleChoiceQuickCard && (
            <button
              type="button"
              disabled={busy || !canSubmit}
              onClick={() => submitAnswers(answers)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[12px] font-semibold transition-opacity hover:opacity-95 disabled:opacity-45"
              style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' }}
            >
              <span>{spec.submitLabel ?? 'Continue'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}
    </section>
  );
};
