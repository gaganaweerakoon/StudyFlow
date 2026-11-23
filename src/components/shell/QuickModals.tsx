import React, { useState } from 'react';
import { X, Star, CheckCircle2 } from 'lucide-react';
import { localDay } from '../../assistant/workspaceContext';
import { useApp } from '../../context/AppContext';
import type { Priority, GoalItem } from '../../types/studyflow';

const SUBJECT_SWATCHES = ['#4F46E5', '#0D9488', '#D97706', '#E11D48', '#7C3AED', '#2563EB', '#059669'];

export const QuickModals: React.FC = () => {
  const {
    activeModal,
    setActiveModal,
    legacyCalendar,
    subjects,
    decks,
    addTask,
    addSubject,
    addSession,
    addGoal,
    addFlashcard,
    addExam,
    focusTimer,
    submitFocusCompletion,
    dismissFocusCompletion,
    toasts,
  } = useApp();

  // Task form
  const [taskTitle, setTaskTitle] = useState('');
  const [taskSubject, setTaskSubject] = useState(subjects[0]?.id ?? '');
  const [taskPriority, setTaskPriority] = useState<Priority>('medium');
  const [taskDue, setTaskDue] = useState(legacyCalendar ? localDay() : '2026-11-24');
  const [taskMinutes, setTaskMinutes] = useState(45);
  const [taskDesc, setTaskDesc] = useState('');

  // Subject form
  const [subCode, setSubCode] = useState('');
  const [subName, setSubName] = useState('');
  const [subInstructor, setSubInstructor] = useState('');
  const [subColor, setSubColor] = useState(SUBJECT_SWATCHES[0]);
  const [subTarget, setSubTarget] = useState(6);

  const [countsTowardStudy, setCountsTowardStudy] = useState(true);
  // Session form
  const [sesTitle, setSesTitle] = useState('');
  const [sesSubject, setSesSubject] = useState(subjects[0]?.id ?? '');
  const [sesDay, setSesDay] = useState(6);
  const [sesHour, setSesHour] = useState(15);
  const [sesDuration, setSesDuration] = useState(1.5);
  const [sesRecurring, setSesRecurring] = useState(false);

  // Goal form
  const [goalTitle, setGoalTitle] = useState('');
  const [goalCategory, setGoalCategory] = useState<GoalItem['category']>('weekly');
  const [goalTarget, setGoalTarget] = useState(10);
  const [goalUnit, setGoalUnit] = useState('hrs');

  // Flashcard form
  const [fcDeck, setFcDeck] = useState(decks[0]?.id ?? 'deck-cs');
  const [fcFront, setFcFront] = useState('');
  const [fcBack, setFcBack] = useState('');
  const [fcHint, setFcHint] = useState('');

  // Exam form
  const [exTitle, setExTitle] = useState('');
  const [exSubject, setExSubject] = useState('');
  const [exTime,setExTime]=useState('');
  const [exDate, setExDate] = useState(localDay());
  const [exRoom, setExRoom] = useState('Science Hall 201');
  const [exTarget, setExTarget] = useState('A (92%+)');

  // Focus quality rating
  const [focusRating, setFocusRating] = useState(4);
  const [formError, setFormError] = useState('');

  const closeModal = () => {
    setFormError('');
    setActiveModal(null);
  };

  const inputStyle: React.CSSProperties = {
    backgroundColor: 'var(--bg-surface-subtle)',
    border: '1px solid var(--border-subtle)',
    color: 'var(--text-primary)',
  };

  const handleTaskSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) {
      setFormError('Please enter a task title.');
      return;
    }
    addTask({
      title: taskTitle.trim(),
      subjectId: subjects.find(item => item.id === taskSubject)?.id ?? subjects[0]?.id ?? '',
      dueDate: taskDue,
      dueLabel: taskDue === '2026-11-22' ? 'Today' : taskDue,
      priority: taskPriority,
      status: 'todo',
      estimatedMinutes: taskMinutes,
      description: taskDesc.trim() || 'Added via quick create.',
      subtasks: [],
    });
    setTaskTitle('');
    setTaskDesc('');
    closeModal();
  };

  const handleSubjectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subCode.trim() || !subName.trim()) {
      setFormError('Please provide both course code and subject title.');
      return;
    }
    addSubject({
      code: subCode.trim().toUpperCase(),
      name: subName.trim(),
      instructor: subInstructor.trim() || 'Faculty Instructor',
      color: subColor,
      icon: 'code',
      totalHours: 0,
      weeklyTargetHours: subTarget,
      lastStudied: 'Just added',
      nextExamDate: '2026-12-15',
      nextExamTitle: 'Final Examination',
      currentGrade: '—',
      targetGrade: 'A',
    });
    setSubCode('');
    setSubName('');
    setSubInstructor('');
    closeModal();
  };

  const handleSessionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sesTitle.trim()) {
      setFormError('Please enter a study session title.');
      return;
    }
    const today = new Date();
    const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() - (today.getDay() + 6) % 7 + sesDay, 12);
    const sessionDate = legacyCalendar ? localDay(date) : `2026-11-${16 + sesDay}`;
    addSession({
      title: sesTitle.trim(),
      subjectId: subjects.find(item => item.id === sesSubject)?.id ?? subjects[0]?.id ?? '',
      dayIndex: sesDay,
      date: sessionDate,
      startHour: sesHour,
      durationHours: sesDuration,
      status: 'upcoming',
      recurring: sesRecurring, countsTowardStudy,
      location: 'Study Workspace',
    });
    setSesTitle('');
    setCountsTowardStudy(true);
    closeModal();
  };

  const handleGoalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!goalTitle.trim() || goalTarget <= 0) {
      setFormError('Please enter a goal title and positive target.');
      return;
    }
    addGoal({
      title: goalTitle.trim(),
      category: goalCategory,
      current: 0,
      target: goalTarget,
      unit: goalUnit,
      deadline: 'Dec 5, 2026',
      milestones: [
        { id: `ms-${Date.now()}`, label: 'Complete first milestone checkpoint', done: false, date: 'Nov 28' },
      ],
    });
    setGoalTitle('');
    closeModal();
  };

  const handleFlashcardSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fcFront.trim() || !fcBack.trim()) {
      setFormError('Both question (front) and answer (back) are required.');
      return;
    }
    addFlashcard({
      deckId: fcDeck,
      front: fcFront.trim(),
      back: fcBack.trim(),
      hint: fcHint.trim() || undefined,
    });
    setFcFront('');
    setFcBack('');
    setFcHint('');
    closeModal();
  };

  const handleExamSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!exTitle.trim()) {
      setFormError('Please provide an exam title.');
      return;
    }
    addExam({
      title: exTitle.trim(),
      subjectId: subjects.find(item => item.id === exSubject)?.id ?? '',
      date: exDate,
      time: exTime,
      room: exRoom.trim() || 'Main Hall',
      weightPercent: 25,
      prepProgress: 35,
      targetGrade: exTarget,
      syllabusTopics: ['Core Lectures', 'Problem Sets'],
    });
    setExTitle('');setExTime('');
    closeModal();
  };

  return (
    <>
      {/* Main Create Modals */}
      {activeModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="fixed inset-0 bg-black/45 backdrop-blur-[2px]" onClick={closeModal} />
          <div
            className="relative w-full max-w-md rounded-2xl overflow-hidden"
            style={{
              backgroundColor: 'var(--bg-elevated)',
              border: '1px solid var(--border-subtle)',
              boxShadow: 'var(--shadow-floating)',
            }}
          >
            <div
              className="flex items-center justify-between px-5 py-3.5"
              style={{ borderBottom: '1px solid var(--border-subtle)' }}
            >
              <h2 className="font-display font-semibold text-[15px] text-[var(--text-primary)]">
                {activeModal === 'create_task' && 'Create Task'}
                {activeModal === 'create_subject' && 'Add Subject'}
                {activeModal === 'create_session' && 'Schedule Study Session'}
                {activeModal === 'create_goal' && 'Create Study Goal'}
                {activeModal === 'create_flashcard' && 'Add Flashcard'}
                {activeModal === 'create_exam' && 'Add Upcoming Exam'}
              </h2>
              <button
                type="button"
                onClick={closeModal}
                aria-label="Close modal"
                className="p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="mx-5 mt-3 px-3 py-2 rounded-lg text-[12px] text-rose-600 dark:text-rose-400 bg-rose-500/10">
                {formError}
              </div>
            )}

            {activeModal === 'create_task' && (
              <form onSubmit={handleTaskSubmit} className="p-5 space-y-3.5">
                <div>
                  <label className="block text-[12px] font-medium text-[var(--text-secondary)] mb-1">
                    Task Title
                  </label>
                  <input
                    type="text"
                    value={taskTitle}
                    onChange={(e) => setTaskTitle(e.target.value)}
                    placeholder="e.g., Derive Gauss Divergence Theorem examples"
                    className="w-full px-3 py-2 rounded-lg text-[13px]"
                    style={inputStyle}
                    autoFocus
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[12px] font-medium text-[var(--text-secondary)] mb-1">
                      Subject
                    </label>
                    <select
                      value={taskSubject}
                      onChange={(e) => setTaskSubject(e.target.value)}
                      className="w-full px-2.5 py-2 rounded-lg text-[13px]"
                      style={inputStyle}
                    >
                      {subjects.map((s) => (
                        <option key={s.id} value={s.id}>{s.code} · {s.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[12px] font-medium text-[var(--text-secondary)] mb-1">
                      Priority
                    </label>
                    <select
                      value={taskPriority}
                      onChange={(e) => setTaskPriority(e.target.value as Priority)}
                      className="w-full px-2.5 py-2 rounded-lg text-[13px]"
                      style={inputStyle}
                    >
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[12px] font-medium text-[var(--text-secondary)] mb-1">
                      Due Date
                    </label>
                    <input
                      type="date"
                      value={taskDue}
                      onChange={(e) => setTaskDue(e.target.value)}
                      className="w-full px-2.5 py-2 rounded-lg text-[13px]"
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label className="block text-[12px] font-medium text-[var(--text-secondary)] mb-1">
                      Est. Minutes
                    </label>
                    <input
                      type="number"
                      min={10}
                      max={300}
                      value={taskMinutes}
                      onChange={(e) => setTaskMinutes(Number(e.target.value))}
                      className="w-full px-2.5 py-2 rounded-lg text-[13px] font-mono-num"
                      style={inputStyle}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-[var(--text-secondary)] mb-1">
                    Notes
                  </label>
                  <textarea
                    rows={2}
                    value={taskDesc}
                    onChange={(e) => setTaskDesc(e.target.value)}
                    placeholder="Optional details or problem numbers..."
                    className="w-full px-3 py-2 rounded-lg text-[13px] resize-none"
                    style={inputStyle}
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-3.5 py-1.5 rounded-lg text-[13px] text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-lg text-[13px] font-medium"
                    style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' }}
                  >
                    Create Task
                  </button>
                </div>
              </form>
            )}

            {activeModal === 'create_subject' && (
              <form onSubmit={handleSubjectSubmit} className="p-5 space-y-3.5">
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[12px] font-medium text-[var(--text-secondary)] mb-1">
                      Code
                    </label>
                    <input
                      type="text"
                      value={subCode}
                      onChange={(e) => setSubCode(e.target.value)}
                      placeholder="PHYS 212"
                      className="w-full px-3 py-2 rounded-lg text-[13px]"
                      style={inputStyle}
                      autoFocus
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[12px] font-medium text-[var(--text-secondary)] mb-1">
                      Subject Title
                    </label>
                    <input
                      type="text"
                      value={subName}
                      onChange={(e) => setSubName(e.target.value)}
                      placeholder="Quantum Mechanics I"
                      className="w-full px-3 py-2 rounded-lg text-[13px]"
                      style={inputStyle}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[12px] font-medium text-[var(--text-secondary)] mb-1">
                      Instructor
                    </label>
                    <input
                      type="text"
                      value={subInstructor}
                      onChange={(e) => setSubInstructor(e.target.value)}
                      placeholder="Prof. A. Alvarez"
                      className="w-full px-3 py-2 rounded-lg text-[13px]"
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label className="block text-[12px] font-medium text-[var(--text-secondary)] mb-1">
                      Weekly Target (hrs)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={25}
                      value={subTarget}
                      onChange={(e) => setSubTarget(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-lg text-[13px] font-mono-num"
                      style={inputStyle}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-[var(--text-secondary)] mb-1.5">
                    Subject Color
                  </label>
                  <div className="flex items-center gap-2">
                    {SUBJECT_SWATCHES.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setSubColor(c)}
                        aria-label={`Color ${c}`}
                        className="w-6 h-6 rounded-full transition-transform hover:scale-110"
                        style={{
                          backgroundColor: c,
                          outline: subColor === c ? '2px solid var(--text-primary)' : 'none',
                          outlineOffset: 2,
                        }}
                      />
                    ))}
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={closeModal} className="px-3.5 py-1.5 rounded-lg text-[13px] text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)]">
                    Cancel
                  </button>
                  <button type="submit" className="px-4 py-1.5 rounded-lg text-[13px] font-medium" style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' }}>
                    Add Subject
                  </button>
                </div>
              </form>
            )}

            {activeModal === 'create_session' && (
              <form onSubmit={handleSessionSubmit} className="p-5 space-y-3.5">
                <div>
                  <label className="block text-[12px] font-medium text-[var(--text-secondary)] mb-1">
                    Session Focus
                  </label>
                  <input
                    type="text"
                    value={sesTitle}
                    onChange={(e) => setSesTitle(e.target.value)}
                    placeholder="e.g., Timed Vector Calculus Practice Set"
                    className="w-full px-3 py-2 rounded-lg text-[13px]"
                    style={inputStyle}
                    autoFocus
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[12px] font-medium text-[var(--text-secondary)] mb-1">
                      Subject
                    </label>
                    <select value={sesSubject} onChange={(e) => setSesSubject(e.target.value)} className="w-full px-2.5 py-2 rounded-lg text-[13px]" style={inputStyle}>
                      {subjects.map((s) => (
                        <option key={s.id} value={s.id}>{s.code} · {s.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[12px] font-medium text-[var(--text-secondary)] mb-1">
                      Day of Week
                    </label>
                    <select value={sesDay} onChange={(e) => setSesDay(Number(e.target.value))} className="w-full px-2.5 py-2 rounded-lg text-[13px]" style={inputStyle}>
                      {['Mon Nov 16', 'Tue Nov 17', 'Wed Nov 18', 'Thu Nov 19', 'Fri Nov 20', 'Sat Nov 21', 'Sun Nov 22 (Today)'].map((lbl, idx) => (
                        <option key={lbl} value={idx}>{lbl}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[12px] font-medium text-[var(--text-secondary)] mb-1">
                      Start Hour
                    </label>
                    <select value={sesHour} onChange={(e) => setSesHour(Number(e.target.value))} className="w-full px-2.5 py-2 rounded-lg text-[13px]" style={inputStyle}>
                      {[8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20].map((h) => (
                        <option key={h} value={h}>{h > 12 ? `${h - 12}:00 PM` : h === 12 ? '12:00 PM' : `${h}:00 AM`}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[12px] font-medium text-[var(--text-secondary)] mb-1">
                      Duration (hours)
                    </label>
                    <select value={sesDuration} onChange={(e) => setSesDuration(Number(e.target.value))} className="w-full px-2.5 py-2 rounded-lg text-[13px]" style={inputStyle}>
                      {[0.5, 1, 1.5, 2, 2.5, 3].map((d) => (
                        <option key={d} value={d}>{d}h</option>
                      ))}
                    </select>
                  </div>
                </div>
                <label className="flex items-center gap-2 text-[12.5px] text-[var(--text-secondary)] cursor-pointer">
                  <input type="checkbox" checked={countsTowardStudy} onChange={e => setCountsTowardStudy(e.target.checked)} /> Counts toward study time
                </label><label className="flex items-center gap-2 text-xs">
                  <input type="checkbox" checked={sesRecurring} onChange={(e) => setSesRecurring(e.target.checked)} />
                  Repeat weekly on this slot
                </label>
                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={closeModal} className="px-3.5 py-1.5 rounded-lg text-[13px] text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)]">
                    Cancel
                  </button>
                  <button type="submit" className="px-4 py-1.5 rounded-lg text-[13px] font-medium" style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' }}>
                    Schedule Session
                  </button>
                </div>
              </form>
            )}

            {activeModal === 'create_goal' && (
              <form onSubmit={handleGoalSubmit} className="p-5 space-y-3.5">
                <div>
                  <label className="block text-[12px] font-medium text-[var(--text-secondary)] mb-1">
                    Goal Title
                  </label>
                  <input
                    type="text"
                    value={goalTitle}
                    onChange={(e) => setGoalTitle(e.target.value)}
                    placeholder="e.g., Complete 20 Organic Chemistry synthesis problems"
                    className="w-full px-3 py-2 rounded-lg text-[13px]"
                    style={inputStyle}
                    autoFocus
                  />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[12px] font-medium text-[var(--text-secondary)] mb-1">
                      Category
                    </label>
                    <select value={goalCategory} onChange={(e) => setGoalCategory(e.target.value as GoalItem['category'])} className="w-full px-2 py-2 rounded-lg text-[13px]" style={inputStyle}>
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="subject">Subject</option>
                      <option value="syllabus">Syllabus</option>
                      <option value="revision">Revision</option>
                      <option value="tasks">Tasks</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[12px] font-medium text-[var(--text-secondary)] mb-1">
                      Target
                    </label>
                    <input type="number" min={1} value={goalTarget} onChange={(e) => setGoalTarget(Number(e.target.value))} className="w-full px-2.5 py-2 rounded-lg text-[13px] font-mono-num" style={inputStyle} />
                  </div>
                  <div>
                    <label className="block text-[12px] font-medium text-[var(--text-secondary)] mb-1">
                      Unit
                    </label>
                    <input type="text" value={goalUnit} onChange={(e) => setGoalUnit(e.target.value)} className="w-full px-2.5 py-2 rounded-lg text-[13px]" style={inputStyle} />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={closeModal} className="px-3.5 py-1.5 rounded-lg text-[13px] text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)]">
                    Cancel
                  </button>
                  <button type="submit" className="px-4 py-1.5 rounded-lg text-[13px] font-medium" style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' }}>
                    Save Goal
                  </button>
                </div>
              </form>
            )}

            {activeModal === 'create_flashcard' && (
              <form onSubmit={handleFlashcardSubmit} className="p-5 space-y-3.5">
                <div>
                  <label className="block text-[12px] font-medium text-[var(--text-secondary)] mb-1">
                    Deck
                  </label>
                  <select value={fcDeck} onChange={(e) => setFcDeck(e.target.value)} className="w-full px-2.5 py-2 rounded-lg text-[13px]" style={inputStyle}>
                    {decks.map((d) => (
                      <option key={d.id} value={d.id}>{d.title}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-[var(--text-secondary)] mb-1">
                    Front (Prompt / Concept)
                  </label>
                  <textarea rows={2} value={fcFront} onChange={(e) => setFcFront(e.target.value)} placeholder="State the key question or formula..." className="w-full px-3 py-2 rounded-lg text-[13px] resize-none" style={inputStyle} autoFocus />
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-[var(--text-secondary)] mb-1">
                    Back (Answer / Proof Sketch)
                  </label>
                  <textarea rows={3} value={fcBack} onChange={(e) => setFcBack(e.target.value)} placeholder="Concise recall answer..." className="w-full px-3 py-2 rounded-lg text-[13px] resize-none" style={inputStyle} />
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-[var(--text-secondary)] mb-1">
                    Hint (Optional)
                  </label>
                  <input type="text" value={fcHint} onChange={(e) => setFcHint(e.target.value)} placeholder="Memory cue" className="w-full px-3 py-2 rounded-lg text-[13px]" style={inputStyle} />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={closeModal} className="px-3.5 py-1.5 rounded-lg text-[13px] text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)]">
                    Cancel
                  </button>
                  <button type="submit" className="px-4 py-1.5 rounded-lg text-[13px] font-medium" style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' }}>
                    Add Card
                  </button>
                </div>
              </form>
            )}

            {activeModal === 'create_exam' && (
              <form onSubmit={handleExamSubmit} className="p-5 space-y-3.5">
                <div>
                  <label className="block text-[12px] font-medium text-[var(--text-secondary)] mb-1">
                    Exam Title
                  </label>
                  <input type="text" value={exTitle} onChange={(e) => setExTitle(e.target.value)} placeholder="e.g., Econometrics Comprehensive Final" className="w-full px-3 py-2 rounded-lg text-[13px]" style={inputStyle} autoFocus />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[12px] font-medium text-[var(--text-secondary)] mb-1">
                      Subject
                    </label>
                    <select value={exSubject} onChange={(e) => setExSubject(e.target.value)} className="w-full px-2.5 py-2 rounded-lg text-[13px]" style={inputStyle}>
                      <option value="">No subject</option>
                      {subjects.map((s) => (
                        <option key={s.id} value={s.id}>{s.code} · {s.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[12px] font-medium text-[var(--text-secondary)] mb-1">
                      Exam Date
                    </label>
                    <input required type="date" value={exDate} onChange={(e) => setExDate(e.target.value)} className="w-full px-2.5 py-2 rounded-lg text-[13px]" style={inputStyle} />
                  </div>
                </div>
                <label>Start time (optional) <input type="time" value={exTime} onChange={e=>setExTime(e.target.value)}/></label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[12px] font-medium text-[var(--text-secondary)] mb-1">
                      Room / Hall
                    </label>
                    <input type="text" value={exRoom} onChange={(e) => setExRoom(e.target.value)} className="w-full px-3 py-2 rounded-lg text-[13px]" style={inputStyle} />
                  </div>
                  <div>
                    <label className="block text-[12px] font-medium text-[var(--text-secondary)] mb-1">
                      Target Grade
                    </label>
                    <input type="text" value={exTarget} onChange={(e) => setExTarget(e.target.value)} className="w-full px-3 py-2 rounded-lg text-[13px]" style={inputStyle} />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={closeModal} className="px-3.5 py-1.5 rounded-lg text-[13px] text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)]">
                    Cancel
                  </button>
                  <button type="submit" className="px-4 py-1.5 rounded-lg text-[13px] font-medium" style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' }}>
                    Add Exam
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Focus Session Completion Summary Modal */}
      {focusTimer.completionModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Focus Session Summary"
        >
          <div className="fixed inset-0 bg-black/50 backdrop-blur-[2px]" onClick={dismissFocusCompletion} />
          <div
            className="relative w-full max-w-sm rounded-2xl p-6 text-center space-y-4"
            style={{
              backgroundColor: 'var(--bg-elevated)',
              border: '1px solid var(--border-subtle)',
              boxShadow: 'var(--shadow-floating)',
            }}
          >
            <div
              className="w-11 h-11 rounded-full mx-auto flex items-center justify-center"
              style={{ backgroundColor: 'var(--accent-soft)', color: 'var(--accent)' }}
            >
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display text-[17px] font-semibold text-[var(--text-primary)]">
                Session Complete
              </h2>
              <p className="text-[13px] text-[var(--text-secondary)] mt-1">
                {focusTimer.lastCompletedMinutes} minutes logged on{' '}
                <span className="font-medium text-[var(--text-primary)]">{focusTimer.taskTitle}</span>
              </p>
            </div>

            <div className="py-2">
              <div className="text-[12px] text-[var(--text-muted)] mb-2">
                Rate your focus quality
              </div>
              <div className="flex items-center justify-center gap-1.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setFocusRating(star)}
                    aria-label={`Rate focus ${star} out of 5`}
                    className="p-1.5 rounded-lg hover:bg-[var(--bg-surface-hover)] transition-colors"
                  >
                    <Star
                      className="w-5 h-5"
                      fill={star <= focusRating ? '#F59E0B' : 'none'}
                      stroke={star <= focusRating ? '#F59E0B' : 'var(--text-muted)'}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={dismissFocusCompletion}
                className="flex-1 py-2 rounded-lg text-[13px] text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)]"
                style={{ border: '1px solid var(--border-subtle)' }}
              >
                Discard
              </button>
              <button
                type="button"
                onClick={() => submitFocusCompletion(focusRating)}
                className="flex-1 py-2 rounded-lg text-[13px] font-medium"
                style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' }}
              >
                Save & Start Break
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Subtle Toast Stack */}
      {toasts.length > 0 && (
        <div
          className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-1.5 pointer-events-none"
          aria-live="polite"
        >
          {toasts.map((t) => (
            <div
              key={t.id}
              className="px-3.5 py-2 rounded-xl text-[12.5px] font-medium flex items-center gap-2"
              style={{
                backgroundColor: 'var(--bg-elevated)',
                border: '1px solid var(--border-strong)',
                color: 'var(--text-primary)',
                boxShadow: 'var(--shadow-floating)',
              }}
            >
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--accent)' }} />
              <span>{t.text}</span>
            </div>
          ))}
        </div>
      )}
    </>
  );
};
