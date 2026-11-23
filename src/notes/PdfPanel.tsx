import {isTauri} from '@tauri-apps/api/core';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {useEffect, useRef, useState} from 'react';
import {openPdf, preparePages, readFileData, recognizePage, type PdfDocument, type PdfSource, type PdfMark} from './pdf';

export function PdfPanel({source, save}: {source?:PdfSource; save:(next:PdfSource)=>void}) {
  const [prepareOnImport,setPrepareOnImport] = useState(false);
  const [working,setWorking] = useState(false);
  const [doc,setDoc] = useState<PdfDocument>();
  const [page,setPage] = useState(1);
  const [zoom,setZoom] = useState(1);
  const [tool,setTool] = useState<PdfMark['kind']>('ink');
  const [error,setError] = useState('');
  const [size,setSize] = useState({width:600,height:800});
  const latest = useRef(source); latest.current=source;
  const canvas = useRef<HTMLCanvasElement>(null);
  const [stroke,setStroke] = useState<number[][]>([]);
  const points = useRef<number[][]>([]);
  useEffect(() => {
    if (!source) return;
    let active = true;
    let opened: PdfDocument | undefined;
    openPdf(source.data).then(result => {
      if (!active) {void result.destroy(); return;}
      opened = result; setDoc(result); setPage(1);
    }).catch(e => active && setError(String(e)));
    return () => {active=false; void opened?.destroy();};
  },[source?.data]);
  useEffect(() => {
    if (!doc || !canvas.current) return;
    let active=true;
    let task: {cancel():void} | undefined;
    doc.getPage(page).then(async pdfPage => {
      if (!active || !canvas.current) return;
      const viewport=pdfPage.getViewport({scale:1});
      setSize(viewport);
      const target=canvas.current;
      target.width=Math.ceil(viewport.width); target.height=Math.ceil(viewport.height);
      const render=pdfPage.render({canvas:target,viewport}); task=render; await render.promise;
    }).catch(e=>active && setError(String(e)));
    return ()=>{active=false; task?.cancel();};
  },[doc,page]);
  const [ocrStatus, setOcrStatus] = useState('');
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);
  const scanned = source?.pages?.flatMap((p, i) => !p.text && !p.ocrComplete ? [i] : []) ?? [];
  async function recognizeScans() {
    if (!doc || !source?.pages || working) return;
    setWorking(true);
    setError('');
    let pageNumber = 0;
    try {
      for (const index of scanned) {
        if (!mounted.current || latest.current?.data !== source.data) break;
        pageNumber = index + 1;
        setOcrStatus('Reading page ' + pageNumber + ' of ' + doc.numPages + '…');
        const text = await recognizePage(doc, pageNumber);
        const current = latest.current;
        if (!mounted.current || current?.data !== source.data || !current.pages) break;
        const pages = current.pages.map((p, i) => i === index ? {...p, text, ocrComplete: true} : p);
        save({...current, pages});
      }
    } catch (err) {
      if (mounted.current) setError('Page ' + pageNumber + ': ' + String(err));
    } finally {
      if (mounted.current) { setWorking(false); setOcrStatus(''); }
    }
  }
  function position(e:React.PointerEvent<SVGSVGElement>) {
    const box=e.currentTarget.getBoundingClientRect();
    return [(e.clientX-box.left)*size.width/box.width,(e.clientY-box.top)*size.height/box.height];
  }
  function add(mark:PdfMark) {if(source) save({...source,marks:[...source.marks,mark]});}
  return <div className="overflow-auto p-3 space-y-3 text-xs">
    {!source && <label className="block"><input type="checkbox" checked={prepareOnImport} onChange={e=>setPrepareOnImport(e.target.checked)}/> Prepare Markdown on import</label>}
    {!source && <label>Attach PDF <input type="file" accept="application/pdf,.pdf" onChange={async e=>{
      const file=e.target.files?.[0]; if(!file)return;
      try {const data=await readFileData(file); const check=await openPdf(data); try {save({name:file.name,data,marks:[],pages:prepareOnImport ? await preparePages(check) : undefined});} finally {await check.destroy();}}
      catch(err){setError(String(err));}
    }}/></label>}
    {error && <p role="alert">{error}</p>}
    {source && <><strong>{source.name}</strong>
    <div className="flex flex-wrap gap-2 items-center">
      <button disabled={page<=1} onClick={()=>setPage(page-1)}>Previous</button>
      <span>{page} / {doc?.numPages}</span><button disabled={!doc || page>=doc.numPages} onClick={()=>setPage(page+1)}>Next</button>
      <select aria-label="PDF zoom" value={zoom} onChange={e=>setZoom(Number(e.target.value))}>{[1,1.5,2].map(z=><option key={z} value={z}>{z*100}%</option>)}</select>
      <select aria-label="Annotation tool" value={tool} onChange={e=>setTool(e.target.value as PdfMark['kind'])}><option value="ink">Pen</option><option value="text">Type</option><option value="highlight">Highlight</option></select>
      <button disabled={!source.marks.length} onClick={()=>save({...source,marks:source.marks.slice(0,-1)})}>Undo mark</button>
    </div>
    <div className="relative" style={{width:zoom*100+'%'}}><canvas className="w-full block" ref={canvas}/>
    <svg className="absolute inset-0 w-full h-full touch-none" viewBox={'0 0 '+size.width+' '+size.height}
      onPointerDown={e=>{const pt=position(e); if(tool==='text'){const text=window.prompt('Annotation text'); if(text)add({kind:tool,page,points:[pt],text});return;}
        e.currentTarget.setPointerCapture(e.pointerId);points.current=[pt];setStroke([pt]);}}
      onPointerMove={e=>{if(points.current.length){points.current.push(position(e));setStroke([...points.current]);}}}
      onPointerCancel={()=>{points.current=[];setStroke([]);}}
      onPointerUp={()=>{if(points.current.length){add({kind:tool,page,points:points.current});points.current=[];setStroke([]);}}}>
      {[...source.marks.filter(m=>m.page===page),{page,kind:tool,points:stroke,text:''}].filter(m=>m.points.length).map((m,i)=>m.kind==='text'
        ? <text key={i} x={m.points[0][0]} y={m.points[0][1]} fill="#273998" fontSize="14">{m.text}</text>
        : <polyline key={i} points={m.points.map(p=>p.join(',')).join(' ')} fill="none" stroke={m.kind==='ink'?'#2843ac':'#ffd025'} opacity={m.kind==='ink'?1:0.45} strokeWidth={m.kind==='ink'?2:15} strokeLinecap="round"/>)}
    </svg></div>
    {(!source.pages || source.pages.some(page => !page.structured)) && <button className="rounded-lg border border-[var(--border-subtle)] px-3 py-2 text-sm" disabled={working || !doc} onClick={async()=>{
      if(!doc)return;setWorking(true);try {const pages=await preparePages(doc); save({...latest.current!,pages});}
      catch(err){setError(String(err));}finally{setWorking(false);}
    }}>{working?'Preparing…':source.pages?'Rebuild Markdown':'Prepare Markdown'}</button>}
    {scanned.length > 0 && (isTauri() ? <button className="rounded-lg border border-[var(--border-subtle)] px-3 py-2 text-sm" disabled={working || !doc} onClick={recognizeScans}>
      Recognize scanned text ({scanned.length} {scanned.length === 1 ? 'page' : 'pages'})
    </button> : <p>Open this note in the desktop app to recognize scanned text offline.</p>)}
    {ocrStatus && <p role="status">{ocrStatus}</p>}
    {source.pages && <details><summary>Markdown and images</summary>{source.pages.map((p,i)=>(
      <section key={i} className="my-3 space-y-2">
        <strong>Page {i+1}</strong>
        {p.text ? <div className="space-y-2 overflow-x-auto [&_td]:border [&_td]:p-1 [&_th]:border [&_th]:p-1">
          <Markdown remarkPlugins={[remarkGfm]} components={{
            img: ({src,alt}) => {
              const figure = p.figures?.find(item => item.id === src);
              return figure ? <img src={figure.image} alt={alt ?? 'PDF figure'} /> : null;
            },
          }}>{p.text}</Markdown>
        </div> : <p>{p.ocrComplete ? 'No text recognized on this page.' : 'Image-only page. No selectable text.'}</p>}
        {p.image && <details><summary>Original page image</summary><img src={p.image} alt={'Original page '+(i+1)}/></details>}
      </section>
    ))}</details>}</>}

  </div>;
}
