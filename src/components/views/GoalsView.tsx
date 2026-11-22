import React, { useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { Plus, CheckCircle2, Circle, TrendingUp } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { ANALYTICS_GOAL_COMPARISON } from '../../data/mockData';

export const GoalsView: React.FC = () => {
  const { goals, updateGoal, setActiveModal, subjects, pushToast } = useApp();
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const filteredGoals =
    categoryFilter === 'all' ? goals : goals.filter((g) => g.category === categoryFilter);

  const surfaceStyle: React.CSSProperties = {
    backgroundColor: 'var(--bg-surface)',
    border: '1px solid var(--border-subtle)',
  };

  const handleLogProgress = (goalId: string, current: number, target: number, unit: string) => {
    const step = unit === 'hrs' ? 0.5 : unit === 'cards' ? 10 : 1;
    const next = Math.min(target, Number((current + step).toFixed(1)));
    updateGoal(goalId, { current: next });
    pushToast(`Logged +${step} ${unit} toward goal`);
  };

  const achievedHistory = [
    { id: 'ah-1', title: 'Complete Midterm II Vector Calculus Prep', date: 'Nov 14, 2026', metric: '100% · 14/14 topics' },
    { id: 'ah-2', title: 'Hit 30 Focused Hours in Week 10', date: 'Nov 08, 2026', metric: '31.2 / 30.0 hrs' },
    { id: 'ah-3', title: 'Master Aromaticity Flashcard Deck', date: 'Nov 03, 2026', metric: '94% retention' },
  ];

  return (
    <div className="space-y-4 pb-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-[19px] font-semibold text-[var(--text-primary)]">
            Goals & Targets
          </h1>
          <p className="text-[12.5px] text-[var(--text-muted)]">
            Daily study pacing, syllabus completion targets, and milestone tracking
          </p>
        </div>

        <button
          type="button"
          onClick={() => setActiveModal('create_goal')}
          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[12.5px] font-medium"
          style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' }}
        >
          <Plus className="w-3.5 h-3.5" /> New Goal
        </button>
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap items-center gap-1.5">
        {['all', 'daily', 'weekly', 'syllabus', 'revision', 'tasks'].map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setCategoryFilter(cat)}
            className="px-2.5 py-1 rounded-lg text-[12px] font-medium capitalize transition-colors"
            style={{
              backgroundColor: categoryFilter === cat ? 'var(--accent-soft)' : 'var(--bg-surface)',
              color: categoryFilter === cat ? 'var(--accent)' : 'var(--text-secondary)',
              border: categoryFilter === cat ? '1px solid var(--accent-border)' : '1px solid var(--border-subtle)',
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Active Goals Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filteredGoals.map((goal) => {
          const pct = Math.min(100, Math.round((goal.current / goal.target) * 100));
          const sub = goal.subjectId ? subjects.find((s) => s.id === goal.subjectId) : null;

          return (
            <div key={goal.id} className="rounded-xl p-4 space-y-3" style={surfaceStyle}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[11.5px] text-[var(--text-muted)] capitalize">
                    {goal.category} goal {sub ? `· ${sub.code}` : ''} · Due {goal.deadline}
                  </div>
                  <h2 className="font-display text-[15px] font-semibold text-[var(--text-primary)] mt-0.5">
                    {goal.title}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => handleLogProgress(goal.id, goal.current, goal.target, goal.unit)}
                  disabled={goal.current >= goal.target}
                  className="px-2.5 py-1 rounded-lg text-[11.5px] font-medium shrink-0 transition-colors disabled:opacity-40 hover:bg-[var(--bg-surface-hover)]"
                  style={{ border: '1px solid var(--border-subtle)', color: 'var(--accent)' }}
                >
                  + Log
                </button>
              </div>

              <div>
                <div className="flex items-baseline justify-between text-[12.5px] mb-1.5">
                  <span className="font-mono-num font-semibold text-[var(--text-primary)]">
                    {goal.current} / {goal.target} {goal.unit}
                  </span>
                  <span className="font-mono-num text-[12px] text-[var(--text-secondary)]">
                    {pct}%
                  </span>
                </div>
                <div className="h-2 w-full rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-surface-hover)' }}>
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{ width: `${pct}%`, backgroundColor: sub?.color ?? 'var(--accent)' }}
                  />
                </div>
              </div>

              {/* Milestone Timeline */}
              {goal.milestones.length > 0 && (
                <div className="pt-2 space-y-1.5" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                  {goal.milestones.map((ms) => (
                    <div key={ms.id} className="flex items-center justify-between text-[12px]">
                      <span className="flex items-center gap-2 min-w-0">
                        {ms.done ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        ) : (
                          <Circle className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />
                        )}
                        <span className={ms.done ? 'text-[var(--text-muted)] line-through truncate' : 'text-[var(--text-secondary)] truncate'}>
                          {ms.label}
                        </span>
                      </span>
                      <span className="font-mono-num text-[11px] text-[var(--text-muted)] shrink-0 ml-2">
                        {ms.date}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Bottom Row: Target vs Actual Comparison + Achievement History */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-7 rounded-xl p-4" style={surfaceStyle}>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="font-display text-[14.5px] font-semibold text-[var(--text-primary)]">
                Weekly Target vs Actual by Subject
              </h2>
              <p className="text-[12px] text-[var(--text-muted)]">Hours logged against planned subject targets</p>
            </div>
            <div className="flex items-center gap-3 text-[11.5px] text-[var(--text-secondary)]">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: 'var(--border-strong)' }} />
                Target
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: 'var(--accent)' }} />
                Actual
              </span>
            </div>
          </div>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ANALYTICS_GOAL_COMPARISON} margin={{ top: 6, right: 8, left: -18, bottom: 0 }}>
                <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="subject" tick={{ fill: 'var(--text-muted)', fontSize: 11.5 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11.5 }} axisLine={false} tickLine={false} unit="h" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--bg-elevated)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 10,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="target" name="Target (h)" fill="var(--border-strong)" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                <Bar dataKey="actual" name="Actual (h)" fill="var(--accent)" radius={[4, 4, 0, 0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-5 rounded-xl p-4" style={surfaceStyle}>
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4" style={{ color: 'var(--accent)' }} />
            <h2 className="font-display text-[14.5px] font-semibold text-[var(--text-primary)]">
              Goal Achievement History
            </h2>
          </div>
          <div className="divide-y divide-[var(--border-subtle)]">
            {achievedHistory.map((item) => (
              <div key={item.id} className="py-3 flex items-start justify-between gap-3">
                <div>
                  <div className="text-[13px] font-medium text-[var(--text-primary)]">{item.title}</div>
                  <div className="text-[11.5px] text-[var(--text-muted)] mt-0.5">{item.date}</div>
                </div>
                <span className="font-mono-num text-[11.5px] font-medium text-emerald-600 dark:text-emerald-400 shrink-0">
                  {item.metric}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
