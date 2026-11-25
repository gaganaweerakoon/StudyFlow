import { javascriptWorkerSource } from './javascriptWorkerSource';
import { runDisposableWorker } from './workerRun';
import { derivative, evaluate, format, parse, simplify } from 'mathjs';
import type { StudyLabLanguage } from '../types/studyflow';

export type MathOperation = 'evaluate' | 'derivative' | 'simplify' | 'integral' | 'equivalence';

export interface MathSolverResult {
  ok: boolean;
  operation: MathOperation;
  outputText: string;
  latexOutput?: string;
  latexInput?: string;
  steps?: string[];
  equivalent?: boolean;
  error?: string;
  durationMs: number;
}

export interface CodeRunAssertion {
  label: string;
  passed: boolean;
  expected: string;
  actual: string;
}

export interface SqlTableResult {
  columns: string[];
  values: unknown[][];
}

export interface CodeRunResult {
  ok: boolean;
  stdout: string;
  stderr: string;
  returnValue?: string;
  tables?: SqlTableResult[];
  assertions?: CodeRunAssertion[];
  durationMs: number;
  runtimeLabel: string;
}

export interface PlaygroundPreset {
  id: string;
  title: string;
  course: string;
  language: StudyLabLanguage;
  code: string;
  mathOperation?: MathOperation;
  mathVariable?: string;
  mathLower?: string;
  mathUpper?: string;
  expectedAnswer?: string;
  description: string;
}

export const PLAYGROUND_PRESETS: PlaygroundPreset[] = [
  {
    id: 'math-calc-derivative',
    title: 'Multivariable Partial Derivative',
    course: 'MATH 241',
    language: 'math',
    mathOperation: 'derivative',
    mathVariable: 'x',
    code: 'x^3 * y^2 + sin(2*x) - 4*x*y',
    expectedAnswer: '3*x^2*y^2 + 2*cos(2*x) - 4*y',
    description: 'Compute ∂f/∂x and check algebraic equivalence.',
  },
  {
    id: 'math-calc-integral',
    title: 'Definite Integral Check',
    course: 'MATH 241',
    language: 'math',
    mathOperation: 'integral',
    mathVariable: 'x',
    mathLower: '0',
    mathUpper: 'pi',
    code: 'x * sin(x)',
    expectedAnswer: 'pi',
    description: 'Numerically evaluate ∫₀^π x·sin(x) dx via Simpson quadrature.',
  },
  {
    id: 'py-algo-recurrence',
    title: 'Master Theorem & DP Runtime',
    course: 'CS 340',
    language: 'python',
    code: `# Verify recurrence T(n) = 2*T(n//2) + n against n*log2(n)
import math

def T(n):
    if n <= 1:
        return 1
    return 2 * T(n // 2) + n

for k in range(1, 8):
    n = 2 ** k
    val = T(n)
    bound = n * math.log2(n) + n
    print(f"n={n:3d}  T(n)={val:4d}  n*log2(n)+n={bound:.0f}  match={val == bound}")
`,
    expectedAnswer: 'match=True',
    description: 'Verify divide-and-conquer recurrence exact closed form in Python.',
  },
  {
    id: 'js-algo-dijkstra',
    title: 'Shortest-Path Relaxations',
    course: 'CS 340',
    language: 'javascript',
    code: `// Run Dijkstra on a small weighted directed graph
const graph = {
  A: [['B', 4], ['C', 2]],
  B: [['D', 3]],
  C: [['B', 1], ['D', 5]],
  D: []
};

function shortestPaths(start) {
  const dist = { A: Infinity, B: Infinity, C: Infinity, D: Infinity };
  dist[start] = 0;
  const visited = new Set();
  while (visited.size < Object.keys(graph).length) {
    const u = Object.keys(dist)
      .filter(n => !visited.has(n))
      .sort((a, b) => dist[a] - dist[b])[0];
    visited.add(u);
    for (const [v, w] of graph[u]) {
      if (dist[u] + w < dist[v]) dist[v] = dist[u] + w;
    }
  }
  return dist;
}

const result = shortestPaths('A');
console.log(JSON.stringify(result));
`,
    expectedAnswer: '{"A":0,"B":3,"C":2,"D":6}',
    description: 'Trace shortest path distances in an isolated JS sandbox.',
  },
  {
    id: 'sql-academic',
    title: 'Course GPA & Weighted Average Query',
    course: 'CS 320',
    language: 'sql',
    code: `CREATE TABLE assessments (
  id INTEGER PRIMARY KEY,
  course TEXT,
  title TEXT,
  weight_pct REAL,
  score REAL
);

INSERT INTO assessments VALUES
  (1, 'CS 340', 'Midterm 1', 25, 88),
  (2, 'CS 340', 'Problem Sets', 35, 95),
  (3, 'CS 340', 'Final Exam', 40, 91),
  (4, 'CHEM 210', 'Lab Reports', 30, 92),
  (5, 'CHEM 210', 'Midterm', 30, 84),
  (6, 'CHEM 210', 'Final', 40, 89);

SELECT
  course,
  COUNT(*) AS items,
  ROUND(SUM(score * weight_pct) / SUM(weight_pct), 2) AS weighted_avg
FROM assessments
GROUP BY course
ORDER BY weighted_avg DESC;
`,
    expectedAnswer: '91.65',
    description: 'Run live SQLite queries in WebAssembly with table output.',
  },
  {
    id: 'cpp-bfs-trace',
    title: 'Graph BFS Complexity & Dry Run',
    course: 'CS 340',
    language: 'cpp',
    code: `#include <iostream>
#include <vector>
#include <queue>
using namespace std;

vector<int> bfs(int n, const vector<vector<int>>& adj, int src) {
    vector<int> dist(n, -1);
    queue<int> q;
    dist[src] = 0;
    q.push(src);
    while (!q.empty()) {
        int u = q.front(); q.pop();
        for (int v : adj[u]) {
            if (dist[v] == -1) {
                dist[v] = dist[u] + 1;
                q.push(v);
            }
        }
    }
    return dist;
}
`,
    expectedAnswer: 'O(V + E)',
    description: 'Trace C++ execution, edge cases, and Big-O complexity with Pip.',
  },
];

function safeToTex(expr: string): string | undefined {
  try {
    return parse(expr).toTex({ parenthesis: 'auto' });
  } catch {
    return undefined;
  }
}

function numericSimpsonIntegral(expr: string, variable: string, a: number, b: number, intervals = 200): number {
  const n = intervals % 2 === 0 ? intervals : intervals + 1;
  const h = (b - a) / n;
  const evalAt = (xVal: number) => {
    const res = evaluate(expr, { [variable]: xVal });
    const num = typeof res === 'number' ? res : Number(res);
    if (!Number.isFinite(num)) throw new Error(`Expression is undefined or non-finite at ${variable} = ${xVal}`);
    return num;
  };
  let sum = evalAt(a) + evalAt(b);
  for (let i = 1; i < n; i++) {
    sum += (i % 2 === 0 ? 2 : 4) * evalAt(a + i * h);
  }
  return (h / 3) * sum;
}

function extractFreeVariables(expr: string): string[] {
  const builtins = new Set(['e', 'pi', 'i', 'tau', 'phi', 'sin', 'cos', 'tan', 'log', 'ln', 'exp', 'sqrt', 'abs', 'sec', 'csc', 'cot', 'asin', 'acos', 'atan', 'sinh', 'cosh', 'tanh']);
  const vars = new Set<string>();
  try {
    const node = parse(expr);
    node.traverse((n) => {
      if (n.type === 'SymbolNode' && 'name' in n && typeof n.name === 'string') {
        if (!builtins.has(n.name)) vars.add(n.name);
      }
    });
  } catch {
    // Ignore parse error here; caller handles it
  }
  return [...vars];
}

export function checkMathEquivalence(exprA: string, exprB: string): { equivalent: boolean; reason: string } {
  const a = exprA.trim();
  const b = exprB.trim();
  if (!a || !b) return { equivalent: false, reason: 'Provide both expressions to compare.' };

  try {
    const diffSimplified = simplify(`(${a}) - (${b})`).toString();
    if (diffSimplified === '0') {
      return { equivalent: true, reason: 'Symbolically identical (difference simplifies to 0).' };
    }
  } catch {
    // Fall back to numeric probing
  }

  const vars = [...new Set([...extractFreeVariables(a), ...extractFreeVariables(b)])];
  const sampleSeeds = [0.37, 0.91, 1.43, 2.17, -0.63, -1.29, 3.05, 0.19];
  let validChecks = 0;

  for (let i = 0; i < sampleSeeds.length; i++) {
    const scope: Record<string, number> = {};
    vars.forEach((v, idx) => {
      scope[v] = sampleSeeds[(i + idx * 3) % sampleSeeds.length] + idx * 0.17;
    });
    try {
      const valA = Number(evaluate(a, scope));
      const valB = Number(evaluate(b, scope));
      if (!Number.isFinite(valA) || !Number.isFinite(valB)) continue;
      validChecks++;
      const tol = 1e-6 * Math.max(1, Math.abs(valA), Math.abs(valB));
      if (Math.abs(valA - valB) > tol) {
        return {
          equivalent: false,
          reason: `Mismatch at ${JSON.stringify(scope)}: got ${valA.toPrecision(6)} vs expected ${valB.toPrecision(6)}.`,
        };
      }
    } catch {
      continue;
    }
  }

  if (validChecks === 0) {
    return { equivalent: false, reason: 'Could not evaluate both expressions numerically.' };
  }
  return {
    equivalent: true,
    reason: `Matched across ${validChecks} test points within 1e-6 tolerance.`,
  };
}

export function runMathSolver(
  rawExpression: string,
  operation: MathOperation,
  options?: {
    variable?: string;
    lower?: string;
    upper?: string;
    expected?: string;
  },
): MathSolverResult {
  const started = performance.now();
  const expr = rawExpression.trim();
  const variable = (options?.variable || 'x').trim() || 'x';
  const expected = options?.expected?.trim();

  if (!expr) {
    return {
      ok: false,
      operation,
      outputText: '',
      error: 'Enter a mathematical expression to evaluate.',
      durationMs: Math.round(performance.now() - started),
    };
  }

  try {
    if (operation === 'derivative') {
      const diffNode = derivative(expr, variable);
      const simpNode = simplify(diffNode);
      const out = simpNode.toString();
      const steps = [
        `Input: f(${variable}) = ${expr}`,
        `Raw derivative: ${diffNode.toString()}`,
        `Simplified: ${out}`,
      ];
      let equivalent: boolean | undefined;
      if (expected) {
        const cmp = checkMathEquivalence(out, expected);
        equivalent = cmp.equivalent;
        steps.push(`Check vs expected (${expected}): ${cmp.reason}`);
      }
      return {
        ok: true,
        operation,
        outputText: out,
        latexInput: `\\frac{d}{d${variable}}\\left(${safeToTex(expr) ?? expr}\\right)`,
        latexOutput: simpNode.toTex({ parenthesis: 'auto' }),
        steps,
        equivalent,
        durationMs: Math.round(performance.now() - started),
      };
    }

    if (operation === 'simplify') {
      const simpNode = simplify(expr);
      const out = simpNode.toString();
      const steps = [`Input: ${expr}`, `Simplified: ${out}`];
      let equivalent: boolean | undefined;
      if (expected) {
        const cmp = checkMathEquivalence(out, expected);
        equivalent = cmp.equivalent;
        steps.push(`Check vs expected (${expected}): ${cmp.reason}`);
      }
      return {
        ok: true,
        operation,
        outputText: out,
        latexInput: safeToTex(expr),
        latexOutput: simpNode.toTex({ parenthesis: 'auto' }),
        steps,
        equivalent,
        durationMs: Math.round(performance.now() - started),
      };
    }

    if (operation === 'integral') {
      const a = Number(evaluate(options?.lower?.trim() || '0'));
      const b = Number(evaluate(options?.upper?.trim() || '1'));
      if (!Number.isFinite(a) || !Number.isFinite(b)) {
        throw new Error('Integral lower and upper bounds must evaluate to finite numbers.');
      }
      const value = numericSimpsonIntegral(expr, variable, a, b, 240);
      const rounded = format(value, { precision: 8 });
      const steps = [
        `Bounds: ${variable} ∈ [${options?.lower?.trim() || '0'}, ${options?.upper?.trim() || '1'}]`,
        `Composite Simpson quadrature (240 panels) = ${rounded}`,
      ];
      let equivalent: boolean | undefined;
      if (expected) {
        const expVal = Number(evaluate(expected));
        if (Number.isFinite(expVal)) {
          const tol = 1e-4 * Math.max(1, Math.abs(expVal));
          equivalent = Math.abs(value - expVal) <= tol;
          steps.push(
            `Expected ${format(expVal, { precision: 8 })} — ${equivalent ? 'Matched within 1e-4' : `Difference ${Math.abs(value - expVal).toExponential(2)}`}`,
          );
        }
      }
      return {
        ok: true,
        operation,
        outputText: rounded,
        latexInput: `\\int_{${safeToTex(options?.lower?.trim() || '0') ?? '0'}}^{${safeToTex(options?.upper?.trim() || '1') ?? '1'}} \\left(${safeToTex(expr) ?? expr}\\right)\\,d${variable}`,
        latexOutput: rounded,
        steps,
        equivalent,
        durationMs: Math.round(performance.now() - started),
      };
    }

    if (operation === 'equivalence') {
      if (!expected) {
        throw new Error('Enter an expected expression in the Answer Check box to verify equivalence.');
      }
      const cmp = checkMathEquivalence(expr, expected);
      return {
        ok: true,
        operation,
        outputText: cmp.equivalent ? 'Equivalent' : 'Not equivalent',
        latexInput: `${safeToTex(expr) ?? expr} \\stackrel{?}{=} ${safeToTex(expected) ?? expected}`,
        latexOutput: cmp.equivalent ? '\\text{Equivalent } \\checkmark' : '\\text{Not Equivalent}',
        steps: [cmp.reason],
        equivalent: cmp.equivalent,
        durationMs: Math.round(performance.now() - started),
      };
    }

    // Default: evaluate (supports multi-line scope statements separated by newlines or ;)
    const scope: Record<string, unknown> = {};
    const lines = expr
      .split(/\n|;/)
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith('#') && !l.startsWith('//'));
    let lastVal: unknown;
    const steps: string[] = [];
    for (const line of lines) {
      lastVal = evaluate(line, scope);
      steps.push(`${line}  →  ${format(lastVal, { precision: 10 })}`);
    }
    const outText = format(lastVal, { precision: 10 });
    let equivalent: boolean | undefined;
    if (expected) {
      const cmp = checkMathEquivalence(outText, expected);
      equivalent = cmp.equivalent;
      steps.push(`Answer check (${expected}): ${cmp.reason}`);
    }
    return {
      ok: true,
      operation,
      outputText: outText,
      latexInput: lines.length === 1 ? safeToTex(lines[0]) : undefined,
      latexOutput: safeToTex(outText) ?? outText,
      steps,
      equivalent,
      durationMs: Math.round(performance.now() - started),
    };
  } catch (err) {
    return {
      ok: false,
      operation,
      outputText: '',
      error: err instanceof Error ? err.message : 'Could not parse or evaluate expression.',
      durationMs: Math.round(performance.now() - started),
    };
  }
}

/** Run trusted JavaScript off the UI thread with a hard deadline. */
export async function runJavaScriptSandbox(code: string, expectedOutput?: string): Promise<CodeRunResult> {
  const started = performance.now();
  const url = URL.createObjectURL(new Blob([javascriptWorkerSource(code)], {type:'text/javascript'}));
  try {
    const result = await runDisposableWorker(() => new Worker(url, {type:'module'}), code, {loadMs: 5_000, runMs: 5_000});
    return {...result,
      assertions: result.ok ? buildOutputAssertions(result.stdout, result.returnValue, expectedOutput) : undefined,
      durationMs: Math.round(performance.now() - started), runtimeLabel: 'JavaScript Worker'};
  } finally {
    URL.revokeObjectURL(url);
  }
}

function buildOutputAssertions(
  stdout: string,
  returnValue: string | undefined,
  expectedOutput: string | undefined,
): CodeRunAssertion[] | undefined {
  const expected = expectedOutput?.trim();
  if (!expected) return undefined;
  const combined = [stdout, returnValue].filter(Boolean).join('\n').trim();
  const passed = combined === expected || combined.includes(expected);
  return [
    {
      label: 'Expected output check',
      passed,
      expected,
      actual: combined || '(empty output)',
    },
  ];
}

// Lazily initialized SQL.js WebAssembly singleton
let sqlPromise: Promise<import('sql.js').SqlJsStatic> | null = null;

async function getSqlRuntime() {
  if (!sqlPromise) {
    sqlPromise = (async () => {
      const [{ default: initSqlJs }, { default: wasmUrl }] = await Promise.all([
        import('sql.js'),
        import('sql.js/dist/sql-wasm.wasm?url'),
      ]);
      return initSqlJs({
        locateFile: () => wasmUrl,
      });
    })();
  }
  return sqlPromise;
}

export async function runSqlSandbox(sql: string, expectedOutput?: string): Promise<CodeRunResult> {
  const started = performance.now();
  try {
    const SQL = await getSqlRuntime();
    const db = new SQL.Database();
    try {
      const results = db.exec(sql);
      const tables: SqlTableResult[] = results.map((res) => ({
        columns: res.columns,
        values: res.values,
      }));
      const flatText = tables
        .map((t) => [t.columns.join('\t'), ...t.values.map((row) => row.map((v) => String(v ?? 'NULL')).join('\t'))].join('\n'))
        .join('\n\n');
      const assertions = buildOutputAssertions(flatText, undefined, expectedOutput);
      return {
        ok: true,
        stdout: tables.length ? `${tables.length} result set${tables.length === 1 ? '' : 's'} returned.` : 'Statement executed successfully (no rows returned).',
        stderr: '',
        tables,
        assertions,
        durationMs: Math.round(performance.now() - started),
        runtimeLabel: 'SQLite WebAssembly',
      };
    } finally {
      db.close();
    }
  } catch (err) {
    return {
      ok: false,
      stdout: '',
      stderr: err instanceof Error ? err.message : 'SQL execution failed.',
      durationMs: Math.round(performance.now() - started),
      runtimeLabel: 'SQLite WebAssembly',
    };
  }
}

// Python is loaded and executed off the UI thread; every run gets a fresh worker.
// Workers isolate responsiveness, not privileges. Run only code you trust.
export async function runPythonSandbox(
  code: string,
  expectedOutput?: string,
  onStatus?: (msg: string) => void,
): Promise<CodeRunResult> {
  const started = performance.now();
  onStatus?.('Loading Python WebAssembly runtime…');
  const result = await runDisposableWorker(
    () => new Worker(new URL('./pythonRunner.worker.ts', import.meta.url), {type:'module'}),
    code,
    {loadMs: 60_000, runMs: 10_000, onReady: () => onStatus?.('Running Python…')},
  );
  return {
    ...result,
    assertions: result.ok ? buildOutputAssertions(result.stdout, result.returnValue, expectedOutput) : undefined,
    durationMs: Math.round(performance.now() - started),
    runtimeLabel: 'Python 3 (Pyodide Worker)',
  };
}
