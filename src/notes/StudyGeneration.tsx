import { useEffect, useMemo, useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Loader2,
  Play,
  Plus,
  Sparkles,
  Trash2,
  Check,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useAssistant } from '../assistant/AssistantContext';
import { CHAT_LIMITS } from '../assistant/protocol';
import { readGeneratedCards, readGeneratedQuestions, type GeneratedCard } from './generatedStudyItems';

interface StudyGenerationProps {
  quiz?: boolean;
  defaultOpen?: boolean;
  onQuizCreated?: (quizId: string) => void;
  onDeckSaved?: (deckId: string) => void;
}

export function StudyGeneration({
  quiz = false,
  defaultOpen = false,
  onQuizCreated,
  onDeckSaved,
}: StudyGenerationProps) {
  const { notes, decks, selectedNoteId, addDeck, addQuiz, addFlashcard, pushToast } = useApp();
  const { generate, cooldown } = useAssistant();

  const [open, setOpen] = useState(defaultOpen);
  const [noteId, setNoteId] = useState(() => selectedNoteId || notes[0]?.id || '');
  const [sectionIdx, setSectionIdx] = useState(0);
  const [deckMode, setDeckMode] = useState<'existing' | 'new'>(() => (decks.length ? 'existing' : 'new'));
  const [deckId, setDeckId] = useState(() => decks[0]?.id ?? '');
  const [newDeckTitle, setNewDeckTitle] = useState('');
  const [quizTitle, setQuizTitle] = useState('');
  const [difficulty, setDifficulty] = useState<'Standard' | 'Challenge' | 'Exam Level'>('Standard');
  const [count, setCount] = useState(5);
  const [kind, setKind] = useState<'mixed' | 'mcq' | 'multi' | 'short'>('mixed');
  const [cards, setCards] = useState<GeneratedCard[]>([]);
  const [createdQuizId, setCreatedQuizId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // Keep selected note & deck in sync if notes/decks change
  useEffect(() => {
    if (!noteId || !notes.some((n) => n.id === noteId)) {
      const next = notes.find((n) => n.id === selectedNoteId)?.id ?? notes[0]?.id ?? '';
      setNoteId(next);
      setSectionIdx(0);
    }
  }, [notes, noteId, selectedNoteId]);

  useEffect(() => {
    if (!deckId || !decks.some((d) => d.id === deckId)) {
      setDeckId(decks[0]?.id ?? '');
    }
    if (!decks.length) setDeckMode('new');
  }, [decks, deckId]);

  const note = notes.find((n) => n.id === noteId);

  const sections = useMemo(() => {
    if (!note) return [];
    const list: Array<{ label: string; text: string }> = [];
    const mdParts = note.content
      .split(/(?=^#{1,6} )/m)
      .map((s) => s.trim())
      .filter(Boolean);
    const pdfPages = (note.pdf?.pages ?? [])
      .map((p, idx) => ({
        label: `PDF Page ${idx + 1}`,
        text: p.text.trim(),
      }))
      .filter((p) => p.text);

    const fullText = [note.content.trim(), ...pdfPages.map((p) => `${p.label}\n${p.text}`)]
      .filter(Boolean)
      .join('\n\n')
      .slice(0, Math.min(28_000, CHAT_LIMITS.context - 500));

    if (fullText) {
      list.push({
        label: `Entire note (${Math.max(1, Math.round(fullText.split(/\s+/).length))} words)`,
        text: fullText,
      });
    }
    if (mdParts.length > 1) {
      for (const part of mdParts) {
        const heading = part.split('\n')[0].replace(/^#+\s*/, '').trim().slice(0, 72);
        list.push({ label: `Section: ${heading || 'Excerpt'}`, text: part });
      }
    }
    for (const page of pdfPages) {
      list.push({ label: page.label, text: page.text });
    }
    return list;
  }, [note]);

  const activeSection = sections[sectionIdx] ?? sections[0];
  const canGenerate =
    Boolean(note && activeSection?.text) &&
    (quiz || deckMode === 'new' ? Boolean(quiz || newDeckTitle.trim() || note?.title) : Boolean(deckId)) &&
    Number.isInteger(count) &&
    count >= 1 &&
    count <= 20;

  const handleGenerate = async () => {
    if (!note || !activeSection || !canGenerate) return;
    setBusy(true);
    setError('');
    setCreatedQuizId(null);
    try {
      if (quiz) {
        const result = await generate(
          'practice',
          `Generate ${count} ${kind} practice test questions strictly grounded in the provided note excerpt. Write chemical formulas cleanly with Unicode subscripts/superscripts (e.g., Na₂CO₃) and use standard KaTeX $...$ only for equations. Return an items array where each item has type (mcq, multi, or short), prompt, options (4 choices for mcq/multi), answer (exact option string for mcq, array of exact option strings for multi, concise expected answer for short), and explanation with evidence. For short questions also include a concise rubric string.`,
          activeSection.text,
        );
        const questions = readGeneratedQuestions(result, note.title, count, kind);
        const finalTitle = quizTitle.trim() || `${note.title} Practice Test`;
        const id = crypto.randomUUID();
        addQuiz({
          id,
          title: finalTitle,
          subjectId: note.subjectId,
          durationMinutes: Math.max(5, questions.length * 2),
          difficulty,
          questions,
          sourceNoteId: note.id,
          sourceSection: activeSection.label.slice(0, 120),
        });
        setCreatedQuizId(id);
        pushToast(`Practice test ready (${questions.length} questions)`);
        return;
      }

      const result = await generate(
        'flashcards',
        `Generate ${count} high-yield active-recall flashcards strictly grounded in the provided note excerpt. Write chemical formulas cleanly with Unicode subscripts/superscripts (e.g., Na₂CO₃) and use KaTeX $...$ only for math equations. Return an items array of objects with concise front (question/prompt) and back (clear answer) strings.`,
        activeSection.text,
      );
      setCards(readGeneratedCards(result, count));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not generate study items. Try again.');
    } finally {
      setBusy(false);
    }
  };

  const handleSaveCards = () => {
    if (!cards.length || cards.some((c) => !c.front.trim() || !c.back.trim())) return;
    let targetDeckId = deckId;
    if (deckMode === 'new' || !targetDeckId) {
      const title = newDeckTitle.trim() || (note ? `${note.title} Deck` : 'AI Generated Deck');
      targetDeckId = addDeck({
        title,
        subjectId: note?.subjectId ?? '',
        description: note ? `Generated from note: ${note.title}` : 'AI-generated flashcard deck',
      });
      setDeckId(targetDeckId);
      setDeckMode('existing');
      setNewDeckTitle('');
    }
    for (const card of cards) {
      addFlashcard({
        front: card.front.trim(),
        back: card.back.trim(),
        deckId: targetDeckId,
        hint: note?.title,
      });
    }
    const savedCount = cards.length;
    setCards([]);
    pushToast(`Saved ${savedCount} flashcards to deck`);
    onDeckSaved?.(targetDeckId);
  };

  const inputClass =
    'w-full rounded-lg px-2.5 py-1.5 text-[12.5px] text-[var(--text-primary)] outline-none transition-colors';
  const inputStyle = {
    backgroundColor: 'var(--bg-surface-subtle)',
    border: '1px solid var(--border-subtle)',
  };

  return (
    <section
      className="rounded-xl overflow-hidden"
      style={{
        backgroundColor: 'var(--bg-surface)',
        border: open ? '1px solid var(--accent-border)' : '1px solid var(--border-subtle)',
        boxShadow: 'var(--shadow-subtle)',
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full px-4 py-3 flex items-center justify-between gap-3 text-left transition-colors hover:bg-[var(--bg-surface-hover)]"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
            style={{ backgroundColor: 'var(--accent-soft)', color: 'var(--accent)' }}
          >
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <div className="text-[13.5px] font-semibold text-[var(--text-primary)]">
              {quiz ? 'Generate Practice Test from Notes' : 'Generate Flashcards from Notes'}
            </div>
            <div className="text-[11.5px] text-[var(--text-muted)] truncate">
              {quiz
                ? 'Turn any study note or PDF section into a timed MCQ & short-answer quiz with Gemini'
                : 'Convert your notes into spaced-repetition flashcards and save to an existing or new deck'}
            </div>
          </div>
        </div>
        <span className="inline-flex items-center gap-1 text-[12px] font-medium shrink-0" style={{ color: 'var(--accent)' }}>
          {open ? 'Hide' : 'Configure'}
          {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </span>
      </button>

      {open && (
        <div className="px-4 pb-4 pt-3 space-y-3.5" style={{ borderTop: '1px solid var(--border-subtle)' }}>
          {notes.length === 0 ? (
            <p className="text-[12.5px] text-[var(--text-muted)]">
              Add a note or upload a PDF/DOCX in Notes first, then generate {quiz ? 'practice tests' : 'flashcards'} from it here.
            </p>
          ) : (
            <fieldset disabled={busy || cooldown > 0} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <label className="space-y-1">
                  <span className="block text-[11.5px] font-medium text-[var(--text-secondary)]">Source Note</span>
                  <select
                    value={noteId}
                    onChange={(e) => {
                      setNoteId(e.target.value);
                      setSectionIdx(0);
                      setCards([]);
                      setCreatedQuizId(null);
                    }}
                    className={inputClass}
                    style={inputStyle}
                  >
                    {notes.map((n) => (
                      <option key={n.id} value={n.id}>
                        {n.title}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-1">
                  <span className="block text-[11.5px] font-medium text-[var(--text-secondary)]">Scope / Section</span>
                  <select
                    value={sectionIdx}
                    onChange={(e) => {
                      setSectionIdx(Number(e.target.value));
                      setCards([]);
                    }}
                    className={inputClass}
                    style={inputStyle}
                  >
                    {sections.length === 0 ? (
                      <option value={0}>Note has no text yet</option>
                    ) : (
                      sections.map((s, i) => (
                        <option key={i} value={i}>
                          {s.label}
                        </option>
                      ))
                    )}
                  </select>
                </label>

                {quiz ? (
                  <>
                    <label className="space-y-1">
                      <span className="block text-[11.5px] font-medium text-[var(--text-secondary)]">Question Style</span>
                      <select
                        value={kind}
                        onChange={(e) => setKind(e.target.value as typeof kind)}
                        className={inputClass}
                        style={inputStyle}
                      >
                        <option value="mixed">Mixed (MCQ + Multi + Short)</option>
                        <option value="mcq">Multiple Choice (MCQ)</option>
                        <option value="multi">Multi-Select</option>
                        <option value="short">Short Answer (AI Graded)</option>
                      </select>
                    </label>
                    <label className="space-y-1">
                      <span className="block text-[11.5px] font-medium text-[var(--text-secondary)]">
                        Questions & Level
                      </span>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={1}
                          max={20}
                          value={count}
                          onChange={(e) => setCount(Math.max(1, Math.min(20, Number(e.target.value) || 5)))}
                          aria-label="Number of questions"
                          className="w-16 rounded-lg px-2 py-1.5 text-[12.5px] font-mono-num text-[var(--text-primary)] outline-none"
                          style={inputStyle}
                        />
                        <select
                          value={difficulty}
                          onChange={(e) => setDifficulty(e.target.value as typeof difficulty)}
                          aria-label="Difficulty"
                          className={`flex-1 ${inputClass}`}
                          style={inputStyle}
                        >
                          <option value="Standard">Standard</option>
                          <option value="Challenge">Challenge</option>
                          <option value="Exam Level">Exam Level</option>
                        </select>
                      </div>
                    </label>
                  </>
                ) : (
                  <>
                    <label className="space-y-1">
                      <span className="block text-[11.5px] font-medium text-[var(--text-secondary)]">Target Deck</span>
                      <select
                        value={deckMode === 'new' ? '__new__' : deckId}
                        onChange={(e) => {
                          if (e.target.value === '__new__') {
                            setDeckMode('new');
                          } else {
                            setDeckMode('existing');
                            setDeckId(e.target.value);
                          }
                        }}
                        className={inputClass}
                        style={inputStyle}
                      >
                        {decks.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.title}
                          </option>
                        ))}
                        <option value="__new__">+ Create new deck…</option>
                      </select>
                    </label>

                    <label className="space-y-1">
                      <span className="block text-[11.5px] font-medium text-[var(--text-secondary)]">Cards to Generate</span>
                      <input
                        type="number"
                        min={1}
                        max={20}
                        value={count}
                        onChange={(e) => setCount(Math.max(1, Math.min(20, Number(e.target.value) || 5)))}
                        className={`${inputClass} font-mono-num`}
                        style={inputStyle}
                      />
                    </label>
                  </>
                )}
              </div>

              {/* Optional new deck name or custom quiz title */}
              <div className="flex flex-wrap items-end justify-between gap-3">
                {quiz ? (
                  <label className="flex-1 min-w-[200px] space-y-1">
                    <span className="block text-[11.5px] font-medium text-[var(--text-secondary)]">
                      Custom Test Title (optional)
                    </span>
                    <input
                      type="text"
                      value={quizTitle}
                      onChange={(e) => setQuizTitle(e.target.value)}
                      placeholder={note ? `${note.title} Practice Test` : 'Practice Test Title'}
                      className={inputClass}
                      style={inputStyle}
                    />
                  </label>
                ) : deckMode === 'new' ? (
                  <label className="flex-1 min-w-[200px] space-y-1">
                    <span className="block text-[11.5px] font-medium text-[var(--text-secondary)]">
                      New Deck Title
                    </span>
                    <input
                      type="text"
                      value={newDeckTitle}
                      onChange={(e) => setNewDeckTitle(e.target.value)}
                      placeholder={note ? `${note.title} Deck` : 'New Flashcard Deck'}
                      className={inputClass}
                      style={inputStyle}
                    />
                  </label>
                ) : (
                  <div className="text-[11.5px] text-[var(--text-muted)]">
                    Cards will be drafted for your review before saving to the selected deck.
                  </div>
                )}

                <button
                  type="button"
                  disabled={!canGenerate || busy || cooldown > 0}
                  onClick={() => void handleGenerate()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12.5px] font-medium whitespace-nowrap transition-opacity disabled:opacity-45"
                  style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' }}
                >
                  {busy ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Generating…
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      {quiz ? 'Generate Practice Test' : 'Generate Flashcards'}
                    </>
                  )}
                </button>
              </div>

              {cooldown > 0 && (
                <p role="status" className="text-[12px] text-[var(--text-muted)] font-mono-num">
                  Rate limit cooldown — try again in {cooldown}s.
                </p>
              )}

              {error && (
                <p
                  role="alert"
                  className="rounded-lg px-3 py-2 text-[12px] text-rose-600 dark:text-rose-400"
                  style={{ backgroundColor: 'var(--bg-surface-subtle)', border: '1px solid var(--border-subtle)' }}
                >
                  {error}
                </p>
              )}

              {/* Created Quiz Quick Start Banner */}
              {createdQuizId && (
                <div
                  className="rounded-xl p-3 flex flex-wrap items-center justify-between gap-3"
                  style={{
                    backgroundColor: 'var(--accent-soft)',
                    border: '1px solid var(--accent-border)',
                  }}
                >
                  <div className="flex items-center gap-2 text-[12.5px] font-medium text-[var(--text-primary)]">
                    <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                    Practice test created and added to your library.
                  </div>
                  {onQuizCreated && (
                    <button
                      type="button"
                      onClick={() => onQuizCreated(createdQuizId)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium whitespace-nowrap"
                      style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' }}
                    >
                      <Play className="w-3.5 h-3.5" /> Start Test Now
                    </button>
                  )}
                </div>
              )}

              {/* Editable Draft Flashcards */}
              {cards.length > 0 && (
                <div className="space-y-3 pt-2" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-[12.5px] font-semibold text-[var(--text-primary)]">
                      Review Draft Flashcards ({cards.length})
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setCards((prev) => [...prev, { front: '', back: '' }])}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[12px] text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)]"
                        style={{ border: '1px solid var(--border-subtle)' }}
                      >
                        <Plus className="w-3.5 h-3.5" /> Add Card
                      </button>
                      <button
                        type="button"
                        disabled={cards.some((c) => !c.front.trim() || !c.back.trim())}
                        onClick={handleSaveCards}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[12px] font-medium disabled:opacity-45"
                        style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' }}
                      >
                        <Check className="w-3.5 h-3.5" />
                        Save {cards.length} Cards
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[360px] overflow-y-auto pr-1">
                    {cards.map((c, i) => (
                      <div
                        key={i}
                        className="rounded-xl p-3 space-y-2"
                        style={{
                          backgroundColor: 'var(--bg-surface-subtle)',
                          border: '1px solid var(--border-subtle)',
                        }}
                      >
                        <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)]">
                          <span className="font-mono-num font-semibold">Card {i + 1}</span>
                          <button
                            type="button"
                            onClick={() => setCards((prev) => prev.filter((_, j) => j !== i))}
                            className="inline-flex items-center gap-1 text-rose-500 hover:underline"
                          >
                            <Trash2 className="w-3 h-3" /> Discard
                          </button>
                        </div>
                        <textarea
                          rows={2}
                          aria-label={`Card ${i + 1} front`}
                          placeholder="Front (question or concept)"
                          value={c.front}
                          onChange={(e) =>
                            setCards((prev) => prev.map((v, j) => (j === i ? { ...v, front: e.target.value } : v)))
                          }
                          className="w-full rounded-lg p-2 text-[12.5px] text-[var(--text-primary)] outline-none resize-none"
                          style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}
                        />
                        <textarea
                          rows={2}
                          aria-label={`Card ${i + 1} back`}
                          placeholder="Back (concise answer)"
                          value={c.back}
                          onChange={(e) =>
                            setCards((prev) => prev.map((v, j) => (j === i ? { ...v, back: e.target.value } : v)))
                          }
                          className="w-full rounded-lg p-2 text-[12.5px] text-[var(--text-primary)] outline-none resize-none"
                          style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </fieldset>
          )}
        </div>
      )}
    </section>
  );
}
