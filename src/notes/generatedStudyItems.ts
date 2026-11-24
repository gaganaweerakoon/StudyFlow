import type { QuizQuestion } from '../types/studyflow';

const nonempty = (value: unknown): value is string => typeof value === 'string' && Boolean(value.trim());
export type GeneratedCard = { front: string; back: string };

export function readGeneratedCards(input: unknown, count?: number): GeneratedCard[] {
  if (!Array.isArray(input) || input.length < 1 || input.length > 30) {
    throw new Error('Incomplete flashcard set. Try again.');
  }
  const cleaned = input
    .filter((card): card is { front: string; back: string } => Boolean(card) && nonempty(card.front) && nonempty(card.back))
    .map(({ front, back }) => ({ front: front.trim(), back: back.trim() }));

  if (!cleaned.length) {
    throw new Error('Incomplete flashcard set. Try again.');
  }
  return count !== undefined ? cleaned.slice(0, count) : cleaned;
}

function matchOption(options: string[], candidate: string): string | undefined {
  const trimmed = candidate.trim();
  const exact = options.find((opt) => opt === trimmed);
  if (exact) return exact;
  const ci = options.find((opt) => opt.toLowerCase() === trimmed.toLowerCase());
  if (ci) return ci;
  // Match letter index like "A" or "A." when model outputs option letter
  const letter = trimmed.match(/^([A-F])(?:[).:\s]|$)/i);
  if (letter) {
    const idx = letter[1].toUpperCase().charCodeAt(0) - 65;
    if (idx >= 0 && idx < options.length) return options[idx];
  }
  return undefined;
}

export function readGeneratedQuestions(input: unknown, topic: string, count?: number, kind = 'mixed'): QuizQuestion[] {
  if (!Array.isArray(input) || input.length < 1 || input.length > 30) {
    throw new Error('Incomplete test from provider.');
  }
  const results: QuizQuestion[] = [];
  for (const question of input) {
    const raw = (question ?? {}) as Record<string, unknown>;
    const type = raw.type;
    const prompt = typeof raw.prompt === 'string' ? raw.prompt.trim() : '';
    const explanation = typeof raw.explanation === 'string' ? raw.explanation.trim() : '';
    const rubric = typeof raw.rubric === 'string' ? raw.rubric.trim() : undefined;
    if (
      (type !== 'mcq' && type !== 'multi' && type !== 'short') ||
      (kind !== 'mixed' && kind !== type) ||
      !prompt ||
      !explanation
    ) {
      continue;
    }

    if (type === 'short') {
      const answerStr = Array.isArray(raw.answer)
        ? raw.answer.filter(nonempty).map((s) => s.trim()).join('; ')
        : nonempty(raw.answer)
          ? raw.answer.trim()
          : '';
      if (!answerStr) continue;
      results.push({
        id: crypto.randomUUID(),
        type,
        prompt,
        explanation,
        topic: typeof raw.topic === 'string' && raw.topic.trim() ? raw.topic.trim() : topic,
        correctAnswer: answerStr,
        rubric: rubric || undefined,
      });
      continue;
    }

    const rawOptions = Array.isArray(raw.options)
      ? raw.options.filter(nonempty).map((o) => o.trim())
      : [];
    if (rawOptions.length < 2) continue;

    if (type === 'mcq') {
      const rawAns = Array.isArray(raw.answer) ? raw.answer[0] : raw.answer;
      if (!nonempty(rawAns)) continue;
      const matched = matchOption(rawOptions, rawAns);
      if (!matched) continue;
      results.push({
        id: crypto.randomUUID(),
        type,
        prompt,
        explanation,
        topic: typeof raw.topic === 'string' && raw.topic.trim() ? raw.topic.trim() : topic,
        options: rawOptions,
        correctAnswer: matched,
      });
      continue;
    }

    // type === 'multi'
    const rawAnsArr = Array.isArray(raw.answer)
      ? raw.answer.filter(nonempty)
      : nonempty(raw.answer)
        ? raw.answer.split(/\n|;/).filter(nonempty)
        : [];
    const matchedAll = [...new Set(rawAnsArr.map((a) => matchOption(rawOptions, a)).filter((x): x is string => Boolean(x)))];
    if (!matchedAll.length) continue;
    results.push({
      id: crypto.randomUUID(),
      type,
      prompt,
      explanation,
      topic: typeof raw.topic === 'string' && raw.topic.trim() ? raw.topic.trim() : topic,
      options: rawOptions,
      correctAnswer: matchedAll.sort().join('\n'),
    });
  }

  if (!results.length) {
    throw new Error('Could not build valid questions from the AI response. Try again.');
  }
  return count !== undefined ? results.slice(0, count) : results;
}
