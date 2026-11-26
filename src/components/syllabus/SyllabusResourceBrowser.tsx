import React, { useState } from 'react';
import type { Subject } from '../../types/studyflow';
import { chapterNumber, groupedChapters, matchesSyllabusScope } from '../../utils/syllabusHierarchy';
import { resourceGroups, resourceTitle, type SyllabusResource } from '../../utils/syllabusResources';

export function SyllabusResourceBrowser<T extends SyllabusResource>({subjects, resources, render, label, onCreate}: {subjects: Subject[]; resources: T[]; render: (item:T,title:string)=>React.ReactNode; label:string; onCreate?: (subject:Subject, chapterId:string)=>void}) {
  const [subjectId,setSubjectId]=useState('');
  const [unitId,setUnitId]=useState('');
  const [chapterId,setChapterId]=useState('');
  const [query,setQuery]=useState('');
  const subject=subjects.find(s=>s.id===subjectId);
  const groups=subject?groupedChapters(subject):[];
  const unit=groups.find(g=>g.unit.id===unitId);
  const currentChapter=unit?.chapters.find(ch=>ch.id===chapterId);
  const filtered=resources.filter(r=>matchesSyllabusScope(r,subjects.find(s=>s.id===r.subjectId),{subjectId:subject?.id??'',unitId:unit?.unit.id,chapterId:currentChapter?.id}) && resourceTitle(r,subjects.find(s=>s.id===r.subjectId),resources).toLowerCase().includes(query.trim().toLowerCase()));
  const cards=(items:T[],s?:Subject)=> <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{[...items].reverse().map(r=><React.Fragment key={r.id}>{render(r,resourceTitle(r,s,resources))}</React.Fragment>)}</div>;
  const section=(title:string,items:T[],s?:Subject)=>items.length>0?<details open className="space-y-2"><summary className="cursor-pointer font-medium text-sm">{title} ({items.length})</summary>{cards(items,s)}</details>:null;
  const control='rounded-lg px-2 py-2 text-sm border border-[var(--border-subtle)] bg-[var(--bg-surface)]';
  return <div className="space-y-4">
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
      <select aria-label="Subject filter" className={control} value={subject?.id??''} onChange={e=>{setSubjectId(e.target.value);setUnitId('');setChapterId('')}}><option value="">All subjects</option>{subjects.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select>
      <select aria-label="Unit filter" className={control} disabled={!subject} value={unit?.unit.id??''} onChange={e=>{setUnitId(e.target.value);setChapterId('')}}><option value="">All units</option>{groups.map(g=><option key={g.unit.id} value={g.unit.id}>{g.number}. {g.unit.title}</option>)}</select>
      <select aria-label="Chapter filter" className={control} disabled={!unit} value={currentChapter?.id??''} onChange={e=>setChapterId(e.target.value)}><option value="">All chapters</option>{unit?.chapters.map(ch=><option key={ch.id} value={ch.id}>{subject&&chapterNumber(subject,ch.id)} {ch.title}</option>)}</select>
      <input aria-label="Search titles" className={control} value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search titles"/>
    </div>
    <div className="text-xs text-[var(--text-muted)]">{filtered.length} {label} · multi-chapter links are counted once</div>
    {!filtered.length&&<p className="text-sm text-[var(--text-muted)]">No matching {label}.</p>}
    {subjects.filter(s=>!subject||s.id===subject.id).map(s=>{
      const own=filtered.filter(r=>r.subjectId===s.id);
      const {units,unclassified}=resourceGroups(s,filtered);
      if(!own.length&&!onCreate)return null;
      return <details key={s.id} open className="space-y-3 border border-[var(--border-subtle)] rounded-xl p-3"><summary className="cursor-pointer font-semibold">{s.name} ({own.length})</summary>
        {units.filter(g=>!unit||g.unit.id===unit.unit.id).map(g=>{
          const children=g.children.filter(c=>!currentChapter||c.chapter.id===currentChapter.id);
          const total=new Set([...g.direct,...children.flatMap(c=>c.resources)].map(r=>r.id)).size;
          if(!total&&!onCreate)return null;
          return <details key={g.unit.id} open className="pl-3 space-y-2"><summary className="cursor-pointer text-sm font-medium">{g.number}. {g.unit.title} ({total})</summary>
            {!currentChapter&&section('Unit resources',g.direct,s)}
            {children.filter(c=>c.resources.length||onCreate).map(c=><details open key={c.chapter.id} className="pl-3 space-y-2"><summary className="cursor-pointer text-sm">{chapterNumber(s,c.chapter.id)} {c.chapter.title} ({c.resources.length})</summary>{onCreate&&<button type="button" className="text-xs text-[var(--accent)]" onClick={()=>onCreate(s,c.chapter.id)}>Create from chapter</button>}{cards(c.resources,s)}</details>)}
          </details>
        })}
        {!unit&&!currentChapter&&section('Unclassified',unclassified,s)}
      </details>
    })}
    {section('Unclassified subject',filtered.filter(r=>!subjects.some(s=>s.id===r.subjectId)))}
  </div>
}
