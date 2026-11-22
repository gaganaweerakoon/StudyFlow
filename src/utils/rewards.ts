import type { AchievementBadge, FocusHistoryItem, GoalItem, TaskItem } from '../types/studyflow';

type RewardKind = 'task' | 'focus' | 'review' | 'goal';
export type RewardLedger = Record<string, { kind: RewardKind; at: string }>;

const points: Record<RewardKind, number> = { task: 20, focus: 30, review: 5, goal: 50 };
const badgeDefinitions = [
  { kind: 'task', id: 'task-10', title: 'Task Finisher', description: 'Complete ten tasks.', category: 'Planning', target: 10 },
  { kind: 'focus', id: 'focus-5', title: 'Focused Fellow', description: 'Finish five focus sessions.', category: 'Focus', target: 5 },
  { kind: 'review', id: 'review-20', title: 'Active Recall', description: 'Log twenty flashcard reviews.', category: 'Mastery', target: 20 },
  { kind: 'goal', id: 'goal-1', title: 'Goal Getter', description: 'Complete your first goal.', category: 'Consistency', target: 1 },
] as const;

export function collectRewards(ledger: RewardLedger, tasks: TaskItem[], history: FocusHistoryItem[], goals: GoalItem[], reviews: Record<string, number>, at: string) {
  let next = ledger;
  const grant = (kind: RewardKind, id: string) => {
    const key = `${kind}:${id}`;
    if (Object.hasOwn(next, key)) return;
    if (next === ledger) next = { ...ledger };
    next[key] = { kind, at };
  };
  tasks.filter(task => task.status === 'done').forEach(task => grant('task', task.id));
  history.forEach(item => grant('focus', item.id));
  goals.filter(goal => goal.target > 0 && goal.current >= goal.target).forEach(goal => grant('goal', goal.id));
  for (const [date, count] of Object.entries(reviews)) {
    for (let i = 0; i < count; i++) grant('review', `${date}:${i}`);
  }
  return next;
}

export function rewardSummary(ledger: RewardLedger) {
  const rewards = Object.values(ledger);
  const xp = rewards.reduce((total, entry) => total + points[entry.kind], 0);
  const badges: AchievementBadge[] = badgeDefinitions.map(definition => {
    const { kind, ...badge } = definition;
    const items = rewards.filter(entry => entry.kind === kind).sort((a, b) => a.at.localeCompare(b.at));
    const unlock = items[badge.target - 1];
    return { ...badge, progress: items.length, unlocked: !!unlock, unlockedDate: unlock?.at.slice(0, 10), xpReward: 0 };
  });
  return { xp, badges };
}
