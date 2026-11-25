import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Search,
  BookOpen,
  CheckSquare,
  FileText,
  Hash,
  Timer,
  Plus,
  Palette,
  ArrowRight,
  CalendarDays,
  BarChart3,
  Bot,
  FlaskConical,
  X,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { searchWorkspace } from '../../utils/studyLogic';
import { THEME_OPTIONS } from '../../data/mockData';
import type { NavRoute } from '../../types/studyflow';

interface CommandItem {
  id: string;
  section: string;
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  onSelect: () => void;
}

function highlightMatch(text: string, query: string): React.ReactNode {
  const q = query.trim();
  if (!q) return text;
  const idx = text.toLowerCase().indexOf(q.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark
        className="rounded px-0.5 font-semibold"
        style={{ backgroundColor: 'var(--accent-soft)', color: 'var(--accent)' }}
      >
        {text.slice(idx, idx + q.length)}
      </mark>
      {text.slice(idx + q.length)}
    </>
  );
}

export const CommandPalette: React.FC = () => {
  const {
    importLegacyBackup,
    commandPaletteOpen,
    setCommandPaletteOpen,
    subjects,
    tasks,
    notes,
    setRoute,
    setSelectedSubjectId,
    setSelectedNoteId,
    setActiveModal,
    toggleFocusRunning,
    focusTimer,
    setTheme,
    pushToast,
  } = useApp();

  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (commandPaletteOpen) {
      setQuery('');
      setSelectedIndex(0);
      window.setTimeout(() => inputRef.current?.focus(), 20);
    }
  }, [commandPaletteOpen]);

  const items = useMemo<CommandItem[]>(() => {
    const close = () => setCommandPaletteOpen(false);
    const q = query.trim().toLowerCase();

    const quickActions: CommandItem[] = [
      {
        id: 'act-task',
        section: 'Quick Actions',
        title: 'Create New Task',
        subtitle: 'Add an assignment, problem set, or revision item',
        icon: Plus,
        onSelect: () => {
          close();
          setActiveModal('create_task');
        },
      },
      {
        id: 'act-focus',
        section: 'Quick Actions',
        title: focusTimer.running ? 'Open Active Focus Timer' : 'Start Focus Session (25m Pomodoro)',
        subtitle: 'Jump directly into distraction-free deep work',
        icon: Timer,
        onSelect: () => {
          close();
          setRoute('focus');
          if (!focusTimer.running) toggleFocusRunning();
        },
      },
      {
        id: 'act-planner',
        section: 'Quick Navigation',
        title: 'Open Study Planner',
        subtitle: 'Weekly time-grid schedule and workload view',
        icon: CalendarDays,
        onSelect: () => {
          close();
          setRoute('planner');
        },
      },
      {
        id: 'act-analytics',
        section: 'Quick Navigation',
        title: 'View Study Analytics',
        subtitle: 'Planned vs actual hours, retention, and heatmaps',
        icon: BarChart3,
        onSelect: () => {
          close();
          setRoute('analytics');
        },
      },
      {
        id: 'act-ai',
        section: 'Quick Navigation',
        title: 'Open AI Study Assistant',
        subtitle: 'Concept explanations, study plans, and quiz builder',
        icon: Bot,
        onSelect: () => {
          close();
          setRoute('assistant');
        },
      },
      {
        id: 'act-lab',
        section: 'Quick Navigation',
        title: 'Open Study Lab',
        subtitle: 'Math & Code Playground (JS, Python, SQL, LaTeX) and SVG Whiteboard',
        icon: FlaskConical,
        onSelect: () => {
          close();
          setRoute('lab');
        },
      },
    ];

    if (q && importLegacyBackup) quickActions.push({
      id: 'act-import-backup', section: 'Quick Actions', title: 'Import Legacy SQLite Backup',
      subtitle: 'Restore a schema 17 StudyFlow backup', icon: FileText,
      onSelect: () => { close(); void importLegacyBackup(); },
    });

    const themeActions: CommandItem[] = THEME_OPTIONS.map((t) => ({
      id: `thm-${t.id}`,
      section: 'Switch Theme',
      title: `Switch theme to ${t.name}`,
      subtitle: t.subtitle,
      icon: Palette,
      onSelect: () => {
        setTheme(t.id);
        pushToast(`Switched theme to ${t.name}`);
        close();
      },
    }));

    const searchHits = searchWorkspace(query, { subjects, tasks, notes }).map<CommandItem>((hit) => ({
      id: hit.id,
      section: query.trim() ? 'Workspace Results' : 'Recently Accessed',
      title: hit.title,
      subtitle: `${hit.category} · ${hit.subtitle}`,
      icon:
        hit.category === 'Subject'
          ? BookOpen
          : hit.category === 'Task'
            ? CheckSquare
            : hit.category === 'Note'
              ? FileText
              : Hash,
      onSelect: () => {
        close();
        setRoute(hit.targetRoute as NavRoute);
        if (hit.targetRoute === 'subjects') setSelectedSubjectId(hit.targetId);
        if (hit.targetRoute === 'notes') setSelectedNoteId(hit.targetId);
      },
    }));

    const matchedQuick = quickActions.filter(
      (a) => !q || a.title.toLowerCase().includes(q) || a.subtitle.toLowerCase().includes(q)
    );
    const matchedThemes = q
      ? themeActions.filter(
          (t) => t.title.toLowerCase().includes(q) || t.subtitle.toLowerCase().includes(q) || q.includes('theme')
        )
      : themeActions.slice(0, 2);

    return [...searchHits, ...matchedQuick, ...matchedThemes];
  }, [
    query,
    importLegacyBackup,
    subjects,
    tasks,
    notes,
    focusTimer.running,
    setCommandPaletteOpen,
    setActiveModal,
    setRoute,
    toggleFocusRunning,
    setSelectedSubjectId,
    setSelectedNoteId,
    setTheme,
    pushToast,
  ]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  if (!commandPaletteOpen) return null;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      setCommandPaletteOpen(false);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((i) => (items.length ? (i + 1) % items.length : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((i) => (items.length ? (i - 1 + items.length) % items.length : 0));
    } else if (e.key === 'Enter' && items[selectedIndex]) {
      e.preventDefault();
      items[selectedIndex].onSelect();
    }
  };

  // Group items preserving order
  const sections: { name: string; rows: (CommandItem & { flatIndex: number })[] }[] = [];
  items.forEach((item, flatIndex) => {
    let sec = sections.find((s) => s.name === item.section);
    if (!sec) {
      sec = { name: item.section, rows: [] };
      sections.push(sec);
    }
    sec.rows.push({ ...item, flatIndex });
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] px-4"
      role="dialog"
      aria-modal="true"
      aria-label="Global Command Palette"
    >
      <div
        className="fixed inset-0 bg-black/45 backdrop-blur-[2px]"
        onClick={() => setCommandPaletteOpen(false)}
      />

      <div
        className="relative w-full max-w-xl rounded-2xl overflow-hidden"
        style={{
          backgroundColor: 'var(--bg-elevated)',
          border: '1px solid var(--border-subtle)',
          boxShadow: 'var(--shadow-floating)',
        }}
        onKeyDown={handleKeyDown}
      >
        {/* Search Input */}
        <div
          className="flex items-center gap-3 px-4 h-12"
          style={{ borderBottom: '1px solid var(--border-subtle)' }}
        >
          <Search className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search subjects, tasks, notes, topics, or type a command..."
            className="flex-1 bg-transparent text-[14px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none"
          />
          <button
            type="button"
            onClick={() => setCommandPaletteOpen(false)}
            aria-label="Close command palette"
            className="p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results list */}
        <div className="max-h-[52vh] overflow-y-auto p-2 space-y-3">
          {sections.length === 0 ? (
            <div className="py-10 text-center text-[13px] text-[var(--text-muted)]">
              No matching subjects, tasks, notes, or commands for &ldquo;{query}&rdquo;.
            </div>
          ) : (
            sections.map((section) => (
              <div key={section.name}>
                <div className="px-2.5 pb-1 text-[11px] font-medium text-[var(--text-muted)]">
                  {section.name}
                </div>
                <div className="space-y-0.5">
                  {section.rows.map((row) => {
                    const Icon = row.icon;
                    const active = row.flatIndex === selectedIndex;
                    return (
                      <button
                        key={row.id}
                        type="button"
                        onMouseEnter={() => setSelectedIndex(row.flatIndex)}
                        onClick={row.onSelect}
                        className="w-full flex items-center justify-between gap-3 px-2.5 py-2 rounded-lg text-left transition-colors"
                        style={{
                          backgroundColor: active ? 'var(--accent-soft)' : 'transparent',
                        }}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Icon
                            className="w-4 h-4 shrink-0"
                            style={{ color: active ? 'var(--accent)' : 'var(--text-muted)' }}
                          />
                          <div className="min-w-0">
                            <div className="text-[13px] font-medium text-[var(--text-primary)] truncate">
                              {highlightMatch(row.title, query)}
                            </div>
                            <div className="text-[11.5px] text-[var(--text-muted)] truncate">
                              {row.subtitle}
                            </div>
                          </div>
                        </div>
                        {active && (
                          <ArrowRight
                            className="w-3.5 h-3.5 shrink-0"
                            style={{ color: 'var(--accent)' }}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Keyboard hints footer */}
        <div
          className="px-4 py-2 flex items-center justify-between text-[11px] text-[var(--text-muted)]"
          style={{
            backgroundColor: 'var(--bg-surface-subtle)',
            borderTop: '1px solid var(--border-subtle)',
          }}
        >
          <div className="flex items-center gap-3">
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
            <span>Esc Close</span>
          </div>
          <span>StudyFlow Command</span>
        </div>
      </div>
    </div>
  );
};
