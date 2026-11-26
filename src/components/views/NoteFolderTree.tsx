import { useState } from 'react';
import { Folder } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatUnitTitle, groupedChapters, type SyllabusScope } from '../../utils/syllabusHierarchy';

export function NoteFolderTree({ folderId, select }: {
  folderId: string;
  select: (scope: SyllabusScope, folderId: string) => void;
}) {
  const { subjects, folders, notesSyllabusScope: scope, createFolder, renameFolder, updateSubject, updateUnit } = useApp();
  const [editing, setEditing] = useState<'new' | 'rename'>();
  const [name, setName] = useState('');
  const subject = subjects.find(item => item.id === scope.subjectId);
  const unit = subject && groupedChapters(subject).find(group => group.unit.id === scope.unitId)?.unit;
  const selected = folders.find(item => item.id === folderId && item.id !== 'fld-all');
  const currentName = selected?.name ?? unit?.title ?? subject?.name;
  const row = (label: string, target: SyllabusScope, id = 'fld-all') => {
    const active = folderId === id && scope.subjectId === target.subjectId && scope.unitId === target.unitId;
    return <button type="button" key={id === 'fld-all' ? target.unitId ?? target.subjectId : id}
      aria-pressed={active} title={label}
      className={'flex w-full items-center gap-2 px-2 py-1 rounded text-left text-xs ' + (active ? 'bg-[var(--accent-soft)] text-[var(--accent)]' : 'hover:bg-[var(--bg-surface-hover)]')}
      onClick={() => { select(target, id); setEditing(undefined); }}>
      <Folder size={14} className="shrink-0" /><span className="truncate">{label}</span>
    </button>;
  };
  function customRows(subjectId?: string, unitId?: string) {
    return folders.filter(f => f.id !== 'fld-all' && (f.subjectId || undefined) === subjectId && f.unitId === unitId)
      .map(f => row(f.name, { subjectId: subjectId ?? '', unitId }, f.id));
  }
  return <nav aria-label="Note folders" className="px-2 py-2 border-b border-[var(--border-subtle)]">
    <div className="max-h-52 overflow-y-auto">
      {row('All notes', { subjectId: '' })}
      {subjects.map(s => <div key={s.id}>
        {row(s.name, { subjectId: s.id })}
        {scope.subjectId === s.id && <div className="pl-4">
          {groupedChapters(s).map(({ unit: u, number }) => <div key={u.id}>
            {row(formatUnitTitle(number, u.title), { subjectId: s.id, unitId: u.id })}
            {scope.unitId === u.id && <div className="pl-4">{customRows(s.id, u.id)}</div>}
          </div>)}
          {customRows(s.id)}
        </div>}
      </div>)}
      {customRows()}
    </div>
    <div className="flex gap-3 px-2 pt-2 text-xs">
      <button onClick={() => { setName(''); setEditing('new'); }}>+ Folder</button>
      {currentName && <button onClick={() => { setName(currentName); setEditing('rename'); }}>Rename</button>}
    </div>
    {editing && <form className="p-2 space-y-1 text-xs" onSubmit={event => {
      event.preventDefault();
      const title = name.trim();
      if (!title) return;
      if (editing === 'new') {
        const id = createFolder(title, scope.subjectId || undefined, scope.unitId);
        select({ subjectId: scope.subjectId, unitId: scope.unitId }, id);
      } else if (selected) renameFolder(selected.id, title);
      else if (subject && unit) updateUnit(subject.id, unit.id, { title });
      else if (subject) updateSubject(subject.id, { name: title });
      setEditing(undefined);
    }}>
      <label>{editing === 'new' ? 'New folder in ' + (unit?.title ?? subject?.name ?? 'All notes') :
        selected ? 'Rename folder' : unit ? 'Rename syllabus unit' : 'Rename subject'}
        <input autoFocus required value={name} onChange={e => setName(e.target.value)} className="w-full rounded border p-1 bg-[var(--bg-surface)]" />
      </label>
      <button disabled={!name.trim()}>Save</button> <button type="button" onClick={() => setEditing(undefined)}>Cancel</button>
    </form>}
  </nav>;
}
