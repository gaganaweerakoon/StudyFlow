import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildDefaultControlValues,
  evaluateInteractiveState,
  formatInteractiveFollowUp,
  formatPromptResponse,
  parseInteractiveSpec,
  parsePromptSpec,
  samplePlotCurve,
} from './interactiveSchema';
import { evaluateNumericExpression, evaluateSafeExpression, interpolateTemplate } from './safeMath';

test('safeMath evaluates arithmetic, functions, scientific notation, ternaries, and safe object props', () => {
  assert.equal(evaluateNumericExpression('2 + 3 * 4', {}), 14);
  assert.equal(evaluateNumericExpression('2 ^ 3 ^ 2', {}), 512);
  assert.equal(evaluateNumericExpression('1.8e-5 * 100000', {}), 1.8);
  assert.equal(
    evaluateSafeExpression('mode == "base" ? "#f43f5e" : "#38bdf8"', { mode: 'base' }),
    '#f43f5e',
  );
  assert.equal(
    evaluateNumericExpression('round((v0^2 * sin(rad(2 * angle))) / planet.g, 2)', {
      v0: 20,
      angle: 45,
      planet: { value: 'earth', g: 9.81 },
    }),
    40.77,
  );
});

test('safeMath blocks prototype pollution keys and unknown function calls', () => {
  assert.equal(evaluateSafeExpression('obj.__proto__', { obj: { a: 1 } }), 0);
  assert.equal(evaluateSafeExpression('obj.constructor', { obj: { a: 1 } }), 0);
  assert.equal(evaluateSafeExpression('alert(1)', {}), null);
  assert.equal(evaluateSafeExpression('eval("1+1")', {}), null);
});

test('universal pip-interactive engine runs a Physics projectile motion simulation with plot and presets', () => {
  const raw = JSON.stringify({
    title: 'Projectile Motion Explorer',
    subtitle: 'Adjust launch velocity, angle, and planet gravity',
    controls: [
      {
        id: 'planet',
        type: 'select',
        label: 'Environment',
        default: 'earth',
        options: [
          { value: 'earth', label: 'Earth (9.81 m/s²)', props: { g: 9.81 } },
          { value: 'moon', label: 'Moon (1.62 m/s²)', props: { g: 1.62 } },
        ],
      },
      { id: 'v0', type: 'stepper', label: 'Launch speed', min: 1, max: 100, step: 1, default: 20, unit: 'm/s' },
      { id: 'angle', type: 'slider', label: 'Launch angle', min: 5, max: 85, step: 1, default: 45, unit: '°' },
    ],
    compute: [
      { id: 'theta', expr: 'rad(angle)' },
      { id: 'vx', expr: 'v0 * cos(theta)' },
      { id: 'vy', expr: 'v0 * sin(theta)' },
      { id: 'flightTime', expr: '(2 * vy) / planet.g' },
      { id: 'range', expr: 'vx * flightTime' },
      { id: 'maxHeight', expr: '(vy ^ 2) / (2 * planet.g)' },
    ],
    readouts: [
      { label: 'Range', expr: 'range', unit: 'm', precision: 2 },
      { label: 'Max Height', expr: 'maxHeight', unit: 'm', precision: 2 },
    ],
    states: [
      { when: 'angle == 45', label: 'Optimal Range Angle', detail: '45° maximizes horizontal range on flat ground.', tone: 'success' },
    ],
    visual: {
      type: 'plot',
      xLabel: 'Distance',
      yLabel: 'Height',
      xMin: 0,
      xMax: 50,
      yMin: 0,
      yMax: 25,
      xUnit: 'm',
      yUnit: 'm',
      curves: [
        { label: 'Trajectory', expr: 'x * tan(theta) - (planet.g * x^2) / (2 * vx^2)' },
      ],
      marker: { xExpr: 'range / 2', yExpr: 'maxHeight', label: 'Apex' },
    },
  });

  const spec = parseInteractiveSpec(raw);
  assert.ok(spec);
  const defaults = buildDefaultControlValues(spec);
  const earthState = evaluateInteractiveState(spec, defaults);
  assert.equal(earthState.readouts[0]?.formattedValue, '40.77');
  assert.equal(earthState.readouts[1]?.formattedValue, '10.19');
  assert.equal(earthState.activeState?.label, 'Optimal Range Angle');

  // Switch to Moon gravity and verify dynamic recomputation
  const moonState = evaluateInteractiveState(spec, { ...defaults, planet: 'moon' });
  assert.ok(Number(moonState.readouts[0]?.formattedValue) > 240);

  // Verify curve sampling
  assert.equal(spec.visual?.type, 'plot');
  const pts = samplePlotCurve(spec.visual.curves[0].expr, 0, 40.77, earthState.scope, 20);
  assert.equal(pts.length, 21);
  assert.ok(Math.abs(pts[10].y - 10.19) < 0.25);

  const followUp = formatInteractiveFollowUp(spec, defaults, earthState);
  assert.match(followUp, /Projectile Motion Explorer/);
  assert.match(followUp, /Range: 40\.77 m/);
});

test('universal pip-interactive engine supports reactive SVG templates for Chemistry or any visual model', () => {
  const raw = JSON.stringify({
    title: 'Neutralization Explorer',
    controls: [
      {
        id: 'mode',
        type: 'segmented',
        label: 'Direction',
        default: 'base_to_acid',
        options: [
          { value: 'base_to_acid', label: 'Add Base to Acid' },
          { value: 'acid_to_base', label: 'Add Acid to Base' },
        ],
      },
      { id: 'moles', type: 'stepper', label: 'Titrant Moles', min: 0, max: 0.2, step: 0.01, default: 0.12, unit: 'mol' },
    ],
    compute: [
      { id: 'excess', expr: 'moles - 0.1' },
      { id: 'isBasic', expr: 'mode == "base_to_acid" ? excess > 0 : excess < 0' },
    ],
    readouts: [{ label: 'Excess', expr: 'excess', unit: 'mol', precision: 2 }],
    states: [
      { when: 'isBasic', label: 'Basic Region', tone: 'danger' },
      { when: '!isBasic', label: 'Acidic / Neutral', tone: 'info' },
    ],
    visual: {
      type: 'svg',
      template:
        '<svg viewBox="0 0 200 100"><rect x="10" y="10" width="180" height="80" fill="{{isBasic ? \'#f43f5e\' : \'#38bdf8\'}}"/><text x="100" y="55">{{round(moles, 2)}} mol</text></svg>',
    },
  });

  const spec = parseInteractiveSpec(raw);
  assert.ok(spec);
  const state = evaluateInteractiveState(spec, buildDefaultControlValues(spec));
  assert.equal(state.activeState?.label, 'Basic Region');
  assert.match(state.renderedSvg ?? '', /fill="#f43f5e"/);
  assert.match(state.renderedSvg ?? '', /0\.12 mol/);

  const reversed = evaluateInteractiveState(spec, { mode: 'acid_to_base', moles: 0.12 });
  assert.equal(reversed.activeState?.label, 'Acidic / Neutral');
  assert.match(reversed.renderedSvg ?? '', /fill="#38bdf8"/);
});

test('pip-prompt parser validates multi-field clarification prompts and formats answers cleanly', () => {
  const raw = JSON.stringify({
    title: 'Configure your problem',
    description: 'Pick what you want Pip to focus on next.',
    fields: [
      {
        id: 'topic',
        type: 'choice',
        label: 'Focus area',
        options: [
          { value: 'kinematics', label: 'Kinematics equations', description: 'Velocity, acceleration, displacement' },
          { value: 'forces', label: 'Newton’s laws & forces', description: 'Free-body diagrams and friction' },
        ],
      },
      {
        id: 'mass',
        type: 'stepper',
        label: 'Object mass',
        min: 1,
        max: 50,
        step: 0.5,
        default: 5,
        unit: 'kg',
      },
      {
        id: 'extras',
        type: 'multi',
        label: 'Include',
        options: [
          { value: 'graph', label: 'Interactive graph' },
          { value: 'quiz', label: 'Quick check question' },
        ],
      },
    ],
  });

  const spec = parsePromptSpec(raw);
  assert.ok(spec);
  assert.equal(spec.fields.length, 3);

  const formatted = formatPromptResponse(spec, {
    topic: 'forces',
    mass: 7.5,
    extras: ['graph', 'quiz'],
  });
  assert.match(formatted, /Focus area: Newton’s laws & forces/);
  assert.match(formatted, /Object mass: 7\.5 kg/);
  assert.match(formatted, /Include: Interactive graph, Quick check question/);

  assert.equal(interpolateTemplate('v = {{v}} m/s', { v: 12.5 }), 'v = 12.5 m/s');
});
