import { memo } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

export default memo(function AssistantMarkdown({ text }: { text: string }) {
  return (
    <Markdown
      skipHtml
      remarkPlugins={[remarkGfm, remarkMath]}
      rehypePlugins={[[rehypeKatex, { trust: false }]]}
      components={{
        img: ({ alt }) => <span>{alt ?? '[Image]'}</span>,
        a: ({ children, href }) => <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>,
      }}
    >{text}</Markdown>
  );
});
