import { PROVIDERS } from '../src/assistant/protocol.ts';
import studySchemas from '../src/assistant/studySchemas.json' with { type: 'json' };
import 'dotenv/config';
import { GoogleGenAI } from '@google/genai';
import type { TokenUsage } from '../src/assistant/protocol.ts';

export interface RestructureFigureInput {
  id: string;
  mimeType: 'image/webp' | 'image/png' | 'image/jpeg';
  base64: string;
  positionHint?: 'header' | 'body' | 'footer';
  width?: number;
  height?: number;
  pageNumber?: number;
  repeatCount?: number;
}

export interface NotesRestructureRequest {
  markdown: string;
  instructions?: string;
  normalizeLanguage?: boolean;
  targetLanguage?: string;
  filterUnwantedImages?: boolean;
  figures?: RestructureFigureInput[];
  model?: string;
}

export type RestructureEvent =
  | { type: 'meta'; detectedLanguage?: string; removedFigures: string[]; keptFigures: string[] }
  | { type: 'text'; text: string }
  | { type: 'usage'; usage: TokenUsage }
  | { type: 'done'; truncated?: boolean }
  | { type: 'error'; message: string; status?: number };

export function hasEnvGeminiKey(): boolean {
  return Boolean(process.env.GEMINI_API_KEY?.trim());
}

export function resolveGeminiKey(clientKey?: string): string {
  const fromClient = clientKey?.trim();
  if (fromClient) return fromClient;
  return process.env.GEMINI_API_KEY?.trim() ?? '';
}

export function createGeminiClient(apiKey: string): GoogleGenAI {
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

export function formatGeminiError(err: unknown): { message: string; status?: number } {
  let raw = err instanceof Error ? err.message : typeof err === 'string' ? err : '';
  let status: number | undefined;

  if (err && typeof err === 'object') {
    const record = err as Record<string, unknown>;
    if (typeof record.status === 'number') status = record.status;
    else if (typeof record.code === 'number') status = record.code;
  }

  // Recursively unwrap nested JSON error strings produced by the Gemini SDK / REST API
  let current = raw.trim();
  for (let depth = 0; depth < 4; depth++) {
    if (!current.startsWith('{')) break;
    try {
      const parsed = JSON.parse(current) as Record<string, unknown>;
      const nested = (parsed.error && typeof parsed.error === 'object'
        ? parsed.error
        : parsed) as Record<string, unknown>;
      if (typeof nested.code === 'number') status = nested.code;
      else if (typeof nested.status === 'number') status = nested.status;
      if (typeof nested.message === 'string' && nested.message.trim()) {
        current = nested.message.trim();
        continue;
      }
      break;
    } catch {
      break;
    }
  }

  if (!status) {
    const codeMatch = raw.match(/\b(400|401|402|403|404|422|429|500|502|503|504)\b/);
    if (codeMatch) status = Number(codeMatch[1]);
  }

  if (status === 401 || status === 403 || /API_KEY_INVALID|PERMISSION_DENIED/i.test(raw)) {
    return {
      status: status ?? 403,
      message: 'Gemini rejected the API key or access was denied. Check your GEMINI_API_KEY in Settings > Secrets.',
    };
  }
  if (status === 429 || /RESOURCE_EXHAUSTED/i.test(raw)) {
    return {
      status: 429,
      message: 'Gemini rate limit reached. Please wait a moment and try again.',
    };
  }
  if (status === 404 || /\bNOT_FOUND\b/.test(raw)) {
    return {
      status: 404,
      message: 'The selected Gemini model could not be found. Try another Gemini model.',
    };
  }

  const looksLikeCleanText =
    Boolean(current) &&
    !current.startsWith('{') &&
    !current.startsWith('[') &&
    current.length <= 320;

  if (status === 503 || /UNAVAILABLE|high demand|overloaded/i.test(raw)) {
    return {
      status: 503,
      message: looksLikeCleanText
        ? current
        : 'Gemini is temporarily experiencing high demand. Please try again in a moment.',
    };
  }

  return {
    status,
    message: looksLikeCleanText
      ? current
      : 'Gemini could not complete this request right now. Please try again.',
  };
}

function safeCount(value: unknown): number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : 0;
}

function stripOuterFence(raw: string): string {
  const trimmed = raw.trim();
  const open = trimmed.match(/^(?:`{3,}|~{3,})(?:markdown|md)?[ \t]*\r?\n/i);
  if (!open) return trimmed;
  return trimmed
    .slice(open[0].length)
    .replace(/\r?\n(?:`{3,}|~{3,})[ \t]*$/, '')
    .trim();
}

function parseMetaLine(line: string): {
  detectedLanguage?: string;
  removedFigures?: string[];
  keptFigures?: string[];
} | null {
  const match = line.trim().match(/^<!--\s*studyflow-meta:\s*(\{[\s\S]*?\})\s*-->$/);
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[1]) as Record<string, unknown>;
    return {
      detectedLanguage:
        typeof parsed.detectedLanguage === 'string' ? parsed.detectedLanguage.trim() : undefined,
      removedFigures: Array.isArray(parsed.removedFigures)
        ? parsed.removedFigures.filter((x): x is string => typeof x === 'string')
        : undefined,
      keptFigures: Array.isArray(parsed.keptFigures)
        ? parsed.keptFigures.filter((x): x is string => typeof x === 'string')
        : undefined,
    };
  } catch {
    return null;
  }
}

export async function* streamNotesRestructure(
  request: NotesRestructureRequest,
  apiKey: string,
  signal: AbortSignal,
): AsyncGenerator<RestructureEvent> {
  const ai = createGeminiClient(apiKey);
  const model = request.model || PROVIDERS.gemini.model;
  const figures = request.figures ?? [];
  const filterImages = request.filterUnwantedImages !== false && figures.length > 0;
  const normalizeLanguage = Boolean(request.normalizeLanguage);
  const targetLanguage = (request.targetLanguage || 'auto').trim();

  const languageRules = normalizeLanguage
    ? targetLanguage === 'auto'
      ? [
          '- Detect the language of the document (including Unicode scripts such as Sinhala, Tamil, Devanagari/Hindi, Arabic, Japanese, Chinese, Korean, Thai, Cyrillic, Greek, or legacy ASCII-encoded font text such as FM Abhaya / DL-Manel / Bamini / Kruti Dev).',
          '- Convert and repair the text into clean, natural, grammatically proper standard Unicode in that EXACT detected language.',
          '- Fix common PDF extraction issues such as swapped vowel signs (e.g., Sinhala kombuwa/pilla ordering), split syllables, broken ligatures, stray spaces inside words, or legacy font-mapped characters.',
          '- Do NOT translate into another language when target is auto; keep it in the proper detected original language.',
        ]
      : [
          `- Detect the source language (including Unicode scripts or legacy font-encoded text) and convert/translate the document into clean, natural, accurate ${targetLanguage} in proper standard Unicode.`,
          '- Preserve technical terms, formulas, code, and proper nouns accurately while ensuring smooth academic phrasing.',
        ]
    : [
        '- Preserve the EXACT original language, script, and Unicode characters verbatim. Do NOT translate or romanize.',
      ];

  const imageRules = filterImages
    ? [
        '- You are shown cropped candidate images extracted from the document along with their Figure ID, page number, layout position (header/body/footer), dimensions, and repeat count.',
        '- REMOVE unwanted decorative or boilerplate images by OMITTING their `![...](figure-...)` Markdown tag completely: page footers, page headers, university/school/company logos, publisher watermarks, page number banners, decorative lines/borders, tiny icons, or repeated template graphics.',
        '- KEEP wanted study images by retaining their exact `![Descriptive alt text](figure-...)` Markdown tag in its proper logical position: diagrams, charts, graphs, scientific illustrations, equations, maps, tables-as-images, circuits, and instructional photographs.',
      ]
    : [
        '- Keep all existing image references like `![Figure 1](figure-...)` intact in their proper logical positions.',
      ];

  const systemInstruction = [
    'You are an expert academic document formatter for StudyFlow.',
    'Your job is to restructure extracted document Markdown into clean, properly ordered, publication-quality Markdown study notes.',
    '',
    'Structure & Ordering Rules:',
    '- Reorder scrambled reading order (multi-column jumbles, out-of-order callouts, split sections, or floating captions) into logical reading sequence.',
    '- Establish a clean Markdown heading hierarchy (#, ##, ###), flowing paragraphs, proper bullet/numbered lists, bold key terms, blockquotes for key definitions/rules, and fenced code blocks ONLY for real programming code.',
    '- Keep all genuine academic content, definitions, examples, and formulas intact without inventing facts.',
    '',
    'Tables, Chemistry & Math Formatting Rules (STRICT):',
    '- GFM TABLES: Convert ALL tabular content, comparisons, indicator tables, reagent/property lists, or multi-column schedules into strict GitHub-Flavored Markdown tables:',
    '  - Always put a blank line before and after every table.',
    '  - Start every table row with `|` at column 0 (NEVER indent table lines with spaces).',
    '  - Always include an ASCII separator row (`| --- | --- |`) with the exact same number of columns as the header row.',
    '  - Escape any literal pipe inside a cell as `\\|`.',
    '- CHEMICAL FORMULAS: Write chemical formulas, ions, and simple reactions in prose and tables using clean Unicode subscripts, superscripts, and arrows (e.g., `Na₂CO₃`, `KIO₃`, `K₂Cr₂O₇`, `H₂SO₄`, `Fe²⁺`, `SO₄²⁻`, `Cr₂O₇²⁻`, `→`, `⇌`) — NEVER write verbose LaTeX like `$\\text{Na}_2\\text{CO}_3$` for plain chemical names or lists!',
    '- MATHEMATICAL EQUATIONS: Use valid KaTeX syntax ONLY for actual mathematical expressions (fractions, roots, integrals, powers, equations): `$...$` for inline math and `$$...$$` on its own blank-line-separated block for display equations.',
    '  - NEVER use `\\(...\\)`, `\\[...\\]`, `\\ce{...}`, escaped `\\$...\\$`, or backticks around math.',
    '  - Keep prose words (especially non-Latin scripts like Sinhala/Tamil/Hindi) OUTSIDE `$...$` math delimiters.',
    '- NEVER indent regular paragraphs, lists, or tables by 4 spaces, and NEVER wrap the output in ```markdown code fences.',
    '',
    'Language & Unicode Rules:',
    ...languageRules,
    '',
    'Image Filtering Rules:',
    ...imageRules,
    '',
    'Output Format (STRICT):',
    'Line 1 MUST be a single HTML comment with JSON metadata:',
    '<!-- studyflow-meta: {"detectedLanguage":"<Detected language name>","removedFigures":["<removed figure IDs>"],"keptFigures":["<kept figure IDs>"]} -->',
    'Starting on Line 2, output ONLY the clean restructured Markdown directly. No conversational intro, no closing remarks, and NO outer ```markdown fence.',
  ].join('\n');

  const figureSummary = figures.length
    ? '\n\nExtracted image candidates:\n' +
      figures
        .map(
          (f) =>
            `- ID: ${f.id} | page: ${f.pageNumber ?? '?'} | position: ${f.positionHint ?? 'unknown'} | size: ${Math.round(f.width ?? 0)}x${Math.round(f.height ?? 0)}px | repeated on ${f.repeatCount ?? 1} page(s)`,
        )
        .join('\n')
    : '';

  const extra = request.instructions?.trim()
    ? `\n\nAdditional user instructions: ${request.instructions.trim()}`
    : '';

  const parts: Array<
    { text: string } | { inlineData: { mimeType: string; data: string } }
  > = [
    {
      text: `Restructure the following extracted Markdown.${extra}${figureSummary}\n\n--- SOURCE MARKDOWN ---\n${request.markdown}`,
    },
  ];

  if (filterImages) {
    for (const fig of figures.slice(0, 12)) {
      parts.push({
        text: `Image candidate ${fig.id} (page ${fig.pageNumber ?? '?'}, position: ${fig.positionHint ?? 'body'}, size: ${Math.round(fig.width ?? 0)}x${Math.round(fig.height ?? 0)}, repeats: ${fig.repeatCount ?? 1}):`,
      });
      parts.push({
        inlineData: {
          mimeType: fig.mimeType,
          data: fig.base64,
        },
      });
    }
  }

  try {
    const stream = await ai.models.generateContentStream({
      model,
      contents: [{ role: 'user', parts }],
      config: {
        systemInstruction,
        abortSignal: signal,
      },
    });

    let rawBuffer = '';
    let metaResolved = false;
    let emittedMeta: {
      detectedLanguage?: string;
      removedFigures?: string[];
      keptFigures?: string[];
    } | null = null;
    let emittedLength = 0;
    let tokens: TokenUsage | undefined;
    let truncated = false;

    for await (const chunk of stream) {
      if (signal.aborted) break;
      const delta = chunk.text ?? '';
      if (chunk.usageMetadata) {
        const u = chunk.usageMetadata;
        const input = safeCount(u.promptTokenCount);
        const output =
          safeCount(u.candidatesTokenCount) + safeCount(u.thoughtsTokenCount);
        const cached = safeCount(u.cachedContentTokenCount);
        tokens = {
          input,
          output,
          cached,
          total: safeCount(u.totalTokenCount) || input + output,
        };
      }
      if (chunk.candidates?.[0]?.finishReason === 'MAX_TOKENS') {
        truncated = true;
      }

      if (!delta) continue;
      rawBuffer += delta;

      if (!metaResolved) {
        const newlineIdx = rawBuffer.indexOf('\n');
        // Wait until first newline (or enough chars that it clearly isn't a meta comment)
        if (newlineIdx !== -1) {
          const firstLine = rawBuffer.slice(0, newlineIdx);
          const parsed = parseMetaLine(firstLine);
          metaResolved = true;
          if (parsed) {
            emittedMeta = parsed;
            yield {
              type: 'meta',
              detectedLanguage: parsed.detectedLanguage,
              removedFigures: parsed.removedFigures ?? [],
              keptFigures: parsed.keptFigures ?? [],
            };
            rawBuffer = rawBuffer.slice(newlineIdx + 1).replace(/^\s*\n/, '');
          }
        } else if (rawBuffer.length > 24 && !rawBuffer.trimStart().startsWith('<!--')) {
          metaResolved = true;
        }
      }

      if (metaResolved && rawBuffer.length > emittedLength) {
        const nextSlice = rawBuffer.slice(emittedLength);
        emittedLength = rawBuffer.length;
        yield { type: 'text', text: nextSlice };
      }
    }

    // Flush if stream finished before newline
    if (!metaResolved && rawBuffer.trim()) {
      const cleaned = stripOuterFence(rawBuffer);
      if (cleaned) {
        yield { type: 'text', text: cleaned };
      }
    }

    // Reconcile actual kept/removed figures against the final Markdown text
    if (figures.length > 0) {
      const kept = figures.filter((f) => rawBuffer.includes(f.id)).map((f) => f.id);
      const removed = figures.filter((f) => !rawBuffer.includes(f.id)).map((f) => f.id);
      yield {
        type: 'meta',
        detectedLanguage: emittedMeta?.detectedLanguage,
        removedFigures: removed,
        keptFigures: kept,
      };
    }

    if (tokens) {
      yield { type: 'usage', usage: tokens };
    }
    yield { type: 'done', truncated };
  } catch (err) {
    if (signal.aborted) return;
    const formatted = formatGeminiError(err);
    yield {
      type: 'error',
      status: formatted.status,
      message: formatted.message,
    };
  }
}

export interface DashboardOverviewRequest {
  diagnosticsJson: string;
  clockLabel?: string;
  model?: string;
}

export async function generateDashboardOverview(
  request: DashboardOverviewRequest,
  apiKey: string,
  signal: AbortSignal,
): Promise<{
  overview: import('../src/assistant/protocol.ts').DashboardAiOverview;
  usage?: TokenUsage;
}> {
  const ai = createGeminiClient(apiKey);
  const model = request.model || PROVIDERS.gemini.model;

  const systemInstruction = [
    'You are Pip, the academic productivity coach in StudyFlow.',
    'Analyze the student’s real workspace diagnostics JSON and return a sharp, specific, practical AI Study Overview.',
    'Never invent courses, scores, or dates not present in the diagnostics JSON.',
    'Keep advice concise, grounded in their real overdue tasks, upcoming exams, open slots, due flashcards, and weak quiz topics.',
    'For at least one recommendation, set actionType to "ask_pip" with a concrete prompt Pip can execute (such as scheduling a study block in an open slot, generating flashcards from their notes, or rebalancing their week).',
  ].join(' ');

  const response = await ai.models.generateContent({
    model,
    contents: [
      {
        role: 'user',
        parts: [
          {
            text: `${request.clockLabel ? `Current local time: ${request.clockLabel}\n` : ''}Workspace diagnostics JSON:\n${request.diagnosticsJson}`,
          },
        ],
      },
    ],
    config: {
      systemInstruction,
      responseMimeType: 'application/json',
      responseJsonSchema: studySchemas.overview,
      abortSignal: signal,
    },
  });

  const rawText = (response.text ?? '').trim().replace(/^```(?:json)?\s*|\s*```$/gi, '');
  const parsed = JSON.parse(rawText) as Record<string, unknown>;

  const validActionTypes = new Set([
    'ask_pip',
    'open_planner',
    'open_flashcards',
    'open_practice',
    'open_tasks',
    'open_notes',
    'start_focus',
  ]);

  const rawAdvice = Array.isArray(parsed.advice) ? parsed.advice : [];
  const advice = rawAdvice
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object')
    .slice(0, 3)
    .map((item) => {
      const impact = item.impact === 'high' || item.impact === 'quick' ? item.impact : 'medium';
      const actionType =
        typeof item.actionType === 'string' && validActionTypes.has(item.actionType)
          ? (item.actionType as import('../src/assistant/protocol.ts').DashboardAdviceItem['actionType'])
          : 'ask_pip';
      return {
        title: typeof item.title === 'string' && item.title.trim() ? item.title.trim().slice(0, 110) : 'Recommended step',
        detail: typeof item.detail === 'string' && item.detail.trim() ? item.detail.trim().slice(0, 260) : '',
        impact: impact as 'high' | 'medium' | 'quick',
        actionType,
        actionLabel:
          typeof item.actionLabel === 'string' && item.actionLabel.trim()
            ? item.actionLabel.trim().slice(0, 36)
            : 'Ask Pip',
        prompt: typeof item.prompt === 'string' && item.prompt.trim() ? item.prompt.trim().slice(0, 400) : undefined,
      };
    });

  const u = response.usageMetadata;
  const tokens: TokenUsage | undefined = u
    ? {
        input: safeCount(u.promptTokenCount),
        output: safeCount(u.candidatesTokenCount) + safeCount(u.thoughtsTokenCount),
        cached: safeCount(u.cachedContentTokenCount),
        total:
          safeCount(u.totalTokenCount) ||
          safeCount(u.promptTokenCount) + safeCount(u.candidatesTokenCount) + safeCount(u.thoughtsTokenCount),
      }
    : undefined;

  return {
    overview: {
      headline:
        typeof parsed.headline === 'string' && parsed.headline.trim()
          ? parsed.headline.trim().slice(0, 120)
          : 'Your StudyFlow AI Study Overview',
      summary:
        typeof parsed.summary === 'string' && parsed.summary.trim()
          ? parsed.summary.trim().slice(0, 420)
          : 'Review your highest-priority deadlines and schedule focused study blocks in your open windows.',
      focusPriority:
        typeof parsed.focusPriority === 'string' && parsed.focusPriority.trim()
          ? parsed.focusPriority.trim().slice(0, 160)
          : 'Clear top pending tasks',
      scheduleTip:
        typeof parsed.scheduleTip === 'string' && parsed.scheduleTip.trim()
          ? parsed.scheduleTip.trim().slice(0, 260)
          : 'Use your next open time slot for a 25-minute active-recall session.',
      advice,
      generatedAt: new Date().toISOString(),
    },
    usage: tokens,
  };
}
