import test from 'node:test';
import assert from 'node:assert/strict';
import { runDisposableWorker, type WorkerMessage } from './workerRun.ts';
function fake(onRun: (emit:(msg:WorkerMessage)=>void)=>void) {
  let stopped = 0;
  const worker = {
    onmessage: null as ((event:MessageEvent<WorkerMessage>)=>void)|null,
    onerror: null as ((event:ErrorEvent)=>void)|null,
    postMessage() { onRun(msg=>worker.onmessage?.({data:msg} as MessageEvent<WorkerMessage>)); },
    terminate() { stopped++; },
  };
  return {worker, stopped:()=>stopped};
}
test('successful worker output terminates the worker', async()=>{
  const f=fake(emit=>{emit({type:'ready'});emit({type:'result',result:{ok:true,stdout:'42',stderr:''}})});
  const r=await runDisposableWorker(()=>f.worker,'print(42)',{loadMs:100,runMs:100});
  assert.equal(r.stdout,'42'); assert.equal(f.stopped(),1);
});
test('hung runtime initialization terminates', async()=>{
  const f=fake(()=>{});
  const r=await runDisposableWorker(()=>f.worker,'pass',{loadMs:5,runMs:100});
  assert.equal(r.ok,false); assert.match(r.stderr,/initialization timed out/); assert.equal(f.stopped(),1);
});
test('infinite execution and repeated ready messages cannot extend deadline', async()=>{
  const f=fake(emit=>{emit({type:'ready'});emit({type:'ready'});});
  const r=await runDisposableWorker(()=>f.worker,'while True: pass',{loadMs:100,runMs:5});
  assert.equal(r.ok,false); assert.match(r.stderr,/Execution timed out/); assert.equal(f.stopped(),1);
});
