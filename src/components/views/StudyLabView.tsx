import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Code2, PenTool } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { StudyLabLaunchState } from '../../types/studyflow';
import { CodeMathPlayground } from '../../lab/CodeMathPlayground';
import { WhiteboardStudio } from '../../lab/WhiteboardStudio';

export function StudyLabView() {
  const app = useApp();
  const [activeTab, setActiveTab] = useState<'playground' | 'whiteboard'>('playground');
  const [launchSnapshot, setLaunchSnapshot] = useState<StudyLabLaunchState | null>(null);

  useEffect(() => {
    if (!app.studyLabLaunch) return;
    setActiveTab(app.studyLabLaunch.tab);
    setLaunchSnapshot(app.studyLabLaunch);
    app.clearStudyLabLaunch();
  }, [app.studyLabLaunch, app.clearStudyLabLaunch]);

  const linkedContext = useMemo(() => {
    if (launchSnapshot?.targetQuizId) {
      const quiz = app.quizzes.find((q) => q.id === launchSnapshot.targetQuizId);
      if (quiz) return { label: `Linked to practice test: ${quiz.title}`, backRoute: 'practice' as const };
    }
    if (launchSnapshot?.targetNoteId) {
      const note = app.notes.find((n) => n.id === launchSnapshot.targetNoteId);
      if (note) return { label: `Linked to note: ${note.title}`, backRoute: 'notes' as const };
    }
    return null;
  }, [app.notes, app.quizzes, launchSnapshot]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-display text-[20px] font-bold tracking-tight text-[var(--text-primary)]">
            Study Lab
          </h2>
          <p className="text-[12.5px] text-[var(--text-muted)]">
            Interactive Math &amp; Code Playground and SVG Whiteboard Studio connected to Notes, Practice Tests, and Pip.
          </p>
        </div>

        <div className="inline-flex items-center p-1 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
          <button
            type="button"
            onClick={() => setActiveTab('playground')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[12.5px] font-semibold whitespace-nowrap transition-colors ${
              activeTab === 'playground'
                ? 'bg-[var(--accent)] text-[var(--accent-fg)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Code2 size={14} />
            <span>Math &amp; Code Playground</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('whiteboard')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[12.5px] font-semibold whitespace-nowrap transition-colors ${
              activeTab === 'whiteboard'
                ? 'bg-[var(--accent)] text-[var(--accent-fg)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <PenTool size={14} />
            <span>Whiteboard &amp; SVG Studio</span>
          </button>
        </div>
      </div>

      {linkedContext && (
        <div className="flex items-center justify-between gap-2 px-3.5 py-2 rounded-xl border border-[var(--accent-border)] bg-[var(--accent-soft)]/50 text-[12px]">
          <span className="font-medium text-[var(--text-primary)] truncate">{linkedContext.label}</span>
          <button
            type="button"
            onClick={() => app.setRoute(linkedContext.backRoute)}
            className="inline-flex items-center gap-1 font-semibold text-[var(--accent)] hover:underline whitespace-nowrap"
          >
            <ArrowLeft size={13} />
            <span>Back</span>
          </button>
        </div>
      )}

      {activeTab === 'playground' ? (
        <CodeMathPlayground launch={launchSnapshot} />
      ) : (
        <WhiteboardStudio launch={launchSnapshot} />
      )}
    </div>
  );
}
