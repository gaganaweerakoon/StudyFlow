import { createRoot } from 'react-dom/client';
import { getCurrentWindow } from '@tauri-apps/api/window';
import App from './App.tsx';
import type { Conversation } from './assistant/AssistantContext';
import type { UsageEntry } from './assistant/usage';
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
    const [saved, usage, history] = await Promise.all([
      loadSnapshot<WorkspaceSnapshot>('workspace'),
      loadSnapshot<{ records: UsageEntry[] }>('assistant_usage'),
      loadSnapshot<{ conversations: Conversation[] }>('assistant_history'),
    ]);
    const usageWriter = snapshotWriter<{ records: UsageEntry[] }>('assistant_usage', usage?.revision ?? 0);
    const historyWriter = snapshotWriter<{ conversations: Conversation[] }>('assistant_history', history?.revision ?? 0);
    const writer = snapshotWriter<WorkspaceSnapshot>('workspace', saved?.revision ?? 0);
    await getCurrentWindow().onCloseRequested(async event => {
      try {
        await Promise.all([writer.flush(), usageWriter.flush(), historyWriter.flush()]);
      } catch (error) {
        if (!window.confirm(`Workspace changes could not be saved. Close anyway?\n\n${String(error)}`)) {
          event.preventDefault();
        }
      }
    });
    root.render(<App
      workspace={{ initial: saved?.data, writer }}
      desktopHistory={{ conversations: history?.data.conversations ?? [], save: conversations => historyWriter.save({ conversations }) }}
      desktopUsage={{ records: usage?.data.records ?? [], save: records => usageWriter.save({ records }) }}
    />);
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
