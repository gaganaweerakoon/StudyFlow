import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import {
  ArrowUpRight,
  CheckCircle2,
  Circle,
  Download,
  Eraser,
  FilePlus2,
  Grid,
  Loader2,
  MousePointer2,
  PenTool,
  Redo2,
  Sparkles,
  Square,
  Trash2,
  Type,
  Undo2,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useAssistant } from '../assistant/AssistantContext';
import { sanitizeSvgDiagram } from '../assistant/svgDiagram';
import type { StudyLabLaunchState } from '../types/studyflow';

type ToolMode = 'select' | 'pen' | 'arrow' | 'rect' | 'ellipse' | 'text' | 'eraser';

type BoardShape =
  | { id: string; kind: 'path'; points: Array<[number, number]>; color: string; width: number }
  | { id: string; kind: 'arrow'; x1: number; y1: number; x2: number; y2: number; color: string; width: number }
  | { id: string; kind: 'rect'; x: number; y: number; w: number; h: number; color: string; width: number }
  | { id: string; kind: 'ellipse'; cx: number; cy: number; rx: number; ry: number; color: string; width: number }
  | { id: string; kind: 'text'; x: number; y: number; text: string; color: string };

const BOARD_W = 960;
const BOARD_H = 560;

const INK_SWATCHES = [
  { label: 'Slate', value: '#1e293b' },
  { label: 'Indigo', value: '#4f46e5' },
  { label: 'Emerald', value: '#059669' },
  { label: 'Amber', value: '#d97706' },
  { label: 'Rose', value: '#e11d48' },
  { label: 'Cyan', value: '#0284c7' },
];

const DIAGRAM_PRESETS = [
  {
    label: 'NP-Completeness Reduction',
    prompt: 'Create a clean academic SVG flowchart showing polynomial-time reduction 3-SAT <=p CLIQUE <=p VERTEX-COVER with clear boxes, labeled arrows, and a legend.',
  },
  {
    label: 'Reaction Coordinate Graph',
    prompt: 'Draw an organic chemistry SN1 vs SN2 reaction coordinate energy diagram in SVG showing Reactants, Transition States, Carbocation Intermediate, Activation Energy (Ea), and Products.',
  },
  {
    label: 'Neural Action Potential',
    prompt: 'Draw a neuroscience SVG diagram of an action potential graph (Resting -70mV, Threshold -55mV, Depolarization Na+ influx, Repolarization K+ efflux, Hyperpolarization) with clean axes and labels.',
  },
  {
    label: 'AVL Tree Rotation',
    prompt: 'Draw an algorithms SVG diagram illustrating an AVL Left-Right (LR) double rotation with clearly labeled nodes, balance factors, and transformation arrows.',
  },
];

function extractSvgMarkup(raw: string): string | null {
  const fenced = raw.match(/```(?:svg|xml|html)?\s*\n([\s\S]*?<svg[\s\S]*?<\/svg>)\s*\n```/i);
  const candidate = fenced?.[1] ?? raw.match(/<svg[\s\S]*?<\/svg>/i)?.[0];
  return candidate ? sanitizeSvgDiagram(candidate) : null;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function serializeBoardToSvg(shapes: BoardShape[], backgroundSvg: string | null): string {
  const parts: string[] = [];
  if (backgroundSvg) {
    const inner = backgroundSvg
      .replace(/^<svg[^>]*>/i, '')
      .replace(/<\/svg>\s*$/i, '');
    const vbMatch = backgroundSvg.match(/viewBox=["']([^"']+)["']/i);
    const vbAttr = vbMatch ? ` viewBox="${vbMatch[1]}"` : '';
    parts.push(`<svg x="0" y="0" width="${BOARD_W}" height="${BOARD_H}"${vbAttr} preserveAspectRatio="xMidYMid meet">${inner}</svg>`);
  }
  for (const s of shapes) {
    if (s.kind === 'path' && s.points.length > 1) {
      const d = s.points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
      parts.push(`<path d="${d}" fill="none" stroke="${s.color}" stroke-width="${s.width}" stroke-linecap="round" stroke-linejoin="round" />`);
    } else if (s.kind === 'arrow') {
      const angle = Math.atan2(s.y2 - s.y1, s.x2 - s.x1);
      const head = 12;
      const hx1 = s.x2 - head * Math.cos(angle - Math.PI / 6);
      const hy1 = s.y2 - head * Math.sin(angle - Math.PI / 6);
      const hx2 = s.x2 - head * Math.cos(angle + Math.PI / 6);
      const hy2 = s.y2 - head * Math.sin(angle + Math.PI / 6);
      parts.push(
        `<g stroke="${s.color}" stroke-width="${s.width}" stroke-linecap="round">` +
          `<line x1="${s.x1.toFixed(1)}" y1="${s.y1.toFixed(1)}" x2="${s.x2.toFixed(1)}" y2="${s.y2.toFixed(1)}" />` +
          `<line x1="${s.x2.toFixed(1)}" y1="${s.y2.toFixed(1)}" x2="${hx1.toFixed(1)}" y2="${hy1.toFixed(1)}" />` +
          `<line x1="${s.x2.toFixed(1)}" y1="${s.y2.toFixed(1)}" x2="${hx2.toFixed(1)}" y2="${hy2.toFixed(1)}" />` +
        `</g>`,
      );
    } else if (s.kind === 'rect') {
      parts.push(
        `<rect x="${s.x.toFixed(1)}" y="${s.y.toFixed(1)}" width="${s.w.toFixed(1)}" height="${s.h.toFixed(1)}" rx="8" fill="none" stroke="${s.color}" stroke-width="${s.width}" />`,
      );
    } else if (s.kind === 'ellipse') {
      parts.push(
        `<ellipse cx="${s.cx.toFixed(1)}" cy="${s.cy.toFixed(1)}" rx="${s.rx.toFixed(1)}" ry="${s.ry.toFixed(1)}" fill="none" stroke="${s.color}" stroke-width="${s.width}" />`,
      );
    } else if (s.kind === 'text') {
      parts.push(
        `<text x="${s.x.toFixed(1)}" y="${s.y.toFixed(1)}" fill="${s.color}" font-family="Inter, system-ui, sans-serif" font-size="16" font-weight="600">${escapeXml(s.text)}</text>`,
      );
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${BOARD_W} ${BOARD_H}" width="${BOARD_W}" height="${BOARD_H}"><rect width="100%" height="100%" fill="#ffffff" />${parts.join('')}</svg>`;
}

export function WhiteboardStudio({ launch }: { launch?: StudyLabLaunchState | null }) {
  const app = useApp();
  const assistant = useAssistant();
  const svgRef = useRef<SVGSVGElement>(null);

  const [tool, setTool] = useState<ToolMode>('pen');
  const [color, setColor] = useState(INK_SWATCHES[1].value);
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [showGrid, setShowGrid] = useState(true);
  const [diagramTitle, setDiagramTitle] = useState('Concept Diagram');

  const [shapes, setShapes] = useState<BoardShape[]>([]);
  const [redoStack, setRedoStack] = useState<BoardShape[][]>([]);
  const [undoStack, setUndoStack] = useState<BoardShape[][]>([]);
  const [draftShape, setDraftShape] = useState<BoardShape | null>(null);
  const [backgroundSvg, setBackgroundSvg] = useState<string | null>(null);
  const [pendingTextPos, setPendingTextPos] = useState<{ x: number; y: number } | null>(null);
  const [textInput, setTextInput] = useState('');

  // Pip SVG generator state
  const [prompt, setPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState('');
  const [generatedPreview, setGeneratedPreview] = useState<string | null>(null);
  const [savedNotice, setSavedNotice] = useState('');

  useEffect(() => {
    if (!launch || launch.tab !== 'whiteboard') return;
    if (launch.title) setDiagramTitle(launch.title);
    if (launch.svg) {
      const clean = sanitizeSvgDiagram(launch.svg);
      if (clean) {
        setBackgroundSvg(clean);
        setGeneratedPreview(clean);
      }
    }
  }, [launch]);

  useEffect(() => {
    if (!savedNotice) return;
    const t = window.setTimeout(() => setSavedNotice(''), 2400);
    return () => window.clearTimeout(t);
  }, [savedNotice]);

  const targetNote = useMemo(() => {
    if (launch?.targetNoteId) return app.notes.find((n) => n.id === launch.targetNoteId);
    return app.notes.find((n) => n.id === app.selectedNoteId);
  }, [app.notes, app.selectedNoteId, launch?.targetNoteId]);

  const targetQuizContext = useMemo(() => {
    if (!launch?.targetQuizId || !launch?.targetQuestionId) return null;
    const quiz = app.quizzes.find((q) => q.id === launch.targetQuizId);
    const question = quiz?.questions.find((q) => q.id === launch.targetQuestionId);
    return quiz && question ? { quiz, question } : null;
  }, [app.quizzes, launch?.targetQuestionId, launch?.targetQuizId]);

  function getPoint(e: ReactPointerEvent<SVGSVGElement>): [number, number] {
    const svg = svgRef.current;
    if (!svg) return [0, 0];
    const rect = svg.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * BOARD_W;
    const y = ((e.clientY - rect.top) / rect.height) * BOARD_H;
    return [Math.max(0, Math.min(BOARD_W, x)), Math.max(0, Math.min(BOARD_H, y))];
  }

  function pushShapes(next: BoardShape[]) {
    setUndoStack((prev) => [...prev.slice(-24), shapes]);
    setRedoStack([]);
    setShapes(next);
  }

  function handleUndo() {
    if (!undoStack.length) return;
    const prev = undoStack[undoStack.length - 1];
    setUndoStack((s) => s.slice(0, -1));
    setRedoStack((r) => [...r, shapes]);
    setShapes(prev);
  }

  function handleRedo() {
    if (!redoStack.length) return;
    const next = redoStack[redoStack.length - 1];
    setRedoStack((r) => r.slice(0, -1));
    setUndoStack((u) => [...u, shapes]);
    setShapes(next);
  }

  function eraseNear(px: number, py: number) {
    const hit = shapes.findIndex((s) => {
      if (s.kind === 'path') {
        return s.points.some(([x, y]) => Math.hypot(x - px, y - py) < 16);
      }
      if (s.kind === 'arrow') {
        const midX = (s.x1 + s.x2) / 2;
        const midY = (s.y1 + s.y2) / 2;
        return Math.hypot(s.x1 - px, s.y1 - py) < 18 || Math.hypot(s.x2 - px, s.y2 - py) < 18 || Math.hypot(midX - px, midY - py) < 22;
      }
      if (s.kind === 'rect') {
        return px >= s.x - 10 && px <= s.x + s.w + 10 && py >= s.y - 10 && py <= s.y + s.h + 10;
      }
      if (s.kind === 'ellipse') {
        return Math.hypot((px - s.cx) / Math.max(12, s.rx), (py - s.cy) / Math.max(12, s.ry)) <= 1.15;
      }
      if (s.kind === 'text') {
        return Math.abs(px - s.x) < 120 && Math.abs(py - s.y) < 20;
      }
      return false;
    });
    if (hit >= 0) {
      pushShapes(shapes.filter((_, idx) => idx !== hit));
    }
  }

  function onPointerDown(e: ReactPointerEvent<SVGSVGElement>) {
    const [x, y] = getPoint(e);
    if (tool === 'select') return;
    if (tool === 'eraser') {
      eraseNear(x, y);
      return;
    }
    if (tool === 'text') {
      setPendingTextPos({ x, y });
      setTextInput('');
      return;
    }
    e.currentTarget.setPointerCapture(e.pointerId);
    const id = crypto.randomUUID();
    if (tool === 'pen') {
      setDraftShape({ id, kind: 'path', points: [[x, y]], color, width: strokeWidth });
    } else if (tool === 'arrow') {
      setDraftShape({ id, kind: 'arrow', x1: x, y1: y, x2: x, y2: y, color, width: strokeWidth });
    } else if (tool === 'rect') {
      setDraftShape({ id, kind: 'rect', x, y, w: 0, h: 0, color, width: strokeWidth });
    } else if (tool === 'ellipse') {
      setDraftShape({ id, kind: 'ellipse', cx: x, cy: y, rx: 0, ry: 0, color, width: strokeWidth });
    }
  }

  function onPointerMove(e: ReactPointerEvent<SVGSVGElement>) {
    if (!draftShape) return;
    const [x, y] = getPoint(e);
    if (draftShape.kind === 'path') {
      setDraftShape({ ...draftShape, points: [...draftShape.points, [x, y]] });
    } else if (draftShape.kind === 'arrow') {
      setDraftShape({ ...draftShape, x2: x, y2: y });
    } else if (draftShape.kind === 'rect') {
      setDraftShape({ ...draftShape, w: Math.max(4, x - draftShape.x), h: Math.max(4, y - draftShape.y) });
    } else if (draftShape.kind === 'ellipse') {
      setDraftShape({ ...draftShape, rx: Math.max(4, Math.abs(x - draftShape.cx)), ry: Math.max(4, Math.abs(y - draftShape.cy)) });
    }
  }

  function onPointerUp() {
    if (!draftShape) return;
    pushShapes([...shapes, draftShape]);
    setDraftShape(null);
  }

  function commitTextLabel() {
    const clean = textInput.trim();
    if (pendingTextPos && clean) {
      pushShapes([
        ...shapes,
        { id: crypto.randomUUID(), kind: 'text', x: pendingTextPos.x, y: pendingTextPos.y, text: clean, color },
      ]);
    }
    setPendingTextPos(null);
    setTextInput('');
  }

  async function handleGenerateSvg(customPrompt?: string) {
    const q = (customPrompt ?? prompt).trim();
    if (!q || generating) return;
    setGenerating(true);
    setGenError('');
    try {
      const fullPrompt = [
        'Generate a clean, publication-grade educational SVG diagram for a university STEM student.',
        'Requirements:',
        '- Return ONLY a single self-contained ```svg ... ``` block with viewBox="0 0 960 560" and a crisp white background.',
        '- Put explicit fill, stroke, stroke-width, rx, font-size, font-weight, and text-anchor attributes directly on each element (do NOT use <style> tags or CSS classes). Always set fill="none" on open connector <path> or <polyline> lines.',
        '- Use readable typography (font-size 13-18, sans-serif), generous box widths/padding so text never overflows, plain Unicode math inside <text> (no raw $...$ LaTeX), high contrast colors (#1e293b, #4f46e5, #059669, #d97706, #e11d48), and clean arrow markers.',
        '- No external fonts, no <script>, no foreignObject, no inline event handlers.',
        '',
        `Diagram request: ${q}`,
      ].join('\n');
      const reply = await assistant.generateText(fullPrompt);
      const svg = extractSvgMarkup(reply);
      if (!svg) {
        throw new Error('Pip did not return a valid SVG diagram. Try describing the layout more specifically.');
      }
      setGeneratedPreview(svg);
      setBackgroundSvg(svg);
      if (!diagramTitle || diagramTitle === 'Concept Diagram') {
        setDiagramTitle(q.slice(0, 56));
      }
    } catch (err) {
      setGenError(err instanceof Error ? err.message : 'Could not generate diagram.');
    } finally {
      setGenerating(false);
    }
  }

  function getComposedSvg(): string {
    const raw = serializeBoardToSvg(shapes, backgroundSvg);
    return sanitizeSvgDiagram(raw) ?? raw;
  }

  function handleDownloadSvg() {
    const svg = getComposedSvg();
    const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(diagramTitle || 'studyflow-diagram').toLowerCase().replace(/[^a-z0-9]+/g, '-')}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleInsertIntoNote() {
    const svg = getComposedSvg();
    const heading = diagramTitle.trim() || 'Study Diagram';
    const block = `\n\n### ${heading}\n\n\`\`\`svg\n${svg}\n\`\`\`\n`;
    if (targetNote) {
      app.updateNote(targetNote.id, {
        content: `${targetNote.content.trimEnd()}${block}`,
        updatedAt: 'Just now',
      });
      setSavedNotice(`Inserted into “${targetNote.title}”`);
      app.pushToast(`Diagram inserted into “${targetNote.title}”`);
    } else {
      app.createNote(app.subjects[0]?.id ?? '', 'fld-all', {
        title: heading,
        content: `### ${heading}\n\n\`\`\`svg\n${svg}\n\`\`\`\n`,
        tags: ['Diagram'],
      });
      setSavedNotice('Saved as new note');
      app.pushToast('Diagram saved as a new note');
    }
  }

  function handleAttachToPracticeQuestion() {
    if (!targetQuizContext) return;
    const svg = getComposedSvg();
    const existing = targetQuizContext.question.explanation.trim();
    const nextExplanation = `${existing}\n\n\`\`\`svg\n${svg}\n\`\`\``;
    app.updateQuizQuestionExplanation(
      targetQuizContext.quiz.id,
      targetQuizContext.question.id,
      nextExplanation,
    );
    setSavedNotice('Attached to Practice Test explanation');
    app.pushToast('Diagram attached to practice explanation');
  }

  const bgPreviewSrc = useMemo(
    () => (backgroundSvg ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(backgroundSvg)}` : null),
    [backgroundSvg],
  );

  const allShapes = draftShape ? [...shapes, draftShape] : shapes;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">
      {/* Main Interactive Whiteboard */}
      <div className="xl:col-span-8 sf-card p-3.5 space-y-3">
        {/* Drawing Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-[var(--border-subtle)]">
          <div className="flex flex-wrap items-center gap-1" role="toolbar" aria-label="Whiteboard tools">
            {(
              [
                { id: 'select', icon: MousePointer2, label: 'Select' },
                { id: 'pen', icon: PenTool, label: 'Pen' },
                { id: 'arrow', icon: ArrowUpRight, label: 'Arrow' },
                { id: 'rect', icon: Square, label: 'Box' },
                { id: 'ellipse', icon: Circle, label: 'Ellipse' },
                { id: 'text', icon: Type, label: 'Text' },
                { id: 'eraser', icon: Eraser, label: 'Eraser' },
              ] as Array<{ id: ToolMode; icon: typeof PenTool; label: string }>
            ).map((item) => {
              const Icon = item.icon;
              const active = tool === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  title={item.label}
                  aria-label={item.label}
                  aria-pressed={active}
                  onClick={() => setTool(item.id)}
                  className={`inline-flex items-center gap-1 h-8 px-2.5 rounded-lg text-[12px] font-medium whitespace-nowrap transition-colors ${
                    active
                      ? 'bg-[var(--accent)] text-[var(--accent-fg)]'
                      : 'text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <Icon size={14} />
                  <span className="hidden sm:inline">{item.label}</span>
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Ink Swatches */}
            <div className="flex items-center gap-1" aria-label="Stroke color">
              {INK_SWATCHES.map((swatch) => (
                <button
                  key={swatch.value}
                  type="button"
                  title={swatch.label}
                  aria-label={`${swatch.label} ink`}
                  onClick={() => setColor(swatch.value)}
                  className={`w-5 h-5 rounded-full transition-transform ${
                    color === swatch.value ? 'ring-2 ring-offset-2 ring-[var(--accent)] scale-110' : 'opacity-80 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: swatch.value }}
                />
              ))}
            </div>

            <select
              aria-label="Stroke width"
              value={strokeWidth}
              onChange={(e) => setStrokeWidth(Number(e.target.value))}
              className="h-7 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] px-1.5 text-[11.5px] text-[var(--text-secondary)]"
            >
              <option value={2}>Thin</option>
              <option value={3}>Medium</option>
              <option value={5}>Bold</option>
            </select>

            <button
              type="button"
              onClick={() => setShowGrid((g) => !g)}
              aria-pressed={showGrid}
              title="Toggle grid"
              className={`inline-flex items-center justify-center w-8 h-8 rounded-lg border ${
                showGrid
                  ? 'border-[var(--accent-border)] bg-[var(--accent-soft)] text-[var(--accent)]'
                  : 'border-[var(--border-subtle)] text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)]'
              }`}
            >
              <Grid size={14} />
            </button>
            <button
              type="button"
              disabled={!undoStack.length}
              onClick={handleUndo}
              title="Undo"
              className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)] disabled:opacity-35"
            >
              <Undo2 size={14} />
            </button>
            <button
              type="button"
              disabled={!redoStack.length}
              onClick={handleRedo}
              title="Redo"
              className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)] disabled:opacity-35"
            >
              <Redo2 size={14} />
            </button>
            <button
              type="button"
              disabled={!shapes.length && !backgroundSvg}
              onClick={() => {
                pushShapes([]);
                setBackgroundSvg(null);
              }}
              title="Clear whiteboard"
              className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-rose-600 hover:bg-[var(--bg-surface-hover)] disabled:opacity-35"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        {/* Interactive SVG Canvas */}
        <div className="relative rounded-xl border border-[var(--border-subtle)] bg-white overflow-hidden">
          {bgPreviewSrc && (
            <img
              src={bgPreviewSrc}
              alt="Pip diagram background layer"
              className="absolute inset-0 w-full h-full object-contain pointer-events-none select-none"
            />
          )}

          <svg
            ref={svgRef}
            viewBox={`0 0 ${BOARD_W} ${BOARD_H}`}
            className="relative z-10 block w-full h-auto touch-none select-none"
            style={{
              aspectRatio: `${BOARD_W} / ${BOARD_H}`,
              cursor: tool === 'select' ? 'default' : tool === 'text' ? 'text' : 'crosshair',
            }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
          >
            {showGrid && !bgPreviewSrc && (
              <defs>
                <pattern id="sf-wb-grid" width="24" height="24" patternUnits="userSpaceOnUse">
                  <circle cx="1.5" cy="1.5" r="1" fill="#cbd5e1" />
                </pattern>
              </defs>
            )}
            {showGrid && !bgPreviewSrc && <rect width={BOARD_W} height={BOARD_H} fill="url(#sf-wb-grid)" />}

            {allShapes.map((s) => {
              if (s.kind === 'path' && s.points.length > 1) {
                const d = s.points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x} ${y}`).join(' ');
                return (
                  <path
                    key={s.id}
                    d={d}
                    fill="none"
                    stroke={s.color}
                    strokeWidth={s.width}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                );
              }
              if (s.kind === 'arrow') {
                const angle = Math.atan2(s.y2 - s.y1, s.x2 - s.x1);
                const head = 12;
                const hx1 = s.x2 - head * Math.cos(angle - Math.PI / 6);
                const hy1 = s.y2 - head * Math.sin(angle - Math.PI / 6);
                const hx2 = s.x2 - head * Math.cos(angle + Math.PI / 6);
                const hy2 = s.y2 - head * Math.sin(angle + Math.PI / 6);
                return (
                  <g key={s.id} stroke={s.color} strokeWidth={s.width} strokeLinecap="round">
                    <line x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} />
                    <line x1={s.x2} y1={s.y2} x2={hx1} y2={hy1} />
                    <line x1={s.x2} y1={s.y2} x2={hx2} y2={hy2} />
                  </g>
                );
              }
              if (s.kind === 'rect') {
                return (
                  <rect
                    key={s.id}
                    x={s.x}
                    y={s.y}
                    width={s.w}
                    height={s.h}
                    rx={8}
                    fill="none"
                    stroke={s.color}
                    strokeWidth={s.width}
                  />
                );
              }
              if (s.kind === 'ellipse') {
                return (
                  <ellipse
                    key={s.id}
                    cx={s.cx}
                    cy={s.cy}
                    rx={s.rx}
                    ry={s.ry}
                    fill="none"
                    stroke={s.color}
                    strokeWidth={s.width}
                  />
                );
              }
              if (s.kind === 'text') {
                return (
                  <text
                    key={s.id}
                    x={s.x}
                    y={s.y}
                    fill={s.color}
                    fontFamily="Inter, system-ui, sans-serif"
                    fontSize={16}
                    fontWeight={600}
                  >
                    {s.text}
                  </text>
                );
              }
              return null;
            })}
          </svg>

          {pendingTextPos && (
            <form
              className="absolute z-20 flex items-center gap-1.5 rounded-lg border border-[var(--accent)] bg-[var(--bg-surface)] p-1.5 shadow-md"
              style={{
                left: `${Math.min(72, (pendingTextPos.x / BOARD_W) * 100)}%`,
                top: `${Math.min(82, (pendingTextPos.y / BOARD_H) * 100)}%`,
              }}
              onSubmit={(e) => {
                e.preventDefault();
                commitTextLabel();
              }}
            >
              <input
                type="text"
                autoFocus
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') setPendingTextPos(null);
                }}
                placeholder="Label text…"
                className="w-40 bg-transparent px-1.5 text-[12.5px] text-[var(--text-primary)] outline-none"
              />
              <button
                type="submit"
                className="px-2 py-0.5 rounded bg-[var(--accent)] text-[var(--accent-fg)] text-[11.5px] font-semibold"
              >
                Add
              </button>
            </form>
          )}
        </div>

        {/* Export & Insert Footer */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <input
            type="text"
            value={diagramTitle}
            onChange={(e) => setDiagramTitle(e.target.value)}
            aria-label="Diagram title"
            placeholder="Diagram title"
            className="min-w-[180px] flex-1 h-8 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] px-2.5 text-[12.5px] text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
          />

          <div className="flex flex-wrap items-center gap-2">
            {savedNotice && (
              <span className="inline-flex items-center gap-1 text-[12px] font-medium text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 size={14} />
                {savedNotice}
              </span>
            )}
            {targetQuizContext && (
              <button
                type="button"
                onClick={handleAttachToPracticeQuestion}
                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-[var(--accent)] text-[var(--accent-fg)] text-[12px] font-semibold hover:bg-[var(--accent-hover)] whitespace-nowrap"
              >
                <FilePlus2 size={14} />
                <span>Attach to Practice Explanation</span>
              </button>
            )}
            <button
              type="button"
              onClick={handleInsertIntoNote}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-[var(--accent-border)] bg-[var(--accent-soft)] text-[var(--accent)] text-[12px] font-semibold hover:brightness-95 whitespace-nowrap"
            >
              <FilePlus2 size={14} />
              <span>{targetNote ? 'Insert into Note' : 'Save to Notes'}</span>
            </button>
            <button
              type="button"
              onClick={handleDownloadSvg}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[12px] font-medium text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] whitespace-nowrap"
            >
              <Download size={14} />
              <span>Export SVG</span>
            </button>
          </div>
        </div>
      </div>

      {/* Right Dock: Pip SVG Diagram Generator */}
      <div className="xl:col-span-4 sf-card p-4 space-y-3.5">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2 font-display text-[14px] font-semibold text-[var(--text-primary)]">
            <Sparkles size={15} className="text-[var(--accent)]" />
            <span>Pip SVG Diagram Generator</span>
          </div>
          <p className="text-[12px] text-[var(--text-muted)]">
            Describe a flowchart, reaction mechanism, circuit, or proof graph. Pip renders a crisp SVG directly onto your canvas.
          </p>
        </div>

        <form
          className="space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            void handleGenerateSvg();
          }}
        >
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={4}
            aria-label="Describe the diagram you want Pip to draw"
            placeholder="e.g. Draw a clean flowchart of Dijkstra's algorithm with priority queue updates and complexity annotations…"
            className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] p-2.5 text-[12.5px] leading-relaxed text-[var(--text-primary)] outline-none focus:border-[var(--accent)] resize-none"
          />
          <button
            type="submit"
            disabled={generating || !prompt.trim()}
            className="w-full inline-flex items-center justify-center gap-1.5 h-9 rounded-lg bg-[var(--accent)] text-[var(--accent-fg)] text-[12.5px] font-semibold hover:bg-[var(--accent-hover)] disabled:opacity-50"
          >
            {generating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            <span>{generating ? 'Generating SVG diagram…' : 'Generate & Place on Canvas'}</span>
          </button>
        </form>

        {genError && (
          <div className="rounded-lg border border-rose-500/30 bg-rose-500/8 p-2.5 text-[12px] text-rose-700 dark:text-rose-300">
            {genError}
          </div>
        )}

        <div className="space-y-1.5 pt-2 border-t border-[var(--border-subtle)]">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            Quick STEM Templates
          </div>
          <div className="grid gap-1.5">
            {DIAGRAM_PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                disabled={generating}
                onClick={() => {
                  setPrompt(preset.prompt);
                  setDiagramTitle(preset.label);
                  void handleGenerateSvg(preset.prompt);
                }}
                className="text-left px-2.5 py-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] hover:border-[var(--accent-border)] hover:bg-[var(--bg-surface-hover)] transition-colors disabled:opacity-50"
              >
                <div className="text-[12.5px] font-medium text-[var(--text-primary)]">{preset.label}</div>
                <div className="text-[11px] text-[var(--text-muted)] line-clamp-1">{preset.prompt}</div>
              </button>
            ))}
          </div>
        </div>

        {generatedPreview && (
          <div className="pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between gap-2 text-[11.5px] text-[var(--text-muted)]">
            <span>AI vector layer active on canvas</span>
            <button
              type="button"
              onClick={() => {
                setBackgroundSvg(null);
                setGeneratedPreview(null);
              }}
              className="text-rose-600 dark:text-rose-400 font-medium hover:underline"
            >
              Remove layer
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
