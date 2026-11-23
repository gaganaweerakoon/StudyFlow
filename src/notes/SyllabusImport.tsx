import {useState} from 'react';
import JSZip from '../vendor/jszip.cjs';
import {useApp} from '../context/AppContext';
import {useAssistant} from '../assistant/AssistantContext';
import {openPdf, preparePages, readFileData} from './pdf';

async function syllabusText(file: File) {
  if (/\.pdf$/i.test(file.name)) {
    const doc = await openPdf(await readFileData(file));
    try {return (await preparePages(doc,false)).map((p,i)=>p.text ? 'Page '+(i+1)+'\n'+p.text : '').join('\n');}
    finally {await doc.destroy();}
  }
  if (/\.docx$/i.test(file.name)) {
    const zip = await JSZip.loadAsync(await file.arrayBuffer());
    const xml = await zip.file('word/document.xml')?.async('string');
    if (!xml) throw new Error('The Word document has no document body.');
    const dom = new DOMParser().parseFromString(xml,'application/xml');
    return Array.from(dom.getElementsByTagNameNS('*','p'),p=>p.textContent).join('\n');
  }
  const raw = await file.text();
  if (/^\s*<(?:!doctype|html)/i.test(raw)) return new DOMParser().parseFromString(raw,'text/html').body.textContent ?? '';
  throw new Error('Save this older binary Word document as DOCX or PDF and select the saved copy.');
}
export function SyllabusImport({subject}:{subject:string}) {
  const {generate}=useAssistant();
  const {appendChapters,pushToast}=useApp();
  const [file,setFile]=useState<File>();
  const [outline,setOutline]=useState('');
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  return <details className="rounded-xl border border-[var(--border-subtle)] p-3"><summary>Import syllabus with Pip</summary>
    <input disabled={busy} type="file" accept=".pdf,.docx,.doc" onChange={e=>{setFile(e.target.files?.[0]);setOutline('');setError('');}}/>
    <button disabled={!file || busy} onClick={async()=>{
      if(!file)return;setBusy(true);setError('');
      try {const result=await generate('Extract syllabus units and topics in order. Include source page or section in each unit title. Return JSON array of objects with title:string and topics:string[].',await syllabusText(file));
        if (!Array.isArray(result) || !result.length || !result.every(unit=>typeof unit?.title==='string' && Array.isArray(unit.topics) && unit.topics.every((t:unknown)=>typeof t==='string'))) throw new Error('Pip returned an invalid outline.');
        setOutline(result.map(unit=>['# '+unit.title,...unit.topics].join('\n')).join('\n\n'));
      }catch(e){setError(String(e));}finally{setBusy(false);}
    }}>{busy?'Reading syllabus…':'Draft overview'}</button>
    {error && <p role="alert">{error}</p>}
    {outline && <><textarea aria-label="Review syllabus outline" className="block w-full h-48" value={outline} onChange={e=>setOutline(e.target.value)}/>
    <button onClick={()=>{
      const chapters=outline.split(/^# /m).filter(s=>s.trim()).map(s=>{
        const [title,...topics]=s.trim().split('\n');
        return {id:crypto.randomUUID(),title,topics:topics.filter(t=>t.trim()).map(title=>({id:crypto.randomUUID(),title,completed:false,confidence:1,difficulty:'medium' as const,revisionStatus:'not_started' as const}))};
      });
      appendChapters(subject,chapters);setOutline('');pushToast('Syllabus added');
    }}>Add reviewed outline</button></>}
  </details>;
}
