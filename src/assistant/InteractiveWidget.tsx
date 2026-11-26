import React, { useId, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Info,
  Minus,
  Plus,
  RotateCcw,
  Send,
  SlidersHorizontal,
  Sparkles,
} from 'lucide-react';
import {
  buildDefaultControlValues,
  evaluateInteractiveState,
  formatInteractiveFollowUp,
  samplePlotCurve,
  type ControlValues,
  type InteractiveControl,
  type InteractiveSpec,
  type InteractiveVisual,
} from './interactiveSchema';
import { evaluateNumericExpression, evaluateSafeExpression, type EvalScope } from './safeMath';
import { SafeSvgRenderer } from './SafeSvgRenderer';

interface InteractiveWidgetProps {
  spec: InteractiveSpec;
  onSendPrompt?: (text: string) => void;
  busy?: boolean;
}

const DEFAULT_CURVE_COLORS = ['#4f46e5', '#059669', '#e11d48', '#d97706', '#0284c7', '#7c3aed'];

function stepPrecision(step: number): number {
  const s = String(step);
  const dot = s.indexOf('.');
  return dot >= 0 ? Math.min(6, s.length - dot - 1) : 0;
}

function roundToStep(value: number, min: number, max: number, step: number): number {
  const clamped = Math.min(max, Math.max(min, value));
  const decimals = stepPrecision(step);
  return Number(clamped.toFixed(decimals));
}

function formatAxisTick(value: number): string {
  if (Math.abs(value) >= 1000 || (Math.abs(value) > 0 && Math.abs(value) < 0.01)) {
    return value.toExponential(1);
  }
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(2)));
}

const PlotVisual: React.FC<{
  visual: Extract<InteractiveVisual, { type: 'plot' }>;
  scope: EvalScope;
}> = ({ visual, scope }) => {
  const clipId = `pip-plot-clip-${useId().replace(/[^A-Za-z0-9_-]/g, '')}`;
  const width = 560;
  const height = 270;
  const padL = 52;
  const padR = 20;
  const padT = 18;
  const padB = 40;
  const plotW = width - padL - padR;
  const plotH = height - padT - padB;

  const mapX = (x: number) => padL + ((x - visual.xMin) / (visual.xMax - visual.xMin)) * plotW;
  const mapY = (y: number) =>
    padT + plotH - ((y - visual.yMin) / (visual.yMax - visual.yMin)) * plotH;

  const xTicks = [0, 0.25, 0.5, 0.75, 1].map((t) => visual.xMin + t * (visual.xMax - visual.xMin));
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((t) => visual.yMin + t * (visual.yMax - visual.yMin));

  const curvePaths = useMemo(() => {
    return visual.curves.map((curve, idx) => {
      const pts = samplePlotCurve(curve.expr, visual.xMin, visual.xMax, scope, 120);
      const segments: string[] = [];
      let penDown = false;
      for (const pt of pts) {
        const clampedY = Math.min(visual.yMax + (visual.yMax - visual.yMin) * 0.15, Math.max(visual.yMin - (visual.yMax - visual.yMin) * 0.15, pt.y));
        const sx = mapX(pt.x);
        const sy = mapY(clampedY);
        if (!Number.isFinite(sx) || !Number.isFinite(sy)) {
          penDown = false;
          continue;
        }
        segments.push(`${penDown ? 'L' : 'M'} ${sx.toFixed(1)} ${sy.toFixed(1)}`);
        penDown = true;
      }
      return {
        label: curve.label,
        color: curve.color || DEFAULT_CURVE_COLORS[idx % DEFAULT_CURVE_COLORS.length],
        d: segments.join(' '),
      };
    });
  }, [visual, scope]);

  const markerPoint = useMemo(() => {
    if (!visual.marker) return null;
    const mx = evaluateNumericExpression(visual.marker.xExpr, scope);
    const my = evaluateNumericExpression(visual.marker.yExpr, scope);
    if (mx === null || my === null) return null;
    if (mx < visual.xMin || mx > visual.xMax || my < visual.yMin || my > visual.yMax) return null;
    return {
      cx: mapX(mx),
      cy: mapY(my),
      xVal: mx,
      yVal: my,
      label: visual.marker.label,
      color: visual.marker.color || '#e11d48',
    };
  }, [visual, scope]);

  const refLines = useMemo(() => {
    if (!visual.referenceLines?.length) return [];
    return visual.referenceLines
      .map((line) => {
        const val = evaluateNumericExpression(line.valueExpr, scope);
        if (val === null) return null;
        return { ...line, val };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);
  }, [visual.referenceLines, scope]);

  return (
    <div className="space-y-2">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="block w-full h-auto select-none"
        role="img"
        aria-label={`${visual.yLabel} vs ${visual.xLabel} interactive graph`}
      >
        <defs>
          <clipPath id={clipId}>
            <rect x={padL} y={padT} width={plotW} height={plotH} />
          </clipPath>
        </defs>

        <rect x={padL} y={padT} width={plotW} height={plotH} fill="#f8fafc" rx="4" />

        {/* Horizontal Grid & Y Ticks */}
        {yTicks.map((tick, idx) => {
          const py = mapY(tick);
          return (
            <g key={`y-${idx}`}>
              <line x1={padL} y1={py} x2={padL + plotW} y2={py} stroke="#e2e8f0" strokeWidth="1" />
              <text
                x={padL - 8}
                y={py + 3.5}
                textAnchor="end"
                fontSize="10.5"
                fill="#64748b"
                fontFamily="JetBrains Mono, monospace"
              >
                {formatAxisTick(tick)}
              </text>
            </g>
          );
        })}

        {/* Vertical Grid & X Ticks */}
        {xTicks.map((tick, idx) => {
          const px = mapX(tick);
          return (
            <g key={`x-${idx}`}>
              <line x1={px} y1={padT} x2={px} y2={padT + plotH} stroke="#e2e8f0" strokeWidth="1" />
              <text
                x={px}
                y={padT + plotH + 15}
                textAnchor="middle"
                fontSize="10.5"
                fill="#64748b"
                fontFamily="JetBrains Mono, monospace"
              >
                {formatAxisTick(tick)}
              </text>
            </g>
          );
        })}

        {/* Reference Lines */}
        <g clipPath={`url(#${clipId})`}>
          {refLines.map((line, idx) => {
            const color = line.color || '#94a3b8';
            if (line.axis === 'y') {
              const py = mapY(line.val);
              return (
                <g key={`ref-${idx}`}>
                  <line
                    x1={padL}
                    y1={py}
                    x2={padL + plotW}
                    y2={py}
                    stroke={color}
                    strokeWidth="1.25"
                    strokeDasharray="5 4"
                  />
                  {line.label && (
                    <text x={padL + plotW - 6} y={py - 5} textAnchor="end" fontSize="10" fill={color}>
                      {line.label}
                    </text>
                  )}
                </g>
              );
            }
            const px = mapX(line.val);
            return (
              <g key={`ref-${idx}`}>
                <line
                  x1={px}
                  y1={padT}
                  x2={px}
                  y2={padT + plotH}
                  stroke={color}
                  strokeWidth="1.25"
                  strokeDasharray="5 4"
                />
                {line.label && (
                  <text x={px + 5} y={padT + 13} textAnchor="start" fontSize="10" fill={color}>
                    {line.label}
                  </text>
                )}
              </g>
            );
          })}

          {/* Curves */}
          {curvePaths.map((curve, idx) => (
            <path
              key={`curve-${idx}`}
              d={curve.d}
              fill="none"
              stroke={curve.color}
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}

          {/* Live Marker */}
          {markerPoint && (
            <g>
              <line
                x1={markerPoint.cx}
                y1={markerPoint.cy}
                x2={markerPoint.cx}
                y2={padT + plotH}
                stroke={markerPoint.color}
                strokeOpacity="0.45"
                strokeDasharray="3 3"
              />
              <circle
                cx={markerPoint.cx}
                cy={markerPoint.cy}
                r="5.5"
                fill="#ffffff"
                stroke={markerPoint.color}
                strokeWidth="3"
              />
              {markerPoint.label && (
                <text
                  x={markerPoint.cx > padL + plotW * 0.72 ? markerPoint.cx - 10 : markerPoint.cx + 10}
                  y={markerPoint.cy < padT + 22 ? markerPoint.cy + 15 : markerPoint.cy - 9}
                  textAnchor={markerPoint.cx > padL + plotW * 0.72 ? 'end' : 'start'}
                  fontSize="11"
                  fontWeight="600"
                  fill={markerPoint.color}
                >
                  {markerPoint.label}
                </text>
              )}
            </g>
          )}
        </g>

        {/* Axes */}
        <line x1={padL} y1={padT} x2={padL} y2={padT + plotH} stroke="#94a3b8" strokeWidth="1.2" />
        <line
          x1={padL}
          y1={padT + plotH}
          x2={padL + plotW}
          y2={padT + plotH}
          stroke="#94a3b8"
          strokeWidth="1.2"
        />

        {/* Axis Labels */}
        <text
          x={padL + plotW / 2}
          y={height - 6}
          textAnchor="middle"
          fontSize="11.5"
          fontWeight="600"
          fill="#334155"
        >
          {visual.xLabel}
          {visual.xUnit ? ` (${visual.xUnit})` : ''}
        </text>
        <text
          x={14}
          y={padT + plotH / 2}
          textAnchor="middle"
          fontSize="11.5"
          fontWeight="600"
          fill="#334155"
          transform={`rotate(-90 14 ${padT + plotH / 2})`}
        >
          {visual.yLabel}
          {visual.yUnit ? ` (${visual.yUnit})` : ''}
        </text>
      </svg>

      {curvePaths.length > 1 && (
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 px-2 text-[11.5px] text-slate-600">
          {curvePaths.map((curve, idx) => (
            <span key={idx} className="inline-flex items-center gap-1.5">
              <span
                className="inline-block w-3 h-0.5 rounded-full"
                style={{ backgroundColor: curve.color }}
              />
              <span>{curve.label}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

const BarsVisual: React.FC<{
  visual: Extract<InteractiveVisual, { type: 'bars' }>;
  scope: EvalScope;
}> = ({ visual, scope }) => {
  const computedBars = visual.items.map((item, idx) => {
    const val = evaluateNumericExpression(item.valueExpr, scope) ?? 0;
    const max = item.maxExpr ? evaluateNumericExpression(item.maxExpr, scope) : null;
    const dynamicColor = item.colorExpr ? evaluateSafeExpression(item.colorExpr, scope) : null;
    const color =
      (typeof dynamicColor === 'string' && dynamicColor.trim()) ||
      item.color ||
      DEFAULT_CURVE_COLORS[idx % DEFAULT_CURVE_COLORS.length];
    return { item, val, max, color };
  });

  const fallbackMax = Math.max(1, ...computedBars.map((b) => Math.abs(b.val)));

  return (
    <div className="space-y-3 p-3.5">
      {computedBars.map(({ item, val, max, color }, idx) => {
        const denom = max && max > 0 ? max : fallbackMax;
        const pct = Math.max(0, Math.min(100, (Math.abs(val) / denom) * 100));
        return (
          <div key={idx} className="space-y-1">
            <div className="flex items-center justify-between gap-2 text-[12px]">
              <span className="font-medium text-slate-800">{item.label}</span>
              <span className="font-mono-num tabular-nums font-semibold text-slate-900">
                {Number.isInteger(val) ? val : Number(val.toFixed(2))}
                {item.unit ? ` ${item.unit}` : ''}
              </span>
            </div>
            <div className="h-2.5 w-full rounded-full overflow-hidden bg-slate-200/80">
              <div
                className="h-full rounded-full transition-[width] duration-150"
                style={{ width: `${pct}%`, backgroundColor: color }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};

const StepperControl: React.FC<{
  control: Extract<InteractiveControl, { type: 'stepper' }>;
  value: number;
  onChange: (next: number) => void;
}> = ({ control, value, onChange }) => {
  const adjust = (direction: 1 | -1, multiplier = 1) => {
    const next = roundToStep(
      value + direction * control.step * multiplier,
      control.min,
      control.max,
      control.step,
    );
    onChange(next);
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <label className="text-[12px] font-medium text-[var(--text-secondary)]">
          {control.label}
        </label>
        <span className="text-[10.5px] text-[var(--text-muted)]">↑ / ↓ keys</span>
      </div>
      <div
        className="flex items-center rounded-lg overflow-hidden"
        style={{
          backgroundColor: 'var(--bg-surface-subtle)',
          border: '1px solid var(--border-subtle)',
        }}
      >
        <button
          type="button"
          aria-label={`Decrease ${control.label}`}
          disabled={value <= control.min}
          onClick={() => adjust(-1)}
          className="px-2.5 py-2 text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)] hover:text-[var(--text-primary)] disabled:opacity-35 transition-colors"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>

        <div className="flex-1 flex items-center justify-center gap-1 px-2 min-w-0">
          <input
            type="number"
            aria-label={control.label}
            min={control.min}
            max={control.max}
            step={control.step}
            value={value}
            onChange={(event) => {
              const parsed = Number(event.target.value);
              if (Number.isFinite(parsed)) {
                onChange(roundToStep(parsed, control.min, control.max, control.step));
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
          {control.unit && (
            <span className="text-[11.5px] font-mono-num text-[var(--text-muted)] shrink-0">
              {control.unit}
            </span>
          )}
        </div>

        <div
          className="flex flex-col"
          style={{ borderLeft: '1px solid var(--border-subtle)' }}
        >
          <button
            type="button"
            aria-label={`Step up ${control.label}`}
            disabled={value >= control.max}
            onClick={() => adjust(1)}
            className="px-2 py-0.5 text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)] hover:text-[var(--text-primary)] disabled:opacity-35"
          >
            <ChevronUp className="w-3 h-3" />
          </button>
          <button
            type="button"
            aria-label={`Step down ${control.label}`}
            disabled={value <= control.min}
            onClick={() => adjust(-1)}
            className="px-2 py-0.5 text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)] hover:text-[var(--text-primary)] disabled:opacity-35"
            style={{ borderTop: '1px solid var(--border-subtle)' }}
          >
            <ChevronDown className="w-3 h-3" />
          </button>
        </div>

        <button
          type="button"
          aria-label={`Increase ${control.label}`}
          disabled={value >= control.max}
          onClick={() => adjust(1)}
          className="px-2.5 py-2 text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)] hover:text-[var(--text-primary)] disabled:opacity-35 transition-colors"
          style={{ borderLeft: '1px solid var(--border-subtle)' }}
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

export const InteractiveWidget: React.FC<InteractiveWidgetProps> = ({
  spec,
  onSendPrompt,
  busy = false,
}) => {
  const [values, setValues] = useState<ControlValues>(() => buildDefaultControlValues(spec));

  const evaluated = useMemo(() => evaluateInteractiveState(spec, values), [spec, values]);

  const setControl = (id: string, next: number | string | boolean) => {
    setValues((prev) => ({ ...prev, [id]: next }));
  };

  const resetDefaults = () => {
    setValues(buildDefaultControlValues(spec));
  };

  const stateToneStyles = {
    info: { bg: 'rgba(2, 132, 199, 0.08)', border: 'rgba(2, 132, 199, 0.25)', color: '#0284c7', Icon: Info },
    success: { bg: 'rgba(5, 150, 105, 0.09)', border: 'rgba(5, 150, 105, 0.25)', color: '#059669', Icon: CheckCircle2 },
    warning: { bg: 'rgba(217, 119, 6, 0.1)', border: 'rgba(217, 119, 6, 0.28)', color: '#d97706', Icon: AlertTriangle },
    danger: { bg: 'rgba(225, 29, 72, 0.09)', border: 'rgba(225, 29, 72, 0.26)', color: '#e11d48', Icon: AlertTriangle },
    accent: { bg: 'var(--accent-soft)', border: 'var(--accent-border)', color: 'var(--accent)', Icon: Sparkles },
  } as const;

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
        className="flex items-start justify-between gap-3 px-4 py-3"
        style={{
          backgroundColor: 'var(--bg-surface-subtle)',
          borderBottom: '1px solid var(--border-subtle)',
        }}
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[13.5px] font-semibold text-[var(--text-primary)] font-display">
            <SlidersHorizontal className="w-4 h-4 shrink-0" style={{ color: 'var(--accent)' }} />
            <span className="truncate">{spec.title}</span>
          </div>
          {spec.subtitle && (
            <p className="text-[11.5px] text-[var(--text-muted)] mt-0.5 leading-snug">
              {spec.subtitle}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={resetDefaults}
          title="Reset parameters"
          className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11.5px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] transition-colors shrink-0"
        >
          <RotateCcw className="w-3 h-3" />
          Reset
        </button>
      </div>

      {/* Live Visual Stage */}
      {spec.visual && (
        <div
          className="bg-white p-3"
          style={{ borderBottom: '1px solid var(--border-subtle)' }}
        >
          {spec.visual.type === 'svg' && evaluated.renderedSvg && (
            <SafeSvgRenderer markup={evaluated.renderedSvg} />
          )}
          {spec.visual.type === 'plot' && (
            <PlotVisual visual={spec.visual} scope={evaluated.scope} />
          )}
          {spec.visual.type === 'bars' && (
            <BarsVisual visual={spec.visual} scope={evaluated.scope} />
          )}
        </div>
      )}

      {/* Live Readout Strip */}
      {evaluated.readouts.length > 0 && (
        <div
          className="grid grid-cols-2 sm:grid-cols-3 divide-x divide-y divide-[var(--border-subtle)]"
          style={{
            backgroundColor: 'var(--bg-surface-subtle)',
            borderBottom: '1px solid var(--border-subtle)',
          }}
        >
          {evaluated.readouts.map((readout, idx) => (
            <div key={idx} className="px-3.5 py-2.5 min-w-0">
              <div className="text-[11px] font-medium text-[var(--text-muted)] truncate">
                {readout.label}
              </div>
              <div className="font-mono-num tabular-nums text-[14.5px] font-semibold text-[var(--text-primary)] mt-0.5 truncate">
                {readout.formattedValue}
                {readout.unit && (
                  <span className="text-[11.5px] font-normal text-[var(--text-muted)] ml-1">
                    {readout.unit}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Active Conditional State Callout */}
      {evaluated.activeState && (() => {
        const tone = stateToneStyles[evaluated.activeState.tone ?? 'info'];
        const StateIcon = tone.Icon;
        return (
          <div
            className="mx-4 mt-3.5 rounded-lg px-3 py-2 flex items-start gap-2.5"
            style={{ backgroundColor: tone.bg, border: `1px solid ${tone.border}` }}
          >
            <StateIcon className="w-4 h-4 shrink-0 mt-0.5" style={{ color: tone.color }} />
            <div className="min-w-0">
              <div className="text-[12.5px] font-semibold" style={{ color: tone.color }}>
                {evaluated.activeState.label}
              </div>
              {evaluated.activeState.detail && (
                <div className="text-[11.5px] text-[var(--text-secondary)] mt-0.5 leading-snug">
                  {evaluated.activeState.detail}
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* Controls Deck */}
      {spec.controls.length > 0 && (
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {spec.controls.map((ctrl) => {
            if (ctrl.type === 'segmented') {
              const currentVal = String(values[ctrl.id] ?? ctrl.default);
              return (
                <div key={ctrl.id} className="sm:col-span-2 space-y-1.5">
                  <div className="text-[12px] font-medium text-[var(--text-secondary)]">
                    {ctrl.label}
                  </div>
                  <div
                    role="radiogroup"
                    aria-label={ctrl.label}
                    className="grid gap-1 p-1 rounded-lg"
                    style={{
                      gridTemplateColumns: `repeat(${Math.min(ctrl.options.length, 4)}, minmax(0, 1fr))`,
                      backgroundColor: 'var(--bg-surface-subtle)',
                      border: '1px solid var(--border-subtle)',
                    }}
                  >
                    {ctrl.options.map((opt) => {
                      const active = opt.value === currentVal;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          role="radio"
                          aria-checked={active}
                          onClick={() => setControl(ctrl.id, opt.value)}
                          className="px-2.5 py-1.5 rounded-md text-[12px] font-medium transition-colors truncate"
                          style={{
                            backgroundColor: active ? 'var(--accent)' : 'transparent',
                            color: active ? 'var(--accent-fg)' : 'var(--text-secondary)',
                          }}
                          title={opt.label}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            }

            if (ctrl.type === 'select') {
              const currentVal = String(values[ctrl.id] ?? ctrl.default);
              return (
                <label key={ctrl.id} className="block space-y-1.5">
                  <span className="block text-[12px] font-medium text-[var(--text-secondary)]">
                    {ctrl.label}
                  </span>
                  <select
                    value={currentVal}
                    onChange={(event) => setControl(ctrl.id, event.target.value)}
                    className="w-full px-3 py-2 rounded-lg text-[12.5px] font-medium outline-none focus:ring-1 focus:ring-[var(--accent)]"
                    style={{
                      backgroundColor: 'var(--bg-surface-subtle)',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--text-primary)',
                    }}
                  >
                    {ctrl.options.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </label>
              );
            }

            if (ctrl.type === 'slider') {
              const currentNum = Number(values[ctrl.id] ?? ctrl.default);
              const decimals = stepPrecision(ctrl.step);
              return (
                <div key={ctrl.id} className="sm:col-span-2 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-[12px] font-medium text-[var(--text-secondary)]">
                      {ctrl.label}
                    </label>
                    <span className="font-mono-num tabular-nums text-[12.5px] font-semibold text-[var(--text-primary)]">
                      {decimals > 0 ? currentNum.toFixed(decimals) : currentNum}
                      {ctrl.unit ? ` ${ctrl.unit}` : ''}
                    </span>
                  </div>
                  <input
                    type="range"
                    aria-label={ctrl.label}
                    min={ctrl.min}
                    max={ctrl.max}
                    step={ctrl.step}
                    value={currentNum}
                    onChange={(event) => setControl(ctrl.id, Number(event.target.value))}
                    className="w-full h-1.5 rounded-lg cursor-pointer accent-[var(--accent)]"
                  />
                  <div className="flex items-center justify-between text-[11px] font-mono-num tabular-nums text-[var(--text-muted)]">
                    <span>
                      {ctrl.minLabel ?? `${ctrl.min}${ctrl.unit ? ` ${ctrl.unit}` : ''}`}
                    </span>
                    <span>
                      {ctrl.maxLabel ?? `${ctrl.max}${ctrl.unit ? ` ${ctrl.unit}` : ''}`}
                    </span>
                  </div>
                </div>
              );
            }

            if (ctrl.type === 'stepper') {
              const currentNum = Number(values[ctrl.id] ?? ctrl.default);
              return (
                <StepperControl
                  key={ctrl.id}
                  control={ctrl}
                  value={currentNum}
                  onChange={(next) => setControl(ctrl.id, next)}
                />
              );
            }

            if (ctrl.type === 'toggle') {
              const checked = Boolean(values[ctrl.id] ?? ctrl.default);
              return (
                <div
                  key={ctrl.id}
                  className="sm:col-span-2 flex items-center justify-between gap-3 py-1"
                >
                  <div className="min-w-0">
                    <div className="text-[12.5px] font-medium text-[var(--text-primary)]">
                      {ctrl.label}
                    </div>
                    {ctrl.description && (
                      <div className="text-[11.5px] text-[var(--text-muted)]">
                        {ctrl.description}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={checked}
                    aria-label={ctrl.label}
                    onClick={() => setControl(ctrl.id, !checked)}
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

            return null;
          })}
        </div>
      )}

      {/* Footer CTA to continue conversation with live parameters */}
      {onSendPrompt && (
        <div
          className="px-4 py-2.5 flex items-center justify-between gap-3"
          style={{
            backgroundColor: 'var(--bg-surface-subtle)',
            borderTop: '1px solid var(--border-subtle)',
          }}
        >
          <span className="text-[11.5px] text-[var(--text-muted)]">
            Adjust any control above, then continue with Pip
          </span>
          <button
            type="button"
            disabled={busy}
            onClick={() => onSendPrompt(formatInteractiveFollowUp(spec, values, evaluated))}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-opacity hover:opacity-95 disabled:opacity-50 whitespace-nowrap shrink-0"
            style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' }}
          >
            <Send className="w-3.5 h-3.5" />
            Ask Pip about this
          </button>
        </div>
      )}
    </section>
  );
};
