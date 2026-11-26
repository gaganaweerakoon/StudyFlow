import { invoke } from '@tauri-apps/api/core';
import { loadSnapshot } from '../../src/desktop/storage';
import type { WorkspaceSnapshot } from '../../src/context/AppContext';
import redoxPdf from './redox.pdf?raw';

async function waitFor<T>(description: string, read: () => T | Promise<T>, timeout = 90_000) {
  const deadline = Date.now() + timeout;
  do {
    const result = await read();
    if (result) return result;
    await new Promise(resolve => setTimeout(resolve, 250));
  } while (Date.now() < deadline);
  throw new Error('Timed out waiting for ' + description);
}

function send(box: HTMLTextAreaElement, message: string) {
  Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set?.call(box, message);
  box.dispatchEvent(new Event('input', { bubbles: true }));
  box.dispatchEvent(new Event('change', { bubbles: true }));
  setTimeout(() => box.dispatchEvent(new KeyboardEvent('keydown', { key:'Enter', bubbles:true })), 100);
}

export async function runNativeAcceptance() {
  const result = await loadSnapshot<{ passed: boolean }>('assistant_usage');
  if (result) return;
  async function record(passed: boolean, stage: string) {
    await invoke('save_snapshot', { document: 'assistant_usage', revision: 0, data: { passed, stage } });
  }
  let stage = 'configured chat';
  try {
    const box = await waitFor(stage, () => document.body.innerText.includes('Gemini configured') ?
      document.querySelector<HTMLTextAreaElement>('textarea[aria-label="Message Pip"]') : null);
    stage = 'one persisted calendar event';
    send(box, 'Schedule a Chemistry event named Sample lesson on January 10 2027 at 09:00 for one hour.');
    const before = await waitFor(stage, async () => {
      const saved = await loadSnapshot<WorkspaceSnapshot>('workspace');
      return saved?.data.sessions.length === 1 ? saved.data.sessions : undefined;
    });
    stage = 'synthetic PDF attachment';
    const picker = document.querySelector<HTMLInputElement>('input[type=file]');
    if (!picker) throw new Error(stage);
    const transfer = new DataTransfer();
    transfer.items.add(new File([new TextEncoder().encode(redoxPdf)], 'redox.pdf', { type:'application/pdf' }));
    picker.files = transfer.files;
    picker.dispatchEvent(new Event('change', { bubbles:true }));
    await waitFor(stage, () => document.body.innerText.includes('redox.pdf') && !document.body.innerText.includes('Reading PDF'));
    stage = 'saved Sinhala note and unchanged calendar';
    send(box, 'Save a Sinhala note from the attached PDF in Chemistry Unit 1. Explain oxidation and reduction in Sinhala.');
    const note = await waitFor(stage, async () => {
      const saved = await loadSnapshot<WorkspaceSnapshot>('workspace');
      const item = saved?.data.notes[0];
      if (!item) return;
      if (saved!.data.notes.length !== 1 || JSON.stringify(saved!.data.sessions) !== JSON.stringify(before) ||
          item.subjectId !== 'chem' || item.syllabusLinks?.unitIds?.join(',') !== 'redox' || !/[\u0d80-\u0dff]/u.test(item.content)) {
        throw new Error(stage);
      }
      return item;
    });
    stage = 'exact note link';
    const button = await waitFor(stage, () => [...document.querySelectorAll('button')].find(b => b.textContent?.trim() === 'Open note'));
    button.click();
    await waitFor(stage, () => document.querySelector('output[data-note]')?.getAttribute('data-note') === note.id);
    await record(true, 'SQLite, Sinhala content, destination, exact link and unchanged calendar');
  } catch {
    await record(false, stage);
  }
}
