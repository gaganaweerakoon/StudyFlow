import type { QuizQuestion } from '../types/studyflow';

const nonempty = (value: unknown): value is string => typeof value === 'string' && Boolean(value.trim());
export type GeneratedCard = { front: string; back: string };

export function readGeneratedCards(input: unknown, count?: number): GeneratedCard[] {
  if (!Array.isArray(input) || input.length < 1 || input.length > 30 ||
      (count !== undefined && input.length !== count) ||
      !input.every(card => nonempty(card?.front) && nonempty(card?.back))) {
    throw new Error('Incomplete flashcard set. Try again.');
  }
  return input.map(({ front, back }) => ({ front, back }));
}

export function readGeneratedQuestions(input: unknown, topic: string, count?: number, kind = 'mixed'): QuizQuestion[] {
  if (!Array.isArray(input) || input.length < 1 || input.length > 30 || (count !== undefined && input.length !== count)) {
    throw new Error('Incomplete test from provider.');
  }
  return input.map(question => {
    const { type, prompt, explanation, options, answer, rubric } = question ?? {};
    if (!['mcq', 'multi', 'short'].includes(type) || (kind !== 'mixed' && kind !== type) ||
        !nonempty(prompt) || !nonempty(explanation)) throw new Error('Invalid question from provider.');
    if (type !== 'short' && (!Array.isArray(options) || options.length < 2 || !options.every(nonempty))) {
      throw new Error('Missing answer choices.');
    }
    if (type === 'multi' ? !Array.isArray(answer) || !answer.length || !answer.every(option => options.includes(option))
      : !nonempty(answer) || (type === 'mcq' && !options.includes(answer))) throw new Error('Invalid answer key.');
    return {
      id: crypto.randomUUID(),
      type, prompt, explanation, topic,
      options: type === 'short' ? undefined : options,
      correctAnswer: type === 'multi' ? [...answer].sort().join('\n') : answer,
      rubric: type === 'short' && nonempty(rubric) ? rubric : undefined,
    };
  });
}
