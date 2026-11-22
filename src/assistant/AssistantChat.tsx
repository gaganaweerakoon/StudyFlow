import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ArrowUp, Check, ChevronDown, Clipboard, Maximize2, Paperclip, Plus, Settings2, Square, X } from 'lucide-react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { useAssistant } from './AssistantContext';
import { prepareImage } from './chatClient';
import { CHAT_LIMITS, PROVIDERS } from './protocol';
import './assistant.css';

export function PetFace({ mood = 'ready' }: { mood?: 'ready' | 'working' | 'focus' | 'break' }) {
  return (
    <span className="pip-pet" data-mood={mood} aria-hidden="true">
      <span className="pip-ear pip-ear-left" />
      <span className="pip-ear pip-ear-right" />
      <span className="pip-face">
        <span className="pip-eyes"><i /><i /></span>
        <span className="pip-beak" />
      </span>
    </span>
  );
}

const starters = [
  'What should I study next?',
  'Help me plan a 25-minute focus session.',
  'Quiz me on the note I have open.',
];

export function AssistantChat({ floating = false }: { floating?: boolean }) {
  const assistant = useAssistant();
  const [processing, setProcessing] = useState(false);
  const [copied, setCopied] = useState('');
  const picker = useRef<HTMLInputElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const follow = useRef(true);
  const imageRequest = useRef(0);
  const configured = assistant.configured.includes(assistant.settings.provider);

  useEffect(() => {
    if (scroller.current && follow.current) scroller.current.scrollTop = scroller.current.scrollHeight;
  }, [assistant.active.messages]);

  useEffect(() => {
    follow.current = true;
    if (scroller.current) scroller.current.scrollTop = scroller.current.scrollHeight;
    imageRequest.current++;
    setProcessing(false);
  }, [assistant.activeId]);

  async function attach(file?: File) {
    if (!file || assistant.busy || !configured || !assistant.available) return;
    const request = ++imageRequest.current;
    setProcessing(true);
    assistant.setNotice('');
    try {
      const result = await prepareImage(file, assistant.detail);
      if (request === imageRequest.current) assistant.setAttachment(result);
    } catch (error) {
      if (request === imageRequest.current) assistant.setNotice(error instanceof Error ? error.message : 'Could not attach this image.');
    } finally {
      if (request === imageRequest.current) setProcessing(false);
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    follow.current = true;
    if (!processing) void assistant.send();
  }

  return (
    <section className={`pip-chat ${floating ? 'pip-chat-floating' : 'pip-chat-page'}`} aria-label="StudyFlow Assistant">
      <header className="pip-header">
        <div className="pip-header-id">
          <PetFace mood={assistant.busy ? 'working' : 'ready'} />
          <div>
            <h2>Pip <span>Study assistant</span></h2>
            <p>{configured ? `${PROVIDERS[assistant.settings.provider].label} · ${assistant.model}` : 'Connect an AI provider to chat'}</p>
          </div>
        </div>
        <div className="pip-actions">
          <button type="button" className="pip-icon" onClick={assistant.newChat} disabled={assistant.busy || !assistant.active.messages.length} aria-label="New chat" title="New chat"><Plus size={17} /></button>
          <button type="button" className="pip-icon" onClick={assistant.openSettings} aria-label="AI settings" title="AI settings"><Settings2 size={17} /></button>
          {floating && <>
            <button type="button" className="pip-icon pip-maximize" onClick={() => {
              assistant.openFullChat();
              assistant.setPetOpen(false);
            }} aria-label="Open full assistant" title="Open full assistant"><Maximize2 size={15} /></button>
            <button type="button" className="pip-icon" onClick={() => assistant.setPetOpen(false)} aria-label="Close chat" title="Close chat"><X size={18} /></button>
          </>}
        </div>
      </header>
      {assistant.conversations.length > 1 && (
        <div className="pip-conversations">
          <label htmlFor="pip-chat-thread">Conversation</label>
          <select id="pip-chat-thread" value={assistant.activeId} disabled={assistant.busy} onChange={event => assistant.switchChat(event.target.value)}>
            {assistant.conversations.map(chat => <option key={chat.id} value={chat.id}>{chat.title}</option>)}
          </select>
        </div>
      )}

      <div className="pip-messages" ref={scroller} onScroll={event => {
        const el = event.currentTarget;
        follow.current = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
      }}>
        {!assistant.active.messages.length && (
          <div className="pip-welcome">
            <PetFace />
            <h3>What are we studying?</h3>
            <p>Ask about your plan, work through a problem, or paste a screenshot.</p>
            {!assistant.available
              ? <p>Open StudyFlow at <strong>localhost</strong> to use the assistant.</p>
              : !configured
                ? <button type="button" className="pip-primary-text" onClick={assistant.openSettings}>Connect an API key</button>
                : <div className="pip-starters">
                  {starters.map(prompt => <button key={prompt} type="button" onClick={() => {
                    assistant.setDraft(prompt);
                    input.current?.focus();
                  }}>{prompt}</button>)}
                </div>}
          </div>
        )}
        {assistant.active.messages.map(message => (
          <article key={message.id} className={`pip-message pip-${message.role}`} aria-label={message.role === 'user' ? 'You' : 'Pip'}>
            {message.role === 'assistant' && <div className="pip-message-name">Pip</div>}
            {message.attachment && <div className="pip-message-file"><Paperclip size={13} /> {message.attachment}</div>}
            {message.role === 'user' ? <p className="pip-user-text">{message.text}</p> : (
              message.text ? <div className="pip-markdown">
                <Markdown
                  skipHtml
                  remarkPlugins={[remarkGfm, remarkMath]}
                  rehypePlugins={[[rehypeKatex, { trust: false }]]}
                  components={{
                    img: ({ alt }) => <span>{alt ?? '[Image]'}</span>,
                    a: ({ children, href }) => <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>,
                  }}
                >{message.text}</Markdown>
              </div> : <p className="pip-muted">{message.state === 'streaming' ? 'Thinking…' : message.state === 'stopped' ? 'Reply stopped.' : 'Reply unavailable.'}</p>
            )}
            {message.role === 'assistant' && message.state !== 'streaming' && (
              <div className="pip-message-meta">
                {message.tokens && <span>{message.tokens.total.toLocaleString()} tokens</span>}
                {message.text && <button type="button" className="pip-icon" aria-label="Copy reply" title="Copy reply" onClick={async () => {
                  try { await navigator.clipboard.writeText(message.text); setCopied(message.id); }
                  catch { assistant.setNotice('Could not copy the reply. You can select its text and copy it.'); }
                }}>{copied === message.id ? <Check size={13} /> : <Clipboard size={13} />}</button>}
              </div>
            )}
          </article>
        ))}
      </div>

      <form className="pip-composer" onSubmit={submit}>
        <div className="pip-context">
          <label><input type="checkbox" checked={assistant.includeContext} onChange={event => assistant.setIncludeContext(event.target.checked)} /> Include context</label>
          {assistant.includeContext && <details>
            <summary title="Preview context sent with your message">{assistant.context.label}<ChevronDown size={12} /></summary>
            <pre>{assistant.context.text}</pre>
          </details>}
        </div>
        {assistant.notice && <p className="pip-notice" role="status">{assistant.notice}</p>}
        {assistant.attachment && <div className="pip-attachment">
          <img alt="" src={`data:${assistant.attachment.image.mime};base64,${assistant.attachment.image.base64}`} />
          <span>{assistant.attachment.name}</span>
          <button type="button" className="pip-icon" onClick={() => {
            imageRequest.current++;
            setProcessing(false);
            assistant.setAttachment(undefined);
          }} aria-label="Remove attachment"><X size={15} /></button>
        </div>}
        <div className="pip-input">
          <textarea
            ref={input}
            aria-label="Message Pip"
            placeholder="Ask Pip anything about your studies"
            rows={2}
            value={assistant.draft}
            maxLength={CHAT_LIMITS.prompt}
            onChange={event => assistant.setDraft(event.target.value)}
            onKeyDown={event => {
              if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                event.preventDefault();
                if (!assistant.busy && !processing) {
                  follow.current = true;
                  void assistant.send();
                }
              }
            }}
            onPaste={event => {
              const file = Array.from(event.clipboardData.files).find(item => item.type.startsWith('image/'));
              if (file && configured && assistant.available && !assistant.busy) {
                event.preventDefault();
                void attach(file);
              }
            }}
          />
          <div className="pip-input-bar">
            <div className="pip-actions">
              <input ref={picker} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={event => {
                void attach(event.target.files?.[0]);
                event.target.value = '';
              }} />
              <button type="button" className="pip-icon" title="Attach a screenshot or image" aria-label="Attach image" disabled={!configured || assistant.busy || processing || !assistant.available} onClick={() => picker.current?.click()}><Paperclip size={17} /></button>
              <select aria-label="Image detail" value={assistant.detail} onChange={event => assistant.setDetail(event.target.value === 'high' ? 'high' : 'standard')} disabled={assistant.busy || processing || !!assistant.attachment}>
                <option value="standard">Image detail</option>
                <option value="high">Fine text</option>
              </select>
              {assistant.previousAttachment && !assistant.attachment && !assistant.busy && !processing && (
                <button type="button" className="pip-reuse" onClick={() => assistant.setAttachment(assistant.previousAttachment)}>Reuse image</button>
              )}
              {processing && <span className="pip-muted" role="status">Preparing image…</span>}
            </div>
            {assistant.busy
              ? <button type="button" className="pip-send" onClick={assistant.stop} aria-label="Stop reply" title="Stop reply"><Square size={14} /></button>
              : <button type="submit" className="pip-send" disabled={!assistant.available || processing || (!assistant.draft.trim() && !assistant.attachment)} aria-label="Send message" title="Send message"><ArrowUp size={18} /></button>}
          </div>
        </div>
      </form>
    </section>
  );
}
