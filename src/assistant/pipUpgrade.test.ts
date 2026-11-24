import assert from 'node:assert/strict';
import test from 'node:test';
import { createServer } from 'vite';
import { studyAssistant } from '../../server/studyAssistant.ts';
import { CHAT_ENDPOINT, PROVIDERS } from './protocol.ts';
import { formatAttachmentMeta, inferPipDocumentKind } from './documentAttachments.ts';
import {
  aggregateDailyUsage,
  buildUsageCsv,
  filterUsageEntries,
  summarizeUsageEntries,
} from './usageAnalytics.ts';
import type { UsageEntry } from './usage.ts';

test('inferPipDocumentKind and formatAttachmentMeta classify PDFs, docs, slides, code, and images cleanly', () => {
  assert.equal(inferPipDocumentKind('Organic_Chem_Ch4.pdf', 'application/pdf'), 'pdf');
  assert.equal(inferPipDocumentKind('lecture-notes.docx'), 'doc');
  assert.equal(inferPipDocumentKind('week6-deck.pptx'), 'slide');
  assert.equal(inferPipDocumentKind('lab-results.csv'), 'sheet');
  assert.equal(inferPipDocumentKind('summary.md'), 'markdown');
  assert.equal(inferPipDocumentKind('solver.py'), 'code');
  assert.equal(inferPipDocumentKind('diagram.png', 'image/png'), 'image');
  assert.equal(inferPipDocumentKind('archive.zip', 'application/zip'), null);

  assert.equal(
    formatAttachmentMeta({ kind: 'pdf', sizeLabel: '1.2 MB', pageCount: 8, nativePdf: true }),
    '8 pages · 1.2 MB · Direct PDF',
  );
  assert.equal(
    formatAttachmentMeta({ kind: 'slide', sizeLabel: '640 KB', slideCount: 14 }),
    '14 slides · 640 KB',
  );
});

test('usageAnalytics filters, aggregates daily totals, and builds RFC-4180 CSV cleanly', () => {
  const now = new Date('2026-11-23T18:00:00Z');
  const entries: UsageEntry[] = [
    {
      id: 'u1',
      at: new Date('2026-11-23T15:00:00Z').getTime(),
      day: '2026-11-23',
      provider: 'gemini',
      model: 'gemini-4-hydrogen',
      status: 'complete',
      tokens: { input: 1000, output: 400, cached: 200, total: 1400 },
    },
    {
      id: 'u2',
      at: new Date('2026-11-23T12:00:00Z').getTime(),
      day: '2026-11-23',
      provider: 'gemini',
      model: 'gemini-4-hydrogen',
      status: 'complete',
      tokens: { input: 500, output: 250, cached: 100, total: 750 },
    },
    {
      id: 'u3',
      at: new Date('2026-11-10T10:00:00Z').getTime(),
      day: '2026-11-10',
      provider: 'openai',
      model: 'gpt-4.1-mini',
      status: 'error',
    },
  ];

  const weekGemini = filterUsageEntries(entries, { windowDays: 7, provider: 'gemini', now });
  assert.equal(weekGemini.length, 2);
  const weekTotals = summarizeUsageEntries(weekGemini);
  assert.deepEqual(weekTotals, {
    input: 1500,
    output: 650,
    cached: 300,
    total: 2150,
    requests: 2,
    unreported: 0,
  });

  const allErrors = filterUsageEntries(entries, { windowDays: 0, provider: 'all', query: 'error', now });
  assert.equal(allErrors.length, 1);
  assert.equal(allErrors[0].id, 'u3');

  const daily = aggregateDailyUsage(entries);
  assert.equal(daily.length, 2);
  assert.equal(daily[0].day, '2026-11-23');
  assert.equal(daily[0].requests, 2);
  assert.equal(daily[0].total, 2150);

  const csvDaily = buildUsageCsv(entries, 'daily');
  assert.match(csvDaily, /^Date,Provider,Model,Requests,Input Tokens,Output Tokens,Cached Tokens,Total Tokens/m);
  assert.match(csvDaily, /2026-11-23,Gemini,gemini-4-hydrogen,2,1500,650,300,2150/);

  const csvReqs = buildUsageCsv(entries, 'requests');
  assert.match(csvReqs, /^Timestamp,Day,Provider,Model,Status,Input Tokens,Output Tokens,Cached Tokens,Total Tokens/m);
});

test('server validates native PDF magic header and forwards PDF inlineData + extracted documents', async (t) => {
  const server = await createServer({
    configFile: false,
    plugins: [studyAssistant()],
    server: { host: '127.0.0.1', port: 0, watch: null, hmr: false },
  });
  await server.listen();
  t.after(() => server.close());
  const address = server.httpServer?.address();
  assert.ok(address && typeof address === 'object');
  const origin = `http://127.0.0.1:${address.port}`;

  const realFetch = globalThis.fetch;
  const upstreamCalls: Array<{ url: string; body: Record<string, unknown> }> = [];
  t.mock.method(globalThis, 'fetch', (url: string, init: RequestInit) => {
    if (url.startsWith(origin)) return realFetch(url, init);
    upstreamCalls.push({ url, body: JSON.parse(String(init.body)) });
    const sseBody = `data: ${JSON.stringify({
      candidates: [{ content: { parts: [{ text: 'PDF analyzed.' }] }, finishReason: 'STOP' }],
      usageMetadata: { promptTokenCount: 200, candidatesTokenCount: 10, totalTokenCount: 210 },
    })}\n\n`;
    return new Response(sseBody, { headers: { 'Content-Type': 'text/event-stream' } });
  });

  const validPdfBase64 = Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF').toString('base64');
  const forgedPdfBase64 = Buffer.from('NOT-A-PDF-HEADER').toString('base64');

  // 1. Reject forged PDF bytes
  const badRes = await fetch(origin + CHAT_ENDPOINT, {
    method: 'POST',
    headers: { Origin: origin, 'Content-Type': 'application/json', Authorization: 'Bearer test-key' },
    body: JSON.stringify({
      provider: 'gemini',
      model: PROVIDERS.gemini.model,
      prompt: 'Summarize',
      context: '',
      history: [],
      maxOutput: 650,
      documents: [
        {
          name: 'fake.pdf',
          kind: 'pdf',
          mime: 'application/pdf',
          pdfBase64: forgedPdfBase64,
        },
      ],
    }),
  });
  assert.equal(badRes.status, 400);

  // 2. Accept valid PDF + DOCX text document
  const okRes = await fetch(origin + CHAT_ENDPOINT, {
    method: 'POST',
    headers: { Origin: origin, 'Content-Type': 'application/json', Authorization: 'Bearer test-key' },
    body: JSON.stringify({
      provider: 'gemini',
      model: PROVIDERS.gemini.model,
      prompt: 'Summarize both files',
      context: '',
      history: [],
      maxOutput: 650,
      documents: [
        {
          name: 'lecture4.pdf',
          kind: 'pdf',
          mime: 'application/pdf',
          pageCount: 6,
          pdfBase64: validPdfBase64,
        },
        {
          name: 'notes.docx',
          kind: 'doc',
          mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          text: '# Organic Reactions\nSN1 vs SN2 comparison.',
        },
      ],
    }),
  });
  assert.equal(okRes.status, 200);
  const raw = await okRes.text();
  assert.match(raw, /PDF analyzed\./);
  assert.equal(upstreamCalls.length, 1);

  const geminiContents = upstreamCalls[0].body.contents as Array<{
    parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }>;
  }>;
  const userParts = geminiContents[0].parts;
  assert.match(userParts[0].text ?? '', /ATTACHED DOCUMENT: notes\.docx/);
  assert.equal(userParts[1].inlineData?.mimeType, 'application/pdf');
  assert.equal(userParts[1].inlineData?.data, validPdfBase64);
});
