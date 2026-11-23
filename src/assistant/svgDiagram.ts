const svgNamespace = 'http://www.w3.org/2000/svg';
const tags = new Set('svg g title desc defs path rect circle ellipse line polyline polygon text tspan marker linearGradient radialGradient stop'.split(' '));
const attributes = new Set([
  'id', 'x', 'y', 'x1', 'y1', 'x2', 'y2', 'cx', 'cy', 'r', 'rx', 'ry', 'width', 'height',
  'viewBox', 'preserveAspectRatio', 'd', 'points', 'transform', 'fill', 'fill-opacity', 'fill-rule',
  'stroke', 'stroke-width', 'stroke-opacity', 'stroke-linecap', 'stroke-linejoin', 'stroke-dasharray',
  'opacity', 'font-size', 'font-family', 'font-weight', 'text-anchor', 'dominant-baseline', 'dx', 'dy',
  'marker-start', 'marker-mid', 'marker-end', 'markerWidth', 'markerHeight', 'markerUnits', 'refX', 'refY',
  'orient', 'gradientUnits', 'gradientTransform', 'offset', 'stop-color', 'stop-opacity', 'fx', 'fy',
]);
const paint = new Set(['fill', 'stroke', 'marker-start', 'marker-mid', 'marker-end']);

export function sanitizeSvgDiagram(text: string): string | null {
  if (text.length > 65_536 || /<!DOCTYPE|<!ENTITY|<\?/i.test(text)) return null;
  const withNamespace = text.trim().replace(/^<svg(?=[\s>])([^>]*?)>/i, (opening, attrs: string) =>
    /(?:^|\s)xmlns\s*=/.test(attrs) ? opening : `<svg xmlns="${svgNamespace}"${attrs}>`);
  const parsed = new DOMParser().parseFromString(withNamespace, 'image/svg+xml');
  const root = parsed.documentElement;
  if (root.localName !== 'svg' || root.namespaceURI !== svgNamespace) return null;
  const document = window.document.implementation.createDocument(svgNamespace, 'svg');
  let remaining = 700;

  function copy(source: Element, destination: Element, depth: number): boolean {
    if (--remaining < 0 || depth > 24 || source.namespaceURI !== svgNamespace || !tags.has(source.localName)) return false;
    for (const attribute of Array.from(source.attributes)) {
      const { name, value, namespaceURI } = attribute;
      if (depth === 0 && name === 'xmlns' && value === svgNamespace) continue;
      if (namespaceURI || !attributes.has(name) || value.length > 24000 || /[\u0000-\u0008\\]|\/\*/.test(value)) return false;
      if (name === 'id' && !/^[A-Za-z_][\w.-]{0,100}$/.test(value)) return false;
      if (/url\s*\(/i.test(value) && (!paint.has(name) || !/^url\(#[A-Za-z_][\w.-]{0,100}\)$/.test(value))) return false;
      destination.setAttribute(name, value);
    }
    for (const child of Array.from(source.childNodes)) {
      if (child.nodeType === Node.ELEMENT_NODE) {
        const element = child as Element;
        const target = document.createElementNS(svgNamespace, element.localName);
        if (!copy(element, target, depth + 1)) return false;
        destination.appendChild(target);
      } else if (child.nodeType === Node.TEXT_NODE || child.nodeType === Node.CDATA_SECTION_NODE) {
        destination.appendChild(document.createTextNode(child.textContent ?? ''));
      } else if (child.nodeType !== Node.COMMENT_NODE) return false;
    }
    return true;
  }

  if (!copy(root, document.documentElement, 0)) return null;
  const viewBox = root.getAttribute('viewBox')?.trim().split(/[\s,]+/).map(Number);
  if (viewBox && (viewBox.length !== 4 || viewBox.some(value => !Number.isFinite(value)) || viewBox[2] <= 0 || viewBox[3] <= 0)) return null;
  return new XMLSerializer().serializeToString(document.documentElement);
}
