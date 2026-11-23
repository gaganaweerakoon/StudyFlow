import { useMemo, useRef } from 'react';
import { sanitizeSvgDiagram } from './svgDiagram';

export function AssistantDiagram({ markup }: { markup: string }) {
  const svg = useMemo(() => sanitizeSvgDiagram(markup), [markup]);
  const dialog = useRef<HTMLDialogElement>(null);

  if (!svg) return <p role="status">This diagram could not be displayed. Ask Pip for a simpler SVG.</p>;
  const source = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  return (
    <figure className="my-3 overflow-hidden rounded-lg border border-[var(--border-subtle)]">
      <img className="block max-h-96 w-full bg-white object-contain p-3" src={source} alt="Diagram from Pip" />
      <figcaption className="flex flex-wrap gap-3 p-2 text-sm">
        <button type="button" className="underline" onClick={() => dialog.current?.showModal()}>Expand diagram</button>
        <a className="underline" href={source} download="studyflow-diagram.svg">Download SVG</a>
      </figcaption>
      <dialog ref={dialog} aria-label="Expanded diagram"
        className="m-auto max-h-[90dvh] max-w-[94vw] overflow-auto rounded-xl bg-[var(--bg-surface)] p-4 text-[var(--text-primary)] backdrop:bg-black/60">
        <button type="button" className="mb-3 underline" onClick={() => dialog.current?.close()}>Close diagram</button>
        <img className="block max-h-[72dvh] max-w-[86vw] bg-white object-contain p-3" src={source} alt="Expanded diagram from Pip" />
      </dialog>
    </figure>
  );
}
