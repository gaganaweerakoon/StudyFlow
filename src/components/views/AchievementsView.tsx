import React, { useState } from 'react';
import {
  Flame,
  Trophy,
  Award,
  Lock,
  CheckCircle2,
  Sparkles,
  BookOpen,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { COMPANION_DESK_URL } from '../../data/mockData';

export const AchievementsView: React.FC = () => {
  const { achievements, challenges, claimChallenge, xpPoints, legacyCalendar } = useApp();
  const [badgeFilter, setBadgeFilter] = useState<'all' | 'unlocked' | 'locked'>('all');
  const [celebratingId, setCelebratingId] = useState<string | null>(null);
  const [companionImgFailed, setCompanionImgFailed] = useState(false);

  const level = Math.floor(xpPoints / 500) + 1;
  const levelProgress = Math.round(((xpPoints % 500) / 500) * 100);
  const xpToNext = 500 - (xpPoints % 500);

  const recentBadges = achievements.filter(badge => badge.unlocked && badge.unlockedDate)
    .sort((a, b) => (b.unlockedDate ?? '').localeCompare(a.unlockedDate ?? '')).slice(0, 3);

  const visibleBadges = achievements.filter((a) => {
    if (badgeFilter === 'unlocked') return a.unlocked;
    if (badgeFilter === 'locked') return !a.unlocked;
    return true;
  });

  const handleClaim = (id: string) => {
    claimChallenge(id);
    setCelebratingId(id);
    window.setTimeout(() => setCelebratingId(null), 1200);
  };

  const surfaceStyle: React.CSSProperties = {
    backgroundColor: 'var(--bg-surface)',
    border: '1px solid var(--border-subtle)',
  };

  return (
    <div className="space-y-4 pb-8">
      <div>
        <h1 className="font-display text-[19px] font-semibold text-[var(--text-primary)]">
          Achievements & Motivation
        </h1>
        <p className="text-[12.5px] text-[var(--text-muted)]">
          Consistent study milestones, weekly challenges, and personal records
        </p>
      </div>

      {/* Top Progression Banner: Level + Streak + Personal Records */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-8 rounded-xl p-5 flex flex-col justify-between gap-4" style={surfaceStyle}>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center font-display text-[18px] font-bold"
                style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' }}
              >
                L{level}
              </div>
              <div>
                <div className="text-[12px] text-[var(--text-muted)]">Scholar Rank</div>
                <h2 className="font-display text-[18px] font-semibold text-[var(--text-primary)]">
                  Focused Fellow · Level {level}
                </h2>
              </div>
            </div>

            <div className="flex items-center gap-5">
              <div className="text-right">
                <div className="text-[11px] text-[var(--text-muted)]">Active Streak</div>
                <div className="font-mono-num text-[17px] font-semibold text-[var(--text-primary)] inline-flex items-center gap-1">
                  <Flame className="w-4 h-4 text-amber-500" /> {legacyCalendar ? "—" : "16 days"}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[11px] text-[var(--text-muted)]">Total XP</div>
                <div className="font-mono-num text-[17px] font-semibold text-[var(--text-primary)]">
                  {xpPoints.toLocaleString()}
                </div>
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between text-[12px] mb-1.5">
              <span className="text-[var(--text-secondary)]">Progress to Level {level + 1}</span>
              <span className="font-mono-num text-[var(--text-muted)]">{xpToNext} XP remaining</span>
            </div>
            <div className="h-2 w-full rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-surface-hover)' }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${levelProgress}%`, backgroundColor: 'var(--accent)' }}
              />
            </div>
          </div>

          {/* Personal Records */}
          {!legacyCalendar && <div
            className="pt-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-[12px]"
            style={{ borderTop: '1px solid var(--border-subtle)' }}
          >
            {[
              { label: 'Longest Streak', value: '21 days' },
              { label: 'Best Day Logged', value: '6.8 hrs' },
              { label: 'Top Focus Block', value: '90 min' },
              { label: 'Peak Recall Rate', value: '95%' },
            ].map((rec) => (
              <div key={rec.label}>
                <div className="text-[var(--text-muted)] text-[11px]">{rec.label}</div>
                <div className="font-mono-num font-semibold text-[14px] text-[var(--text-primary)] mt-0.5">
                  {rec.value}
                </div>
              </div>
            ))}
          </div>}
        </div>

        {/* Virtual Study Companion Desk Preview */}
        <div className="lg:col-span-4 rounded-xl overflow-hidden flex flex-col" style={surfaceStyle}>
          <div className="relative h-40 w-full overflow-hidden" style={{ backgroundColor: 'var(--bg-surface-subtle)' }}>
            {!companionImgFailed ? (
              <img
                src={COMPANION_DESK_URL}
                alt="StudyFlow minimalist desk companion environment"
                referrerPolicy="no-referrer"
                onError={() => setCompanionImgFailed(true)}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[var(--text-muted)]">
                <BookOpen className="w-8 h-8" />
              </div>
            )}
          </div>
          <div className="p-4 flex-1 flex flex-col justify-between">
            <div>
              <div className="text-[11.5px] text-[var(--text-muted)]">Study Sanctuary Preview</div>
              <div className="font-display text-[14.5px] font-semibold text-[var(--text-primary)] mt-0.5">
                Oak Studio & Ceramic Owl
              </div>
              <p className="text-[12px] text-[var(--text-secondary)] mt-1">
                Quiet desk environment evolves subtly as you complete weekly milestones.
              </p>
            </div>
            <div className="mt-2.5 text-[11.5px] font-mono-num" style={{ color: 'var(--accent)' }}>
              Next unlock at Level {level + 1}: Dusk Window Light
            </div>
          </div>
        </div>
      </div>

      {/* Weekly Challenges & Monthly Milestones */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-7 rounded-xl p-4 space-y-3" style={surfaceStyle}>
          <h2 className="font-display text-[14.5px] font-semibold text-[var(--text-primary)]">
            Weekly Challenges
          </h2>
          <div className="space-y-2.5">
            {challenges.map((ch) => {
              const pct = Math.min(100, Math.round((ch.current / ch.target) * 100));
              const ready = ch.current >= ch.target && !ch.claimed;
              const celebrating = celebratingId === ch.id;

              return (
                <div
                  key={ch.id}
                  className="p-3 rounded-lg transition-all"
                  style={{
                    backgroundColor: celebrating ? 'var(--accent-soft)' : 'var(--bg-surface-subtle)',
                    border: celebrating ? '1px solid var(--accent)' : '1px solid var(--border-subtle)',
                  }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-[13px] font-medium text-[var(--text-primary)]">{ch.title}</div>
                      <div className="text-[11.5px] font-mono-num text-[var(--text-muted)] mt-0.5">
                        {ch.current} / {ch.target} {ch.unit} · +{ch.xp} XP
                      </div>
                    </div>

                    {ready ? (
                      <button
                        type="button"
                        onClick={() => handleClaim(ch.id)}
                        className="px-3 py-1.5 rounded-lg text-[12px] font-medium inline-flex items-center gap-1 shrink-0"
                        style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' }}
                      >
                        <Sparkles className="w-3.5 h-3.5" /> Claim XP
                      </button>
                    ) : ch.claimed ? (
                      <span className="inline-flex items-center gap-1 text-[12px] font-medium text-emerald-600 dark:text-emerald-400 shrink-0">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Claimed
                      </span>
                    ) : (
                      <span className="font-mono-num text-[12px] text-[var(--text-secondary)] shrink-0">
                        {pct}%
                      </span>
                    )}
                  </div>

                  <div className="mt-2 h-1.5 w-full rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-surface-hover)' }}>
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: 'var(--accent)' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="lg:col-span-5 rounded-xl p-4 space-y-3" style={surfaceStyle}>
          <h2 className="font-display text-[14.5px] font-semibold text-[var(--text-primary)]">
            November Milestones
          </h2>
          <div className="divide-y divide-[var(--border-subtle)] text-[12.5px]">
            {[
              { title: '100+ Focused Hours Logged', progress: '117.6 / 100h', done: true },
              { title: 'Complete 4 Timed Practice Exams', progress: '3 / 4 exams', done: false },
              { title: 'Zero Missed High-Priority Deadlines', progress: '14 / 14 on time', done: true },
              { title: '85%+ Spaced Repetition Retention', progress: '89% average', done: true },
            ].map((m) => (
              <div key={m.title} className="py-2.5 flex items-center justify-between gap-3">
                <span className="flex items-center gap-2 text-[var(--text-primary)]">
                  <CheckCircle2
                    className={`w-4 h-4 shrink-0 ${m.done ? 'text-emerald-500' : 'text-[var(--text-muted)] opacity-40'}`}
                  />
                  {m.title}
                </span>
                <span className="font-mono-num text-[11.5px] text-[var(--text-muted)] shrink-0">
                  {m.progress}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {legacyCalendar && <section className="rounded-xl p-4" style={surfaceStyle}>
        <h2 className="font-semibold">Recent unlocks</h2>
        {recentBadges.length ? <ul className="mt-2 space-y-1 text-sm">
          {recentBadges.map(badge => <li key={badge.id}>{badge.title} · {badge.unlockedDate}</li>)}
        </ul> : <p className="mt-2 text-[12px] text-[var(--text-muted)]">Complete a task, focus session, review, or goal to start earning XP.</p>}
      </section>}
      {/* Achievement Badges Library */}
      <div className="rounded-xl p-4 space-y-3.5" style={surfaceStyle}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4" style={{ color: 'var(--accent)' }} />
            <h2 className="font-display text-[14.5px] font-semibold text-[var(--text-primary)]">
              Achievement Badges
            </h2>
          </div>

          <div
            className="inline-flex items-center p-0.5 rounded-lg text-[12px]"
            style={{ backgroundColor: 'var(--bg-surface-subtle)', border: '1px solid var(--border-subtle)' }}
          >
            {(['all', 'unlocked', 'locked'] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setBadgeFilter(f)}
                className="px-2.5 py-1 rounded-md capitalize font-medium"
                style={{
                  backgroundColor: badgeFilter === f ? 'var(--bg-surface)' : 'transparent',
                  color: badgeFilter === f ? 'var(--text-primary)' : 'var(--text-muted)',
                }}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {visibleBadges.length === 0 && <p className="text-[12px] text-[var(--text-muted)]">No badges in this view yet.</p>}
          {visibleBadges.map((b) => {
            const pct = Math.min(100, Math.round((b.progress / b.target) * 100));
            return (
              <div
                key={b.id}
                className="rounded-xl p-3.5 space-y-2.5 transition-opacity"
                style={{
                  backgroundColor: 'var(--bg-surface-subtle)',
                  border: b.unlocked ? '1px solid var(--accent-border)' : '1px solid var(--border-subtle)',
                  opacity: b.unlocked ? 1 : 0.78,
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                      style={{
                        backgroundColor: b.unlocked ? 'var(--accent-soft)' : 'var(--bg-surface-hover)',
                        color: b.unlocked ? 'var(--accent)' : 'var(--text-muted)',
                      }}
                    >
                      {b.unlocked ? <Award className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                    </div>
                    <div>
                      <div className="text-[13px] font-semibold text-[var(--text-primary)]">{b.title}</div>
                      <div className="text-[11px] text-[var(--text-muted)]">
                        {b.category} · +{b.xpReward} XP
                      </div>
                    </div>
                  </div>
                </div>
                <p className="text-[12px] text-[var(--text-secondary)]">{b.description}</p>
                <div className="flex items-center justify-between text-[11px] font-mono-num text-[var(--text-muted)]">
                  <span>{b.unlocked ? `Unlocked ${b.unlockedDate}` : `${b.progress}/${b.target}`}</span>
                  <span>{pct}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
