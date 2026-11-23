import { lazy, Suspense, useEffect, useRef, useState, type FormEvent } from 'react';
import { ArrowUp, Check, ChevronDown, Clipboard, ImagePlus, Maximize2, PanelLeft, Paperclip, Pencil, Plus, Settings2, Square, Trash2, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useAssistant } from './AssistantContext';
import { prepareImage } from './chatClient';
import { CHAT_LIMITS, PROVIDERS } from './protocol';
import './assistant.css';

export function PetFace({ mood = 'ready' }: { mood?: 'ready' | 'working' | 'focus' | 'break' }) {
  const { preferences } = useApp();
  return (
    <span className="pip-pet" data-mood={mood} data-motion={preferences.reducedMotion ? 'off' : undefined} aria-hidden="true">
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

const AssistantMarkdown = lazy(() => import('./AssistantMarkdown'));

export function AssistantChat({ onClose }: { onClose?: () => void }) {
  const floating = !!onClose;
  const assistant = useAssistant();
  const [historyOpen, setHistoryOpen] = useState(false);
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
  }, [assistant.active.messages, historyOpen]);

  useEffect(() => {
    follow.current = true;
    if (scroller.current) scroller.current.scrollTop = scroller.current.scrollHeight;
    imageRequest.current++;
    setProcessing(false);
    return () => { imageRequest.current++; };
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
          <button type="button" className="pip-icon" aria-expanded={historyOpen} onClick={() => setHistoryOpen(open => !open)} aria-label="Chat history" title="Chat history"><PanelLeft size={17} /></button>
          <button type="button" className="pip-icon" onClick={assistant.newChat} disabled={assistant.busy || !assistant.active.messages.length} aria-label="New chat" title="New chat"><Plus size={17} /></button>
          <button type="button" className="pip-icon" onClick={assistant.openSettings} aria-label="AI settings" title="AI settings"><Settings2 size={17} /></button>
          {floating && <>
            <button type="button" className="pip-icon pip-maximize" onClick={() => {
              assistant.openFullChat();
              assistant.setPetOpen(false);
            }} aria-label="Open full assistant" title="Open full assistant"><Maximize2 size={15} /></button>
            <button type="button" className="pip-icon" onClick={onClose} aria-label="Close chat" title="Close chat"><X size={18} /></button>
          </>}
        </div>
      </header>
      <div className={`pip-chat-body${historyOpen ? ' pip-history-open' : ''}`}>
        {historyOpen && (
          <aside className="pip-history" aria-label="Chat history">
            <div className="pip-history-heading">
              <h3>Chat history</h3>
              <button type="button" className="pip-icon" onClick={() => setHistoryOpen(false)} aria-label="Close chat history"><X size={15} /></button>
            </div>
            <ul>
              {assistant.conversations.map(chat => (
                <li key={chat.id} data-active={chat.id === assistant.activeId}>
                  <button type="button" className="pip-history-thread" aria-current={chat.id === assistant.activeId ? 'true' : undefined}
                    disabled={assistant.busy} title={chat.title} onClick={() => {
                      assistant.switchChat(chat.id);
                      if (floating) setHistoryOpen(false);
                    }}>{chat.title}</button>
                  {chat.messages.length > 0 && <>
                    <button type="button" className="pip-icon" disabled={assistant.busy}
                      aria-label={`Rename ${chat.title}`} title="Rename chat" onClick={() => {
                        const title = window.prompt('Conversation name', chat.title);
                        if (title !== null) assistant.renameChat(chat.id, title);
                      }}><Pencil size={13} /></button>
                    <button type="button" className="pip-icon" disabled={assistant.busy}
                      aria-label={`Delete ${chat.title}`} title="Delete chat" onClick={() => {
                        if (window.confirm(`Delete the conversation “${chat.title}”?`)) assistant.removeChat(chat.id);
                      }}><Trash2 size={13} /></button>
                  </>}
                </li>
              ))}
            </ul>
          </aside>
        )}
        <div className="pip-chat-content">
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
                <Suspense fallback={<p>{message.text}</p>}>
                  <AssistantMarkdown text={message.text} />
                </Suspense>
              </div> : <p className="pip-muted">{message.state === 'streaming' ? 'Thinking…' : message.state === 'stopped' ? 'Reply stopped.' : 'Reply unavailable.'}</p>
            )}
            {message.generatedImage && (
              <a className="block" href={`data:${message.generatedImage.mime};base64,${message.generatedImage.base64}`} download={`studyflow-image.${message.generatedImage.mime.split('/')[1]}`}>
                <img className="mt-2 max-h-96 max-w-full rounded-lg object-contain" alt="AI-generated image. Click to download."
                  src={`data:${message.generatedImage.mime};base64,${message.generatedImage.base64}`} />
              </a>
            )}
            {message.edit && <div className="pip-message-meta">
              <span>{message.edit.title}</span>
              <button type="button" className="pip-primary-text" disabled={assistant.busy} onClick={() => void assistant.applyEdit(message)}>Apply</button>
              <button type="button" className="pip-primary-text" disabled={assistant.busy} onClick={() => assistant.cancelEdit(message.id)}>Cancel</button>
            </div>}
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
            <pre>{assistant.context.text || 'No workspace records will be sent.'}</pre>
          </details>}
        </div>
        {assistant.cooldown > 0 && <p className="pip-notice" role="status">Try again in {assistant.cooldown}s.</p>}
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
              <button type="button" className="pip-icon" aria-label="Generate image from message"
                title={assistant.settings.provider === 'claude' ? 'Choose OpenAI or Gemini to generate images' : 'Generate an image from your message'}
                disabled={!configured || assistant.busy || assistant.cooldown > 0 || processing || !assistant.available || !assistant.draft.trim() || !!assistant.attachment || assistant.settings.provider === 'claude'}
                onClick={() => { follow.current = true; void assistant.send(true); }}><ImagePlus size={17} /></button>
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
              : <button type="submit" className="pip-send" disabled={!assistant.available || assistant.cooldown > 0 || processing || (!assistant.draft.trim() && !assistant.attachment)} aria-label="Send message" title="Send message"><ArrowUp size={18} /></button>}
          </div>
        </div>
      </form>
        </div>
      </div>
    </section>
  );
}
