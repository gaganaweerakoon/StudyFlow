import { createRoot } from 'react-dom/client';
import { getCurrentWindow } from '@tauri-apps/api/window';
import App from './App.tsx';
import type { WorkspaceSnapshot } from './context/AppContext';
import { isTauri, loadSnapshot, snapshotWriter } from './desktop/storage';
import './index.css';

const root = createRoot(document.getElementById('root')!);

async function start() {
  if (!isTauri()) {
    root.render(<App />);
    return;
  }

  root.render(<p role="status" className="p-5">Opening your StudyFlow workspace…</p>);
  try {
    const saved = await loadSnapshot<WorkspaceSnapshot>('workspace');
    const writer = snapshotWriter<WorkspaceSnapshot>('workspace', saved?.revision ?? 0);
    await getCurrentWindow().onCloseRequested(async event => {
      try {
        await writer.flush();
      } catch (error) {
        if (!window.confirm(`Workspace changes could not be saved. Close anyway?\n\n${String(error)}`)) {
          event.preventDefault();
        }
      }
    });
    root.render(<App workspace={{ initial: saved?.data, writer }} />);
  } catch (error) {
    root.render(
      <div className="space-y-3 p-5" role="alert">
        <h1>StudyFlow could not open your workspace</h1>
        <p>{String(error)}</p>
        <button type="button" className="underline" onClick={() => void start()}>Try again</button>
      </div>
    );
  }
}

void start();
