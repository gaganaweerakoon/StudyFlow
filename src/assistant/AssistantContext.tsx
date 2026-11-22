import { parseWorkspaceEdit, type WorkspaceEdit } from './workspaceEdit';
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { useApp } from '../context/AppContext';
import { estimatedTokens, isAssistantAvailable, sendChat, type Attachment } from './chatClient';
import { CHAT_LIMITS, PROVIDERS, type ChatRequest, type ChatTurn, type Provider, type TokenUsage } from './protocol';
import { localDay, workspaceContext, type WorkspacePage } from './workspaceContext';
import { mergeUsage, readSettings, readUsage, todayTokens, usageKey, writeSettings, writeUsage, type AssistantSettings, type UsageEntry } from './usage';

export interface DesktopUsage {
  records: UsageEntry[];
  save: (records: UsageEntry[]) => Promise<void>;
}

interface ChatMessage extends ChatTurn {
  edit?: WorkspaceEdit;
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

const imagePrompt = 'Explain what is shown in this image.';
const initial: Conversation = { id: 'first', title: 'New chat', messages: [] };
const createId = () => crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;

function useAssistantController(desktopUsage?: DesktopUsage) {
  const app = useApp();
  const currentApp = useRef(app);
  currentApp.current = app;
  const [settings, setSettings] = useState(readSettings);
  const [usage, setUsage] = useState(() => mergeUsage(desktopUsage?.records ?? readUsage()));
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
      if (!desktopUsage && event.key === usageKey) setUsage(records => mergeUsage(records, readUsage()));
    };
    window.addEventListener('storage', syncUsage);
    return () => {
      window.removeEventListener('storage', syncUsage);
      activeRequest.current?.abort();
    };
  }, [desktopUsage]);

  const active = conversations.find(chat => chat.id === activeId) ?? conversations[0];
  const model = settings.models[settings.provider] ?? PROVIDERS[settings.provider].model;
  const currentPage = app.route === 'assistant' || app.route === 'settings' ? lastPage : app.route;
  const context = workspaceContext(app, currentPage, draft.trim() || (attachment ? imagePrompt : ''));
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
    const { provider } = settings;
    const key = keys.current[provider];
    if (!key) {
      setNotice(`Add a ${PROVIDERS[provider].label} API key in AI Settings to send a message.`);
      return;
    }
    const prompt = typed || imagePrompt;
    const request: ChatRequest = {
      prompt, provider, model, maxOutput: 16384,
      context: includeContext ? context.text : '',
      image: attachment?.image,
      history: active.messages
        .filter(message => message.text && (message.role === 'user' || message.state === 'complete'))
        .slice(-CHAT_LIMITS.history)
        .map(({ role, text }) => ({ role, text: text.slice(0, CHAT_LIMITS.historyMessage) })),
    };
    const records = mergeUsage(usage, desktopUsage ? [] : readUsage());
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

    let responseText = '';
    let proposedEdit: WorkspaceEdit | undefined;
    let tokens: TokenUsage | undefined;
    let status: UsageEntryStatus = 'error';
    try {
      for await (const event of sendChat(request, key, control.signal)) {
        if (event.type === 'text') {
          responseText += event.text;
          updateMessage(message => ({ ...message, text: responseText.split('\x60\x60\x60pip-edit')[0] }));
        }
        if (event.type === 'usage') tokens = event.usage;
        if (event.type === 'error') throw new Error(event.message);
        if (event.type === 'done') {
          status = 'complete';
          const proposal = responseText.match(/\x60\x60\x60pip-edit\s*([\s\S]*?)\x60\x60\x60\s*$/);
          if (proposal && includeContext) {
            proposedEdit = parseWorkspaceEdit(proposal[1], currentApp.current);
            if (!proposedEdit) setNotice('Pip could not prepare a valid edit. Check the target and try again.');
          }
          if (event.truncated) setNotice('The reply reached its token limit. Ask Pip to continue from where it stopped.');
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
      updateMessage(message => ({ ...message, tokens, state: status, edit: proposedEdit }));
      const updated = mergeUsage([...records, {
        id: assistantId, at: started.getTime(), day: localDay(started), provider, model, tokens, status,
      }]);
      if (desktopUsage) {
        setUsage(updated);
        void desktopUsage.save(updated).catch(error => setNotice(`Could not save AI usage. ${String(error)}`));
      } else {
        setUsage(writeUsage(updated));
      }
      activeRequest.current = null;
      setBusy(false);
    }
  }

  return {
    applyEdit(message: ChatMessage) {
      if (!message.edit) return;
      const applied = message.edit.apply(currentApp.current);
      setNotice(applied ? 'Change applied to the workspace.' : 'The record changed. Ask Pip to prepare the edit again.');
      setConversations(items => items.map(chat => ({
        ...chat, messages: chat.messages.map(item => item.id === message.id ? { ...item, edit: undefined } : item),
      })));
    },
    available, settings, updateSettings, usage, configured, setKey, model,
    active, activeId, conversations, switchChat, newChat,
    petOpen, setPetOpen, settingsRequested, setSettingsRequested,
    openSettings, openFullChat: () => app.setRoute('assistant'), context, includeContext, setIncludeContext, draft, setDraft, attachment,
    setAttachment, previousAttachment, detail, setDetail, busy, notice, setNotice, send,
    stop: () => activeRequest.current?.abort(),
  };
}

type UsageEntryStatus = 'complete' | 'stopped' | 'error';
const AssistantContext = createContext<ReturnType<typeof useAssistantController> | null>(null);

export function AssistantProvider({ children, desktopUsage }: { children: ReactNode; desktopUsage?: DesktopUsage }) {
  const assistant = useAssistantController(desktopUsage);
  return <AssistantContext.Provider value={assistant}>{children}</AssistantContext.Provider>;
}

export function useAssistant() {
  const value = useContext(AssistantContext);
  if (!value) throw new Error('AssistantProvider is missing.');
  return value;
}
