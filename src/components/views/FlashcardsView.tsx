import { SyllabusResourceBrowser } from '../syllabus/SyllabusResourceBrowser';
import { SyllabusLinkPicker } from '../syllabus/SyllabusLinkPicker';
import { StudyGeneration } from '../../notes/StudyGeneration';
import React, { lazy, Suspense, useMemo, useRef, useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
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
  Brain,
  CalendarPlus,
  Upload,
  Download,
  AlertTriangle,
  ShieldCheck,
  Clock,
  X,
  Check,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useAssistant } from '../../assistant/AssistantContext';
import { localDay } from '../../assistant/workspaceContext';
import type { ReviewRating } from '../../utils/studyLogic';
import {
  analyzeSrsRetention,
  buildForgettingCurveSeries,
  planMicroReviewSessions,
  parseAnkiTsvCsv,
  exportDeckToAnkiTsv,
  type ProposedMicroReview,
  type RetentionRiskLevel,
} from '../../utils/srsIntelligence';

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

function formatHourCompact(hour: number): string {
  const whole = Math.floor(hour);
  const mins = Math.round((hour - whole) * 60);
  const period = whole >= 12 ? 'PM' : 'AM';
  const h12 = whole % 12 || 12;
  return `${h12}:${String(mins).padStart(2, '0')} ${period}`;
}

function RiskLabel({ risk }: { risk: RetentionRiskLevel }) {
  if (risk === 'at_risk') {
    return (
      <span className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-rose-600 dark:text-rose-400 whitespace-nowrap">
        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
        At Risk
      </span>
    );
  }
  if (risk === 'watch') {
    return (
      <span className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-amber-600 dark:text-amber-400 whitespace-nowrap">
        <Clock className="w-3.5 h-3.5 shrink-0" />
        Watch
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
      <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
      Safe
    </span>
  );
}

export const FlashcardsView: React.FC = () => {
  const {
    decks,
    flashcards,
    subjects,
    exams,
    sessions,
    legacyCalendar,
    cardReviews,
    reviewFlashcard,
    setActiveModal,
    pushToast,
    addDeck,
    updateDeckLinks,
    addSession,
    importFlashcardsBulk,
    saveWorkspace,
  } = useApp();
  const { askPip } = useAssistant();

  const [viewTab, setViewTab] = useState<'decks' | 'intelligence'>('decks');
  const [activeDeckId, setActiveDeckId] = useState<string | null>(null);
  const [cardIndex, setCardIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [sessionDone, setSessionDone] = useState(false);
  const [reviewedInSession, setReviewedInSession] = useState(0);

  // Micro-review approval state
  const [pendingMicroReviews, setPendingMicroReviews] = useState<ProposedMicroReview[] | null>(null);
  const [selectedMicroIds, setSelectedMicroIds] = useState<Record<string, boolean>>({});

  // Anki TSV/CSV import modal state
  const [ankiOpen, setAnkiOpen] = useState(false);
  const [ankiRaw, setAnkiRaw] = useState('');
  const [ankiTargetDeckId, setAnkiTargetDeckId] = useState<string>('__new__');
  const [ankiNewDeckTitle, setAnkiNewDeckTitle] = useState('Imported Anki Deck');
  const [ankiNewDeckSubjectId, setAnkiNewDeckSubjectId] = useState<string>(subjects[0]?.id ?? '');
  const [ankiChecked, setAnkiChecked] = useState<Record<number, boolean>>({});
  const ankiFileRef = useRef<HTMLInputElement>(null);

  const todayIso = localDay(new Date());

  const srsAnalysis = useMemo(
    () => analyzeSrsRetention(decks, flashcards, exams, subjects, todayIso),
    [decks, flashcards, exams, subjects, todayIso],
  );

  const forgettingCurve = useMemo(
    () => buildForgettingCurveSeries(flashcards, exams, todayIso, 14),
    [flashcards, exams, todayIso],
  );

  const parsedAnkiCards = useMemo(() => parseAnkiTsvCsv(ankiRaw), [ankiRaw]);

  const handleOpenAnkiModal = () => {
    setAnkiRaw('');
    setAnkiTargetDeckId(decks[0]?.id ?? '__new__');
    setAnkiNewDeckTitle('Imported Anki Deck');
    setAnkiNewDeckSubjectId(subjects[0]?.id ?? '');
    setAnkiChecked({});
    setAnkiOpen(true);
  };

  const handleAnkiTextChange = (nextText: string) => {
    setAnkiRaw(nextText);
    const parsed = parseAnkiTsvCsv(nextText);
    const nextMap: Record<number, boolean> = {};
    parsed.forEach((_, idx) => {
      nextMap[idx] = true;
    });
    setAnkiChecked(nextMap);
  };

  const handleAnkiFileUpload = async (file: File | undefined) => {
    if (!file) return;
    const text = await file.text();
    const baseName = file.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim();
    if (baseName) setAnkiNewDeckTitle(baseName);
    handleAnkiTextChange(text);
  };

  const handleApproveAnkiImport = () => {
    const approved = parsedAnkiCards.filter((_, idx) => ankiChecked[idx] !== false);
    if (approved.length === 0) {
      pushToast('Select at least one flashcard to import');
      return;
    }
    let deckId = ankiTargetDeckId;
    if (deckId === '__new__' || !decks.some((d) => d.id === deckId)) {
      deckId = addDeck({
        title: ankiNewDeckTitle.trim() || 'Imported Anki Deck',
        subjectId: ankiNewDeckSubjectId || subjects[0]?.id || '',
        description: 'Imported from Anki TSV/CSV',
      });
    }
    const added = importFlashcardsBulk(deckId, approved);
    void saveWorkspace();
    setAnkiOpen(false);
    pushToast(`Imported ${added} flashcard${added === 1 ? '' : 's'} into deck`);
  };

  const handleExportAnkiDeck = (deckId: string, deckTitle: string) => {
    const cards = flashcards.filter((c) => c.deckId === deckId);
    if (cards.length === 0) {
      pushToast('This deck has no cards to export');
      return;
    }
    const tsv = exportDeckToAnkiTsv(cards);
    const blob = new Blob([tsv], { type: 'text/tab-separated-values;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${deckTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'studyflow-deck'}-anki.tsv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    pushToast(`Exported ${cards.length} cards for Anki (.tsv)`);
  };

  const handlePlanMicroReviews = () => {
    const nowDate = new Date();
    const currentHour = nowDate.getHours() + nowDate.getMinutes() / 60;
    const proposals = planMicroReviewSessions(srsAnalysis.decks, sessions, todayIso, currentHour, 4);
    if (proposals.length === 0) {
      pushToast('All decks are on track — no urgent micro-reviews needed right now');
      return;
    }
    const selection: Record<string, boolean> = {};
    proposals.forEach((p) => {
      selection[p.id] = true;
    });
    setPendingMicroReviews(proposals);
    setSelectedMicroIds(selection);
  };

  const handleApproveMicroReviews = () => {
    if (!pendingMicroReviews) return;
    const approved = pendingMicroReviews.filter((p) => selectedMicroIds[p.id]);
    if (approved.length === 0) {
      pushToast('Select at least one micro-review block to schedule');
      return;
    }
    for (const block of approved) {
      const dayIndex = (new Date(`${block.date}T00:00:00Z`).getUTCDay() + 6) % 7;
      addSession({
        title: block.title,
        subjectId: block.subjectId,
        date: block.date,
        dayIndex,
        startHour: block.startHour,
        durationHours: block.durationHours,
        status: 'upcoming',
        blockType: 'study',
        countsTowardStudy: true,
      });
    }
    void saveWorkspace();
    setPendingMicroReviews(null);
    pushToast(`Scheduled ${approved.length} micro-review block${approved.length === 1 ? '' : 's'} in your Study Planner`);
  };

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


  const ankiSelectedCount = parsedAnkiCards.filter((_, idx) => ankiChecked[idx] !== false).length;
  const microSelectedCount = (pendingMicroReviews ?? []).filter((p) => selectedMicroIds[p.id]).length;

  return (
    <div className="space-y-4 pb-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-[19px] font-semibold text-[var(--text-primary)]">
            Flashcards & Active Recall
          </h1>
          <p className="text-[12.5px] text-[var(--text-muted)]">
            {dueTotal} cards due today across {decks.length} decks ·{' '}
            <span className="font-mono-num">{srsAnalysis.overallRetentionToday}%</span> predicted recall today
            {srsAnalysis.atRiskTotal > 0 ? ` · ${srsAnalysis.atRiskTotal} at-risk` : ''}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Segmented View Switcher */}
          <div
            className="inline-flex items-center p-0.5 rounded-lg text-[12px]"
            style={{ backgroundColor: 'var(--bg-surface-subtle)', border: '1px solid var(--border-subtle)' }}
          >
            <button
              type="button"
              onClick={() => setViewTab('decks')}
              className="px-2.5 py-1 rounded-md font-medium transition-colors whitespace-nowrap"
              style={{
                backgroundColor: viewTab === 'decks' ? 'var(--bg-surface)' : 'transparent',
                color: viewTab === 'decks' ? 'var(--text-primary)' : 'var(--text-muted)',
              }}
            >
              Decks & Review
            </button>
            <button
              type="button"
              onClick={() => setViewTab('intelligence')}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium transition-colors whitespace-nowrap"
              style={{
                backgroundColor: viewTab === 'intelligence' ? 'var(--bg-surface)' : 'transparent',
                color: viewTab === 'intelligence' ? 'var(--text-primary)' : 'var(--text-muted)',
              }}
            >
              <Brain className="w-3.5 h-3.5" />
              Retention Intelligence
            </button>
          </div>

          <button
            type="button"
            onClick={handleOpenAnkiModal}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[12.5px] font-medium whitespace-nowrap text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)]"
            style={surfaceStyle}
          >
            <Upload className="w-3.5 h-3.5" /> Import Anki
          </button>

          <button
            type="button"
            onClick={() =>
              askPip(
                'Generate 6 active-recall flashcards from my notes and save them into the best matching deck (or create a new deck if needed).',
                { openFloating: true },
              )
            }
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[12.5px] font-medium whitespace-nowrap text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)]"
            style={surfaceStyle}
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

      {viewTab === 'intelligence' ? (
        <div className="space-y-4">
          {/* KPI Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-xl p-4" style={surfaceStyle}>
              <div className="text-[12px] text-[var(--text-muted)]">Predicted Recall Today</div>
              <div className="mt-1 font-mono-num text-[24px] font-semibold text-[var(--text-primary)]">
                {srsAnalysis.overallRetentionToday}%
              </div>
              <div className="text-[11.5px] text-[var(--text-muted)] mt-0.5">
                Across {flashcards.length} active cards
              </div>
            </div>

            <div className="rounded-xl p-4" style={surfaceStyle}>
              <div className="text-[12px] text-[var(--text-muted)]">Exam-Day Recall Forecast</div>
              <div className="mt-1 font-mono-num text-[24px] font-semibold text-[var(--text-primary)]">
                {srsAnalysis.overallRetentionAtExam}%
              </div>
              <div className="text-[11.5px] text-[var(--text-muted)] mt-0.5">
                Without additional review before exams
              </div>
            </div>

            <div className="rounded-xl p-4 flex items-center justify-between gap-3" style={surfaceStyle}>
              <div>
                <div className="text-[12px] text-[var(--text-muted)]">At-Risk Concepts</div>
                <div className="mt-1 font-mono-num text-[24px] font-semibold text-rose-600 dark:text-rose-400">
                  {srsAnalysis.atRiskTotal}
                </div>
                <div className="text-[11.5px] text-[var(--text-muted)] mt-0.5">
                  Below 65% projected recall
                </div>
              </div>
              <button
                type="button"
                onClick={handlePlanMicroReviews}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-medium whitespace-nowrap shrink-0"
                style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' }}
              >
                <CalendarPlus className="w-3.5 h-3.5" />
                Schedule Micro-Reviews
              </button>
            </div>
          </div>

          {/* Pending Micro-Review Review & Approve Panel */}
          {pendingMicroReviews && pendingMicroReviews.length > 0 && (
            <div
              className="rounded-xl p-4 space-y-3"
              style={{
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--accent)',
              }}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="font-display text-[14.5px] font-semibold text-[var(--text-primary)]">
                    Review & Approve Micro-Review Blocks
                  </h2>
                  <p className="text-[12px] text-[var(--text-muted)]">
                    Auto-matched to open calendar slots before upcoming exams. Uncheck any block you do not want added.
                  </p>
                </div>
                <div className="flex items-center gap-2 text-[12px]">
                  <button
                    type="button"
                    onClick={() => {
                      const next: Record<string, boolean> = {};
                      pendingMicroReviews.forEach((p) => {
                        next[p.id] = true;
                      });
                      setSelectedMicroIds(next);
                    }}
                    className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] underline"
                  >
                    Select all
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedMicroIds({})}
                    className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] underline"
                  >
                    Clear
                  </button>
                </div>
              </div>

              <div className="divide-y divide-[var(--border-subtle)] rounded-lg overflow-hidden" style={{ border: '1px solid var(--border-subtle)' }}>
                {pendingMicroReviews.map((item) => {
                  const checked = Boolean(selectedMicroIds[item.id]);
                  const mins = Math.round(item.durationHours * 60);
                  return (
                    <label
                      key={item.id}
                      className="flex items-start gap-3 px-3 py-2.5 cursor-pointer hover:bg-[var(--bg-surface-hover)] transition-colors"
                      style={{ backgroundColor: checked ? 'var(--accent-soft)' : 'transparent' }}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) =>
                          setSelectedMicroIds((prev) => ({ ...prev, [item.id]: e.target.checked }))
                        }
                        className="mt-0.5 accent-[var(--accent)]"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-medium text-[var(--text-primary)]">
                          {item.title}
                        </div>
                        <div className="text-[11.5px] text-[var(--text-secondary)]">
                          <span className="font-mono-num">{item.date}</span> ·{' '}
                          <span className="font-mono-num">{formatHourCompact(item.startHour)}</span> ({mins}m) · {item.reason}
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setPendingMicroReviews(null)}
                  className="px-3 py-1.5 rounded-lg text-[12px] font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)]"
                  style={{ border: '1px solid var(--border-subtle)' }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={microSelectedCount === 0}
                  onClick={handleApproveMicroReviews}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[12px] font-medium disabled:opacity-40 whitespace-nowrap"
                  style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' }}
                >
                  <Check className="w-3.5 h-3.5" />
                  Approve Selected ({microSelectedCount})
                </button>
              </div>
            </div>
          )}

          {/* 14-Day Forgetting Curve Chart */}
          <div className="rounded-xl p-4" style={surfaceStyle}>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <div>
                <h2 className="font-display text-[14.5px] font-semibold text-[var(--text-primary)]">
                  14-Day Forgetting Curve Forecast
                </h2>
                <p className="text-[12px] text-[var(--text-muted)]">
                  Projected mean recall probability based on each card&apos;s SM-2 interval, ease factor, and review recency
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  askPip(
                    'Analyze my flashcard forgetting curves and upcoming exams, then propose micro-review blocks into my open calendar slots for me to review and approve.',
                    { openFloating: true },
                  )
                }
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12px] font-medium whitespace-nowrap text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)]"
                style={{ border: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-surface-subtle)' }}
              >
                <Sparkles className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} />
                Ask Pip to Optimize Schedule
              </button>
            </div>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={forgettingCurve} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
                  <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="dayLabel" tick={{ fill: 'var(--text-muted)', fontSize: 11.5 }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fill: 'var(--text-muted)', fontSize: 11.5 }} axisLine={false} tickLine={false} unit="%" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--bg-elevated)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 10,
                      fontSize: 12,
                    }}
                    formatter={(val, name) => [name === 'avgRetention' ? `${val}%` : val, name === 'avgRetention' ? 'Projected Recall' : 'At-Risk Cards']}
                    labelFormatter={(label, payload) => {
                      const pt = payload?.[0]?.payload as { date?: string; examTitles?: string[] } | undefined;
                      const examsText = pt?.examTitles?.length ? ` · Exam: ${pt.examTitles.join(', ')}` : '';
                      return `${label} (${pt?.date ?? ''})${examsText}`;
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="avgRetention"
                    name="avgRetention"
                    stroke="var(--accent)"
                    fill="var(--accent-soft)"
                    strokeWidth={2.25}
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Deck Readiness Table */}
          <div className="rounded-xl overflow-hidden" style={surfaceStyle}>
            <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              <div>
                <h2 className="font-display text-[14.5px] font-semibold text-[var(--text-primary)]">
                  Deck Readiness & Exam-Day Forecast
                </h2>
                <p className="text-[12px] text-[var(--text-muted)]">
                  Sorted by lowest projected recall so high-risk decks stay at the top
                </p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-[12.5px]">
                <thead>
                  <tr style={{ backgroundColor: 'var(--bg-surface-subtle)', borderBottom: '1px solid var(--border-subtle)' }}>
                    <th className="py-2.5 px-4 font-medium text-[var(--text-muted)]">Deck</th>
                    <th className="py-2.5 px-4 font-medium text-[var(--text-muted)]">Next Exam</th>
                    <th className="py-2.5 px-4 font-medium text-[var(--text-muted)] text-right">Today</th>
                    <th className="py-2.5 px-4 font-medium text-[var(--text-muted)] text-right">At Exam</th>
                    <th className="py-2.5 px-4 font-medium text-[var(--text-muted)] text-right">At-Risk</th>
                    <th className="py-2.5 px-4 font-medium text-[var(--text-muted)]">Status</th>
                    <th className="py-2.5 px-4 font-medium text-[var(--text-muted)] text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)]">
                  {srsAnalysis.decks.map((row) => (
                    <tr key={row.deckId} className="hover:bg-[var(--bg-surface-hover)] transition-colors">
                      <td className="py-2.5 px-4">
                        <div className="font-medium text-[var(--text-primary)]">{row.deckTitle}</div>
                        <div className="text-[11px] text-[var(--text-muted)]">
                          {row.subjectCode} · {row.totalCards} cards · {row.dueTodayCount} due
                        </div>
                      </td>
                      <td className="py-2.5 px-4 text-[var(--text-secondary)]">
                        {row.nextExamTitle ? (
                          <div>
                            <div className="text-[var(--text-primary)]">{row.nextExamTitle}</div>
                            <div className="font-mono-num text-[11px] text-[var(--text-muted)]">
                              {row.nextExamDate} ({row.daysUntilExam}d)
                            </div>
                          </div>
                        ) : (
                          <span className="text-[var(--text-muted)]">7-day horizon</span>
                        )}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono-num text-[var(--text-primary)]">
                        {row.avgRetentionToday}%
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono-num font-semibold text-[var(--text-primary)]">
                        {row.avgRetentionAtExam}%
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono-num text-[var(--text-secondary)]">
                        {row.atRiskCount}
                      </td>
                      <td className="py-2.5 px-4">
                        <RiskLabel risk={row.risk} />
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveDeckId(row.deckId);
                            setCardIndex(0);
                            setFlipped(false);
                            setSessionDone(false);
                            setReviewedInSession(0);
                          }}
                          className="px-2.5 py-1 rounded-md text-[11.5px] font-medium whitespace-nowrap"
                          style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' }}
                        >
                          Study Deck
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Most At-Risk Cards List */}
          {srsAnalysis.cards.filter((c) => c.risk !== 'safe').length > 0 && (
            <div className="rounded-xl p-4 space-y-2.5" style={surfaceStyle}>
              <h2 className="font-display text-[14.5px] font-semibold text-[var(--text-primary)]">
                Concepts Most Likely to Be Forgotten Soon
              </h2>
              <div className="divide-y divide-[var(--border-subtle)]">
                {srsAnalysis.cards
                  .filter((c) => c.risk !== 'safe')
                  .slice(0, 6)
                  .map((item) => (
                    <div key={item.card.id} className="py-2.5 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-[13px] font-medium text-[var(--text-primary)] truncate">
                          {item.card.front}
                        </div>
                        <div className="text-[11.5px] text-[var(--text-muted)]">
                          {item.subjectCode} · {item.deckTitle} · Stability{' '}
                          <span className="font-mono-num">{item.stabilityDays}d</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="font-mono-num text-[12px] text-[var(--text-secondary)]">
                          {item.retentionAtExam}% at exam
                        </span>
                        <RiskLabel risk={item.risk} />
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <>
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
          <SyllabusResourceBrowser subjects={subjects} resources={decks} label="decks" onCreate={(subject,chapterId)=>{const chapter=subject.chapters.find(ch=>ch.id===chapterId);if(chapter){addDeck({title:`${chapter.title} Deck`,subjectId:subject.id,description:'',syllabusLinks:{chapterIds:[chapterId]}})}}} render={(deck,displayTitle)=>{
              const sub = subjects.find((s) => s.id === deck.subjectId);
              const cards = flashcards.filter((c) => c.deckId === deck.id);
              const due = cards.filter((c) => c.dueToday).length;
              const deckSrs = srsAnalysis.decks.find((d) => d.deckId === deck.id);

              return (
                <div key={deck.id} className="rounded-xl p-4 flex flex-col justify-between gap-3.5" style={surfaceStyle}>
                  <div>
                    <div className="flex items-center justify-between text-[11.5px]">
                      <span className="inline-flex items-center gap-1.5 font-medium" style={{ color: sub?.color }}>
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: sub?.color }} />
                        {sub?.code}
                      </span>
                      <span className="font-mono-num text-[var(--text-muted)]">
                        {deckSrs ? `${deckSrs.avgRetentionToday}% recall` : legacyCalendar ? '—' : `${deck.retentionRate}% retention`}
                      </span>
                    </div>
                    <h2 className="font-display text-[15.5px] font-semibold text-[var(--text-primary)] mt-1">
                      {displayTitle}
                    </h2>
                    <p className="text-[12.5px] text-[var(--text-secondary)] mt-0.5">{deck.description}</p>
                  </div>

<div className="space-y-2"><label className="text-xs text-[var(--text-muted)]">Subject <select value={deck.subjectId} onChange={e=>updateDeckLinks(deck.id,e.target.value,undefined)} className="ml-2 rounded border border-[var(--border-subtle)] bg-[var(--bg-surface)]"><option value="">Unassigned</option>{subjects.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>{sub&&<SyllabusLinkPicker subject={sub} links={deck.syllabusLinks} onChange={links=>updateDeckLinks(deck.id,sub.id,links)}/>}</div>
                                    <div className="pt-3 flex flex-wrap items-center justify-between gap-2" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                    <div className="text-[12px] text-[var(--text-muted)]">
                      <span className="font-mono-num font-semibold text-[var(--text-primary)]">{due}</span> due today ·{' '}
                      <span className="font-mono-num">{cards.length}</span> total
                      {deckSrs && deckSrs.atRiskCount > 0 ? (
                        <span className="ml-1.5 text-rose-600 dark:text-rose-400 font-mono-num">
                          · {deckSrs.atRiskCount} at-risk
                        </span>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleExportAnkiDeck(deck.id, deck.title)}
                        title="Export deck as Anki-compatible TSV"
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[12px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] whitespace-nowrap"
                        style={{ border: '1px solid var(--border-subtle)' }}
                      >
                        <Download className="w-3.5 h-3.5" /> Anki TSV
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveDeckId(deck.id);
                          setCardIndex(0);
                          setFlipped(false);
                          setSessionDone(false);
                          setReviewedInSession(0);
                        }}
                        className="px-3 py-1.5 rounded-lg text-[12.5px] font-medium whitespace-nowrap"
                        style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' }}
                      >
                        Study Deck
                      </button>
                    </div>
                  </div>
                </div>
              );
}} />

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
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-display text-[14.5px] font-semibold text-[var(--text-primary)]">
                  Spaced Repetition Forecast
                </h2>
                <button
                  type="button"
                  onClick={() => setViewTab('intelligence')}
                  className="text-[11.5px] font-medium hover:underline"
                  style={{ color: 'var(--accent)' }}
                >
                  Open Retention Lab
                </button>
              </div>
              <div className="divide-y divide-[var(--border-subtle)] text-[12.5px]">
                {Array.from({ length: 4 }, (_, index) => {
                  const date = dateAt(index);
                  const day = localDay(date);
                  return {
                    label: index === 0
                      ? `Today (${date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })})`
                      : index === 1
                        ? `Tomorrow (${date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })})`
                        : date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }),
                    due: index === 0 ? dueTotal : flashcards.filter(card => card.nextReviewDate === day).length,
                    status: index === 0 ? 'Ready now' : 'Scheduled',
                  };
                }).map((row) => (
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
        </>
      )}

      {/* Anki TSV/CSV Import Review & Approve Modal */}
      {ankiOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Import Anki Flashcards">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-[1px]" onClick={() => setAnkiOpen(false)} />
          <div
            className="relative w-full max-w-2xl max-h-[88vh] flex flex-col rounded-2xl overflow-hidden"
            style={{
              backgroundColor: 'var(--bg-elevated)',
              border: '1px solid var(--border-subtle)',
              boxShadow: 'var(--shadow-floating)',
            }}
          >
            <div className="px-5 py-3.5 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              <div>
                <h2 className="font-display text-[15.5px] font-semibold text-[var(--text-primary)]">
                  Import Anki Deck (TSV / CSV)
                </h2>
                <p className="text-[12px] text-[var(--text-muted)]">
                  Upload an Anki text export or paste tab/comma-separated cards, then review and approve before adding.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAnkiOpen(false)}
                aria-label="Close Anki importer"
                className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="block space-y-1 text-[12px]">
                  <span className="text-[var(--text-secondary)] font-medium">Destination Deck</span>
                  <select
                    value={ankiTargetDeckId}
                    onChange={(e) => setAnkiTargetDeckId(e.target.value)}
                    className="w-full h-9 px-2.5 rounded-lg text-[12.5px]"
                    style={{
                      backgroundColor: 'var(--bg-surface)',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--text-primary)',
                    }}
                  >
                    <option value="__new__">+ Create new deck</option>
                    {decks.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.title}
                      </option>
                    ))}
                  </select>
                </label>

                {ankiTargetDeckId === '__new__' && (
                  <label className="block space-y-1 text-[12px]">
                    <span className="text-[var(--text-secondary)] font-medium">New Deck Title</span>
                    <input
                      type="text"
                      value={ankiNewDeckTitle}
                      onChange={(e) => setAnkiNewDeckTitle(e.target.value)}
                      className="w-full h-9 px-2.5 rounded-lg text-[12.5px]"
                      style={{
                        backgroundColor: 'var(--bg-surface)',
                        border: '1px solid var(--border-subtle)',
                        color: 'var(--text-primary)',
                      }}
                    />
                  </label>
                )}

                {ankiTargetDeckId === '__new__' && (
                  <label className="block space-y-1 text-[12px]">
                    <span className="text-[var(--text-secondary)] font-medium">Subject</span>
                    <select
                      value={ankiNewDeckSubjectId}
                      onChange={(e) => setAnkiNewDeckSubjectId(e.target.value)}
                      className="w-full h-9 px-2.5 rounded-lg text-[12.5px]"
                      style={{
                        backgroundColor: 'var(--bg-surface)',
                        border: '1px solid var(--border-subtle)',
                        color: 'var(--text-primary)',
                      }}
                    >
                      <option value="">General</option>
                      {subjects.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.code} · {s.name}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-medium text-[var(--text-secondary)]">
                    Paste TSV / CSV or upload file
                  </span>
                  <input
                    ref={ankiFileRef}
                    type="file"
                    accept=".tsv,.csv,.txt"
                    className="hidden"
                    onChange={(e) => void handleAnkiFileUpload(e.target.files?.[0])}
                  />
                  <button
                    type="button"
                    onClick={() => ankiFileRef.current?.click()}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11.5px] font-medium text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)]"
                    style={{ border: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-surface)' }}
                  >
                    <Upload className="w-3 h-3" /> Choose .tsv / .csv / .txt
                  </button>
                </div>
                <textarea
                  rows={4}
                  value={ankiRaw}
                  onChange={(e) => handleAnkiTextChange(e.target.value)}
                  placeholder={'Front\\tBack\\tOptional Hint\nTime complexity of Merge Sort\\tO(n log n)\\tDivide and conquer'}
                  className="w-full rounded-lg p-3 text-[12.5px] font-mono resize-y"
                  style={{
                    backgroundColor: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-primary)',
                  }}
                />
              </div>

              {parsedAnkiCards.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[12px]">
                    <span className="font-semibold text-[var(--text-primary)]">
                      Preview & Approve (<span className="font-mono-num">{ankiSelectedCount}</span> / {parsedAnkiCards.length} selected)
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const all: Record<number, boolean> = {};
                          parsedAnkiCards.forEach((_, idx) => {
                            all[idx] = true;
                          });
                          setAnkiChecked(all);
                        }}
                        className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] underline"
                      >
                        Select all
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const none: Record<number, boolean> = {};
                          parsedAnkiCards.forEach((_, idx) => {
                            none[idx] = false;
                          });
                          setAnkiChecked(none);
                        }}
                        className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] underline"
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                  <div className="max-h-52 overflow-y-auto divide-y divide-[var(--border-subtle)] rounded-lg" style={{ border: '1px solid var(--border-subtle)' }}>
                    {parsedAnkiCards.map((card, idx) => {
                      const checked = ankiChecked[idx] !== false;
                      return (
                        <label
                          key={`${idx}-${card.front.slice(0, 24)}`}
                          className="flex items-start gap-2.5 px-3 py-2 text-[12px] cursor-pointer hover:bg-[var(--bg-surface-hover)]"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) =>
                              setAnkiChecked((prev) => ({ ...prev, [idx]: e.target.checked }))
                            }
                            className="mt-0.5 accent-[var(--accent)]"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="font-medium text-[var(--text-primary)]">{card.front}</div>
                            <div className="text-[var(--text-secondary)]">{card.back}</div>
                            {card.hint && <div className="text-[11px] text-[var(--text-muted)]">Hint: {card.hint}</div>}
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="px-5 py-3 flex items-center justify-end gap-2" style={{ borderTop: '1px solid var(--border-subtle)' }}>
              <button
                type="button"
                onClick={() => setAnkiOpen(false)}
                className="px-3.5 py-1.5 rounded-lg text-[12.5px] text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={ankiSelectedCount === 0}
                onClick={handleApproveAnkiImport}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-[12.5px] font-medium disabled:opacity-40 whitespace-nowrap"
                style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' }}
              >
                <Check className="w-3.5 h-3.5" />
                Approve & Import ({ankiSelectedCount})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
