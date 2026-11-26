import type { FocusHistoryItem, GoalItem, NotificationItem, StudySession, TaskItem } from '../types/studyflow';

export interface CheckInSettings {
  enabled?: boolean;
  recovery?: boolean;
  milestone?: boolean;
  evening?: boolean;
  quietFrom?: string;
  quietUntil?: string;
  snoozeUntil?: number;
}
export interface CheckIn {
  key: string;
  text: string;
  task?: { title: string; subjectId: string };
}
export function chooseCheckIn(input: {
  settings: CheckInSettings; date: string; time: string; now: number; running: boolean;
  notifications: Pick<NotificationItem, 'id'>[]; sessions: StudySession[]; focusHistory: FocusHistoryItem[];
  goals: GoalItem[]; newMilestones: Set<string>; tasks: TaskItem[];
}): CheckIn | undefined {
  const { settings, date, time, notifications } = input;
  const from = settings.quietFrom ?? '21:30', until = settings.quietUntil ?? '07:00';
  const quiet = from > until ? time >= from || time < until : time >= from && time < until;
  if (!settings.enabled || input.running || quiet || (settings.snoozeUntil ?? 0) > input.now ||
      notifications.some(n => n.id.startsWith('pip/' + date + '/'))) return;
  const unseen = (key: string) => !notifications.some(n => n.id.startsWith('pip/') && n.id.endsWith('/' + key));
  if (settings.milestone !== false) {
    for (const goal of input.goals) for (const step of goal.milestones) {
      const key = 'milestone/' + goal.id + '/' + step.id;
      if (step.done && input.newMilestones.has(key) && unseen(key)) return {key, text: 'You finished “' + step.label + '” in ' + goal.title + '. That’s a milestone worth marking.'};
    }
  }
  if (settings.recovery !== false) {
    const hour = Number(time.slice(0, 2)) + Number(time.slice(3, 5)) / 60;
    const session = input.sessions.find(s => s.date === date && s.status !== 'completed' &&
      s.countsTowardStudy !== false && (!s.blockType || s.blockType === 'study') &&
      hour >= s.startHour + s.durationHours && hour < s.startHour + s.durationHours + 3 &&
      unseen('session/' + s.id) && !input.focusHistory.some(h => h.calendarSessionId === s.id ||
        (h.calendarSessionId == null && h.subjectId === s.subjectId && h.completedAt.startsWith(date) && h.taskTitle === s.title)));
    if (session) return {key:'session/' + session.id, text:'There’s no focus log for “' + session.title + '”. Did you study offline, or would a short catch-up help?'};
  }
  if (settings.evening !== false && time >= '18:00') {
    const task = input.tasks.filter(t => t.status !== 'done' && t.dueDate && t.dueDate <= date && unseen('task/' + t.id))
      .sort((a,b) => a.dueDate.localeCompare(b.dueDate))[0];
    if (task) return {key:'task/' + task.id, text:'“' + task.title + '” is still open. Want to give it ten minutes this evening?', task:{title:task.title,subjectId:task.subjectId}};
  }
}
