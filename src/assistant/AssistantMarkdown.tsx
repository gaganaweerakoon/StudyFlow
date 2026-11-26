import { Children, isValidElement, memo, useMemo } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { AssistantDiagram } from './AssistantDiagram';
import { InteractiveWidget } from './InteractiveWidget';
import { NoteDiagram } from './NoteDiagram';
import { PromptOptionsCard } from './PromptOptionsCard';
import { parseInteractiveSpec, parsePromptSpec } from './interactiveSchema';
import { normalizeMarkdownForDisplay } from './markdownNormalize';
import type { PdfFigure } from '../notes/pdfMarkdown';

interface AssistantMarkdownProps {
  text: string;
  diagrams?: boolean;
  noteDiagrams?: boolean;
  figures?: PdfFigure[];
  allowDataImages?: boolean;
  dirAuto?: boolean;
  onSendPrompt?: (text: string) => void;
  busy?: boolean;
}

export default memo(function AssistantMarkdown({
  text,
  diagrams = false,
  noteDiagrams = false,
  figures,
  allowDataImages = false,
  dirAuto = false,
  onSendPrompt,
  busy = false,
}: AssistantMarkdownProps) {
  const dirProp = dirAuto ? ({ dir: 'auto' as const } as const) : {};
  const normalized = useMemo(() => normalizeMarkdownForDisplay(text), [text]);

  return (
    <Markdown
      skipHtml
      remarkPlugins={[remarkGfm, remarkMath]}
      rehypePlugins={[[rehypeKatex, { trust: false, strict: 'ignore', throwOnError: false }]]}
      components={{
        h1: ({ children }) => <h1 {...dirProp}>{children}</h1>,
        h2: ({ children }) => <h2 {...dirProp}>{children}</h2>,
        h3: ({ children }) => <h3 {...dirProp}>{children}</h3>,
        h4: ({ children }) => <h4 {...dirProp}>{children}</h4>,
        p: ({ children }) => <p {...dirProp}>{children}</p>,
        li: ({ children }) => <li {...dirProp}>{children}</li>,
        blockquote: ({ children }) => <blockquote {...dirProp}>{children}</blockquote>,
        table: ({ children }) => (
          <div className="note-table-wrap">
            <table>{children}</table>
          </div>
        ),
        td: ({ children }) => <td {...dirProp}>{children}</td>,
        th: ({ children }) => <th {...dirProp}>{children}</th>,
        pre: ({ children }) => {
          const child = Children.toArray(children)[0];
          if (
            isValidElement<{ className?: string; children?: unknown }>(child) &&
            typeof child.props.children === 'string'
          ) {
            const cls = (child.props.className ?? '').toLowerCase();
            const rawCode = child.props.children.trim();

            if (cls === 'language-pip-interactive' || cls === 'language-interactive') {
              if (!diagrams && !noteDiagrams) {
                return (
                  <div className="pip-diagram-streaming" role="status">
                    Building interactive simulator…
                  </div>
                );
              }
              const spec = parseInteractiveSpec(rawCode);
              if (spec) {
                return (
                  <InteractiveWidget
                    spec={spec}
                    onSendPrompt={noteDiagrams ? undefined : onSendPrompt}
                    busy={busy}
                  />
                );
              }
            }

            if (
              cls === 'language-pip-prompt' ||
              cls === 'language-pip-options' ||
              cls === 'language-pip-clarify'
            ) {
              if (!diagrams && !noteDiagrams) {
                return (
                  <div className="pip-diagram-streaming" role="status">
                    Preparing interactive options…
                  </div>
                );
              }
              const promptSpec = parsePromptSpec(rawCode);
              if (promptSpec) {
                return (
                  <PromptOptionsCard
                    spec={promptSpec}
                    onSendPrompt={noteDiagrams ? undefined : onSendPrompt}
                    busy={busy}
                  />
                );
              }
            }

            const isExplicitSvg = cls === 'language-svg';
            const looksLikeSvg =
              (cls === 'language-xml' || cls === 'language-html' || !cls) &&
              /^(?:<\?xml[\s\S]*?\?>\s*)?<svg(?=[\s>])/i.test(rawCode);
            if (isExplicitSvg || looksLikeSvg) {
              const hasClosingTag = /<\/svg>\s*$/i.test(rawCode);
              if (noteDiagrams) return <NoteDiagram markup={rawCode} />;
              if (diagrams && hasClosingTag) {
                return <AssistantDiagram markup={rawCode} />;
              }
              if (!diagrams) {
                return (
                  <div className="pip-diagram-streaming" role="status">
                    Drawing SVG diagram…
                  </div>
                );
              }
            }
          }
          return <pre>{children}</pre>;
        },
        img: ({ src, alt }) => {
          if (src && figures?.length) {
            const figure = figures.find((item) => item.id === src);
            if (figure) {
              return (
                <img
                  src={figure.image}
                  alt={alt ?? 'Document figure'}
                  className="my-3 max-h-96 rounded-lg border border-[var(--border-subtle)] object-contain"
                />
              );
            }
          }
          if (allowDataImages && src && /^data:image\/(?:png|jpe?g|webp|gif);base64,/i.test(src)) {
            return (
              <img
                src={src}
                alt={alt ?? 'Attached image'}
                className="my-3 max-h-96 rounded-lg border border-[var(--border-subtle)] object-contain"
              />
            );
          }
          return <span>{alt ?? '[Image]'}</span>;
        },
        a: ({ children, href }) => (
          <a href={href} target="_blank" rel="noopener noreferrer">
            {children}
          </a>
        ),
      }}
    >
      {normalized}
    </Markdown>
  );
});
