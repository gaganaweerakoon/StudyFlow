import { useMemo, useState } from 'react';
import { sanitizeSvgDiagram } from './svgDiagram';

/** Notes render sanitized SVG as an image, not executable HTML or a second editor. */
export function NoteDiagram({markup}: {markup: string}) {
  const diagram = useMemo(() => {
    if (typeof window === 'undefined' || typeof DOMParser === 'undefined') return null;
    const svg = sanitizeSvgDiagram(markup);
    if (!svg) return null;
    const root = new DOMParser().parseFromString(svg,'image/svg+xml').documentElement;
    const label = [root.querySelector('title')?.textContent,root.querySelector('desc')?.textContent].filter(Boolean).join(' — ').trim().slice(0,500) || 'Study diagram';
    return {svg,label,source:'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg)};
  },[markup]);
  const [failedSource, setFailedSource] = useState('');
  if (!diagram || diagram.source === failedSource) return <div role="status" className="rounded-lg border border-[var(--border-subtle)] p-3 text-xs text-[var(--text-muted)]">Unable to render this SVG. The original diagram remains in the Markdown source.</div>;
  return <figure className="my-4 rounded-lg border border-[var(--border-subtle)] overflow-hidden">
    <div className="bg-white p-3 overflow-auto"><img src={diagram.source} alt={diagram.label} onError={()=>setFailedSource(diagram.source)} className="block max-w-full h-auto max-h-[600px] mx-auto object-contain"/></div>
    <figcaption className="flex flex-wrap justify-between gap-2 px-3 py-2 text-xs text-[var(--text-secondary)] bg-[var(--bg-surface-subtle)]"><span>{diagram.label}</span><a href={diagram.source} download="studyflow-diagram.svg" className="text-[var(--accent)]">Save SVG</a></figcaption>
  </figure>;
}
