import { useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  Calendar,
  CheckCircle2,
  CheckSquare,
  FileText,
  Loader2,
  Sparkles,
  Target,
  Upload,
  X,
} from 'lucide-react';
import JSZip from '../vendor/jszip.mjs';
import { useApp } from '../context/AppContext';
import { useAssistant } from '../assistant/AssistantContext';
import type { SyllabusExtractionBundle } from '../types/studyflow';
import { openPdf, preparePages, readFileData } from './pdf';
import { readWordBinary } from './wordBinary';

export async function extractSyllabusDocumentText(file: File): Promise<string> {
  if (/\.pdf$/i.test(file.name)) {
    const doc = await openPdf(await readFileData(file));
    try {
      const pages = await preparePages(doc, false);
      return pages
        .map((p, i) => (p.text ? `Page ${i + 1}\n${p.text}` : ''))
        .filter(Boolean)
        .join('\n\n');
    } finally {
      await doc.destroy();
    }
  }
  if (/\.docx$/i.test(file.name)) {
    const zip = await JSZip.loadAsync(await file.arrayBuffer());
    const xml = await zip.file('word/document.xml')?.async('string');
    if (!xml) throw new Error('The Word document has no readable text body.');
    const dom = new DOMParser().parseFromString(xml, 'application/xml');
    return Array.from(dom.getElementsByTagNameNS('*', 'p'), (p) => p.textContent).join('\n');
  }
  if (/\.(?:txt|md|csv)$/i.test(file.name)) {
    return file.text();
  }
  const buffer = await file.arrayBuffer();
  if (new Uint8Array(buffer)[0] === 0xd0) return readWordBinary(buffer);
  const raw = new TextDecoder().decode(buffer);
  if (/^\s*<(?:!doctype|html)/i.test(raw)) {
    return new DOMParser().parseFromString(raw, 'text/html').body.textContent ?? '';
  }
  return raw;
}

type ReviewTab = 'exams' | 'tasks' | 'chapters' | 'goals';

interface EditableExam {
  id: string;
  selected: boolean;
  title: string;
  date: string;
  time: string;
  room: string;
  weightPercent: number;
}

interface EditableTask {
  id: string;
  selected: boolean;
  title: string;
  dueDate: string;
  priority: 'low' | 'medium' | 'high';
  estimatedMinutes: number;
  description: string;
}

interface EditableChapter {
  id: string;
  selected: boolean;
  title: string;
  topics: string[];
}

interface EditableGoal {
  id: string;
  selected: boolean;
  title: string;
  deadline: string;
  milestones: string[];
}

export function SyllabusDeepImportModal({
  open,
  onClose,
  defaultSubjectId,
}: {
  open: boolean;
  onClose: () => void;
  defaultSubjectId?: string;
}) {
  const app = useApp();
  const assistant = useAssistant();

  const [subjectId, setSubjectId] = useState(defaultSubjectId || app.subjects[0]?.id || '');
  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [courseTitle, setCourseTitle] = useState('');
  const [activeTab, setActiveTab] = useState<ReviewTab>('exams');

  const [exams, setExams] = useState<EditableExam[]>([]);
  const [tasks, setTasks] = useState<EditableTask[]>([]);
  const [chapters, setChapters] = useState<EditableChapter[]>([]);
  const [goals, setGoals] = useState<EditableGoal[]>([]);
  const [hasParsed, setHasParsed] = useState(false);

  useEffect(() => {
    if (open) {
      setSubjectId(defaultSubjectId || app.subjects[0]?.id || '');
    }
  }, [open, defaultSubjectId, app.subjects]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !parsing) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, parsing, onClose]);

  const counts = useMemo(
    () => ({
      exams: exams.filter((e) => e.selected).length,
      tasks: tasks.filter((t) => t.selected).length,
      chapters: chapters.filter((c) => c.selected).length,
      goals: goals.filter((g) => g.selected).length,
    }),
    [exams, tasks, chapters, goals],
  );

  const totalSelected = counts.exams + counts.tasks + counts.chapters + counts.goals;

  if (!open) return null;

  async function handleParse() {
    if (!file || parsing) return;
    setParsing(true);
    setError('');
    setStatus(`Extracting text from ${file.name}…`);
    try {
      const text = await extractSyllabusDocumentText(file);
      if (!text.trim()) {
        throw new Error('No readable text was found in this syllabus. If it is a scanned PDF, export it with OCR first.');
      }
      setStatus('Analyzing syllabus dates, weights, readings, and milestones with Pip…');
      const bundle = await assistant.generateStructured<SyllabusExtractionBundle>(
        'syllabus_bundle',
        'Deep-parse this university course syllabus. Extract all exams/midterms/finals with exact YYYY-MM-DD dates and grade weighting percentages, all assignment/problem-set/reading deadlines as tasks with priority and estimated minutes, ordered syllabus units/chapters with subtopics, and high-level term milestones/goals. Use ISO YYYY-MM-DD dates.',
        text,
      );

      setCourseTitle(bundle.courseTitle || file.name.replace(/\.[^.]+$/, ''));
      const nextExams: EditableExam[] = (bundle.exams ?? []).map((e, i) => ({
        id: `ex-${i}`,
        selected: true,
        title: e.title || 'Exam',
        date: e.date || '',
        time: e.time || '',
        room: e.room || '',
        weightPercent: Number.isFinite(e.weightPercent) ? Number(e.weightPercent) : 0,
      }));
      const nextTasks: EditableTask[] = (bundle.tasks ?? []).map((t, i) => ({
        id: `tk-${i}`,
        selected: true,
        title: t.title || 'Assignment',
        dueDate: t.dueDate || '',
        priority: t.priority === 'low' || t.priority === 'high' ? t.priority : 'medium',
        estimatedMinutes: Number.isFinite(t.estimatedMinutes) && Number(t.estimatedMinutes) > 0 ? Number(t.estimatedMinutes) : 45,
        description: t.description || '',
      }));
      const nextChapters: EditableChapter[] = (bundle.chapters ?? []).map((c, i) => ({
        id: `ch-${i}`,
        selected: true,
        title: c.title || `Unit ${i + 1}`,
        topics: Array.isArray(c.topics) ? c.topics.filter(Boolean) : [],
      }));
      const nextGoals: EditableGoal[] = (bundle.goals ?? []).map((g, i) => ({
        id: `gl-${i}`,
        selected: true,
        title: g.title || 'Course Milestone Goal',
        deadline: g.deadline || '',
        milestones: Array.isArray(g.milestones)
          ? g.milestones
              .map((m) => (typeof m === 'string' ? m : m?.label ?? '').trim())
              .filter(Boolean)
          : [],
      }));

      setExams(nextExams);
      setTasks(nextTasks);
      setChapters(nextChapters);
      setGoals(nextGoals);
      setHasParsed(true);
      if (nextExams.length) setActiveTab('exams');
      else if (nextTasks.length) setActiveTab('tasks');
      else if (nextChapters.length) setActiveTab('chapters');
      else setActiveTab('goals');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not parse syllabus.');
    } finally {
      setParsing(false);
      setStatus('');
    }
  }

  function handleApproveImport() {
    if (totalSelected === 0) return;
    const chosenExams = exams.filter((e) => e.selected && e.title.trim());
    const chosenTasks = tasks.filter((t) => t.selected && t.title.trim());
    const chosenChapters = chapters.filter((c) => c.selected && c.title.trim());
    const chosenGoals = goals.filter((g) => g.selected && g.title.trim());

    for (const e of chosenExams) {
      app.addExam({
        title: e.title.trim(),
        date: e.date.trim() || new Date().toISOString().slice(0, 10),
        time: e.time.trim(),
        room: e.room.trim(),
        subjectId,
        weightPercent: Math.max(0, Math.min(100, Number(e.weightPercent) || 0)),
        targetGrade: 'A',
        prepProgress: 0,
        syllabusTopics: [],
      });
    }

    for (const t of chosenTasks) {
      app.addTask({
        title: t.title.trim(),
        dueDate: t.dueDate.trim(),
        dueLabel: t.dueDate.trim() || 'No due date',
        subjectId,
        priority: t.priority,
        status: 'todo',
        estimatedMinutes: Math.max(10, Math.round(t.estimatedMinutes || 45)),
        description: t.description.trim(),
        subtasks: [],
      });
    }

    if (chosenChapters.length && subjectId) {
      app.appendChapters(
        subjectId,
        chosenChapters.map((ch) => ({
          id: crypto.randomUUID(),
          title: ch.title.trim(),
          topics: ch.topics.map((topicTitle) => ({
            id: crypto.randomUUID(),
            title: topicTitle,
            completed: false,
            confidence: 1,
            difficulty: 'medium' as const,
            revisionStatus: 'not_started' as const,
          })),
        })),
      );
    }

    for (const g of chosenGoals) {
      const ms = g.milestones.map((label) => ({
        id: `ms-${crypto.randomUUID()}`,
        label,
        date: g.deadline,
        done: false,
      }));
      app.addGoal({
        title: g.title.trim(),
        category: 'syllabus',
        current: 0,
        target: Math.max(1, ms.length || 100),
        unit: ms.length ? 'milestones' : '%',
        deadline: g.deadline,
        subjectId: subjectId || undefined,
        milestones: ms,
      });
    }

    void app.saveWorkspace();
    app.pushToast(
      `Imported ${chosenExams.length} exams, ${chosenTasks.length} tasks, ${chosenChapters.length} units, and ${chosenGoals.length} goals`,
    );
    onClose();
  }

  function toggleAllCurrentTab(checked: boolean) {
    if (activeTab === 'exams') setExams((rows) => rows.map((r) => ({ ...r, selected: checked })));
    if (activeTab === 'tasks') setTasks((rows) => rows.map((r) => ({ ...r, selected: checked })));
    if (activeTab === 'chapters') setChapters((rows) => rows.map((r) => ({ ...r, selected: checked })));
    if (activeTab === 'goals') setGoals((rows) => rows.map((r) => ({ ...r, selected: checked })));
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 backdrop-blur-[2px] p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && !parsing) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="PDF Syllabus Deep-Parser and Review"
        className="w-full max-w-3xl max-h-[88dvh] flex flex-col rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-[var(--border-subtle)]">
          <div className="min-w-0">
            <h3 className="font-display text-[16px] font-bold text-[var(--text-primary)]">
              Syllabus Deep-Parser &amp; Auto-Milestone Extractor
            </h3>
            <p className="text-[12px] text-[var(--text-muted)]">
              Upload a course syllabus PDF or Word doc, review every extracted item, and approve what gets added.
            </p>
          </div>
          <button
            type="button"
            disabled={parsing}
            onClick={onClose}
            aria-label="Close syllabus importer"
            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:bg-[var(--bg-surface-hover)] hover:text-[var(--text-primary)]"
          >
            <X size={16} />
          </button>
        </div>

        {/* Upload & Subject Selection */}
        <div className="px-5 py-3.5 border-b border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-[12px] text-[var(--text-secondary)]">
            <span className="font-medium whitespace-nowrap">Target Subject</span>
            <select
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
              disabled={parsing}
              className="h-8 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 text-[12.5px] text-[var(--text-primary)] outline-none"
            >
              {app.subjects.map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {sub.code ? `${sub.code} · ${sub.name}` : sub.name}
                </option>
              ))}
              {!app.subjects.length && <option value="">No subjects yet</option>}
            </select>
          </label>

          <label className="inline-flex items-center gap-2 h-8 px-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[12px] font-medium text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] cursor-pointer">
            <Upload size={13} className="text-[var(--accent)]" />
            <span className="max-w-[200px] truncate">{file ? file.name : 'Choose PDF / DOCX / TXT'}</span>
            <input
              type="file"
              accept=".pdf,.docx,.doc,.txt,.md"
              hidden
              disabled={parsing}
              onChange={(e) => {
                setFile(e.target.files?.[0] ?? null);
                setError('');
              }}
            />
          </label>

          <button
            type="button"
            disabled={!file || parsing}
            onClick={() => void handleParse()}
            className="ml-auto inline-flex items-center gap-1.5 h-8 px-3.5 rounded-lg bg-[var(--accent)] text-[var(--accent-fg)] text-[12.5px] font-semibold hover:bg-[var(--accent-hover)] disabled:opacity-50 whitespace-nowrap"
          >
            {parsing ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            <span>{parsing ? 'Parsing Syllabus…' : hasParsed ? 'Re-parse Syllabus' : 'Parse with Pip'}</span>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4 space-y-4">
          {status && (
            <div className="flex items-center gap-2 rounded-xl border border-[var(--accent-border)] bg-[var(--accent-soft)]/50 px-3.5 py-2.5 text-[12.5px] text-[var(--text-primary)]">
              <Loader2 size={14} className="animate-spin text-[var(--accent)]" />
              <span>{status}</span>
            </div>
          )}

          {error && (
            <div role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/8 px-3.5 py-2.5 text-[12.5px] text-rose-700 dark:text-rose-300">
              {error}
            </div>
          )}

          {!hasParsed && !parsing && (
            <div className="py-12 text-center space-y-2">
              <FileText size={28} className="mx-auto text-[var(--text-muted)]" />
              <div className="font-display text-[14.5px] font-semibold text-[var(--text-primary)]">
                Upload a course syllabus to extract your entire term
              </div>
              <p className="text-[12.5px] text-[var(--text-muted)] max-w-md mx-auto">
                Pip scans exam dates and weighting percentages, reading and homework deadlines, syllabus chapters, and milestone goals — then lets you inspect, edit, and check which items to import.
              </p>
            </div>
          )}

          {hasParsed && (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-1">
                  {(
                    [
                      { id: 'exams', label: 'Exams', count: counts.exams, total: exams.length, icon: Calendar },
                      { id: 'tasks', label: 'Tasks', count: counts.tasks, total: tasks.length, icon: CheckSquare },
                      { id: 'chapters', label: 'Syllabus Units', count: counts.chapters, total: chapters.length, icon: BookOpen },
                      { id: 'goals', label: 'Goals', count: counts.goals, total: goals.length, icon: Target },
                    ] as Array<{ id: ReviewTab; label: string; count: number; total: number; icon: typeof Calendar }>
                  ).map((tab) => {
                    const Icon = tab.icon;
                    const active = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setActiveTab(tab.id)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold whitespace-nowrap transition-colors ${
                          active
                            ? 'bg-[var(--accent)] text-[var(--accent-fg)]'
                            : 'bg-[var(--bg-surface-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        <Icon size={13} />
                        <span>{tab.label}</span>
                        <span className="tabular-nums opacity-85">
                          ({tab.count}/{tab.total})
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center gap-3 text-[11.5px]">
                  {courseTitle && (
                    <span className="text-[var(--text-muted)] truncate max-w-[180px]">{courseTitle}</span>
                  )}
                  <button
                    type="button"
                    onClick={() => toggleAllCurrentTab(true)}
                    className="font-semibold text-[var(--accent)] hover:underline"
                  >
                    Select all
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleAllCurrentTab(false)}
                    className="font-semibold text-[var(--text-muted)] hover:underline"
                  >
                    Clear
                  </button>
                </div>
              </div>

              {/* Exams Tab */}
              {activeTab === 'exams' && (
                <div className="space-y-2">
                  {!exams.length && <p className="text-[12.5px] text-[var(--text-muted)]">No exams were found in this syllabus.</p>}
                  {exams.map((row) => (
                    <div
                      key={row.id}
                      className="flex flex-wrap items-center gap-2 p-2.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)]"
                    >
                      <input
                        type="checkbox"
                        checked={row.selected}
                        onChange={(e) =>
                          setExams((prev) => prev.map((x) => (x.id === row.id ? { ...x, selected: e.target.checked } : x)))
                        }
                        className="accent-[var(--accent)]"
                      />
                      <input
                        type="text"
                        value={row.title}
                        onChange={(e) =>
                          setExams((prev) => prev.map((x) => (x.id === row.id ? { ...x, title: e.target.value } : x)))
                        }
                        className="min-w-[180px] flex-1 h-8 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 text-[12.5px] text-[var(--text-primary)]"
                      />
                      <input
                        type="date"
                        value={row.date}
                        onChange={(e) =>
                          setExams((prev) => prev.map((x) => (x.id === row.id ? { ...x, date: e.target.value } : x)))
                        }
                        className="h-8 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2 text-[12px] tabular-nums text-[var(--text-primary)]"
                      />
                      <label className="inline-flex items-center gap-1 text-[11.5px] text-[var(--text-muted)]">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={row.weightPercent}
                          onChange={(e) =>
                            setExams((prev) =>
                              prev.map((x) => (x.id === row.id ? { ...x, weightPercent: Number(e.target.value) } : x)),
                            )
                          }
                          className="w-14 h-8 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2 text-[12px] tabular-nums text-[var(--text-primary)]"
                        />
                        <span>%</span>
                      </label>
                    </div>
                  ))}
                </div>
              )}

              {/* Tasks Tab */}
              {activeTab === 'tasks' && (
                <div className="space-y-2">
                  {!tasks.length && <p className="text-[12.5px] text-[var(--text-muted)]">No assignments or tasks were extracted.</p>}
                  {tasks.map((row) => (
                    <div
                      key={row.id}
                      className="flex flex-wrap items-center gap-2 p-2.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)]"
                    >
                      <input
                        type="checkbox"
                        checked={row.selected}
                        onChange={(e) =>
                          setTasks((prev) => prev.map((x) => (x.id === row.id ? { ...x, selected: e.target.checked } : x)))
                        }
                        className="accent-[var(--accent)]"
                      />
                      <input
                        type="text"
                        value={row.title}
                        onChange={(e) =>
                          setTasks((prev) => prev.map((x) => (x.id === row.id ? { ...x, title: e.target.value } : x)))
                        }
                        className="min-w-[180px] flex-1 h-8 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 text-[12.5px] text-[var(--text-primary)]"
                      />
                      <input
                        type="date"
                        value={row.dueDate}
                        onChange={(e) =>
                          setTasks((prev) => prev.map((x) => (x.id === row.id ? { ...x, dueDate: e.target.value } : x)))
                        }
                        className="h-8 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2 text-[12px] tabular-nums text-[var(--text-primary)]"
                      />
                      <select
                        value={row.priority}
                        onChange={(e) =>
                          setTasks((prev) =>
                            prev.map((x) =>
                              x.id === row.id
                                ? { ...x, priority: e.target.value as 'low' | 'medium' | 'high' }
                                : x,
                            ),
                          )
                        }
                        className="h-8 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2 text-[12px] text-[var(--text-primary)]"
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                      </select>
                    </div>
                  ))}
                </div>
              )}

              {/* Chapters Tab */}
              {activeTab === 'chapters' && (
                <div className="space-y-2">
                  {!chapters.length && <p className="text-[12.5px] text-[var(--text-muted)]">No syllabus units were extracted.</p>}
                  {chapters.map((row) => (
                    <div
                      key={row.id}
                      className="p-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] space-y-1.5"
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={row.selected}
                          onChange={(e) =>
                            setChapters((prev) => prev.map((x) => (x.id === row.id ? { ...x, selected: e.target.checked } : x)))
                          }
                          className="accent-[var(--accent)]"
                        />
                        <input
                          type="text"
                          value={row.title}
                          onChange={(e) =>
                            setChapters((prev) => prev.map((x) => (x.id === row.id ? { ...x, title: e.target.value } : x)))
                          }
                          className="min-w-0 flex-1 h-8 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 text-[12.5px] font-semibold text-[var(--text-primary)]"
                        />
                      </div>
                      {row.topics.length > 0 && (
                        <p className="pl-6 text-[11.5px] text-[var(--text-muted)]">
                          {row.topics.join(' · ')}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Goals Tab */}
              {activeTab === 'goals' && (
                <div className="space-y-2">
                  {!goals.length && <p className="text-[12.5px] text-[var(--text-muted)]">No milestone goals were extracted.</p>}
                  {goals.map((row) => (
                    <div
                      key={row.id}
                      className="p-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] space-y-1.5"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <input
                          type="checkbox"
                          checked={row.selected}
                          onChange={(e) =>
                            setGoals((prev) => prev.map((x) => (x.id === row.id ? { ...x, selected: e.target.checked } : x)))
                          }
                          className="accent-[var(--accent)]"
                        />
                        <input
                          type="text"
                          value={row.title}
                          onChange={(e) =>
                            setGoals((prev) => prev.map((x) => (x.id === row.id ? { ...x, title: e.target.value } : x)))
                          }
                          className="min-w-[180px] flex-1 h-8 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 text-[12.5px] font-semibold text-[var(--text-primary)]"
                        />
                        <input
                          type="date"
                          value={row.deadline}
                          onChange={(e) =>
                            setGoals((prev) => prev.map((x) => (x.id === row.id ? { ...x, deadline: e.target.value } : x)))
                          }
                          className="h-8 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2 text-[12px] tabular-nums text-[var(--text-primary)]"
                        />
                      </div>
                      {row.milestones.length > 0 && (
                        <p className="pl-6 text-[11.5px] text-[var(--text-muted)]">
                          Milestones: {row.milestones.join(' · ')}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[var(--border-subtle)] bg-[var(--bg-surface)] flex flex-wrap items-center justify-between gap-2">
          <div className="text-[12px] text-[var(--text-muted)] tabular-nums">
            {hasParsed
              ? `Ready to import ${totalSelected} selected ${totalSelected === 1 ? 'item' : 'items'} — nothing added until you approve.`
              : 'Supports PDF, DOCX, DOC, Markdown, and plain text syllabi.'}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={parsing}
              className="h-9 px-3.5 rounded-lg border border-[var(--border-subtle)] text-[12.5px] font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)]"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!hasParsed || totalSelected === 0 || parsing}
              onClick={handleApproveImport}
              className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-[var(--accent)] text-[var(--accent-fg)] text-[12.5px] font-semibold hover:bg-[var(--accent-hover)] disabled:opacity-45 whitespace-nowrap"
            >
              <CheckCircle2 size={14} />
              <span>Approve &amp; Import Selected ({totalSelected})</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
