import React from 'react';
import { motion, useReducedMotion } from 'motion/react';

export const StudyFlowHeroSvg: React.FC = () => {
  const prefersReduced = useReducedMotion();

  const drawTransition = (delay: number, duration = 1.2) =>
    prefersReduced
      ? { duration: 0 }
      : { delay, duration, ease: [0.16, 1, 0.3, 1] as const };

  const floatAnim = (offset: number, duration: number) =>
    prefersReduced
      ? {}
      : {
          y: [0, offset, 0],
          transition: {
            duration,
            repeat: Infinity,
            ease: 'easeInOut' as const,
          },
        };

  return (
    <div className="relative w-full select-none">
      <svg
        role="img"
        aria-label="Animated preview of StudyFlow workspace showing weekly mastery chart, focus timer, math notes, flashcards, and Pip"
        viewBox="0 0 680 540"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-auto overflow-visible"
      >
        <defs>
          <linearGradient id="sf-accent-line" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.25" />
            <stop offset="50%" stopColor="var(--accent)" stopOpacity="1" />
            <stop offset="100%" stopColor="#10B981" stopOpacity="0.9" />
          </linearGradient>

          <linearGradient id="sf-chart-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.22" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
          </linearGradient>

          <linearGradient id="sf-ring-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--accent)" />
            <stop offset="100%" stopColor="#0EA5E9" />
          </linearGradient>

          <radialGradient id="sf-ambient-glow" cx="50%" cy="46%" r="50%">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.14" />
            <stop offset="65%" stopColor="var(--accent)" stopOpacity="0.03" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
          </radialGradient>

          <pattern id="sf-dot-grid" width="24" height="24" patternUnits="userSpaceOnUse">
            <circle cx="1.5" cy="1.5" r="1" fill="var(--border-strong)" fillOpacity="0.45" />
          </pattern>

          <filter id="sf-card-shadow" x="-12%" y="-12%" width="124%" height="130%">
            <feDropShadow dx="0" dy="10" stdDeviation="14" floodColor="#0F172A" floodOpacity="0.08" />
          </filter>
        </defs>

        {/* Subtle Architectural Dot Canvas + Soft Radial Wash */}
        <rect x="20" y="16" width="640" height="508" rx="28" fill="url(#sf-dot-grid)" />
        <ellipse cx="350" cy="260" rx="290" ry="220" fill="url(#sf-ambient-glow)" />

        {/* Orbital Connection Streams linking Notes -> Workspace -> Focus -> Flashcards */}
        <motion.path
          d="M 145 140 C 215 70, 385 52, 480 112"
          stroke="var(--border-strong)"
          strokeWidth="1.25"
          strokeDasharray="5 6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.7 }}
          transition={drawTransition(0.15, 0.8)}
        />
        <motion.path
          d="M 145 140 C 215 70, 385 52, 480 112"
          stroke="url(#sf-accent-line)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray="36 280"
          initial={{ strokeDashoffset: 316 }}
          animate={prefersReduced ? { strokeDashoffset: 0 } : { strokeDashoffset: [316, 0] }}
          transition={
            prefersReduced
              ? { duration: 0 }
              : { duration: 4.5, repeat: Infinity, ease: 'linear' }
          }
        />

        <motion.path
          d="M 155 408 C 250 478, 430 476, 520 402"
          stroke="var(--border-strong)"
          strokeWidth="1.25"
          strokeDasharray="5 6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.7 }}
          transition={drawTransition(0.25, 0.8)}
        />
        <motion.path
          d="M 155 408 C 250 478, 430 476, 520 402"
          stroke="url(#sf-accent-line)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray="42 320"
          initial={{ strokeDashoffset: 0 }}
          animate={prefersReduced ? { strokeDashoffset: 0 } : { strokeDashoffset: [0, -362] }}
          transition={
            prefersReduced
              ? { duration: 0 }
              : { duration: 5.2, repeat: Infinity, ease: 'linear' }
          }
        />

        {/* MAIN CENTERPIECE: Study Trajectory & Schedule Board */}
        <motion.g
          filter="url(#sf-card-shadow)"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={drawTransition(0.1, 0.75)}
        >
          <rect
            x="116"
            y="108"
            width="440"
            height="292"
            rx="20"
            fill="var(--bg-surface)"
            stroke="var(--border-subtle)"
            strokeWidth="1.25"
          />

          {/* Top Window Bar */}
          <line
            x1="116"
            y1="154"
            x2="556"
            y2="154"
            stroke="var(--border-subtle)"
            strokeWidth="1"
          />
          <rect x="140" y="124" width="16" height="16" rx="5" fill="var(--accent)" />
          <text
            x="148"
            y="136"
            textAnchor="middle"
            fill="#FFFFFF"
            fontSize="10"
            fontWeight="700"
            fontFamily="var(--font-display)"
          >
            S
          </text>
          <text
            x="166"
            y="136"
            fill="var(--text-primary)"
            fontSize="12.5"
            fontWeight="600"
            fontFamily="var(--font-display)"
          >
            Weekly Mastery & Study Pace
          </text>
          <text
            x="458"
            y="136"
            textAnchor="end"
            fill="var(--text-muted)"
            fontSize="11"
            fontFamily="var(--font-mono)"
          >
            94% adherence
          </text>

          {/* Subtle Horizontal Chart Gridlines */}
          {[196, 238, 280, 322].map((y) => (
            <line
              key={y}
              x1="146"
              y1={y}
              x2="528"
              y2={y}
              stroke="var(--border-subtle)"
              strokeWidth="1"
              strokeDasharray="3 4"
            />
          ))}

          {/* Planned Baseline Dashed Curve */}
          <motion.path
            d="M 152 292 C 210 278, 245 256, 294 252 C 345 248, 392 224, 444 218 C 482 214, 502 204, 524 198"
            stroke="var(--chart-planned)"
            strokeWidth="2"
            strokeDasharray="5 5"
            strokeLinecap="round"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 0.75 }}
            transition={drawTransition(0.25, 1.1)}
          />

          {/* Shaded Area under Actual Curve */}
          <motion.path
            d="M 152 308 C 204 294, 242 260, 294 240 C 346 220, 390 236, 444 202 C 478 182, 502 184, 524 176 L 524 322 L 152 322 Z"
            fill="url(#sf-chart-fill)"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={drawTransition(0.55, 0.9)}
          />

          {/* Actual Study Progress Animated Curve */}
          <motion.path
            d="M 152 308 C 204 294, 242 260, 294 240 C 346 220, 390 236, 444 202 C 478 182, 502 184, 524 176"
            stroke="url(#sf-accent-line)"
            strokeWidth="3"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={drawTransition(0.35, 1.35)}
          />

          {/* Interactive-Look Milestone Nodes along Curve */}
          {[
            { cx: 152, cy: 308, delay: 0.65 },
            { cx: 294, cy: 240, delay: 0.9 },
            { cx: 444, cy: 202, delay: 1.15 },
            { cx: 524, cy: 176, delay: 1.35 },
          ].map((pt, idx) => (
            <motion.g
              key={pt.cx}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={drawTransition(pt.delay, 0.4)}
              style={{ transformOrigin: `${pt.cx}px ${pt.cy}px` }}
            >
              {idx === 3 && !prefersReduced && (
                <motion.circle
                  cx={pt.cx}
                  cy={pt.cy}
                  r="11"
                  fill="var(--accent)"
                  fillOpacity="0.16"
                  animate={{ scale: [0.85, 1.35, 0.85], opacity: [0.35, 0.08, 0.35] }}
                  transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
                  style={{ transformOrigin: `${pt.cx}px ${pt.cy}px` }}
                />
              )}
              <circle
                cx={pt.cx}
                cy={pt.cy}
                r="4.5"
                fill="var(--bg-surface)"
                stroke={idx === 3 ? '#10B981' : 'var(--accent)'}
                strokeWidth="2.5"
              />
            </motion.g>
          ))}

          {/* Bottom Schedule Bars inside Workspace Card */}
          <g transform="translate(146, 344)">
            <rect width="120" height="34" rx="8" fill="var(--bg-surface-subtle)" />
            <rect x="10" y="10" width="54" height="5" rx="2.5" fill="var(--accent)" fillOpacity="0.75" />
            <rect x="10" y="20" width="84" height="4" rx="2" fill="var(--text-muted)" fillOpacity="0.35" />

            <rect x="132" width="120" height="34" rx="8" fill="var(--bg-surface-subtle)" />
            <rect x="142" y="10" width="66" height="5" rx="2.5" fill="#10B981" fillOpacity="0.75" />
            <rect x="142" y="20" width="76" height="4" rx="2" fill="var(--text-muted)" fillOpacity="0.35" />

            <rect x="264" width="118" height="34" rx="8" fill="var(--bg-surface-subtle)" />
            <rect x="274" y="10" width="48" height="5" rx="2.5" fill="#F59E0B" fillOpacity="0.8" />
            <rect x="274" y="20" width="82" height="4" rx="2" fill="var(--text-muted)" fillOpacity="0.35" />
          </g>
        </motion.g>

        {/* TOP-RIGHT FLOATING MODULE: Animated Focus Timer Ring */}
        <motion.g
          filter="url(#sf-card-shadow)"
          initial={{ opacity: 0, x: 18, y: -12 }}
          animate={{ opacity: 1, x: 0, y: 0 }}
          transition={drawTransition(0.4, 0.7)}
        >
          <motion.g animate={floatAnim(-6, 5.2)}>
            <rect
              x="478"
              y="26"
              width="174"
              height="108"
              rx="16"
              fill="var(--bg-elevated)"
              stroke="var(--border-subtle)"
              strokeWidth="1.25"
            />
            {/* Circular Progress Track */}
            <circle
              cx="524"
              cy="80"
              r="28"
              stroke="var(--bg-surface-hover)"
              strokeWidth="5"
              fill="none"
            />
            <motion.circle
              cx="524"
              cy="80"
              r="28"
              stroke="url(#sf-ring-grad)"
              strokeWidth="5"
              strokeLinecap="round"
              fill="none"
              transform="rotate(-90 524 80)"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: prefersReduced ? 0.76 : [0.22, 0.84, 0.76] }}
              transition={
                prefersReduced
                  ? { duration: 0 }
                  : { delay: 0.6, duration: 2.6, ease: [0.16, 1, 0.3, 1] }
              }
            />
            <text
              x="524"
              y="84"
              textAnchor="middle"
              fill="var(--text-primary)"
              fontSize="11.5"
              fontWeight="600"
              fontFamily="var(--font-mono)"
            >
              25:00
            </text>
            <text
              x="566"
              y="69"
              fill="var(--text-primary)"
              fontSize="12"
              fontWeight="600"
              fontFamily="var(--font-display)"
            >
              Deep Focus
            </text>
            <text
              x="566"
              y="87"
              fill="var(--text-muted)"
              fontSize="10.5"
              fontFamily="var(--font-body)"
            >
              Pomodoro · 2/4
            </text>
            <rect
              x="566"
              y="98"
              width="58"
              height="4"
              rx="2"
              fill="var(--accent)"
              fillOpacity="0.35"
            />
          </motion.g>
        </motion.g>

        {/* BOTTOM-LEFT FLOATING MODULE: Markdown & Math Formula Note */}
        <motion.g
          filter="url(#sf-card-shadow)"
          initial={{ opacity: 0, x: -18, y: 16 }}
          animate={{ opacity: 1, x: 0, y: 0 }}
          transition={drawTransition(0.55, 0.75)}
        >
          <motion.g animate={floatAnim(7, 6.0)}>
            <rect
              x="28"
              y="314"
              width="216"
              height="156"
              rx="16"
              fill="var(--bg-elevated)"
              stroke="var(--border-subtle)"
              strokeWidth="1.25"
            />
            <text
              x="46"
              y="340"
              fill="var(--text-primary)"
              fontSize="12"
              fontWeight="600"
              fontFamily="var(--font-display)"
            >
              Markdown & Math Notes
            </text>
            {/* Formula Callout Strip */}
            <rect
              x="46"
              y="352"
              width="180"
              height="34"
              rx="8"
              fill="var(--accent-soft)"
            />
            <text
              x="136"
              y="374"
              textAnchor="middle"
              fill="var(--accent)"
              fontSize="13.5"
              fontWeight="600"
              fontFamily="var(--font-mono)"
            >
              ∮ E · dA = Q / ε₀
            </text>
            {/* Animated Note Structure Lines */}
            {[
              { y: 404, w: 158, delay: 0.75 },
              { y: 420, w: 132, delay: 0.9 },
              { y: 436, w: 168, delay: 1.05 },
              { y: 452, w: 104, delay: 1.2 },
            ].map((line) => (
              <motion.rect
                key={line.y}
                x="46"
                y={line.y}
                width={line.w}
                height="5.5"
                rx="2.75"
                fill="var(--text-muted)"
                fillOpacity="0.32"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={drawTransition(line.delay, 0.6)}
                style={{ transformOrigin: `46px ${line.y}px` }}
              />
            ))}
          </motion.g>
        </motion.g>

        {/* BOTTOM-RIGHT FLOATING MODULE: Layered Flashcard Deck + Pip Node */}
        <motion.g
          filter="url(#sf-card-shadow)"
          initial={{ opacity: 0, x: 16, y: 18 }}
          animate={{ opacity: 1, x: 0, y: 0 }}
          transition={drawTransition(0.65, 0.75)}
        >
          <motion.g animate={floatAnim(-5, 5.6)}>
            {/* Back Card in Deck */}
            <rect
              x="442"
              y="344"
              width="196"
              height="118"
              rx="15"
              fill="var(--bg-surface-subtle)"
              stroke="var(--border-subtle)"
              strokeWidth="1.15"
              transform="rotate(3 540 403)"
            />
            {/* Front Active Recall Card */}
            <rect
              x="430"
              y="354"
              width="196"
              height="118"
              rx="15"
              fill="var(--bg-elevated)"
              stroke="var(--border-subtle)"
              strokeWidth="1.25"
            />
            <text
              x="448"
              y="378"
              fill="var(--accent)"
              fontSize="10.5"
              fontWeight="600"
              fontFamily="var(--font-mono)"
            >
              ACTIVE RECALL · DUE
            </text>
            <text
              x="448"
              y="402"
              fill="var(--text-primary)"
              fontSize="12.5"
              fontWeight="600"
              fontFamily="var(--font-display)"
            >
              NP-Complete Reduction
            </text>
            <text
              x="448"
              y="420"
              fill="var(--text-secondary)"
              fontSize="11"
              fontFamily="var(--font-body)"
            >
              Verify poly-time certificate &
            </text>
            <text
              x="448"
              y="435"
              fill="var(--text-secondary)"
              fontSize="11"
              fontFamily="var(--font-body)"
            >
              reduce 3-SAT in O(n^k)
            </text>
            {/* Spaced Repetition Progress Bar */}
            <rect x="448" y="450" width="160" height="5" rx="2.5" fill="var(--bg-surface-hover)" />
            <motion.rect
              x="448"
              y="450"
              width="124"
              height="5"
              rx="2.5"
              fill="#10B981"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={drawTransition(1.0, 0.9)}
              style={{ transformOrigin: '448px 452px' }}
            />
          </motion.g>
        </motion.g>

        {/* TOP-LEFT PIP AI EMBLEM HUB */}
        <motion.g
          filter="url(#sf-card-shadow)"
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={drawTransition(0.3, 0.65)}
          style={{ transformOrigin: '86px 132px' }}
        >
          <motion.g animate={floatAnim(-5, 4.6)}>
            <rect
              x="44"
              y="90"
              width="84"
              height="84"
              rx="22"
              fill="var(--bg-elevated)"
              stroke="var(--border-subtle)"
              strokeWidth="1.25"
            />
            {/* Pip Mascot Geometric SVG */}
            <g transform="translate(62, 108)">
              <path
                d="M 8 10 L 14 2 L 20 8 L 28 8 L 34 2 L 40 10 C 44 14 45 21 44 29 C 43 37 36 42 24 42 C 12 42 5 37 4 29 C 3 21 4 14 8 10 Z"
                fill="var(--accent)"
              />
              <motion.ellipse
                cx="17.5"
                cy="23"
                rx="3"
                ry="3.4"
                fill="#FFFFFF"
                animate={
                  prefersReduced
                    ? {}
                    : { scaleY: [1, 1, 0.12, 1, 1] }
                }
                transition={
                  prefersReduced
                    ? { duration: 0 }
                    : {
                        duration: 4.4,
                        times: [0, 0.86, 0.9, 0.94, 1],
                        repeat: Infinity,
                        ease: 'easeInOut',
                      }
                }
                style={{ transformOrigin: '17.5px 23px' }}
              />
              <motion.ellipse
                cx="30.5"
                cy="23"
                rx="3"
                ry="3.4"
                fill="#FFFFFF"
                animate={
                  prefersReduced
                    ? {}
                    : { scaleY: [1, 1, 0.12, 1, 1] }
                }
                transition={
                  prefersReduced
                    ? { duration: 0 }
                    : {
                        duration: 4.4,
                        times: [0, 0.86, 0.9, 0.94, 1],
                        repeat: Infinity,
                        ease: 'easeInOut',
                      }
                }
                style={{ transformOrigin: '30.5px 23px' }}
              />
              <path
                d="M 20.5 30 Q 24 33 27.5 30"
                stroke="#FFFFFF"
                strokeWidth="2"
                strokeLinecap="round"
                fill="none"
              />
            </g>
          </motion.g>
        </motion.g>
      </svg>
    </div>
  );
};
