import React, { useState } from 'react';
import {
  Folder,
  Search,
  Plus,
  Pin,
  Bold,
  Italic,
  Heading2,
  List,
  CheckSquare,
  Table,
  FileText,
  Highlighter,
  Paperclip,
  PanelRightClose,
  PanelRightOpen,
  Check,
  ExternalLink,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const NotesView: React.FC = () => {
  const {
    folders,
    notes,
    selectedNoteId,
    setSelectedNoteId,
    updateNote,
    createNote,
    subjects,
    pushToast,
  } = useApp();

  const [activeFolderId, setActiveFolderId] = useState<string>('fld-all');
  const [searchQuery, setSearchQuery] = useState('');
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [rightTab, setRightTab] = useState<'pdf' | 'resources'>('pdf');
  const [highlightColor, setHighlightColor] = useState<'amber' | 'sky' | 'emerald'>('amber');
  const [saveState, setSaveState] = useState<'Saved' | 'Saving...'>('Saved');
  const [newHighlightNote, setNewHighlightNote] = useState('');

  const filteredNotes = notes
    .filter((n) => {
      if (activeFolderId !== 'fld-all' && n.folderId !== activeFolderId) return false;
      if (
        searchQuery.trim() &&
        !n.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !n.content.toLowerCase().includes(searchQuery.toLowerCase())
      ) {
        return false;
      }
      return true;
    })
    .sort((a, b) => Number(b.pinned) - Number(a.pinned));

  const activeNote = notes.find((n) => n.id === selectedNoteId) ?? filteredNotes[0] ?? notes[0];
  const activeSubject = subjects.find((s) => s.id === activeNote?.subjectId);

  const handleContentChange = (nextContent: string) => {
    if (!activeNote) return;
    setSaveState('Saving...');
    updateNote(activeNote.id, { content: nextContent, updatedAt: 'Just now' });
    window.setTimeout(() => setSaveState('Saved'), 450);
  };

  const insertMarkdown = (snippet: string) => {
    if (!activeNote) return;
    handleContentChange(`${activeNote.content}\n${snippet}`);
  };

  const handleAddHighlight = () => {
    if (!activeNote || !newHighlightNote.trim()) return;
    updateNote(activeNote.id, {
      pdfHighlights: [
        ...activeNote.pdfHighlights,
        {
          id: `hl-${Date.now()}`,
          page: 5,
          excerpt: 'Annotated excerpt from lecture slide PDF.',
          note: newHighlightNote.trim(),
          color: highlightColor,
        },
      ],
    });
    setNewHighlightNote('');
    pushToast('PDF annotation saved');
  };

  const highlightBg: Record<'amber' | 'sky' | 'emerald', string> = {
    amber: 'rgba(245, 158, 11, 0.16)',
    sky: 'rgba(14, 165, 233, 0.16)',
    emerald: 'rgba(16, 185, 129, 0.16)',
  };

  return (
    <div
      className="rounded-xl overflow-hidden flex flex-col lg:flex-row h-[calc(100vh-88px)] min-h-[580px]"
      style={{
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--border-subtle)',
      }}
    >
      {/* PANEL 1: Folders + Notes List */}
      <div
        className="w-full lg:w-64 xl:w-72 shrink-0 flex flex-col max-h-64 lg:max-h-none"
        style={{
          backgroundColor: 'var(--bg-sidebar)',
          borderRight: '1px solid var(--border-subtle)',
        }}
      >
        <div className="p-3 space-y-2.5" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <div className="flex items-center justify-between">
            <h1 className="font-display text-[15px] font-semibold text-[var(--text-primary)]">
              Notes
            </h1>
            <button
              type="button"
              onClick={() => createNote(activeSubject?.id ?? 'cs340', activeFolderId)}
              aria-label="Create new note"
              className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11.5px] font-medium"
              style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' }}
            >
              <Plus className="w-3 h-3" /> New
            </button>
          </div>
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[var(--text-muted)] absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search notes..."
              aria-label="Search notes"
              className="w-full h-8 pl-8 pr-2.5 rounded-lg text-[12px]"
              style={{
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-primary)',
              }}
            />
          </div>
        </div>

        {/* Folder Navigation */}
        <div className="px-2 py-2 space-y-0.5" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          {folders.map((fld) => {
            const active = activeFolderId === fld.id;
            return (
              <button
                key={fld.id}
                type="button"
                onClick={() => setActiveFolderId(fld.id)}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-[12px] font-medium text-left transition-colors"
                style={{
                  backgroundColor: active ? 'var(--accent-soft)' : 'transparent',
                  color: active ? 'var(--accent)' : 'var(--text-secondary)',
                }}
              >
                <Folder className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{fld.name}</span>
              </button>
            );
          })}
        </div>

        {/* Notes List */}
        <div className="flex-1 overflow-y-auto divide-y divide-[var(--border-subtle)]">
          {filteredNotes.map((n) => {
            const active = activeNote?.id === n.id;
            const sub = subjects.find((s) => s.id === n.subjectId);
            return (
              <button
                key={n.id}
                type="button"
                onClick={() => setSelectedNoteId(n.id)}
                className="w-full p-3 text-left transition-colors hover:bg-[var(--bg-surface-hover)]"
                style={{
                  backgroundColor: active ? 'var(--bg-surface)' : 'transparent',
                }}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-medium" style={{ color: sub?.color }}>
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: sub?.color }} />
                    {sub?.code}
                  </span>
                  {n.pinned && <Pin className="w-3 h-3 text-[var(--accent)]" />}
                </div>
                <div className="text-[12.5px] font-semibold text-[var(--text-primary)] line-clamp-1 mt-0.5">
                  {n.title}
                </div>
                <div className="text-[11px] text-[var(--text-muted)] mt-0.5">{n.updatedAt}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* PANEL 2: Rich Markdown Editor */}
      {activeNote && (
        <div className="flex-1 flex flex-col min-w-0">
          {/* Formatting Toolbar */}
          <div
            className="px-4 h-11 shrink-0 flex items-center justify-between gap-2 overflow-x-auto"
            style={{ borderBottom: '1px solid var(--border-subtle)' }}
          >
            <div className="flex items-center gap-1">
              {[
                { label: 'Heading', icon: Heading2, snippet: '\n## Section Heading' },
                { label: 'Bold', icon: Bold, snippet: '**key concept**' },
                { label: 'Italic', icon: Italic, snippet: '_emphasis_' },
                { label: 'Bullet List', icon: List, snippet: '- Key takeaway item' },
                { label: 'Checklist', icon: CheckSquare, snippet: '- [ ] Review proof step' },
                { label: 'Table', icon: Table, snippet: '\n| Concept | Complexity |\n| :--- | :--- |\n| Example | O(n log n) |' },
              ].map((tool) => {
                const Icon = tool.icon;
                return (
                  <button
                    key={tool.label}
                    type="button"
                    onClick={() => insertMarkdown(tool.snippet)}
                    aria-label={`Insert ${tool.label}`}
                    title={`Insert ${tool.label}`}
                    className="p-1.5 rounded-md text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)]"
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2 shrink-0 text-[11.5px]">
              <span className="inline-flex items-center gap-1 text-[var(--text-muted)]">
                <Check className="w-3 h-3 text-emerald-500" />
                {saveState}
              </span>
              <button
                type="button"
                onClick={() => updateNote(activeNote.id, { pinned: !activeNote.pinned })}
                aria-label={activeNote.pinned ? 'Unpin note' : 'Pin note'}
                className="p-1.5 rounded-md hover:bg-[var(--bg-surface-hover)]"
                style={{ color: activeNote.pinned ? 'var(--accent)' : 'var(--text-muted)' }}
              >
                <Pin className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setRightPanelOpen((o) => !o)}
                aria-label={rightPanelOpen ? 'Collapse reference panel' : 'Expand reference panel'}
                className="p-1.5 rounded-md text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)]"
              >
                {rightPanelOpen ? <PanelRightClose className="w-4 h-4" /> : <PanelRightOpen className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Note Header & Content */}
          <div className="flex-1 overflow-y-auto p-5 space-y-3">
            <input
              type="text"
              value={activeNote.title}
              onChange={(e) => updateNote(activeNote.id, { title: e.target.value, updatedAt: 'Just now' })}
              aria-label="Note title"
              className="w-full bg-transparent font-display text-[20px] font-semibold text-[var(--text-primary)] focus:outline-none"
            />
            <div className="flex flex-wrap items-center gap-2 text-[12px] text-[var(--text-muted)]">
              <span className="font-medium" style={{ color: activeSubject?.color }}>
                {activeSubject?.code} · {activeSubject?.name}
              </span>
              <span aria-hidden="true">·</span>
              <span>{activeNote.tags.join(' / ')}</span>
              <span aria-hidden="true">·</span>
              <span>Updated {activeNote.updatedAt}</span>
            </div>

            <textarea
              value={activeNote.content}
              onChange={(e) => handleContentChange(e.target.value)}
              aria-label="Note markdown editor"
              className="w-full min-h-[380px] bg-transparent text-[13.5px] leading-relaxed text-[var(--text-primary)] font-mono focus:outline-none resize-none pt-2"
              style={{ borderTop: '1px solid var(--border-subtle)' }}
            />
          </div>
        </div>
      )}

      {/* PANEL 3: Collapsible PDF Viewer & Attachments Panel */}
      {rightPanelOpen && activeNote && (
        <div
          className="w-full lg:w-80 xl:w-96 shrink-0 flex flex-col"
          style={{
            backgroundColor: 'var(--bg-surface-subtle)',
            borderLeft: '1px solid var(--border-subtle)',
          }}
        >
          <div
            className="px-3 h-11 shrink-0 flex items-center justify-between gap-2"
            style={{ borderBottom: '1px solid var(--border-subtle)' }}
          >
            <div className="flex items-center gap-1 text-[12px]">
              <button
                type="button"
                onClick={() => setRightTab('pdf')}
                className="px-2.5 py-1 rounded-md font-medium transition-colors"
                style={{
                  backgroundColor: rightTab === 'pdf' ? 'var(--bg-surface)' : 'transparent',
                  color: rightTab === 'pdf' ? 'var(--text-primary)' : 'var(--text-muted)',
                }}
              >
                PDF Annotator
              </button>
              <button
                type="button"
                onClick={() => setRightTab('resources')}
                className="px-2.5 py-1 rounded-md font-medium transition-colors"
                style={{
                  backgroundColor: rightTab === 'resources' ? 'var(--bg-surface)' : 'transparent',
                  color: rightTab === 'resources' ? 'var(--text-primary)' : 'var(--text-muted)',
                }}
              >
                Resources ({activeNote.attachments.length})
              </button>
            </div>
          </div>

          {rightTab === 'pdf' ? (
            <div className="flex-1 overflow-y-auto p-3.5 space-y-3">
              {/* Simulated PDF Page Reader */}
              <div
                className="rounded-lg p-4 space-y-2.5 text-[12px]"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)]">
                  <span className="truncate font-medium">
                    {activeNote.attachments[0]?.name ?? 'Lecture_Slides_Preview.pdf'}
                  </span>
                  <span className="font-mono-num shrink-0">Page 4 / 18</span>
                </div>

                <div className="space-y-2 leading-relaxed text-[var(--text-secondary)] pt-1">
                  <p className="font-semibold text-[var(--text-primary)]">
                    Theorem 34.4 — Polynomial-Time Reducibility
                  </p>
                  <p
                    className="px-1.5 py-1 rounded"
                    style={{ backgroundColor: highlightBg[highlightColor], color: 'var(--text-primary)' }}
                  >
                    If L₁ ≤_p L₂ and L₂ ∈ P, then L₁ ∈ P. Consequently, proving a single NP-complete problem lies in P collapses the entire hierarchy.
                  </p>
                  <p>
                    Construction maps each clause Cⱼ to a bounded local gadget preserving satisfiability under polynomial expansion.
                  </p>
                </div>

                {/* Highlighter color selector */}
                <div className="pt-2 flex items-center justify-between" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                  <span className="inline-flex items-center gap-1 text-[11px] text-[var(--text-muted)]">
                    <Highlighter className="w-3 h-3" /> Highlight ink
                  </span>
                  <div className="flex items-center gap-1.5">
                    {(['amber', 'sky', 'emerald'] as const).map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setHighlightColor(c)}
                        aria-label={`Use ${c} highlighter`}
                        className="w-4 h-4 rounded-full"
                        style={{
                          backgroundColor: c === 'amber' ? '#F59E0B' : c === 'sky' ? '#0EA5E9' : '#10B981',
                          outline: highlightColor === c ? '2px solid var(--text-primary)' : 'none',
                          outlineOffset: 1,
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Add quick annotation */}
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={newHighlightNote}
                  onChange={(e) => setNewHighlightNote(e.target.value)}
                  placeholder="Add margin annotation..."
                  className="flex-1 px-2.5 py-1.5 rounded-lg text-[12px]"
                  style={{
                    backgroundColor: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-primary)',
                  }}
                />
                <button
                  type="button"
                  onClick={handleAddHighlight}
                  className="px-2.5 py-1.5 rounded-lg text-[12px] font-medium"
                  style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' }}
                >
                  Save
                </button>
              </div>

              {/* Saved Highlights List */}
              <div className="space-y-2">
                <div className="text-[11px] font-medium text-[var(--text-muted)]">
                  Saved Highlights ({activeNote.pdfHighlights.length})
                </div>
                {activeNote.pdfHighlights.map((hl) => (
                  <div
                    key={hl.id}
                    className="p-2.5 rounded-lg text-[12px] space-y-1"
                    style={{
                      backgroundColor: 'var(--bg-surface)',
                      border: '1px solid var(--border-subtle)',
                    }}
                  >
                    <div className="text-[11px] font-mono-num text-[var(--text-muted)]">Page {hl.page}</div>
                    <div
                      className="px-1.5 py-0.5 rounded text-[11.5px] text-[var(--text-primary)]"
                      style={{ backgroundColor: highlightBg[hl.color] }}
                    >
                      &ldquo;{hl.excerpt}&rdquo;
                    </div>
                    <div className="text-[11.5px] text-[var(--text-secondary)]">{hl.note}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto p-3.5 space-y-4">
              <div>
                <div className="text-[11.5px] font-semibold text-[var(--text-primary)] mb-2 flex items-center gap-1.5">
                  <Paperclip className="w-3.5 h-3.5 text-[var(--text-muted)]" /> Attached Files
                </div>
                <div className="space-y-1.5">
                  {activeNote.attachments.map((att) => (
                    <div
                      key={att.id}
                      className="p-2.5 rounded-lg flex items-center justify-between gap-2 text-[12px]"
                      style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}
                    >
                      <span className="flex items-center gap-2 min-w-0">
                        <FileText className="w-3.5 h-3.5 text-[var(--accent)] shrink-0" />
                        <span className="truncate text-[var(--text-primary)]">{att.name}</span>
                      </span>
                      <span className="font-mono-num text-[11px] text-[var(--text-muted)] shrink-0">
                        {att.size}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-[11.5px] font-semibold text-[var(--text-primary)] mb-2">
                  Linked Study Resources
                </div>
                <div className="space-y-1.5">
                  {activeNote.linkedResources.map((res) => (
                    <div
                      key={res}
                      className="p-2.5 rounded-lg flex items-center justify-between gap-2 text-[12px] text-[var(--text-secondary)]"
                      style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}
                    >
                      <span className="truncate">{res}</span>
                      <ExternalLink className="w-3 h-3 text-[var(--text-muted)] shrink-0" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
