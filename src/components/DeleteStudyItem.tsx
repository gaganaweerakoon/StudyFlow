import { useState } from 'react';
import { Trash2 } from 'lucide-react';

export function DeleteStudyItem({ label, detail, onDelete }: { label: string; detail: string; onDelete: () => void }) {
  const [confirming, setConfirming] = useState(false);
  if (!confirming) return <button type="button" title={`Delete ${label}`} aria-label={`Delete ${label}`}
    className="p-1.5 rounded hover:bg-[var(--bg-surface-hover)]" onClick={() => setConfirming(true)}>
    <Trash2 size={15} />
  </button>;
  return <div className="flex flex-wrap items-center gap-2 text-xs" onKeyDown={e => { if (e.key === 'Escape') setConfirming(false); }}>
    <span>Delete {label}{detail}?</span>
    <button type="button" autoFocus onClick={() => setConfirming(false)}>Cancel</button>
    <button type="button" className="text-red-500" onClick={() => { setConfirming(false); onDelete(); }}>Delete</button>
  </div>;
}
