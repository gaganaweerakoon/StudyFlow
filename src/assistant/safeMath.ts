/**
 * Pure, bounded recursive-descent expression parser and evaluator for declarative
 * interactive STEM/study widgets. Never uses `eval`, `new Function`, or arbitrary JS.
 */

export type EvalPrimitive = number | string | boolean;
export type EvalRecord = Record<string, EvalPrimitive>;
export type EvalScope = Record<string, EvalPrimitive | EvalRecord>;

type TokenType =
  | 'num'
  | 'str'
  | 'id'
  | 'op'
  | 'lparen'
  | 'rparen'
  | 'comma'
  | 'dot'
  | 'qmark'
  | 'colon'
  | 'eof';

interface Token {
  type: TokenType;
  value: string;
}

const MAX_EXPR_LEN = 600;
const MAX_TOKENS = 220;
const MAX_DEPTH = 28;
const MAX_OPS = 600;

const BLOCKED_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

const SAFE_FUNCTIONS: Record<string, (...args: number[]) => number> = {
  abs: Math.abs,
  sqrt: Math.sqrt,
  cbrt: Math.cbrt,
  pow: Math.pow,
  sin: Math.sin,
  cos: Math.cos,
  tan: Math.tan,
  asin: Math.asin,
  acos: Math.acos,
  atan: Math.atan,
  atan2: Math.atan2,
  sinh: Math.sinh,
  cosh: Math.cosh,
  tanh: Math.tanh,
  log: (x: number) => Math.log10(x),
  log10: Math.log10,
  log2: Math.log2,
  ln: Math.log,
  exp: Math.exp,
  floor: Math.floor,
  ceil: Math.ceil,
  round: (x: number, decimals?: number) => {
    if (decimals === undefined || !Number.isFinite(decimals)) return Math.round(x);
    const factor = 10 ** Math.max(0, Math.min(8, Math.round(decimals)));
    return Math.round(x * factor) / factor;
  },
  sign: Math.sign,
  min: (...args: number[]) => (args.length ? Math.min(...args) : 0),
  max: (...args: number[]) => (args.length ? Math.max(...args) : 0),
  clamp: (val: number, lo: number, hi: number) => Math.min(Math.max(val, lo), hi),
  lerp: (a: number, b: number, t: number) => a + (b - a) * t,
  hypot: Math.hypot,
  deg: (rad: number) => (rad * 180) / Math.PI,
  rad: (deg: number) => (deg * Math.PI) / 180,
};

const CONSTANTS: Record<string, EvalPrimitive> = {
  pi: Math.PI,
  PI: Math.PI,
  e: Math.E,
  E: Math.E,
  true: true,
  false: false,
};

function tokenize(input: string): Token[] | null {
  if (input.length > MAX_EXPR_LEN) return null;
  const tokens: Token[] = [];
  let i = 0;
  const len = input.length;

  while (i < len) {
    if (tokens.length >= MAX_TOKENS) return null;
    const ch = input[i];

    if (/\s/.test(ch)) {
      i++;
      continue;
    }

    // Number literal (supports decimals and scientific notation like 1.8e-5)
    if (/[0-9]/.test(ch) || (ch === '.' && i + 1 < len && /[0-9]/.test(input[i + 1]))) {
      const start = i;
      while (i < len && /[0-9]/.test(input[i])) i++;
      if (i < len && input[i] === '.') {
        i++;
        while (i < len && /[0-9]/.test(input[i])) i++;
      }
      if (i < len && (input[i] === 'e' || input[i] === 'E')) {
        const expPos = i;
        i++;
        if (i < len && (input[i] === '+' || input[i] === '-')) i++;
        const digitsStart = i;
        while (i < len && /[0-9]/.test(input[i])) i++;
        if (i === digitsStart) i = expPos;
      }
      tokens.push({ type: 'num', value: input.slice(start, i) });
      continue;
    }

    // Quoted string literal ('...' or "...")
    if (ch === "'" || ch === '"') {
      const quote = ch;
      i++;
      let out = '';
      while (i < len && input[i] !== quote) {
        if (input[i] === '\\' && i + 1 < len) {
          i++;
          out += input[i++];
        } else {
          out += input[i++];
        }
      }
      if (i >= len) return null;
      i++; // consume closing quote
      tokens.push({ type: 'str', value: out });
      continue;
    }

    // Identifier
    if (/[A-Za-z_]/.test(ch)) {
      const start = i;
      while (i < len && /[A-Za-z0-9_]/.test(input[i])) i++;
      tokens.push({ type: 'id', value: input.slice(start, i) });
      continue;
    }

    // Two-character operators
    const two = input.slice(i, i + 2);
    if (
      two === '<=' ||
      two === '>=' ||
      two === '==' ||
      two === '!=' ||
      two === '&&' ||
      two === '||' ||
      two === '**'
    ) {
      tokens.push({ type: 'op', value: two === '**' ? '^' : two });
      i += 2;
      continue;
    }

    // Single-character punctuation & operators
    if (ch === '(') {
      tokens.push({ type: 'lparen', value: ch });
      i++;
      continue;
    }
    if (ch === ')') {
      tokens.push({ type: 'rparen', value: ch });
      i++;
      continue;
    }
    if (ch === ',') {
      tokens.push({ type: 'comma', value: ch });
      i++;
      continue;
    }
    if (ch === '.') {
      tokens.push({ type: 'dot', value: ch });
      i++;
      continue;
    }
    if (ch === '?') {
      tokens.push({ type: 'qmark', value: ch });
      i++;
      continue;
    }
    if (ch === ':') {
      tokens.push({ type: 'colon', value: ch });
      i++;
      continue;
    }
    if ('+-*/%^<>!'.includes(ch)) {
      tokens.push({ type: 'op', value: ch });
      i++;
      continue;
    }

    return null;
  }

  tokens.push({ type: 'eof', value: '' });
  return tokens;
}

function toNum(v: EvalPrimitive): number {
  if (typeof v === 'number') return v;
  if (typeof v === 'boolean') return v ? 1 : 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function isTruthy(v: EvalPrimitive): boolean {
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') return v !== 0 && !Number.isNaN(v);
  return v.length > 0 && v !== 'false' && v !== '0';
}

export function evaluateSafeExpression(
  expr: string,
  scope: EvalScope,
): EvalPrimitive | null {
  if (typeof expr !== 'string' || !expr.trim()) return null;
  const tokens = tokenize(expr.trim());
  if (!tokens) return null;

  let pos = 0;
  let ops = 0;

  const peek = () => tokens[pos];
  const consume = () => tokens[pos++];
  const bumpOp = () => {
    if (++ops > MAX_OPS) throw new Error('Expression complexity limit exceeded');
  };

  function parseTernary(depth: number): EvalPrimitive {
    if (depth > MAX_DEPTH) throw new Error('Max depth exceeded');
    const cond = parseOr(depth);
    if (peek().type === 'qmark') {
      consume();
      bumpOp();
      const truthyBranch = parseTernary(depth + 1);
      if (peek().type !== 'colon') throw new Error('Expected ":"');
      consume();
      const falsyBranch = parseTernary(depth + 1);
      return isTruthy(cond) ? truthyBranch : falsyBranch;
    }
    return cond;
  }

  function parseOr(depth: number): EvalPrimitive {
    let left = parseAnd(depth);
    while (peek().type === 'op' && peek().value === '||') {
      consume();
      bumpOp();
      const right = parseAnd(depth);
      left = isTruthy(left) || isTruthy(right);
    }
    return left;
  }

  function parseAnd(depth: number): EvalPrimitive {
    let left = parseEquality(depth);
    while (peek().type === 'op' && peek().value === '&&') {
      consume();
      bumpOp();
      const right = parseEquality(depth);
      left = isTruthy(left) && isTruthy(right);
    }
    return left;
  }

  function parseEquality(depth: number): EvalPrimitive {
    let left = parseComparison(depth);
    while (peek().type === 'op' && (peek().value === '==' || peek().value === '!=')) {
      const op = consume().value;
      bumpOp();
      const right = parseComparison(depth);
      const eq =
        typeof left === 'string' || typeof right === 'string'
          ? String(left) === String(right)
          : toNum(left) === toNum(right);
      left = op === '==' ? eq : !eq;
    }
    return left;
  }

  function parseComparison(depth: number): EvalPrimitive {
    let left = parseAdditive(depth);
    while (
      peek().type === 'op' &&
      (peek().value === '<' ||
        peek().value === '<=' ||
        peek().value === '>' ||
        peek().value === '>=')
    ) {
      const op = consume().value;
      bumpOp();
      const right = parseAdditive(depth);
      const a = toNum(left);
      const b = toNum(right);
      if (op === '<') left = a < b;
      else if (op === '<=') left = a <= b;
      else if (op === '>') left = a > b;
      else left = a >= b;
    }
    return left;
  }

  function parseAdditive(depth: number): EvalPrimitive {
    let left = parseMultiplicative(depth);
    while (peek().type === 'op' && (peek().value === '+' || peek().value === '-')) {
      const op = consume().value;
      bumpOp();
      const right = parseMultiplicative(depth);
      if (op === '+' && (typeof left === 'string' || typeof right === 'string')) {
        left = String(left) + String(right);
      } else {
        left = op === '+' ? toNum(left) + toNum(right) : toNum(left) - toNum(right);
      }
    }
    return left;
  }

  function parseMultiplicative(depth: number): EvalPrimitive {
    let left = parsePower(depth);
    while (
      peek().type === 'op' &&
      (peek().value === '*' || peek().value === '/' || peek().value === '%')
    ) {
      const op = consume().value;
      bumpOp();
      const right = parsePower(depth);
      const a = toNum(left);
      const b = toNum(right);
      if (op === '*') left = a * b;
      else if (op === '/') left = b === 0 ? NaN : a / b;
      else left = b === 0 ? NaN : a % b;
    }
    return left;
  }

  function parsePower(depth: number): EvalPrimitive {
    const base = parseUnary(depth);
    if (peek().type === 'op' && peek().value === '^') {
      consume();
      bumpOp();
      const exp = parsePower(depth + 1);
      return Math.pow(toNum(base), toNum(exp));
    }
    return base;
  }

  function parseUnary(depth: number): EvalPrimitive {
    if (depth > MAX_DEPTH) throw new Error('Max depth exceeded');
    if (peek().type === 'op' && (peek().value === '-' || peek().value === '+' || peek().value === '!')) {
      const op = consume().value;
      bumpOp();
      const val = parseUnary(depth + 1);
      if (op === '-') return -toNum(val);
      if (op === '+') return toNum(val);
      return !isTruthy(val);
    }
    return parsePrimary(depth);
  }

  function parsePrimary(depth: number): EvalPrimitive {
    if (depth > MAX_DEPTH) throw new Error('Max depth exceeded');
    const tok = peek();

    if (tok.type === 'num') {
      consume();
      return Number(tok.value);
    }

    if (tok.type === 'str') {
      consume();
      return tok.value;
    }

    if (tok.type === 'lparen') {
      consume();
      const val = parseTernary(depth + 1);
      if (peek().type !== 'rparen') throw new Error('Expected ")"');
      consume();
      return val;
    }

    if (tok.type === 'id') {
      const name = consume().value;

      // Function call
      if (peek().type === 'lparen') {
        consume();
        const fn = Object.prototype.hasOwnProperty.call(SAFE_FUNCTIONS, name)
          ? SAFE_FUNCTIONS[name]
          : null;
        if (!fn) throw new Error(`Unknown function: ${name}`);

        const args: number[] = [];
        if (peek().type !== 'rparen') {
          args.push(toNum(parseTernary(depth + 1)));
          while (peek().type === 'comma') {
            consume();
            if (args.length >= 8) throw new Error('Too many arguments');
            args.push(toNum(parseTernary(depth + 1)));
          }
        }
        if (peek().type !== 'rparen') throw new Error('Expected ")"');
        consume();
        bumpOp();
        return fn(...args);
      }

      // Property access (e.g., planet.g or acid.pKa)
      if (peek().type === 'dot') {
        consume();
        if (peek().type !== 'id') throw new Error('Expected property name');
        const prop = consume().value;
        if (BLOCKED_KEYS.has(name) || BLOCKED_KEYS.has(prop)) return 0;
        const container = Object.prototype.hasOwnProperty.call(scope, name)
          ? scope[name]
          : undefined;
        if (container && typeof container === 'object') {
          if (Object.prototype.hasOwnProperty.call(container, prop)) {
            return container[prop];
          }
        }
        return 0;
      }

      if (BLOCKED_KEYS.has(name)) return 0;
      if (Object.prototype.hasOwnProperty.call(scope, name)) {
        const val = scope[name];
        if (typeof val === 'object' && val !== null) {
          return Object.prototype.hasOwnProperty.call(val, 'value') ? val.value : '';
        }
        return val;
      }
      if (Object.prototype.hasOwnProperty.call(CONSTANTS, name)) {
        return CONSTANTS[name];
      }
      return 0;
    }

    throw new Error('Unexpected token');
  }

  try {
    const result = parseTernary(0);
    if (peek().type !== 'eof') return null;
    if (typeof result === 'number' && !Number.isFinite(result)) return null;
    return result;
  } catch {
    return null;
  }
}

export function evaluateNumericExpression(expr: string, scope: EvalScope): number | null {
  const value = evaluateSafeExpression(expr, scope);
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'boolean') return value ? 1 : 0;
  if (typeof value === 'string') {
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
  }
  return null;
}

/**
 * Safely interpolates `{{expr}}` placeholders inside declarative templates (such as
 * reactive SVG attributes/text or state labels) using the pure math/logic evaluator.
 */
export function interpolateTemplate(template: string, scope: EvalScope): string {
  return template.replace(/\{\{([^{}]{1,280})\}\}/g, (_match, rawExpr: string) => {
    const val = evaluateSafeExpression(rawExpr, scope);
    if (val === null || val === undefined) return '0';
    if (typeof val === 'number') {
      if (!Number.isFinite(val)) return '0';
      return Number.isInteger(val) ? String(val) : String(Number(val.toFixed(3)));
    }
    return String(val);
  });
}
