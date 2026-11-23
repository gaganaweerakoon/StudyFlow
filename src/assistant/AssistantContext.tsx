import { flushSync } from 'react-dom';
import { invoke, isTauri } from '@tauri-apps/api/core';
import { parseWorkspaceEdit, splitWorkspaceResponse, type WorkspaceEdit } from './workspaceEdit';
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { useApp } from '../context/AppContext';
import { estimatedTokens, isAssistantAvailable, sendChat, type Attachment } from './chatClient';
import { CHAT_LIMITS, PROVIDERS, type ChatRequest, type StudyGenerationKind, type ChatTurn, type Provider, type TokenUsage } from './protocol';
import { localDay, requestClock, workspaceContext, type WorkspacePage } from './workspaceContext';
import { mergeUsage, readSettings, readUsage, todayTokens, usageKey, writeSettings, writeUsage, type AssistantSettings, type UsageEntry } from './usage';

export interface DesktopUsage {
  records: UsageEntry[];
  save: (records: UsageEntry[]) => Promise<void>;
}

interface ChatMessage extends ChatTurn {
  edit?: WorkspaceEdit;
  id: string;
  attachment?: string;
  generatedImage?: { mime: string; base64: string };
  tokens?: TokenUsage;
  state?: 'streaming' | 'complete' | 'stopped' | 'error';
}

export interface Conversation {
  id: string;
  title: string;
  messages: ChatMessage[];
}

export interface DesktopHistory {
  conversations: Conversation[];
  save: (conversations: Conversation[]) => Promise<void>;
}

const historyKey = 'studyflow.assistant.conversations.v1';
const historyLimit = 20;

function browserHistory(): Conversation[] {
  try {
    const saved = JSON.parse(localStorage.getItem(historyKey) ?? '[]');
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

const imagePrompt = 'Explain what is shown in this image.';
const initial: Conversation = { id: 'first', title: 'New chat', messages: [] };
const createId = () => crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;

function useAssistantController(desktopUsage?: DesktopUsage, desktopHistory?: DesktopHistory) {
  const app = useApp();
  const currentApp = useRef(app);
  currentApp.current = app;
  const [settings, setSettings] = useState(readSettings);
  const [usage, setUsage] = useState(() => mergeUsage(desktopUsage?.records ?? readUsage()));
  const [configured, setConfigured] = useState<Provider[]>([]);
  const [keyStorage, setKeyStorage] = useState<'loading' | 'windows' | 'session'>(() =>
    isTauri() ? 'loading' : 'session');
  const [keyStorageError, setKeyStorageError] = useState('');
  const [conversations, setConversations] = useState(() => [
    { ...initial, id: createId() }, ...(desktopHistory?.conversations ?? browserHistory()),
  ].slice(0, historyLimit + 1));
  const [activeId, setActiveId] = useState(conversations[0].id);
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
    if (!isTauri()) return;
    let cancelled = false;
    void invoke<Provider[] | null>('assistant_saved_providers').then(providers => {
      if (cancelled) return;
      setKeyStorage(providers ? 'windows' : 'session');
      setConfigured(providers ?? []);
    }).catch(error => {
      if (cancelled) return;
      setKeyStorage('windows');
      setKeyStorageError(String(error));
    });
    return () => { cancelled = true; };
  }, []);

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

  useEffect(() => {
    if (busy) return;
    const saved = conversations.filter(chat => chat.messages.length).slice(0, historyLimit).map(chat => ({
      ...chat,
      // Workspace edit callbacks and images only belong to the current session.
      messages: chat.messages.map(({ edit: _edit, generatedImage: _image, ...message }) => ({
        ...message, state: message.state === 'streaming' ? 'stopped' as const : message.state,
      })),
    }));
    async function save() {
      try {
        if (desktopHistory) await desktopHistory.save(saved);
        else localStorage.setItem(historyKey, JSON.stringify(saved));
      } catch {
        setNotice('Pip could not save the conversation history on this device.');
      }
    }
    void save();
  }, [busy, conversations, desktopHistory]);

  const active = conversations.find(chat => chat.id === activeId) ?? conversations[0];
  const model = settings.models[settings.provider] ?? PROVIDERS[settings.provider].model;
  const currentPage = app.route === 'assistant' || app.route === 'settings' ? lastPage : app.route;
  const context = workspaceContext(app, currentPage, draft.trim() || (attachment ? imagePrompt : ''), requestClock(settings.timezone));
  const available = isAssistantAvailable();

  function updateSettings(next: AssistantSettings) {
    setSettings(next);
    writeSettings(next);
  }

  async function setKey(provider: Provider, value: string) {
    const key = value.trim();
    if (keyStorage === 'loading') throw new Error('Wait for AI Settings to finish loading.');
    if (keyStorage === 'windows') {
      await invoke('update_assistant_key', { provider, key: key || null });
    } else if (key) {
      keys.current[provider] = key;
    } else {
      delete keys.current[provider];
    }
    setConfigured(items => key ? [...new Set([...items, provider])] : items.filter(item => item !== provider));
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
    setConversations(items => [{ ...initial, id }, ...items].slice(0, historyLimit + 1));
    switchChat(id);
  }

  function renameChat(id: string, title: string) {
    const name = title.trim().slice(0, 80);
    if (!name || busy) return;
    setConversations(chats => chats.map(chat => chat.id === id ? { ...chat, title: name } : chat));
  }

  function removeChat(id: string) {
    if (busy) return;
    const remaining = conversations.filter(chat => chat.id !== id);
    const next = remaining.length ? remaining : [{ ...initial, id: createId() }];
    setConversations(next);
    if (activeId === id) switchChat(next[0].id);
  }

  async function applyWorkspaceEdit(edit: WorkspaceEdit) {
    let applied = false;
    try {
      flushSync(() => { applied = edit.apply(currentApp.current); });
      if (!applied) return { saved: false, text: 'The record changed before I could update it. Try the request again.' };
      await currentApp.current.saveWorkspace();
      return { saved: true, text: edit.success ?? `Done. ${edit.title}.` };
    } catch {
      return { saved: false, text: applied
        ? 'The change is visible in StudyFlow, but saving failed. Use Retry save before closing the app.'
        : 'StudyFlow could not apply the change.' };
    }
  }

  async function send(generateImage = false) {
    const typed = draft.trim();
    if ((!typed && !attachment) || activeRequest.current || !available) return;
    const { provider } = settings;
    const key = keys.current[provider];
    if (keyStorage === 'loading') {
      setNotice('Pip is checking for saved API keys. Try again in a moment.');
      return;
    }
    if (!configured.includes(provider) && !keyStorageError) {
      setNotice(`Add a ${PROVIDERS[provider].label} API key in AI Settings to send a message.`);
      return;
    }
    if (generateImage && (!typed || attachment || provider === 'claude')) return;
    const prompt = typed || imagePrompt;
    const clock = requestClock(settings.timezone);
    const request: ChatRequest = {
      prompt, provider, model, maxOutput: 16384,
      generateImage,
      context: includeContext && !generateImage ? workspaceContext(currentApp.current, currentPage, prompt, clock).text : '',
      clientContext: generateImage ? undefined : `Current local date and time: ${clock.label}. Resolve relative dates and times using this clock. Default response language: ${settings.language ?? 'match the user’s message'}.`,
      image: attachment?.image,
      history: generateImage ? [] : active.messages
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
          updateMessage(message => ({ ...message, text: splitWorkspaceResponse(responseText).text }));
        }
        if (event.type === 'image' && generateImage) {
          responseText = 'Generated image. Download it to keep a copy.';
          updateMessage(message => ({ ...message, text: responseText, generatedImage: { mime: event.mime, base64: event.base64 } }));
        }
        if (event.type === 'usage') tokens = event.usage;
        if (event.type === 'error') throw new Error(event.message);
        if (event.type === 'done') {
          status = 'complete';
          const { text, command } = splitWorkspaceResponse(responseText, true);
          if (command === undefined) {
            updateMessage(message => ({ ...message, text }));
          } else if (!event.truncated) {
            const edit = includeContext ? parseWorkspaceEdit(command, currentApp.current) : undefined;
            if (!edit) {
              updateMessage(message => ({ ...message, text: 'I couldn’t apply that change. Check the target and try again.' }));
            } else if (edit.confirmation) {
              proposedEdit = edit;
              updateMessage(message => ({ ...message, text: 'Review this change before applying it.' }));
            } else {
              const result = await applyWorkspaceEdit(edit);
              updateMessage(message => ({ ...message, text: result.text }));
            }
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

  async function generate(kind: StudyGenerationKind, prompt: string, source: string): Promise<unknown> {
    const provider = settings.provider;
    const key = keys.current[provider];
    if (keyStorage === 'loading') throw new Error('Pip is checking for saved API keys. Try again in a moment.');
    if (!configured.includes(provider) && !keyStorageError) throw new Error('Add your '+PROVIDERS[provider].label+' API key in Settings.');
    if (activeRequest.current) throw new Error('Pip is already working on a request. Try again when it finishes.');
    if (!source.trim()) throw new Error('Select a section containing text.');
    if (source.length > CHAT_LIMITS.context) throw new Error('Choose a shorter section for this request.');
    let body = '';
    let complete = false;
    let valid = false;
    let tokens: TokenUsage | undefined;
    const control = new AbortController();
    activeRequest.current = control;
    setBusy(true);
    try {
      const clock = requestClock(settings.timezone);
      for await (const event of sendChat({
        provider, model, prompt, context: source, history: [], maxOutput: 16384, studyGeneration: kind,
        clientContext: `Current local date and time: ${clock.label}. Default response language: ${settings.language ?? 'match the source'}.`,
      }, key, control.signal)) {
        if (event.type==='text') body+=event.text;
        if (event.type==='error') throw new Error(event.message);
        if (event.type==='usage') tokens=event.usage;
        if (event.type==='done') complete=!event.truncated;
      }
      if (!complete) throw new Error('Incomplete provider response. Try a shorter selection.');
      let result: unknown;
      try { result = JSON.parse(body.trim().replace(/^```(?:json)?\s*|\s*```$/gi, '')); } catch { /* The provider did not return JSON. */ }
      const items = Array.isArray(result) ? result : (result as { items?: unknown } | undefined)?.items;
      if (!Array.isArray(items) || !items.length) {
        throw new Error('Pip did not receive usable study items. Retry with a shorter section or choose a different model.');
      }
      valid = true;
      return items;
    } finally {
      activeRequest.current = null;
      setBusy(false);
      const entry: UsageEntry = {id:createId(), at:Date.now(), day:localDay(), provider,model,tokens,status:valid?'complete':'error'};
      const records=mergeUsage(usage,[entry]);
      if (desktopUsage) {await desktopUsage.save(records); setUsage(records);}
      else setUsage(writeUsage(records));
    }
  }

  return {
    async applyEdit(message: ChatMessage) {
      if (!message.edit || busy || activeRequest.current) return;
      const edit = message.edit;
      setBusy(true);
      try {
        const result = await applyWorkspaceEdit(edit);
        setConversations(items => items.map(chat => ({
          ...chat, messages: chat.messages.map(item => item.id === message.id
            ? { ...item, text: result.text, edit: undefined, state: result.saved ? 'complete' : 'error' } : item),
        })));
      } finally {
        setBusy(false);
      }
    },
    cancelEdit(id: string) {
      setConversations(items => items.map(chat => ({
        ...chat, messages: chat.messages.map(item => item.id === id
          ? { ...item, text: 'Change cancelled.', edit: undefined } : item),
      })));
    },
    generate, available, settings, updateSettings, usage, configured, setKey, keyStorage, keyStorageError, model,
    active, activeId, conversations, switchChat, newChat, renameChat, removeChat,
    petOpen, setPetOpen, settingsRequested, setSettingsRequested,
    openSettings, openFullChat: () => app.setRoute('assistant'), context, includeContext, setIncludeContext, draft, setDraft, attachment,
    setAttachment, previousAttachment, detail, setDetail, busy, notice, setNotice, send,
    stop: () => activeRequest.current?.abort(),
  };
}

type UsageEntryStatus = 'complete' | 'stopped' | 'error';
const AssistantContext = createContext<ReturnType<typeof useAssistantController> | null>(null);

export function AssistantProvider({ children, desktopUsage, desktopHistory }: {
  children: ReactNode;
  desktopUsage?: DesktopUsage;
  desktopHistory?: DesktopHistory;
}) {
  const assistant = useAssistantController(desktopUsage, desktopHistory);
  return <AssistantContext.Provider value={assistant}>{children}</AssistantContext.Provider>;
}

export function useAssistant() {
  const value = useContext(AssistantContext);
  if (!value) throw new Error('AssistantProvider is missing.');
  return value;
}
