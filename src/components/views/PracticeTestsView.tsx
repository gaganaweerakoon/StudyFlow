import {StudyGeneration} from '../../notes/StudyGeneration';
import React, { useState, useEffect } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import {
  Clock,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  AlertTriangle,
  Play,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatTimerSeconds, gradePracticeTest } from '../../utils/studyLogic';

export const PracticeTestsView: React.FC = () => {
  const { quizzes, subjects, recordQuizScore, pushToast } = useApp();

  const [activeQuizId, setActiveQuizId] = useState<string | null>(null);
  const [questionIdx, setQuestionIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [secondsLeft, setSecondsLeft] = useState(900);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const activeQuiz = quizzes.find((q) => q.id === activeQuizId) ?? null;

  useEffect(() => {
    if (!activeQuiz || submitted) return;
    const t = window.setInterval(() => {
      setSecondsLeft((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => window.clearInterval(t);
  }, [activeQuiz, submitted]);

  const startQuiz = (id: string) => {
    const q = quizzes.find((x) => x.id === id);
    if (!q) return;
    setActiveQuizId(id);
    setQuestionIdx(0);
    setAnswers({});
    setSecondsLeft(q.durationMinutes * 60);
    setSubmitted(false);
    setConfirmSubmit(false);
  };

  const handleConfirmSubmit = () => {
    if (!activeQuiz) return;
    const result = gradePracticeTest(activeQuiz.questions, answers);
    recordQuizScore(activeQuiz.id, result.scorePercent);
    setConfirmSubmit(false);
    setSubmitted(true);
    pushToast(`Quiz graded: ${result.scorePercent}% (+80 XP)`);
  };

  const surfaceStyle: React.CSSProperties = {
    backgroundColor: 'var(--bg-surface)',
    border: '1px solid var(--border-subtle)',
  };

  if (activeQuiz && submitted) {
    const result = gradePracticeTest(activeQuiz.questions, answers);
    const sub = subjects.find((s) => s.id === activeQuiz.subjectId);

    return (
      <div className="space-y-4 pb-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setActiveQuizId(null)}
            className="inline-flex items-center gap-1.5 text-[13px] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Practice Tests
          </button>
          <button
            type="button"
            onClick={() => startQuiz(activeQuiz.id)}
            className="px-3 py-1.5 rounded-lg text-[12.5px] font-medium"
            style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' }}
          >
            Retake Quiz
          </button>
        </div>

        {/* Score Breakdown Header */}
        <div className="rounded-xl p-5 grid grid-cols-1 md:grid-cols-3 gap-4 items-center" style={surfaceStyle}>
          <div>
            <div className="text-[12px] text-[var(--text-muted)]">{sub?.code} · Results Summary</div>
            <h1 className="font-display text-[19px] font-semibold text-[var(--text-primary)] mt-0.5">
              {activeQuiz.title}
            </h1>
          </div>
          <div className="flex items-baseline gap-2 md:justify-center">
            <span className="font-mono-num text-[34px] font-semibold text-[var(--text-primary)]">
              {result.scorePercent}%
            </span>
            <span className="text-[13px] text-[var(--text-muted)] font-mono-num">
              ({result.correctCount}/{result.totalCount} correct)
            </span>
          </div>
          <div className="md:text-right text-[12.5px]">
            {result.weakTopics.length > 0 ? (
              <div className="text-amber-600 dark:text-amber-400">
                Focus next: <strong className="font-semibold">{result.weakTopics.join(', ')}</strong>
              </div>
            ) : (
              <div className="text-emerald-600 dark:text-emerald-400 font-medium">
                Strong mastery across all tested topics
              </div>
            )}
          </div>
        </div>

        {/* Topic Performance Chart */}
        <div className="rounded-xl p-4" style={surfaceStyle}>
          <h2 className="font-display text-[14.5px] font-semibold text-[var(--text-primary)] mb-3">
            Topic Accuracy Breakdown
          </h2>
          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={result.topicBreakdown} margin={{ top: 4, right: 12, left: -16, bottom: 0 }}>
                <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="topic" tick={{ fill: 'var(--text-muted)', fontSize: 11.5 }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fill: 'var(--text-muted)', fontSize: 11.5 }} axisLine={false} tickLine={false} unit="%" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--bg-elevated)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 10,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="accuracy" name="Accuracy (%)" fill="var(--accent)" radius={[5, 5, 0, 0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Question-by-Question Review */}
        <div className="rounded-xl divide-y divide-[var(--border-subtle)]" style={surfaceStyle}>
          {activeQuiz.questions.map((q, idx) => {
            const given = (answers[q.id] ?? '').trim();
            const isCorrect = gradePracticeTest([q],answers).correctCount === 1;

            return (
              <div key={q.id} className="p-4 space-y-1.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="text-[13.5px] font-medium text-[var(--text-primary)]">
                    <span className="font-mono-num text-[var(--text-muted)] mr-2">Q{idx + 1}.</span>
                    {q.prompt}
                  </div>
                  {isCorrect ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  )}
                </div>
                <div className="text-[12px] text-[var(--text-secondary)]">
                  Your answer:{' '}
                  <strong className={isCorrect ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
                    {given || '(Unanswered)'}
                  </strong>
                  {!isCorrect && (
                    <span className="ml-3">
                      Correct: <strong className="text-[var(--text-primary)]">{q.correctAnswer}</strong>
                    </span>
                  )}
                </div>
                <p className="text-[12px] text-[var(--text-muted)]">{q.explanation}</p>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (activeQuiz) {
    const q = activeQuiz.questions[questionIdx];
    const sub = subjects.find((s) => s.id === activeQuiz.subjectId);
    const answeredCount = Object.values(answers).filter((v) => v.trim().length > 0).length;

    return (
      <div className="space-y-4 pb-6">
        {/* Timed Test Header */}
        <div className="rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-3" style={surfaceStyle}>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setActiveQuizId(null)}
              aria-label="Exit practice test"
              className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)]"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <div className="text-[11.5px] text-[var(--text-muted)]">{sub?.code} · {activeQuiz.difficulty}</div>
              <div className="font-display text-[14.5px] font-semibold text-[var(--text-primary)]">
                {activeQuiz.title}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono-num text-[13px] font-semibold" style={{ backgroundColor: 'var(--bg-surface-subtle)', color: 'var(--text-primary)' }}>
              <Clock className="w-3.5 h-3.5 text-[var(--accent)]" />
              {formatTimerSeconds(secondsLeft)}
            </div>
            <button
              type="button"
              onClick={() => setConfirmSubmit(true)}
              className="px-3.5 py-1.5 rounded-lg text-[12.5px] font-medium"
              style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' }}
            >
              Submit Test
            </button>
          </div>
        </div>

        {/* Question Card + Navigation Sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-9 rounded-xl p-6 space-y-5" style={surfaceStyle}>
            <div className="flex items-center justify-between text-[12px] text-[var(--text-muted)]">
              <span>Question {questionIdx + 1} of {activeQuiz.questions.length}</span>
              <span>Topic: {q.topic}</span>
            </div>

            <h2 className="font-display text-[17px] font-medium text-[var(--text-primary)] leading-snug">
              {q.prompt}
            </h2>

            {q.type !== 'short' && q.options ? (
              <div className="space-y-2.5">
                {q.options.map((opt, idx) => {
                  const chosen = (answers[q.id] ?? '').split('\n').filter(Boolean);
                  const selected = chosen.includes(opt);
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setAnswers((prev) => ({ ...prev, [q.id]: q.type === "multi" ? (selected ? chosen.filter(v=>v!==opt) : [...chosen,opt]).sort().join("\n") : opt }))}
                      className="w-full p-3.5 rounded-xl text-left flex items-center gap-3 transition-colors"
                      style={{
                        backgroundColor: selected ? 'var(--accent-soft)' : 'var(--bg-surface-subtle)',
                        border: selected ? '1.5px solid var(--accent)' : '1px solid var(--border-subtle)',
                      }}
                    >
                      <span
                        className="w-6 h-6 rounded-md font-mono-num text-[12px] font-semibold flex items-center justify-center shrink-0"
                        style={{
                          backgroundColor: selected ? 'var(--accent)' : 'var(--bg-surface)',
                          color: selected ? 'var(--accent-fg)' : 'var(--text-secondary)',
                        }}
                      >
                        {String.fromCharCode(65 + idx)}
                      </span>
                      <span className="text-[13.5px] text-[var(--text-primary)]">{opt}</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div>
                <label htmlFor="short-answer-input" className="block text-[12px] text-[var(--text-muted)] mb-1.5">
                  Type your concise answer
                </label>
                <input
                  id="short-answer-input"
                  type="text"
                  value={answers[q.id] ?? ''}
                  onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                  placeholder="Enter algorithm or theorem name..."
                  className="w-full px-3.5 py-2.5 rounded-xl text-[14px]"
                  style={{
                    backgroundColor: 'var(--bg-surface-subtle)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-primary)',
                  }}
                />
              </div>
            )}

            <div className="pt-4 flex items-center justify-between" style={{ borderTop: '1px solid var(--border-subtle)' }}>
              <button
                type="button"
                disabled={questionIdx === 0}
                onClick={() => setQuestionIdx((i) => i - 1)}
                className="px-3.5 py-1.5 rounded-lg text-[13px] text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)] disabled:opacity-35"
                style={{ border: '1px solid var(--border-subtle)' }}
              >
                Previous
              </button>
              {questionIdx < activeQuiz.questions.length - 1 ? (
                <button
                  type="button"
                  onClick={() => setQuestionIdx((i) => i + 1)}
                  className="px-4 py-1.5 rounded-lg text-[13px] font-medium"
                  style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' }}
                >
                  Next Question
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmSubmit(true)}
                  className="px-4 py-1.5 rounded-lg text-[13px] font-medium"
                  style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' }}
                >
                  Finish & Grade
                </button>
              )}
            </div>
          </div>

          {/* Question Navigator Sidebar */}
          <div className="lg:col-span-3 rounded-xl p-4 space-y-3 h-fit" style={surfaceStyle}>
            <div className="flex items-center justify-between text-[12.5px]">
              <span className="font-semibold text-[var(--text-primary)]">Questions</span>
              <span className="font-mono-num text-[11.5px] text-[var(--text-muted)]">
                {answeredCount}/{activeQuiz.questions.length} answered
              </span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {activeQuiz.questions.map((item, idx) => {
                const isCurrent = idx === questionIdx;
                const isAnswered = Boolean((answers[item.id] ?? '').trim());
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setQuestionIdx(idx)}
                    className="h-9 rounded-lg font-mono-num text-[12.5px] font-medium transition-colors"
                    style={{
                      backgroundColor: isCurrent
                        ? 'var(--accent)'
                        : isAnswered
                          ? 'var(--accent-soft)'
                          : 'var(--bg-surface-subtle)',
                      color: isCurrent
                        ? 'var(--accent-fg)'
                        : isAnswered
                          ? 'var(--accent)'
                          : 'var(--text-secondary)',
                      border: '1px solid var(--border-subtle)',
                    }}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Submit Confirmation Dialog */}
        {confirmSubmit && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
            <div className="fixed inset-0 bg-black/45" onClick={() => setConfirmSubmit(false)} />
            <div
              className="relative w-full max-w-sm rounded-2xl p-5 space-y-4"
              style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-floating)' }}
            >
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-display text-[15px] font-semibold text-[var(--text-primary)]">
                    Submit Practice Test?
                  </h3>
                  <p className="text-[12.5px] text-[var(--text-secondary)] mt-1">
                    You have answered {answeredCount} of {activeQuiz.questions.length} questions. You will receive instant topic diagnostics.
                  </p>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmSubmit(false)}
                  className="px-3.5 py-1.5 rounded-lg text-[12.5px] text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)]"
                >
                  Continue Editing
                </button>
                <button
                  type="button"
                  onClick={handleConfirmSubmit}
                  className="px-4 py-1.5 rounded-lg text-[12.5px] font-medium"
                  style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' }}
                >
                  Confirm & Submit
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-6">
      <StudyGeneration quiz/>
      <div>
        <h1 className="font-display text-[19px] font-semibold text-[var(--text-primary)]">
          Practice Tests
        </h1>
        <p className="text-[12.5px] text-[var(--text-muted)]">
          Timed mock assessments with instant topic diagnostics and weak-area recommendations
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {quizzes.map((qz) => {
          const sub = subjects.find((s) => s.id === qz.subjectId);
          return (
            <div key={qz.id} className="rounded-xl p-5 flex flex-col justify-between gap-4" style={surfaceStyle}>
              <div>
                <div className="flex items-center justify-between text-[12px]">
                  <span className="inline-flex items-center gap-1.5 font-semibold" style={{ color: sub?.color }}>
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: sub?.color }} />
                    {sub?.code} · {qz.difficulty}
                  </span>
                  {qz.lastScore !== undefined && (
                    <span className="font-mono-num text-[var(--text-secondary)]">
                      Last: {qz.lastScore}%
                    </span>
                  )}
                </div>
                <h2 className="font-display text-[16px] font-semibold text-[var(--text-primary)] mt-1.5">
                  {qz.title}
                </h2>
                <div className="text-[12px] text-[var(--text-muted)] mt-1">
                  {qz.questions.length} questions (MCQ + short answer) · {qz.durationMinutes} min timer
                </div>
              </div>

              <div className="pt-3 flex items-center justify-between" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                <span className="text-[12px] text-[var(--text-secondary)]">
                  Topics: {Array.from(new Set(qz.questions.map((x) => x.topic))).slice(0, 2).join(', ')}
                </span>
                <button
                  type="button"
                  onClick={() => startQuiz(qz.id)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[12.5px] font-medium shrink-0"
                  style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' }}
                >
                  <Play className="w-3.5 h-3.5" /> Start Quiz
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
