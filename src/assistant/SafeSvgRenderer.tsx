import React, { useMemo } from 'react';
import { sanitizeSvgDiagram } from './svgDiagram';

const SVG_ATTR_TO_REACT: Record<string, string> = {
  'fill-opacity': 'fillOpacity',
  'fill-rule': 'fillRule',
  'stroke-width': 'strokeWidth',
  'stroke-opacity': 'strokeOpacity',
  'stroke-linecap': 'strokeLinecap',
  'stroke-linejoin': 'strokeLinejoin',
  'stroke-dasharray': 'strokeDasharray',
  'stroke-dashoffset': 'strokeDashoffset',
  'stroke-miterlimit': 'strokeMiterlimit',
  'font-size': 'fontSize',
  'font-family': 'fontFamily',
  'font-weight': 'fontWeight',
  'font-style': 'fontStyle',
  'letter-spacing': 'letterSpacing',
  'word-spacing': 'wordSpacing',
  'text-anchor': 'textAnchor',
  'text-decoration': 'textDecoration',
  'dominant-baseline': 'dominantBaseline',
  'alignment-baseline': 'alignmentBaseline',
  'baseline-shift': 'baselineShift',
  'marker-start': 'markerStart',
  'marker-mid': 'markerMid',
  'marker-end': 'markerEnd',
  'stop-color': 'stopColor',
  'stop-opacity': 'stopOpacity',
  'clip-path': 'clipPath',
  'clip-rule': 'clipRule',
  'vector-effect': 'vectorEffect',
  'paint-order': 'paintOrder',
  'shape-rendering': 'shapeRendering',
  'text-rendering': 'textRendering',
};

function domNodeToReact(node: Node, key: string): React.ReactNode {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent;
  }
  if (node.nodeType !== Node.ELEMENT_NODE) {
    return null;
  }

  const el = node as Element;
  const tag = el.localName;
  const props: Record<string, unknown> = { key };

  for (const attr of Array.from(el.attributes)) {
    if (attr.name === 'xmlns' || attr.name.startsWith('xmlns:')) continue;
    const reactProp = SVG_ATTR_TO_REACT[attr.name] ?? attr.name;
    props[reactProp] = attr.value;
  }

  if (tag === 'svg') {
    props.className = 'block w-full h-auto max-h-[380px] select-none';
    props.role = 'img';
    props['aria-label'] = 'Interactive diagram';
  }

  const children: React.ReactNode[] = [];
  let idx = 0;
  for (const child of Array.from(el.childNodes)) {
    const rendered = domNodeToReact(child, `${key}-${idx++}`);
    if (rendered !== null && rendered !== '') {
      children.push(rendered);
    }
  }

  return React.createElement(tag, props, children.length > 0 ? children : undefined);
}

/**
 * Renders sanitized SVG markup cleanly via React's virtual DOM (`React.createElement`)
 * without `dangerouslySetInnerHTML`, enabling flicker-free 60fps updates as sliders move
 * while enforcing the strict `sanitizeSvgDiagram` allowlist.
 */
export const SafeSvgRenderer: React.FC<{ markup: string }> = ({ markup }) => {
  const rendered = useMemo(() => {
    const clean = sanitizeSvgDiagram(markup);
    if (!clean || typeof DOMParser === 'undefined') return null;
    const parsed = new DOMParser().parseFromString(clean, 'image/svg+xml');
    const root = parsed.documentElement;
    if (!root || root.localName !== 'svg' || root.querySelector('parsererror')) return null;
    return domNodeToReact(root, 'svg-root');
  }, [markup]);

  if (!rendered) {
    return (
      <div className="p-4 text-center text-[12px] text-[var(--text-muted)]">
        Visual preview unavailable for current parameter values.
      </div>
    );
  }

  return <>{rendered}</>;
};
