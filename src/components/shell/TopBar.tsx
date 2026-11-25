import { GoogleAccount, GoogleMark } from '../../desktop/GoogleAccount';
import { UserRound, Loader2 } from 'lucide-react';
import React, { useState, useRef, useEffect } from 'react';
import {
  Search,
  Plus,
  Bell,
  Palette,
  Menu,
  ChevronRight,
  CheckSquare,
  CalendarPlus,
  BookPlus,
  Target,
  Layers,
  GraduationCap,
  Check,
  Settings,
  User,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../firebase/AuthContext';
import { THEME_OPTIONS, ACCENT_PRESETS, USER_AVATAR_URL } from '../../data/mockData';
import type { NavRoute } from '../../types/studyflow';

const ROUTE_META: Record<NavRoute, { group: string; title: string; actionLabel?: string; actionModal?: 'create_task' | 'create_session' | 'create_subject' | 'create_goal' | 'create_flashcard' | 'create_exam' }> = {
  dashboard: { group: 'Workspace', title: 'Dashboard', actionLabel: 'New Session', actionModal: 'create_session' },
  planner: { group: 'Workspace', title: 'Study Planner', actionLabel: 'Schedule Block', actionModal: 'create_session' },
  focus: { group: 'Workspace', title: 'Focus Timer' },
  tasks: { group: 'Workspace', title: 'Tasks', actionLabel: 'New Task', actionModal: 'create_task' },
  goals: { group: 'Workspace', title: 'Goals', actionLabel: 'New Goal', actionModal: 'create_goal' },
  subjects: { group: 'Learning', title: 'Subjects', actionLabel: 'Add Subject', actionModal: 'create_subject' },
  notes: { group: 'Learning', title: 'Notes' },
  flashcards: { group: 'Learning', title: 'Flashcards', actionLabel: 'Add Card', actionModal: 'create_flashcard' },
  practice: { group: 'Learning', title: 'Practice Tests' },
  exams: { group: 'Learning', title: 'Exams', actionLabel: 'Add Exam', actionModal: 'create_exam' },
  lab: { group: 'Workspace', title: 'Dashboard' },
  analytics: { group: 'Intelligence', title: 'Analytics' },
  assistant: { group: 'Intelligence', title: 'AI Assistant' },
  achievements: { group: 'Personal', title: 'Achievements' },
  settings: { group: 'Personal', title: 'Settings' },
};

export const TopBar: React.FC = () => {
  const {
    route,
    setRoute,
    selectedSubjectId,
    setSelectedSubjectId,
    subjects,
    setMobileNavOpen,
    setCommandPaletteOpen,
    setActiveModal,
    theme,
    setTheme,
    accentColor,
    setAccentColor,
    density,
    setDensity,
    notifications,
    markAllNotificationsRead,
    markNotificationRead,
    preferences,
    legacyCalendar,
  } = useApp();
  const { user, authReady, signingIn, signInWithGoogle } = useAuth();

  const [openMenu, setOpenMenu] = useState<'create' | 'notifications' | 'theme' | 'profile' | null>(null);
  const menuContainerRef = useRef<HTMLDivElement>(null);
  const avatarSrc = user?.photoURL || preferences.googleAccount?.photoURL || (legacyCalendar ? '' : USER_AVATAR_URL);
  const isSignedIn = Boolean(user || preferences.googleAccount);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuContainerRef.current && !menuContainerRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const meta = ROUTE_META[route];
  const activeSubject = selectedSubjectId ? subjects.find((s) => s.id === selectedSubjectId) : null;
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <header
      className="h-13 shrink-0 px-4 flex items-center justify-between gap-4 select-none relative z-30"
      style={{
        backgroundColor: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border-subtle)',
      }}
    >
      {/* Left: Mobile menu button + Breadcrumbs */}
      <div className="flex items-center gap-2.5 min-w-0">
        <button
          type="button"
          onClick={() => setMobileNavOpen(true)}
          aria-label="Open navigation menu"
          className="lg:hidden p-1.5 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)]"
        >
          <Menu className="w-4 h-4" strokeWidth={1.75} />
        </button>

        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[13px] min-w-0">
          <span className="hidden sm:inline text-[var(--text-muted)] whitespace-nowrap">
            {meta.group}
          </span>
          <ChevronRight className="hidden sm:inline w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />
          <button
            type="button"
            onClick={() => {
              if (route === 'subjects' && selectedSubjectId) {
                setSelectedSubjectId(null);
              }
            }}
            className={`font-medium truncate whitespace-nowrap ${
              activeSubject
                ? 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                : 'text-[var(--text-primary)]'
            }`}
          >
            {meta.title}
          </button>
          {activeSubject && (
            <>
              <ChevronRight className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />
              <span className="font-semibold text-[var(--text-primary)] truncate">
                {activeSubject.code}
              </span>
            </>
          )}
        </nav>
      </div>

      {/* Center: Global Search Trigger */}
      <button
        type="button"
        onClick={() => setCommandPaletteOpen(true)}
        aria-label="Open global search and command palette"
        className="hidden md:flex items-center justify-between gap-3 w-72 lg:w-80 h-8 px-2.5 rounded-lg text-[12.5px] text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
        style={{
          backgroundColor: 'var(--bg-surface-subtle)',
          border: '1px solid var(--border-subtle)',
        }}
      >
        <span className="flex items-center gap-2 truncate">
          <Search className="w-3.5 h-3.5 shrink-0" strokeWidth={1.75} />
          <span className="truncate">Search subjects, tasks, notes...</span>
        </span>
        <kbd
          className="text-[11px] font-mono-num px-1.5 py-0.5 rounded shrink-0"
          style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--text-muted)',
          }}
        >
          Ctrl K
        </kbd>
      </button>

      {/* Right: Utility Controls */}
      <div ref={menuContainerRef} className="flex items-center gap-1.5 shrink-0 relative">
        <button
          type="button"
          onClick={() => setCommandPaletteOpen(true)}
          aria-label="Search workspace"
          className="md:hidden p-1.5 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)]"
        >
          <Search className="w-4 h-4" strokeWidth={1.75} />
        </button>

        {/* Quick Create Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setOpenMenu((m) => (m === 'create' ? null : 'create'))}
            aria-label="Quick create menu"
            aria-expanded={openMenu === 'create'}
            title="Quick create"
            className="h-8 w-8 rounded-lg flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] transition-colors"
            style={{ border: '1px solid var(--border-subtle)' }}
          >
            <Plus className="w-4 h-4" strokeWidth={1.75} />
          </button>

          {openMenu === 'create' && (
            <div
              className="absolute right-0 mt-2 w-52 rounded-xl p-1.5 z-50"
              style={{
                backgroundColor: 'var(--bg-elevated)',
                border: '1px solid var(--border-subtle)',
                boxShadow: 'var(--shadow-floating)',
              }}
            >
              <div className="px-2.5 py-1 text-[11px] font-medium text-[var(--text-muted)]">
                Quick Create
              </div>
              {[
                { label: 'New Task', icon: CheckSquare, modal: 'create_task' as const },
                { label: 'Schedule Study Block', icon: CalendarPlus, modal: 'create_session' as const },
                { label: 'Add Subject', icon: BookPlus, modal: 'create_subject' as const },
                { label: 'Create Goal', icon: Target, modal: 'create_goal' as const },
                { label: 'Add Flashcard', icon: Layers, modal: 'create_flashcard' as const },
                { label: 'Add Exam', icon: GraduationCap, modal: 'create_exam' as const },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => {
                      setActiveModal(item.modal);
                      setOpenMenu(null);
                    }}
                    className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-[13px] text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] transition-colors text-left"
                  >
                    <Icon className="w-3.5 h-3.5 text-[var(--text-muted)]" strokeWidth={1.75} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Theme Switcher Popover */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setOpenMenu((m) => (m === 'theme' ? null : 'theme'))}
            aria-label="Switch theme and appearance"
            aria-expanded={openMenu === 'theme'}
            title="Theme & appearance"
            className="h-8 w-8 rounded-lg flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] transition-colors"
          >
            <Palette className="w-4 h-4" strokeWidth={1.75} />
          </button>

          {openMenu === 'theme' && (
            <div
              className="absolute right-0 mt-2 w-72 rounded-xl p-3 z-50 space-y-3"
              style={{
                backgroundColor: 'var(--bg-elevated)',
                border: '1px solid var(--border-subtle)',
                boxShadow: 'var(--shadow-floating)',
              }}
            >
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-semibold text-[var(--text-primary)]">
                  Theme
                </span>
                <div
                  className="flex items-center p-0.5 rounded-lg text-[11px]"
                  style={{ backgroundColor: 'var(--bg-surface-subtle)' }}
                >
                  {(['compact', 'comfortable'] as const).map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDensity(d)}
                      className="px-2 py-0.5 rounded-md capitalize transition-colors"
                      style={{
                        backgroundColor: density === d ? 'var(--bg-surface)' : 'transparent',
                        color: density === d ? 'var(--text-primary)' : 'var(--text-muted)',
                      }}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-1.5">
                {THEME_OPTIONS.map((t) => {
                  const active = theme === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setTheme(t.id)}
                      className="flex items-center gap-2 p-2 rounded-lg text-left transition-colors"
                      style={{
                        backgroundColor: active ? 'var(--accent-soft)' : 'var(--bg-surface-subtle)',
                        border: active
                          ? '1px solid var(--accent)'
                          : '1px solid var(--border-subtle)',
                      }}
                    >
                      <span
                        className="w-4 h-4 rounded-full shrink-0 border"
                        style={{
                          backgroundColor: t.swatches[0],
                          borderColor: t.swatches[2],
                        }}
                      />
                      <span className="text-[12px] font-medium text-[var(--text-primary)] truncate">
                        {t.name}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div>
                <div className="text-[11px] font-medium text-[var(--text-muted)] mb-1.5">
                  Accent Color
                </div>
                <div className="flex items-center justify-between gap-1.5">
                  {ACCENT_PRESETS.map((a) => (
                    <button
                      key={a.hex}
                      type="button"
                      onClick={() => setAccentColor(a.hex)}
                      aria-label={`Set accent color ${a.name}`}
                      className="w-6 h-6 rounded-full flex items-center justify-center transition-transform hover:scale-110"
                      style={{ backgroundColor: a.hex }}
                    >
                      {accentColor.toLowerCase() === a.hex.toLowerCase() && (
                        <Check className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Notifications Popover */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setOpenMenu((m) => (m === 'notifications' ? null : 'notifications'))}
            aria-label={`Notifications (${unreadCount} unread)`}
            aria-expanded={openMenu === 'notifications'}
            title="Notifications"
            className="relative h-8 w-8 rounded-lg flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] transition-colors"
          >
            <Bell className="w-4 h-4" strokeWidth={1.75} />
            {unreadCount > 0 && (
              <span
                className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: 'var(--accent)' }}
              />
            )}
          </button>

          {openMenu === 'notifications' && (
            <div
              className="absolute right-0 mt-2 w-80 rounded-xl overflow-hidden z-50"
              style={{
                backgroundColor: 'var(--bg-elevated)',
                border: '1px solid var(--border-subtle)',
                boxShadow: 'var(--shadow-floating)',
              }}
            >
              <div
                className="flex items-center justify-between px-3.5 py-2.5"
                style={{ borderBottom: '1px solid var(--border-subtle)' }}
              >
                <span className="text-[12.5px] font-semibold text-[var(--text-primary)]">
                  Notifications
                </span>
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={markAllNotificationsRead}
                    className="text-[11.5px] font-medium hover:underline"
                    style={{ color: 'var(--accent)' }}
                  >
                    Mark all read
                  </button>
                )}
              </div>
              <div className="max-h-72 overflow-y-auto divide-y divide-[var(--border-subtle)]">
                {notifications.map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => {
                      markNotificationRead(n.id);
                      setRoute(n.route);
                      setOpenMenu(null);
                    }}
                    className="w-full text-left px-3.5 py-2.5 hover:bg-[var(--bg-surface-hover)] transition-colors"
                    style={{
                      backgroundColor: n.read ? 'transparent' : 'var(--accent-soft)',
                    }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[12.5px] font-medium text-[var(--text-primary)] truncate">
                        {n.title}
                      </span>
                      <span className="text-[11px] text-[var(--text-muted)] shrink-0">
                        {n.time}
                      </span>
                    </div>
                    <p className="text-[12px] text-[var(--text-secondary)] mt-0.5 line-clamp-2">
                      {n.detail}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Direct Google Sign-In button when signed out */}
        {!isSignedIn && (
          <button
            type="button"
            disabled={signingIn || !authReady}
            onClick={() => void signInWithGoogle()}
            aria-label="Sign in with Google"
            className="hidden sm:inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-[12px] font-medium text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] disabled:opacity-60 transition-colors whitespace-nowrap"
            style={{
              backgroundColor: 'var(--bg-surface-subtle)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            {signingIn ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <GoogleMark className="w-3.5 h-3.5 shrink-0" />
            )}
            <span>{signingIn ? 'Signing in…' : 'Sign in'}</span>
          </button>
        )}

        {/* Profile Avatar Menu */}
        <div className="relative pl-0.5">
          <button
            type="button"
            onClick={() => setOpenMenu((m) => (m === 'profile' ? null : 'profile'))}
            aria-label="Account profile menu"
            aria-expanded={openMenu === 'profile'}
            className="flex items-center gap-2 rounded-full p-0.5 hover:ring-2 hover:ring-[var(--accent-border)] transition-all"
          >
            {avatarSrc ? (
              <img
                src={avatarSrc}
                alt={preferences.name}
                referrerPolicy="no-referrer"
                className="w-7 h-7 rounded-full object-cover"
                style={{ border: '1px solid var(--border-subtle)' }}
              />
            ) : (
              <span
                aria-hidden="true"
                className="grid h-7 w-7 place-items-center rounded-full bg-[var(--accent-soft)] text-[var(--accent)]"
              >
                <UserRound className="h-4 w-4" />
              </span>
            )}
          </button>

          {openMenu === 'profile' && (
            <div
              className="absolute right-0 mt-2 w-64 rounded-xl p-1.5 z-50"
              style={{
                backgroundColor: 'var(--bg-elevated)',
                border: '1px solid var(--border-subtle)',
                boxShadow: 'var(--shadow-floating)',
              }}
            >
              <div
                className="px-2.5 py-2 mb-1"
                style={{ borderBottom: '1px solid var(--border-subtle)' }}
              >
                <div className="text-[13px] font-semibold text-[var(--text-primary)] truncate">
                  {preferences.name}
                </div>
                <div className="text-[11.5px] text-[var(--text-muted)] truncate">
                  {user?.email || preferences.email || preferences.major}
                </div>
              </div>
              <GoogleAccount compact onSignedIn={() => setOpenMenu(null)} />
              <button
                type="button"
                onClick={() => {
                  setRoute('achievements');
                  setOpenMenu(null);
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[12.5px] text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)]"
              >
                <User className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                Scholar Profile & XP
              </button>
              <button
                type="button"
                onClick={() => {
                  setRoute('settings');
                  setOpenMenu(null);
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[12.5px] text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)]"
              >
                <Settings className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                Preferences & Themes
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
