import type { WorkerMessage } from './workerRun';
const scope = globalThis as unknown as {
  onmessage: ((event: MessageEvent<{ code: string }>) => void) | null;
  postMessage(message: WorkerMessage): void;
};
const base = 'https://cdn.jsdelivr.net/pyodide/v0.27.5/full/';
const maxOutput = 64_000;
let running = false;
scope.onmessage = async event => {
  if (running) return;
  running = true;
  let stdout = '', stderr = '';
  try {
    const url = base + 'pyodide.mjs';
    const mod = await import(/* @vite-ignore */ url) as { loadPyodide(opts: {indexURL: string}): Promise<{
      runPythonAsync(code: string): Promise<unknown>;
      setStdout(options: {batched(line: string): void}): void;
      setStderr(options: {batched(line: string): void}): void;
    }> };
    const python = await mod.loadPyodide({indexURL: base});
    python.setStdout({batched: line => { if (stdout.length < maxOutput) stdout = (stdout + line + '\n').slice(0,maxOutput); }});
    python.setStderr({batched: line => { if (stderr.length < maxOutput) stderr = (stderr + line + '\n').slice(0,maxOutput); }});
    scope.postMessage({type:'ready'});
    const result = await python.runPythonAsync(event.data.code);
    const returnValue = result == null ? undefined : String(result).slice(0,maxOutput);
    scope.postMessage({type:'result', result:{ok:true, stdout:stdout.trimEnd(), stderr:stderr.trimEnd(), returnValue}});
  } catch (error) {
    scope.postMessage({type:'result',result:{ok:false, stdout, stderr:(stderr + '\n' + (error instanceof Error ? error.message : String(error))).trim().slice(0,maxOutput)}});
  }
};
