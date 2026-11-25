import { useState } from 'react';
import { FileText, Sparkles } from 'lucide-react';
import { SyllabusDeepImportModal } from './SyllabusDeepImportModal';

export function SyllabusImport({ subject }: { subject: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] p-3 flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-[var(--accent-soft)] text-[var(--accent)] flex items-center justify-center shrink-0">
            <FileText size={15} />
          </div>
          <div className="min-w-0">
            <div className="text-[13px] font-semibold text-[var(--text-primary)]">
              Import Course Syllabus PDF / DOCX
            </div>
            <p className="text-[11.5px] text-[var(--text-muted)]">
              Extract exam dates, weights, deadlines, syllabus units &amp; goals — review and approve before adding.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-[var(--accent)] text-[var(--accent-fg)] text-[12px] font-semibold hover:bg-[var(--accent-hover)] whitespace-nowrap"
        >
          <Sparkles size={13} />
          <span>Import Syllabus</span>
        </button>
      </div>

      <SyllabusDeepImportModal
        open={open}
        onClose={() => setOpen(false)}
        defaultSubjectId={subject}
      />
    </>
  );
}
