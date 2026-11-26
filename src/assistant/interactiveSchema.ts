import {
  evaluateNumericExpression,
  evaluateSafeExpression,
  interpolateTemplate,
  type EvalPrimitive,
  type EvalRecord,
  type EvalScope,
} from './safeMath';

/* -------------------------------------------------------------------------- */
/*  1. Universal Interactive Simulator / Explorer Schema (`pip-interactive`)  */
/* -------------------------------------------------------------------------- */

export interface InteractiveSelectOption {
  value: string;
  label: string;
  description?: string;
  props?: Record<string, EvalPrimitive>;
}

export type InteractiveControl =
  | {
      id: string;
      type: 'slider';
      label: string;
      min: number;
      max: number;
      step: number;
      default: number;
      unit?: string;
      minLabel?: string;
      maxLabel?: string;
    }
  | {
      id: string;
      type: 'stepper';
      label: string;
      min: number;
      max: number;
      step: number;
      default: number;
      unit?: string;
    }
  | {
      id: string;
      type: 'select';
      label: string;
      default: string;
      options: InteractiveSelectOption[];
    }
  | {
      id: string;
      type: 'segmented';
      label: string;
      default: string;
      options: InteractiveSelectOption[];
    }
  | {
      id: string;
      type: 'toggle';
      label: string;
      default: boolean;
      description?: string;
    };

export interface InteractiveComputeItem {
  id: string;
  expr: string;
}

export interface InteractiveReadout {
  label: string;
  expr: string;
  unit?: string;
  precision?: number;
  toneExpr?: string;
}

export interface InteractiveStateCallout {
  when: string;
  label: string;
  detail?: string;
  tone?: 'info' | 'success' | 'warning' | 'danger' | 'accent';
}

export interface PlotCurveSpec {
  label: string;
  expr: string;
  color?: string;
}

export interface PlotReferenceLineSpec {
  axis: 'x' | 'y';
  valueExpr: string;
  label?: string;
  color?: string;
}

export interface BarItemSpec {
  label: string;
  valueExpr: string;
  maxExpr?: string;
  unit?: string;
  color?: string;
  colorExpr?: string;
}

export type InteractiveVisual =
  | {
      type: 'svg';
      template: string;
    }
  | {
      type: 'plot';
      xLabel: string;
      yLabel: string;
      xMin: number;
      xMax: number;
      yMin: number;
      yMax: number;
      xUnit?: string;
      yUnit?: string;
      curves: PlotCurveSpec[];
      marker?: {
        xExpr: string;
        yExpr: string;
        label?: string;
        color?: string;
      };
      referenceLines?: PlotReferenceLineSpec[];
    }
  | {
      type: 'bars';
      items: BarItemSpec[];
    };

export interface InteractiveSpec {
  title: string;
  subtitle?: string;
  controls: InteractiveControl[];
  compute: InteractiveComputeItem[];
  readouts: InteractiveReadout[];
  states: InteractiveStateCallout[];
  visual?: InteractiveVisual;
  askPrompt?: string;
}

/* -------------------------------------------------------------------------- */
/*  2. ChatGPT-style Interactive Clarification & Prompt Options (`pip-prompt`)*/
/* -------------------------------------------------------------------------- */

export interface PromptChoiceOption {
  value: string;
  label: string;
  description?: string;
}

export type PromptField =
  | {
      id: string;
      type: 'choice';
      label: string;
      options: PromptChoiceOption[];
      default?: string;
    }
  | {
      id: string;
      type: 'multi';
      label: string;
      options: PromptChoiceOption[];
      default?: string[];
    }
  | {
      id: string;
      type: 'select';
      label: string;
      options: PromptChoiceOption[];
      default?: string;
    }
  | {
      id: string;
      type: 'slider';
      label: string;
      min: number;
      max: number;
      step: number;
      default: number;
      unit?: string;
    }
  | {
      id: string;
      type: 'stepper';
      label: string;
      min: number;
      max: number;
      step: number;
      default: number;
      unit?: string;
    }
  | {
      id: string;
      type: 'toggle';
      label: string;
      description?: string;
      default: boolean;
    }
  | {
      id: string;
      type: 'text';
      label: string;
      placeholder?: string;
      default?: string;
    };

export interface PromptOptionsSpec {
  title: string;
  description?: string;
  submitLabel?: string;
  allowSkip?: boolean;
  fields: PromptField[];
}

/* -------------------------------------------------------------------------- */
/*  3. Strict Runtime Parsers & Validators                                    */
/* -------------------------------------------------------------------------- */

const IDENTIFIER_RE = /^[A-Za-z_][A-Za-z0-9_]{0,40}$/;

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function cleanStr(v: unknown, maxLen = 180): string {
  return typeof v === 'string' ? v.trim().slice(0, maxLen) : '';
}

function cleanNum(v: unknown, fallback: number): number {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function parsePropsRecord(raw: unknown): Record<string, EvalPrimitive> | undefined {
  if (!isRecord(raw)) return undefined;
  const out: Record<string, EvalPrimitive> = {};
  let count = 0;
  for (const [k, v] of Object.entries(raw)) {
    if (count >= 12) break;
    if (!IDENTIFIER_RE.test(k)) continue;
    if (typeof v === 'number' && Number.isFinite(v)) {
      out[k] = v;
      count++;
    } else if (typeof v === 'string' || typeof v === 'boolean') {
      out[k] = typeof v === 'string' ? v.slice(0, 80) : v;
      count++;
    }
  }
  return count > 0 ? out : undefined;
}

function parseSelectOptions(raw: unknown): InteractiveSelectOption[] {
  if (!Array.isArray(raw)) return [];
  const options: InteractiveSelectOption[] = [];
  for (const item of raw.slice(0, 24)) {
    if (typeof item === 'string') {
      const s = item.trim().slice(0, 100);
      if (s) options.push({ value: s, label: s });
      continue;
    }
    if (!isRecord(item)) continue;
    const value = cleanStr(item.value ?? item.id ?? item.label, 80);
    const label = cleanStr(item.label ?? item.value, 120);
    if (!value || !label) continue;
    const description = cleanStr(item.description, 160) || undefined;
    const props = parsePropsRecord(item.props);
    options.push({ value, label, description, props });
  }
  return options;
}

function stripJsonFences(raw: string): string {
  return raw
    .trim()
    .replace(/^```(?:json|pip-interactive|interactive|pip-prompt|pip-options|pip-clarify)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
}

export function parseInteractiveSpec(rawJson: string): InteractiveSpec | null {
  if (!rawJson || rawJson.length > 60_000) return null;
  let data: unknown;
  try {
    data = JSON.parse(stripJsonFences(rawJson));
  } catch {
    return null;
  }
  if (!isRecord(data)) return null;

  const title = cleanStr(data.title, 120) || 'Interactive Explorer';
  const subtitle = cleanStr(data.subtitle ?? data.description, 220) || undefined;

  const controls: InteractiveControl[] = [];
  if (Array.isArray(data.controls)) {
    for (const rawCtrl of data.controls.slice(0, 16)) {
      if (!isRecord(rawCtrl)) continue;
      const id = cleanStr(rawCtrl.id, 40);
      const label = cleanStr(rawCtrl.label, 100);
      const type = cleanStr(rawCtrl.type, 20).toLowerCase();
      if (!IDENTIFIER_RE.test(id) || !label) continue;

      if (type === 'slider' || type === 'stepper' || type === 'number') {
        const min = cleanNum(rawCtrl.min, 0);
        const max = cleanNum(rawCtrl.max, min + 100);
        if (max <= min) continue;
        const step = Math.max(0.0001, Math.abs(cleanNum(rawCtrl.step, (max - min) / 100 || 1)));
        const defVal = Math.min(max, Math.max(min, cleanNum(rawCtrl.default ?? rawCtrl.value, min)));
        const unit = cleanStr(rawCtrl.unit, 24) || undefined;
        if (type === 'slider') {
          controls.push({
            id,
            type: 'slider',
            label,
            min,
            max,
            step,
            default: defVal,
            unit,
            minLabel: cleanStr(rawCtrl.minLabel, 40) || undefined,
            maxLabel: cleanStr(rawCtrl.maxLabel, 40) || undefined,
          });
        } else {
          controls.push({
            id,
            type: 'stepper',
            label,
            min,
            max,
            step,
            default: defVal,
            unit,
          });
        }
      } else if (type === 'select' || type === 'dropdown' || type === 'segmented' || type === 'radio') {
        const options = parseSelectOptions(rawCtrl.options);
        if (options.length < 2) continue;
        const requestedDefault = cleanStr(rawCtrl.default ?? rawCtrl.value, 80);
        const def = options.some((o) => o.value === requestedDefault)
          ? requestedDefault
          : options[0].value;
        controls.push({
          id,
          type: type === 'segmented' || type === 'radio' ? 'segmented' : 'select',
          label,
          default: def,
          options,
        });
      } else if (type === 'toggle' || type === 'boolean' || type === 'switch') {
        controls.push({
          id,
          type: 'toggle',
          label,
          default: Boolean(rawCtrl.default ?? rawCtrl.value),
          description: cleanStr(rawCtrl.description, 160) || undefined,
        });
      }
    }
  }

  const compute: InteractiveComputeItem[] = [];
  if (Array.isArray(data.compute)) {
    for (const item of data.compute.slice(0, 24)) {
      if (!isRecord(item)) continue;
      const id = cleanStr(item.id, 40);
      const expr = cleanStr(item.expr ?? item.formula, 500);
      if (IDENTIFIER_RE.test(id) && expr) {
        compute.push({ id, expr });
      }
    }
  }

  const readouts: InteractiveReadout[] = [];
  if (Array.isArray(data.readouts)) {
    for (const item of data.readouts.slice(0, 12)) {
      if (!isRecord(item)) continue;
      const label = cleanStr(item.label, 80);
      const expr = cleanStr(item.expr ?? item.value, 400);
      if (!label || !expr) continue;
      const precision =
        typeof item.precision === 'number' && Number.isFinite(item.precision)
          ? Math.max(0, Math.min(6, Math.round(item.precision)))
          : undefined;
      readouts.push({
        label,
        expr,
        unit: cleanStr(item.unit, 24) || undefined,
        precision,
        toneExpr: cleanStr(item.toneExpr, 240) || undefined,
      });
    }
  }

  const states: InteractiveStateCallout[] = [];
  if (Array.isArray(data.states)) {
    for (const item of data.states.slice(0, 10)) {
      if (!isRecord(item)) continue;
      const when = cleanStr(item.when, 300);
      const label = cleanStr(item.label, 120);
      if (!when || !label) continue;
      const rawTone = cleanStr(item.tone, 20);
      const tone =
        rawTone === 'info' ||
        rawTone === 'success' ||
        rawTone === 'warning' ||
        rawTone === 'danger' ||
        rawTone === 'accent'
          ? rawTone
          : 'info';
      states.push({
        when,
        label,
        detail: cleanStr(item.detail, 220) || undefined,
        tone,
      });
    }
  }

  let visual: InteractiveVisual | undefined;
  if (isRecord(data.visual)) {
    const vType = cleanStr(data.visual.type, 20).toLowerCase();
    if (vType === 'svg') {
      const template = typeof data.visual.template === 'string' ? data.visual.template.trim() : '';
      if (template && template.length <= 45_000 && /<svg[\s>]/i.test(template)) {
        visual = { type: 'svg', template };
      }
    } else if (vType === 'plot' || vType === 'graph' || vType === 'chart') {
      const xMin = cleanNum(data.visual.xMin, 0);
      const xMax = cleanNum(data.visual.xMax, 10);
      const yMin = cleanNum(data.visual.yMin, 0);
      const yMax = cleanNum(data.visual.yMax, 10);
      const curves: PlotCurveSpec[] = [];
      if (Array.isArray(data.visual.curves)) {
        for (const c of data.visual.curves.slice(0, 6)) {
          if (!isRecord(c)) continue;
          const expr = cleanStr(c.expr, 400);
          const label = cleanStr(c.label, 80) || `Curve ${curves.length + 1}`;
          if (!expr) continue;
          curves.push({ label, expr, color: cleanStr(c.color, 32) || undefined });
        }
      }
      if (xMax > xMin && yMax > yMin && curves.length > 0) {
        let marker: InteractiveVisual extends { type: 'plot' } ? never : undefined;
        let parsedMarker:
          | { xExpr: string; yExpr: string; label?: string; color?: string }
          | undefined;
        if (isRecord(data.visual.marker)) {
          const xExpr = cleanStr(data.visual.marker.xExpr, 240);
          const yExpr = cleanStr(data.visual.marker.yExpr, 240);
          if (xExpr && yExpr) {
            parsedMarker = {
              xExpr,
              yExpr,
              label: cleanStr(data.visual.marker.label, 60) || undefined,
              color: cleanStr(data.visual.marker.color, 32) || undefined,
            };
          }
        }
        const referenceLines: PlotReferenceLineSpec[] = [];
        if (Array.isArray(data.visual.referenceLines)) {
          for (const ref of data.visual.referenceLines.slice(0, 6)) {
            if (!isRecord(ref)) continue;
            const axis = ref.axis === 'x' ? 'x' : ref.axis === 'y' ? 'y' : null;
            const valueExpr = cleanStr(ref.valueExpr, 240);
            if (!axis || !valueExpr) continue;
            referenceLines.push({
              axis,
              valueExpr,
              label: cleanStr(ref.label, 60) || undefined,
              color: cleanStr(ref.color, 32) || undefined,
            });
          }
        }
        void marker;
        visual = {
          type: 'plot',
          xLabel: cleanStr(data.visual.xLabel, 60) || 'x',
          yLabel: cleanStr(data.visual.yLabel, 60) || 'y',
          xMin,
          xMax,
          yMin,
          yMax,
          xUnit: cleanStr(data.visual.xUnit, 20) || undefined,
          yUnit: cleanStr(data.visual.yUnit, 20) || undefined,
          curves,
          marker: parsedMarker,
          referenceLines: referenceLines.length ? referenceLines : undefined,
        };
      }
    } else if (vType === 'bars' || vType === 'meters') {
      const items: BarItemSpec[] = [];
      if (Array.isArray(data.visual.items)) {
        for (const bar of data.visual.items.slice(0, 8)) {
          if (!isRecord(bar)) continue;
          const label = cleanStr(bar.label, 80);
          const valueExpr = cleanStr(bar.valueExpr, 240);
          if (!label || !valueExpr) continue;
          items.push({
            label,
            valueExpr,
            maxExpr: cleanStr(bar.maxExpr, 240) || undefined,
            unit: cleanStr(bar.unit, 24) || undefined,
            color: cleanStr(bar.color, 32) || undefined,
            colorExpr: cleanStr(bar.colorExpr, 240) || undefined,
          });
        }
      }
      if (items.length > 0) {
        visual = { type: 'bars', items };
      }
    }
  }

  if (controls.length === 0 && readouts.length === 0 && !visual) return null;

  return {
    title,
    subtitle,
    controls,
    compute,
    readouts,
    states,
    visual,
    askPrompt: cleanStr(data.askPrompt, 240) || undefined,
  };
}

export function parsePromptSpec(rawJson: string): PromptOptionsSpec | null {
  if (!rawJson || rawJson.length > 30_000) return null;
  let data: unknown;
  try {
    data = JSON.parse(stripJsonFences(rawJson));
  } catch {
    return null;
  }
  if (!isRecord(data)) return null;

  const title = cleanStr(data.title ?? data.question, 160) || 'Choose how to continue';
  const description = cleanStr(data.description ?? data.subtitle, 260) || undefined;
  const submitLabel = cleanStr(data.submitLabel, 48) || undefined;
  const allowSkip = data.allowSkip !== false;

  const fields: PromptField[] = [];
  const rawFields = Array.isArray(data.fields)
    ? data.fields
    : Array.isArray(data.questions)
      ? data.questions
      : Array.isArray(data.options)
        ? [{ id: 'choice', type: 'choice', label: title, options: data.options }]
        : [];

  for (const rawField of rawFields.slice(0, 10)) {
    if (!isRecord(rawField)) continue;
    const id = cleanStr(rawField.id, 40) || `field_${fields.length + 1}`;
    const label = cleanStr(rawField.label ?? rawField.question, 140);
    const type = cleanStr(rawField.type, 20).toLowerCase() || 'choice';
    if (!label) continue;

    if (type === 'choice' || type === 'radio' || type === 'single' || type === 'select' || type === 'dropdown') {
      const options = parseSelectOptions(rawField.options).map(({ value, label: optLabel, description: optDesc }) => ({
        value,
        label: optLabel,
        description: optDesc,
      }));
      if (options.length < 2) continue;
      const requestedDefault = cleanStr(rawField.default ?? rawField.value, 80);
      const validDefault = options.some((o) => o.value === requestedDefault)
        ? requestedDefault
        : undefined;
      fields.push({
        id,
        type: type === 'select' || type === 'dropdown' ? 'select' : 'choice',
        label,
        options,
        default: validDefault,
      });
    } else if (type === 'multi' || type === 'checkbox' || type === 'multiselect') {
      const options = parseSelectOptions(rawField.options).map(({ value, label: optLabel, description: optDesc }) => ({
        value,
        label: optLabel,
        description: optDesc,
      }));
      if (options.length < 2) continue;
      const validSet = new Set(options.map((o) => o.value));
      const defList = Array.isArray(rawField.default)
        ? rawField.default.filter((v): v is string => typeof v === 'string' && validSet.has(v))
        : [];
      fields.push({
        id,
        type: 'multi',
        label,
        options,
        default: defList,
      });
    } else if (type === 'slider' || type === 'stepper' || type === 'number') {
      const min = cleanNum(rawField.min, 0);
      const max = cleanNum(rawField.max, min + 100);
      if (max <= min) continue;
      const step = Math.max(0.0001, Math.abs(cleanNum(rawField.step, 1)));
      const defVal = Math.min(max, Math.max(min, cleanNum(rawField.default ?? rawField.value, min)));
      fields.push({
        id,
        type: type === 'slider' ? 'slider' : 'stepper',
        label,
        min,
        max,
        step,
        default: defVal,
        unit: cleanStr(rawField.unit, 24) || undefined,
      });
    } else if (type === 'toggle' || type === 'boolean' || type === 'switch') {
      fields.push({
        id,
        type: 'toggle',
        label,
        description: cleanStr(rawField.description, 160) || undefined,
        default: Boolean(rawField.default ?? rawField.value),
      });
    } else if (type === 'text' || type === 'input') {
      fields.push({
        id,
        type: 'text',
        label,
        placeholder: cleanStr(rawField.placeholder, 120) || undefined,
        default: cleanStr(rawField.default ?? rawField.value, 240) || '',
      });
    }
  }

  if (fields.length === 0) return null;

  return {
    title,
    description,
    submitLabel,
    allowSkip,
    fields,
  };
}

/* -------------------------------------------------------------------------- */
/*  4. Interactive State Evaluation & Prompt Formatting Helpers               */
/* -------------------------------------------------------------------------- */

export type ControlValues = Record<string, EvalPrimitive>;

export function buildDefaultControlValues(spec: InteractiveSpec): ControlValues {
  const values: ControlValues = {};
  for (const ctrl of spec.controls) {
    values[ctrl.id] = ctrl.default;
  }
  return values;
}

export interface EvaluatedReadout {
  label: string;
  formattedValue: string;
  rawValue: EvalPrimitive | null;
  unit?: string;
}

export interface EvaluatedInteractiveState {
  scope: EvalScope;
  readouts: EvaluatedReadout[];
  activeState: InteractiveStateCallout | null;
  renderedSvg: string | null;
}

export function evaluateInteractiveState(
  spec: InteractiveSpec,
  values: ControlValues,
): EvaluatedInteractiveState {
  const scope: EvalScope = {};

  for (const ctrl of spec.controls) {
    const current = values[ctrl.id] ?? ctrl.default;
    if (ctrl.type === 'select' || ctrl.type === 'segmented') {
      const selected =
        ctrl.options.find((opt) => opt.value === String(current)) ?? ctrl.options[0];
      if (selected?.props) {
        const rec: EvalRecord = {
          value: selected.value,
          label: selected.label,
          ...selected.props,
        };
        scope[ctrl.id] = rec;
      } else {
        scope[ctrl.id] = selected?.value ?? String(current);
      }
    } else if (ctrl.type === 'toggle') {
      scope[ctrl.id] = Boolean(current) ? 1 : 0;
    } else {
      scope[ctrl.id] = typeof current === 'number' ? current : Number(current) || 0;
    }
  }

  for (const item of spec.compute) {
    const computed = evaluateSafeExpression(item.expr, scope);
    scope[item.id] = computed ?? 0;
  }

  const readouts: EvaluatedReadout[] = spec.readouts.map((r) => {
    const val = evaluateSafeExpression(r.expr, scope);
    let formattedValue = '—';
    if (typeof val === 'number' && Number.isFinite(val)) {
      formattedValue =
        r.precision !== undefined
          ? val.toFixed(r.precision)
          : Number.isInteger(val)
            ? String(val)
            : Number(val.toFixed(2)).toString();
    } else if (typeof val === 'string' && val.trim()) {
      formattedValue = val;
    } else if (typeof val === 'boolean') {
      formattedValue = val ? 'Yes' : 'No';
    }
    return {
      label: r.label,
      formattedValue,
      rawValue: val,
      unit: r.unit,
    };
  });

  let activeState: InteractiveStateCallout | null = null;
  for (const st of spec.states) {
    const matched = evaluateSafeExpression(st.when, scope);
    if (matched === true || (typeof matched === 'number' && matched !== 0)) {
      activeState = {
        ...st,
        label: interpolateTemplate(st.label, scope),
        detail: st.detail ? interpolateTemplate(st.detail, scope) : undefined,
      };
      break;
    }
  }

  const renderedSvg =
    spec.visual?.type === 'svg' ? interpolateTemplate(spec.visual.template, scope) : null;

  return { scope, readouts, activeState, renderedSvg };
}

export function samplePlotCurve(
  expr: string,
  xMin: number,
  xMax: number,
  baseScope: EvalScope,
  steps = 120,
): { x: number; y: number }[] {
  const count = Math.max(16, Math.min(140, steps));
  const points: { x: number; y: number }[] = [];
  const span = xMax - xMin;
  if (span <= 0) return points;

  for (let i = 0; i <= count; i++) {
    const x = xMin + (span * i) / count;
    const y = evaluateNumericExpression(expr, { ...baseScope, x });
    if (y !== null && Number.isFinite(y)) {
      points.push({ x, y });
    }
  }
  return points;
}

export function formatInteractiveFollowUp(
  spec: InteractiveSpec,
  values: ControlValues,
  evaluated: EvaluatedInteractiveState,
): string {
  const paramLines = spec.controls.map((ctrl) => {
    const v = values[ctrl.id] ?? ctrl.default;
    if (ctrl.type === 'select' || ctrl.type === 'segmented') {
      const opt = ctrl.options.find((o) => o.value === String(v));
      return `${ctrl.label}: ${opt?.label ?? String(v)}`;
    }
    if (ctrl.type === 'toggle') {
      return `${ctrl.label}: ${v ? 'On' : 'Off'}`;
    }
    return `${ctrl.label}: ${v}${ctrl.unit ? ` ${ctrl.unit}` : ''}`;
  });

  const readoutLines = evaluated.readouts.map(
    (r) => `${r.label}: ${r.formattedValue}${r.unit ? ` ${r.unit}` : ''}`,
  );

  const prefix = spec.askPrompt || `Explain what is happening in "${spec.title}" with these settings:`;
  const parts = [prefix, `- Parameters: ${paramLines.join(', ')}`];
  if (readoutLines.length > 0) {
    parts.push(`- Results: ${readoutLines.join(', ')}`);
  }
  if (evaluated.activeState) {
    parts.push(`- State: ${evaluated.activeState.label}`);
  }
  return parts.join('\n');
}

export function formatPromptResponse(
  spec: PromptOptionsSpec,
  answers: Record<string, string | string[] | number | boolean>,
): string {
  const lines: string[] = [];
  for (const field of spec.fields) {
    const val = answers[field.id];
    if (field.type === 'choice' || field.type === 'select') {
      if (typeof val === 'string' && val) {
        const opt = field.options.find((o) => o.value === val);
        lines.push(`${field.label}: ${opt?.label ?? val}`);
      }
    } else if (field.type === 'multi') {
      if (Array.isArray(val) && val.length > 0) {
        const labels = val.map((v) => field.options.find((o) => o.value === v)?.label ?? v);
        lines.push(`${field.label}: ${labels.join(', ')}`);
      }
    } else if (field.type === 'slider' || field.type === 'stepper') {
      if (typeof val === 'number' && Number.isFinite(val)) {
        lines.push(`${field.label}: ${val}${field.unit ? ` ${field.unit}` : ''}`);
      }
    } else if (field.type === 'toggle') {
      lines.push(`${field.label}: ${val ? 'Yes' : 'No'}`);
    } else if (field.type === 'text') {
      if (typeof val === 'string' && val.trim()) {
        lines.push(`${field.label}: ${val.trim()}`);
      }
    }
  }

  if (lines.length === 0) return 'Please go ahead with your recommended defaults.';
  if (spec.fields.length === 1 && spec.fields[0].type === 'choice') {
    const onlyVal = answers[spec.fields[0].id];
    const opt = spec.fields[0].options.find((o) => o.value === onlyVal);
    return opt?.label ?? lines[0];
  }
  return lines.join('\n');
}
