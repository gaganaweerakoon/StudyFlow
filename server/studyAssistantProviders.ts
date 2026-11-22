import { PROVIDERS, SYSTEM_PROMPT, type ChatEvent, type ChatRequest, type TokenUsage } from '../src/assistant/protocol.ts';

async function* readEvents(body: ReadableStream<Uint8Array>) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let data: string[] = [];
  try {
    for (;;) {
      const { done, value } = await reader.read();
      buffer += done ? decoder.decode() : decoder.decode(value, { stream: true });
      // Flush the final SSE frame even if the server omits a blank line.
      if (done) buffer += '\n\n';
      let end: number;
      while ((end = buffer.indexOf('\n')) !== -1) {
        const line = buffer.slice(0, end).replace(/\r$/, '');
        buffer = buffer.slice(end + 1);
        if (line.startsWith('data:')) data.push(line.slice(5).trimStart());
        if (!line && data.length) {
          const payload = data.join('\n');
          data = [];
          if (payload !== '[DONE]') yield JSON.parse(payload);
        }
      }
      if (buffer.length + data.reduce((size, line) => size + line.length, 0) > 512_000) {
        throw new Error('Provider response frame exceeds limit');
      }
      if (done) break;
    }
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}

const count = (value: unknown) =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : 0;

function usage(input: number, output: number, cached: number, total = input + output): TokenUsage {
  return { input, output, cached, total };
}

function providerRequest(request: ChatRequest, key: string) {
  const { provider, model, image, history, maxOutput } = request;
  const prompt = request.context
    ? `${request.prompt}\n\nWorkspace reference (read-only):\n${request.context}`
    : request.prompt;
  const headers: Record<string, string> = { 'Content-Type': 'application/json', Accept: 'text/event-stream' };

  if (provider === 'openai') {
    headers.Authorization = `Bearer ${key}`;
    return {
      url: 'https://api.openai.com/v1/responses',
      headers,
      body: {
        model, instructions: SYSTEM_PROMPT, stream: true, store: false, max_output_tokens: maxOutput,
        input: [
          ...history.map(({ role, text }) => ({ role, content: text })),
          { role: 'user', content: [
            { type: 'input_text', text: prompt },
            ...(image ? [{
              type: 'input_image', image_url: `data:${image.mime};base64,${image.base64}`,
              detail: image.detail === 'high' ? 'high' : 'low',
            }] : []),
          ] },
        ],
      },
    };
  }

  if (provider === 'gemini') {
    headers['x-goog-api-key'] = key;
    return {
      url: `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse`,
      headers,
      body: {
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        generationConfig: {
          maxOutputTokens: maxOutput,
        },
        contents: [
          ...history.map(({ role, text }) => ({ role: role === 'assistant' ? 'model' : 'user', parts: [{ text }] })),
          { role: 'user', parts: [
            { text: prompt },
            ...(image ? [{ inlineData: { mimeType: image.mime, data: image.base64 } }] : []),
          ] },
        ],
      },
    };
  }

  headers['x-api-key'] = key;
  headers['anthropic-version'] = '2023-06-01';
  return {
    url: 'https://api.anthropic.com/v1/messages',
    headers,
    body: {
      model, system: SYSTEM_PROMPT, stream: true, max_tokens: maxOutput,
      messages: [
        ...history.map(({ role, text }) => ({ role, content: text })),
        { role: 'user', content: [
          { type: 'text', text: prompt },
          ...(image ? [{
            type: 'image', source: { type: 'base64', media_type: image.mime, data: image.base64 },
          }] : []),
        ] },
      ],
    },
  };
}

function providerError(status: number, label: string) {
  if (status === 401 || status === 403) return `${label} rejected the API key or denied model access. Check AI Settings.`;
  if (status === 404 || status === 400 || status === 422) return `${label} rejected the request. Check the model ID and its image support.`;
  if (status === 402 || status === 429) return `${label} returned a billing, quota, or rate limit error. Check your provider account.`;
  return `${label} is temporarily unavailable.`;
}

export async function* streamProvider(
  request: ChatRequest, key: string, signal: AbortSignal,
): AsyncGenerator<ChatEvent> {
  const { provider } = request;
  const label = PROVIDERS[provider].label;
  const { url, headers, body } = providerRequest(request, key);
  const response = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body), signal, redirect: 'error' });
  if (!response.ok || !response.body) {
    await response.body?.cancel();
    yield { type: 'error', message: providerError(response.status, label) };
    return;
  }

  let tokens: TokenUsage | undefined;
  let hasText = false;
  let finished = false;
  let truncated = false;
  let failed = false;
  for await (const event of readEvents(response.body)) {
    let delta = '';
    if (provider === 'openai') {
      if (event.type === 'response.output_text.delta' || event.type === 'response.refusal.delta') delta = event.delta;
      if (['response.completed', 'response.incomplete', 'response.failed'].includes(event.type)) {
        const raw = event.response?.usage;
        if (raw) tokens = usage(count(raw.input_tokens), count(raw.output_tokens),
          count(raw.input_tokens_details?.cached_tokens), raw.total_tokens);
        finished = true;
        truncated = event.response?.incomplete_details?.reason === 'max_output_tokens';
        failed = event.type === 'response.failed';
      }
    } else if (provider === 'gemini') {
      const candidate = event.candidates?.[0];
      delta = (candidate?.content?.parts ?? [])
        .filter((part: { thought?: boolean }) => !part.thought)
        .map((part: { text?: string }) => part.text ?? '').join('');
      const raw = event.usageMetadata;
      if (raw) tokens = usage(count(raw.promptTokenCount), count(raw.candidatesTokenCount) + count(raw.thoughtsTokenCount),
        count(raw.cachedContentTokenCount), raw.totalTokenCount);
      finished ||= Boolean(candidate?.finishReason || event.promptFeedback?.blockReason);
      truncated ||= candidate?.finishReason === 'MAX_TOKENS';
    } else {
      if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') delta = event.delta.text;
      if (event.type === 'content_block_start' && event.content_block?.type === 'text') delta = event.content_block.text;
      const raw = event.type === 'message_start' ? event.message?.usage : event.usage;
      if (raw) {
        const cached = raw.cache_read_input_tokens === undefined ? tokens?.cached ?? 0 : count(raw.cache_read_input_tokens);
        const input = raw.input_tokens === undefined
          ? tokens?.input ?? 0
          : count(raw.input_tokens) + cached + count(raw.cache_creation_input_tokens);
        tokens = usage(input, count(raw.output_tokens ?? tokens?.output), cached);
      }
      truncated ||= event.delta?.stop_reason === 'max_tokens';
      finished ||= event.type === 'message_stop';
    }
    if (typeof delta === 'string' && delta) {
      hasText = true;
      yield { type: 'text', text: delta };
    }
    if (event.type === 'error' || event.error) {
      failed = true;
      break;
    }
  }

  if (tokens && finished) yield { type: 'usage', usage: tokens };
  if (failed || !finished || !hasText) {
    yield { type: 'error', message: truncated
      ? 'The model reached the reply limit before producing visible text. Try a longer reply limit in AI Settings.'
      : `${label} did not finish a usable reply. Try a shorter request or a different model.` };
  } else {
    yield { type: 'done', truncated };
  }
}
