import {useState} from 'react';
import {useApp} from '../context/AppContext';
import {useAssistant} from '../assistant/AssistantContext';

import { readGeneratedCards, readGeneratedQuestions, type GeneratedCard } from './generatedStudyItems';
export function StudyGeneration({quiz=false}:{quiz?:boolean}) {
  const {notes,decks,addQuiz,addFlashcard,pushToast}=useApp();
  const {generate}=useAssistant();
  const [noteId,setNoteId]=useState(notes[0]?.id ?? '');
  const [index,setIndex]=useState(0);
  const note=notes.find(n=>n.id===noteId);
  const sections=[...(note?.content.split(/(?=^#{1,6} )/m).filter(s=>s.trim()) ?? []),...(note?.pdf?.pages ?? []).filter(p=>p.text).map(p=>'Page '+((note?.pdf?.pages?.indexOf(p) ?? 0)+1)+'\n'+p.text)];
  const [deck,setDeck]=useState(decks[0]?.id ?? '');
  const [count,setCount]=useState(5);
  const [kind,setKind]=useState("mixed");
  const [cards,setCards]=useState<GeneratedCard[]>([]);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  return <details className="rounded-xl border border-[var(--border-subtle)] p-3 text-sm"><summary>{quiz?'Generate practice test':'Generate flashcards'} from notes</summary>
    <fieldset disabled={busy} className="grid gap-2 mt-3">
    <label>Note <select value={noteId} onChange={e=>{setNoteId(e.target.value);setIndex(0);setCards([]);}}>{notes.map(n=><option key={n.id} value={n.id}>{n.title}</option>)}</select></label>
    <label>Section <select value={index} onChange={e=>{setIndex(Number(e.target.value));setCards([]);}}>{sections.map((s,i)=><option key={i} value={i}>{s.split('\n')[0].slice(0,90)}</option>)}</select></label>
    {quiz ? <label>Questions <select value={kind} onChange={e=>setKind(e.target.value)}>{["mixed","mcq","multi","short"].map(k=><option key={k}>{k}</option>)}</select></label> : <label>Deck <select value={deck} onChange={e=>setDeck(e.target.value)}>{decks.map(d=><option key={d.id} value={d.id}>{d.title}</option>)}</select></label>}
    <label>Number of items <input type="number" min={1} max={30} value={count} onChange={e=>setCount(Number(e.target.value))}/></label>
    <button disabled={!sections[index] || (!quiz && !deck) || !Number.isInteger(count) || count<1 || count>30} onClick={async()=>{
      setBusy(true);setError('');try {
        if(quiz && note) {
          const result=await generate('Generate '+count+' '+kind+' questions based only on this section. Return JSON array with type (mcq, multi, short), prompt, options (array for choice questions), answer (exact option or array of exact options for multi, exact short term for short), and explanation including evidence. For short allow a concise explanation and include a rubric string with clear criteria for full credit.',sections[index]);
          const questions=readGeneratedQuestions(result,note.title,count,kind);
          addQuiz({id:crypto.randomUUID(),title:note.title+' practice',subjectId:note.subjectId,durationMinutes:Math.max(5,count*2),difficulty:'Standard',questions,sourceNoteId:note.id,sourceSection:sections[index].split('\n')[0].slice(0,120)});
          pushToast('Practice test ready');return;
        }
        const result=await generate('Generate '+count+' flashcards strictly grounded in the selected section. Return JSON array of objects with front and back strings.',sections[index]);
        setCards(readGeneratedCards(result,count));
      }catch(e){setError(String(e));}finally{setBusy(false);}
    }}>{busy?'Generating…':'Generate draft'}</button>
    {cards.map((c,i)=><div key={i} className="grid gap-1">{(['front','back'] as const).map(k=><textarea key={k} aria-label={k} value={c[k]} onChange={e=>setCards(cards.map((v,j)=>j===i?{...v,[k]:e.target.value}:v))}/>)}<button onClick={()=>setCards(cards.filter((_,j)=>i!==j))}>Discard card</button></div>)}
    {cards.length>0 && <button disabled={cards.some(c=>!c.front.trim()||!c.back.trim())} onClick={()=>{cards.forEach(c=>addFlashcard({...c,deckId:deck,hint:note?.title}));setCards([]);pushToast('Reviewed cards saved');}}>Save reviewed cards</button>}
    {error && <p role="alert">{error}</p>}</fieldset></details>;
}
