import test from 'node:test';
import assert from 'node:assert/strict';
import type { IncomingMessage } from 'node:http';
import { isLoopbackApiClient, allowLocalServerKey } from './localApiPolicy.ts';
const req = (address: string, headers: IncomingMessage['headers']): Pick<IncomingMessage, 'headers' | 'socket'> => ({ headers, socket: {remoteAddress: address} as IncomingMessage['socket'] });
const local = req('127.0.0.1', {host: '127.0.0.1:3000', origin:'http://127.0.0.1:3000'});
const remote = req('192.168.1.2', {host:'127.0.0.1:3000'});
test('server secret is available only to a direct local API client', () => {
  assert.equal(isLoopbackApiClient(local), true);
  assert.equal(allowLocalServerKey(undefined, local, ()=>'secret'), 'secret');
  assert.equal(allowLocalServerKey(undefined, remote, ()=>'secret'), '');
  assert.equal(allowLocalServerKey('client-key', remote, ()=>'secret'), 'client-key');
});
test('rejects DNS rebinding, forwarded clients and cross-site origins', () => {
  for (const r of [req('127.0.0.1',{host:'evil.example'}), req('127.0.0.1',{host:'localhost:3000','x-forwarded-for':'192.168.0.10'}), req('::1',{host:'[::1]:3000',origin:'https://evil.example'}), req('127.0.0.1',{host:'localhost','sec-fetch-site':'cross-site'})]) {
    assert.equal(isLoopbackApiClient(r), false);
    assert.equal(allowLocalServerKey(undefined,r,()=>{throw new Error('must not access secret')}), '');
  }
});
