const svgNamespace = 'http://www.w3.org/2000/svg';
const xlinkNamespace = 'http://www.w3.org/1999/xlink';

export const DEFAULT_SVG_FONT_FAMILY =
  "system-ui, -apple-system, 'Segoe UI', 'Nirmala UI', 'Iskoola Pota', 'Sinhala Sangam MN', 'Noto Sans Sinhala', 'Noto Sans Tamil', 'Noto Sans', sans-serif";

const UNICODE_FONT_FALLBACK =
  "'Nirmala UI', 'Iskoola Pota', 'Sinhala Sangam MN', 'Noto Sans Sinhala', 'Noto Sans', sans-serif";

const ALLOWED_TAGS = new Set([
  'svg',
  'g',
  'title',
  'desc',
  'defs',
  'path',
  'rect',
  'circle',
  'ellipse',
  'line',
  'polyline',
  'polygon',
  'text',
  'tspan',
  'marker',
  'linearGradient',
  'radialGradient',
  'stop',
  'clipPath',
  'mask',
  'pattern',
  'symbol',
  'use',
]);

// Elements whose entire subtree must be dropped without breaking the parent SVG
const BLOCKED_SUBTREE_TAGS = new Set([
  'script',
  'foreignObject',
  'iframe',
  'object',
  'embed',
  'style',
  'image',
  'a',
  'animate',
  'animateMotion',
  'animateTransform',
  'set',
]);

const ALLOWED_ATTRIBUTES = new Set([
  'id',
  'x',
  'y',
  'x1',
  'y1',
  'x2',
  'y2',
  'cx',
  'cy',
  'r',
  'rx',
  'ry',
  'width',
  'height',
  'viewBox',
  'preserveAspectRatio',
  'd',
  'points',
  'transform',
  'fill',
  'fill-opacity',
  'fill-rule',
  'stroke',
  'stroke-width',
  'stroke-opacity',
  'stroke-linecap',
  'stroke-linejoin',
  'stroke-dasharray',
  'stroke-dashoffset',
  'stroke-miterlimit',
  'opacity',
  'color',
  'font-size',
  'font-family',
  'font-weight',
  'font-style',
  'letter-spacing',
  'word-spacing',
  'text-anchor',
  'text-decoration',
  'dominant-baseline',
  'alignment-baseline',
  'baseline-shift',
  'dx',
  'dy',
  'marker-start',
  'marker-mid',
  'marker-end',
  'markerWidth',
  'markerHeight',
  'markerUnits',
  'refX',
  'refY',
  'orient',
  'gradientUnits',
  'gradientTransform',
  'spreadMethod',
  'offset',
  'stop-color',
  'stop-opacity',
  'fx',
  'fy',
  'fr',
  'clip-path',
  'clip-rule',
  'clipPathUnits',
  'mask',
  'patternUnits',
  'patternContentUnits',
  'patternTransform',
  'vector-effect',
  'paint-order',
  'shape-rendering',
  'text-rendering',
]);

const URL_REFERENCE_ATTRS = new Set([
  'fill',
  'stroke',
  'marker-start',
  'marker-mid',
  'marker-end',
  'clip-path',
  'mask',
]);

const SAFE_STYLE_PROPS = new Set([
  'fill',
  'fill-opacity',
  'fill-rule',
  'stroke',
  'stroke-width',
  'stroke-opacity',
  'stroke-linecap',
  'stroke-linejoin',
  'stroke-dasharray',
  'stroke-dashoffset',
  'stroke-miterlimit',
  'opacity',
  'color',
  'font-size',
  'font-family',
  'font-weight',
  'font-style',
  'letter-spacing',
  'word-spacing',
  'text-anchor',
  'text-decoration',
  'dominant-baseline',
  'alignment-baseline',
  'baseline-shift',
  'stop-color',
  'stop-opacity',
  'rx',
  'ry',
  'paint-order',
  'vector-effect',
  'shape-rendering',
  'text-rendering',
]);

const PX_STRIPPABLE_ATTRS = new Set(['rx', 'ry', 'stroke-width', 'stroke-dashoffset']);
const ID_PATTERN = /^[A-Za-z_][\w.-]{0,100}$/;
const INTERNAL_URL_PATTERN = /^url\(\s*['"]?#[A-Za-z_][\w.-]{0,100}['"]?\s*\)$/;
const MAX_CSS_RULES = 250;

export interface ParsedCssDeclaration {
  prop: string;
  value: string;
  important: boolean;
}

interface SimpleSelectorPart {
  tag?: string;
  id?: string;
  classes: string[];
}

interface ParsedSelector {
  segments: { part: SimpleSelectorPart; combinator: ' ' | '>' | null }[];
  specificity: number;
}

export interface ParsedCssRule {
  selectors: ParsedSelector[];
  declarations: ParsedCssDeclaration[];
  order: number;
}

function isSafeAttributeValue(name: string, value: string): boolean {
  if (value.length > 32_000) return false;
  if (/[\u0000-\u0008]|\/\*/.test(value)) return false;
  if (/(?:javascript|vbscript|data)\s*:/i.test(value)) return false;
  if (/expression\s*\(/i.test(value)) return false;
  if (/@import/i.test(value)) return false;
  if (name === 'id') return ID_PATTERN.test(value.trim());
  if (/url\s*\(/i.test(value)) {
    return URL_REFERENCE_ATTRS.has(name) && INTERNAL_URL_PATTERN.test(value.trim());
  }
  return true;
}

function ensureUnicodeFontFallback(fontFamily: string): string {
  const trimmed = fontFamily.trim();
  if (!trimmed) return DEFAULT_SVG_FONT_FAMILY;
  if (/Nirmala UI|Noto Sans Sinhala|Iskoola Pota/i.test(trimmed)) return trimmed;
  return `${trimmed}, ${UNICODE_FONT_FALLBACK}`;
}

function normalizeStyleAttrValue(prop: string, rawValue: string): string {
  let value = rawValue.trim();
  if (PX_STRIPPABLE_ATTRS.has(prop) && /^\d+(?:\.\d+)?px$/i.test(value)) {
    value = value.slice(0, -2);
  }
  if (prop === 'font-family') {
    value = ensureUnicodeFontFallback(value);
  }
  return value;
}

/**
 * Safely expand CSS `font` shorthand (e.g. `bold 18px sans-serif` or `italic 600 14px/1.4 Arial`)
 * into explicit allowlisted SVG font attributes.
 */
export function expandFontShorthand(raw: string): ParsedCssDeclaration[] {
  const cleaned = raw.replace(/!important\s*$/i, '').trim();
  const important = /!important\s*$/i.test(raw.trim());
  const match = cleaned.match(
    /^(?:(italic|oblique|normal)\s+)?(?:(bold|bolder|lighter|[1-9]00|normal)\s+)?(\d+(?:\.\d+)?(?:px|pt|em|rem|%))(?:\s*\/\s*[\d.a-z%]+)?\s+(.+)$/i,
  );
  if (!match) return [];

  const result: ParsedCssDeclaration[] = [];
  const [, fontStyle, fontWeight, fontSize, fontFamily] = match;
  if (fontStyle && fontStyle.toLowerCase() !== 'normal') {
    result.push({ prop: 'font-style', value: fontStyle, important });
  }
  if (fontWeight && fontWeight.toLowerCase() !== 'normal') {
    result.push({ prop: 'font-weight', value: fontWeight, important });
  }
  if (fontSize) {
    result.push({ prop: 'font-size', value: fontSize, important });
  }
  if (fontFamily) {
    result.push({ prop: 'font-family', value: fontFamily.trim(), important });
  }
  return result;
}

function parseDeclarations(block: string): ParsedCssDeclaration[] {
  const result: ParsedCssDeclaration[] = [];
  const parts = block.split(';');
  for (const part of parts) {
    const colonIdx = part.indexOf(':');
    if (colonIdx <= 0) continue;
    const prop = part.slice(0, colonIdx).trim().toLowerCase();
    const rawVal = part.slice(colonIdx + 1).trim();
    if (!prop || !rawVal) continue;

    if (prop === 'font') {
      for (const expanded of expandFontShorthand(rawVal)) {
        if (isSafeAttributeValue(expanded.prop, expanded.value)) {
          result.push({
            prop: expanded.prop,
            value: normalizeStyleAttrValue(expanded.prop, expanded.value),
            important: expanded.important,
          });
        }
      }
      continue;
    }

    if (!SAFE_STYLE_PROPS.has(prop)) continue;
    const important = /!important\s*$/i.test(rawVal);
    const strippedVal = rawVal.replace(/!important\s*$/i, '').trim();
    if (!strippedVal || !isSafeAttributeValue(prop, strippedVal)) continue;
    result.push({
      prop,
      value: normalizeStyleAttrValue(prop, strippedVal),
      important,
    });
  }
  return result;
}

function parseSimpleSelector(raw: string): SimpleSelectorPart | null {
  const token = raw.trim();
  if (!token || token.length > 160) return null;
  // Reject pseudo-classes/elements or attribute selectors cleanly
  if (/[:[\]()]/.test(token)) return null;

  let tag: string | undefined;
  let id: string | undefined;
  const classes: string[] = [];

  const regex = /(^[A-Za-z_*][\w-]*)|#([A-Za-z_][\w-]*)|\.([A-Za-z_][\w-]*)/g;
  let consumed = 0;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(token)) !== null) {
    if (m.index !== consumed) return null;
    consumed += m[0].length;
    if (m[1]) {
      if (m[1] !== '*') tag = m[1].toLowerCase();
    } else if (m[2]) {
      id = m[2];
    } else if (m[3]) {
      classes.push(m[3]);
    }
  }
  if (consumed !== token.length) return null;
  if (!tag && !id && classes.length === 0 && token !== '*') return null;
  return { tag, id, classes };
}

function parseComplexSelector(raw: string): ParsedSelector | null {
  const normalized = raw.trim().replace(/\s*>\s*/g, ' > ').replace(/\s+/g, ' ');
  if (!normalized || normalized.length > 240) return null;
  if (/[+~]/.test(normalized)) return null;

  const tokens = normalized.split(' ');
  const segments: { part: SimpleSelectorPart; combinator: ' ' | '>' | null }[] = [];
  let pendingCombinator: ' ' | '>' | null = null;
  let specificity = 0;

  for (const token of tokens) {
    if (token === '>') {
      if (segments.length === 0 || pendingCombinator === '>') return null;
      pendingCombinator = '>';
      continue;
    }
    const part = parseSimpleSelector(token);
    if (!part) return null;
    segments.push({
      part,
      combinator: segments.length === 0 ? null : (pendingCombinator ?? ' '),
    });
    pendingCombinator = null;
    if (part.id) specificity += 100;
    specificity += part.classes.length * 10;
    if (part.tag) specificity += 1;
  }

  if (segments.length === 0 || pendingCombinator === '>') return null;
  return { segments, specificity };
}

/**
 * Pure, bounded CSS rule parser for SVG `<style>` blocks.
 * Ignores `@`-rules (`@import`, `@font-face`, `@keyframes`, etc.) and keeps only
 * allowlisted visual presentation declarations so `<style>` can be safely stripped.
 */
export function parseSvgCssRules(cssText: string): ParsedCssRule[] {
  if (!cssText || cssText.length > 60_000) return [];
  const cleaned = cssText.replace(/\/\*[\s\S]*?\*\//g, '');
  const rules: ParsedCssRule[] = [];

  let i = 0;
  const len = cleaned.length;
  let order = 0;

  while (i < len && rules.length < MAX_CSS_RULES) {
    while (i < len && /\s/.test(cleaned[i])) i++;
    if (i >= len) break;

    // Skip @-rules safely (both statement rules ending with ';' and nested '{ ... }' blocks)
    if (cleaned[i] === '@') {
      let depth = 0;
      while (i < len) {
        const ch = cleaned[i++];
        if (ch === '{') {
          depth++;
        } else if (ch === '}') {
          depth--;
          if (depth <= 0) break;
        } else if (ch === ';' && depth === 0) {
          break;
        }
      }
      continue;
    }

    const braceStart = cleaned.indexOf('{', i);
    if (braceStart < 0) break;
    const selectorText = cleaned.slice(i, braceStart).trim();

    let braceEnd = braceStart + 1;
    let depth = 1;
    while (braceEnd < len && depth > 0) {
      const ch = cleaned[braceEnd++];
      if (ch === '{') depth++;
      else if (ch === '}') depth--;
    }

    const declText = cleaned.slice(braceStart + 1, braceEnd - 1);
    i = braceEnd;

    if (!selectorText || !declText.trim()) continue;
    const declarations = parseDeclarations(declText);
    if (declarations.length === 0) continue;

    const selectors = selectorText
      .split(',')
      .map((s) => parseComplexSelector(s))
      .filter((s): s is ParsedSelector => s !== null);

    if (selectors.length === 0) continue;
    rules.push({ selectors, declarations, order: order++ });
  }

  return rules;
}

function matchesSimplePart(el: Element, part: SimpleSelectorPart): boolean {
  if (part.tag && el.localName.toLowerCase() !== part.tag) return false;
  if (part.id && el.getAttribute('id') !== part.id) return false;
  if (part.classes.length > 0) {
    const rawClass = el.getAttribute('class') ?? '';
    if (!rawClass) return false;
    const classSet = new Set(rawClass.trim().split(/\s+/));
    for (const cls of part.classes) {
      if (!classSet.has(cls)) return false;
    }
  }
  return true;
}

function matchesSelector(el: Element, selector: ParsedSelector): boolean {
  const { segments } = selector;
  const lastIdx = segments.length - 1;
  if (!matchesSimplePart(el, segments[lastIdx].part)) return false;

  let currentEl: Element | null = el;
  for (let idx = lastIdx; idx > 0; idx--) {
    const combinator = segments[idx].combinator;
    const prevPart = segments[idx - 1].part;

    if (combinator === '>') {
      const parent: Element | null = currentEl?.parentElement ?? null;
      if (!parent || !matchesSimplePart(parent, prevPart)) return false;
      currentEl = parent;
    } else {
      let ancestor: Element | null = currentEl?.parentElement ?? null;
      let matched: Element | null = null;
      while (ancestor) {
        if (matchesSimplePart(ancestor, prevPart)) {
          matched = ancestor;
          break;
        }
        ancestor = ancestor.parentElement;
      }
      if (!matched) return false;
      currentEl = matched;
    }
  }
  return true;
}

function resolveCssStylesForElement(
  source: Element,
  rules: readonly ParsedCssRule[],
): Map<string, string> {
  const matched: { specificity: number; order: number; decl: ParsedCssDeclaration }[] = [];

  for (const rule of rules) {
    let bestSpecificity = -1;
    for (const sel of rule.selectors) {
      if (matchesSelector(source, sel) && sel.specificity > bestSpecificity) {
        bestSpecificity = sel.specificity;
      }
    }
    if (bestSpecificity >= 0) {
      for (const decl of rule.declarations) {
        matched.push({ specificity: bestSpecificity, order: rule.order, decl });
      }
    }
  }

  matched.sort((a, b) => {
    if (a.decl.important !== b.decl.important) return a.decl.important ? 1 : -1;
    if (a.specificity !== b.specificity) return a.specificity - b.specificity;
    return a.order - b.order;
  });

  const resolved = new Map<string, string>();
  for (const entry of matched) {
    resolved.set(entry.decl.prop, entry.decl.value);
  }
  return resolved;
}

function parseNumericDimension(raw: string | null): number | null {
  if (!raw) return null;
  const match = raw.trim().match(/^(\d+(?:\.\d+)?)(?:px)?$/i);
  if (!match) return null;
  const num = Number(match[1]);
  return Number.isFinite(num) && num > 0 ? num : null;
}

/**
 * Defensive repair for legacy/already-stripped SVGs where open connector `<path>`s
 * or container `<rect>`s behind `<text>` have neither fill nor stroke (which SVG
 * defaults to solid pitch-black `#000000`, obscuring labels and creating black triangles).
 */
function repairUnstyledPrimitives(
  el: Element,
  inheritedFill: boolean,
  inheritedStroke: boolean,
  inMaskOrClip: boolean,
) {
  const tag = el.localName;
  const nextInMaskOrClip = inMaskOrClip || tag === 'clipPath' || tag === 'mask' || tag === 'marker';
  const hasFill = inheritedFill || el.hasAttribute('fill');
  const hasStroke = inheritedStroke || el.hasAttribute('stroke');

  if (!nextInMaskOrClip) {
    if (tag === 'path') {
      const d = el.getAttribute('d') ?? '';
      const isClosed = /[zZ]/.test(d);
      if (!isClosed && !hasFill && !hasStroke) {
        el.setAttribute('fill', 'none');
        el.setAttribute('stroke', '#64748b');
        if (!el.hasAttribute('stroke-width')) el.setAttribute('stroke-width', '2');
      }
    } else if (tag === 'polyline' && !hasFill && !hasStroke) {
      el.setAttribute('fill', 'none');
      el.setAttribute('stroke', '#64748b');
      if (!el.hasAttribute('stroke-width')) el.setAttribute('stroke-width', '2');
    } else if (tag === 'line' && !hasStroke) {
      el.setAttribute('stroke', '#64748b');
      if (!el.hasAttribute('stroke-width')) el.setAttribute('stroke-width', '1.5');
    } else if (tag === 'rect' && !hasFill && !hasStroke) {
      const parent = el.parentElement;
      let hasFollowingText = false;
      if (parent) {
        let seenSelf = false;
        for (const sibling of Array.from(parent.children)) {
          if (sibling === el) {
            seenSelf = true;
            continue;
          }
          if (seenSelf && (sibling.localName === 'text' || sibling.localName === 'g')) {
            hasFollowingText = true;
            break;
          }
        }
      }
      if (hasFollowingText) {
        const h = parseNumericDimension(el.getAttribute('height'));
        const isHeaderBar = h !== null && h <= 64;
        el.setAttribute('fill', isHeaderBar ? '#e2e8f0' : '#ffffff');
        el.setAttribute('stroke', '#cbd5e1');
        el.setAttribute('stroke-width', isHeaderBar ? '1' : '1.5');
        if (!el.hasAttribute('rx')) el.setAttribute('rx', isHeaderBar ? '6' : '10');
      }
    }
  }

  for (const child of Array.from(el.children)) {
    repairUnstyledPrimitives(child, hasFill, hasStroke, nextInMaskOrClip);
  }
}

/**
 * Sanitize an SVG diagram string using strict DOM parsing and an explicit allowlist.
 * Safely resolves allowlisted visual CSS declarations from `<style>` blocks and `style="..."`
 * directly onto matching elements before stripping `<style>` and `class`, guaranteeing zero
 * script execution, foreignObject, event handlers, or external URLs while preserving colors,
 * typography, rounded corners, and strokes cleanly.
 */
export function sanitizeSvgDiagram(text: string): string | null {
  if (!text || text.length > 100_000) return null;
  if (/<!DOCTYPE|<!ENTITY/i.test(text)) return null;

  // Strip optional XML declarations and comments before locating the <svg> root
  const stripped = text
    .replace(/^\uFEFF/, '')
    .replace(/<\?xml[\s\S]*?\?>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .trim();

  const startIdx = stripped.search(/<svg(?=[\s>])/i);
  const endIdx = stripped.search(/<\/svg>\s*$/i);
  if (startIdx < 0) return null;

  const candidate =
    endIdx >= startIdx ? stripped.slice(startIdx, endIdx + 6) : stripped.slice(startIdx);
  const withNamespace = candidate.replace(/^<svg(?=[\s>])([^>]*?)>/i, (opening, attrs: string) =>
    /(?:^|\s)xmlns\s*=/.test(attrs) ? opening : `<svg xmlns="${svgNamespace}"${attrs}>`,
  );

  if (typeof DOMParser === 'undefined' || typeof window === 'undefined') {
    const cleaned = withNamespace
      .replace(
        /<(script|foreignObject|iframe|object|embed|style|image|a|animate|animateMotion|animateTransform|set)\b[\s\S]*?<\/\1>/gi,
        '',
      )
      .replace(
        /<(script|foreignObject|iframe|object|embed|style|image|a|animate|animateMotion|animateTransform|set)\b[^>]*\/?>/gi,
        '',
      )
      .replace(/\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
      .replace(/(?:javascript|vbscript|data)\s*:/gi, '');
    return /<svg\b[^>]*>[\s\S]+<\/svg>/i.test(cleaned) ? cleaned : null;
  }

  const parsed = new DOMParser().parseFromString(withNamespace, 'image/svg+xml');
  const root = parsed.documentElement;
  if (!root || root.localName !== 'svg' || root.namespaceURI !== svgNamespace) return null;
  if (root.querySelector('parsererror')) return null;

  // Collect safe visual CSS rules from any <style> elements before <style> is dropped
  const styleSeen = new Set<Element>();
  const styleChunks: string[] = [];
  for (const styleEl of [
    ...Array.from(root.getElementsByTagNameNS(svgNamespace, 'style')),
    ...Array.from(root.getElementsByTagName('style')),
  ]) {
    if (styleSeen.has(styleEl)) continue;
    styleSeen.add(styleEl);
    if (styleEl.textContent) styleChunks.push(styleEl.textContent);
  }
  const cssRules = styleChunks.length > 0 ? parseSvgCssRules(styleChunks.join('\n')) : [];

  const doc = window.document.implementation.createDocument(svgNamespace, 'svg');
  let remaining = 1200;

  function copy(source: Element, destination: Element, depth: number): boolean {
    if (--remaining < 0 || depth > 28) return false;

    let inlineStyleRaw = '';

    // 1. Copy explicit allowlisted SVG attributes first (lowest cascade precedence)
    for (const attr of Array.from(source.attributes)) {
      const { name, localName, value, namespaceURI } = attr;
      if (depth === 0 && (name === 'xmlns' || name.startsWith('xmlns:'))) continue;

      // Never allow event handlers
      if (/^on/i.test(localName)) continue;

      // Support internal fragment references on <use href="#id"> or <use xlink:href="#id">
      if (
        source.localName === 'use' &&
        (name === 'href' || (namespaceURI === xlinkNamespace && localName === 'href'))
      ) {
        const trimmedRef = value.trim();
        if (/^#[A-Za-z_][\w.-]{0,100}$/.test(trimmedRef)) {
          destination.setAttribute('href', trimmedRef);
        }
        continue;
      }

      if (!namespaceURI && name === 'style') {
        inlineStyleRaw = value;
        continue;
      }

      if (namespaceURI || !ALLOWED_ATTRIBUTES.has(name)) {
        // Silently drop harmless/disallowed attributes (class, role, aria-*, data-*, etc.)
        continue;
      }

      if (!isSafeAttributeValue(name, value)) continue;
      destination.setAttribute(name, normalizeStyleAttrValue(name, value));
    }

    // 2. Apply matching safe <style> rules (overrides presentation attributes)
    if (cssRules.length > 0) {
      const resolvedCss = resolveCssStylesForElement(source, cssRules);
      for (const [prop, val] of resolvedCss) {
        destination.setAttribute(prop, val);
      }
    }

    // 3. Apply inline style="..." declarations (highest precedence)
    if (inlineStyleRaw) {
      for (const decl of parseDeclarations(inlineStyleRaw)) {
        destination.setAttribute(decl.prop, decl.value);
      }
    }

    for (const child of Array.from(source.childNodes)) {
      if (child.nodeType === Node.ELEMENT_NODE) {
        const element = child as Element;
        if (BLOCKED_SUBTREE_TAGS.has(element.localName)) continue;
        if (element.namespaceURI !== svgNamespace || !ALLOWED_TAGS.has(element.localName)) {
          continue;
        }
        const target = doc.createElementNS(svgNamespace, element.localName);
        if (copy(element, target, depth + 1)) {
          destination.appendChild(target);
        }
      } else if (child.nodeType === Node.TEXT_NODE || child.nodeType === Node.CDATA_SECTION_NODE) {
        destination.appendChild(doc.createTextNode(child.textContent ?? ''));
      }
    }
    return true;
  }

  if (!copy(root, doc.documentElement, 0)) return null;

  // Repair legacy/unstyled open paths or container rects that would otherwise render solid black
  repairUnstyledPrimitives(doc.documentElement, false, false, false);

  // Ensure a clean Unicode/Sinhala-capable default font stack on the root <svg>
  const existingFont = doc.documentElement.getAttribute('font-family');
  doc.documentElement.setAttribute(
    'font-family',
    existingFont ? ensureUnicodeFontFallback(existingFont) : DEFAULT_SVG_FONT_FAMILY,
  );

  // Validate or synthesize viewBox so inline rendering always scales crisply
  const rawViewBox = doc.documentElement.getAttribute('viewBox');
  if (rawViewBox) {
    const parts = rawViewBox.trim().split(/[\s,]+/).map(Number);
    if (
      parts.length !== 4 ||
      parts.some((v) => !Number.isFinite(v)) ||
      parts[2] <= 0 ||
      parts[3] <= 0
    ) {
      doc.documentElement.removeAttribute('viewBox');
    } else {
      doc.documentElement.setAttribute('viewBox', parts.join(' '));
    }
  }
  if (!doc.documentElement.getAttribute('viewBox')) {
    const w = parseNumericDimension(doc.documentElement.getAttribute('width')) ?? 640;
    const h = parseNumericDimension(doc.documentElement.getAttribute('height')) ?? 380;
    doc.documentElement.setAttribute('viewBox', `0 0 ${w} ${h}`);
  }

  // Ensure explicit xmlns so standalone data-URI <img> and downloaded .svg always render
  doc.documentElement.setAttribute('xmlns', svgNamespace);

  // Verify the sanitized SVG actually contains at least one drawable/text child
  if (doc.documentElement.childElementCount === 0) return null;

  return new XMLSerializer().serializeToString(doc.documentElement);
}
