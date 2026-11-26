import type { WorkspaceSnapshot } from '../context/AppContext';
import { removeTaskLinks } from '../utils/goalProgress';

export const WIPE_OPTIONS = {
  study: { label: 'Study Data', detail: 'Focus history, notes, goals, exams, flashcards, practice results, and rewards.' },
  subjects: { label: 'Subjects', detail: 'All subjects and their syllabus. Linked tasks, calendar events, and other items become unassigned.' },
  tasks: { label: 'Tasks', detail: 'All tasks, including completed tasks and subtasks.' },
  calendar: { label: 'Calendar', detail: 'All scheduled events, recurring series, exceptions, and overrides.' },
} as const;

export type WipeSection = keyof typeof WIPE_OPTIONS;

function wipeSection(workspace: Omit<WorkspaceSnapshot, 'previousWorkspace'>, section: WipeSection): WorkspaceSnapshot {
  const archive = workspace.legacyArchive ? { ...workspace.legacyArchive } : undefined;
  const next = { ...workspace, legacyArchive: archive };
  if (section === 'tasks') {
    next.tasks = [];
    next.goals = removeTaskLinks(next.goals, next.goals.flatMap(goal => goal.milestones.flatMap(milestone => milestone.taskId ? [milestone.taskId] : [])));
    if (archive) archive.tasks = [];
  } else if (section === 'calendar') {
    next.sessions = [];
    next.removedOccurrences = [];
    if (archive) for (const table of ['schedule_events', 'recurring_events', 'recurrence_exceptions', 'recurrence_overrides']) archive[table] = [];
  } else if (section === 'subjects') {
    const unassign = <T extends { subjectId?: string }>(items: T[]) => items.map(item => ({ ...item, subjectId: '' }));
    next.subjects = [];
    next.tasks = unassign(next.tasks);
    next.sessions = unassign(next.sessions);
    next.notes = unassign(next.notes);
    next.folders = unassign(next.folders);
    next.goals = unassign(next.goals);
    next.decks = unassign(next.decks);
    next.exams = unassign(next.exams);
    next.quizzes = unassign(next.quizzes);
    next.focusHistory = unassign(next.focusHistory);
    if (next.focusClock) next.focusClock = { ...next.focusClock, timer: { ...next.focusClock.timer, subjectId: '' } };
    if (archive) {
      archive.subjects = [];
      for (const [table, rows] of Object.entries(archive)) {
        archive[table] = rows.map(row => 'subject_id' in row ? { ...row, subject_id: null, studyflowSubjectId: undefined } : row);
      }
    }
  } else {
    next.focusHistory = [];
    next.focusClock = undefined;
    next.goals = [];
    next.notes = [];
    next.folders = [{ id: 'notes', name: 'Notes' }];
    next.flashcards = [];
    next.decks = [{ id: 'review', title: 'General Review', subjectId: '', description: '', lastReviewed: '', retentionRate: 0 }];
    next.cardReviews = {};
    next.exams = [];
    next.quizzes = [];
    next.challenges = [];
    next.xpPoints = 0;
    next.rewardLedger = {};
    next.notifications = [];
    next.subjects = next.subjects.map(subject => ({
      ...subject, totalHours: 0, lastStudied: '', currentGrade: '', nextExamDate: '', nextExamTitle: '',
      chapters: subject.chapters.map(chapter => ({
        ...chapter, topics: chapter.topics.map(topic => ({ ...topic, completed: false, confidence: 1, revisionStatus: 'not_started' })),
      })),
    }));
    if (archive) {
      for (const table of ['study_sessions', 'focus_intervals', 'forest_rewards', 'forest_plots', 'notes', 'learning_goals', 'videos', 'video_notes', 'video_watch_history']) archive[table] = [];
      archive.tasks = archive.tasks.map(task => ({ ...task, goal_id: null }));
    }
  }
  return next;
}

export function wipeWorkspace(workspace: WorkspaceSnapshot, section: WipeSection): WorkspaceSnapshot {
  const { previousWorkspace, ...current } = workspace;
  return {
    ...wipeSection(current, section),
    previousWorkspace: previousWorkspace ? wipeSection(previousWorkspace, section) : undefined,
  };
}
