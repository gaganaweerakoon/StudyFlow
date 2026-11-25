import { allowLocalServerKey, isLoopbackApiClient } from './localApiPolicy.ts';
import 'dotenv/config';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Plugin } from 'vite';
import {
  CHAT_ENDPOINT,
  CHAT_LIMITS,
  NOTES_RESTRUCTURE_ENDPOINT,
  OVERVIEW_ENDPOINT,
  PROVIDERS,
  STATUS_ENDPOINT,
  isModelId,
  type ChatEvent,
  type ChatRequest,
} from '../src/assistant/protocol.ts';
import {
  formatGeminiError,
  generateDashboardOverview,
  hasEnvGeminiKey,
  resolveGeminiKey,
  streamNotesRestructure,
  type NotesRestructureRequest,
  type RestructureEvent,
  type RestructureFigureInput,
} from './geminiClient.ts';
import { streamProvider } from './studyAssistantProviders.ts';

function isAllowedOrigin(req: IncomingMessage): boolean {
  if (req.headers['sec-fetch-site'] === 'cross-site') return false;
  const origin = req.headers.origin;
  if (!origin) return true; // Same-origin GET or non-CORS request
  try {
    const parsedOrigin = new URL(origin);
    const forwardedHost = Array.isArray(req.headers['x-forwarded-host'])
      ? req.headers['x-forwarded-host'][0]
      : req.headers['x-forwarded-host'];
    const host = (forwardedHost || req.headers.host || '').split(',')[0].trim();
    if (!host) return false;
    return parsedOrigin.host.toLowerCase() === host.toLowerCase();
  } catch {
    return false;
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function isRequest(value: unknown): value is ChatRequest {
  if (!isObject(value) || value.provider !== 'gemini' || !isModelId(value.model)) return false;
  const { prompt, context, history, image, maxOutput } = value;
  if (
    typeof prompt !== 'string' ||
    !prompt.trim() ||
    prompt.length > CHAT_LIMITS.prompt ||
    typeof context !== 'string' ||
    context.length > CHAT_LIMITS.context ||
    !Array.isArray(history) ||
    history.length > CHAT_LIMITS.history ||
    typeof maxOutput !== 'number' || !Number.isInteger(maxOutput) || maxOutput < 0 || maxOutput > 65536
  ) {
    return false;
  }
  if (
    !history.every(
      (turn) =>
        isObject(turn) &&
        (turn.role === 'user' || turn.role === 'assistant') &&
        typeof turn.text === 'string' &&
        turn.text.length <= CHAT_LIMITS.historyMessage,
    )
  ) {
    return false;
  }
  if (value.workspaceActions !== undefined && typeof value.workspaceActions !== 'boolean') return false;
  if (
    value.studyGeneration !== undefined &&
    !['flashcards', 'practice', 'syllabus', 'syllabus_bundle', 'grading', 'overview'].some((kind) => kind === value.studyGeneration)
  ) {
    return false;
  }
  if (value.clientContext !== undefined && (typeof value.clientContext !== 'string')) {
    return false;
  }
  if (value.generateImage !== undefined && value.generateImage !== false) return false;

  if (value.documents !== undefined) {
    if (!Array.isArray(value.documents) || value.documents.length > CHAT_LIMITS.maxDocuments) return false;
    let totalDocText = 0;
    let totalPdfBytes = 0;
    const allowedKinds = new Set(['pdf', 'doc', 'slide', 'sheet', 'markdown', 'text', 'code']);
    for (const doc of value.documents) {
      if (!isObject(doc)) return false;
      if (typeof doc.name !== 'string' || !doc.name.trim() || doc.name.length > 180) return false;
      if (typeof doc.kind !== 'string' || !allowedKinds.has(doc.kind)) return false;
      if (typeof doc.mime !== 'string' || !doc.mime.trim() || doc.mime.length > 140) return false;
      if (doc.sizeBytes !== undefined && (typeof doc.sizeBytes !== 'number' || !Number.isFinite(doc.sizeBytes) || doc.sizeBytes < 0)) {
        return false;
      }
      if (doc.pageCount !== undefined && (typeof doc.pageCount !== 'number' || !Number.isInteger(doc.pageCount) || doc.pageCount < 0)) {
        return false;
      }
      const hasText = typeof doc.text === 'string' && doc.text.length > 0;
      const hasPdf = typeof doc.pdfBase64 === 'string' && doc.pdfBase64.length > 0;
      if (!hasText && !hasPdf) return false;
      if (doc.text !== undefined) {
        if (typeof doc.text !== 'string') return false;
        totalDocText += doc.text.length;
        if (totalDocText > CHAT_LIMITS.documentTextTotal) return false;
      }
      if (doc.pdfBase64 !== undefined) {
        if (
          typeof doc.pdfBase64 !== 'string' ||
          doc.kind !== 'pdf' ||
          doc.mime !== 'application/pdf' ||
          !doc.pdfBase64 ||
          doc.pdfBase64.length > Math.ceil(CHAT_LIMITS.pdfBytes / 3) * 4 ||
          doc.pdfBase64.length % 4 ||
          !/^[A-Za-z0-9+/]+={0,2}$/.test(doc.pdfBase64)
        ) {
          return false;
        }
        const pdfBuf = Buffer.from(doc.pdfBase64, 'base64');
        totalPdfBytes += pdfBuf.length;
        // Validate PDF magic header "%PDF-" (25 50 44 46 2d)
        if (
          pdfBuf.length > CHAT_LIMITS.pdfBytes ||
          totalPdfBytes > CHAT_LIMITS.pdfBytes * 2 ||
          pdfBuf.subarray(0, 5).toString('hex') !== '255044462d'
        ) {
          return false;
        }
      }
    }
  }

  if (image === undefined) return true;
  if (
    !isObject(image) ||
    (image.mime !== 'image/png' && image.mime !== 'image/jpeg') ||
    (image.detail !== 'standard' && image.detail !== 'high') ||
    typeof image.base64 !== 'string'
  ) {
    return false;
  }
  const { base64, mime } = image;
  if (
    !base64 ||
    base64.length > Math.ceil(CHAT_LIMITS.imageBytes / 3) * 4 ||
    base64.length % 4 ||
    !/^[A-Za-z0-9+/]+={0,2}$/.test(base64)
  ) {
    return false;
  }
  const bytes = Buffer.from(base64, 'base64');
  const signature = mime === 'image/png' ? '89504e470d0a1a0a' : 'ffd8ff';
  return bytes.length <= CHAT_LIMITS.imageBytes && bytes.subarray(0, signature.length / 2).toString('hex') === signature;
}

function parseRestructureRequest(value: unknown): NotesRestructureRequest | null {
  if (!isObject(value)) return null;
  if (typeof value.markdown !== 'string' || !value.markdown.trim() || value.markdown.length > CHAT_LIMITS.context) {
    return null;
  }
  if (value.instructions !== undefined && (typeof value.instructions !== 'string' || value.instructions.length > 500)) {
    return null;
  }
  if (value.normalizeLanguage !== undefined && typeof value.normalizeLanguage !== 'boolean') return null;
  if (value.targetLanguage !== undefined && (typeof value.targetLanguage !== 'string' || value.targetLanguage.length > 60)) {
    return null;
  }
  if (value.filterUnwantedImages !== undefined && typeof value.filterUnwantedImages !== 'boolean') return null;
  if (value.model !== undefined && !isModelId(value.model)) return null;

  const validatedFigures: RestructureFigureInput[] = [];
  if (Array.isArray(value.figures)) {
    for (const rawFig of value.figures.slice(0, 16)) {
      if (!isObject(rawFig)) continue;
      if (typeof rawFig.id !== 'string' || !rawFig.id.trim() || rawFig.id.length > 120) continue;
      if (
        rawFig.mimeType !== 'image/webp' &&
        rawFig.mimeType !== 'image/png' &&
        rawFig.mimeType !== 'image/jpeg'
      ) {
        continue;
      }
      if (
        typeof rawFig.base64 !== 'string' ||
        !rawFig.base64 ||
        rawFig.base64.length > 1_200_000 ||
        !/^[A-Za-z0-9+/]+={0,2}$/.test(rawFig.base64)
      ) {
        continue;
      }
      const hint =
        rawFig.positionHint === 'header' || rawFig.positionHint === 'body' || rawFig.positionHint === 'footer'
          ? rawFig.positionHint
          : undefined;
      validatedFigures.push({
        id: rawFig.id,
        mimeType: rawFig.mimeType,
        base64: rawFig.base64,
        positionHint: hint,
        width: typeof rawFig.width === 'number' && Number.isFinite(rawFig.width) ? rawFig.width : undefined,
        height: typeof rawFig.height === 'number' && Number.isFinite(rawFig.height) ? rawFig.height : undefined,
        pageNumber: typeof rawFig.pageNumber === 'number' && Number.isInteger(rawFig.pageNumber) ? rawFig.pageNumber : undefined,
        repeatCount: typeof rawFig.repeatCount === 'number' && Number.isInteger(rawFig.repeatCount) ? rawFig.repeatCount : undefined,
      });
    }
  }

  return {
    markdown: value.markdown,
    instructions: value.instructions as string | undefined,
    normalizeLanguage: Boolean(value.normalizeLanguage),
    targetLanguage: (value.targetLanguage as string | undefined) ?? 'auto',
    filterUnwantedImages: value.filterUnwantedImages !== false,
    figures: validatedFigures,
    model: (value.model as string | undefined) ?? PROVIDERS.gemini.model,
  };
}

const MAX_REQUEST_BYTES = 20_000_000;

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

function jsonResponse(res: ServerResponse, status: number, payload: unknown) {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(payload));
}

function handleStatus(req: IncomingMessage, res: ServerResponse) {
  if (!isAllowedOrigin(req)) return jsonResponse(res, 403, { message: 'Cross-origin access denied.' });
  if (req.method !== 'GET') return jsonResponse(res, 405, { message: 'Method not allowed.' });
  return jsonResponse(res, 200, {
    geminiConfigured: (isLoopbackApiClient(req) && hasEnvGeminiKey()),
    defaultProvider: 'gemini',
    defaultModel: PROVIDERS.gemini.model,
  });
}

async function handleChat(req: IncomingMessage, res: ServerResponse) {
  if (!isAllowedOrigin(req)) return jsonResponse(res, 403, { message: 'Cross-origin access denied.' });
  if (req.method !== 'POST' || !/^application\/json(?:;|$)/i.test(req.headers['content-type'] ?? '')) {
    return jsonResponse(res, 415, { message: 'Expected a JSON chat request.' });
  }
  if (Number(req.headers['content-length']) > MAX_REQUEST_BYTES) {
    req.resume();
    return jsonResponse(res, 413, { message: 'The attachment or message is too large.' });
  }

  let request: unknown;
  try {
    request = await readJson(req);
  } catch (error) {
    return error instanceof RangeError
      ? jsonResponse(res, 413, { message: 'The attachment or message is too large.' })
      : jsonResponse(res, 400, { message: 'Could not read the chat request.' });
  }
  if (!isRequest(request)) return jsonResponse(res, 400, { message: 'Check the model, message length, and image format.' });

  const bearerKey = req.headers.authorization?.match(/^Bearer ([\x21-\x7E]{1,512})$/)?.[1];
  const resolvedKey =
    request.provider === 'gemini' ? allowLocalServerKey(bearerKey, req, () => resolveGeminiKey()) : bearerKey ?? '';
  if (!resolvedKey) {
    return jsonResponse(res, 401, {
      message:
        request.provider === 'gemini'
          ? 'GEMINI_API_KEY is not configured in the server environment. Set it in Settings > Secrets.'
          : 'Enter your provider API key in AI Settings.',
    });
  }

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
    for await (const event of streamProvider(request, resolvedKey, AbortSignal.any([control.signal, timeout]))) {
      send(event);
    }
  } catch {
    if (!control.signal.aborted) {
      send({
        type: 'error',
        message: timeout.aborted
          ? 'The provider took too long to reply. Try again.'
          : 'Could not complete the connection to your AI provider.',
      });
    }
  } finally {
    res.removeListener('close', abort);
    res.end();
  }
}

async function handleNotesRestructure(req: IncomingMessage, res: ServerResponse) {
  if (!isAllowedOrigin(req)) return jsonResponse(res, 403, { message: 'Cross-origin access denied.' });
  if (req.method !== 'POST' || !/^application\/json(?:;|$)/i.test(req.headers['content-type'] ?? '')) {
    return jsonResponse(res, 415, { message: 'Expected a JSON request.' });
  }
  if (Number(req.headers['content-length']) > MAX_REQUEST_BYTES) {
    req.resume();
    return jsonResponse(res, 413, { message: 'The document payload is too large.' });
  }

  let rawBody: unknown;
  try {
    rawBody = await readJson(req);
  } catch (error) {
    return error instanceof RangeError
      ? jsonResponse(res, 413, { message: 'The document payload is too large.' })
      : jsonResponse(res, 400, { message: 'Could not read the restructure request.' });
  }

  const parsed = parseRestructureRequest(rawBody);
  if (!parsed) {
    return jsonResponse(res, 400, { message: 'Invalid Markdown restructuring request.' });
  }

  const bearerKey = req.headers.authorization?.match(/^Bearer ([\x21-\x7E]{1,512})$/)?.[1];
  const resolvedKey = allowLocalServerKey(bearerKey, req, () => resolveGeminiKey());
  if (!resolvedKey) {
    return jsonResponse(res, 401, {
      message: 'GEMINI_API_KEY is not configured in the server environment. Set it in Settings > Secrets.',
    });
  }

  const control = new AbortController();
  const timeout = AbortSignal.timeout(120_000);
  const abort = () => control.abort();
  res.once('close', abort);
  const send = (event: RestructureEvent) => {
    if (!res.destroyed) res.write(JSON.stringify(event) + '\n');
  };

  res.writeHead(200, { 'Content-Type': 'application/x-ndjson', 'Cache-Control': 'no-store, no-transform' });
  res.flushHeaders();
  try {
    for await (const event of streamNotesRestructure(
      parsed,
      resolvedKey,
      AbortSignal.any([control.signal, timeout]),
    )) {
      send(event);
    }
  } catch {
    if (!control.signal.aborted) {
      send({
        type: 'error',
        message: timeout.aborted
          ? 'Gemini took too long to restructure this document. Try a smaller section.'
          : 'Could not reach Gemini to restructure this document.',
      });
    }
  } finally {
    res.removeListener('close', abort);
    res.end();
  }
}

async function handleOverview(req: IncomingMessage, res: ServerResponse) {
  if (!isAllowedOrigin(req)) return jsonResponse(res, 403, { message: 'Cross-origin access denied.' });
  if (req.method !== 'POST' || !/^application\/json(?:;|$)/i.test(req.headers['content-type'] ?? '')) {
    return jsonResponse(res, 415, { message: 'Expected a JSON request.' });
  }
  let body: unknown;
  try {
    body = await readJson(req);
  } catch {
    return jsonResponse(res, 400, { message: 'Could not read the overview request.' });
  }
  if (
    !isObject(body) ||
    typeof body.diagnosticsJson !== 'string' ||
    !body.diagnosticsJson.trim() ||
    body.diagnosticsJson.length > 60_000
  ) {
    return jsonResponse(res, 400, { message: 'Invalid workspace overview payload.' });
  }
  if (body.model !== undefined && !isModelId(body.model)) {
    return jsonResponse(res, 400, { message: 'Invalid model ID.' });
  }

  const bearerKey = req.headers.authorization?.match(/^Bearer ([\x21-\x7E]{1,512})$/)?.[1];
  const resolvedKey = allowLocalServerKey(bearerKey, req, () => resolveGeminiKey());
  if (!resolvedKey) {
    return jsonResponse(res, 401, {
      message: 'GEMINI_API_KEY is not configured in the server environment. Set it in Settings > Secrets.',
    });
  }

  const control = new AbortController();
  const timeout = AbortSignal.timeout(60_000);
  const abort = () => control.abort();
  res.once('close', abort);
  try {
    const result = await generateDashboardOverview(
      {
        diagnosticsJson: body.diagnosticsJson,
        clockLabel: typeof body.clockLabel === 'string' ? body.clockLabel.slice(0, 120) : undefined,
        model: typeof body.model === 'string' ? body.model : PROVIDERS.gemini.model,
      },
      resolvedKey,
      AbortSignal.any([control.signal, timeout]),
    );
    return jsonResponse(res, 200, result);
  } catch (err) {
    if (control.signal.aborted) return;
    const formatted = formatGeminiError(err);
    return jsonResponse(res, formatted.status && formatted.status >= 400 && formatted.status < 600 ? formatted.status : 502, {
      message: formatted.message,
    });
  } finally {
    res.removeListener('close', abort);
  }
}

export function createStudyAssistantMiddleware() {
  return (req: IncomingMessage & { originalUrl?: string }, res: ServerResponse, next: () => void) => {
    const rawUrl = req.originalUrl ?? req.url ?? '';
    const pathname = rawUrl.split('?')[0];
    if (pathname === STATUS_ENDPOINT) {
      handleStatus(req, res);
      return;
    }
    if (pathname === CHAT_ENDPOINT) {
      void handleChat(req, res);
      return;
    }
    if (pathname === OVERVIEW_ENDPOINT) {
      void handleOverview(req, res);
      return;
    }
    if (pathname === NOTES_RESTRUCTURE_ENDPOINT) {
      void handleNotesRestructure(req, res);
      return;
    }
    next();
  };
}

export function studyAssistant(): Plugin {
  const middleware = createStudyAssistantMiddleware();
  return {
    name: 'studyflow-assistant',
    configureServer(server) { server.middlewares.use(middleware); },
    configurePreviewServer(server) { server.middlewares.use(middleware); },
  };
}
