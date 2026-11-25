/** The user's source runs directly as a worker module; no eval or Function constructor. */
export function javascriptWorkerSource(code: string): string {
  return `let used = false;
self.onmessage = async () => {
  if (used) return;
  used = true;
  self.postMessage({type:'ready'});
  let stdout = '', stderr = '';
  const max = 64000;
  const fmt = arg => {
    if (typeof arg === 'string') return arg;
    try { return JSON.stringify(arg) ?? String(arg); } catch { return String(arg); }
  };
  const append = (previous, args) => previous.length >= max ? previous : (previous + args.map(fmt).join(' ') + '\\n').slice(0, max);
  const console = {
    log: (...args) => { stdout = append(stdout, args); },
    info: (...args) => { stdout = append(stdout, args); },
    warn: (...args) => { stderr = append(stderr, args); },
    error: (...args) => { stderr = append(stderr, args); },
  };
  try {
    const run = async (console) => {\n` + code + `\n};
    const ret = await run(console);
    self.postMessage({type:'result',result:{ok:true,stdout:stdout.trimEnd(),stderr:stderr.trimEnd(),returnValue:ret === undefined ? undefined : fmt(ret).slice(0,max)}});
  } catch(error) {
    self.postMessage({type:'result',result:{ok:false,stdout:stdout.trimEnd(),stderr:(stderr + String(error)).slice(0,max)}});
  }
};`;
}
