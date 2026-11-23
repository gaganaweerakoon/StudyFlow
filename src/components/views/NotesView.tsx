import AssistantMarkdown from '../../assistant/AssistantMarkdown';
import { PdfPanel } from '../../notes/PdfPanel';
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
  Trash2,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const NotesView: React.FC = () => {
  const {
    folders,
    notes,
    selectedNoteId,
    setSelectedNoteId,
    updateNote,
    createNote, deleteNote,
    subjects,
    pushToast,
  } = useApp();

  const [activeFolderId, setActiveFolderId] = useState<string>('fld-all');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingNote, setEditingNote] = useState<string>();
  const [addingResource, setAddingResource] = useState<string>();
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
  const sourceEditing = activeNote && (editingNote === activeNote.id || !activeNote.content);
  const activeSubject = subjects.find((s) => s.id === activeNote?.subjectId);

  const handleContentChange = (nextContent: string) => {
    if (!activeNote) return;
    setSaveState('Saving...');
    updateNote(activeNote.id, { content: nextContent, updatedAt: 'Just now' });
    window.setTimeout(() => setSaveState('Saved'), 450);
  };

  const insertMarkdown = (snippet: string) => {
    if (!activeNote) return;
    setEditingNote(activeNote.id);
    handleContentChange(`${activeNote.content}\n${snippet}`);
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
              onClick={() => createNote(activeSubject?.id ?? subjects[0]?.id ?? '', activeFolderId)}
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
              <select aria-label="Note subject" value={activeNote.subjectId} onChange={e => updateNote(activeNote.id, {subjectId:e.target.value})}>
                <option value="">No subject</option>{subjects.map(sub => <option key={sub.id} value={sub.id}>{sub.name}</option>)}
              </select>
              <span aria-hidden="true">·</span>
              <span>{activeNote.tags.join(' / ')}</span>
              <span aria-hidden="true">·</span>
              <span>Updated {activeNote.updatedAt}</span>
            </div>

            <div className="flex flex-wrap gap-2 text-sm">
              <button type="button" aria-pressed={!sourceEditing} className="rounded-lg border border-[var(--border-subtle)] px-3 py-2" onClick={() => setEditingNote(undefined)}>Preview</button>
              <button type="button" aria-pressed={Boolean(sourceEditing)} className="rounded-lg border border-[var(--border-subtle)] px-3 py-2" onClick={() => setEditingNote(activeNote.id)}>Edit Markdown</button>
              <button type="button" className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-subtle)] px-3 py-2" onClick={() => { setRightPanelOpen(true); setRightTab('pdf'); }}>
                <FileText className="h-4 w-4" /> PDF to Markdown
              </button>
              <button type="button" className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-subtle)] px-3 py-2" onClick={() => setAddingResource(activeNote.id)}>
                <Plus className="h-4 w-4" /> Add resource
              </button>
              <button type="button" className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-subtle)] px-3 py-2 text-red-500" onClick={() => {
                if (window.confirm('Delete “' + activeNote.title + '”?')) deleteNote(activeNote.id);
              }}><Trash2 className="h-4 w-4" /> Delete note</button>
            </div>
            {addingResource === activeNote.id && (
              <form className="flex flex-wrap gap-2" onSubmit={event => {
                event.preventDefault();
                const url = new URL(String(new FormData(event.currentTarget).get('url')));
                if (url.protocol !== 'http:' && url.protocol !== 'https:') {
                  pushToast('Enter an HTTP or HTTPS address.');
                  return;
                }
                updateNote(activeNote.id, {
                  linkedResources: [...new Set([...activeNote.linkedResources, url.href])],
                  updatedAt: 'Just now',
                });
                setAddingResource(undefined);
                setRightPanelOpen(true);
                setRightTab('resources');
              }}>
                <input autoFocus required type="url" name="url" aria-label="Resource URL" placeholder="https://…" className="min-w-0 flex-1 rounded-lg border border-[var(--border-subtle)] px-3 py-2" />
                <button type="submit" className="rounded-lg bg-[var(--accent)] px-3 py-2 text-[var(--accent-fg)]">Save link</button>
                <button type="button" className="px-2 py-2" onClick={() => setAddingResource(undefined)}>Cancel</button>
              </form>
            )}
            {sourceEditing ? (
              <textarea
                value={activeNote.content}
                onChange={(e) => handleContentChange(e.target.value)}
                aria-label="Note markdown editor"
                className="min-h-[380px] w-full resize-y border-t border-[var(--border-subtle)] bg-transparent pt-3 text-[13.5px] leading-relaxed focus:outline-none"
              />
            ) : (
              <article className="pip-markdown min-w-0 border-t border-[var(--border-subtle)] pt-4 text-sm leading-loose [overflow-wrap:anywhere]" aria-label="Note preview">
                <AssistantMarkdown text={activeNote.content.trim().replace(/^```(?:markdown|md)\s*\n([\s\S]*?)\n```$/, '$1')} />
              </article>
            )}
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
            <PdfPanel key={activeNote.id} source={activeNote.pdf} save={pdf => updateNote(activeNote.id, {pdf})}/>
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
                      {/^https?:\/\//i.test(res)
                        ? <a href={res} target="_blank" rel="noopener noreferrer" className="truncate text-[var(--accent)] hover:underline">{res}</a>
                        : <span className="truncate">{res}</span>}
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
