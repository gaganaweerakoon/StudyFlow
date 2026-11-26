// Isolated acceptance entry. The production index never imports this file.
import React from 'react';
import { createRoot } from 'react-dom/client';
import { AppProvider, useApp, type WorkspaceSnapshot } from '../../src/context/AppContext';
import { AssistantProvider } from '../../src/assistant/AssistantContext';
import { AssistantChat } from '../../src/assistant/AssistantChat';
import { AuthProvider } from '../../src/firebase/AuthContext';
import { isTauri, loadSnapshot, snapshotWriter } from '../../src/desktop/storage';
import { INITIAL_SUBJECTS } from '../../src/data/mockData';
import '../../src/index.css';

function Surface() {
  const app = useApp();
  return app.route === 'notes' ? <><button onClick={() => app.setRoute('assistant')}>Back to Pip</button><output data-note={app.selectedNoteId}>{app.notes.find(n => n.id === app.selectedNoteId)?.content}</output></> : <AssistantChat />;
}
async function start() {
  const native = isTauri();
  const saved = native ? await loadSnapshot<WorkspaceSnapshot>('workspace') : null;
  const synthetic = { subjects:[{...INITIAL_SUBJECTS[0],id:'chem',name:'Chemistry',code:'CHEM',chapters:[],units:[{id:'redox',title:'Redox'}]}] };
  const initial = saved?.data ?? (native ? null : JSON.parse(localStorage.getItem('disposable') ?? 'null')) ?? synthetic;
  const writer = native ? snapshotWriter<WorkspaceSnapshot>('workspace', saved?.revision ?? 0) : {
    async flush() {},
    async save(data: WorkspaceSnapshot) {
      if (sessionStorage.getItem('failSave')) throw Error('Disposable storage failure');
      localStorage.setItem('disposable', JSON.stringify(data));
    },
  };
  createRoot(document.getElementById('root')!).render(<AppProvider workspace={{initial, writer}}>
    <AuthProvider><AssistantProvider><Surface /></AssistantProvider></AuthProvider>
  </AppProvider>);
}
void start();
