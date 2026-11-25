const svgNamespace = 'http://www.w3.org/2000/svg';
const xlinkNamespace = 'http://www.w3.org/1999/xlink';

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
  'opacity',
  'font-size',
  'font-family',
  'font-weight',
  'font-style',
  'letter-spacing',
  'text-anchor',
  'dominant-baseline',
  'alignment-baseline',
  'stop-color',
  'stop-opacity',
]);

const ID_PATTERN = /^[A-Za-z_][\w.-]{0,100}$/;
const INTERNAL_URL_PATTERN = /^url\(\s*['"]?#[A-Za-z_][\w.-]{0,100}['"]?\s*\)$/;

function isSafeAttributeValue(name: string, value: string): boolean {
  if (value.length > 32_000) return false;
  if (/[\u0000-\u0008]|\/\*/.test(value)) return false;
  if (/(?:javascript|vbscript|data)\s*:/i.test(value)) return false;
  if (/expression\s*\(/i.test(value)) return false;
  if (name === 'id') return ID_PATTERN.test(value.trim());
  if (/url\s*\(/i.test(value)) {
    return URL_REFERENCE_ATTRS.has(name) && INTERNAL_URL_PATTERN.test(value.trim());
  }
  return true;
}

function applySafeInlineStyles(styleValue: string, destination: Element) {
  const declarations = styleValue.split(';');
  for (const decl of declarations) {
    const colonIdx = decl.indexOf(':');
    if (colonIdx <= 0) continue;
    const prop = decl.slice(0, colonIdx).trim().toLowerCase();
    const val = decl.slice(colonIdx + 1).trim();
    if (!prop || !val || !SAFE_STYLE_PROPS.has(prop)) continue;
    if (!isSafeAttributeValue(prop, val)) continue;
    if (!destination.hasAttribute(prop)) {
      destination.setAttribute(prop, val);
    }
  }
}

function parseNumericDimension(raw: string | null): number | null {
  if (!raw) return null;
  const match = raw.trim().match(/^(\d+(?:\.\d+)?)(?:px)?$/i);
  if (!match) return null;
  const num = Number(match[1]);
  return Number.isFinite(num) && num > 0 ? num : null;
}

/**
 * Sanitize an SVG diagram string using strict DOM parsing and an explicit allowlist.
 * Drops unsafe tags/attributes cleanly rather than aborting on harmless presentation metadata,
 * while guaranteeing zero script execution, foreignObject, event handlers, or external URLs.
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

  const candidate = endIdx >= startIdx ? stripped.slice(startIdx, endIdx + 6) : stripped.slice(startIdx);
  const withNamespace = candidate.replace(/^<svg(?=[\s>])([^>]*?)>/i, (opening, attrs: string) =>
    /(?:^|\s)xmlns\s*=/.test(attrs) ? opening : `<svg xmlns="${svgNamespace}"${attrs}>`,
  );

  if (typeof DOMParser === 'undefined' || typeof window === 'undefined') {
    const cleaned = withNamespace
      .replace(/<(script|foreignObject|iframe|object|embed|style|image|a|animate|animateMotion|animateTransform|set)\b[\s\S]*?<\/\1>/gi, '')
      .replace(/<(script|foreignObject|iframe|object|embed|style|image|a|animate|animateMotion|animateTransform|set)\b[^>]*\/?>/gi, '')
      .replace(/\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
      .replace(/(?:javascript|vbscript|data)\s*:/gi, '');
    return /<svg\b[^>]*>[\s\S]+<\/svg>/i.test(cleaned) ? cleaned : null;
  }

  const parsed = new DOMParser().parseFromString(withNamespace, 'image/svg+xml');
  const root = parsed.documentElement;
  if (!root || root.localName !== 'svg' || root.namespaceURI !== svgNamespace) return null;
  if (root.querySelector('parsererror')) return null;

  const doc = window.document.implementation.createDocument(svgNamespace, 'svg');
  let remaining = 1200;

  function copy(source: Element, destination: Element, depth: number): boolean {
    if (--remaining < 0 || depth > 28) return false;

    for (const attr of Array.from(source.attributes)) {
      const { name, localName, value, namespaceURI } = attr;
      if (depth === 0 && (name === 'xmlns' || name.startsWith('xmlns:'))) continue;

      // Never allow event handlers
      if (/^on/i.test(localName)) continue;

      // Support internal fragment references on <use href="#id"> or <use xlink:href="#id">
      if (source.localName === 'use' && (name === 'href' || (namespaceURI === xlinkNamespace && localName === 'href'))) {
        const trimmedRef = value.trim();
        if (/^#[A-Za-z_][\w.-]{0,100}$/.test(trimmedRef)) {
          destination.setAttribute('href', trimmedRef);
        }
        continue;
      }

      // Safely lift whitelisted visual CSS declarations from style="..."
      if (!namespaceURI && name === 'style') {
        applySafeInlineStyles(value, destination);
        continue;
      }

      if (namespaceURI || !ALLOWED_ATTRIBUTES.has(name)) {
        // Silently drop harmless/disallowed attributes (class, role, aria-*, data-*, etc.)
        continue;
      }

      if (!isSafeAttributeValue(name, value)) continue;
      destination.setAttribute(name, value);
    }

    for (const child of Array.from(source.childNodes)) {
      if (child.nodeType === Node.ELEMENT_NODE) {
        const element = child as Element;
        if (BLOCKED_SUBTREE_TAGS.has(element.localName)) continue;
        if (element.namespaceURI !== svgNamespace || !ALLOWED_TAGS.has(element.localName)) {
          // Drop unknown wrapper element safely
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

  // Validate or synthesize viewBox so inline rendering always scales crisply
  const rawViewBox = doc.documentElement.getAttribute('viewBox');
  if (rawViewBox) {
    const parts = rawViewBox.trim().split(/[\s,]+/).map(Number);
    if (parts.length !== 4 || parts.some((v) => !Number.isFinite(v)) || parts[2] <= 0 || parts[3] <= 0) {
      doc.documentElement.removeAttribute('viewBox');
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
