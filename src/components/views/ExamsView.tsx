import React, { useState } from 'react';
import { Plus, Calendar, MapPin, Target, ArrowRight } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const ExamsView: React.FC = () => {
  const { exams, subjects, setActiveModal, setRoute } = useApp();
  const [selectedExamId, setSelectedExamId] = useState<string>(exams[0]?.id ?? '');

  const selectedExam = exams.find((e) => e.id === selectedExamId) ?? exams[0];
  const surfaceStyle: React.CSSProperties = {
    backgroundColor: 'var(--bg-surface)',
    border: '1px solid var(--border-subtle)',
  };

  const daysUntil = (iso: string) =>
    Math.max(1, Math.round((new Date(iso).getTime() - new Date('2026-11-22').getTime()) / 86400000));

  return (
    <div className="space-y-4 pb-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-[19px] font-semibold text-[var(--text-primary)]">
            Exams & Assessment Roadmap
          </h1>
          <p className="text-[12.5px] text-[var(--text-muted)]">
            Upcoming finals countdown, syllabus readiness mapping, and mock exam scores
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setRoute('practice')}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[12.5px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            style={surfaceStyle}
          >
            Practice Tests <ArrowRight className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setActiveModal('create_exam')}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[12.5px] font-medium"
            style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' }}
          >
            <Plus className="w-3.5 h-3.5" /> Add Exam
          </button>
        </div>
      </div>

      {/* Upcoming Exam Countdown Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        {exams.map((ex) => {
          const sub = subjects.find((s) => s.id === ex.subjectId);
          const days = daysUntil(ex.date);
          const active = selectedExam?.id === ex.id;

          return (
            <button
              key={ex.id}
              type="button"
              onClick={() => setSelectedExamId(ex.id)}
              className="rounded-xl p-4 text-left transition-all space-y-2.5"
              style={{
                backgroundColor: active ? 'var(--accent-soft)' : 'var(--bg-surface)',
                border: active ? '1px solid var(--accent)' : '1px solid var(--border-subtle)',
              }}
            >
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold" style={{ color: sub?.color }}>
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: sub?.color }} />
                  {sub?.code}
                </span>
                <span className="font-mono-num text-[12px] font-semibold text-amber-600 dark:text-amber-400">
                  {days}d left
                </span>
              </div>
              <div className="font-display text-[14px] font-semibold text-[var(--text-primary)] line-clamp-2">
                {ex.title}
              </div>
              <div className="text-[11.5px] text-[var(--text-muted)]">
                {ex.date} · {ex.weightPercent}% of grade
              </div>
              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-[var(--text-secondary)]">Prep readiness</span>
                  <span className="font-mono-num font-medium text-[var(--text-primary)]">{ex.prepProgress}%</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-surface-hover)' }}>
                  <div className="h-full rounded-full" style={{ width: `${ex.prepProgress}%`, backgroundColor: sub?.color ?? 'var(--accent)' }} />
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected Exam Detail + Mini Exam Calendar */}
      {selectedExam && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-7 rounded-xl p-5 space-y-4" style={surfaceStyle}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-[12px] text-[var(--text-muted)]">
                  {subjects.find((s) => s.id === selectedExam.subjectId)?.name}
                </div>
                <h2 className="font-display text-[17px] font-semibold text-[var(--text-primary)] mt-0.5">
                  {selectedExam.title}
                </h2>
              </div>
              <div className="text-right">
                <div className="text-[11px] text-[var(--text-muted)]">Target Grade</div>
                <div className="font-mono-num text-[14px] font-semibold text-[var(--text-primary)] inline-flex items-center gap-1">
                  <Target className="w-3.5 h-3.5 text-[var(--accent)]" /> {selectedExam.targetGrade}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-[12.5px] text-[var(--text-secondary)]">
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                {selectedExam.date} · {selectedExam.time}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                {selectedExam.room}
              </span>
            </div>

            {/* Syllabus Coverage */}
            <div className="pt-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
              <div className="text-[12.5px] font-semibold text-[var(--text-primary)] mb-2">
                Mapped Syllabus Topics
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {selectedExam.syllabusTopics.map((topic, idx) => (
                  <div
                    key={topic}
                    className="px-3 py-2 rounded-lg flex items-center justify-between text-[12.5px]"
                    style={{ backgroundColor: 'var(--bg-surface-subtle)' }}
                  >
                    <span className="text-[var(--text-primary)]">{topic}</span>
                    <span className="font-mono-num text-[11px] text-[var(--text-muted)]">
                      {idx < 2 ? 'Reviewed' : 'In progress'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Mock Exam History */}
            <div className="pt-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
              <div className="text-[12.5px] font-semibold text-[var(--text-primary)] mb-2">
                Mock Exam History
              </div>
              {selectedExam.mockHistory.length === 0 ? (
                <div className="text-[12.5px] text-[var(--text-muted)]">No timed mock attempts logged yet.</div>
              ) : (
                <div className="divide-y divide-[var(--border-subtle)]">
                  {selectedExam.mockHistory.map((m) => (
                    <div key={m.label} className="py-2 flex items-center justify-between text-[12.5px]">
                      <div>
                        <span className="font-medium text-[var(--text-primary)]">{m.label}</span>
                        <span className="text-[var(--text-muted)] ml-2">· {m.date}</span>
                      </div>
                      <span className="font-mono-num font-semibold text-emerald-600 dark:text-emerald-400">
                        {m.score}%
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Exam Schedule Calendar Strip */}
          <div className="lg:col-span-5 rounded-xl p-5 space-y-3" style={surfaceStyle}>
            <h2 className="font-display text-[14.5px] font-semibold text-[var(--text-primary)]">
              Finals Window Calendar · Nov–Dec 2026
            </h2>
            <div className="grid grid-cols-7 gap-1.5 text-center text-[11px]">
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                <div key={`${d}-${i}`} className="text-[var(--text-muted)] font-medium py-1">
                  {d}
                </div>
              ))}
              {Array.from({ length: 28 }, (_, i) => {
                // Nov 22 to Dec 19
                const dt = new Date(2026, 10, 22 + i);
                const iso = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
                const examOnDay = exams.find((e) => e.date === iso);
                const sub = examOnDay ? subjects.find((s) => s.id === examOnDay.subjectId) : null;
                const isToday = iso === '2026-11-22';

                return (
                  <button
                    key={iso}
                    type="button"
                    onClick={() => examOnDay && setSelectedExamId(examOnDay.id)}
                    title={examOnDay ? `${sub?.code}: ${examOnDay.title}` : iso}
                    className="h-9 rounded-lg flex flex-col items-center justify-center font-mono-num transition-colors"
                    style={{
                      backgroundColor: examOnDay
                        ? `${sub?.color ?? '#4F46E5'}24`
                        : isToday
                          ? 'var(--accent-soft)'
                          : 'var(--bg-surface-subtle)',
                      border: examOnDay
                        ? `1px solid ${sub?.color ?? 'var(--accent)'}`
                        : '1px solid transparent',
                      color: 'var(--text-primary)',
                    }}
                  >
                    <span>{dt.getDate()}</span>
                    {examOnDay && (
                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: sub?.color }} />
                    )}
                  </button>
                );
              })}
            </div>
            <div className="pt-2 text-[11.5px] text-[var(--text-muted)]">
              Highlighted dates mark scheduled midterms and finals. Click a date to inspect syllabus readiness.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
