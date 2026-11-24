import { Channel, invoke, isTauri } from '@tauri-apps/api/core';
import {
  CHAT_ENDPOINT,
  CHAT_LIMITS,
  NOTES_RESTRUCTURE_ENDPOINT,
  OVERVIEW_ENDPOINT,
  STATUS_ENDPOINT,
  SYSTEM_PROMPT,
  type ChatEvent,
  type ChatImage,
  type ChatRequest,
  type DashboardAiOverview,
  type TokenUsage,
} from './protocol';

export const isAssistantAvailable = () =>
  isTauri() || typeof window !== 'undefined';

export interface AssistantServerStatus {
  geminiConfigured: boolean;
  defaultProvider?: string;
  defaultModel?: string;
}

export async function fetchAssistantStatus(): Promise<AssistantServerStatus> {
  if (isTauri()) return { geminiConfigured: false };
  try {
    const response = await fetch(STATUS_ENDPOINT, {
      method: 'GET',
      credentials: 'same-origin',
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) return { geminiConfigured: false };
    const data = (await response.json()) as Partial<AssistantServerStatus>;
    return {
      geminiConfigured: Boolean(data.geminiConfigured),
      defaultProvider: data.defaultProvider,
      defaultModel: data.defaultModel,
    };
  } catch {
    return { geminiConfigured: false };
  }
}

export async function fetchDashboardOverview(
  payload: { diagnosticsJson: string; clockLabel?: string; model?: string },
  key: string | undefined,
  signal?: AbortSignal,
): Promise<{ overview: DashboardAiOverview; usage?: TokenUsage }> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (key) headers.Authorization = `Bearer ${key}`;
  const response = await fetch(OVERVIEW_ENDPOINT, {
    method: 'POST',
    signal,
    credentials: 'same-origin',
    redirect: 'error',
    headers,
    body: JSON.stringify(payload),
  });
  const data = (await response.json().catch(() => ({}))) as {
    overview?: DashboardAiOverview;
    usage?: TokenUsage;
    message?: string;
  };
  if (!response.ok || !data.overview) {
    throw new Error(data.message ?? 'Could not generate AI study overview right now.');
  }
  return { overview: data.overview, usage: data.usage };
}

export function estimatedTokens(request: ChatRequest) {
  const text = [SYSTEM_PROMPT, request.prompt, request.context, ...request.history.map(turn => turn.text)].join('\n');
  const textTokens = Math.ceil(new TextEncoder().encode(text).length / 3);
  const imageTokens = request.image ? (request.image.detail === 'high' ? 2600 : 1200) : 0;
  return 80 + textTokens + imageTokens + request.maxOutput;
}

async function* sendDesktopChat(request: ChatRequest, key: string | undefined, signal: AbortSignal): AsyncGenerator<ChatEvent> {
  signal.throwIfAborted();
  const id = crypto.randomUUID();
  const events = new Channel<ChatEvent>();
  const queue: ChatEvent[] = [];
  let wake: (() => void) | undefined;
  let finished = false;
  let failure: unknown;
  events.onmessage = event => {
    queue.push(event);
    wake?.();
  };
  const cancel = () => {
    void invoke('cancel_assistant_chat', { id }).catch(() => {});
    wake?.();
  };
  signal.addEventListener('abort', cancel, { once: true });
  const completion = invoke('assistant_chat', { id, request, key, events })
    .catch(error => { failure = error; })
    .finally(() => { finished = true; wake?.(); });
  try {
    while (queue.length || !finished) {
      signal.throwIfAborted();
      const event = queue.shift();
      if (event) yield event;
      else await new Promise<void>(resolve => { wake = resolve; });
    }
    signal.throwIfAborted();
    if (failure) throw new Error(String(failure));
  } finally {
    signal.removeEventListener('abort', cancel);
    if (!finished) {
      cancel();
      await completion;
    }
  }
}

async function* readNdjsonStream<T>(response: Response): AsyncGenerator<T> {
  if (!response.body) return;
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let pending = '';
  try {
    for (;;) {
      const { value, done } = await reader.read();
      pending += done ? decoder.decode() + '\n' : decoder.decode(value, { stream: true });
      const lines = pending.split('\n');
      pending = lines.pop() ?? '';
      for (const line of lines) {
        if (line.trim()) yield JSON.parse(line) as T;
      }
      if (done) break;
    }
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}

async function* sendOnce(request: ChatRequest, key: string | undefined, signal: AbortSignal): AsyncGenerator<ChatEvent> {
  if (isTauri()) {
    yield* sendDesktopChat(request, key, signal);
    return;
  }
  if (!key && request.provider !== 'gemini') {
    throw new Error('Add the API key for this provider in AI Settings.');
  }
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (key) headers.Authorization = `Bearer ${key}`;

  const response = await fetch(CHAT_ENDPOINT, {
    method: 'POST',
    signal,
    credentials: 'same-origin',
    redirect: 'error',
    headers,
    body: JSON.stringify(request),
  });
  if (!response.ok || !response.body || !response.headers.get('Content-Type')?.includes('application/x-ndjson')) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message ?? 'The assistant server is unavailable.');
  }

  yield* readNdjsonStream<ChatEvent>(response);
}

export interface ClientRestructureFigure {
  id: string;
  mimeType: 'image/webp' | 'image/png' | 'image/jpeg';
  base64: string;
  positionHint?: 'header' | 'body' | 'footer';
  width?: number;
  height?: number;
  pageNumber?: number;
  repeatCount?: number;
}

export interface ClientRestructurePayload {
  markdown: string;
  instructions?: string;
  normalizeLanguage?: boolean;
  targetLanguage?: string;
  filterUnwantedImages?: boolean;
  figures?: ClientRestructureFigure[];
  model?: string;
}

export type ClientRestructureEvent =
  | { type: 'meta'; detectedLanguage?: string; removedFigures: string[]; keptFigures: string[] }
  | { type: 'text'; text: string }
  | { type: 'usage'; usage: TokenUsage }
  | { type: 'done'; truncated?: boolean }
  | { type: 'error'; message: string; status?: number };

export async function* streamNotesRestructureClient(
  payload: ClientRestructurePayload,
  key: string | undefined,
  signal: AbortSignal,
): AsyncGenerator<ClientRestructureEvent> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (key) headers.Authorization = `Bearer ${key}`;

  const response = await fetch(NOTES_RESTRUCTURE_ENDPOINT, {
    method: 'POST',
    signal,
    credentials: 'same-origin',
    redirect: 'error',
    headers,
    body: JSON.stringify(payload),
  });
  if (!response.ok || !response.body || !response.headers.get('Content-Type')?.includes('application/x-ndjson')) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message ?? 'Could not reach Gemini for Markdown restructuring.');
  }

  yield* readNdjsonStream<ClientRestructureEvent>(response);
}

export function retrySeconds(status: number, header?: string) {
  const value = header?.trim() ?? '';
  const declared = /^\d+$/.test(value) ? Number(value) : (Date.parse(value) - Date.now()) / 1000;
  return Number.isFinite(declared) ? Math.max(1, Math.ceil(declared)) : status === 429 ? 30 : 5;
}

function pause(seconds: number, signal: AbortSignal) {
  signal.throwIfAborted();
  return new Promise<void>((resolve, reject) => {
    const timer = window.setTimeout(() => {
      signal.removeEventListener('abort', stop);
      resolve();
    }, seconds * 1000);
    function stop() {
      window.clearTimeout(timer);
      reject(signal.reason);
    }
    signal.addEventListener('abort', stop, { once: true });
  });
}

export async function* sendChat(request: ChatRequest, key: string | undefined, signal: AbortSignal): AsyncGenerator<ChatEvent> {
  let retry: number | undefined;
  let received = false;
  for await (const event of sendOnce(request, key, signal)) {
    if (event.type === 'error' && event.status === 503 && !received && !request.generateImage) {
      const seconds = retrySeconds(503, event.retryAfter);
      if (seconds <= 10) {
        retry = seconds;
        break;
      }
    }
    received = true;
    yield event;
  }
  if (retry !== undefined) {
    yield { type: 'retry', seconds: retry };
    await pause(retry, signal);
    yield* sendOnce(request, key, signal);
  }
}

export interface Attachment {
  name: string;
  image: ChatImage;
}

function canvasBlob(canvas: HTMLCanvasElement, mime: ChatImage['mime'], quality?: number) {
  return new Promise<Blob | null>(resolve => canvas.toBlob(resolve, mime, quality));
}

export async function prepareImage(file: File, detail: ChatImage['detail']): Promise<Attachment> {
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || !file.size || file.size > 12_000_000) {
    throw new Error('Choose a PNG, JPEG, or WebP image under 12 MB.');
  }
  const bitmap = await createImageBitmap(file).catch(() => {
    throw new Error('Could not open this image. Try a different PNG, JPEG, or WebP.');
  });
  try {
    const canvas = document.createElement('canvas');
    const maxDimension = detail === 'high' ? 1600 : 900;
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext('2d', { alpha: false });
    if (!context) throw new Error('Image processing is unavailable.');
    context.fillStyle = '#fff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const png = file.type === 'image/png' ? await canvasBlob(canvas, 'image/png') : null;
    const blob = png && png.size <= CHAT_LIMITS.imageBytes ? png : await canvasBlob(canvas, 'image/jpeg', 0.86);
    if (!blob || blob.size > CHAT_LIMITS.imageBytes) throw new Error('The image is too large. Crop it or use standard detail.');
    const source = new Uint8Array(await blob.arrayBuffer());
    let bytes = '';
    for (let i = 0; i < source.length; i += 8192) bytes += String.fromCharCode(...source.subarray(i, i + 8192));
    return { name: file.name || 'Pasted screenshot', image: { mime: blob.type === 'image/png' ? 'image/png' : 'image/jpeg', base64: btoa(bytes), detail } };
  } finally {
    bitmap.close();
  }
}
