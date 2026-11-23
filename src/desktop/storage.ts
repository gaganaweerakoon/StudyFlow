import { invoke, isTauri } from '@tauri-apps/api/core';

type Document = 'workspace' | 'assistant_usage' | 'assistant_history';
export { isTauri };

export interface StoredSnapshot<T> {
  revision: number;
  data: T;
}

export function loadSnapshot<T>(document: Document) {
  return invoke<StoredSnapshot<T> | null>('load_snapshot', { document });
}

export function snapshotWriter<T>(document: Document, revision: number) {
  let pending: { data: T } | undefined;
  let running: Promise<void> | undefined;
  function flush(): Promise<void> {
    if (running) return running;
    running = (async () => {
      while (pending) {
        const snapshot = pending;
        revision = await invoke<number>('save_snapshot', { document, revision, data: snapshot.data });
        if (pending === snapshot) pending = undefined;
      }
    })().finally(() => { running = undefined; });
    return running;
  }
  return {
    flush,
    save(data: T) {
      pending = { data };
      return flush();
    },
  };
}
