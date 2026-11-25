import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { javascriptWorkerSource } from './javascriptWorkerSource.ts';
async function run(code: string) {
  const messages: any[] = [];
  const self: any = {postMessage:(m:unknown)=>messages.push(m)};
  vm.runInNewContext(javascriptWorkerSource(code), {self});
  await self.onmessage();
  return messages;
}
test('worker runs async code without dynamic eval and preserves return values', async()=>{
  const messages=await run('console.log(await Promise.resolve(42)); return {answer:42};');
  assert.equal(messages[0].type,'ready'); assert.equal(messages[1].result.stdout,'42');
  assert.equal(messages[1].result.returnValue,'{"answer":42}');
  assert.doesNotMatch(javascriptWorkerSource('return 1;'),/new Function|eval\(/);
});
test('worker reports runtime errors and bounds output',async()=>{
  const error=await run('throw new Error("bad")'); assert.match(error[1].result.stderr,/bad/);
  const large=await run('console.log("x".repeat(80000));'); assert.equal(large[1].result.stdout.length,64000);
});
