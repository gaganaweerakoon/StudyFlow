import type { ExamItem, FlashcardDeck, FlashcardItem, StudySession, Subject } from '../types/studyflow';
import { findOpenSlotsForDay } from '../assistant/workspaceDiagnostics';

export type RetentionRiskLevel = 'safe' | 'watch' | 'at_risk';

export interface CardRetentionPrediction {
  card: FlashcardItem;
  deckTitle: string;
  subjectId: string;
  subjectCode: string;
  stabilityDays: number;
  retentionToday: number; // 0..100
  retentionAtExam: number; // 0..100
  nextExamTitle?: string;
  nextExamDate?: string;
  daysUntilExam?: number;
  risk: RetentionRiskLevel;
}

export interface DeckRetentionSummary {
  deckId: string;
  deckTitle: string;
  subjectId: string;
  subjectCode: string;
  totalCards: number;
  dueTodayCount: number;
  atRiskCount: number;
  avgRetentionToday: number;
  avgRetentionAtExam: number;
  nextExamTitle?: string;
  nextExamDate?: string;
  daysUntilExam?: number;
  risk: RetentionRiskLevel;
  recommendedMinutes: number;
}

export interface ForgettingCurvePoint {
  date: string;
  dayLabel: string;
  avgRetention: number;
  atRiskCount: number;
  examTitles: string[];
}

export interface ProposedMicroReview {
  id: string;
  deckId: string;
  deckTitle: string;
  subjectId: string;
  title: string;
  date: string;
  startHour: number;
  durationHours: number;
  atRiskCards: number;
  predictedRetention: number;
  reason: string;
}

function parseIsoDay(day: string): number {
  const ms = Date.parse(`${day}T00:00:00Z`);
  return Number.isFinite(ms) ? ms : Date.now();
}

function addDaysIso(baseDay: string, offset: number): string {
  const d = new Date(`${baseDay}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + offset);
  return d.toISOString().slice(0, 10);
}

function diffDays(fromDay: string, toDay: string): number {
  return Math.round((parseIsoDay(toDay) - parseIsoDay(fromDay)) / 86_400_000);
}

/**
 * Computes memory stability S (in days) using an Ebbinghaus / SM-2 hybrid curve.
 * Higher intervalDays, easeFactor, and mastery increase stability; lapses reduce it.
 */
export function computeCardStabilityDays(card: FlashcardItem): number {
  const baseInterval = Math.max(0.5, Number.isFinite(card.intervalDays) ? card.intervalDays : 1);
  const ease = Math.max(1.3, Math.min(3.2, Number.isFinite(card.easeFactor) ? card.easeFactor : 2.5));
  const masteryFactor = card.mastery === 'mature' ? 1.35 : card.mastery === 'learning' ? 0.95 : 0.65;
  const lapsePenalty = Math.max(0.45, 1 - (card.lapses ?? 0) * 0.12);
  // At t = intervalDays, target recall is ~85% => S ~= interval / -ln(0.85) ≈ interval * 6.15 scaled by ease & mastery
  const stability = baseInterval * (ease / 2.2) * masteryFactor * lapsePenalty * 3.8;
  return Math.max(0.8, Math.round(stability * 100) / 100);
}

/**
 * Estimates days since the card was last reviewed based on lastReviewedAt or nextReviewDate/intervalDays.
 */
export function estimateDaysSinceReview(card: FlashcardItem, todayStr: string): number {
  if (card.lastReviewedAt) {
    const day = card.lastReviewedAt.slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(day)) {
      return Math.max(0, diffDays(day, todayStr));
    }
  }
  if (card.nextReviewDate && /^\d{4}-\d{2}-\d{2}$/.test(card.nextReviewDate)) {
    const inferredLastReview = addDaysIso(card.nextReviewDate, -Math.max(1, Math.round(card.intervalDays || 1)));
    return Math.max(0, diffDays(inferredLastReview, todayStr));
  }
  if (card.dueToday) {
    return Math.max(1, card.intervalDays || 1);
  }
  return card.mastery === 'new' ? 1.5 : Math.max(0.5, (card.intervalDays || 1) * 0.45);
}

export function recallPercentAtElapsed(stabilityDays: number, elapsedDays: number): number {
  const safeElapsed = Math.max(0, elapsedDays);
  const safeStability = Math.max(0.5, stabilityDays);
  const r = Math.exp(-safeElapsed / safeStability);
  return Math.max(1, Math.min(100, Math.round(r * 100)));
}

export function classifyRetentionRisk(retentionPercent: number): RetentionRiskLevel {
  if (retentionPercent < 65) return 'at_risk';
  if (retentionPercent < 82) return 'watch';
  return 'safe';
}

function findNextExamForSubject(exams: ExamItem[], subjectId: string, todayStr: string): ExamItem | undefined {
  const upcoming = exams
    .filter((e) => Boolean(e.date) && e.date >= todayStr)
    .sort((a, b) => a.date.localeCompare(b.date));
  if (subjectId) {
    const exact = upcoming.find((e) => e.subjectId === subjectId);
    if (exact) return exact;
  }
  return upcoming[0];
}

export function analyzeSrsRetention(
  decks: FlashcardDeck[],
  flashcards: FlashcardItem[],
  exams: ExamItem[],
  subjects: Subject[],
  todayStr: string,
): {
  cards: CardRetentionPrediction[];
  decks: DeckRetentionSummary[];
  overallRetentionToday: number;
  overallRetentionAtExam: number;
  atRiskTotal: number;
} {
  const deckMap = new Map(decks.map((d) => [d.id, d]));
  const subjectMap = new Map(subjects.map((s) => [s.id, s]));

  const cardPredictions: CardRetentionPrediction[] = flashcards.map((card) => {
    const deck = deckMap.get(card.deckId);
    const subjectId = deck?.subjectId ?? '';
    const subject = subjectMap.get(subjectId);
    const nextExam = findNextExamForSubject(exams, subjectId, todayStr);
    const daysUntilExam = nextExam ? Math.max(0, diffDays(todayStr, nextExam.date)) : undefined;
    const stabilityDays = computeCardStabilityDays(card);
    const elapsedToday = estimateDaysSinceReview(card, todayStr);
    const retentionToday = recallPercentAtElapsed(stabilityDays, elapsedToday);
    const horizonDays = daysUntilExam !== undefined ? Math.min(30, daysUntilExam) : 7;
    const retentionAtExam = recallPercentAtElapsed(stabilityDays, elapsedToday + horizonDays);
    return {
      card,
      deckTitle: deck?.title ?? 'General Review',
      subjectId,
      subjectCode: subject?.code ?? 'GEN',
      stabilityDays,
      retentionToday,
      retentionAtExam,
      nextExamTitle: nextExam?.title,
      nextExamDate: nextExam?.date,
      daysUntilExam,
      risk: classifyRetentionRisk(Math.min(retentionToday, retentionAtExam)),
    };
  });

  const deckSummaries: DeckRetentionSummary[] = decks.map((deck) => {
    const members = cardPredictions.filter((p) => p.card.deckId === deck.id);
    const subject = subjectMap.get(deck.subjectId);
    const nextExam = findNextExamForSubject(exams, deck.subjectId, todayStr);
    const daysUntilExam = nextExam ? Math.max(0, diffDays(todayStr, nextExam.date)) : undefined;
    const avgToday = members.length
      ? Math.round(members.reduce((sum, p) => sum + p.retentionToday, 0) / members.length)
      : 100;
    const avgExam = members.length
      ? Math.round(members.reduce((sum, p) => sum + p.retentionAtExam, 0) / members.length)
      : 100;
    const atRiskCount = members.filter((p) => p.risk === 'at_risk').length;
    const dueTodayCount = members.filter((p) => p.card.dueToday).length;
    const recommendedMinutes = Math.min(30, Math.max(15, Math.ceil((atRiskCount + dueTodayCount) * 2.5 / 5) * 5));

    return {
      deckId: deck.id,
      deckTitle: deck.title,
      subjectId: deck.subjectId,
      subjectCode: subject?.code ?? 'GEN',
      totalCards: members.length,
      dueTodayCount,
      atRiskCount,
      avgRetentionToday: avgToday,
      avgRetentionAtExam: avgExam,
      nextExamTitle: nextExam?.title,
      nextExamDate: nextExam?.date,
      daysUntilExam,
      risk: members.length ? classifyRetentionRisk(Math.min(avgToday, avgExam)) : 'safe',
      recommendedMinutes,
    };
  });

  deckSummaries.sort((a, b) => a.avgRetentionAtExam - b.avgRetentionAtExam || b.atRiskCount - a.atRiskCount);
  cardPredictions.sort((a, b) => a.retentionAtExam - b.retentionAtExam || a.retentionToday - b.retentionToday);

  const overallRetentionToday = cardPredictions.length
    ? Math.round(cardPredictions.reduce((sum, c) => sum + c.retentionToday, 0) / cardPredictions.length)
    : 100;
  const overallRetentionAtExam = cardPredictions.length
    ? Math.round(cardPredictions.reduce((sum, c) => sum + c.retentionAtExam, 0) / cardPredictions.length)
    : 100;
  const atRiskTotal = cardPredictions.filter((c) => c.risk === 'at_risk').length;

  return {
    cards: cardPredictions,
    decks: deckSummaries,
    overallRetentionToday,
    overallRetentionAtExam,
    atRiskTotal,
  };
}

export function buildForgettingCurveSeries(
  flashcards: FlashcardItem[],
  exams: ExamItem[],
  todayStr: string,
  daysAhead = 14,
): ForgettingCurvePoint[] {
  const baseStats = flashcards.map((card) => ({
    stability: computeCardStabilityDays(card),
    elapsedToday: estimateDaysSinceReview(card, todayStr),
  }));

  const points: ForgettingCurvePoint[] = [];
  for (let offset = 0; offset <= daysAhead; offset++) {
    const date = addDaysIso(todayStr, offset);
    const label = offset === 0 ? 'Today' : offset === 1 ? '+1d' : `+${offset}d`;
    let totalR = 0;
    let atRisk = 0;
    for (const st of baseStats) {
      const r = recallPercentAtElapsed(st.stability, st.elapsedToday + offset);
      totalR += r;
      if (r < 65) atRisk++;
    }
    const examTitles = exams.filter((e) => e.date === date).map((e) => e.title);
    points.push({
      date,
      dayLabel: label,
      avgRetention: baseStats.length ? Math.round(totalR / baseStats.length) : 100,
      atRiskCount: atRisk,
      examTitles,
    });
  }
  return points;
}

export function planMicroReviewSessions(
  deckSummaries: DeckRetentionSummary[],
  sessions: StudySession[],
  todayStr: string,
  currentHour = 9,
  maxBlocks = 4,
): ProposedMicroReview[] {
  const candidates = deckSummaries
    .filter((d) => d.totalCards > 0 && (d.atRiskCount > 0 || d.dueTodayCount > 0 || d.avgRetentionAtExam < 82))
    .slice(0, maxBlocks);

  if (candidates.length === 0) return [];

  const proposals: ProposedMicroReview[] = [];
  const simulatedSessions = [...sessions];

  for (let i = 0; i < candidates.length; i++) {
    const deck = candidates[i];
    const durationHours = Math.round((deck.recommendedMinutes / 60) * 4) / 4 || 0.25; // 15-30 min in 15m increments
    let chosenDate = '';
    let chosenStart = 0;

    for (let dayOffset = 0; dayOffset < 5; dayOffset++) {
      const day = addDaysIso(todayStr, dayOffset);
      if (deck.nextExamDate && day > deck.nextExamDate) break;
      const minHour = dayOffset === 0 ? Math.max(8, Math.ceil(currentHour * 2) / 2) : 9;
      const openSlots = findOpenSlotsForDay(simulatedSessions, day, minHour, 21);
      const fit = openSlots.find((slot) => slot.endHour - slot.startHour >= Math.max(0.5, durationHours));
      if (fit) {
        chosenDate = day;
        chosenStart = fit.startHour;
        break;
      }
    }

    if (!chosenDate) {
      chosenDate = addDaysIso(todayStr, Math.min(i, 2));
      chosenStart = Math.min(20, Math.max(9, Math.ceil(currentHour) + i));
    }

    const title = `Micro-Review: ${deck.deckTitle}`;
    const reason = deck.nextExamTitle
      ? `${deck.avgRetentionAtExam}% projected recall before ${deck.nextExamTitle} (${deck.atRiskCount} at-risk)`
      : `${deck.dueTodayCount} due · ${deck.atRiskCount} at-risk cards`;

    proposals.push({
      id: `micro-${deck.deckId}-${chosenDate}-${chosenStart}`,
      deckId: deck.deckId,
      deckTitle: deck.deckTitle,
      subjectId: deck.subjectId,
      title,
      date: chosenDate,
      startHour: chosenStart,
      durationHours,
      atRiskCards: deck.atRiskCount,
      predictedRetention: deck.avgRetentionAtExam,
      reason,
    });

    simulatedSessions.push({
      id: `sim-${i}`,
      title,
      subjectId: deck.subjectId,
      date: chosenDate,
      dayIndex: (new Date(`${chosenDate}T00:00:00Z`).getUTCDay() + 6) % 7,
      startHour: chosenStart,
      durationHours,
      status: 'upcoming',
      blockType: 'study',
    });
  }

  return proposals;
}

/**
 * Parses Anki-compatible TSV (tab-separated) or CSV text into front/back/hint flashcards.
 */
export function parseAnkiTsvCsv(raw: string): Array<{ front: string; back: string; hint?: string }> {
  const lines = raw
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('#'));

  const cards: Array<{ front: string; back: string; hint?: string }> = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let parts: string[];
    if (line.includes('\t')) {
      parts = line.split('\t').map((p) => p.trim());
    } else {
      // RFC-4180 style simple CSV split
      parts = [];
      let current = '';
      let inQuotes = false;
      for (let c = 0; c < line.length; c++) {
        const ch = line[c];
        if (ch === '"') {
          if (inQuotes && line[c + 1] === '"') {
            current += '"';
            c++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (ch === ',' && !inQuotes) {
          parts.push(current.trim());
          current = '';
        } else {
          current += ch;
        }
      }
      parts.push(current.trim());
    }
    const front = (parts[0] ?? '').replace(/^"|"$/g, '').trim();
    const back = (parts[1] ?? '').replace(/^"|"$/g, '').trim();
    const hint = (parts[2] ?? '').replace(/^"|"$/g, '').trim();
    // Skip obvious header row
    if (i === 0 && /^front$/i.test(front) && /^back$/i.test(back)) continue;
    if (front && back) {
      cards.push({ front, back, ...(hint ? { hint } : {}) });
    }
  }
  return cards;
}

export function exportDeckToAnkiTsv(cards: FlashcardItem[]): string {
  const clean = (s: string) => s.replace(/[\t\r\n]+/g, ' ').trim();
  const header = '#separator:tab\n#html:false';
  const rows = cards.map((card) =>
    [clean(card.front), clean(card.back), card.hint ? clean(card.hint) : ''].filter((_, idx) => idx < 2 || card.hint).join('\t'),
  );
  return `${header}\n${rows.join('\n')}\n`;
}
