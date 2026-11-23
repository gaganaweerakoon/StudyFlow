import {isTauri} from '@tauri-apps/api/core';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {useEffect, useRef, useState} from 'react';
import {openPdf, preparePages, readFileData, recognizePage, type PdfDocument, type PdfSource, type PdfMark} from './pdf';

type ViewerState = NonNullable<PdfSource['viewer']>;

function PageThumbnail({ doc, page }: { doc: PdfDocument; page: number }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    let active = true;
    let task: { cancel(): void } | undefined;
    void doc.getPage(page).then(pdfPage => {
      if (!active || !canvas.current) return;
      const target = canvas.current;
      const width = pdfPage.getViewport({ scale: 1 }).width;
      const viewport = pdfPage.getViewport({ scale: 84 / width });
      target.width = Math.ceil(viewport.width);
      target.height = Math.ceil(viewport.height);
      const rendering = pdfPage.render({ canvas: target, viewport });
      task = rendering;
      return rendering.promise;
    }).catch(() => {});
    return () => { active = false; task?.cancel(); };
  }, [doc, page]);
  return <canvas ref={canvas} className="mx-auto max-h-24 max-w-full bg-white" aria-hidden="true" />;
}

export function PdfPanel({source, save}: {source?:PdfSource; save:(next:PdfSource)=>void}) {
  const [prepareOnImport,setPrepareOnImport] = useState(false);
  const [working,setWorking] = useState(false);
  const [doc,setDoc] = useState<PdfDocument>();
  const [viewer, setViewer] = useState<ViewerState>(source?.viewer ?? { page: 1, zoom: 0, rotation: 0 });
  const { page, zoom, rotation } = viewer;
  const [readerOpen, setReaderOpen] = useState(false);
  const [showMarkdown, setShowMarkdown] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const reader = useRef<HTMLDivElement>(null);
  const [readerWidth, setReaderWidth] = useState(650);
  const [query, setQuery] = useState('');
  const [matches, setMatches] = useState<number[]>();
  const [searching, setSearching] = useState(false);
  const searchSequence = useRef(0);
  const textCache = useRef(new Map<number, string>());
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
      opened = result;
      textCache.current.clear();
      setDoc(result);
      const saved = latest.current?.viewer ?? { page: 1, zoom: 0, rotation: 0 };
      setViewer({ ...saved, page: Math.min(result.numPages, Math.max(1, saved.page)) });
    }).catch(e => active && setError(String(e)));
    return () => {active=false; void opened?.destroy();};
  },[source?.data]);
  useEffect(() => {
    if (!readerOpen || !dialog.current || !reader.current) return;
    const panel = dialog.current;
    const surface = reader.current;
    panel.showModal();
    const resize = new ResizeObserver(entries => setReaderWidth(Math.max(100, entries[0].contentRect.width - 32)));
    resize.observe(surface);
    return () => {
      resize.disconnect();
      if (panel.open) panel.close();
    };
  }, [readerOpen]);
  useEffect(() => {
    if (!readerOpen || !doc || !canvas.current) return;
    let active=true;
    let task: {cancel():void} | undefined;
    doc.getPage(page).then(async pdfPage => {
      if (!active || !canvas.current) return;
      const original = pdfPage.getViewport({ scale: 1 });
      setSize(original);
      const viewport = pdfPage.getViewport({ scale: Math.min(3, window.devicePixelRatio * Math.max(1, zoom)) });
      const target=canvas.current;
      target.width=Math.ceil(viewport.width); target.height=Math.ceil(viewport.height);
      const render=pdfPage.render({canvas:target,viewport}); task=render; await render.promise;
    }).catch(e=>active && setError(String(e)));
    return ()=>{active=false; task?.cancel();};
  },[doc,page,readerOpen,zoom]);
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
  function changeViewer(patch: Partial<ViewerState>) {
    const next = { ...viewer, ...patch };
    setViewer(next);
    const current = latest.current;
    if (current) save({ ...current, viewer: next });
  }

  async function search(query: string) {
    const sequence = ++searchSequence.current;
    const needle = query.trim().toLocaleLowerCase();
    if (!doc || !needle) { setMatches(undefined); setSearching(false); return; }
    setSearching(true);
    try {
      const found: number[] = [];
      for (let number = 1; number <= doc.numPages; number++) {
        if (sequence !== searchSequence.current) return;
        let text = textCache.current.get(number);
        if (text === undefined) {
          text = latest.current?.pages?.[number - 1]?.text ||
            (await (await doc.getPage(number)).getTextContent()).items.map(item => item.str ?? '').join(' ');
          textCache.current.set(number, text);
        }
        if (text.toLocaleLowerCase().includes(needle)) found.push(number);
      }
      if (sequence === searchSequence.current) setMatches(found);
    } catch {
      if (sequence === searchSequence.current) setError('Could not search this document.');
    } finally {
      if (sequence === searchSequence.current) setSearching(false);
    }
  }

  function position(event: React.PointerEvent<SVGSVGElement>) {
    const transform = event.currentTarget.getScreenCTM();
    if (!transform) return [0, 0];
    const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(transform.inverse());
    return [Math.max(0, Math.min(size.width, point.x)), Math.max(0, Math.min(size.height, point.y))];
  }
  function add(mark: PdfMark) {
    const current = latest.current;
    if (current) save({ ...current, marks: [...current.marks, mark] });
  }
  const sideways = rotation % 180 !== 0;
  const scale = zoom || readerWidth / (sideways ? size.height : size.width);
  const width = size.width * scale;
  const height = size.height * scale;
  const toolsClass = 'rounded-lg border border-[var(--border-subtle)] px-3 py-1.5 disabled:opacity-40';
  const nearby = doc ? Array.from({ length: Math.min(doc.numPages, 7) }, (_, index) =>
    Math.max(1, Math.min(page - 3, doc.numPages - 6)) + index) : [];
  return <div className="overflow-auto p-3 space-y-3 text-xs">
    {!source && <label className="block"><input type="checkbox" checked={prepareOnImport} onChange={e=>setPrepareOnImport(e.target.checked)}/> Prepare Markdown on import</label>}
    {!source && <label>Attach PDF <input type="file" accept="application/pdf,.pdf" onChange={async e=>{
      const file=e.target.files?.[0]; if(!file)return;
      try {const data=await readFileData(file); const check=await openPdf(data); try {save({name:file.name,data,marks:[],pages:prepareOnImport ? await preparePages(check) : undefined});} finally {await check.destroy();}}
      catch(err){setError(String(err));}
    }}/></label>}
    {error && <p role="alert">{error}</p>}
    {source && <>
    <div className="flex flex-wrap items-center gap-3">
      <strong className="break-all">{source.name}</strong>
      <button type="button" className={toolsClass} onClick={() => setReaderOpen(true)}>Open PDF reader</button>
    </div>
    {readerOpen && <dialog ref={dialog} aria-label="PDF reader"
      onClose={() => { setReaderOpen(false); searchSequence.current++; setSearching(false); }}
      className="fixed inset-0 m-auto h-[min(92dvh,1000px)] w-[min(96vw,1280px)] overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] backdrop:bg-black/60">
      <div className="flex h-full flex-col">
        <header className="flex flex-wrap items-center gap-2 border-b border-[var(--border-subtle)] p-3">
          <strong className="mr-auto max-w-64 truncate">{source.name}</strong>
          <button type="button" className={toolsClass} disabled={page <= 1} onClick={() => changeViewer({ page: page - 1 })}>Previous</button>
          <label className="flex items-center gap-1">Page
            <select aria-label="Page" className={toolsClass} value={page} onChange={event => changeViewer({ page: Number(event.target.value) })}>
              {Array.from({ length: doc?.numPages ?? 1 }, (_, index) => <option key={index} value={index + 1}>{index + 1}</option>)}
            </select>
            / {doc?.numPages ?? '…'}
          </label>
          <button type="button" className={toolsClass} disabled={!doc || page >= doc.numPages} onClick={() => changeViewer({ page: page + 1 })}>Next</button>
          <select aria-label="PDF zoom" className={toolsClass} value={zoom} onChange={event => changeViewer({ zoom: Number(event.target.value) })}>
            <option value={0}>Fit width</option>
            {[0.75, 1, 1.25, 1.5, 2].map(value => <option key={value} value={value}>{value * 100}%</option>)}
          </select>
          <button type="button" className={toolsClass} onClick={() => changeViewer({ rotation: (rotation + 90) % 360 })}>Rotate</button>
          <button type="button" className={toolsClass} onClick={() => dialog.current?.close()}>Close reader</button>
        </header>
        <div className="flex flex-wrap items-center gap-2 border-b border-[var(--border-subtle)] p-3">
          <select aria-label="Annotation tool" className={toolsClass} value={tool} onChange={event => setTool(event.target.value as PdfMark['kind'])}>
            <option value="ink">Pen</option><option value="text">Type</option><option value="highlight">Highlight</option>
          </select>
          <button type="button" className={toolsClass} disabled={!source.marks.length} onClick={() => save({ ...source, marks: source.marks.slice(0, -1) })}>Undo mark</button>
          <form className="flex min-w-0 flex-wrap gap-2" onSubmit={event => { event.preventDefault(); void search(query); }}>
            <input type="search" aria-label="Find in PDF" placeholder="Find in PDF" value={query} className={toolsClass}
              onChange={event => { searchSequence.current++; setSearching(false); setMatches(undefined); setQuery(event.target.value); }} />
            <button type="submit" disabled={!doc || searching || !query.trim()} className={toolsClass}>{searching ? 'Searching…' : 'Search'}</button>
          </form>
          {matches && (matches.length ? <select className={toolsClass} aria-label="Search results" value={matches.includes(page) ? page : ''}
            onChange={event => changeViewer({ page: Number(event.target.value) })}>
            <option value="" disabled>{matches.length} matching pages</option>
            {matches.map(number => <option key={number} value={number}>Page {number}</option>)}
          </select> : <p role="status">No matching text.</p>)}
          {source.pages && <button type="button" className={toolsClass} aria-pressed={showMarkdown} onClick={() => setShowMarkdown(value => !value)}>Markdown</button>}
        </div>
        {error && <p role="alert" className="p-2">{error}</p>}
        <div className="flex min-h-0 flex-1">
          {doc && <nav aria-label="Page thumbnails" className="hidden w-28 shrink-0 overflow-y-auto border-r border-[var(--border-subtle)] p-2 sm:block">
            {nearby.map(number => <button type="button" key={number} aria-current={number === page ? 'page' : undefined}
              className="my-1 grid w-full justify-items-center gap-1 rounded-lg border border-[var(--border-subtle)] p-2 aria-[current=page]:border-[var(--accent)]"
              onClick={() => changeViewer({ page: number })}><PageThumbnail doc={doc} page={number} /><span>Page {number}</span></button>)}
          </nav>}
          <div ref={reader} className="min-w-0 flex-1 overflow-auto bg-[var(--bg-canvas)] p-4">
            <div className="relative mx-auto" style={{ width: sideways ? height : width, height: sideways ? width : height }}>
              <div className="absolute left-1/2 top-1/2 bg-white" style={{ width, height, transform: `translate(-50%, -50%) rotate(${rotation}deg)` }}>
                <canvas className="block size-full" ref={canvas} />
    <svg className="absolute inset-0 w-full h-full touch-none" viewBox={'0 0 '+size.width+' '+size.height}
      onPointerDown={e=>{const pt=position(e); if(tool==='text'){const text=window.prompt('Annotation text'); if(text)add({kind:tool,page,points:[pt],text});return;}
        e.currentTarget.setPointerCapture(e.pointerId);points.current=[pt];setStroke([pt]);}}
      onPointerMove={e=>{if(points.current.length){points.current.push(position(e));setStroke([...points.current]);}}}
      onPointerCancel={()=>{points.current=[];setStroke([]);}}
      onPointerUp={()=>{if(points.current.length){add({kind:tool,page,points:points.current});points.current=[];setStroke([]);}}}>
      {[...source.marks.filter(m=>m.page===page),{page,kind:tool,points:stroke,text:''}].filter(m=>m.points.length).map((m,i)=>m.kind==='text'
        ? <text key={i} x={m.points[0][0]} y={m.points[0][1]} fill="#273998" fontSize="14">{m.text}</text>
        : <polyline key={i} points={m.points.map(p=>p.join(',')).join(' ')} fill="none" stroke={m.kind==='ink'?'#2843ac':'#ffd025'} opacity={m.kind==='ink'?1:0.45} strokeWidth={m.kind==='ink'?2:15} strokeLinecap="round"/>)}
    </svg>
              </div>
            </div>
          </div>
          {showMarkdown && <aside className="w-1/3 min-w-32 max-w-sm shrink-0 overflow-auto border-l border-[var(--border-subtle)] p-3">
            <h3 className="font-semibold">Page {page} Markdown</h3>
            <pre className="mt-3 whitespace-pre-wrap break-words">{source.pages?.[page - 1]?.text || 'No text is available for this page.'}</pre>
          </aside>}
        </div>
      </div>
    </dialog>}

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
