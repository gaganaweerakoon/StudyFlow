import assert from 'node:assert/strict';
import test from 'node:test';
import { createServer } from 'vite';
import { CHAT_ENDPOINT, PROVIDERS, type ChatEvent, type Provider } from '../src/assistant/protocol.ts';
import { studyAssistant } from './studyAssistant.ts';

const png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==';

const openaiEvents = [
  { type: 'response.output_text.delta', delta: 'Start with ' },
  { type: 'response.output_text.delta', delta: '**chemistry**.' },
  { type: 'response.completed', response: { usage: {
    input_tokens: 130, input_tokens_details: { cached_tokens: 12 }, output_tokens: 11, total_tokens: 141,
  } } },
];
const geminiEvents = [
  { candidates: [{ content: { parts: [{ thought: true, text: 'private reasoning' }, { text: 'Start with ' }] } }] },
  { candidates: [{ content: { parts: [{ text: '**chemistry**.' }] }, finishReason: 'STOP' }],
    usageMetadata: { promptTokenCount: 130, cachedContentTokenCount: 12, candidatesTokenCount: 8, thoughtsTokenCount: 3, totalTokenCount: 141 } },
];
const claudeEvents = [
  { type: 'message_start', message: { usage: { input_tokens: 110, cache_creation_input_tokens: 8, cache_read_input_tokens: 12, output_tokens: 0 } } },
  { type: 'content_block_delta', delta: { type: 'text_delta', text: 'Start with ' } },
  { type: 'content_block_delta', delta: { type: 'text_delta', text: '**chemistry**.' } },
  { type: 'message_delta', delta: { stop_reason: 'end_turn' }, usage: { output_tokens: 11 } },
  { type: 'message_stop' },
];

function sse(events: object[]) {
  const text = events.map(event => `event: message\r\ndata: ${JSON.stringify(event)}`).join('\r\n\r\n');
  const chunks = text.match(/.{1,13}|\r|\n/g) ?? [];
  return new Response(new ReadableStream({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(new TextEncoder().encode(chunk));
      controller.close();
    },
  }), { headers: { 'Content-Type': 'text/event-stream' } });
}

test('the localhost assistant streams images, context, and normalized usage through each provider', async t => {
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
    if (url.startsWith('https://api.openai.com/')) return sse(openaiEvents);
    if (url.startsWith('https://generativelanguage.googleapis.com/')) return sse(geminiEvents);
    if (url.startsWith('https://api.anthropic.com/')) return sse(claudeEvents);
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

  for (const provider of Object.keys(PROVIDERS) as Provider[]) {
    const response = await call(provider);
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

  const [openai, gemini, claude] = calls;
  assert.equal(openai.headers.get('authorization'), `Bearer ${key}`);
  assert.equal(openai.body.max_output_tokens, 650);
  assert.equal(openai.body.store, false);
  assert.ok(openai.body.input[1].content[1].image_url.endsWith(png));
  assert.match(openai.body.input[1].content[0].text, /Open task: Chemistry/);
  assert.equal(gemini.headers.get('x-goog-api-key'), key);
  assert.ok(!gemini.url.includes(key));
  assert.equal(gemini.body.generationConfig.maxOutputTokens, 650);
  assert.equal(gemini.body.contents[0].role, 'model');
  assert.equal(gemini.body.contents[1].parts[1].inlineData.data, png);
  assert.equal(claude.headers.get('x-api-key'), key);
  assert.equal(claude.body.max_tokens, 650);
  assert.equal(claude.body.messages[1].content[1].source.data, png);

  assert.equal((await call('openai', {}, 'https://unrelated.example')).status, 403);
  assert.equal((await call('openai', {}, origin, '')).status, 401);
  assert.equal((await call('openai', { context: 'x'.repeat(120001) })).status, 400);
  assert.equal((await call('openai', { image: { ...base.image, mime: 'image/jpeg' } })).status, 400);
  assert.equal((await call('gemini', { model: '../wrong-host' })).status, 400);
  assert.equal(calls.length, 3);
  const structured = await call('gemini', {
    model: 'gemini-3.1-flash-lite',
    studyGeneration: 'flashcards',
    image: undefined,
    history: [],
    context: 'Selected source text',
  });
  await structured.text();
  const generation = calls[3].body;
  assert.equal(generation.generationConfig.responseMimeType, 'application/json');
  assert.deepEqual(generation.generationConfig.responseJsonSchema.properties.items.items.required, ['front', 'back']);
  assert.match(generation.systemInstruction.parts[0].text, /Do not greet/);
  assert.doesNotMatch(generation.systemInstruction.parts[0].text, /pip-edit/);
  assert.match(generation.contents[0].parts[0].text, /Selected source text/);
  assert.equal((await call('gemini', { studyGeneration: 'bogus' })).status, 400);

});
