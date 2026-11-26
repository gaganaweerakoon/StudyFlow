export const memoryFields = [
  { key: 'materials', label: 'Study materials', example: 'Sinhala first, with English chemistry terms', relevant: /notes?|explain|chemistry|pdf|materials?|flashcards?|practice|teach|සටහන/i },
  { key: 'lessons', label: 'Lesson times', example: 'Morning and evening lessons', relevant: /schedul|calendar|plan|lessons?|session|available/i },
  { key: 'homework', label: 'Protected homework time', example: 'Keep 4–5 pm free for homework', relevant: /homework|schedul|calendar|plan|lessons?|session|available/i },
] as const;
export type StudyPreferences = Partial<Record<typeof memoryFields[number]['key'], string>>;
export function relevantPreferences(prompt: string, values?: StudyPreferences) {
  return Object.fromEntries(memoryFields.filter(field => field.relevant.test(prompt) && values?.[field.key]?.trim())
    .map(field => [field.label, values![field.key]!.slice(0, 300)]));
}
