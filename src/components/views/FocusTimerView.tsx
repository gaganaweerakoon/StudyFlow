import { focusScenes, focusTracks } from '../../utils/focusScenes';
import React, { useState } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Maximize2,
  Minimize2,
  PictureInPicture2,
  CheckCircle2,
  Star,
  Coffee,
  Volume2,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatTimerSeconds } from '../../utils/studyLogic';

const MODES = ['Pomodoro', 'Countdown', 'Stopwatch', 'Custom'] as const;

export const FocusTimerView: React.FC = () => {
  const {
    focusTimer, xpPoints,
    setFocusMode,
    toggleFocusRunning,
    resetFocusTimer,
    setFocusContext,
    setMiniTimerVisible,
    triggerCompleteFocusSession,
    focusHistory,
    subjects,
    tasks,
    preferences,
    updatePreferences,
    setRoute,
    pushToast,
  } = useApp();

  const [customMin, setCustomMin] = useState(35);
  const [fullScreenMode, setFullScreenMode] = useState(false);

  const level=Math.floor(xpPoints/500)+1;
  const scene = focusScenes.find(option => option.id === preferences.focusScene && level >= option.level) ?? focusScenes[0];
  const background = scene.image ? { backgroundImage: scene.image, backgroundSize: 'cover', backgroundPosition: 'center', color: 'white' } : {};
  const audio=React.useRef<HTMLAudioElement>(null);
  const track = focusTracks.find(option => option.id === preferences.focusTrack && level >= option.level)?.id ?? '';
  React.useEffect(()=>{
    if(!audio.current)return;
    audio.current.volume=preferences.musicVolume ?? 0.35;
    audio.current.muted=Boolean(preferences.musicMuted);
    if(focusTimer.running && track) void audio.current.play().catch(()=>{});
    else audio.current.pause();
  },[focusTimer.running,track,preferences.musicVolume,preferences.musicMuted,fullScreenMode]);
  const music=<audio ref={audio} loop src={track ? '/focus/'+track+'.ogg':undefined}/>;
  const activeSubject = subjects.find((s) => s.id === focusTimer.subjectId);
  const displayTime =
    focusTimer.mode === 'Stopwatch'
      ? formatTimerSeconds(focusTimer.elapsedSeconds)
      : formatTimerSeconds(focusTimer.secondsLeft);

  const progressRatio =
    focusTimer.mode === 'Stopwatch'
      ? Math.min(1, focusTimer.elapsedSeconds / 3600)
      : Math.min(1, Math.max(0, (focusTimer.totalSeconds - focusTimer.secondsLeft) / focusTimer.totalSeconds));

  const radius = 114;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - progressRatio);

  const surfaceStyle: React.CSSProperties = {
    backgroundColor: 'var(--bg-surface)',
    border: '1px solid var(--border-subtle)',
  };

  const timerContent = (
    <div className="flex flex-col items-center justify-center py-6 px-4">
      {/* Mode selector */}
      <div
        className="inline-flex items-center p-1 rounded-xl text-[12.5px] mb-6"
        style={{ backgroundColor: 'var(--bg-surface-subtle)', border: '1px solid var(--border-subtle)' }}
        role="tablist"
        aria-label="Focus timer modes"
      >
        {MODES.map((m) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={focusTimer.mode === m}
            onClick={() => setFocusMode(m, m === 'Custom' ? customMin : undefined)}
            className="px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap"
            style={{
              backgroundColor: focusTimer.mode === m ? 'var(--bg-surface)' : 'transparent',
              color: focusTimer.mode === m ? 'var(--text-primary)' : 'var(--text-muted)',
              boxShadow: focusTimer.mode === m ? 'var(--shadow-subtle)' : 'none',
            }}
          >
            {m}
          </button>
        ))}
      </div>

      {/* Custom minutes control */}
      {focusTimer.mode === 'Custom' && (
        <div className="flex items-center gap-2 mb-5 text-[12.5px]">
          <label htmlFor="custom-focus-min" className="text-[var(--text-secondary)]">
            Duration (min):
          </label>
          <input
            id="custom-focus-min"
            type="number"
            min={5}
            max={180}
            value={customMin}
            onChange={(e) => {
              const v = Math.max(5, Math.min(180, Number(e.target.value)));
              setCustomMin(v);
              setFocusMode('Custom', v);
            }}
            className="w-18 px-2.5 py-1 rounded-lg font-mono-num text-center"
            style={{
              backgroundColor: 'var(--bg-surface-subtle)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-primary)',
            }}
          />
        </div>
      )}

      {/* Central Circular Progress Timer */}
      <div className="relative w-64 h-64 flex items-center justify-center">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 256 256" aria-hidden="true">
          <circle
            cx="128"
            cy="128"
            r={radius}
            fill="none"
            stroke="var(--bg-surface-hover)"
            strokeWidth="7"
          />
          <circle
            cx="128"
            cy="128"
            r={radius}
            fill="none"
            stroke={focusTimer.phase === 'break' ? '#10B981' : activeSubject?.color ?? 'var(--accent)'}
            strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            className="transition-all duration-500"
          />
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
          <div className="text-[11.5px] font-medium text-[var(--text-muted)] flex items-center gap-1.5">
            {focusTimer.phase === 'break' ? (
              <>
                <Coffee className="w-3.5 h-3.5 text-emerald-500" /> Short Break
              </>
            ) : (
              <>
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: activeSubject?.color ?? 'var(--accent)' }}
                />
                {activeSubject?.code ?? 'Focus'} · Cycle {focusTimer.cycleCount}/4
              </>
            )}
          </div>
          <div
            data-testid="focus-timer-readout"
            className="font-mono-num text-[48px] font-semibold tracking-tight text-[var(--text-primary)] leading-none my-2"
          >
            {displayTime}
          </div>
          <div className="text-[12px] text-[var(--text-secondary)] truncate max-w-[190px]">
            {focusTimer.taskTitle}
          </div>
        </div>
      </div>

      {/* Primary Controls */}
      <div className="mt-7 flex items-center gap-3">
        <button
          type="button"
          onClick={resetFocusTimer}
          aria-label="Reset focus timer"
          className="h-10 w-10 rounded-xl flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] transition-colors"
          style={{ border: '1px solid var(--border-subtle)' }}
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={toggleFocusRunning}
          className="h-11 px-7 rounded-xl inline-flex items-center gap-2 text-[14px] font-semibold transition-opacity hover:opacity-90"
          style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' }}
        >
          {focusTimer.running ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          {focusTimer.running ? 'Pause' : focusTimer.elapsedSeconds > 0 ? 'Resume' : 'Start Focus'}
        </button>

        <button
          type="button"
          onClick={triggerCompleteFocusSession}
          aria-label="Complete session and rate focus"
          title="Finish & rate session"
          className="h-10 px-3 rounded-xl inline-flex items-center gap-1.5 text-[12.5px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] transition-colors"
          style={{ border: '1px solid var(--border-subtle)' }}
        >
          <CheckCircle2 className="w-4 h-4" /> Complete
        </button>
      </div>

      {/* Session Progress Indicators */}
      <div className="mt-6 flex items-center gap-2">
        {[1, 2, 3, 4].map((cycle) => (
          <div
            key={cycle}
            className="w-8 h-1.5 rounded-full transition-colors"
            style={{
              backgroundColor:
                cycle <= focusTimer.cycleCount ? 'var(--accent)' : 'var(--bg-surface-hover)',
            }}
          />
        ))}
        <span className="text-[11.5px] text-[var(--text-muted)] ml-1.5 font-mono-num">
          {focusTimer.cycleCount}/4 before 15m break
        </span>
      </div>
    </div>
  );

  if (fullScreenMode) {
    return (
      <div
        className="fixed inset-0 z-50 flex flex-col items-center justify-center p-6"
        style={{ backgroundColor: 'var(--bg-canvas)', ...background }}
      >
        <div className="absolute top-5 right-5 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setFullScreenMode(false)}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[12.5px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}
          >
            <Minimize2 className="w-3.5 h-3.5" /> Exit Distraction-Free
          </button>
        </div>
        {music}{timerContent}
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-[19px] font-semibold text-[var(--text-primary)]">
            Focus Timer
          </h1>
          <p className="text-[12.5px] text-[var(--text-muted)]">
            Deep work cycles with break pacing, focus ratings, and floating mini-timer
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setMiniTimerVisible(true);
              setRoute('dashboard');
              pushToast('Floating mini-timer docked');
            }}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[12.5px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)]"
            style={surfaceStyle}
          >
            <PictureInPicture2 className="w-3.5 h-3.5" /> Mini-Timer
          </button>
          <button
            type="button"
            onClick={() => setFullScreenMode(true)}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[12.5px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)]"
            style={surfaceStyle}
          >
            <Maximize2 className="w-3.5 h-3.5" /> Full-Screen
          </button>
        </div>
      </div>

      <details className="rounded-lg border border-[var(--border-subtle)] p-3 text-sm"><summary>Focus background and music</summary>
        <div className="mt-2 flex flex-wrap gap-3">
        <label>Background <select value={scene.id} onChange={e => updatePreferences({ focusScene: e.target.value })}>
          {focusScenes.map(option => <option key={option.id} value={option.id} disabled={level < option.level}>
            {option.label}{level < option.level ? ` · Level ${option.level}` : ''}
          </option>)}
        </select></label>
        <label>Music <select value={track} onChange={e => updatePreferences({ focusTrack: e.target.value })}>
          {focusTracks.map(option => <option key={option.id} value={option.id} disabled={level < option.level}>
            {option.label}{level < option.level ? ` · Level ${option.level}` : ''}
          </option>)}
        </select></label>
        <label>Volume <input type="range" min="0" max="1" step=".05" value={preferences.musicVolume ?? .35} onChange={e=>updatePreferences({musicVolume:Number(e.target.value)})}/></label>
        <label><input type="checkbox" checked={!!preferences.musicMuted} onChange={e=>updatePreferences({musicMuted:e.target.checked})}/> Mute</label></div></details>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Main Centered Timer Surface */}
        <div className="lg:col-span-8 rounded-xl" style={{...surfaceStyle,...background}}>
          {music}{timerContent}
        </div>

        {/* Right Side: Context Selector & Session History */}
        <div className="lg:col-span-4 space-y-4">
          <div className="rounded-xl p-4 space-y-3" style={surfaceStyle}>
            <h2 className="font-display text-[14px] font-semibold text-[var(--text-primary)]">
              Session Context
            </h2>
            <div>
              <label htmlFor="focus-subject" className="block text-[11.5px] text-[var(--text-muted)] mb-1">
                Subject
              </label>
              <select
                id="focus-subject"
                value={focusTimer.subjectId}
                onChange={(e) => setFocusContext(e.target.value, focusTimer.taskTitle)}
                className="w-full px-2.5 py-2 rounded-lg text-[13px]"
                style={{
                  backgroundColor: 'var(--bg-surface-subtle)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-primary)',
                }}
              >
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.code} · {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="focus-task" className="block text-[11.5px] text-[var(--text-muted)] mb-1">
                Linked Task
              </label>
              <select
                id="focus-task"
                value={focusTimer.taskTitle}
                onChange={(e) => setFocusContext(focusTimer.subjectId, e.target.value)}
                className="w-full px-2.5 py-2 rounded-lg text-[13px]"
                style={{
                  backgroundColor: 'var(--bg-surface-subtle)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-primary)',
                }}
              >
                {tasks.map((t) => (
                  <option key={t.id} value={t.title}>
                    {t.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="focus-ambient" className="flex items-center gap-1.5 text-[11.5px] text-[var(--text-muted)] mb-1">
                <Volume2 className="w-3.5 h-3.5" /> Ambient Audio Preset
              </label>
              <select
                id="focus-ambient"
                value={preferences.ambientSound}
                onChange={(e) =>
                  updatePreferences({
                    ambientSound: e.target.value as typeof preferences.ambientSound,
                  })
                }
                className="w-full px-2.5 py-2 rounded-lg text-[13px]"
                style={{
                  backgroundColor: 'var(--bg-surface-subtle)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-primary)',
                }}
              >
                <option value="None">Silent</option>
                <option value="Soft Rain">Soft Rain</option>
                <option value="Library Hum">Quiet Library</option>
                <option value="Brown Noise">Brown Noise</option>
              </select>
            </div>
          </div>

          {/* Previous Session History */}
          <div className="rounded-xl p-4" style={surfaceStyle}>
            <div className="flex items-center justify-between mb-2.5">
              <h2 className="font-display text-[14px] font-semibold text-[var(--text-primary)]">
                Recent Sessions
              </h2>
              <span className="text-[11.5px] font-mono-num text-[var(--text-muted)]">
                {focusHistory.length} logged
              </span>
            </div>
            <div className="divide-y divide-[var(--border-subtle)] max-h-64 overflow-y-auto">
              {focusHistory.map((item) => {
                const sub = subjects.find((s) => s.id === item.subjectId);
                return (
                  <div key={item.id} className="py-2.5 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-[12.5px] font-medium text-[var(--text-primary)] truncate">
                        {item.taskTitle}
                      </div>
                      <div className="text-[11px] text-[var(--text-muted)]">
                        {sub?.code} · {item.durationMinutes}m {item.mode} · {item.completedAt}
                      </div>
                    </div>
                    <div className="flex items-center gap-0.5 shrink-0" aria-label={`Rated ${item.qualityRating} of 5`}>
                      <Star className="w-3.5 h-3.5 text-amber-500" fill="#F59E0B" />
                      <span className="font-mono-num text-[11.5px] font-medium text-[var(--text-secondary)]">
                        {item.qualityRating}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
