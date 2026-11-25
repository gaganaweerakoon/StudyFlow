import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Check, FileText, Layers, Play, Sparkles } from 'lucide-react';

export type ShowcaseSceneId = 'planner' | 'focus' | 'notes' | 'pip';

interface StudyFlowShowcaseStageProps {
  activeScene: ShowcaseSceneId;
  onSelectScene: (scene: ShowcaseSceneId) => void;
  cycleKey: number;
}

const STAGE_EASE = [0.16, 1, 0.3, 1] as const;

/* ========================================================================= */
/* SCENE 01: INTELLIGENT STUDY PLANNER & WEEKLY PACE                         */
/* ========================================================================= */
const PlannerScene: React.FC<{ reduced: boolean }> = ({ reduced }) => {
  const blocks = [
    {
      time: '09:00',
      duration: '90m',
      title: 'Organic Chemistry',
      detail: 'Reaction mechanisms · Ch. 7',
      color: '#818CF8',
      done: true,
    },
    {
      time: '11:30',
      duration: '60m',
      title: 'Linear Algebra',
      detail: 'Eigenvalues & orthogonality',
      color: '#34D399',
      active: true,
    },
    {
      time: '14:30',
      duration: '75m',
      title: 'Algorithms Lab',
      detail: 'Dynamic programming set',
      color: '#38BDF8',
      done: false,
    },
  ];

  return (
    <div className="w-full max-w-[520px] space-y-4">
      {/* Main Schedule Card */}
      <div
        className="rounded-2xl p-5 sm:p-6"
        style={{
          background: 'rgba(17, 23, 39, 0.88)',
          border: '1px solid rgba(255, 255, 255, 0.09)',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.42)',
        }}
      >
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/[0.07]">
          <div>
            <div className="text-[11px] font-medium text-slate-400">Tuesday · Week 9</div>
            <div className="font-display text-[17px] font-semibold text-white tracking-tight mt-0.5">
              Today’s Study Schedule
            </div>
          </div>
          <div className="text-right font-mono tabular-nums">
            <div className="text-[15px] font-semibold text-emerald-400">3h 45m</div>
            <div className="text-[11px] text-slate-400">94% on pace</div>
          </div>
        </div>

        <div className="space-y-2.5">
          {blocks.map((block, idx) => (
            <motion.div
              key={block.title}
              initial={reduced ? false : { opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.04 + idx * 0.06, duration: 0.28, ease: STAGE_EASE }}
              className="flex items-center gap-3.5 rounded-xl px-3.5 py-3"
              style={{
                background: block.active
                  ? 'rgba(52, 211, 153, 0.09)'
                  : 'rgba(255, 255, 255, 0.03)',
                border: block.active
                  ? '1px solid rgba(52, 211, 153, 0.28)'
                  : '1px solid rgba(255, 255, 255, 0.06)',
              }}
            >
              <div className="w-12 shrink-0 font-mono text-[12px] tabular-nums text-slate-400">
                {block.time}
              </div>
              <div
                className="w-1.5 h-8 rounded-full shrink-0"
                style={{ backgroundColor: block.color }}
              />
              <div className="min-w-0 flex-1">
                <div className="text-[13.5px] font-semibold text-white truncate">
                  {block.title}
                </div>
                <div className="text-[12px] text-slate-400 truncate">{block.detail}</div>
              </div>
              <div className="shrink-0 flex items-center gap-2">
                <span className="font-mono text-[11.5px] tabular-nums text-slate-400">
                  {block.duration}
                </span>
                {block.done ? (
                  <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-300 flex items-center justify-center">
                    <Check className="w-3 h-3" />
                  </span>
                ) : block.active ? (
                  <span className="text-[11px] font-medium text-emerald-300">Now</span>
                ) : null}
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Animated Weekly Adherence Sparkline Strip */}
      <div
        className="rounded-2xl px-5 py-4 flex items-center justify-between gap-6"
        style={{
          background: 'rgba(17, 23, 39, 0.72)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
        }}
      >
        <div className="shrink-0">
          <div className="text-[11px] text-slate-400">Weekly Mastery Trajectory</div>
          <div className="font-mono text-[14px] font-semibold text-white tabular-nums mt-0.5">
            26.5h <span className="text-slate-400 font-normal">/ 28h planned</span>
          </div>
        </div>

        <svg
          viewBox="0 0 210 52"
          fill="none"
          className="w-[180px] sm:w-[210px] h-[48px] shrink-0 overflow-visible"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="stage-spark" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#818CF8" />
              <stop offset="100%" stopColor="#34D399" />
            </linearGradient>
            <linearGradient id="stage-spark-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6366F1" stopOpacity="0.28" />
              <stop offset="100%" stopColor="#6366F1" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path
            d="M 6 42 C 36 39, 54 28, 86 24 C 118 20, 144 26, 174 14 C 188 9, 198 8, 204 6 L 204 48 L 6 48 Z"
            fill="url(#stage-spark-fill)"
          />
          <motion.path
            d="M 6 42 C 36 39, 54 28, 86 24 C 118 20, 144 26, 174 14 C 188 9, 198 8, 204 6"
            stroke="url(#stage-spark)"
            strokeWidth="2.5"
            strokeLinecap="round"
            initial={{ pathLength: reduced ? 1 : 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.85, ease: STAGE_EASE }}
          />
          <motion.circle
            cx="204"
            cy="6"
            r="4"
            fill="#34D399"
            initial={{ scale: reduced ? 1 : 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.65, duration: 0.25 }}
          />
        </svg>
      </div>
    </div>
  );
};

/* ========================================================================= */
/* SCENE 02: HOROLOGICAL DEEP FOCUS TIMER                                    */
/* ========================================================================= */
const FocusScene: React.FC<{ reduced: boolean }> = ({ reduced }) => {
  const [seconds, setSeconds] = useState(24 * 60 + 48);

  useEffect(() => {
    if (reduced) return;
    const id = window.setInterval(() => {
      setSeconds((prev) => (prev > 1 ? prev - 1 : 25 * 60));
    }, 1000);
    return () => window.clearInterval(id);
  }, [reduced]);

  const mins = String(Math.floor(seconds / 60)).padStart(2, '0');
  const secs = String(seconds % 60).padStart(2, '0');

  return (
    <div className="w-full max-w-[460px]">
      <div
        className="rounded-2xl p-6 sm:p-8 flex flex-col items-center text-center"
        style={{
          background: 'rgba(17, 23, 39, 0.88)',
          border: '1px solid rgba(255, 255, 255, 0.09)',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.42)',
        }}
      >
        <div className="text-[12px] text-slate-400">
          Deep Focus · Linear Algebra · Cycle 2 of 4
        </div>

        {/* Precision Animated SVG Timer Dial */}
        <div className="relative my-6 w-[224px] h-[224px] flex items-center justify-center">
          <svg
            viewBox="0 0 224 224"
            className="w-full h-full overflow-visible"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="focus-dial-grad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#818CF8" />
                <stop offset="60%" stopColor="#38BDF8" />
                <stop offset="100%" stopColor="#34D399" />
              </linearGradient>
            </defs>

            {/* 24 Precision Dial Ticks */}
            {Array.from({ length: 24 }).map((_, i) => {
              const angle = (i * 15 * Math.PI) / 180;
              const major = i % 6 === 0;
              const r1 = major ? 96 : 99;
              const r2 = 106;
              return (
                <line
                  key={i}
                  x1={112 + Math.cos(angle) * r1}
                  y1={112 + Math.sin(angle) * r1}
                  x2={112 + Math.cos(angle) * r2}
                  y2={112 + Math.sin(angle) * r2}
                  stroke="rgba(255,255,255,0.22)"
                  strokeWidth={major ? 1.8 : 1}
                  strokeLinecap="round"
                />
              );
            })}

            {/* Track */}
            <circle
              cx="112"
              cy="112"
              r="84"
              stroke="rgba(255,255,255,0.08)"
              strokeWidth="7"
              fill="none"
            />
            {/* Animated Sweep Arc */}
            <motion.circle
              cx="112"
              cy="112"
              r="84"
              stroke="url(#focus-dial-grad)"
              strokeWidth="7"
              strokeLinecap="round"
              fill="none"
              transform="rotate(-90 112 112)"
              initial={{ pathLength: reduced ? 0.78 : 0.16 }}
              animate={{ pathLength: 0.78 }}
              transition={{ duration: 0.9, ease: STAGE_EASE }}
            />
          </svg>

          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="font-mono text-[42px] font-semibold tracking-tight text-white tabular-nums leading-none">
              {mins}:{secs}
            </div>
            <div className="mt-2.5 flex items-center gap-1.5 text-[11.5px] text-emerald-300">
              <Play className="w-3 h-3 fill-current" />
              <span>Flow active</span>
            </div>
          </div>
        </div>

        {/* Bottom 4-Block Pomodoro Rhythm + Ambient Bars */}
        <div className="w-full pt-4 border-t border-white/[0.07] flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            {[0, 1, 2, 3].map((step) => (
              <span
                key={step}
                className="h-1.5 rounded-full transition-all"
                style={{
                  width: step === 1 ? 28 : 16,
                  backgroundColor:
                    step <= 1 ? '#818CF8' : 'rgba(255,255,255,0.14)',
                }}
              />
            ))}
          </div>

          <div className="flex items-end gap-1 h-4" aria-hidden="true">
            {[0.4, 0.9, 0.65, 1, 0.5].map((h, i) => (
              <motion.span
                key={i}
                className="w-1 rounded-full bg-sky-400/75"
                style={{ height: `${Math.round(h * 14)}px`, transformOrigin: 'bottom' }}
                animate={reduced ? {} : { scaleY: [0.45, 1, 0.5, 0.85, 0.45] }}
                transition={{
                  delay: i * 0.14,
                  duration: 1.9,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              />
            ))}
          </div>

          <div className="font-mono text-[11.5px] text-slate-400 tabular-nums">
            Rain Ambience
          </div>
        </div>
      </div>
    </div>
  );
};

/* ========================================================================= */
/* SCENE 03: SMART NOTES, PDF SCAN & MATH MARKDOWN                           */
/* ========================================================================= */
const NotesScene: React.FC<{ reduced: boolean }> = ({ reduced }) => (
  <div className="w-full max-w-[520px] space-y-4">
    <div
      className="rounded-2xl p-5 sm:p-6 relative overflow-hidden"
      style={{
        background: 'rgba(17, 23, 39, 0.88)',
        border: '1px solid rgba(255, 255, 255, 0.09)',
        boxShadow: '0 24px 60px rgba(0, 0, 0, 0.42)',
      }}
    >
      {/* Subtle Top Document Header */}
      <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/[0.07]">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="w-8 h-8 rounded-lg bg-indigo-500/15 text-indigo-300 flex items-center justify-center shrink-0">
            <FileText className="w-4 h-4" />
          </span>
          <div className="min-w-0">
            <div className="text-[13.5px] font-semibold text-white truncate">
              Electromagnetism — Lecture 12.pdf
            </div>
            <div className="text-[11.5px] text-slate-400">
              Converted to Markdown · LaTeX preserved
            </div>
          </div>
        </div>
        <span className="font-mono text-[11px] text-emerald-300 shrink-0">14 pages</span>
      </div>

      {/* Rendered Formula Block with Animated Scan Sweep */}
      <div
        className="relative rounded-xl px-5 py-4 mb-4 overflow-hidden text-center"
        style={{
          background: 'rgba(99, 102, 241, 0.11)',
          border: '1px solid rgba(129, 140, 248, 0.26)',
        }}
      >
        <div className="font-mono text-[20px] sm:text-[22px] font-medium tracking-wide text-indigo-100">
          ∮ E · dA = Q<sub className="text-[13px]">enc</sub> / ε<sub className="text-[13px]">0</sub>
        </div>
        <div className="text-[11.5px] text-indigo-300/80 mt-1">
          Gauss’s Law for Electric Flux · Closed Surface Integral
        </div>
        {!reduced && (
          <motion.div
            className="pointer-events-none absolute inset-y-0 w-24"
            style={{
              background:
                'linear-gradient(90deg, transparent, rgba(129,140,248,0.22), transparent)',
            }}
            animate={{ x: [-120, 520] }}
            transition={{ duration: 3.4, repeat: Infinity, repeatDelay: 1.4, ease: 'easeInOut' }}
          />
        )}
      </div>

      {/* Crisp Extracted Study Takeaways */}
      <div className="space-y-2.5 text-[13px] leading-relaxed text-slate-300">
        {[
          'Net electric flux depends strictly on total charge enclosed inside the Gaussian surface.',
          'Spherical, cylindrical, and planar symmetry simplify E to a constant outside the integral.',
        ].map((line, i) => (
          <motion.div
            key={line}
            initial={reduced ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.04 + i * 0.06, duration: 0.26, ease: STAGE_EASE }}
            className="flex items-start gap-2.5"
          >
            <span className="mt-2 w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />
            <span>{line}</span>
          </motion.div>
        ))}
      </div>
    </div>

    {/* Linked Active Recall Generation Preview */}
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.12, duration: 0.28, ease: STAGE_EASE }}
      className="rounded-2xl px-5 py-3.5 flex items-center justify-between gap-4"
      style={{
        background: 'rgba(17, 23, 39, 0.72)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
      }}
    >
      <div className="flex items-center gap-3 min-w-0">
        <Layers className="w-4 h-4 text-emerald-400 shrink-0" />
        <div className="text-[12.5px] text-slate-200 truncate">
          18 spaced-repetition flashcards extracted from this note
        </div>
      </div>
      <span className="font-mono text-[11.5px] text-emerald-300 shrink-0 tabular-nums">
        Ready
      </span>
    </motion.div>
  </div>
);

/* ========================================================================= */
/* SCENE 04: PIP AI STUDY COMPANION                                          */
/* ========================================================================= */
const PipScene: React.FC<{ reduced: boolean }> = ({ reduced }) => {
  const actions = [
    { label: 'Scheduled 4 revision blocks before Friday', tag: 'Planner' },
    { label: 'Created 12 active recall cards from Ch. 7 notes', tag: 'Flashcards' },
    { label: 'Generated a 15-minute diagnostic practice quiz', tag: 'Practice' },
  ];

  return (
    <div className="w-full max-w-[520px]">
      <div
        className="rounded-2xl p-5 sm:p-6 space-y-4"
        style={{
          background: 'rgba(17, 23, 39, 0.88)',
          border: '1px solid rgba(255, 255, 255, 0.09)',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.42)',
        }}
      >
        {/* Pip Header with Animated Geometric Mascot */}
        <div className="flex items-center justify-between pb-3.5 border-b border-white/[0.07]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/20 flex items-center justify-center shrink-0">
              <svg viewBox="0 0 48 44" className="w-6 h-6" aria-hidden="true">
                <path
                  d="M 8 10 L 14 2 L 20 8 L 28 8 L 34 2 L 40 10 C 44 14 45 21 44 29 C 43 37 36 42 24 42 C 12 42 5 37 4 29 C 3 21 4 14 8 10 Z"
                  fill="#818CF8"
                />
                <motion.ellipse
                  cx="17.5"
                  cy="23"
                  rx="3"
                  ry="3.4"
                  fill="#FFFFFF"
                  animate={reduced ? {} : { scaleY: [1, 1, 0.12, 1, 1] }}
                  transition={{
                    duration: 4,
                    times: [0, 0.85, 0.9, 0.94, 1],
                    repeat: Infinity,
                  }}
                  style={{ transformOrigin: '17.5px 23px' }}
                />
                <motion.ellipse
                  cx="30.5"
                  cy="23"
                  rx="3"
                  ry="3.4"
                  fill="#FFFFFF"
                  animate={reduced ? {} : { scaleY: [1, 1, 0.12, 1, 1] }}
                  transition={{
                    duration: 4,
                    times: [0, 0.85, 0.9, 0.94, 1],
                    repeat: Infinity,
                  }}
                  style={{ transformOrigin: '30.5px 23px' }}
                />
                <path
                  d="M 20.5 30 Q 24 33 27.5 30"
                  stroke="#FFFFFF"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  fill="none"
                />
              </svg>
            </div>
            <div>
              <div className="text-[13.5px] font-semibold text-white">Pip Study Coach</div>
              <div className="text-[11.5px] text-slate-400">
                Connected to your calendar, notes &amp; exams
              </div>
            </div>
          </div>
          <Sparkles className="w-4 h-4 text-indigo-300" />
        </div>

        {/* User Message */}
        <motion.div
          initial={reduced ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, ease: STAGE_EASE }}
          className="ml-auto max-w-[85%] rounded-2xl rounded-tr-sm px-4 py-3 text-[13px] text-white"
          style={{
            background: 'rgba(99, 102, 241, 0.24)',
            border: '1px solid rgba(129, 140, 248, 0.32)',
          }}
        >
          Analyze my Physics midterm syllabus PDF, fill my open afternoon slots, and prep flashcards.
        </motion.div>

        {/* Pip Action Execution Stream */}
        <div className="space-y-2">
          {actions.map((item, idx) => (
            <motion.div
              key={item.label}
              initial={reduced ? false : { opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.05 + idx * 0.07, duration: 0.26, ease: STAGE_EASE }}
              className="flex items-center justify-between gap-3 rounded-xl px-3.5 py-2.5"
              style={{
                background: 'rgba(255, 255, 255, 0.035)',
                border: '1px solid rgba(255, 255, 255, 0.07)',
              }}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-300 flex items-center justify-center shrink-0">
                  <Check className="w-3 h-3" />
                </span>
                <span className="text-[12.5px] text-slate-200 truncate">{item.label}</span>
              </div>
              <span className="text-[11px] font-mono text-slate-400 shrink-0">{item.tag}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export const StudyFlowShowcaseStage: React.FC<StudyFlowShowcaseStageProps> = ({
  activeScene,
  onSelectScene,
  cycleKey,
}) => {
  const prefersReduced = useReducedMotion() ?? false;

  const sceneCaption: Record<ShowcaseSceneId, { index: string; title: string; auraTop: string; auraBottom: string }> = {
    planner: {
      index: '01',
      title: 'Adaptive Weekly Planner',
      auraTop: 'rgba(99, 102, 241, 0.25)',
      auraBottom: 'rgba(16, 185, 129, 0.16)',
    },
    focus: {
      index: '02',
      title: 'Deep Focus Sessions',
      auraTop: 'rgba(56, 189, 248, 0.22)',
      auraBottom: 'rgba(99, 102, 241, 0.2)',
    },
    notes: {
      index: '03',
      title: 'PDF & LaTeX Smart Notes',
      auraTop: 'rgba(129, 140, 248, 0.24)',
      auraBottom: 'rgba(52, 211, 153, 0.14)',
    },
    pip: {
      index: '04',
      title: 'Pip AI Study Coach',
      auraTop: 'rgba(99, 102, 241, 0.26)',
      auraBottom: 'rgba(16, 185, 129, 0.18)',
    },
  };

  const sceneOrder: ShowcaseSceneId[] = ['planner', 'focus', 'notes', 'pip'];
  const currentMeta = sceneCaption[activeScene];

  return (
    <div
      className="relative w-full h-full min-h-[500px] lg:min-h-[640px] rounded-[28px] overflow-hidden flex flex-col justify-between p-6 sm:p-8 lg:p-10 select-none"
      style={{
        backgroundColor: '#0B0F1A',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        boxShadow: '0 24px 64px rgba(15, 23, 42, 0.16)',
      }}
    >
      {/* Subtle Ambient Architectural Glows & Dot Grid */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            'radial-gradient(rgba(148, 163, 184, 0.15) 1px, transparent 1px)',
          backgroundSize: '26px 26px',
          maskImage:
            'radial-gradient(ellipse 82% 76% at 50% 48%, black 30%, transparent 100%)',
        }}
      />
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 -right-24 w-[420px] h-[420px] rounded-full blur-[110px]"
        animate={
          prefersReduced
            ? { background: currentMeta.auraTop }
            : { background: currentMeta.auraTop, scale: [1, 1.07, 1], opacity: [0.24, 0.32, 0.24] }
        }
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-28 -left-20 w-[380px] h-[380px] rounded-full blur-[110px]"
        animate={
          prefersReduced
            ? { background: currentMeta.auraBottom }
            : { background: currentMeta.auraBottom, scale: [1.04, 0.96, 1.04], opacity: [0.16, 0.24, 0.16] }
        }
        transition={{ duration: 7.5, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Top Stage Caption */}
      <div className="relative z-10 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5 text-[12.5px] font-medium text-slate-300">
          <span className="font-mono text-indigo-300 tabular-nums">
            {currentMeta.index}
          </span>
          <span className="text-slate-600" aria-hidden="true">
            /
          </span>
          <span>{currentMeta.title}</span>
        </div>

        <div className="flex items-center gap-1.5" role="tablist" aria-label="Preview scenes">
          {sceneOrder.map((id) => {
            const active = activeScene === id;
            return (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={active}
                aria-label={sceneCaption[id].title}
                onClick={() => onSelectScene(id)}
                className="relative h-1.5 rounded-full overflow-hidden transition-all duration-300 cursor-pointer"
                style={{
                  width: active ? 32 : 10,
                  backgroundColor: 'rgba(255, 255, 255, 0.18)',
                }}
              >
                {active && (
                  <motion.span
                    key={`${id}-${cycleKey}`}
                    className="absolute inset-y-0 left-0 rounded-full bg-indigo-400"
                    initial={{ width: prefersReduced ? '100%' : '0%' }}
                    animate={{ width: '100%' }}
                    transition={{ duration: prefersReduced ? 0 : 5.2, ease: 'linear' }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Center Live Interactive Scene Theater */}
      <div className="relative z-10 flex-1 flex items-center justify-center py-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeScene}
            className="w-full flex justify-center"
            initial={prefersReduced ? false : { opacity: 0, y: 10, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={prefersReduced ? undefined : { opacity: 0, y: -8, scale: 0.99 }}
            transition={{ duration: 0.22, ease: STAGE_EASE }}
          >
            {activeScene === 'planner' && <PlannerScene reduced={prefersReduced} />}
            {activeScene === 'focus' && <FocusScene reduced={prefersReduced} />}
            {activeScene === 'notes' && <NotesScene reduced={prefersReduced} />}
            {activeScene === 'pip' && <PipScene reduced={prefersReduced} />}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom Quiet Architecture Note */}
      <div className="relative z-10 flex items-center justify-between text-[11.5px] text-slate-400 pt-2 border-t border-white/[0.06]">
        <span>Built for deep academic work</span>
        <span>Desktop · Web · Android Companion</span>
      </div>
    </div>
  );
};

export const StudyFlowHeroSvg = StudyFlowShowcaseStage;
