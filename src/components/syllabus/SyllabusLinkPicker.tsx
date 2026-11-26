import React, { useState } from 'react';
import type { Subject } from '../../types/studyflow';
import { chapterNumber, groupedChapters, syllabusLinkLabels, type SyllabusLinks } from '../../utils/syllabusHierarchy';

export function SyllabusLinkPicker({subject, links, onChange}: {subject: Subject; links?: SyllabusLinks; onChange: (links: SyllabusLinks) => void}) {
  const [query, setQuery] = useState('');
  const labels = syllabusLinkLabels(subject, links);
  const matches = (text: string) => text.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase());
  const toggle = (kind: 'unitIds' | 'chapterIds', id: string) => {
    const ids = new Set(links?.[kind] ?? []);
    if (ids.has(id)) ids.delete(id); else ids.add(id);
    onChange({...links, [kind]: [...ids]});
  };
  return <details className="w-full text-xs rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] p-2">
    <summary className="cursor-pointer text-[var(--text-secondary)]">Syllabus links · {labels.length ? labels.join(' · ') : 'Unclassified'}</summary>
    <div className="mt-2 space-y-1">
      <input aria-label="Search syllabus links" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search units or chapters" className="w-full rounded px-2 py-1.5 bg-[var(--bg-surface)] border border-[var(--border-subtle)]"/>
      <div className="max-h-40 overflow-auto space-y-2">
        {groupedChapters(subject).filter(({unit,number,chapters}) => matches(`${number} ${unit.title}`) || chapters.some(ch => matches(`${chapterNumber(subject,ch.id)} ${ch.title}`))).map(({unit,number,chapters}) => <div key={unit.id} className="space-y-1">
          <label className="flex gap-2 items-center font-medium"><input type="checkbox" checked={links?.unitIds?.includes(unit.id) ?? false} onChange={()=>toggle('unitIds',unit.id)}/>{number}. {unit.title}{unit.archived ? ' (Archived)' : ''}</label>
          {chapters.filter(ch=>matches(`${number} ${unit.title}`) || matches(`${chapterNumber(subject,ch.id)} ${ch.title}`)).map(ch => <label key={ch.id} className="flex gap-2 items-center pl-5"><input type="checkbox" checked={links?.chapterIds?.includes(ch.id) ?? false} onChange={()=>toggle('chapterIds',ch.id)}/>{chapterNumber(subject,ch.id)} {ch.title}{ch.archived ? ' (Archived)' : ''}</label>)}
        </div>)}
      </div>
      <button type="button" onClick={()=>onChange({unitIds:[],chapterIds:[]})} className="text-[var(--accent)]">Clear all syllabus links</button>
    </div>
  </details>;
}
