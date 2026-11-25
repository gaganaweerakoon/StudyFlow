import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Clipboard, Download, FilePlus2, Maximize2, PenTool, RotateCcw, X, ZoomIn, ZoomOut } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { sanitizeSvgDiagram } from './svgDiagram';

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 2.5;
const ZOOM_STEP = 0.25;

export function AssistantDiagram({ markup }: { markup: string }) {
  const app = useApp();
  const svg = useMemo(() => sanitizeSvgDiagram(markup), [markup]);
  const dialog = useRef<HTMLDialogElement>(null);
  const [zoom, setZoom] = useState(1);
  const [modalZoom, setModalZoom] = useState(1);
  const [copied, setCopied] = useState(false);
  const [insertedNote, setInsertedNote] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 1800);
    return () => window.clearTimeout(timer);
  }, [copied]);

  useEffect(() => {
    if (!insertedNote) return;
    const timer = window.setTimeout(() => setInsertedNote(false), 2200);
    return () => window.clearTimeout(timer);
  }, [insertedNote]);

  if (!svg) {
    return (
      <div className="pip-diagram-fallback" role="status">
        This diagram could not be rendered cleanly. Ask Pip to redraw it as a simpler SVG.
      </div>
    );
  }

  const source = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);

  async function handleCopySvg() {
    if (!svg) return;
    try {
      await navigator.clipboard.writeText(svg);
      setCopied(true);
    } catch {
      // Ignore clipboard permission errors
    }
  }

  function handleInsertIntoNote() {
    if (!svg) return;
    const activeNote = app.notes.find((n) => n.id === app.selectedNoteId);
    const block = `\n\n### Study Diagram\n\n\`\`\`svg\n${svg}\n\`\`\`\n`;
    if (activeNote) {
      app.updateNote(activeNote.id, {
        content: `${activeNote.content.trimEnd()}${block}`,
        updatedAt: 'Just now',
      });
    } else {
      app.createNote(app.subjects[0]?.id ?? '', 'fld-all', {
        title: 'Pip Study Diagram',
        content: `### Study Diagram\n\n\`\`\`svg\n${svg}\n\`\`\`\n`,
        tags: ['Diagram'],
      });
    }
    setInsertedNote(true);
  }

  return (
    <figure className="pip-diagram-card">
      <div className="pip-diagram-toolbar">
        <span className="pip-diagram-label">SVG Diagram</span>
        <div className="pip-diagram-controls">
          <button
            type="button"
            className="pip-diagram-btn"
            onClick={() => setZoom((z) => Math.max(MIN_ZOOM, +(z - ZOOM_STEP).toFixed(2)))}
            disabled={zoom <= MIN_ZOOM}
            aria-label="Zoom out diagram"
            title="Zoom out"
          >
            <ZoomOut size={13} />
          </button>
          <button
            type="button"
            className="pip-diagram-zoom-readout tabular-nums"
            onClick={() => setZoom(1)}
            title="Reset zoom to 100%"
            aria-label={`Diagram zoom ${Math.round(zoom * 100)}%, click to reset`}
          >
            {Math.round(zoom * 100)}%
          </button>
          <button
            type="button"
            className="pip-diagram-btn"
            onClick={() => setZoom((z) => Math.min(MAX_ZOOM, +(z + ZOOM_STEP).toFixed(2)))}
            disabled={zoom >= MAX_ZOOM}
            aria-label="Zoom in diagram"
            title="Zoom in"
          >
            <ZoomIn size={13} />
          </button>
          <span className="pip-diagram-sep" aria-hidden="true" />
          <button
            type="button"
            className="pip-diagram-btn"
            onClick={() =>
              app.openStudyLab({
                tab: 'whiteboard',
                svg,
                title: 'Pip Diagram',
                targetNoteId: app.selectedNoteId ?? undefined,
              })
            }
            aria-label="Open diagram in Whiteboard Studio"
            title="Edit in Whiteboard"
          >
            <PenTool size={13} />
            <span>Whiteboard</span>
          </button>
          <button
            type="button"
            className="pip-diagram-btn"
            onClick={handleInsertIntoNote}
            aria-label="Insert diagram into active note"
            title="Insert into active note"
          >
            {insertedNote ? <Check size={13} /> : <FilePlus2 size={13} />}
            <span>{insertedNote ? 'Inserted' : 'To Note'}</span>
          </button>
          <button
            type="button"
            className="pip-diagram-btn"
            onClick={() => void handleCopySvg()}
            aria-label="Copy SVG code"
            title="Copy SVG code"
          >
            {copied ? <Check size={13} /> : <Clipboard size={13} />}
            <span>{copied ? 'Copied' : 'Copy SVG'}</span>
          </button>
          <a
            className="pip-diagram-btn"
            href={source}
            download="studyflow-diagram.svg"
            aria-label="Download SVG"
            title="Download SVG"
          >
            <Download size={13} />
            <span>SVG</span>
          </a>
          <button
            type="button"
            className="pip-diagram-btn"
            onClick={() => {
              setModalZoom(1);
              dialog.current?.showModal();
            }}
            aria-label="Expand diagram fullscreen"
            title="Expand diagram"
          >
            <Maximize2 size={13} />
          </button>
        </div>
      </div>

      <div className="pip-diagram-viewport">
        <div
          className="pip-diagram-stage"
          style={{ width: `${Math.round(zoom * 100)}%` }}
        >
          <img
            className="pip-diagram-img"
            src={source}
            alt="Diagram generated by Pip"
          />
        </div>
      </div>

      <dialog
        ref={dialog}
        aria-label="Expanded SVG diagram"
        className="pip-diagram-dialog"
        onClick={(e) => {
          if (e.target === dialog.current) dialog.current?.close();
        }}
      >
        <div className="pip-diagram-dialog-head">
          <span className="pip-diagram-label">Expanded Diagram</span>
          <div className="pip-diagram-controls">
            <button
              type="button"
              className="pip-diagram-btn"
              onClick={() => setModalZoom((z) => Math.max(MIN_ZOOM, +(z - ZOOM_STEP).toFixed(2)))}
              disabled={modalZoom <= MIN_ZOOM}
              aria-label="Zoom out expanded diagram"
            >
              <ZoomOut size={14} />
            </button>
            <button
              type="button"
              className="pip-diagram-zoom-readout tabular-nums"
              onClick={() => setModalZoom(1)}
              title="Reset zoom"
            >
              {Math.round(modalZoom * 100)}%
            </button>
            <button
              type="button"
              className="pip-diagram-btn"
              onClick={() => setModalZoom((z) => Math.min(MAX_ZOOM, +(z + ZOOM_STEP).toFixed(2)))}
              disabled={modalZoom >= MAX_ZOOM}
              aria-label="Zoom in expanded diagram"
            >
              <ZoomIn size={14} />
            </button>
            {modalZoom !== 1 && (
              <button
                type="button"
                className="pip-diagram-btn"
                onClick={() => setModalZoom(1)}
                aria-label="Reset zoom"
                title="Reset zoom"
              >
                <RotateCcw size={13} />
              </button>
            )}
            <span className="pip-diagram-sep" aria-hidden="true" />
            <button
              type="button"
              className="pip-diagram-btn"
              onClick={() => void handleCopySvg()}
            >
              {copied ? <Check size={13} /> : <Clipboard size={13} />}
              <span>{copied ? 'Copied' : 'Copy SVG'}</span>
            </button>
            <a
              className="pip-diagram-btn"
              href={source}
              download="studyflow-diagram.svg"
            >
              <Download size={13} />
              <span>Download</span>
            </a>
            <button
              type="button"
              className="pip-diagram-btn"
              onClick={() => dialog.current?.close()}
              aria-label="Close diagram"
            >
              <X size={15} />
            </button>
          </div>
        </div>
        <div className="pip-diagram-dialog-body">
          <div style={{ width: `${Math.round(modalZoom * 100)}%`, margin: '0 auto' }}>
            <img
              className="pip-diagram-img pip-diagram-img-expanded"
              src={source}
              alt="Expanded diagram generated by Pip"
            />
          </div>
        </div>
      </dialog>
    </figure>
  );
}
