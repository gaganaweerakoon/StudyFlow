import type { GoalMilestone, TaskItem } from '../types/studyflow';

export type MilestoneOrder = 'due-asc' | 'due-desc' | 'title' | 'incomplete' | 'completed' | 'manual';
function dateKey(date: string, deadline: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
  const match = date.match(/^([A-Za-z]{3})\s+(\d{1,2})$/);
  const year = deadline.match(/^\d{4}/)?.[0];
  if (!match || !year) return '';
  const month = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'].indexOf(match[1].toLowerCase()) + 1;
  const day = Number(match[2]);
  if (month === 0 || day < 1 || day > 31) return '';
  return `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
}
export function sortMilestones(items: GoalMilestone[], tasks: ReadonlyMap<string, TaskItem>, order: MilestoneOrder, deadline = ''): GoalMilestone[] {
  if (order === 'manual') return [...items];
  const resolve = (m: GoalMilestone) => {
    const task = m.taskId ? tasks.get(m.taskId) : undefined;
    return { title: task?.title ?? m.label, done: task ? task.status === 'done' : m.done, date: dateKey(task?.dueDate ?? m.date, deadline) };
  };
  return [...items].sort((a,b) => {
    const x = resolve(a), y = resolve(b);
    if (order === 'title') return x.title.localeCompare(y.title);
    if (order === 'incomplete' || order === 'completed') return (order === 'completed' ? -1 : 1) * (Number(x.done) - Number(y.done));
    if (!x.date || !y.date) return Number(!x.date) - Number(!y.date);
    return (order === 'due-desc' ? -1 : 1) * x.date.localeCompare(y.date);
  });
}
