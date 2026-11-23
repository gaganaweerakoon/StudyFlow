import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Plugin } from 'vite';
import { CHAT_ENDPOINT, CHAT_LIMITS, isModelId, isProvider, type ChatEvent, type ChatRequest } from '../src/assistant/protocol.ts';
import { streamProvider } from './studyAssistantProviders.ts';

function isLocalRequest(req: IncomingMessage) {
  const localAddresses = ['127.0.0.1', '::1', '::ffff:127.0.0.1'];
  if (!localAddresses.includes(req.socket.remoteAddress ?? '')) return false;
  if (!/^(?:localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/.test(req.headers.host ?? '')) return false;
  return req.headers.origin === `http://${req.headers.host}` && req.headers['sec-fetch-site'] !== 'cross-site';
}

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function isRequest(value: unknown): value is ChatRequest {
  if (!isObject(value) || !isProvider(value.provider) || !isModelId(value.model)) return false;
  const { prompt, context, history, image, maxOutput } = value;
  if (typeof prompt !== 'string' || !prompt.trim() || prompt.length > CHAT_LIMITS.prompt ||
      typeof context !== 'string' || context.length > CHAT_LIMITS.context ||
      !Array.isArray(history) || history.length > CHAT_LIMITS.history ||
      !CHAT_LIMITS.response.some(limit => limit === maxOutput)) return false;
  if (!history.every(turn => isObject(turn) && (turn.role === 'user' || turn.role === 'assistant') &&
      typeof turn.text === 'string' && turn.text.length <= CHAT_LIMITS.historyMessage)) return false;
  if (value.workspaceActions !== undefined && typeof value.workspaceActions !== 'boolean') return false;
  if (value.studyGeneration !== undefined && !['flashcards', 'practice', 'syllabus', 'grading'].some(kind => kind === value.studyGeneration)) return false;
  if (value.clientContext !== undefined && (typeof value.clientContext !== 'string' || value.clientContext.length > 300)) return false;
  if (value.generateImage !== undefined && typeof value.generateImage !== 'boolean') return false;
  if (image === undefined) return true;
  if (!isObject(image) || (image.mime !== 'image/png' && image.mime !== 'image/jpeg') ||
      (image.detail !== 'standard' && image.detail !== 'high') || typeof image.base64 !== 'string') return false;
  const { base64, mime } = image;
  if (!base64 || base64.length > Math.ceil(CHAT_LIMITS.imageBytes / 3) * 4 ||
      base64.length % 4 || !/^[A-Za-z0-9+/]+={0,2}$/.test(base64)) return false;
  const bytes = Buffer.from(base64, 'base64');
  const signature = mime === 'image/png' ? '89504e470d0a1a0a' : 'ffd8ff';
  return bytes.length <= CHAT_LIMITS.imageBytes && bytes.subarray(0, signature.length / 2).toString('hex') === signature;
}

const MAX_REQUEST_BYTES = Math.ceil(CHAT_LIMITS.imageBytes / 3) * 4 + 1_500_000;

async function readJson(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let bytes = 0;
  for await (const chunk of req.iterator({ destroyOnReturn: false })) {
    bytes += chunk.length;
    if (bytes > MAX_REQUEST_BYTES) {
      req.resume();
      throw new RangeError('Request too large');
    }
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString());
}

function jsonError(res: ServerResponse, status: number, message: string) {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify({ message }));
}

async function handleChat(req: IncomingMessage, res: ServerResponse) {
  if (!isLocalRequest(req)) return jsonError(res, 403, 'Open StudyFlow at localhost or 127.0.0.1 to use the assistant.');
  if (req.method !== 'POST' || !/^application\/json(?:;|$)/i.test(req.headers['content-type'] ?? '')) {
    return jsonError(res, 415, 'Expected a JSON chat request.');
  }

  const key = req.headers.authorization?.match(/^Bearer ([\x21-\x7E]{1,512})$/)?.[1];
  if (!key) return jsonError(res, 401, 'Enter your provider API key in AI Settings.');
  if (Number(req.headers['content-length']) > MAX_REQUEST_BYTES) {
    req.resume();
    return jsonError(res, 413, 'The attachment or message is too large.');
  }

  let request: unknown;
  try {
    request = await readJson(req);
  } catch (error) {
    return error instanceof RangeError
      ? jsonError(res, 413, 'The attachment or message is too large.')
      : jsonError(res, 400, 'Could not read the chat request.');
  }
  if (!isRequest(request)) return jsonError(res, 400, 'Check the model, message length, and image format.');

  const control = new AbortController();
  const timeout = AbortSignal.timeout(90_000);
  const abort = () => control.abort();
  res.once('close', abort);
  const send = (event: ChatEvent) => {
    if (!res.destroyed) res.write(JSON.stringify(event) + '\n');
  };

  res.writeHead(200, { 'Content-Type': 'application/x-ndjson', 'Cache-Control': 'no-store, no-transform' });
  res.flushHeaders();
  try {
    for await (const event of streamProvider(request, key, AbortSignal.any([control.signal, timeout]))) send(event);
  } catch {
    if (!control.signal.aborted) {
      send({ type: 'error', message: timeout.aborted
        ? 'The provider took too long to reply. Try again.'
        : 'Could not complete the connection to your AI provider.' });
    }
  } finally {
    res.removeListener('close', abort);
    res.end();
  }
}

export function studyAssistant(): Plugin {
  const middleware = (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    if (req.url?.split('?')[0] !== CHAT_ENDPOINT) return next();
    void handleChat(req, res);
  };
  return {
    name: 'studyflow-assistant',
    configureServer(server) { server.middlewares.use(middleware); },
    configurePreviewServer(server) { server.middlewares.use(middleware); },
  };
}
