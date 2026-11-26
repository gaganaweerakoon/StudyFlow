import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import {
  CheckCircle2,
  Code2,
  Database,
  FilePlus2,
  Loader2,
  Play,
  RotateCcw,
  Sigma,
  Sparkles,
  Terminal,
  XCircle,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useAssistant } from '../assistant/AssistantContext';
import type { StudyLabLanguage, StudyLabLaunchState } from '../types/studyflow';
import {
  PLAYGROUND_PRESETS,
  runJavaScriptSandbox,
  runMathSolver,
  runPythonSandbox,
  runSqlSandbox,
  type CodeRunResult,
  type MathOperation,
  type MathSolverResult,
} from './playgroundRunners';

const AssistantMarkdown = lazy(() => import('../assistant/AssistantMarkdown'));

const LANGUAGE_TABS: Array<{ id: StudyLabLanguage; label: string; hint: string }> = [
  { id: 'math', label: 'Math / LaTeX', hint: 'Symbolic & numeric solver' },
  { id: 'python', label: 'Python', hint: 'WebAssembly Python 3' },
  { id: 'javascript', label: 'JavaScript', hint: 'Timed Web Worker' },
  { id: 'sql', label: 'SQL', hint: 'SQLite WebAssembly' },
  { id: 'cpp', label: 'C++ Trace', hint: 'Pip dry-run & Big-O' },
];

const MATH_OPS: Array<{ id: MathOperation; label: string }> = [
  { id: 'evaluate', label: 'Evaluate' },
  { id: 'derivative', label: 'Differentiate' },
  { id: 'simplify', label: 'Simplify' },
  { id: 'integral', label: 'Definite Integral' },
  { id: 'equivalence', label: 'Check Equivalence' },
];

function renderKatexHtml(tex?: string): string {
  if (!tex) return '';
  try {
    return katex.renderToString(tex, { throwOnError: false, displayMode: true });
  } catch {
    return '';
  }
}

export function CodeMathPlayground({ launch }: { launch?: StudyLabLaunchState | null }) {
  const app = useApp();
  const assistant = useAssistant();

  const [language, setLanguage] = useState<StudyLabLanguage>('math');
  const [title, setTitle] = useState(PLAYGROUND_PRESETS[0].title);
  const [code, setCode] = useState(PLAYGROUND_PRESETS[0].code);
  const [mathOp, setMathOp] = useState<MathOperation>(PLAYGROUND_PRESETS[0].mathOperation ?? 'derivative');
  const [mathVar, setMathVar] = useState(PLAYGROUND_PRESETS[0].mathVariable ?? 'x');
  const [mathLower, setMathLower] = useState('0');
  const [mathUpper, setMathUpper] = useState('pi');
  const [expected, setExpected] = useState(PLAYGROUND_PRESETS[0].expectedAnswer ?? '');

  const [running, setRunning] = useState(false);
  const [statusLabel, setStatusLabel] = useState('');
  const [mathResult, setMathResult] = useState<MathSolverResult | null>(null);
  const [codeResult, setCodeResult] = useState<CodeRunResult | null>(null);
  const [cppTrace, setCppTrace] = useState('');
  const [cppError, setCppError] = useState('');
  const [insertedNote, setInsertedNote] = useState(false);

  useEffect(() => {
    if (!launch || launch.tab !== 'playground') return;
    if (launch.language) setLanguage(launch.language);
    if (launch.code !== undefined) setCode(launch.code);
    if (launch.title) setTitle(launch.title);
    setMathResult(null);
    setCodeResult(null);
    setCppTrace('');
    setCppError('');
  }, [launch]);

  useEffect(() => {
    if (!insertedNote) return;
    const timer = window.setTimeout(() => setInsertedNote(false), 2200);
    return () => window.clearTimeout(timer);
  }, [insertedNote]);

  const targetNote = useMemo(() => {
    if (launch?.targetNoteId) {
      return app.notes.find((n) => n.id === launch.targetNoteId);
    }
    return app.notes.find((n) => n.id === app.selectedNoteId);
  }, [app.notes, app.selectedNoteId, launch?.targetNoteId]);

  const presetsForLanguage = useMemo(
    () => PLAYGROUND_PRESETS.filter((p) => p.language === language),
    [language],
  );

  function selectLanguage(nextLang: StudyLabLanguage) {
    setLanguage(nextLang);
    setMathResult(null);
    setCodeResult(null);
    setCppTrace('');
    setCppError('');
    const preset = PLAYGROUND_PRESETS.find((p) => p.language === nextLang);
    if (preset) {
      setTitle(preset.title);
      setCode(preset.code);
      setExpected(preset.expectedAnswer ?? '');
      if (preset.mathOperation) setMathOp(preset.mathOperation);
      if (preset.mathVariable) setMathVar(preset.mathVariable);
      if (preset.mathLower) setMathLower(preset.mathLower);
      if (preset.mathUpper) setMathUpper(preset.mathUpper);
    }
  }

  function applyPreset(presetId: string) {
    const preset = PLAYGROUND_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    setLanguage(preset.language);
    setTitle(preset.title);
    setCode(preset.code);
    setExpected(preset.expectedAnswer ?? '');
    if (preset.mathOperation) setMathOp(preset.mathOperation);
    if (preset.mathVariable) setMathVar(preset.mathVariable);
    if (preset.mathLower) setMathLower(preset.mathLower);
    if (preset.mathUpper) setMathUpper(preset.mathUpper);
    setMathResult(null);
    setCodeResult(null);
    setCppTrace('');
    setCppError('');
  }

  async function handleRun() {
    if (running) return;
    setRunning(true);
    setStatusLabel('');
    setCppError('');
    try {
      if (language === 'math') {
        const res = runMathSolver(code, mathOp, {
          variable: mathVar,
          lower: mathLower,
          upper: mathUpper,
          expected,
        });
        setMathResult(res);
        setCodeResult(null);
        setCppTrace('');
      } else if (language === 'javascript') {
        setStatusLabel('Running in JS Worker…');
        const res = await runJavaScriptSandbox(code, expected);
        setCodeResult(res);
        setMathResult(null);
      } else if (language === 'sql') {
        setStatusLabel('Running SQLite WASM…');
        const res = await runSqlSandbox(code, expected);
        setCodeResult(res);
        setMathResult(null);
      } else if (language === 'python') {
        const res = await runPythonSandbox(code, expected, (msg) => setStatusLabel(msg));
        setCodeResult(res);
        setMathResult(null);
      } else if (language === 'cpp') {
        setStatusLabel('Tracing C++ with Pip…');
        const prompt = [
          'Perform a concise academic dry-run trace and complexity analysis of this C++ snippet.',
          'Provide: (1) Step-by-step execution trace on a representative small input, (2) Time & Space complexity with justification, (3) Edge cases or bugs to watch for.',
          expected.trim() ? `Also verify against the student's expected output/bound: ${expected.trim()}` : '',
        ]
          .filter(Boolean)
          .join('\n');
        const analysis = await assistant.generateText(prompt, code);
        setCppTrace(analysis);
        setMathResult(null);
        setCodeResult(null);
      }
    } catch (err) {
      if (language === 'cpp') {
        setCppError(err instanceof Error ? err.message : 'Could not run C++ trace.');
      } else {
        setCodeResult({
          ok: false,
          stdout: '',
          stderr: err instanceof Error ? err.message : 'Execution failed.',
          durationMs: 0,
          runtimeLabel: language.toUpperCase(),
        });
      }
    } finally {
      setRunning(false);
      setStatusLabel('');
    }
  }

  function handleInsertIntoNote() {
    const blocks: string[] = [`### ${title || 'Study Lab Result'}`];
    if (language === 'math') {
      if (mathResult?.latexInput) {
        blocks.push(`$$${mathResult.latexInput}$$`);
      } else {
        blocks.push(`\`\`\`text\n${code.trim()}\n\`\`\``);
      }
      if (mathResult?.ok) {
        if (mathResult.latexOutput) {
          blocks.push(`**Result:**\n$$${mathResult.latexOutput}$$`);
        } else {
          blocks.push(`**Result:** \`${mathResult.outputText}\``);
        }
        if (mathResult.steps?.length) {
          blocks.push(mathResult.steps.map((s) => `- ${s}`).join('\n'));
        }
      }
    } else {
      blocks.push(`\`\`\`${language}\n${code.trim()}\n\`\`\``);
      if (codeResult?.stdout) {
        blocks.push(`**Output:**\n\`\`\`text\n${codeResult.stdout}\n\`\`\``);
      }
      if (codeResult?.tables?.length) {
        const table = codeResult.tables[0];
        const header = `| ${table.columns.join(' | ')} |`;
        const sep = `| ${table.columns.map(() => '---').join(' | ')} |`;
        const rows = table.values.slice(0, 15).map((r) => `| ${r.map((v) => String(v ?? 'NULL')).join(' | ')} |`);
        blocks.push([header, sep, ...rows].join('\n'));
      }
      if (cppTrace) {
        blocks.push(cppTrace);
      }
    }
    const markdown = `\n\n${blocks.join('\n\n')}\n`;

    if (targetNote) {
      app.updateNote(targetNote.id, {
        content: `${targetNote.content.trimEnd()}${markdown}`,
        updatedAt: 'Just now',
      });
      app.pushToast(`Inserted into “${targetNote.title}”`);
    } else {
      app.createNote(app.subjects[0]?.id ?? '', 'fld-all', {
        title: title || 'Study Lab Derivation',
        content: blocks.join('\n\n'),
        tags: ['Study Lab'],
      });
      app.pushToast('Saved as a new note in Notes');
    }
    setInsertedNote(true);
  }

  function handleAskPip() {
    const prompt =
      language === 'math'
        ? `Walk me step-by-step through this ${mathOp} problem (${mathVar}):\n\`${code.trim()}\`${mathResult?.outputText ? `\nMy computed result: ${mathResult.outputText}` : ''}${expected.trim() ? `\nExpected answer: ${expected.trim()}` : ''}`
        : `Review this ${language} snippet ("${title}") — explain the logic, verify correctness, and highlight time/space complexity or edge cases:\n\`\`\`${language}\n${code.trim()}\n\`\`\`${codeResult?.stderr ? `\nError output:\n${codeResult.stderr}` : codeResult?.stdout ? `\nStdout:\n${codeResult.stdout}` : ''}`;
    assistant.askPip(prompt, { openFloating: true });
  }

  const inputTexHtml = useMemo(() => renderKatexHtml(mathResult?.latexInput), [mathResult?.latexInput]);
  const outputTexHtml = useMemo(() => renderKatexHtml(mathResult?.latexOutput), [mathResult?.latexOutput]);

  return (
    <div className="space-y-4">
      {/* Mode & Preset Bar */}
      <div className="sf-card p-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1" role="tablist" aria-label="Playground language">
          {LANGUAGE_TABS.map((tab) => {
            const active = language === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => selectLanguage(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-[12.5px] font-medium whitespace-nowrap transition-colors ${
                  active
                    ? 'bg-[var(--accent)] text-[var(--accent-fg)]'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)] hover:text-[var(--text-primary)]'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label="Load STEM course preset"
            value=""
            onChange={(e) => {
              if (e.target.value) applyPreset(e.target.value);
            }}
            className="h-8 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] px-2.5 text-[12px] text-[var(--text-secondary)] outline-none focus:border-[var(--accent)]"
          >
            <option value="">Load course starter…</option>
            {PLAYGROUND_PRESETS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.course} · {p.title}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={handleInsertIntoNote}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[12px] font-medium text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] whitespace-nowrap"
          >
            {insertedNote ? <CheckCircle2 size={14} className="text-emerald-500" /> : <FilePlus2 size={14} />}
            <span>{insertedNote ? 'Inserted' : targetNote ? `Insert into Note` : 'Save as Note'}</span>
          </button>

          <button
            type="button"
            onClick={handleAskPip}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-[var(--accent-border)] bg-[var(--accent-soft)] text-[12px] font-semibold text-[var(--accent)] hover:brightness-95 whitespace-nowrap"
          >
            <Sparkles size={14} />
            <span>Ask Pip</span>
          </button>
        </div>
      </div>

      {/* 2-Zone Split Workbench */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Left: Editor & Controls */}
        <div className="lg:col-span-6 sf-card p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              aria-label="Snippet title"
              placeholder="Untitled derivation or snippet"
              className="min-w-0 flex-1 bg-transparent font-display text-[14.5px] font-semibold text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
            />
            <span className="text-[11px] font-mono text-[var(--text-muted)] whitespace-nowrap">
              {LANGUAGE_TABS.find((t) => t.id === language)?.hint}
            </span>
          </div>

          {language === 'math' && (
            <div className="space-y-2.5 pt-1 border-t border-[var(--border-subtle)]">
              <div className="flex flex-wrap items-center gap-1.5">
                {MATH_OPS.map((op) => (
                  <button
                    key={op.id}
                    type="button"
                    onClick={() => setMathOp(op.id)}
                    className={`px-2.5 py-1 rounded-md text-[12px] font-medium whitespace-nowrap border transition-colors ${
                      mathOp === op.id
                        ? 'border-[var(--accent-border)] bg-[var(--accent-soft)] text-[var(--accent)]'
                        : 'border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    {op.label}
                  </button>
                ))}
              </div>

              {(mathOp === 'derivative' || mathOp === 'integral') && (
                <div className="flex flex-wrap items-center gap-2 text-[12px]">
                  <label className="inline-flex items-center gap-1.5 text-[var(--text-secondary)]">
                    <span>Var</span>
                    <input
                      type="text"
                      value={mathVar}
                      onChange={(e) => setMathVar(e.target.value)}
                      className="w-12 h-7 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] px-2 font-mono text-[12px] text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
                    />
                  </label>
                  {mathOp === 'integral' && (
                    <>
                      <label className="inline-flex items-center gap-1.5 text-[var(--text-secondary)]">
                        <span>From</span>
                        <input
                          type="text"
                          value={mathLower}
                          onChange={(e) => setMathLower(e.target.value)}
                          className="w-16 h-7 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] px-2 font-mono text-[12px] text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
                        />
                      </label>
                      <label className="inline-flex items-center gap-1.5 text-[var(--text-secondary)]">
                        <span>To</span>
                        <input
                          type="text"
                          value={mathUpper}
                          onChange={(e) => setMathUpper(e.target.value)}
                          className="w-16 h-7 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] px-2 font-mono text-[12px] text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
                        />
                      </label>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          <div>
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                  e.preventDefault();
                  void handleRun();
                } else if (e.key === 'Tab') {
                  e.preventDefault();
                  const el = e.currentTarget;
                  const start = el.selectionStart;
                  const end = el.selectionEnd;
                  const next = `${code.slice(0, start)}  ${code.slice(end)}`;
                  setCode(next);
                  window.requestAnimationFrame(() => {
                    el.selectionStart = el.selectionEnd = start + 2;
                  });
                }
              }}
              spellCheck={false}
              rows={language === 'math' ? 5 : 13}
              aria-label="Code or math expression editor"
              placeholder={
                language === 'math'
                  ? 'Enter an expression, e.g. x^3 * y^2 + sin(2*x)'
                  : `Write ${language} code here…`
              }
              className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] p-3 font-mono text-[13px] leading-relaxed text-[var(--text-primary)] outline-none focus:border-[var(--accent)] resize-y"
            />
          </div>

          {/* Expected Answer / Correctness Check */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
            <input
              type="text"
              value={expected}
              onChange={(e) => setExpected(e.target.value)}
              aria-label="Expected answer or output check"
              placeholder={
                language === 'math'
                  ? 'Optional answer check (e.g. 3*x^2*y^2 + 2*cos(2*x) - 4*y)'
                  : 'Optional expected stdout / assertion substring'
              }
              className="min-w-0 flex-1 h-9 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] px-3 font-mono text-[12px] text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
            />
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  const fallback = presetsForLanguage[0];
                  if (fallback) applyPreset(fallback.id);
                }}
                title="Reset to starter"
                className="inline-flex items-center justify-center h-9 w-9 rounded-lg border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)]"
              >
                <RotateCcw size={14} />
              </button>
              <button
                type="button"
                disabled={running}
                onClick={() => void handleRun()}
                className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-[var(--accent)] text-[var(--accent-fg)] text-[12.5px] font-semibold hover:bg-[var(--accent-hover)] disabled:opacity-50 whitespace-nowrap"
              >
                {running ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
                <span>{language === 'cpp' ? 'Trace with Pip' : language === 'math' ? 'Solve & Check' : 'Run Code'}</span>
              </button>
            </div>
          </div>
          <p className="text-[11px] text-[var(--text-muted)]">
            Press <kbd className="font-mono px-1 py-0.5 rounded border border-[var(--border-subtle)]">Ctrl</kbd> +{' '}
            <kbd className="font-mono px-1 py-0.5 rounded border border-[var(--border-subtle)]">Enter</kbd> to run ·
            Math, JavaScript, SQL, and Python run locally. Python downloads its pinned runtime on first use. Run only code you trust; workers limit execution time, not access privileges.
          </p>
        </div>

        {/* Right: Formatted Output & Verification Panel */}
        <div className="lg:col-span-6 sf-card p-4 min-h-[360px] flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2 pb-2 border-b border-[var(--border-subtle)]">
            <div className="flex items-center gap-2 text-[13px] font-display font-semibold text-[var(--text-primary)]">
              {language === 'math' ? (
                <Sigma size={15} className="text-[var(--accent)]" />
              ) : language === 'sql' ? (
                <Database size={15} className="text-[var(--accent)]" />
              ) : language === 'cpp' ? (
                <Code2 size={15} className="text-[var(--accent)]" />
              ) : (
                <Terminal size={15} className="text-[var(--accent)]" />
              )}
              <span>Output &amp; Verification</span>
            </div>

            <div className="flex items-center gap-2 text-[11.5px] text-[var(--text-muted)] tabular-nums">
              {statusLabel && (
                <span className="inline-flex items-center gap-1.5 text-[var(--accent)]">
                  <Loader2 size={12} className="animate-spin" />
                  {statusLabel}
                </span>
              )}
              {mathResult && <span>{mathResult.durationMs} ms</span>}
              {codeResult && (
                <span>
                  {codeResult.runtimeLabel} · {codeResult.durationMs} ms
                </span>
              )}
            </div>
          </div>

          {/* Empty state */}
          {!running && !mathResult && !codeResult && !cppTrace && !cppError && (
            <div className="my-auto py-10 text-center space-y-2">
              <p className="text-[13.5px] font-medium text-[var(--text-secondary)]">
                Ready to run {LANGUAGE_TABS.find((t) => t.id === language)?.label}
              </p>
              <p className="text-[12px] text-[var(--text-muted)] max-w-sm mx-auto">
                Click <strong>{language === 'cpp' ? 'Trace with Pip' : language === 'math' ? 'Solve & Check' : 'Run Code'}</strong> to see rendered formulas, stdout, SQL tables, and automatic correctness checks.
              </p>
            </div>
          )}

          {/* Math Output */}
          {mathResult && (
            <div className="space-y-3">
              {mathResult.equivalent !== undefined && (
                <div
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-[12.5px] font-semibold ${
                    mathResult.equivalent
                      ? 'border-emerald-500/30 bg-emerald-500/8 text-emerald-700 dark:text-emerald-300'
                      : 'border-rose-500/30 bg-rose-500/8 text-rose-700 dark:text-rose-300'
                  }`}
                >
                  {mathResult.equivalent ? <CheckCircle2 size={15} /> : <XCircle size={15} />}
                  <span>{mathResult.equivalent ? 'Verified Match — Equivalent to expected answer' : 'Mismatch — Does not match expected answer'}</span>
                </div>
              )}

              {!mathResult.ok ? (
                <div className="rounded-lg border border-rose-500/30 bg-rose-500/8 p-3 text-[12.5px] text-rose-700 dark:text-rose-300 font-mono">
                  {mathResult.error}
                </div>
              ) : (
                <>
                  {inputTexHtml && (
                    <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] p-3 overflow-x-auto">
                      <div className="text-[10.5px] uppercase tracking-wider text-[var(--text-muted)] mb-1">
                        Expression
                      </div>
                      <div dangerouslySetInnerHTML={{ __html: inputTexHtml }} />
                    </div>
                  )}

                  <div className="rounded-xl border border-[var(--accent-border)] bg-[var(--accent-soft)]/40 p-3.5 overflow-x-auto">
                    <div className="text-[10.5px] uppercase tracking-wider text-[var(--text-muted)] mb-1">
                      Result
                    </div>
                    {outputTexHtml ? (
                      <div dangerouslySetInnerHTML={{ __html: outputTexHtml }} />
                    ) : (
                      <div className="font-mono text-[14px] font-semibold text-[var(--text-primary)]">
                        {mathResult.outputText}
                      </div>
                    )}
                    <div className="mt-2 pt-2 border-t border-[var(--border-subtle)] font-mono text-[11.5px] text-[var(--text-secondary)]">
                      Plain: {mathResult.outputText}
                    </div>
                  </div>

                  {mathResult.steps && mathResult.steps.length > 0 && (
                    <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] p-3 space-y-1.5">
                      <div className="text-[11px] font-semibold text-[var(--text-secondary)]">Derivation &amp; Checks</div>
                      <ul className="space-y-1 font-mono text-[11.5px] text-[var(--text-secondary)]">
                        {mathResult.steps.map((step, i) => (
                          <li key={i} className="break-words">
                            {step}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Code Output (Python / JS / SQL) */}
          {codeResult && (
            <div className="space-y-3">
              {codeResult.assertions?.map((a, idx) => (
                <div
                  key={idx}
                  className={`flex items-start gap-2 px-3 py-2 rounded-lg border text-[12.5px] ${
                    a.passed
                      ? 'border-emerald-500/30 bg-emerald-500/8 text-emerald-700 dark:text-emerald-300'
                      : 'border-rose-500/30 bg-rose-500/8 text-rose-700 dark:text-rose-300'
                  }`}
                >
                  {a.passed ? <CheckCircle2 size={15} className="shrink-0 mt-0.5" /> : <XCircle size={15} className="shrink-0 mt-0.5" />}
                  <div className="min-w-0">
                    <div className="font-semibold">
                      {a.passed ? 'Assertion Passed' : 'Assertion Failed'} · {a.label}
                    </div>
                    <div className="text-[11.5px] font-mono opacity-90 truncate">
                      Expected: {a.expected}
                    </div>
                  </div>
                </div>
              ))}

              {codeResult.stderr && (
                <div className="rounded-xl border border-rose-500/30 bg-rose-500/8 p-3">
                  <div className="text-[11px] font-semibold text-rose-700 dark:text-rose-300 mb-1">Errors</div>
                  <pre className="font-mono text-[12px] text-rose-700 dark:text-rose-300 whitespace-pre-wrap break-words">
                    {codeResult.stderr}
                  </pre>
                </div>
              )}

              {codeResult.stdout && (
                <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] p-3">
                  <div className="text-[11px] font-semibold text-[var(--text-secondary)] mb-1">Console Output</div>
                  <pre className="font-mono text-[12px] leading-relaxed text-[var(--text-primary)] whitespace-pre-wrap break-words max-h-64 overflow-auto">
                    {codeResult.stdout}
                  </pre>
                </div>
              )}

              {codeResult.returnValue && !codeResult.stdout.includes(codeResult.returnValue) && (
                <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] p-3">
                  <div className="text-[11px] font-semibold text-[var(--text-secondary)] mb-1">Return Value</div>
                  <pre className="font-mono text-[12px] text-[var(--text-primary)] whitespace-pre-wrap break-words">
                    {codeResult.returnValue}
                  </pre>
                </div>
              )}

              {codeResult.tables && codeResult.tables.length > 0 && (
                <div className="space-y-3">
                  {codeResult.tables.map((tbl, tIdx) => (
                    <div
                      key={tIdx}
                      className="rounded-xl border border-[var(--border-subtle)] overflow-x-auto bg-[var(--bg-surface)]"
                    >
                      <table className="w-full text-left border-collapse text-[12px] tabular-nums">
                        <thead>
                          <tr className="bg-[var(--bg-surface-subtle)] border-b border-[var(--border-subtle)]">
                            {tbl.columns.map((col, cIdx) => (
                              <th key={cIdx} className="px-3 py-2 font-semibold text-[var(--text-secondary)] whitespace-nowrap">
                                {col}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {tbl.values.map((row, rIdx) => (
                            <tr key={rIdx} className="border-b last:border-b-0 border-[var(--border-subtle)]">
                              {row.map((val, cIdx) => (
                                <td key={cIdx} className="px-3 py-1.5 font-mono text-[var(--text-primary)] whitespace-nowrap">
                                  {val === null || val === undefined ? 'NULL' : String(val)}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* C++ Pip Dry-Run Output */}
          {cppError && (
            <div className="rounded-lg border border-rose-500/30 bg-rose-500/8 p-3 text-[12.5px] text-rose-700 dark:text-rose-300">
              {cppError}
            </div>
          )}
          {cppTrace && (
            <div className="pip-markdown max-h-[420px] overflow-y-auto pr-1">
              <Suspense fallback={<p className="text-[12px] text-[var(--text-muted)]">Rendering analysis…</p>}>
                <AssistantMarkdown text={cppTrace} />
              </Suspense>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
