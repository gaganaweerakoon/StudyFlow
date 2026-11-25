import test from 'node:test';
import assert from 'node:assert/strict';
import { checkMathEquivalence, runMathSolver } from './playgroundRunners';

test('runMathSolver evaluates expressions, derivatives, simplifications, and definite integrals accurately', () => {
  const ev = runMathSolver('2^10 + sqrt(144)', 'evaluate', { expected: '1036' });
  assert.equal(ev.ok, true);
  assert.equal(ev.outputText, '1036');
  assert.equal(ev.equivalent, true);

  const deriv = runMathSolver('x^3 * y^2 + sin(2*x) - 4*x*y', 'derivative', {
    variable: 'x',
    expected: '3*x^2*y^2 + 2*cos(2*x) - 4*y',
  });
  assert.equal(deriv.ok, true);
  assert.equal(deriv.equivalent, true);
  assert.ok(deriv.latexOutput);

  const simp = runMathSolver('2*x + 3*x - x', 'simplify', { expected: '4*x' });
  assert.equal(simp.ok, true);
  assert.equal(simp.outputText, '4 * x');
  assert.equal(simp.equivalent, true);

  const integral = runMathSolver('x * sin(x)', 'integral', {
    variable: 'x',
    lower: '0',
    upper: 'pi',
    expected: 'pi',
  });
  assert.equal(integral.ok, true);
  assert.equal(integral.equivalent, true);
});

test('checkMathEquivalence detects equivalent and non-equivalent symbolic expressions', () => {
  const same = checkMathEquivalence('sin(x)^2 + cos(x)^2', '1');
  assert.equal(same.equivalent, true);

  const diff = checkMathEquivalence('x^2 + 1', 'x^2 + 2');
  assert.equal(diff.equivalent, false);
});
