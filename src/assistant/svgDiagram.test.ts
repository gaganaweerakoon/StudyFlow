import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DEFAULT_SVG_FONT_FAMILY,
  expandFontShorthand,
  parseSvgCssRules,
  sanitizeSvgDiagram,
} from './svgDiagram';

test('parseSvgCssRules parses class, tag, id, and combinator rules while ignoring @-rules and unsafe values', () => {
  const css = `
    @import url("https://evil.example/a.css");
    @keyframes spin { from { opacity: 0; } to { opacity: 1; } }
    /* Card styling */
    .card {
      fill: #ffffff;
      stroke: #cbd5e1;
      stroke-width: 1.5px;
      rx: 12px;
      background-image: url("https://evil.example/leak.png");
      filter: expression(alert(1));
    }
    g > rect.header {
      fill: #2563eb;
      rx: 8px;
    }
    .connector {
      fill: none;
      stroke: #64748b;
      stroke-width: 2px;
    }
    .title {
      font: bold 20px Arial, sans-serif;
      text-anchor: middle;
      fill: #0f172a;
    }
    #accent-fill {
      fill: url(#grad-1);
    }
    #bad-url {
      fill: url(https://evil.example/x.svg#grad);
    }
  `;

  const rules = parseSvgCssRules(css);
  assert.equal(rules.length, 5);

  const cardRule = rules[0];
  assert.deepEqual(
    cardRule.declarations.map((d) => [d.prop, d.value]),
    [
      ['fill', '#ffffff'],
      ['stroke', '#cbd5e1'],
      ['stroke-width', '1.5'],
      ['rx', '12'],
    ],
  );

  const headerRule = rules[1];
  assert.equal(headerRule.selectors[0]?.segments.length, 2);
  assert.equal(headerRule.selectors[0]?.segments[1]?.combinator, '>');

  const connectorRule = rules[2];
  assert.deepEqual(
    connectorRule.declarations.map((d) => [d.prop, d.value]),
    [
      ['fill', 'none'],
      ['stroke', '#64748b'],
      ['stroke-width', '2'],
    ],
  );

  const titleRule = rules[3];
  const titleMap = new Map(titleRule.declarations.map((d) => [d.prop, d.value]));
  assert.equal(titleMap.get('font-weight'), 'bold');
  assert.equal(titleMap.get('font-size'), '20px');
  assert.match(titleMap.get('font-family') ?? '', /Nirmala UI/);
  assert.equal(titleMap.get('text-anchor'), 'middle');
  assert.equal(titleMap.get('fill'), '#0f172a');

  const internalUrlRule = rules[4];
  assert.equal(internalUrlRule.declarations[0]?.value, 'url(#grad-1)');
});

test('expandFontShorthand extracts weight, style, size, and family cleanly', () => {
  const expanded = expandFontShorthand('italic 600 14px/1.4 "DM Sans", sans-serif');
  const map = new Map(expanded.map((d) => [d.prop, d.value]));
  assert.equal(map.get('font-style'), 'italic');
  assert.equal(map.get('font-weight'), '600');
  assert.equal(map.get('font-size'), '14px');
  assert.equal(map.get('font-family'), '"DM Sans", sans-serif');
});

test('DEFAULT_SVG_FONT_FAMILY includes Windows and cross-platform Sinhala/Unicode fallback fonts', () => {
  assert.match(DEFAULT_SVG_FONT_FAMILY, /Nirmala UI/);
  assert.match(DEFAULT_SVG_FONT_FAMILY, /Iskoola Pota/);
  assert.match(DEFAULT_SVG_FONT_FAMILY, /Noto Sans Sinhala/);
});

test('sanitizeSvgDiagram blocks scripts, event handlers, and DOCTYPE/ENTITY payloads', () => {
  assert.equal(
    sanitizeSvgDiagram('<!DOCTYPE svg [<!ENTITY xxe "bad">]><svg><text>&xxe;</text></svg>'),
    null,
  );

  const withScript = sanitizeSvgDiagram(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 100"><script>alert(1)</script><rect width="200" height="100" fill="#fff" onclick="alert(2)"/></svg>',
  );
  assert.ok(withScript);
  assert.doesNotMatch(withScript, /<script/i);
  assert.doesNotMatch(withScript, /onclick/i);
  assert.match(withScript, /fill="#fff"/);
});
