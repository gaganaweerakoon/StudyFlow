export interface WorkerResult {
  ok: boolean;
  stdout: string;
  stderr: string;
  returnValue?: string;
}
export type WorkerMessage = { type: 'ready' } | { type: 'result'; result: WorkerResult };
interface WorkerLike {
  onmessage: ((event: MessageEvent<WorkerMessage>) => void) | null;
  onerror: ((event: ErrorEvent) => void) | null;
  postMessage: (message: unknown) => void;
  terminate: () => void;
}

/** Each execution owns one disposable worker. Load and execution have separate hard deadlines. */
export function runDisposableWorker(
  factory: () => WorkerLike,
  code: string,
  options: { loadMs: number; runMs: number; onReady?: () => void },
): Promise<WorkerResult> {
  return new Promise(resolve => {
    let worker: WorkerLike;
    try { worker = factory(); }
    catch (error) { resolve({ok:false, stdout:'', stderr: error instanceof Error ? error.message : String(error)}); return; }
    let settled = false;
    let ready = false;
    let timer: ReturnType<typeof setTimeout>;
    const finish = (result: WorkerResult) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      worker.terminate();
      resolve(result);
    };
    const fail = (stderr: string) => finish({ok:false, stdout:'', stderr});
    timer = setTimeout(() => fail('Runtime initialization timed out.'), options.loadMs);
    worker.onmessage = event => {
      if (settled) return;
      if (event.data?.type === 'ready' && !ready) {
        ready = true;
        clearTimeout(timer);
        timer = setTimeout(() => fail('Execution timed out (check for infinite loops).'), options.runMs);
        options.onReady?.();
      } else if (event.data?.type === 'result') {
        finish(event.data.result);
      }
    };
    worker.onerror = event => fail(event.message || 'Worker execution failed.');
    try { worker.postMessage({code}); }
    catch (error) { fail(error instanceof Error ? error.message : String(error)); }
  });
}
