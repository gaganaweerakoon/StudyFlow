import { CHAT_ENDPOINT, CHAT_LIMITS, SYSTEM_PROMPT, type ChatEvent, type ChatImage, type ChatRequest } from './protocol';

export const isAssistantAvailable = () =>
  window.location.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname);

export function estimatedTokens(request: ChatRequest) {
  const text = [SYSTEM_PROMPT, request.prompt, request.context, ...request.history.map(turn => turn.text)].join('\n');
  const textTokens = Math.ceil(new TextEncoder().encode(text).length / 3);
  const imageTokens = request.image ? (request.image.detail === 'high' ? 2600 : 1200) : 0;
  return 80 + textTokens + imageTokens + request.maxOutput;
}

export async function* sendChat(request: ChatRequest, key: string, signal: AbortSignal): AsyncGenerator<ChatEvent> {
  const response = await fetch(CHAT_ENDPOINT, {
    method: 'POST',
    signal,
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify(request),
  });
  if (!response.ok || !response.body || !response.headers.get('Content-Type')?.includes('application/x-ndjson')) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message ?? 'The local assistant backend is unavailable. Start StudyFlow with bun run dev or bun run preview.');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let pending = '';
  try {
    for (;;) {
      const { value, done } = await reader.read();
      pending += done ? decoder.decode() + '\n' : decoder.decode(value, { stream: true });
      const lines = pending.split('\n');
      pending = lines.pop() ?? '';
      for (const line of lines) if (line.trim()) yield JSON.parse(line);
      if (done) break;
    }
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
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
