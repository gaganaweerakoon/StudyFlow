import assert from 'node:assert/strict';
import test from 'node:test';
import { createServer } from 'vite';
import { CHAT_ENDPOINT, PROVIDERS, type ChatEvent, type Provider } from '../src/assistant/protocol.ts';
import { studyAssistant } from './studyAssistant.ts';

const png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==';

const geminiEvents = [
  { candidates: [{ content: { parts: [{ thought: true, text: 'private reasoning' }, { text: 'Start with ' }] } }] },
  { candidates: [{ content: { parts: [{ text: '**chemistry**.' }] }, finishReason: 'STOP' }],
    usageMetadata: { promptTokenCount: 130, cachedContentTokenCount: 12, candidatesTokenCount: 8, thoughtsTokenCount: 3, totalTokenCount: 141 } },
];
function geminiSse(events: object[]) {
  const body = events.map(event => `data: ${JSON.stringify(event)}\n\n`).join('');
  return new Response(body, { headers: { 'Content-Type': 'text/event-stream' } });
}

test('the localhost assistant streams images, context, and normalized usage through Gemini', async t => {
  const server = await createServer({
    configFile: false, plugins: [studyAssistant()], server: { host: '127.0.0.1', port: 0, watch: null, hmr: false },
  });
  await server.listen();
  t.after(() => server.close());
  const address = server.httpServer?.address();
  assert.ok(address && typeof address === 'object');
  const origin = `http://127.0.0.1:${address.port}`;
  const realFetch = globalThis.fetch;
  const calls: { url: string; headers: Headers; body: Record<string, any> }[] = [];
  t.mock.method(globalThis, 'fetch', (url: string, init: RequestInit) => {
    if (url.startsWith(origin)) return realFetch(url, init);
    calls.push({ url, headers: new Headers(init.headers), body: JSON.parse(String(init.body)) });
    if (url.startsWith('https://generativelanguage.googleapis.com/')) {
      if (calls.at(-1)?.body.tools) return geminiSse([
        { candidates: [{ content: { parts: [{ functionCall: { name: 'create_event', args: { title: 'Chemistry', date: '2026-11-24', startHour: 7, durationHours: 1 } } }] }, finishReason: 'STOP' }] },
      ]);
      return geminiSse(geminiEvents);
    }
    throw new Error('Unexpected upstream');
  });

  const key = 'test-local-key';
  const base = {
    prompt: 'Help me plan my study session.',
    context: 'Open task: Chemistry revision. Due tomorrow.',
    history: [{ role: 'assistant', text: 'You could start with a short review.' }],
    image: { mime: 'image/png', base64: png, detail: 'high' },
    maxOutput: 650,
  } as const;
  function call(provider: Provider, changes = {}, requestOrigin = origin, auth = `Bearer ${key}`) {
    const body = { ...base, provider, model: PROVIDERS[provider].model, ...changes };
    return fetch(origin + CHAT_ENDPOINT, {
      method: 'POST',
      headers: { Origin: requestOrigin, 'Content-Type': 'application/json', Authorization: auth },
      body: JSON.stringify(body),
    });
  }

  {
    const response = await call('gemini');
    assert.equal(response.status, 200);
    assert.match(response.headers.get('Content-Type') ?? '', /ndjson/);
    const raw = await response.text();
    assert.ok(!raw.includes(key));
    const events: ChatEvent[] = raw.trim().split('\n').map(line => JSON.parse(line));
    assert.equal(events.flatMap(event => event.type === 'text' ? [event.text] : []).join(''), 'Start with **chemistry**.');
    assert.deepEqual(events.find(event => event.type === 'usage'), {
      type: 'usage', usage: { input: 130, output: 11, cached: 12, total: 141 },
    });
    assert.equal(events.at(-1)?.type, 'done');
  }

  const [gemini] = calls;
  assert.equal(gemini.headers.get('x-goog-api-key'), key);
  assert.ok(!gemini.url.includes(key));
  assert.equal(gemini.body.generationConfig.maxOutputTokens, 650);
  assert.equal(gemini.body.contents[0].role, 'model');
  assert.equal(gemini.body.contents[1].parts[1].inlineData.data, png);
  assert.match(gemini.body.contents[1].parts[0].text, /Open task: Chemistry/);

  assert.equal((await call('gemini', {}, 'https://unrelated.example')).status, 403);
  assert.equal((await call('gemini', {}, origin, '')).status, 401);
  assert.equal((await call('gemini', { context: 'x'.repeat(120001) })).status, 400);
  assert.equal((await call('gemini', { image: { ...base.image, mime: 'image/jpeg' } })).status, 400);
  assert.equal((await call('gemini', { model: 'gemini-3.1-flash-lite' })).status, 400);
  assert.equal((await call('openai', { model: PROVIDERS.gemini.model })).status, 400);
  assert.equal((await call('claude', { model: PROVIDERS.gemini.model })).status, 400);
  assert.equal(calls.length, 1);
  const structured = await call('gemini', {
    model: 'gemini-3.5-flash-lite',
    studyGeneration: 'flashcards',
    image: undefined,
    history: [],
    context: 'Selected source text',
  });
  await structured.text();
  const generation = calls[1].body;
  assert.equal(generation.generationConfig.responseMimeType, 'application/json');
  assert.deepEqual(generation.generationConfig.responseJsonSchema.properties.items.items.required, ['front', 'back']);
  assert.match(generation.systemInstruction.parts[0].text, /Do not greet/);
  assert.doesNotMatch(generation.systemInstruction.parts[0].text, /pip-edit/);
  assert.match(generation.contents[0].parts[0].text, /Selected source text/);
  const action = await call('gemini', { workspaceActions: true, image: undefined });
  const events = (await action.text()).trim().split('\n').map(line => JSON.parse(line));
  assert.deepEqual(events, [
    { type: 'action', action: 'create_event', arguments: { title: 'Chemistry', date: '2026-11-24', startHour: 7, durationHours: 1 } },
    { type: 'done', truncated: false },
  ]);
  assert.ok(calls.at(-1)?.body.tools[0].functionDeclarations.some((tool: { name: string }) => tool.name === 'create_event'));
  assert.equal((await call('gemini', { studyGeneration: 'bogus' })).status, 400);

});
