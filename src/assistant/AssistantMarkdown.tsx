import { Children, isValidElement } from 'react';
import { AssistantDiagram } from './AssistantDiagram';
import { memo } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

export default memo(function AssistantMarkdown({ text, diagrams = false }: { text: string; diagrams?: boolean }) {
  return (
    <Markdown
      skipHtml
      remarkPlugins={[remarkGfm, remarkMath]}
      rehypePlugins={[[rehypeKatex, { trust: false }]]}
      components={{
        pre: ({ children }) => {
          const child = Children.toArray(children)[0];
          if (diagrams && isValidElement<{ className?: string; children?: string }>(child) &&
              child.props.className === 'language-svg' && typeof child.props.children === 'string') {
            return <AssistantDiagram markup={child.props.children} />;
          }
          return <pre>{children}</pre>;
        },
        img: ({ alt }) => <span>{alt ?? '[Image]'}</span>,
        a: ({ children, href }) => <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>,
      }}
    >{text}</Markdown>
  );
});
