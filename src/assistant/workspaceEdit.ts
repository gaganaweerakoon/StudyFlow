import { resourceTitle } from '../utils/syllabusResources';
import { parseSyllabusLinks, syllabusLinkLabels } from '../utils/syllabusHierarchy';
import { readGeneratedCards, readGeneratedQuestions } from '../notes/generatedStudyItems';
import type { useApp } from '../context/AppContext';
import type { ExamItem, GoalItem, GoalMilestone, NavRoute, StudySession, TaskItem } from '../types/studyflow';
import { applyMilestoneAdd, applyMilestoneRemove, computeInitialGoalProgress } from '../utils/goalProgress';
import { sanitizeSvgDiagram } from './svgDiagram';
import { analyzeSrsRetention, planMicroReviewSessions } from '../utils/srsIntelligence';

export type Workspace = ReturnType<typeof useApp>;

export interface WorkspaceReviewItem {
  id: string;
  label: string;
  meta?: string;
}

export interface WorkspaceEdit {
  action: string;
  title: string;
  success?: string;
  confirmation?: boolean;
  destructive?: boolean;
  reviewKind?: 'destructive' | 'approval';
  reviewItems?: WorkspaceReviewItem[];
  details?: string[];
  route?: NavRoute;
  routeLabel?: string;
  itemId?: () => string | undefined;
  apply: (app: Workspace) => boolean;
  applySelected?: (app: Workspace, selectedIds: string[]) => boolean;
}

export interface BatchEditResult {
  appliedCount: number;
  failedCount: number;
  messages: string[];
  links: Array<{ route: NavRoute; label: string }>;
}

const VALID_ROUTES = new Set<NavRoute>([
  'dashboard',
  'planner',
  'subjects',
  'tasks',
  'focus',
  'notes',
  'flashcards',
  'practice',
  'exams',
  'goals',
  'analytics',
  'settings',
  'assistant',
]);

function validDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d\d-\d\d$/.test(value)) return false;
  const date = new Date(value + 'T00:00:00Z');
  return Number.isFinite(+date) && date.toISOString().slice(0, 10) === value;
}

function parseHour(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value) && value >= 0 && value < 24) {
    return value;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    const hm = trimmed.match(/^(\d{1,2}):(\d{2})(?:\s*(am|pm))?$/i);
    if (hm) {
      let h = Number(hm[1]);
      const m = Number(hm[2]);
      const mer = hm[3]?.toLowerCase();
      if (mer === 'pm' && h < 12) h += 12;
      if (mer === 'am' && h === 12) h = 0;
      if (h >= 0 && h < 24 && m >= 0 && m < 60) return h + m / 60;
    }
    const asNum = Number(trimmed);
    if (Number.isFinite(asNum) && asNum >= 0 && asNum < 24) return asNum;
  }
  return undefined;
}

function formatHour(hour: number): string {
  const totalMinutes = Math.round(hour * 60);
  const h = Math.floor(totalMinutes / 60) % 24;
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function resolveSubjectId(raw: unknown, app: Workspace): string {
  if (typeof raw !== 'string' || !raw.trim()) return '';
  const needle = raw.trim().toLowerCase();
  const byId = app.subjects.find((s) => s.id === raw.trim());
  if (byId) return byId.id;
  const direct = app.subjects.filter(s => s.code.toLowerCase() === needle || s.name.toLowerCase() === needle);
  if (direct.length) return direct.length === 1 ? direct[0].id : '';
  const partial = app.subjects.filter(s => s.name.toLowerCase().includes(needle));
  return partial.length === 1 ? partial[0].id : '';
}

function resolveNote(raw: unknown, app: Workspace) {
  if (typeof raw === 'string' && raw.trim()) {
    const needle = raw.trim().toLowerCase();
    const byId = app.notes.find((n) => n.id === raw.trim());
    if (byId) return byId;
    const byTitle = app.notes.find(
      (n) => n.title.toLowerCase() === needle || n.title.toLowerCase().includes(needle),
    );
    if (byTitle) return byTitle;
  }
  return app.notes.find((n) => n.id === app.selectedNoteId) ?? app.notes[0];
}

function resourceNote(raw: unknown, app: Workspace) {
  if (typeof raw !== 'string' || !raw.trim()) return undefined;
  const needle=raw.trim().toLowerCase();
  const exact=app.notes.find(n=>n.id===raw.trim());
  if(exact)return exact;
  const matches=app.notes.filter(n=>n.title.toLowerCase().includes(needle));
  return matches.length===1?matches[0]:undefined;
}

function resolveDeck(deckIdRaw: unknown, deckTitleRaw: unknown, app: Workspace) {
  if (typeof deckIdRaw === 'string' && deckIdRaw.trim()) {
    const byId = app.decks.find((d) => d.id === deckIdRaw.trim());
    if (byId) return byId;
    const byName = app.decks.find((d) => d.title.toLowerCase() === deckIdRaw.trim().toLowerCase());
    if (byName) return byName;
  }
  if (typeof deckTitleRaw === 'string' && deckTitleRaw.trim()) {
    const needle = deckTitleRaw.trim().toLowerCase();
    const byName = app.decks.find((d) => d.title.toLowerCase() === needle);
    if (byName) return byName;
  }
  return undefined;
}

function findSingleByIdOrTitle<T>(
  rows: T[],
  id: string | undefined,
  title: string | undefined,
  getId: (row: T) => string,
  getTitle: (row: T) => string,
): T | undefined {
  if (id) {
    const exactId = rows.find((row) => getId(row) === id);
    if (exactId) return exactId;
  }
  const needle = (title ?? id ?? '').trim().toLowerCase();
  if (!needle) return undefined;
  const exactMatches = rows.filter((row) => getTitle(row).trim().toLowerCase() === needle);
  if (exactMatches.length === 1) return exactMatches[0];
  const partialMatches = rows.filter((row) => getTitle(row).toLowerCase().includes(needle));
  if (partialMatches.length === 1) return partialMatches[0];
  return undefined;
}

function resolveSession(
  id: string | undefined,
  title: string | undefined,
  date: string | undefined,
  startHour: number | undefined,
  app: Workspace,
): StudySession | undefined {
  if (id) {
    const exactId = app.sessions.find((item) => item.id === id);
    if (exactId) return exactId;
  }
  let candidates = app.sessions;
  if (date) candidates = candidates.filter((item) => item.date === date);
  if (startHour !== undefined) {
    const timeMatches = candidates.filter((item) => Math.abs(item.startHour - startHour) <= 0.25);
    if (timeMatches.length > 0) candidates = timeMatches;
  }
  const needle = (title ?? id ?? '').trim().toLowerCase();
  if (needle) {
    const exactTitle = candidates.filter((item) => item.title.trim().toLowerCase() === needle);
    if (exactTitle.length === 1) return exactTitle[0];
    if (exactTitle.length > 1 && date) return exactTitle[0];
    const partialTitle = candidates.filter((item) => item.title.toLowerCase().includes(needle));
    if (partialTitle.length === 1) return partialTitle[0];
  } else if (candidates.length === 1 && (date || startHour !== undefined)) {
    return candidates[0];
  }
  return undefined;
}

function resolveLinkedTasks(values: unknown, app: Workspace, subjectId?: string): TaskItem[] | undefined {
  if (!Array.isArray(values) || values.length === 0) return undefined;
  const matches: TaskItem[] = [];
  for (const raw of values) {
    if (typeof raw !== 'string' || !raw.trim()) return undefined;
    const needle = raw.trim();
    const scoped = app.tasks.filter(t => !subjectId || t.subjectId === subjectId);
    const exact = scoped.filter(t => t.id === needle);
    const found = exact.length ? exact : scoped.filter(t => t.title.trim().toLowerCase() === needle.toLowerCase());
    if (found.length !== 1) return undefined;
    if (!matches.some(t => t.id === found[0].id)) matches.push(found[0]);
  }
  return matches;
}
function taskMilestone(task: TaskItem, id = `ms-${crypto.randomUUID()}`): GoalMilestone {
  return { id, taskId: task.id, label: task.title, date: task.dueDate, done: task.status === 'done' };
}
function addTaskLinks(goal: GoalItem, tasks: TaskItem[]): GoalItem {
  let next = goal;
  for (const task of tasks) {
    if (next.milestones.some(m => m.taskId === task.id)) continue;
    next = applyMilestoneAdd(next, taskMilestone(task));
  }
  return next;
}

export function parseWorkspaceEdit(raw: string, app: Workspace, resolvedNoteDestination = false): WorkspaceEdit | undefined {
  try {
    const edit = JSON.parse(raw) as Record<string, unknown>;
    if (!edit || typeof edit !== 'object' || Array.isArray(edit) || typeof edit.action !== 'string') return;
    const action = edit.action;
    if (typeof edit.subjectId === 'string' && edit.subjectId.trim() && !resolveSubjectId(edit.subjectId, app)) return;
    const title =
      typeof edit.title === 'string' && edit.title.trim() && edit.title.length <= 200
        ? edit.title.trim()
        : undefined;
    const id = typeof edit.id === 'string' ? edit.id.trim() : undefined;

    // 1. Navigate to view
    if (action === 'navigate_to_view') {
      const targetRoute = typeof edit.route === 'string' ? (edit.route.trim() as NavRoute) : undefined;
      if (!targetRoute || !VALID_ROUTES.has(targetRoute)) return;
      const note = typeof edit.noteId === 'string' ? resolveNote(edit.noteId, app) : undefined;
      const label = targetRoute.charAt(0).toUpperCase() + targetRoute.slice(1);
      return {
        action,
        title: `Open ${label}`,
        success: `Opened ${label}.`,
        route: targetRoute,
        routeLabel: `Open ${label}`,
        apply: (current) => {
          if (targetRoute === 'notes' && note) current.setSelectedNoteId(note.id);
          current.setRoute(targetRoute);
          return true;
        },
      };
    }

    // 1c. Insert SVG Diagram into a StudyFlow Note
    if (action === 'insert_note_diagram') {
      const cleanSvg = typeof edit.svg === 'string' ? sanitizeSvgDiagram(edit.svg) : null;
      if (!cleanSvg) return;
      const targetNote = resolveNote(edit.noteId ?? edit.title, app);
      const heading = title ?? 'Diagram';
      const snippet = `\n\n### ${heading}\n\n\`\`\`svg\n${cleanSvg}\n\`\`\`\n`;
      return {
        action,
        title: targetNote
          ? `Insert SVG diagram “${heading}” into note “${targetNote.title}”`
          : `Create note “${heading}” with SVG diagram`,
        success: targetNote
          ? `Inserted SVG diagram “${heading}” into “${targetNote.title}”.`
          : `Created note “${heading}” with your SVG diagram.`,
        route: 'notes',
        routeLabel: 'Open Notes',
        apply: (current) => {
          if (targetNote && current.notes.some((n) => n.id === targetNote.id)) {
            const live = current.notes.find((n) => n.id === targetNote.id)!;
            current.updateNote(live.id, {
              content: `${live.content.trimEnd()}${snippet}`,
              updatedAt: 'Just now',
            });
            current.setSelectedNoteId(live.id);
          } else {
            const subjectId = current.subjects[0]?.id ?? '';
            current.createNote(subjectId, 'fld-all', {
              title: heading,
              content: `### ${heading}\n\n\`\`\`svg\n${cleanSvg}\n\`\`\`\n`,
              tags: ['Diagram'],
            });
          }
          return true;
        },
      };
    }

    // 1d. Bulk Create Calendar Events (always requires review & approval)
    if (action === 'create_events') {
      if (!Array.isArray(edit.events) || !edit.events.length) return;
      const parsedItems: Array<{
        id: string;
        label: string;
        meta: string;
        event: Omit<StudySession, 'id'>;
      }> = [];
      for (const rawItem of edit.events.slice(0, 30)) {
        if (!rawItem || typeof rawItem !== 'object') continue;
        const item = rawItem as Record<string, unknown>;
        const evTitle = typeof item.title === 'string' ? item.title.trim().slice(0, 160) : '';
        const evDate = validDate(item.date) ? item.date : undefined;
        const evStart = parseHour(item.startHour ?? item.startTime) ?? 15;
        const evDur =
          typeof item.durationHours === 'number' && Number.isFinite(item.durationHours) && item.durationHours > 0 && item.durationHours <= 12
            ? item.durationHours
            : 1;
        if (!evTitle || !evDate) continue;
        const blockType =
          item.blockType === 'sleep' || item.blockType === 'free' ? item.blockType : 'study';
        const subjectId = blockType === 'study' ? resolveSubjectId(item.subjectId, app) : '';
        const location = typeof item.location === 'string' ? item.location.trim().slice(0, 120) : undefined;
        const notes = typeof item.notes === 'string' ? item.notes.trim().slice(0, 400) : undefined;
        const itemId = `ev-${parsedItems.length}`;
        parsedItems.push({
          id: itemId,
          label: evTitle,
          meta: `${evDate} · ${formatHour(evStart)} (${evDur}h)`,
          event: {
            title: evTitle,
            date: evDate,
            startHour: evStart,
            durationHours: evDur,
            dayIndex: (new Date(evDate + 'T00:00:00Z').getUTCDay() + 6) % 7,
            subjectId,
            status: 'upcoming',
            blockType,
            countsTowardStudy: blockType === 'study',
            ...(location ? { location } : {}),
            ...(notes ? { notes } : {}),
          },
        });
      }
      if (!parsedItems.length) return;
      const applySubset = (current: Workspace, selectedSet?: Set<string>) => {
        const chosen = selectedSet
          ? parsedItems.filter((item) => selectedSet.has(item.id))
          : parsedItems;
        if (!chosen.length) return false;
        for (const item of chosen) {
          current.addSession(item.event, []);
        }
        return true;
      };
      return {
        action,
        confirmation: true,
        reviewKind: 'approval',
        title: `Schedule ${parsedItems.length} calendar ${parsedItems.length === 1 ? 'session' : 'sessions'}`,
        reviewItems: parsedItems.map(({ id: itemId, label, meta }) => ({ id: itemId, label, meta })),
        success: `Scheduled ${parsedItems.length} calendar ${parsedItems.length === 1 ? 'session' : 'sessions'}.`,
        route: 'planner',
        routeLabel: 'Open Planner',
        apply: (current) => applySubset(current),
        applySelected: (current, selectedIds) => applySubset(current, new Set(selectedIds)),
      };
    }

    // 1e. Bulk Create Tasks (always requires review & approval)
    if (action === 'create_tasks') {
      if (!Array.isArray(edit.tasks) || !edit.tasks.length) return;
      const parsedItems: Array<{
        id: string;
        label: string;
        meta: string;
        task: Omit<TaskItem, 'id'>;
      }> = [];
      for (const rawItem of edit.tasks.slice(0, 40)) {
        if (!rawItem || typeof rawItem !== 'object') continue;
        const item = rawItem as Record<string, unknown>;
        const taskTitle = typeof item.title === 'string' ? item.title.trim().slice(0, 180) : '';
        if (!taskTitle) continue;
        const dueDate = validDate(item.date) ? item.date : '';
        const subjectId = resolveSubjectId(item.subjectId, app);
        const priority: TaskItem['priority'] =
          item.priority === 'low' || item.priority === 'high' ? item.priority : 'medium';
        const estimatedMinutes =
          typeof item.estimatedMinutes === 'number' && Number.isFinite(item.estimatedMinutes) && item.estimatedMinutes > 0
            ? Math.round(item.estimatedMinutes)
            : 30;
        const description = typeof item.description === 'string' ? item.description.trim().slice(0, 500) : '';
        const itemId = `task-${parsedItems.length}`;
        parsedItems.push({
          id: itemId,
          label: taskTitle,
          meta: `${dueDate ? `Due ${dueDate}` : 'No due date'} · ${priority} · ${estimatedMinutes}m`,
          task: {
            title: taskTitle,
            dueDate,
            dueLabel: dueDate || 'No due date',
            subjectId,
            priority,
            status: 'todo',
            estimatedMinutes,
            description,
            subtasks: [],
          },
        });
      }
      if (!parsedItems.length) return;
      const applySubset = (current: Workspace, selectedSet?: Set<string>) => {
        const chosen = selectedSet
          ? parsedItems.filter((item) => selectedSet.has(item.id))
          : parsedItems;
        if (!chosen.length) return false;
        for (const item of chosen) {
          current.addTask(item.task);
        }
        return true;
      };
      return {
        action,
        confirmation: true,
        reviewKind: 'approval',
        title: `Add ${parsedItems.length} study ${parsedItems.length === 1 ? 'task' : 'tasks'}`,
        reviewItems: parsedItems.map(({ id: itemId, label, meta }) => ({ id: itemId, label, meta })),
        success: `Added ${parsedItems.length} study ${parsedItems.length === 1 ? 'task' : 'tasks'} in Tasks.`,
        route: 'tasks',
        routeLabel: 'Open Tasks',
        apply: (current) => applySubset(current),
        applySelected: (current, selectedIds) => applySubset(current, new Set(selectedIds)),
      };
    }

    // 1f. Schedule Spaced-Repetition Micro-Reviews (always requires review & approval)
    if (action === 'schedule_micro_reviews') {
      const deckFilter = resolveDeck(edit.deckId, edit.deckId, app);
      const maxBlocks =
        typeof edit.maxBlocks === 'number' && Number.isFinite(edit.maxBlocks)
          ? Math.max(1, Math.min(8, Math.round(edit.maxBlocks)))
          : 4;
      const decksToAnalyze = deckFilter ? [deckFilter] : app.decks;
      const now = new Date();
      const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const currentHour = now.getHours() + now.getMinutes() / 60;
      const summary = analyzeSrsRetention(decksToAnalyze, app.flashcards, app.exams, app.subjects, todayStr);
      const proposals = planMicroReviewSessions(summary.decks, app.sessions, todayStr, currentHour, maxBlocks);
      if (!proposals.length) return;
      const applySubset = (current: Workspace, selectedSet?: Set<string>) => {
        const chosen = selectedSet
          ? proposals.filter((p) => selectedSet.has(p.id))
          : proposals;
        if (!chosen.length) return false;
        for (const item of chosen) {
          current.addSession(
            {
              title: item.title,
              date: item.date,
              startHour: item.startHour,
              durationHours: item.durationHours,
              dayIndex: (new Date(item.date + 'T00:00:00Z').getUTCDay() + 6) % 7,
              subjectId: item.subjectId,
              status: 'upcoming',
              blockType: 'study',
              countsTowardStudy: true,
              notes: item.reason,
            },
            [],
          );
        }
        return true;
      };
      return {
        action,
        confirmation: true,
        reviewKind: 'approval',
        title: `Schedule ${proposals.length} SRS micro-review ${proposals.length === 1 ? 'block' : 'blocks'}`,
        reviewItems: proposals.map((p) => ({
          id: p.id,
          label: p.title,
          meta: `${p.date} · ${formatHour(p.startHour)} (${Math.round(p.durationHours * 60)}m) · ${p.reason}`,
        })),
        success: `Scheduled ${proposals.length} spaced-repetition micro-review ${proposals.length === 1 ? 'block' : 'blocks'}.`,
        route: 'planner',
        routeLabel: 'Open Planner',
        apply: (current) => applySubset(current),
        applySelected: (current, selectedIds) => applySubset(current, new Set(selectedIds)),
      };
    }

    // 1g. Import Structured Syllabus Bundle (always requires review & approval)
    if (action === 'import_syllabus_bundle') {
      const subjectId = resolveSubjectId(edit.subjectId, app);
      const rawExams = Array.isArray(edit.exams) ? edit.exams.slice(0, 20) : [];
      const rawTasks = Array.isArray(edit.tasks) ? edit.tasks.slice(0, 40) : [];
      const rawChapters = Array.isArray(edit.chapters) ? edit.chapters.slice(0, 25) : [];
      const rawGoals = Array.isArray(edit.goals) ? edit.goals.slice(0, 15) : [];

      type BundleEntry =
        | { id: string; kind: 'exam'; label: string; meta: string; data: Omit<ExamItem, 'id' | 'mockHistory'> }
        | { id: string; kind: 'task'; label: string; meta: string; data: Omit<TaskItem, 'id'> }
        | { id: string; kind: 'chapter'; label: string; meta: string; name: string; topics: string[]; unitTitle?: string }
        | { id: string; kind: 'goal'; label: string; meta: string; data: Omit<GoalItem, 'id'> };

      const entries: BundleEntry[] = [];
      for (const item of rawExams) {
        if (!item || typeof item !== 'object') continue;
        const r = item as Record<string, unknown>;
        const eTitle = typeof r.title === 'string' ? r.title.trim().slice(0, 140) : '';
        const eDate = validDate(r.date) ? r.date : '';
        if (!eTitle || !eDate) continue;
        const weight = typeof r.weightPercent === 'number' && Number.isFinite(r.weightPercent) ? Math.max(0, Math.min(100, r.weightPercent)) : 0;
        entries.push({
          id: `syl-exam-${entries.length}`,
          kind: 'exam',
          label: `Exam: ${eTitle}`,
          meta: `${eDate}${weight ? ` · ${weight}% weight` : ''}`,
          data: {
            title: eTitle,
            date: eDate,
            time: typeof r.time === 'string' ? r.time.trim() : '',
            room: typeof r.room === 'string' ? r.room.trim() : '',
            subjectId,
            weightPercent: weight,
            targetGrade: 'A',
            prepProgress: 0,
            syllabusTopics: [],
          },
        });
      }
      for (const item of rawTasks) {
        if (!item || typeof item !== 'object') continue;
        const r = item as Record<string, unknown>;
        const tTitle = typeof r.title === 'string' ? r.title.trim().slice(0, 160) : '';
        if (!tTitle) continue;
        const dueDate = validDate(r.date) ? r.date : validDate(r.dueDate) ? r.dueDate : '';
        const priority: TaskItem['priority'] =
          r.priority === 'low' || r.priority === 'high' ? r.priority : 'medium';
        const estimatedMinutes =
          typeof r.estimatedMinutes === 'number' && Number.isFinite(r.estimatedMinutes) && r.estimatedMinutes > 0
            ? Math.round(r.estimatedMinutes)
            : 45;
        entries.push({
          id: `syl-task-${entries.length}`,
          kind: 'task',
          label: `Task: ${tTitle}`,
          meta: `${dueDate ? `Due ${dueDate}` : 'No date'} · ${priority}`,
          data: {
            title: tTitle,
            dueDate,
            dueLabel: dueDate || 'No due date',
            subjectId,
            priority,
            status: 'todo',
            estimatedMinutes,
            description: typeof r.description === 'string' ? r.description.trim().slice(0, 400) : '',
            subtasks: [],
          },
        });
      }
      for (const item of rawChapters) {
        if (!item || typeof item !== 'object') continue;
        const r = item as Record<string, unknown>;
        const chName =
          typeof r.name === 'string' && r.name.trim()
            ? r.name.trim().slice(0, 140)
            : typeof r.title === 'string' && r.title.trim()
              ? r.title.trim().slice(0, 140)
              : '';
        if (!chName) continue;
        const topics = Array.isArray(r.topics)
          ? r.topics.filter((t): t is string => typeof t === 'string' && Boolean(t.trim())).map((t) => t.trim().slice(0, 140))
          : [];
        const unitTitle = typeof r.unitTitle === 'string' ? r.unitTitle.trim().slice(0, 140) : undefined;
        entries.push({
          id: `syl-chap-${entries.length}`,
          kind: 'chapter',
          label: `Chapter: ${unitTitle ? `${unitTitle} / ` : ''}${chName}`,
          meta: `${topics.length} ${topics.length === 1 ? 'topic' : 'topics'}`,
          name: chName,
          unitTitle,
          topics,
        });
      }
      for (const item of rawGoals) {
        if (!item || typeof item !== 'object') continue;
        const r = item as Record<string, unknown>;
        const gTitle = typeof r.title === 'string' ? r.title.trim().slice(0, 140) : '';
        if (!gTitle) continue;
        const deadline = typeof r.deadline === 'string' ? r.deadline.trim().slice(0, 40) : '';
        const msLabels = Array.isArray(r.milestones)
          ? r.milestones.filter((m): m is string => typeof m === 'string' && Boolean(m.trim())).slice(0, 20)
          : [];
        const milestones = msLabels.map((m) => ({
          id: `ms-${crypto.randomUUID()}`,
          label: m.trim().slice(0, 160),
          date: deadline,
          done: false,
        }));
        entries.push({
          id: `syl-goal-${entries.length}`,
          kind: 'goal',
          label: `Goal: ${gTitle}`,
          meta: `${milestones.length} milestones${deadline ? ` · due ${deadline}` : ''}`,
          data: {
            title: gTitle,
            category: 'syllabus',
            current: 0,
            target: Math.max(1, milestones.length || 100),
            unit: milestones.length ? 'milestones' : '%',
            deadline,
            subjectId: subjectId || undefined,
            milestones,
          },
        });
      }
      if (!entries.length) return;
      const courseLabel =
        typeof edit.courseTitle === 'string' && edit.courseTitle.trim()
          ? edit.courseTitle.trim().slice(0, 100)
          : 'Course Syllabus';
      const applySubset = (current: Workspace, selectedSet?: Set<string>) => {
        const chosen = selectedSet ? entries.filter((e) => selectedSet.has(e.id)) : entries;
        if (!chosen.length) return false;
        const targetSubId = subjectId || current.subjects[0]?.id || '';
        for (const entry of chosen) {
          if (entry.kind === 'exam') {
            current.addExam({ ...entry.data, subjectId: entry.data.subjectId || targetSubId });
          } else if (entry.kind === 'task') {
            current.addTask({ ...entry.data, subjectId: entry.data.subjectId || targetSubId });
          } else if (entry.kind === 'goal') {
            current.addGoal({ ...entry.data, subjectId: entry.data.subjectId || targetSubId || undefined });
          } else if (entry.kind === 'chapter' && targetSubId) {
            current.appendChapters(targetSubId, [{
              id: `ch-${crypto.randomUUID()}`, title: entry.name, unitTitle: entry.unitTitle,
              topics: entry.topics.map(title => ({ id: `tp-${crypto.randomUUID()}`, title, completed: false, confidence: 3, difficulty: 'medium', revisionStatus: 'not_started' })),
            }]);
          }
        }
        return true;
      };
      return {
        action,
        confirmation: true,
        reviewKind: 'approval',
        title: `Import syllabus bundle for “${courseLabel}” (${entries.length} items)`,
        reviewItems: entries.map(({ id: itemId, label, meta }) => ({ id: itemId, label, meta })),
        success: `Imported syllabus items for “${courseLabel}”.`,
        route: 'subjects',
        routeLabel: 'Open Subjects',
        apply: (current) => applySubset(current),
        applySelected: (current, selectedIds) => applySubset(current, new Set(selectedIds)),
      };
    }

    // 2. Start Focus Session
    if (action === 'start_focus_session') {
      if (app.focusTimer.running || app.focusTimer.elapsedSeconds > 0) return;
      const taskTitle =
        typeof edit.taskTitle === 'string' && edit.taskTitle.trim()
          ? edit.taskTitle.trim().slice(0, 160)
          : title ?? 'Focused Study Session';
      const subjectId = resolveSubjectId(edit.subjectId, app);
      const rawMode = typeof edit.mode === 'string' ? edit.mode : 'Pomodoro';
      const mode: 'Pomodoro' | 'Countdown' | 'Stopwatch' | 'Custom' =
        rawMode === 'Countdown' || rawMode === 'Stopwatch' || rawMode === 'Custom' ? rawMode : 'Pomodoro';
      const minutes =
        typeof edit.minutes === 'number' && Number.isFinite(edit.minutes) && edit.minutes >= 1 && edit.minutes <= 180
          ? Math.round(edit.minutes)
          : undefined;
      const autoStart = edit.autoStart !== false;
      return {
        action,
        title: `Start ${mode}${minutes ? ` (${minutes}m)` : ''} focus session for “${taskTitle}”`,
        success: `Configured ${mode}${minutes ? ` (${minutes} min)` : ''} focus timer for “${taskTitle}”${autoStart ? ' and started the timer' : ''}.`,
        route: 'focus',
        routeLabel: 'Open Focus Timer',
        apply: (current) => {
          if (current.focusTimer.running || current.focusTimer.elapsedSeconds > 0) return false;
          current.setFocusMode(minutes && mode !== 'Custom' ? 'Custom' : mode, minutes);
          current.setFocusContext(subjectId, taskTitle);
          if (autoStart) current.applyPhoneFocusAction({ action: 'start' });
          return true;
        },
      };
    }

    // 3. Create Deck
    if (action === 'create_deck' && title) {
      const subjectId = resolveSubjectId(edit.subjectId, app);
      if(edit.subjectId && !subjectId)return;
      const subject=app.subjects.find(s=>s.id===subjectId);
      const parsed=parseSyllabusLinks(subject,edit.syllabusLinks);
      if(!parsed.valid)return;
      const description =
        typeof edit.description === 'string' ? edit.description.trim().slice(0, 240) : 'Created with Pip';
      return {
        action,
        title: `Create flashcard deck “${resourceTitle({id:'draft',subjectId,title,syllabusLinks:parsed.links},subject,[{id:'draft',subjectId,title,syllabusLinks:parsed.links},...app.decks])}”`,
        ...(parsed.links?{confirmation:true,details:[`Syllabus: ${syllabusLinkLabels(subject,parsed.links).join(" · ") || "Unclassified"}`]}:{}),
        success: `Created deck “${title}” in Flashcards.`,
        route: 'flashcards',
        routeLabel: 'Open Flashcards',
        apply: (current) => {
          if (!parseSyllabusLinks(current.subjects.find(s=>s.id===subjectId), edit.syllabusLinks).valid) return false;
          current.addDeck({ title, subjectId, description, syllabusLinks:parsed.links });
          return true;
        },
      };
    }

    // 4. Create Flashcards (from note or topic; always requires review & approval!)
    if (action === 'create_flashcards') {
      const cards = readGeneratedCards(edit.cards);
      if (!cards.length) return;
      const note = resourceNote(edit.noteId, app);
      if(edit.noteId&&!note)return;
      const existingDeck = edit.deckId ? resolveDeck(edit.deckId, undefined, app) : undefined;
      if(edit.deckId&&!existingDeck)return;
      const requestedNewTitle =
        typeof edit.deckTitle === 'string' && edit.deckTitle.trim()
          ? edit.deckTitle.trim().slice(0, 120)
          : note
            ? `${note.title} Deck`
            : 'Pip Study Deck';
      const fallbackDeck = existingDeck;
      const targetDeckName = fallbackDeck ? fallbackDeck.title : requestedNewTitle;
      const explicitSubject=resolveSubjectId(edit.subjectId,app);
      if(edit.subjectId&&!explicitSubject)return;
      if(note?.subjectId&&explicitSubject&&explicitSubject!==note.subjectId)return;
      const subjectId = explicitSubject || note?.subjectId || '';
      const subject=app.subjects.find(s=>s.id===subjectId);
      const parsed=parseSyllabusLinks(subject,edit.syllabusLinks??note?.syllabusLinks);
      if(!parsed.valid)return;
      const linksLabel=syllabusLinkLabels(subject,parsed.links).join(' · ') || 'Unclassified';
      if(fallbackDeck&&subjectId&&fallbackDeck.subjectId!==subjectId)return;
      const indexedCards = cards.map((card, idx) => ({ id: `card-${idx}`, card }));

      const applySubset = (current: Workspace, selectedSet?: Set<string>) => {
        if(!parseSyllabusLinks(current.subjects.find(s=>s.id===subjectId),parsed.links).valid)return false;
        const chosen = selectedSet
          ? indexedCards.filter((item) => selectedSet.has(item.id)).map((item) => item.card)
          : cards;
        if (!chosen.length) return false;
        let deckId = fallbackDeck && current.decks.some((d) => d.id === fallbackDeck.id) ? fallbackDeck.id : '';
        if (fallbackDeck && !deckId) return false;
        if (!deckId) {
          deckId = current.addDeck({title: targetDeckName,subjectId,syllabusLinks:parsed.links,description:note ? `Generated from note: ${note.title}` : 'Generated with Pip'});
        }
        const saved = new Set(
          current.flashcards
            .filter((card) => card.deckId === deckId)
            .map((card) => JSON.stringify([card.front, card.back])),
        );
        for (const card of chosen) {
          const key = JSON.stringify([card.front, card.back]);
          if (saved.has(key)) continue;
          current.addFlashcard({ ...card, deckId, hint: note?.title });
          saved.add(key);
        }
        return true;
      };

      return {
        action,
        confirmation: true,
        reviewKind: 'approval',
        title: `Add ${cards.length} flashcards to “${fallbackDeck ? resourceTitle(fallbackDeck,app.subjects.find(s=>s.id===fallbackDeck.subjectId),app.decks) : resourceTitle({id:'draft',title:targetDeckName,subjectId,syllabusLinks:parsed.links},subject,[{id:'draft',title:targetDeckName,subjectId,syllabusLinks:parsed.links},...app.decks])}”`,
        details:[`Syllabus: ${fallbackDeck ? syllabusLinkLabels(app.subjects.find(s=>s.id===fallbackDeck.subjectId),fallbackDeck.syllabusLinks).join(" · ") || "Unclassified (existing deck unchanged)" : linksLabel}`],
        reviewItems: indexedCards.map(({ id: itemId, card }) => ({
          id: itemId,
          label: card.front,
          meta: card.back.slice(0, 110),
        })),
        success: `Saved flashcards to “${targetDeckName}” in Flashcards.`,
        route: 'flashcards',
        routeLabel: 'Open Flashcards',
        apply: (current) => applySubset(current),
        applySelected: (current, selectedIds) => applySubset(current, new Set(selectedIds)),
      };
    }

    // 5. Create Practice Test (always requires review & approval!)
    if (action === 'create_practice_test') {
      const note = resourceNote(edit.noteId, app);
      if(edit.noteId&&!note)return;
      const defaultTopic = title ?? note?.title ?? 'Study Review';
      const questions = readGeneratedQuestions(edit.questions, defaultTopic);
      if (!questions.length) return;
      const name = title ?? (note ? `${note.title} Practice Test` : 'Pip Practice Test');
      const explicitSubject=resolveSubjectId(edit.subjectId,app);
      if(edit.subjectId&&!explicitSubject)return;
      if(note?.subjectId&&explicitSubject&&explicitSubject!==note.subjectId)return;
      const subjectId = explicitSubject || note?.subjectId || '';
      const subject=app.subjects.find(s=>s.id===subjectId);
      const parsed=parseSyllabusLinks(subject,edit.syllabusLinks??note?.syllabusLinks);
      if(!parsed.valid)return;
      const linksLabel=syllabusLinkLabels(subject,parsed.links).join(' · ') || 'Unclassified';
      const rawDiff = typeof edit.difficulty === 'string' ? edit.difficulty : 'Standard';
      const difficulty: 'Standard' | 'Challenge' | 'Exam Level' =
        rawDiff === 'Challenge' || rawDiff === 'Exam Level'
          ? rawDiff
          : rawDiff === 'Exam-Level'
            ? 'Exam Level'
            : 'Standard';
      const sourceSection =
        typeof edit.sourceSection === 'string' ? edit.sourceSection.trim().slice(0, 120) : undefined;
      const indexedQuestions = questions.map((q, idx) => ({ id: `q-${idx}`, q }));

      const applySubset = (current: Workspace, selectedSet?: Set<string>) => {
        if(!parseSyllabusLinks(current.subjects.find(s=>s.id===subjectId),parsed.links).valid)return false;
        const chosen = selectedSet
          ? indexedQuestions.filter((item) => selectedSet.has(item.id)).map((item) => item.q)
          : questions;
        if (!chosen.length) return false;
        current.addQuiz({
          id: crypto.randomUUID(),
          title: name,
          subjectId,
          difficulty,
          durationMinutes: Math.max(5, chosen.length * 2),
          questions: chosen,
          sourceNoteId: note?.id,
          syllabusLinks: parsed.links,
          sourceSection,
        });
        return true;
      };

      return {
        action,
        confirmation: true,
        reviewKind: 'approval',
        title: `Create practice test “${resourceTitle({id:'draft',title:name,subjectId,syllabusLinks:parsed.links},subject,[{id:'draft',title:name,subjectId,syllabusLinks:parsed.links},...app.quizzes])}” (${questions.length} questions)`,
        details:[`Syllabus: ${linksLabel}`],
        reviewItems: indexedQuestions.map(({ id: itemId, q }) => ({
          id: itemId,
          label: q.prompt,
          meta: `${q.type.toUpperCase()} · ${q.topic}`,
        })),
        success: `Saved “${name}” in Practice Tests.`,
        route: 'practice',
        routeLabel: 'Open Practice Tests',
        apply: (current) => applySubset(current),
        applySelected: (current, selectedIds) => applySubset(current, new Set(selectedIds)),
      };
    }

    // 6. Create / Update Note
    if (action === 'create_note' || action === 'update_note') {
      const updating = action === 'update_note';
      const existing = updating ? (id ? app.notes.find((item) => item.id === id) : resolveNote(edit.title, app)) : undefined;
      const name = title || existing?.title;
      const content = typeof edit.content === 'string' ? edit.content.trim() : '';
      if (!name || !content || content.length > 60000 || (updating && !existing)) return;
      const subjectId = resolveSubjectId(edit.subjectId, app) || existing?.subjectId || '';
      if (typeof edit.subjectId === 'string' && edit.subjectId.trim() && !resolveSubjectId(edit.subjectId, app)) return;
      const noteSubject = app.subjects.find(subject => subject.id === subjectId);
      const parsedLinks = parseSyllabusLinks(noteSubject, edit.syllabusLinks);
      if (!parsedLinks.valid) return;
      const tags = Array.isArray(edit.tags)
        ? edit.tags.filter((t): t is string => typeof t === 'string' && Boolean(t.trim())).slice(0, 8)
        : undefined;

      // Replacing existing text is a sensitive operation, regardless of length.
      const replacesContent = Boolean(updating && existing && existing.content.trim() && content !== existing.content.trim());

      let noteId = existing?.id;
      return {
        itemId: () => noteId,
        action,
        ...(replacesContent ? { confirmation: true, destructive: true } : (updating || !resolvedNoteDestination) && edit.syllabusLinks !== undefined ? {confirmation:true} : {}),
        ...(edit.syllabusLinks !== undefined ? {details: [`Syllabus links: ${syllabusLinkLabels(noteSubject,parsedLinks.links).join(' · ') || 'Unclassified'}`]} : {}),
        title: replacesContent
          ? `Overwrite note “${name}” (replaces existing content)`
          : `${updating ? 'Update' : 'Create'} note “${name}”`,
        success: `${updating ? 'Updated' : 'Created'} “${name}” in Notes.`,
        route: 'notes',
        routeLabel: 'Open note',
        apply: (current) => {
          if (edit.syllabusLinks !== undefined && !parseSyllabusLinks(current.subjects.find(subject=>subject.id===subjectId), edit.syllabusLinks).valid) return false;
          if (updating && existing) {
            const latest = current.notes.find((n) => n.id === existing.id);
            if (!latest || latest.content !== existing.content) return false;
            current.updateNote(existing.id, {
              title: name,
              content,
              subjectId,
              updatedAt: 'Just now',
              ...(edit.syllabusLinks !== undefined ? {syllabusLinks: parsedLinks.links} : subjectId !== existing.subjectId ? {syllabusLinks: undefined} : {}),
              ...(tags ? { tags } : {}),
            });
            current.setSelectedNoteId(existing.id);
          } else {
            const sortedIds = (links: string[] | undefined) => (links ?? []).slice().sort().join('\u0000');
            const matching = current.notes.find(note => note.subjectId === subjectId && note.title === name && note.content === content &&
              sortedIds(note.syllabusLinks?.unitIds) === sortedIds(parsedLinks.links?.unitIds) &&
              sortedIds(note.syllabusLinks?.chapterIds) === sortedIds(parsedLinks.links?.chapterIds));
            noteId = matching?.id ?? current.createNote(subjectId, 'fld-all', { title: name, content,
              ...(parsedLinks.links ? { syllabusLinks: parsedLinks.links } : {}), ...(tags ? { tags } : {}) });
          }
          return true;
        },
      };
    }

    // 7. Delete Note / Delete Exam
    if (action === 'delete_note' || action === 'delete_exam') {
      const isNote = action === 'delete_note';
      const record = isNote
        ? findSingleByIdOrTitle(app.notes, id, title, (item) => item.id, (item) => item.title)
        : findSingleByIdOrTitle(app.exams, id, title, (item) => item.id, (item) => item.title);
      if (!record) return;
      return {
        action,
        title: isNote
          ? `Delete note “${record.title}” and its attachments`
          : `Delete exam “${record.title}”${'date' in record && record.date ? ` (${record.date})` : ''} and its mock exam history`,
        success: `Deleted “${record.title}” from ${isNote ? 'Notes' : 'Exams'}.`,
        confirmation: true,
        destructive: true,
        route: isNote ? 'notes' : 'exams',
        routeLabel: isNote ? 'Open Notes' : 'Open Exams',
        apply: (current) => {
          if (!(isNote ? current.notes : current.exams).some((item) => item.id === record.id)) return false;
          if (isNote) current.deleteNote(record.id);
          else current.deleteExam(record.id);
          return true;
        },
      };
    }

    // 7b. Delete Deck / Delete Practice Test / Delete Subject / Delete Goal / Delete Goal Milestone
    if (action === 'delete_deck') {
      const deck = findSingleByIdOrTitle(app.decks, id, title, (item) => item.id, (item) => item.title);
      if (!deck) return;
      const cardCount = app.flashcards.filter((card) => card.deckId === deck.id).length;
      return {
        action,
        confirmation: true,
        destructive: true,
        title: `Delete flashcard deck “${deck.title}”${cardCount > 0 ? ` (${cardCount} ${cardCount === 1 ? 'card' : 'cards'})` : ''}`,
        success: `Deleted flashcard deck “${deck.title}”.`,
        route: 'flashcards',
        routeLabel: 'Open Flashcards',
        apply: (current) => {
          if (!current.decks.some((item) => item.id === deck.id)) return false;
          current.deleteDeck(deck.id);
          return true;
        },
      };
    }

    if (action === 'delete_practice_test') {
      const quiz = findSingleByIdOrTitle(app.quizzes, id, title, (item) => item.id, (item) => item.title);
      if (!quiz) return;
      return {
        action,
        confirmation: true,
        destructive: true,
        title: `Delete practice test “${quiz.title}” (${quiz.questions.length} ${quiz.questions.length === 1 ? 'question' : 'questions'})`,
        success: `Deleted practice test “${quiz.title}”.`,
        route: 'practice',
        routeLabel: 'Open Practice Tests',
        apply: (current) => {
          if (!current.quizzes.some((item) => item.id === quiz.id)) return false;
          current.deleteQuiz(quiz.id);
          return true;
        },
      };
    }

    if (action === 'delete_subject') {
      const subject =
        (id ? app.subjects.find((item) => item.id === id) : undefined) ??
        findSingleByIdOrTitle(app.subjects, id, title, (item) => item.id, (item) => item.code) ??
        findSingleByIdOrTitle(app.subjects, id, title, (item) => item.id, (item) => item.name);
      if (!subject) return;
      return {
        action,
        confirmation: true,
        destructive: true,
        title: `Delete subject “${subject.code ? `${subject.code} — ` : ''}${subject.name}” and its syllabus chapters (linked study records become unassigned)`,
        success: `Deleted subject “${subject.name}”; linked study records were kept as unassigned.`,
        route: 'subjects',
        routeLabel: 'Open Subjects',
        apply: (current) => {
          if (!current.subjects.some((item) => item.id === subject.id)) return false;
          current.deleteSubject(subject.id);
          return true;
        },
      };
    }

    if (action === 'delete_goal') {
      const goal = findSingleByIdOrTitle(app.goals, id, title, (item) => item.id, (item) => item.title);
      if (!goal) return;
      const msCount = goal.milestones?.length ?? 0;
      return {
        action,
        confirmation: true,
        destructive: true,
        title: `Delete goal “${goal.title}”${msCount > 0 ? ` and ${msCount} ${msCount === 1 ? 'milestone' : 'milestones'}` : ''}`,
        success: `Deleted goal “${goal.title}”.`,
        route: 'goals',
        routeLabel: 'Open Goals',
        apply: (current) => {
          if (!current.goals.some((item) => item.id === goal.id)) return false;
          current.deleteGoal(goal.id);
          return true;
        },
      };
    }

    if (action === 'delete_goal_milestone') {
      const goalNeedle = typeof edit.goalId === 'string' ? edit.goalId.trim() : '';
      if (!goalNeedle) return;
      const goal = findSingleByIdOrTitle(app.goals, goalNeedle, goalNeedle, (item) => item.id, (item) => item.title);
      if (!goal) return;
      const milestone = findSingleByIdOrTitle(
        goal.milestones ?? [],
        id,
        title,
        (item) => item.id,
        (item) => item.label,
      );
      if (!milestone) return;
      return {
        action,
        confirmation: true,
        destructive: true,
        title: `Delete milestone “${milestone.label}” from goal “${goal.title}”`,
        success: `Removed milestone “${milestone.label}” from “${goal.title}”.`,
        route: 'goals',
        routeLabel: 'Open Goals',
        apply: (current) => {
          const live = current.goals.find((item) => item.id === goal.id);
          if (!live || !live.milestones.some((item) => item.id === milestone.id)) return false;
          current.updateGoal(live.id, {
            milestones: live.milestones.filter((item) => item.id !== milestone.id),
          });
          return true;
        },
      };
    }

    // 8. Create / Update Exam
    if (action === 'create_exam' || action === 'update_exam') {
      const updating = action === 'update_exam';
      const exam = updating ? app.exams.find((item) => item.id === id) : undefined;
      if (updating && !exam) return;
      const name = title ?? exam?.title;
      const date = edit.date === undefined ? exam?.date : edit.date;
      const time = edit.time === undefined ? exam?.time ?? '' : edit.time;
      const subjectId =
        edit.subjectId === undefined ? exam?.subjectId ?? '' : resolveSubjectId(edit.subjectId, app);
      const room = edit.room === undefined ? exam?.room ?? '' : edit.room;
      const targetGrade = edit.targetGrade === undefined ? exam?.targetGrade ?? '' : edit.targetGrade;
      const weightPercent = edit.weightPercent === undefined ? exam?.weightPercent ?? 0 : Number(edit.weightPercent);
      const prepProgress =
        typeof edit.prepProgress === 'number' && Number.isFinite(edit.prepProgress)
          ? Math.max(0, Math.min(100, Math.round(edit.prepProgress)))
          : exam?.prepProgress ?? 0;

      if (
        (edit.title !== undefined && !title) ||
        !name ||
        !validDate(date) ||
        typeof time !== 'string' ||
        (edit.time !== undefined && time !== '' && !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time)) ||
        typeof room !== 'string' ||
        room.length > 200 ||
        typeof targetGrade !== 'string' ||
        targetGrade.length > 80 ||
        !Number.isFinite(weightPercent) ||
        weightPercent < 0 ||
        weightPercent > 100
      ) {
        return;
      }

      const fields: Pick<
        ExamItem,
        'title' | 'date' | 'time' | 'subjectId' | 'room' | 'targetGrade' | 'weightPercent' | 'prepProgress'
      > = {
        title: name,
        date,
        time,
        subjectId,
        room: room.trim(),
        targetGrade: targetGrade.trim(),
        weightPercent,
        prepProgress,
      };
      return {
        action,
        title: `${exam ? 'Update' : 'Add'} exam “${name}” on ${date}`,
        success: `${exam ? 'Updated' : 'Added'} “${name}” in Exams for ${date}${time ? ` at ${time}` : ''}.`,
        route: 'exams',
        routeLabel: 'Open Exams',
        apply: (current) => {
          if (exam) {
            if (!current.exams.some((item) => item.id === exam.id)) return false;
            current.updateExam(exam.id, fields);
          } else if (
            !current.exams.some(
              (item) => item.title === name && item.date === date && item.time === time && item.subjectId === subjectId,
            )
          ) {
            current.addExam({ ...fields, syllabusTopics: [] });
          }
          return true;
        },
      };
    }

    // 9. Create Goal / Add Goal Milestone
    if (action === 'create_goal' && title) {
      const target =
        typeof edit.target === 'number' && Number.isFinite(edit.target) && edit.target > 0 ? edit.target : 100;
      const unit = typeof edit.unit === 'string' && edit.unit.trim() ? edit.unit.trim().slice(0, 32) : '%';
      const deadline = typeof edit.deadline === 'string' ? edit.deadline.trim().slice(0, 40) : '';
      const rawCat = typeof edit.category === 'string' ? edit.category.toLowerCase() : 'weekly';
      const category: GoalItem['category'] =
        rawCat === 'daily' ||
        rawCat === 'weekly' ||
        rawCat === 'subject' ||
        rawCat === 'tasks' ||
        rawCat === 'syllabus' ||
        rawCat === 'revision'
          ? rawCat
          : 'weekly';
      const subjectId = resolveSubjectId(edit.subjectId, app) || undefined;
      const steps: unknown[] = Array.isArray(edit.milestoneSteps)
        ? edit.milestoneSteps
        : Array.isArray(edit.milestones) ? edit.milestones : [];
      const linkedTasks = edit.taskIds === undefined ? [] : resolveLinkedTasks(edit.taskIds, app, subjectId);
      if (!linkedTasks || (edit.subjectId && !subjectId)) return;
      const milestones: GoalMilestone[] = steps.slice(0, 30).flatMap((step) => {
        const fields = step && typeof step === 'object' ? step as Record<string, unknown> : {};
        const rawLabel = typeof step === 'string' ? step : fields.title;
        const label = typeof rawLabel === 'string' ? rawLabel.trim().slice(0, 180) : '';
        const date = typeof fields.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(fields.date) ? fields.date : deadline;
        return label ? [{ id: `ms-${crypto.randomUUID()}`, label, date, done: false }] : [];
      });
      milestones.push(...linkedTasks.map(task => taskMilestone(task)));
      const requiresReview = milestones.length >= 2 || linkedTasks.length > 0;
      const applyGoal = (current: Workspace, selectedSet?: Set<string>) => {
        const chosen = selectedSet ? milestones.filter(m => selectedSet.has(m.id)) : milestones;
        const liveTasks = chosen.filter(m => m.taskId).map(m => current.tasks.find(t => t.id === m.taskId));
        if (liveTasks.some(t => !t || (subjectId && t.subjectId !== subjectId))) return false;
        const chosenMilestones = chosen.map(m => {
          const task = m.taskId ? current.tasks.find(t => t.id === m.taskId) : undefined;
          return task ? taskMilestone(task, m.id) : m;
        });
        const matching = current.goals.filter(g => g.title.toLowerCase() === title.toLowerCase() && g.subjectId === subjectId);
        if (matching.length > 1) return false;
        if (matching.length === 1) {
          const goal = matching[0];
          let next = addTaskLinks(goal, liveTasks.filter((t): t is TaskItem => Boolean(t)));
          for (const m of chosenMilestones.filter(m => !m.taskId)) {
            if (!next.milestones.some(existing => existing.label === m.label && existing.date === m.date)) next = applyMilestoneAdd(next, m);
          }
          if (next !== goal) current.updateGoal(goal.id, { milestones: next.milestones, current: next.current });
          return true;
        }
        current.addGoal({ title, category, current: computeInitialGoalProgress(target, unit, category, chosenMilestones), target, unit, deadline, subjectId, milestones: chosenMilestones });
        return true;
      };
      return {
        action,
        ...(requiresReview
          ? {
              confirmation: true,
              reviewKind: 'approval' as const,
              reviewItems: milestones.map((m) => ({
                id: m.id,
                label: m.label,
                meta: `${m.taskId ? 'Linked existing task · ' : ''}${m.date ? `Target ${m.date}` : ''}` || undefined,
              })),
            }
          : {}),
        title: `Add goal “${title}” (${target} ${unit})${milestones.length ? ` · ${milestones.length} milestones` : ''}`,
        success: `Saved goal “${title}” in Goals.`,
        route: 'goals',
        routeLabel: 'Open Goals',
        apply: (current) => applyGoal(current),
        ...(requiresReview
          ? {
              applySelected: (current: Workspace, selectedIds: string[]) => applyGoal(current, new Set(selectedIds)),
            }
          : {}),
      };
    }

    if (action === 'link_task_to_goal' || action === 'bulk_link_tasks_to_goal' || action === 'unlink_task_from_goal') {
      const goalKey = typeof edit.goalId === 'string' ? edit.goalId.trim() : '';
      const matches = app.goals.filter(g => g.id === goalKey || g.title.trim().toLowerCase() === goalKey.toLowerCase());
      if (matches.length !== 1) return;
      const goal = matches[0];
      const unlink = action === 'unlink_task_from_goal';
      const requested = resolveLinkedTasks(action === 'bulk_link_tasks_to_goal' ? edit.taskIds : [edit.taskId], app, unlink ? undefined : goal.subjectId);
      if (!requested) return;
      if (unlink && !goal.milestones.some(m => m.taskId === requested[0].id)) return;
      const apply = (current: Workspace, selected?: Set<string>) => {
        const live = current.goals.find(g => g.id === goal.id);
        if (!live) return false;
        const ids = requested.filter(t => !selected || selected.has(t.id)).map(t => t.id);
        const tasks = ids.map(id => current.tasks.find(t => t.id === id));
        if (!unlink && tasks.some(t => !t || (live.subjectId && t.subjectId !== live.subjectId))) return false;
        let next = live;
        if (unlink) {
          for (const m of live.milestones.filter(m => m.taskId && ids.includes(m.taskId))) next = applyMilestoneRemove(next, m.id);
        } else {
          next = addTaskLinks(live, tasks.filter((t): t is TaskItem => Boolean(t)));
        }
        if (next !== live) current.updateGoal(live.id, { milestones: next.milestones, current: next.current });
        return true;
      };
      return {
        action, title: `${unlink ? 'Unlink' : 'Link'} ${requested.length} existing task(s) ${unlink ? 'from' : 'to'} “${goal.title}”`,
        success: `Updated task links for “${goal.title}”.`,
        confirmation: true, reviewKind: unlink ? 'destructive' : 'approval', destructive: unlink,
        reviewItems: requested.map(t => ({ id: t.id, label: t.title, meta: `${unlink ? 'Unlink only (keep task)' : 'Link existing task'} · ${t.dueDate}` })),
        route: 'goals', routeLabel: 'Open Goals', apply: current => apply(current),
        applySelected: (current, ids) => apply(current, new Set(ids)),
      };
    }

    if (action === 'update_goal' || action === 'update_goal_milestone') {
      const goal = app.goals.find((item) => item.id === (action === 'update_goal' ? edit.id : edit.goalId));
      if (!goal) return;
      const milestone = action === 'update_goal_milestone' ? goal.milestones.find((item) => item.id === edit.id) : undefined;
      if (action === 'update_goal_milestone' && !milestone) return;
      const rawDate = action === 'update_goal' ? edit.deadline : edit.date;
      const date = typeof rawDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(rawDate) ? rawDate : undefined;
      if (!title && !date) return;
      const label = milestone?.label ?? goal.title;
      return {
        action,
        title: `Update “${label}”`,
        success: `Updated “${label}”.`,
        route: 'goals',
        routeLabel: 'Open Goals',
        apply: (current) => {
          const live = current.goals.find((item) => item.id === goal.id);
          if (!live) return false;
          if (!milestone) {
            current.updateGoal(live.id, { title: title || live.title, deadline: date ?? live.deadline });
            return true;
          }
          if (!live.milestones.some((item) => item.id === milestone.id)) return false;
          current.updateGoal(live.id, {
            milestones: live.milestones.map((item) => item.id === milestone.id
              ? { ...item, label: title || item.label, date: date ?? item.date }
              : item),
          });
          return true;
        },
      };
    }

    if (action === 'add_goal_milestone' && title) {
      const goalNeedle = typeof edit.goalId === 'string' ? edit.goalId.trim() : '';
      if (!goalNeedle) return;
      const goal =
        app.goals.find((g) => g.id === goalNeedle) ??
        app.goals.find(
          (g) =>
            g.title.toLowerCase() === goalNeedle.toLowerCase() ||
            g.title.toLowerCase().includes(goalNeedle.toLowerCase()),
        );
      if (!goal) return;
      const date = typeof edit.date === 'string' ? edit.date.trim().slice(0, 40) : goal.deadline || '';
      return {
        action,
        title: `Add milestone “${title}” to “${goal.title}”`,
        success: `Added milestone “${title}” to “${goal.title}”.`,
        route: 'goals',
        routeLabel: 'Open Goals',
        apply: (current) => {
          const live = current.goals.find((g) => g.id === goal.id);
          if (!live) return false;
          if (live.milestones.some((item) => item.label.toLowerCase() === title.toLowerCase())) return true;
          const nextMilestones = [
            ...(live.milestones ?? []),
            { id: `ms-${crypto.randomUUID()}`, label: title, date, done: false },
          ];
          current.updateGoal(live.id, { milestones: nextMilestones });
          return true;
        },
      };
    }

    // 10. Delete / Complete Tasks
    if (action === 'delete_tasks' || action === 'complete_tasks') {
      const deleting = action === 'delete_tasks';
      const resolvedMap = new Map<string, TaskItem>();

      if (deleting && edit.completedOnly === true) {
        for (const task of app.tasks) {
          if (task.status === 'done') resolvedMap.set(task.id, task);
        }
      } else {
        const rawIds: string[] = [];
        if (Array.isArray(edit.ids)) {
          if (edit.ids.length > 100 || edit.ids.some((value) => typeof value !== 'string')) return;
          rawIds.push(...edit.ids.map((s) => s.trim()).filter(Boolean));
        } else if (id) {
          rawIds.push(id);
        }
        const rawTitles: string[] = [];
        if (Array.isArray(edit.titles)) {
          if (edit.titles.length > 100 || edit.titles.some((value) => typeof value !== 'string')) return;
          rawTitles.push(...edit.titles.map((s) => s.trim()).filter(Boolean));
        } else if (title && rawIds.length === 0) {
          rawTitles.push(title);
        }

        if (rawIds.length === 0 && rawTitles.length === 0) return;

        for (const token of rawIds) {
          const match = findSingleByIdOrTitle(app.tasks, token, undefined, (t) => t.id, (t) => t.title);
          if (!match) return;
          resolvedMap.set(match.id, match);
        }
        for (const tTitle of rawTitles) {
          const match = findSingleByIdOrTitle(app.tasks, undefined, tTitle, (t) => t.id, (t) => t.title);
          if (!match) return;
          resolvedMap.set(match.id, match);
        }
      }

      const targets = Array.from(resolvedMap.values());
      if (targets.length === 0 || targets.length > 100) return;
      const targetIds = targets.map((t) => t.id);

      // Single-task completion is non-destructive and safe; deletion or bulk completion asks for confirmation
      const needsConfirm = deleting || targets.length > 1;
      const labelPrefix = deleting
        ? edit.completedOnly === true
          ? `Clear ${targets.length} completed ${targets.length === 1 ? 'task' : 'tasks'}`
          : `Delete ${targets.length} ${targets.length === 1 ? 'task' : 'tasks'}`
        : `Complete ${targets.length} ${targets.length === 1 ? 'task' : 'tasks'}`;

      return {
        action,
        confirmation: needsConfirm,
        ...(deleting ? { destructive: true } : {}),
        title:
          targets.length <= 2
            ? `${labelPrefix} · ${targets.map((task) => task.title).join(', ')}`
            : labelPrefix,
        details: targets.length > 2 ? targets.map((task) => `${task.title}${task.dueDate ? ` (due ${task.dueDate})` : ''}`) : undefined,
        success: `${deleting ? 'Deleted' : 'Completed'} ${targets.length} ${targets.length === 1 ? 'task' : 'tasks'}.`,
        route: 'tasks',
        routeLabel: 'Open Tasks',
        apply: (current) => {
          const existingIds = targetIds.filter((taskId) => current.tasks.some((item) => item.id === taskId));
          if (existingIds.length === 0) return false;
          if (deleting) current.deleteTasks(existingIds);
          else for (const taskId of existingIds) current.updateTask(taskId, { status: 'done' });
          return true;
        },
      };
    }

    // 11. Delete Event (single)
    if (action === 'delete_event') {
      const eventDate = validDate(edit.date) ? edit.date : undefined;
      const eventHour = parseHour(edit.startHour ?? edit.startTime);
      const event = resolveSession(id, title, eventDate, eventHour, app);
      if (!event) return;
      return {
        action,
        confirmation: true,
        destructive: true,
        title: `Delete calendar event “${event.title}” on ${event.date} at ${formatHour(event.startHour)}${event.recurring ? ' · this occurrence only' : ''}`,
        success: `Removed “${event.title}” (${event.date}) from Calendar.`,
        route: 'planner',
        routeLabel: 'Open Planner',
        apply: (current) => {
          if (!current.sessions.some((item) => item.id === event.id)) return false;
          current.deleteSession(event.id);
          return true;
        },
      };
    }

    // 11b. Delete Events (bulk calendar removal)
    if (action === 'delete_events') {
      const hasIds = Array.isArray(edit.ids) && edit.ids.length > 0;
      const dateFilter = validDate(edit.date) ? edit.date : undefined;
      const titleContains =
        typeof edit.titleContains === 'string' && edit.titleContains.trim()
          ? edit.titleContains.trim().toLowerCase()
          : undefined;
      const blockTypeFilter =
        edit.blockType === 'study' || edit.blockType === 'sleep' || edit.blockType === 'free'
          ? edit.blockType
          : undefined;

      if (!hasIds && !dateFilter && !titleContains && !blockTypeFilter) return;

      const resolved = new Map<string, StudySession>();
      if (hasIds) {
        const rawIds = edit.ids as unknown[];
        if (rawIds.length > 50 || rawIds.some((v) => typeof v !== 'string')) return;
        for (const token of rawIds as string[]) {
          const ev = resolveSession(token.trim(), undefined, dateFilter, undefined, app);
          if (ev) resolved.set(ev.id, ev);
        }
      } else {
        for (const session of app.sessions) {
          if (dateFilter && session.date !== dateFilter) continue;
          if (titleContains && !session.title.toLowerCase().includes(titleContains)) continue;
          if (blockTypeFilter && (session.blockType ?? 'study') !== blockTypeFilter) continue;
          resolved.set(session.id, session);
        }
      }

      const targets = Array.from(resolved.values())
        .sort((a, b) => a.date.localeCompare(b.date) || a.startHour - b.startHour)
        .slice(0, 50);
      if (targets.length === 0) return;

      const scopeDesc = dateFilter
        ? ` on ${dateFilter}`
        : titleContains
          ? ` matching “${edit.titleContains}”`
          : '';

      return {
        action,
        confirmation: true,
        destructive: true,
        title: `Delete ${targets.length} calendar ${targets.length === 1 ? 'event' : 'events'}${scopeDesc}`,
        details: targets.map(
          (ev) =>
            `${ev.title} · ${ev.date} at ${formatHour(ev.startHour)} (${ev.durationHours}h)${ev.recurring ? ' — occurrence' : ''}`,
        ),
        success: `Removed ${targets.length} calendar ${targets.length === 1 ? 'event' : 'events'}${scopeDesc}.`,
        route: 'planner',
        routeLabel: 'Open Planner',
        apply: (current) => {
          const liveTargets = targets.filter((ev) => current.sessions.some((item) => item.id === ev.id));
          if (liveTargets.length === 0) return false;
          for (const ev of liveTargets) current.deleteSession(ev.id);
          return true;
        },
      };
    }

    // 12. Create Task
    if (action === 'create_task' && title && (edit.date === undefined || edit.date === '' || validDate(edit.date))) {
      const date = typeof edit.date === 'string' && validDate(edit.date) ? edit.date : '';
      const subjectId = resolveSubjectId(edit.subjectId, app);
      const rawPriority = typeof edit.priority === 'string' ? edit.priority : 'medium';
      const priority: TaskItem['priority'] =
        rawPriority === 'low' || rawPriority === 'high' ? rawPriority : 'medium';
      const estimatedMinutes =
        typeof edit.estimatedMinutes === 'number' && Number.isFinite(edit.estimatedMinutes) && edit.estimatedMinutes >= 0
          ? Math.round(edit.estimatedMinutes)
          : 30;
      const description = typeof edit.description === 'string' ? edit.description.trim().slice(0, 600) : '';

      return {
        action,
        title: `Add task “${title}”${date ? ` due ${date}` : ''}`,
        success: `Added task “${title}”${date ? ` (due ${date})` : ''} in Tasks.`,
        route: 'tasks',
        routeLabel: 'Open Tasks',
        apply: (current) => {
          if (
            current.tasks.some(
              (task) => task.title === title && (task.dueDate ?? '') === date && task.status !== 'done',
            )
          ) {
            return true;
          }
          current.addTask({
            title,
            dueDate: date,
            dueLabel: date || 'No due date',
            subjectId,
            priority,
            status: 'todo',
            estimatedMinutes,
            description,
            subtasks: [],
          });
          return true;
        },
      };
    }

    // 13. Update Task
    if (action === 'update_task' && id) {
      const task = app.tasks.find((item) => item.id === id);
      if (!task || (edit.date !== undefined && edit.date !== '' && !validDate(edit.date))) return;
      const patch: Partial<TaskItem> = {};
      const changes: string[] = [];
      let isRollback = false;
      if (title && title !== task.title) {
        patch.title = title;
        changes.push(`rename to “${title}”`);
      }
      if (validDate(edit.date) && edit.date !== task.dueDate) {
        patch.dueDate = patch.dueLabel = edit.date;
        changes.push(`due ${edit.date}`);
      }
      if (
        (edit.priority === 'low' || edit.priority === 'medium' || edit.priority === 'high') &&
        edit.priority !== task.priority
      ) {
        patch.priority = edit.priority;
        changes.push(`priority ${edit.priority}`);
      }
      if (
        (edit.status === 'todo' || edit.status === 'in_progress' || edit.status === 'done') &&
        edit.status !== task.status
      ) {
        patch.status = edit.status;
        if (task.status === 'done' && edit.status !== 'done') {
          isRollback = true;
          changes.push(`reopen (${edit.status.replace('_', ' ')})`);
        } else {
          changes.push(edit.status === 'done' ? 'mark complete' : `status ${edit.status}`);
        }
      }
      if (!changes.length) return;
      return {
        action,
        ...(isRollback ? { confirmation: true, destructive: true } : {}),
        title: `Update “${task.title}” · ${changes.join(', ')}`,
        success: `Updated task “${task.title}” (${changes.join(', ')}).`,
        route: 'tasks',
        routeLabel: 'Open Tasks',
        apply: (current) => {
          if (!current.tasks.some((item) => item.id === id)) return false;
          current.updateTask(id, patch);
          return true;
        },
      };
    }

    // 14. Update Recurring Event Series
    if (action === 'update_event' && edit.scope === 'series') {
      const match = id?.match(/^legacy-series-(\d+)-\d{4}-\d{2}-\d{2}$/);
      if (!match || !app.updateRecurringSeries || edit.date !== undefined) return;
      const seriesId = Number(match[1]);
      const series = app.recurringSeries.find((row) => row.id === seriesId);
      if (!series || typeof series.title !== 'string') return;
      const priorStart = parseHour(series.start_time) ?? 9;
      const priorEnd = parseHour(series.end_time) ?? 10;
      const start = parseHour(edit.startHour ?? edit.startTime) ?? priorStart;
      const duration =
        typeof edit.durationHours === 'number' && Number.isFinite(edit.durationHours)
          ? edit.durationHours
          : (priorEnd - priorStart + 24) % 24 || 1;
      if (start < 0 || start >= 24 || duration <= 0 || duration > 24) return;
      const weekdays = edit.weekdays;
      if (
        weekdays !== undefined &&
        (!Array.isArray(weekdays) ||
          !weekdays.length ||
          weekdays.length > 7 ||
          weekdays.some((day) => !Number.isInteger(day) || day < 0 || day > 6) ||
          new Set(weekdays).size !== weekdays.length)
      ) {
        return;
      }
      const name = title ?? series.title;
      const days = weekdays?.map((day) => ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][day]).join(', ');
      return {
        action,
        confirmation: true,
        title: `Update entire series “${series.title}” to “${name}” · ${formatHour(start)} for ${duration}h${days ? ` · ${days}` : ''}`,
        success: `Updated recurring series “${name}”.`,
        route: 'planner',
        routeLabel: 'Open Planner',
        apply: (current) => {
          if (!current.updateRecurringSeries || !current.recurringSeries.some((row) => row.id === seriesId)) {
            return false;
          }
          current.updateRecurringSeries(seriesId, name, start, duration, undefined, undefined, weekdays);
          return true;
        },
      };
    }

    // 15. Create / Update Calendar Event
    if (action !== 'create_event' && action !== 'update_event') return;
    const existing = action === 'update_event' ? app.sessions.find((item) => item.id === id) : undefined;
    if (action === 'update_event' && (!existing || (existing.recurring && edit.scope !== 'occurrence'))) return;

    const date = edit.date ?? existing?.date;
    const startHour = parseHour(edit.startHour ?? edit.startTime) ?? existing?.startHour;
    const durationHours =
      typeof edit.durationHours === 'number' && Number.isFinite(edit.durationHours)
        ? edit.durationHours
        : existing?.durationHours ?? 1;
    const name = title ?? existing?.title;
    if (
      !name ||
      !validDate(date) ||
      startHour === undefined ||
      startHour < 0 ||
      startHour >= 24 ||
      durationHours <= 0 ||
      durationHours > 24
    ) {
      return;
    }

    const blockType = edit.blockType ?? existing?.blockType ?? 'study';
    if (blockType !== 'study' && blockType !== 'sleep' && blockType !== 'free') return;

    const weekdays = Array.isArray(edit.weekdays) ? edit.weekdays : [];
    if (
      weekdays.length > 7 ||
      (existing && weekdays.length > 0) ||
      weekdays.some((day) => !Number.isInteger(day) || day < 0 || day > 6) ||
      new Set(weekdays).size !== weekdays.length
    ) {
      return;
    }

    const subjectId =
      blockType === 'sleep' || blockType === 'free'
        ? ''
        : edit.subjectId !== undefined
          ? resolveSubjectId(edit.subjectId, app)
          : existing?.subjectId ?? '';
    if (blockType === 'study' && typeof edit.subjectId === 'string' && edit.subjectId.trim() && !subjectId) return;
    const location = typeof edit.location === 'string' ? edit.location.trim().slice(0, 120) : existing?.location;
    const notes = typeof edit.notes === 'string' ? edit.notes.trim().slice(0, 400) : existing?.notes;

    const patch = {
      title: name,
      date,
      startHour,
      durationHours,
      dayIndex: (new Date(date + 'T00:00:00Z').getUTCDay() + 6) % 7,
      subjectId,
      ...(location !== undefined ? { location } : {}),
      ...(notes !== undefined ? { notes } : {}),
    };
    const time = formatHour(startHour);
    let eventId = existing?.id;
    return {
      action,
      itemId: () => eventId,
      success: `${existing ? 'Updated' : 'Scheduled'} “${name}”${weekdays.length === 7 ? ' every day' : weekdays.length ? ' on the selected weekdays' : ''} on ${date} at ${time} for ${durationHours}h.`,
      title: `${existing ? 'Update' : 'Add'} “${name}” · ${date}, ${time} for ${durationHours}h${existing?.recurring ? ' · this occurrence only' : ''}`,
      route: 'planner',
      routeLabel: weekdays.length ? 'Open Planner' : 'Open event',
      apply: (current) => {
        if (existing) {
          if (!current.sessions.some((item) => item.id === existing.id)) return false;
          current.updateSession(existing.id, {
            ...patch,
            blockType,
            countsTowardStudy: blockType === 'study',
          });
        } else {
          const event: Omit<StudySession, 'id'> = {
            ...patch,
            status: 'upcoming',
            blockType,
            countsTowardStudy: blockType === 'study',
          };
          const minute = (hour: number) => Math.round(hour * 60);
          const matching = !weekdays.length && current.sessions.find(
              (item) =>
                !item.recurring &&
                item.title === event.title &&
                item.subjectId === event.subjectId &&
                item.date === event.date &&
                minute(item.startHour) === minute(event.startHour) &&
                minute(item.durationHours) === minute(event.durationHours) &&
                (item.blockType ?? 'study') === event.blockType,
            );
          eventId = matching ? matching.id : current.addSession(event, weekdays);
        }
        return true;
      },
    };
  } catch {
    return;
  }
}

export function splitWorkspaceResponse(response: string, complete = false): { text: string; commands: string[] } {
  const fence = /(?:^|\n)[ \t]*```(pip-edit|json)?[ \t]*(?:\n|$)/gi;
  const commands: string[] = [];
  let text = response;
  const removals: Array<[number, number]> = [];

  for (const match of response.matchAll(fence)) {
    const start = match.index + match[0].length;
    const rest = response.slice(start);
    const end = rest.search(/\n[ \t]*```[ \t]*(?:\n|$)/);
    const body = (end < 0 ? rest : rest.slice(0, end)).trim();
    const isCommand = match[1]?.toLowerCase() === 'pip-edit' || /"action"\s*:/.test(body);
    if (isCommand) {
      if (end >= 0) {
        commands.push(body);
        const closeMatch = rest.slice(end).match(/^\n[ \t]*```[ \t]*(?:\n|$)/);
        removals.push([match.index, start + end + (closeMatch?.[0].length ?? 0)]);
      } else {
        removals.push([match.index, response.length]);
      }
    } else if (!complete && end < 0) {
      removals.push([match.index, response.length]);
    }
  }

  if (removals.length) {
    let out = '';
    let cursor = 0;
    for (const [a, b] of removals) {
      out += response.slice(cursor, a);
      cursor = Math.max(cursor, b);
    }
    out += response.slice(cursor);
    text = out.trim();
    return { text, commands };
  }

  const raw = response.trim();
  if (raw.startsWith('{') && /"action"\s*:/.test(raw)) return { text: '', commands: [raw] };
  if (!complete && raw.startsWith('{')) return { text: '', commands: [] };
  return { text: response, commands: [] };
}
