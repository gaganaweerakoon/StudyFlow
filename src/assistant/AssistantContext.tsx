import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { useApp } from '../context/AppContext';
import { estimatedTokens, isAssistantAvailable, sendChat, type Attachment } from './chatClient';
import { CHAT_LIMITS, PROVIDERS, type ChatRequest, type ChatTurn, type Provider, type TokenUsage } from './protocol';
import { localDay, workspaceContext, type WorkspacePage } from './workspaceContext';
import { mergeUsage, readSettings, readUsage, todayTokens, usageKey, writeSettings, writeUsage, type AssistantSettings } from './usage';

interface ChatMessage extends ChatTurn {
  id: string;
  attachment?: string;
  tokens?: TokenUsage;
  state?: 'streaming' | 'complete' | 'stopped' | 'error';
}

interface Conversation {
  id: string;
  title: string;
  messages: ChatMessage[];
}

const initial: Conversation = { id: 'first', title: 'New chat', messages: [] };
const createId = () => crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;

function useAssistantController() {
  const app = useApp();
  const [settings, setSettings] = useState(readSettings);
  const [usage, setUsage] = useState(() => mergeUsage(readUsage()));
  const [configured, setConfigured] = useState<Provider[]>([]);
  const [conversations, setConversations] = useState([initial]);
  const [activeId, setActiveId] = useState(initial.id);
  const [petOpen, setPetOpen] = useState(false);
  const [settingsRequested, setSettingsRequested] = useState(false);
  const [includeContext, setIncludeContext] = useState(true);
  const [draft, setDraft] = useState('');
  const [attachment, setAttachment] = useState<Attachment>();
  const [previousAttachment, setPreviousAttachment] = useState<Attachment>();
  const [detail, setDetail] = useState<'standard' | 'high'>('standard');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [lastPage, setLastPage] = useState<WorkspacePage>('dashboard');
  const keys = useRef<Partial<Record<Provider, string>>>({});
  const activeRequest = useRef<AbortController | null>(null);

  useEffect(() => {
    if (app.route !== 'assistant' && app.route !== 'settings') setLastPage(app.route);
    if (app.route === 'assistant') setPetOpen(false);
  }, [app.route]);
  useEffect(() => {
    const syncUsage = (event: StorageEvent) => {
      if (event.key === usageKey) setUsage(records => mergeUsage(records, readUsage()));
    };
    window.addEventListener('storage', syncUsage);
    return () => {
      window.removeEventListener('storage', syncUsage);
      activeRequest.current?.abort();
    };
  }, []);

  const active = conversations.find(chat => chat.id === activeId) ?? conversations[0];
  const model = settings.models[settings.provider] ?? PROVIDERS[settings.provider].model;
  const currentPage = app.route === 'assistant' || app.route === 'settings' ? lastPage : app.route;
  const context = workspaceContext(app, currentPage, draft);
  const available = isAssistantAvailable();

  function updateSettings(next: AssistantSettings) {
    setSettings(next);
    writeSettings(next);
  }

  function setKey(provider: Provider, value: string) {
    const key = value.trim();
    if (key) keys.current[provider] = key;
    else delete keys.current[provider];
    setConfigured((Object.keys(keys.current) as Provider[]));
  }

  function openSettings() {
    setPetOpen(false);
    setSettingsRequested(true);
    app.setRoute('settings');
  }

  function switchChat(id: string) {
    if (busy) return;
    setActiveId(id);
    setDraft('');
    setAttachment(undefined);
    setPreviousAttachment(undefined);
    setNotice('');
  }

  function newChat() {
    if (busy) return;
    if (!active.messages.length) return;
    const id = createId();
    setConversations(items => [{ ...initial, id }, ...items].slice(0, 20));
    switchChat(id);
  }

  async function send() {
    const typed = draft.trim();
    if ((!typed && !attachment) || activeRequest.current || !available) return;
    const { provider, dailyLimit, maxOutput } = settings;
    const key = keys.current[provider];
    if (!key) {
      setNotice(`Add a ${PROVIDERS[provider].label} API key in AI Settings to send a message.`);
      return;
    }
    const prompt = typed || 'Explain what is shown in this image.';
    const request: ChatRequest = {
      prompt, provider, model, maxOutput,
      context: includeContext ? context.text : '',
      image: attachment?.image,
      history: active.messages
        .filter(message => message.text && (message.role === 'user' || message.state === 'complete'))
        .slice(-CHAT_LIMITS.history)
        .map(({ role, text }) => ({ role, text: text.slice(0, CHAT_LIMITS.historyMessage) })),
    };
    const records = mergeUsage(usage, readUsage());
    if (dailyLimit > 0 && todayTokens(records) + estimatedTokens(request) > dailyLimit) {
      setNotice('This request could exceed your daily token budget. Try a shorter reply limit, remove the image or context, or adjust the budget in Settings.');
      return;
    }

    const control = new AbortController();
    activeRequest.current = control;
    const assistantId = createId();
    const turn: ChatMessage = { id: createId(), role: 'user', text: prompt, attachment: attachment?.name };
    const started = new Date();
    const updateChat = (update: (chat: Conversation) => Conversation) =>
      setConversations(items => items.map(chat => chat.id === active.id ? update(chat) : chat));
    const updateMessage = (update: (message: ChatMessage) => ChatMessage) => updateChat(chat => ({
      ...chat, messages: chat.messages.map(message => message.id === assistantId ? update(message) : message),
    }));

    setBusy(true);
    setNotice('');
    setDraft('');
    if (attachment) setPreviousAttachment(attachment);
    setAttachment(undefined);
    updateChat(chat => ({
      ...chat,
      title: chat.messages.length ? chat.title : prompt.slice(0, 48),
      messages: [...chat.messages, turn, { id: assistantId, role: 'assistant', text: '', state: 'streaming' }],
    }));

    let tokens: TokenUsage | undefined;
    let status: UsageEntryStatus = 'error';
    try {
      for await (const event of sendChat(request, key, control.signal)) {
        if (event.type === 'text') updateMessage(message => ({ ...message, text: message.text + event.text }));
        if (event.type === 'usage') tokens = event.usage;
        if (event.type === 'error') throw new Error(event.message);
        if (event.type === 'done') {
          status = 'complete';
          if (event.truncated) setNotice('The reply reached its token limit. You can ask for the next step or increase the reply limit.');
        }
      }
      if (status !== 'complete') setNotice('The connection ended before the assistant finished.');
    } catch (error) {
      if (control.signal.aborted) {
        status = 'stopped';
        setNotice('Reply stopped. The provider may still count part of this request.');
      } else {
        setNotice(error instanceof Error && !(error instanceof TypeError)
          ? error.message : 'Could not reach the local assistant. Check that StudyFlow is running locally.');
      }
    } finally {
      updateMessage(message => ({ ...message, tokens, state: status }));
      setUsage(writeUsage([...records, {
        id: assistantId, at: started.getTime(), day: localDay(started), provider, model, tokens, status,
      }]));
      activeRequest.current = null;
      setBusy(false);
    }
  }

  return {
    available, settings, updateSettings, usage, configured, setKey, model,
    active, activeId, conversations, switchChat, newChat,
    petOpen, setPetOpen, settingsRequested, clearSettingsRequest: () => setSettingsRequested(false),
    openSettings, openFullChat: () => app.setRoute('assistant'), context, includeContext, setIncludeContext, draft, setDraft, attachment,
    setAttachment, previousAttachment, detail, setDetail, busy, notice, setNotice, send,
    stop: () => activeRequest.current?.abort(),
  };
}

type UsageEntryStatus = 'complete' | 'stopped' | 'error';
const AssistantContext = createContext<ReturnType<typeof useAssistantController> | null>(null);

export function AssistantProvider({ children }: { children: ReactNode }) {
  const assistant = useAssistantController();
  return <AssistantContext.Provider value={assistant}>{children}</AssistantContext.Provider>;
}

export function useAssistant() {
  const value = useContext(AssistantContext);
  if (!value) throw new Error('AssistantProvider is missing.');
  return value;
}
