import { StudyGeneration } from '../../notes/StudyGeneration';
import React, { lazy, Suspense, useState } from 'react';
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
  Plus,
  RotateCw,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  ArrowLeft,
  Lightbulb,
  Sparkles,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useAssistant } from '../../assistant/AssistantContext';
import { localDay } from '../../assistant/workspaceContext';
import type { ReviewRating } from '../../utils/studyLogic';

const AssistantMarkdown = lazy(() => import('../../assistant/AssistantMarkdown'));

const REVIEW_HISTORY = [
  { day: 'Mon', reviewed: 32 },
  { day: 'Tue', reviewed: 45 },
  { day: 'Wed', reviewed: 28 },
  { day: 'Thu', reviewed: 50 },
  { day: 'Fri', reviewed: 38 },
  { day: 'Sat', reviewed: 62 },
  { day: 'Sun', reviewed: 41 },
];

export const FlashcardsView: React.FC = () => {
  const { decks, flashcards, subjects, legacyCalendar, cardReviews, reviewFlashcard, setActiveModal, pushToast } = useApp();
  const { askPip } = useAssistant();

  const [activeDeckId, setActiveDeckId] = useState<string | null>(null);
  const [cardIndex, setCardIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [sessionDone, setSessionDone] = useState(false);
  const [reviewedInSession, setReviewedInSession] = useState(0);

  const surfaceStyle: React.CSSProperties = {
    backgroundColor: 'var(--bg-surface)',
    border: '1px solid var(--border-subtle)',
  };

  if (activeDeckId) {
    const deck = decks.find((d) => d.id === activeDeckId);
    const deckCards = flashcards.filter((c) => c.deckId === activeDeckId);
    const sub = subjects.find((s) => s.id === deck?.subjectId);
    const currentCard = deckCards[cardIndex];

    const handleRate = (rating: ReviewRating) => {
      if (!currentCard) return;
      reviewFlashcard(currentCard.id, rating);
      setReviewedInSession((r) => r + 1);
      setFlipped(false);
      setShowHint(false);
      if (cardIndex + 1 >= deckCards.length) {
        setSessionDone(true);
        pushToast('Revision session completed!');
      } else {
        setCardIndex((i) => i + 1);
      }
    };

    return (
      <div className="max-w-3xl mx-auto space-y-5 py-2 pb-8">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              setActiveDeckId(null);
              setSessionDone(false);
              setCardIndex(0);
              setFlipped(false);
            }}
            className="inline-flex items-center gap-1.5 text-[13px] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Decks
          </button>
          <div className="text-[12.5px] font-mono-num text-[var(--text-muted)]">
            {sub?.code} · Card {Math.min(cardIndex + 1, deckCards.length)} / {deckCards.length}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-surface-hover)' }}>
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${sessionDone ? 100 : Math.round((cardIndex / Math.max(1, deckCards.length)) * 100)}%`,
              backgroundColor: sub?.color ?? 'var(--accent)',
            }}
          />
        </div>

        {sessionDone || !currentCard ? (
          <div className="rounded-2xl p-10 text-center space-y-4" style={surfaceStyle}>
            <div
              className="w-12 h-12 rounded-full mx-auto flex items-center justify-center"
              style={{ backgroundColor: 'var(--accent-soft)', color: 'var(--accent)' }}
            >
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h2 className="font-display text-[20px] font-semibold text-[var(--text-primary)]">
              Revision Complete
            </h2>
            <p className="text-[13.5px] text-[var(--text-secondary)] max-w-md mx-auto">
              You reviewed <span className="font-mono-num font-semibold">{reviewedInSession}</span> cards in{' '}
              <strong className="text-[var(--text-primary)]">{deck?.title}</strong>. Spaced repetition intervals have been updated.
            </p>
            <div className="flex justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setSessionDone(false);
                  setCardIndex(0);
                  setReviewedInSession(0);
                  setFlipped(false);
                }}
                className="px-4 py-2 rounded-lg text-[13px] font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)]"
                style={{ border: '1px solid var(--border-subtle)' }}
              >
                Review Again
              </button>
              <button
                type="button"
                onClick={() => setActiveDeckId(null)}
                className="px-4 py-2 rounded-lg text-[13px] font-medium"
                style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' }}
              >
                Return to Library
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* 3D Flipping Flashcard */}
            <div className="perspective-1200">
              <button
                type="button"
                onClick={() => setFlipped((f) => !f)}
                aria-label={flipped ? 'Show card front' : 'Flip card to reveal answer'}
                className={`relative w-full min-h-[320px] text-left preserve-3d transition-transform duration-500 cursor-pointer ${
                  flipped ? 'rotate-y-180' : ''
                }`}
              >
                {/* Front Face */}
                <div
                  className="absolute inset-0 backface-hidden rounded-2xl p-8 flex flex-col justify-between"
                  style={{
                    backgroundColor: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                    boxShadow: 'var(--shadow-subtle)',
                  }}
                >
                  <div className="flex items-center justify-between text-[12px] text-[var(--text-muted)]">
                    <span>Prompt · {deck?.title}</span>
                    <span className="font-mono-num capitalize">{currentCard.mastery}</span>
                  </div>
                  <div className="font-display text-[19px] font-medium text-[var(--text-primary)] leading-snug text-center px-4 note-markdown">
                    <Suspense fallback={<span>{currentCard.front}</span>}>
                      <AssistantMarkdown text={currentCard.front} />
                    </Suspense>
                  </div>
                  <div className="flex items-center justify-between text-[12px] text-[var(--text-muted)]">
                    <span>{showHint && currentCard.hint ? `Hint: ${currentCard.hint}` : 'Click card to flip'}</span>
                    <span className="inline-flex items-center gap-1">
                      <RotateCw className="w-3.5 h-3.5" /> Flip
                    </span>
                  </div>
                </div>

                {/* Back Face */}
                <div
                  className="absolute inset-0 backface-hidden rotate-y-180 rounded-2xl p-8 flex flex-col justify-between"
                  style={{
                    backgroundColor: 'var(--bg-surface)',
                    border: '1px solid var(--accent-border)',
                    boxShadow: 'var(--shadow-subtle)',
                  }}
                >
                  <div className="flex items-center justify-between text-[12px]" style={{ color: 'var(--accent)' }}>
                    <span className="font-semibold">Answer</span>
                    <span className="font-mono-num text-[var(--text-muted)]">
                      Current interval: {currentCard.intervalDays}d
                    </span>
                  </div>
                  <div className="text-[15.5px] text-[var(--text-primary)] leading-relaxed text-center px-4 note-markdown overflow-y-auto max-h-[210px]">
                    <Suspense fallback={<span>{currentCard.back}</span>}>
                      <AssistantMarkdown text={currentCard.back} />
                    </Suspense>
                  </div>
                  <div className="text-center text-[11.5px] text-[var(--text-muted)]">
                    Select how well you recalled this card below
                  </div>
                </div>
              </button>
            </div>

            {/* Controls & Spaced Repetition Grading */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={cardIndex === 0}
                  onClick={() => {
                    setCardIndex((i) => Math.max(0, i - 1));
                    setFlipped(false);
                  }}
                  aria-label="Previous card"
                  className="p-2 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)] disabled:opacity-35"
                  style={surfaceStyle}
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  disabled={cardIndex >= deckCards.length - 1}
                  onClick={() => {
                    setCardIndex((i) => Math.min(deckCards.length - 1, i + 1));
                    setFlipped(false);
                  }}
                  aria-label="Next card"
                  className="p-2 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)] disabled:opacity-35"
                  style={surfaceStyle}
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                {currentCard.hint && !flipped && (
                  <button
                    type="button"
                    onClick={() => setShowHint((h) => !h)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)]"
                    style={surfaceStyle}
                  >
                    <Lightbulb className="w-3.5 h-3.5" /> Hint
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                {(
                  [
                    { id: 'again', label: 'Again', sub: '1d', color: '#E11D48' },
                    { id: 'hard', label: 'Hard', sub: `${Math.max(1, Math.round(currentCard.intervalDays * 1.2))}d`, color: '#D97706' },
                    { id: 'good', label: 'Good', sub: `${currentCard.intervalDays <= 1 ? 3 : Math.round(currentCard.intervalDays * currentCard.easeFactor)}d`, color: '#059669' },
                    { id: 'easy', label: 'Easy', sub: `${currentCard.intervalDays <= 1 ? 5 : Math.round(currentCard.intervalDays * currentCard.easeFactor * 1.3)}d`, color: 'var(--accent)' },
                  ] as const
                ).map((btn) => (
                  <button
                    key={btn.id}
                    type="button"
                    onClick={() => handleRate(btn.id)}
                    className="px-3.5 py-2 rounded-lg text-[12.5px] font-medium transition-colors hover:bg-[var(--bg-surface-hover)] flex flex-col items-center min-w-[68px]"
                    style={{
                      backgroundColor: 'var(--bg-surface)',
                      border: `1px solid var(--border-subtle)`,
                    }}
                  >
                    <span style={{ color: btn.color }}>{btn.label}</span>
                    <span className="font-mono-num text-[10.5px] text-[var(--text-muted)]">{btn.sub}</span>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  const dueTotal = flashcards.filter((c) => c.dueToday).length;
  const today = new Date();
  const dateAt = (days: number) => {
    const date = new Date(today);
    date.setDate(date.getDate() + days);
    return date;
  };
  const reviewHistory = legacyCalendar ? REVIEW_HISTORY.map(({ day }, index) => ({
    day, reviewed: cardReviews[localDay(dateAt(index - (today.getDay() + 6) % 7))] ?? 0,
  })) : REVIEW_HISTORY;
  const reviewedThisWeek = reviewHistory.reduce((total, day) => total + day.reviewed, 0);


  return (
    <div className="space-y-4 pb-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-[19px] font-semibold text-[var(--text-primary)]">
            Flashcards & Active Recall
          </h1>
          <p className="text-[12.5px] text-[var(--text-muted)]">
            {dueTotal} cards due today across {decks.length} {legacyCalendar ? 'decks' : 'subject-linked decks · 90% 30-day retention'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() =>
              askPip(
                'Generate 6 active-recall flashcards from my notes and save them into the best matching deck (or create a new deck if needed).',
                { openFloating: true },
              )
            }
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[12.5px] font-medium whitespace-nowrap text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)]"
            style={{ border: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-surface)' }}
          >
            <Sparkles className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} /> Ask Pip
          </button>
          <button
            type="button"
            onClick={() => setActiveModal('create_flashcard')}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[12.5px] font-medium whitespace-nowrap"
            style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' }}
          >
            <Plus className="w-3.5 h-3.5" /> Add Flashcard
          </button>
        </div>
      </div>

      <StudyGeneration
        onDeckSaved={(deckId) => {
          setActiveDeckId(deckId);
          setCardIndex(0);
          setFlipped(false);
          setSessionDone(false);
          setReviewedInSession(0);
        }}
      />

      {/* Deck Library */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {decks.map((deck) => {
          const sub = subjects.find((s) => s.id === deck.subjectId);
          const cards = flashcards.filter((c) => c.deckId === deck.id);
          const due = cards.filter((c) => c.dueToday).length;

          return (
            <div key={deck.id} className="rounded-xl p-4 flex flex-col justify-between gap-3.5" style={surfaceStyle}>
              <div>
                <div className="flex items-center justify-between text-[11.5px]">
                  <span className="inline-flex items-center gap-1.5 font-medium" style={{ color: sub?.color }}>
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: sub?.color }} />
                    {sub?.code}
                  </span>
                  <span className="font-mono-num text-[var(--text-muted)]">
                    {legacyCalendar ? '—' : `${deck.retentionRate}% retention`}
                  </span>
                </div>
                <h2 className="font-display text-[15.5px] font-semibold text-[var(--text-primary)] mt-1">
                  {deck.title}
                </h2>
                <p className="text-[12.5px] text-[var(--text-secondary)] mt-0.5">{deck.description}</p>
              </div>

              <div className="pt-3 flex items-center justify-between" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                <div className="text-[12px] text-[var(--text-muted)]">
                  <span className="font-mono-num font-semibold text-[var(--text-primary)]">{due}</span> due today ·{' '}
                  <span className="font-mono-num">{cards.length}</span> total
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setActiveDeckId(deck.id);
                    setCardIndex(0);
                    setFlipped(false);
                    setSessionDone(false);
                    setReviewedInSession(0);
                  }}
                  className="px-3 py-1.5 rounded-lg text-[12.5px] font-medium"
                  style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' }}
                >
                  Study Deck
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Review History & Spaced Repetition Schedule */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-7 rounded-xl p-4" style={surfaceStyle}>
          <div className="mb-3">
            <h2 className="font-display text-[14.5px] font-semibold text-[var(--text-primary)]">
              Daily Cards Reviewed
            </h2>
            <p className="text-[12px] text-[var(--text-muted)]">{reviewedThisWeek} active recall reviews completed this week</p>
          </div>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={reviewHistory} margin={{ top: 6, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="day" tick={{ fill: 'var(--text-muted)', fontSize: 11.5 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11.5 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--bg-elevated)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 10,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="reviewed" name="Cards Reviewed" fill="var(--accent)" radius={[5, 5, 0, 0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-5 rounded-xl p-4 space-y-3" style={surfaceStyle}>
          <h2 className="font-display text-[14.5px] font-semibold text-[var(--text-primary)]">
            Spaced Repetition Forecast
          </h2>
          <div className="divide-y divide-[var(--border-subtle)] text-[12.5px]">
            {(legacyCalendar ? Array.from({ length: 4 }, (_, index) => {
              const date = dateAt(index);
              const day = localDay(date);
              return {
                label: index === 0 ? 'Today' : index === 1 ? 'Tomorrow' : date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }),
                due: index === 0 ? dueTotal : flashcards.filter(card => card.nextReviewDate === day).length,
                status: index === 0 ? 'Ready now' : 'Scheduled',
              };
            }) : [
              { label: 'Today (Nov 22)', due: dueTotal, status: 'Ready now' },
              { label: 'Tomorrow (Nov 23)', due: 18, status: 'Scheduled' },
              { label: 'Tue, Nov 24', due: 24, status: 'Midterm prep peak' },
              { label: 'Wed, Nov 25', due: 14, status: 'Light maintenance' },
            ]).map((row) => (
              <div key={row.label} className="py-2.5 flex items-center justify-between">
                <div>
                  <div className="font-medium text-[var(--text-primary)]">{row.label}</div>
                  <div className="text-[11.5px] text-[var(--text-muted)]">{row.status}</div>
                </div>
                <span className="font-mono-num font-semibold text-[var(--text-primary)]">
                  {row.due} cards
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
