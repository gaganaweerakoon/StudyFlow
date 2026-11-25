import React, { useState } from 'react';
import { Plus, Calendar, MapPin, Target, ArrowRight, Sparkles, ClipboardCheck, FileText } from 'lucide-react';
import { useAssistant } from '../../assistant/AssistantContext';
import { useApp } from '../../context/AppContext';
import { SyllabusDeepImportModal } from '../../notes/SyllabusDeepImportModal';

export const ExamsView: React.FC = () => {
  const { exams, subjects, setActiveModal, setRoute, updateExam, deleteExam } = useApp();
  const { askPip } = useAssistant();
  const [selectedExamId, setSelectedExamId] = useState<string>(exams[0]?.id ?? '');
  const [syllabusOpen, setSyllabusOpen] = useState(false);

  const [editingId, setEditingId] = useState<string>();

  const selectedExam = exams.find((e) => e.id === selectedExamId) ?? exams[0];
  const surfaceStyle: React.CSSProperties = {
    backgroundColor: 'var(--bg-surface)',
    border: '1px solid var(--border-subtle)',
  };

  const [now,setNow]=useState(()=>new Date());
  React.useEffect(()=>{const t=setInterval(()=>setNow(new Date()),1000);return ()=>clearInterval(t);},[]);
  function countdown(date:string,time:string) {
    const timed=/^\d{2}:\d{2}$/.test(time);
    const target=new Date(date+'T'+(timed?time:'00:00')+':00');
    if(!Number.isFinite(+target)) return 'Date unavailable';
    const total=Math.round((+new Date(date+'T12:00:00') - +new Date(now.getFullYear(),now.getMonth(),now.getDate(),12))/86400000);
    if(!timed) return total<0?'Past exam':total===0?'Today':total+' days left';
    if(+target<=+now)return 'Exam started';
    let months=(target.getFullYear()-now.getFullYear())*12+target.getMonth()-now.getMonth();
    function afterMonths(n:number) {
      const d=new Date(now);d.setDate(1);d.setMonth(d.getMonth()+n);
      const last=new Date(d.getFullYear(),d.getMonth()+1,0).getDate();
      d.setDate(Math.min(now.getDate(),last));return d;
    }
    if(afterMonths(months)>target) months--;
    const seconds=Math.floor((+target-+afterMonths(months))/1000);
    const days=Math.floor(seconds/86400);
    return months+'mo '+Math.floor(days/7)+'w '+days%7+'d '+Math.floor(seconds/3600)%24+'h '+Math.floor(seconds/60)%60+'m '+seconds%60+'s · '+total+' days';
  }

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

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setSyllabusOpen(true)}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[12.5px] font-medium whitespace-nowrap text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] transition-colors"
            style={surfaceStyle}
          >
            <FileText className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} /> Import Syllabus PDF
          </button>
          <button
            type="button"
            onClick={() => setRoute('practice')}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[12.5px] font-medium whitespace-nowrap text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            style={surfaceStyle}
          >
            Practice Tests <ArrowRight className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setActiveModal('create_exam')}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[12.5px] font-medium whitespace-nowrap"
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
          const days = countdown(ex.date,ex.time);
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
                  {days}
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

            <div className="flex flex-wrap items-center gap-2 text-[12.5px]">
              <button
                type="button"
                onClick={() => {
                  const sub = subjects.find((s) => s.id === selectedExam.subjectId);
                  const topics = selectedExam.syllabusTopics.length
                    ? selectedExam.syllabusTopics.join(', ')
                    : 'the mapped subject syllabus';
                  askPip(
                    `Build a focused prep plan for my exam "${selectedExam.title}" (${sub?.name ?? 'General'}, ${selectedExam.date}, ${selectedExam.weightPercent}% weight, currently ${selectedExam.prepProgress}% ready). Prioritize weak or incomplete syllabus topics across ${topics}, and schedule concrete study sessions into my open calendar slots.`,
                    { openFloating: true },
                  );
                }}
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-medium transition-opacity hover:opacity-95"
                style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' }}
              >
                <Sparkles className="w-3.5 h-3.5" />
                Build Prep Plan
              </button>
              <button
                type="button"
                onClick={() => {
                  const sub = subjects.find((s) => s.id === selectedExam.subjectId);
                  const topics = selectedExam.syllabusTopics.length
                    ? selectedExam.syllabusTopics.join(', ')
                    : 'its core syllabus topics';
                  askPip(
                    `Create a 6-question exam-style mock practice test for "${selectedExam.title}" (${sub?.name ?? 'General'}) covering ${topics}, with worked explanations, and save it to StudyFlow Practice Tests.`,
                    { openFloating: true },
                  );
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-subtle)] px-3 py-1.5 font-medium text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] transition-colors"
                style={{ backgroundColor: 'var(--bg-surface-subtle)' }}
              >
                <ClipboardCheck className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} />
                Generate Mock Quiz
              </button>
              <button
                type="button"
                className="rounded-lg border border-[var(--border-subtle)] px-3 py-1.5 font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] transition-colors"
                onClick={() => setEditingId(selectedExam.id)}
              >
                Edit exam
              </button>
              <button
                type="button"
                className="rounded-lg border border-[var(--border-subtle)] px-3 py-1.5 font-medium text-red-500 hover:bg-red-500/10 transition-colors"
                onClick={() => {
                  if (window.confirm(`Delete “${selectedExam.title}” and its mock exam history?`)) {
                    deleteExam(selectedExam.id);
                    setEditingId(undefined);
                  }
                }}
              >
                Delete exam
              </button>
            </div>
            {editingId === selectedExam.id && (
              <form key={selectedExam.id} className="grid gap-3 sm:grid-cols-2 [&_label]:grid [&_label]:gap-1 [&_label]:text-sm [&_input]:rounded-lg [&_input]:border [&_input]:border-[var(--border-subtle)] [&_input]:p-2" onSubmit={event => {
                event.preventDefault();
                const values = new FormData(event.currentTarget);
                const title = String(values.get('title')).trim();
                if (!title) return;
                updateExam(selectedExam.id, {
                  title,
                  subjectId: String(values.get('subject')),
                  date: String(values.get('date')),
                  time: String(values.get('time')),
                  room: String(values.get('room')).trim(),
                  targetGrade: String(values.get('grade')).trim(),
                  weightPercent: Number(values.get('weight')),
                });
                setEditingId(undefined);
              }}>
                <label>Title <input name="title" defaultValue={selectedExam.title} required autoFocus /></label>
                <label>Subject <select name="subject" className="rounded-lg border border-[var(--border-subtle)] p-2" defaultValue={selectedExam.subjectId}>
                  <option value="">Unassigned</option>
                  {subjects.map(subject => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
                </select></label>
                <label>Date <input name="date" type="date" defaultValue={selectedExam.date} required /></label>
                <label>Time <input name="time" type="time" defaultValue={selectedExam.time} /></label>
                <label>Room <input name="room" defaultValue={selectedExam.room} /></label>
                <label>Target grade <input name="grade" defaultValue={selectedExam.targetGrade} /></label>
                <label>Grade weight (%) <input name="weight" type="number" min="0" max="100" step="any" defaultValue={selectedExam.weightPercent} required /></label>
                <div className="flex items-end justify-end gap-2">
                  <button type="button" onClick={() => setEditingId(undefined)} className="px-3 py-2">Cancel</button>
                  <button type="submit" className="rounded-lg bg-[var(--accent)] px-3 py-2 text-[var(--accent-fg)]">Save exam</button>
                </div>
              </form>
            )}

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
              {(() => {
                const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 27);
                const startMonth = now.toLocaleDateString('en-US', { month: 'short' });
                const endMonth = end.toLocaleDateString('en-US', { month: 'short' });
                const range = startMonth === endMonth
                  ? `${startMonth} ${now.getFullYear()}`
                  : `${startMonth}–${endMonth} ${end.getFullYear()}`;
                return `Exam Window Calendar · ${range}`;
              })()}
            </h2>
            <div className="grid grid-cols-7 gap-1.5 text-center text-[11px]">
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                <div key={`${d}-${i}`} className="text-[var(--text-muted)] font-medium py-1">
                  {d}
                </div>
              ))}
              {Array.from({ length: 28 }, (_, i) => {
                const dt = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
                const iso = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
                const examOnDay = exams.find((e) => e.date === iso);
                const sub = examOnDay ? subjects.find((s) => s.id === examOnDay.subjectId) : null;
                const isToday = i === 0;

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

      <SyllabusDeepImportModal
        open={syllabusOpen}
        onClose={() => setSyllabusOpen(false)}
        defaultSubjectId={selectedExam?.subjectId}
      />
    </div>
  );
};
