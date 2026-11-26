import { relevantPreferences } from './studyPreferences';
import { validToolArguments } from './toolArguments';
import type { CheckIn } from './checkIns';
import { noteDestination } from './noteDestination';
import { allowedTurnTools } from './turnPermissions';
import { normalizeReviewEdits, selectedReviewAction } from './reviewPolicy';
import { flushSync } from 'react-dom';
import { invoke, isTauri } from '@tauri-apps/api/core';
import { parseWorkspaceEdit, splitWorkspaceResponse, type WorkspaceEdit } from './workspaceEdit';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { useApp } from '../context/AppContext';
import type { NavRoute } from '../types/studyflow';
import {
  fetchAssistantStatus,
  fetchDashboardOverview,
  isAssistantAvailable,
  retrySeconds,
  sendChat,
  streamNotesRestructureClient,
  type ClientRestructureFigure,
} from './chatClient';
import {
  CHAT_LIMITS,
  PROVIDERS,
  type ChatDocument,
  type ChatEvent,
  type ChatRequest,
  type ChatTurn,
  type DashboardAiOverview,
  type Provider,
  type StudyGenerationKind,
  type TokenUsage,
} from './protocol';
import {
  formatAttachmentMeta,
  type ChatMessageAttachmentBadge,
  type PipAttachment,
} from './documentAttachments';
import type { PdfFigure } from '../notes/pdfMarkdown';
import { normalizeMarkdownForDisplay, stripOuterMarkdownFence } from './markdownNormalize';
import { localDay, requestClock, workspaceContext, type WorkspacePage } from './workspaceContext';
import { buildOverviewPayloadText, computeWorkspaceDiagnostics } from './workspaceDiagnostics';
import {
  mergeUsage,
  readSettings,
  readUsage,
  usageKey,
  writeSettings,
  writeUsage,
  type AssistantSettings,
  type UsageEntry,
} from './usage';
import {
  buildCompanionContext,
  buildCompanionSystemInstructions,
  countUnreadCompanion,
  createEmptyCompanionThread,
  getEffectiveClock,
  isDetailedStudyRequest,
  markCompanionRead,
  normalizeCompanionThread,
  resolveContextualReference,
  splitCompanionBubbles,
  type CompanionFailedReply,
  type CompanionMessage,
  type CompanionThreadState,
} from './companion';
import {
  buildOutreachSystemInstructions,
  evaluateCompanionOutreach,
  findDueFollowUp,
} from './companionOutreach';
import {
  buildRescheduledFollowUp,
  detectUserFollowUpRequest,
  parseFollowUpOfferFromReply,
} from './companionFollowUps';
import type { CompanionSuggestion } from './companion';

export interface DesktopUsage {
  records: UsageEntry[];
  save: (records: UsageEntry[]) => Promise<void>;
}

export interface AppliedActionLink {
  itemId?: string;
  route: NavRoute;
  label: string;
}

export interface ChatMessage extends ChatTurn {
  edit?: WorkspaceEdit;
  pendingEdits?: WorkspaceEdit[];
  appliedActions?: string[];
  actionLinks?: AppliedActionLink[];
  id: string;
  savePending?: boolean;
  suggestedTask?: CheckIn['task'];
  suggestedSession?: CheckIn['session'];
  writeLocked?: boolean;
  attachment?: string;
  attachments?: ChatMessageAttachmentBadge[];
  generatedImage?: { mime: string; base64: string };
  tokens?: TokenUsage;
  errorMessage?: string;
  state?: 'streaming' | 'complete' | 'stopped' | 'error';
}

export interface Conversation {
  id: string;
  title: string;
  titleSource?: 'default' | 'ai' | 'manual';
  messages: ChatMessage[];
}

export interface FailedAttempt {
  readOnly?: boolean;
  regenerating?: { message: ChatMessage; user: ChatMessage };
  id: string;
  conversationId: string;
  prompt: string;
  attachments: PipAttachment[];
  errorMessage: string;
  createdAt: number;
}

export interface DesktopHistory {
  conversations: Conversation[];
  companion?: CompanionThreadState;
  save: (conversations: Conversation[], companion?: CompanionThreadState) => Promise<void>;
}

const historyKey = 'studyflow.assistant.conversations.v1';
const companionKey = 'studyflow.assistant.companion.v1';
const overviewCacheKey = 'studyflow.assistant.dashboardOverview.v1';
const historyLimit = 20;

function browserCompanionHistory(): CompanionThreadState {
  try {
    const raw = localStorage.getItem(companionKey);
    if (!raw) return createEmptyCompanionThread();
    return normalizeCompanionThread(JSON.parse(raw));
  } catch {
    return createEmptyCompanionThread();
  }
}

function stripFailedTurns(messages: ChatMessage[]): ChatMessage[] {
  const cleaned: ChatMessage[] = [];
  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    if (msg.role === 'assistant' && msg.state === 'error') {
      if (cleaned.length > 0 && cleaned[cleaned.length - 1].role === 'user') {
        cleaned.pop();
      }
      continue;
    }
    cleaned.push(msg);
  }
  return cleaned;
}

function browserHistory(): Conversation[] {
  try {
    const saved = JSON.parse(localStorage.getItem(historyKey) ?? '[]');
    if (!Array.isArray(saved)) return [];
    return saved
      .map((chat: Conversation) => ({
        ...chat,
        messages: stripFailedTurns(Array.isArray(chat.messages) ? chat.messages : []),
      }))
      .filter((chat: Conversation) => chat.messages.length > 0);
  } catch {
    return [];
  }
}

function readCachedOverview(): DashboardAiOverview | null {
  try {
    const raw = sessionStorage.getItem(overviewCacheKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DashboardAiOverview;
    if (!parsed?.headline || !parsed?.summary) return null;
    return parsed;
  } catch {
    return null;
  }
}

const imagePrompt = 'Explain what is shown in this image.';
const documentPrompt = 'Summarize the key concepts, important formulas/tables, and main takeaways from the attached document(s).';
const initial: Conversation = { id: 'first', title: 'New chat', titleSource: 'default', messages: [] };
const createId = () => crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;

function useAssistantController(desktopUsage?: DesktopUsage, desktopHistory?: DesktopHistory) {
  const app = useApp();
  const currentApp = useRef(app);
  currentApp.current = app;
  const cooldowns = useRef<Partial<Record<Provider, number>>>({});
  const [cooldownTick, setCooldownTick] = useState(() => Date.now());
  const [settings, setSettings] = useState(readSettings);
  const [usage, setUsage] = useState(() => mergeUsage(desktopUsage?.records ?? readUsage()));
  const [geminiHealth, setGeminiHealth] = useState<'responded' | 'failed'>();
  const [online, setOnline] = useState(() => navigator.onLine);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);
  const [configured, setConfigured] = useState<Provider[]>([]);
  const [serverStatus, setServerStatus] = useState<'checking' | 'connected' | 'unconfigured'>(() =>
    isTauri() ? 'unconfigured' : 'checking',
  );
  const [keyStorage, setKeyStorage] = useState<'loading' | 'windows' | 'session'>(() =>
    isTauri() ? 'loading' : 'session',
  );
  const [keyStorageError, setKeyStorageError] = useState('');
  const [conversations, setConversations] = useState(() => {
    const loaded = (desktopHistory?.conversations ?? browserHistory())
      .map((chat) => ({ ...chat, messages: stripFailedTurns(chat.messages ?? []) }))
      .filter((chat) => chat.messages.length > 0);
    return [{ ...initial, id: createId() }, ...loaded].slice(0, historyLimit + 1);
  });
  const [activeId, setActiveId] = useState(conversations[0].id);
  const [pipTab, setPipTab] = useState<'study' | 'companion'>('study');
  const [companionThread, setCompanionThread] = useState<CompanionThreadState>(() =>
    normalizeCompanionThread(desktopHistory?.companion ?? browserCompanionHistory()),
  );
  const companionThreadRef = useRef(companionThread);
  companionThreadRef.current = companionThread;
  const [companionDraft, setCompanionDraft] = useState('');
  const [companionBusy, setCompanionBusy] = useState(false);
  const [companionNotice, setCompanionNotice] = useState('');
  const [companionFailedReply, setCompanionFailedReply] = useState<CompanionFailedReply | null>(null);
  const [highlightedCompanionMessageId, setHighlightedCompanionMessageId] = useState<string | null>(null);
  const companionRequest = useRef<AbortController | null>(null);
  const companionUnreadCount = countUnreadCompanion(companionThread);
  const [failedAttempts, setFailedAttempts] = useState<FailedAttempt[]>([]);
  const [petOpen, setPetOpen] = useState(false);
  const [settingsRequested, setSettingsRequested] = useState(false);
  const [includeContext, setIncludeContext] = useState(true);
  const [draft, setDraft] = useState('');
  const [attachments, setAttachments] = useState<PipAttachment[]>([]);
  const unsavedResults = useRef(new Map<string, {summaries: string[]; links: AppliedActionLink[]}>());
  const turnFiles = useRef(new Map<string, PipAttachment[]>());
  const [previousAttachments, setPreviousAttachments] = useState<PipAttachment[]>([]);
  const [detail, setDetail] = useState<'standard' | 'high'>('standard');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [lastPage, setLastPage] = useState<WorkspacePage>('dashboard');
  const [dashboardOverview, setDashboardOverview] = useState<DashboardAiOverview | null>(readCachedOverview);
  const [dashboardOverviewLoading, setDashboardOverviewLoading] = useState(false);
  const [dashboardOverviewError, setDashboardOverviewError] = useState('');
  const pastMilestones = useRef<Set<string> | undefined>(undefined);
  const outreachInFlight = useRef(false);
  const outreachRetryAfter = useRef(0);
  const relayWork = useRef(Promise.resolve());
  useEffect(() => {
    if (isTauri() && app.preferences.pipCheckIns?.phoneDelivery) {
      // Any new timer, task, session or preference state invalidates prior eligibility.
      relayWork.current = relayWork.current.then(async () => {
        await invoke('pip_relay', { action: 'cancel' });
      }).catch(() => {});
    }
  }, [app.focusTimer.running, app.tasks, app.sessions, app.goals, app.focusHistory, app.preferences.pipCheckIns]);
  const keys = useRef<Partial<Record<Provider, string>>>({});
  const activeRequest = useRef<AbortController | null>(null);
  const pendingAskPrompt = useRef<string | null>(null);
  const conversationsRef = useRef(conversations);
  conversationsRef.current = conversations;

  useEffect(() => {
    let cancelled = false;
    if (isTauri()) {
      void invoke<Provider[] | null>('assistant_saved_providers')
        .then((providers) => {
          if (cancelled) return;
          setKeyStorage(providers ? 'windows' : 'session');
          setConfigured(providers ?? []);
        })
        .catch((error) => {
          if (cancelled) return;
          setKeyStorage('windows');
          setKeyStorageError(String(error));
        });
      return () => {
        cancelled = true;
      };
    }
    void fetchAssistantStatus().then((status) => {
      if (cancelled) return;
      if (status.geminiConfigured) {
        setServerStatus('connected');
        setConfigured((prev) => (prev.includes('gemini') ? prev : [...prev, 'gemini']));
        setSettings((prev) => {
          if (prev.provider !== 'gemini' && !keys.current[prev.provider]) {
            const next = { ...prev, provider: 'gemini' as const };
            writeSettings(next);
            return next;
          }
          return prev;
        });
      } else {
        setServerStatus('unconfigured');
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (app.route !== 'assistant' && app.route !== 'settings') setLastPage(app.route);
    if (app.route === 'assistant') setPetOpen(false);
  }, [app.route]);

  useEffect(() => {
    const syncUsage = (event: StorageEvent) => {
      if (!desktopUsage && event.key === usageKey) setUsage((records) => mergeUsage(records, readUsage()));
    };
    window.addEventListener('storage', syncUsage);
    return () => {
      window.removeEventListener('storage', syncUsage);
      activeRequest.current?.abort();
      companionRequest.current?.abort();
    };
  }, [desktopUsage]);

  const serializeConversations = useCallback((items: Conversation[]) => {
    return items
      .map((chat) => ({
        ...chat,
        // Workspace edit callbacks, images, and failed turns are never persisted to history.
        messages: stripFailedTurns(chat.messages).map(
          ({ edit: _edit, pendingEdits: _pending, generatedImage: _image, ...message }) => ({
            ...message,
            savePending: undefined,
            state: message.state === 'streaming' ? ('stopped' as const) : message.state,
          }),
        ),
      }))
      .filter((chat) => chat.messages.length > 0)
      .slice(0, historyLimit);
  }, []);

  const persistCompanionSnapshot = useCallback(
    async (thread: CompanionThreadState) => {
      const normalized = normalizeCompanionThread(thread);
      if (desktopHistory) {
        await desktopHistory.save(serializeConversations(conversationsRef.current), normalized);
      } else {
        localStorage.setItem(companionKey, JSON.stringify(normalized));
      }
    },
    [desktopHistory, serializeConversations],
  );

  useEffect(() => {
    if (busy || companionBusy) return;
    const saved = serializeConversations(conversations);
    const savedCompanion = normalizeCompanionThread(companionThread);
    async function save() {
      try {
        if (desktopHistory) await desktopHistory.save(saved, savedCompanion);
        else {
          localStorage.setItem(historyKey, JSON.stringify(saved));
          localStorage.setItem(companionKey, JSON.stringify(savedCompanion));
        }
      } catch {
        setNotice('Pip could not save the conversation history on this device.');
      }
    }
    void save();
  }, [busy, companionBusy, conversations, companionThread, desktopHistory, serializeConversations]);

  const active = conversations.find((chat) => chat.id === activeId) ?? conversations[0];
  const cooldownUntil = cooldowns.current[settings.provider] ?? 0;
  const cooldown = Math.max(0, Math.ceil((cooldownUntil - cooldownTick) / 1000));
  useEffect(() => {
    if (!cooldown) return;
    const timer = window.setInterval(() => setCooldownTick(Date.now()), 500);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  function providerFailure(provider: Provider, event: Extract<ChatEvent, { type: 'error' }>) {
    if (event.status === 429 || event.status === 503) {
      cooldowns.current[provider] = Date.now() + retrySeconds(event.status, event.retryAfter) * 1000;
      setCooldownTick(Date.now());
    }
    return new Error(event.message);
  }

  const model = settings.models[settings.provider] ?? PROVIDERS[settings.provider].model;
  const currentPage = app.route === 'assistant' || app.route === 'settings' ? lastPage : app.route;
  const fallbackAttachmentPrompt = attachments.some((item) => item.kind !== 'image')
    ? documentPrompt
    : attachments.length > 0
      ? imagePrompt
      : '';
  const context = workspaceContext(
    app,
    currentPage,
    draft.trim() || fallbackAttachmentPrompt,
    requestClock(settings.timezone),
  );
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
    setConfigured((items) =>
      key || (!isTauri() && provider === 'gemini' && serverStatus === 'connected') ? [...new Set([...items, provider])] : items.filter((item) => item !== provider),
    );
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
    setAttachments([]);
    setPreviousAttachments([]);
    setNotice('');
  }

  function newChat() {
    if (busy) return;
    if (!active.messages.length) return;
    const id = createId();
    setConversations((items) => [{ ...initial, id }, ...items].slice(0, historyLimit + 1));
    switchChat(id);
  }

  function renameChat(id: string, title: string) {
    const name = title.trim().slice(0, 80);
    if (!name || busy) return;
    setConversations((chats) =>
      chats.map((chat) => (chat.id === id ? { ...chat, title: name, titleSource: 'manual' } : chat)),
    );
  }

  function removeChat(id: string) {
    if (busy) return;
    const remaining = conversations.filter((chat) => chat.id !== id);
    const next = remaining.length ? remaining : [{ ...initial, id: createId() }];
    setConversations(next);
    setFailedAttempts((items) => items.filter((item) => item.conversationId !== id));
    if (activeId === id) switchChat(next[0].id);
  }

  async function generateAiChatTitle(
    chatId: string,
    userPrompt: string,
    assistantReply: string,
    provider: Provider,
    activeModel: string,
    key?: string,
  ) {
    const titleModel = provider === 'gemini' ? 'gemini-3.5-flash-lite' : activeModel;
    const snippetPrompt = userPrompt.replace(/\s+/g, ' ').trim().slice(0, 320);
    const snippetReply = assistantReply.replace(/\s+/g, ' ').trim().slice(0, 420);
    const titleRequest: ChatRequest = {
      provider,
      model: titleModel,
      maxOutput: 300,
      workspaceActions: false,
      context: '',
      history: [],
      prompt: [
        'Write a crisp 3 to 6 word title summarizing this study conversation.',
        'Return ONLY the plain title text: no quotes, no markdown, no prefixes, no emojis, and no trailing period.',
        '',
        `Student: ${snippetPrompt}`,
        snippetReply ? `Pip: ${snippetReply}` : '',
      ]
        .filter(Boolean)
        .join('\n'),
    };
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 12_000);
    let rawTitle = '';
    try {
      for await (const event of sendChat(titleRequest, key, controller.signal)) {
        if (event.type === 'text') rawTitle += event.text;
        if (event.type === 'error') return;
      }
      const cleaned = rawTitle
        .split('\n')[0]
        ?.replace(/^["'`#*-\s]+|["'`.\s]+$/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 64);
      if (!cleaned || cleaned.length < 2) return;
      setConversations((chats) =>
        chats.map((chat) =>
          chat.id === chatId && chat.titleSource !== 'manual'
            ? { ...chat, title: cleaned, titleSource: 'ai' }
            : chat,
        ),
      );
    } catch {
      // Quietly keep the fallback title if background title generation fails
    } finally {
      window.clearTimeout(timeout);
    }
  }

  async function applyWorkspaceEdits(
    edits: WorkspaceEdit[],
    messageId: string,
    selection?: Record<number, string[] | boolean>,
  ) {
    const appliedSummaries: string[] = [];
    const failedSummaries: string[] = [];
    const links: AppliedActionLink[] = [];
    try {
      for (let i = 0; i < edits.length; i++) {
        const edit = edits[i];
        const chosen = selection ? selectedReviewAction(edit, selection[i]) : true;
        if (chosen === false) continue;

        let ok = false;
        flushSync(() => {
          if (Array.isArray(chosen) && edit.applySelected) {
            ok = edit.applySelected(currentApp.current, chosen);
          } else {
            ok = edit.apply(currentApp.current);
          }
        });
        if (ok) {
          const countLabel =
            Array.isArray(chosen) && edit.reviewItems && chosen.length < edit.reviewItems.length
              ? ` (${chosen.length} of ${edit.reviewItems.length} selected)`
              : '';
          appliedSummaries.push(`${edit.success ?? `Done. ${edit.title}.`}${countLabel}`);
          if (edit.route && edit.routeLabel) {
            links.push({ route: edit.route, label: edit.routeLabel, itemId: edit.itemId?.() });
          }
        } else {
          failedSummaries.push(`Could not apply: ${edit.title}`);
        }
      }
      if (appliedSummaries.length > 0 && currentApp.current.durableWorkspace) {
        unsavedResults.current.set(messageId, { summaries: appliedSummaries, links });
        await currentApp.current.saveWorkspace();
        unsavedResults.current.delete(messageId);
      }
      return {
        temporary: !currentApp.current.durableWorkspace,
        saved: currentApp.current.durableWorkspace && appliedSummaries.length > 0,
        appliedSummaries,
        failedSummaries,
        links,
      };
    } catch {
      return {
        temporary: false,
        saved: false,
        appliedSummaries: [],
        failedSummaries: [
          ...failedSummaries,
          appliedSummaries.length > 0
            ? 'Changes are visible in StudyFlow, but saving failed. Retry saving to keep the changes.'
            : 'StudyFlow could not apply the requested changes.',
        ],
        links: [],
      };
    }
  }

  async function send(
    generateImage = false,
    overridePrompt?: string,
    options?: {
      overrideAttachments?: PipAttachment[];
      baseMessages?: ChatMessage[];
      readOnly?: boolean;
      regenerating?: { message: ChatMessage; user: ChatMessage };
    },
  ) {
    const typed = (overridePrompt ?? draft).trim();
    const currentAttachments = options?.overrideAttachments ?? (overridePrompt === undefined ? attachments : []);
    if (cooldownUntil > Date.now()) return;
    if ((!typed && !currentAttachments.length) || activeRequest.current || !available) return;
    const { provider } = settings;
    const key = keys.current[provider];
    const targetChatId = active.id;
    const hasDocs = currentAttachments.some((item) => item.kind !== 'image');
    const prompt = typed || (hasDocs ? documentPrompt : imagePrompt);
    if (!currentAttachments.length && /\b(?:attached (?:file|pdf|document)|uploaded (?:file|pdf|document)|this pdf|the pdf)\b/i.test(typed)) {
      if (overridePrompt !== undefined) setDraft(typed);
      setNotice('Attach the PDF or document to this message so I can use it.');
      return;
    }

    const recordFailedAttempt = (message: string) => {
      setFailedAttempts((items) => [
        ...items,
        {
          id: createId(),
          readOnly: options?.readOnly,
          regenerating: options?.regenerating,
          conversationId: targetChatId,
          prompt,
          attachments: currentAttachments,
          errorMessage: message,
          createdAt: Date.now(),
        },
      ]);
      setNotice('');
    };

    if (keyStorage === 'loading') {
      setNotice('Pip is checking for saved API keys. Try again in a moment.');
      return;
    }
    let isProviderConfigured = configured.includes(provider);
    if (!isProviderConfigured && !isTauri() && provider === 'gemini') {
      const liveStatus = await fetchAssistantStatus();
      if (liveStatus.geminiConfigured) {
        isProviderConfigured = true;
        setServerStatus('connected');
        setConfigured((prev) => (prev.includes('gemini') ? prev : [...prev, 'gemini']));
      } else {
        setServerStatus('unconfigured');
      }
    }
    if (!isProviderConfigured && !keyStorageError) {
      if (overridePrompt === undefined) { setDraft(''); setAttachments([]); }
      recordFailedAttempt(
        isTauri()
          ? `Add a ${PROVIDERS[provider].label} API key in AI Settings to send a message.`
          : 'Add your Gemini API key in AI Settings, or configure the local server key.',
      );
      return;
    }
    if (generateImage && (!typed || currentAttachments.length > 0 || provider === 'claude')) return;

    const baseMsgs = options?.baseMessages ?? active.messages;
    const clock = requestClock(settings.timezone);
    const toolsAllowed = includeContext && !generateImage;
    const allowedTools = toolsAllowed && !options?.readOnly ? allowedTurnTools(typed) : [];
    const workspace = currentApp.current;
    const previousNoteId = /\bsame unit\b/i.test(typed)
      ? baseMsgs.slice().reverse().flatMap(message => message.actionLinks ?? []).find(link => link.route === 'notes')?.itemId
      : undefined;
    const previousNote = workspace.notes.find(note => note.id === previousNoteId);
    const destination = allowedTools.includes('create_note') ? noteDestination(typed, workspace.subjects, previousNote) : undefined;
    if (destination?.question) {
      setConversations(items => items.map(chat => chat.id !== targetChatId ? chat : { ...chat, messages: [...chat.messages,
        { id: createId(), role: 'user', text: typed }, { id: createId(), role: 'assistant', state: 'complete', text: destination.question! }] }));
      return;
    }
    const attachedImage = currentAttachments.find((item) => item.image)?.image;
    const attachedDocuments: ChatDocument[] = currentAttachments
      .filter((item): item is PipAttachment & { document: ChatDocument } => Boolean(item.document))
      .map((item) => item.document)
      .slice(0, CHAT_LIMITS.maxDocuments);
    const request: ChatRequest = {
      prompt,
      provider,
      model,
      maxOutput: settings.maxOutput,
      generateImage,
      allowedTools,
      workspaceActions: allowedTools.length > 0 && provider === 'gemini',
      context: destination?.subjectId && hasDocs
        ? JSON.stringify({ destination, preferences: relevantPreferences(prompt, workspace.preferences.pipMemory) })
        : toolsAllowed ? workspaceContext(workspace, currentPage, prompt, clock).text : '',
      clientContext: generateImage
        ? undefined
        : `Current local date and time: ${clock.label}. Resolve relative dates and times using this clock. Default response language: ${settings.language ?? 'match the user’s message'}.`,
      image: attachedImage,
      documents: attachedDocuments.length ? attachedDocuments : undefined,
      history: generateImage || !/\b(same|previous|before|that one|it again|continue|explain that|why)\b/i.test(typed)
        ? []
        : baseMsgs
            .filter((message) => message.text && (message.role === 'user' || message.state === 'complete'))
            .slice(-4)
            .map(({ role, text }) => ({ role, text })),
    };
    if (activeRequest.current) return;
    const records = mergeUsage(usage, desktopUsage ? [] : readUsage());
    const control = new AbortController();
    activeRequest.current = control;
    const regenerate = options?.regenerating;
    const userTurnId = regenerate?.user.id ?? createId();
    if (currentAttachments.length) turnFiles.current.set(userTurnId, currentAttachments);
    const assistantId = regenerate?.message.id ?? createId();
    const messageAttachments: ChatMessageAttachmentBadge[] | undefined = currentAttachments.length
      ? currentAttachments.map((item) => ({
          name: item.name,
          kind: item.kind,
          meta: formatAttachmentMeta(item),
        }))
      : undefined;
    const turn: ChatMessage = {
      id: userTurnId,
      role: 'user',
      text: prompt,
      writeLocked: options?.readOnly,
      attachment: currentAttachments[0]?.name,
      attachments: messageAttachments,
    };
    const started = new Date();
    const shouldAutoTitle =
      active.titleSource !== 'manual' &&
      active.titleSource !== 'ai' &&
      baseMsgs.length === 0;
    const previousTitle = active.title;
    const previousTitleSource = active.titleSource;

    const updateChat = (update: (chat: Conversation) => Conversation) =>
      setConversations((items) => items.map((chat) => (chat.id === targetChatId ? update(chat) : chat)));
    const updateMessage = (update: (message: ChatMessage) => ChatMessage) =>
      updateChat((chat) => ({
        ...chat,
        messages: chat.messages.map((message) => (message.id === assistantId ? update(message) : message)),
      }));

    setBusy(true);
    setNotice('');
    if (overridePrompt === undefined) {
      setDraft('');
      setAttachments([]);
    }
    if (currentAttachments.length) setPreviousAttachments(currentAttachments);
    updateChat((chat) => ({
      ...chat,
      title:
        baseMsgs.length > 0 || chat.titleSource === 'manual' || chat.titleSource === 'ai'
          ? chat.title
          : (currentAttachments[0] ? `${currentAttachments[0].name} · ${prompt}` : prompt).slice(0, 48),
      messages: regenerate
        ? chat.messages.map(message => message.id === assistantId ? { ...message, text: '', state: 'streaming' } : message)
        : [...baseMsgs, turn, { id: assistantId, role: 'assistant', text: '', state: 'streaming' }],
    }));

    let responseText = '';
    let finalAssistantText = '';
    const actionCalls: string[] = [];
    let invalidAction = false;
    const seenActions = new Set<string>();
    let proposedEdits: WorkspaceEdit[] | undefined;
    let appliedActions: string[] | undefined;
    let actionLinks: AppliedActionLink[] | undefined;
    let tokens: TokenUsage | undefined;
    let errorMessage: string | undefined;
    let errorStatus: number | undefined;
    let status: UsageEntryStatus = 'error';
    try {
      for await (const event of sendChat(request, key, control.signal)) {
        if (event.type === 'text') {
          responseText += event.text;
          if (!allowedTools.length) updateMessage((message) => ({ ...message, text: splitWorkspaceResponse(responseText).text }));
        }
        if (event.type === 'action' && allowedTools.includes(event.action)) {
          if (!validToolArguments(event.action, event.arguments)) {
            invalidAction = true;
            continue;
          }
          const args = destination?.subjectId && event.action === 'create_note'
            ? { ...event.arguments, subjectId: destination.subjectId, syllabusLinks: { unitIds: destination.unitId ? [destination.unitId] : [] } }
            : event.arguments;
          const serialized = JSON.stringify({ ...args, action: event.action });
          if (!seenActions.has(serialized)) {
            seenActions.add(serialized);
            actionCalls.push(serialized);
          }
        }
        if (event.type === 'image' && generateImage) {
          responseText = 'Generated image. Download it to keep a copy.';
          finalAssistantText = responseText;
          updateMessage((message) => ({
            ...message,
            text: responseText,
            generatedImage: { mime: event.mime, base64: event.base64 },
          }));
        }
        if (event.type === 'usage') tokens = event.usage;
        if (event.type === 'retry') setNotice(`Provider unavailable. Retrying in ${event.seconds}s…`);
        if (event.type === 'error') {
          errorStatus = event.status;
          throw providerFailure(provider, event);
        }
        if (event.type === 'done') {
          status = 'complete';
          setNotice('');
          const { text } = splitWorkspaceResponse(responseText, true);
          const allRawCommands = actionCalls;

          if (invalidAction || !allRawCommands.length) {
            finalAssistantText = allowedTools.length && !text.trim().endsWith('?')
              ? 'No change was saved. Which item and destination should I use?'
              : text;
            updateMessage((message) => ({ ...message, text: finalAssistantText }));
          } else if (!event.truncated && toolsAllowed) {
            const parsedEdits: WorkspaceEdit[] = [];
            for (const rawCmd of allRawCommands) {
              const parsed = parseWorkspaceEdit(rawCmd, currentApp.current, Boolean(destination?.subjectId));
              if (parsed && allowedTools.includes(parsed.action)) parsedEdits.push(parsed);
            }

            if (parsedEdits.length !== allRawCommands.length) {
              finalAssistantText =
                'No change was saved. Which item and destination should I use?';
              updateMessage((message) => ({
                ...message,
                text: finalAssistantText,
              }));
            } else {
              const normalizedEdits = normalizeReviewEdits(parsedEdits);

              const immediate = normalizedEdits.filter((e) => !e.confirmation);
              const confirmRequired = normalizedEdits.filter((e) => e.confirmation);

              let finalText = '';
              if (immediate.length > 0) {
                updateChat(chat => ({ ...chat, messages: chat.messages.map(item => item.id === userTurnId ? { ...item, writeLocked: true } : item) }));
                const result = await applyWorkspaceEdits(immediate, assistantId);
                if (result.saved && result.appliedSummaries.length > 0) {
                  appliedActions = result.appliedSummaries;
                  actionLinks = result.links;
                }
                if (!finalText) {
                  finalText =
                    result.temporary ? 'Applied in this temporary preview. Changes last for this visit.' : !result.saved ? result.failedSummaries.join('\n') : result.appliedSummaries.length === 1
                      ? result.appliedSummaries[0]
                      : result.appliedSummaries.length > 1
                        ? `Applied ${result.appliedSummaries.length} updates to your StudyFlow workspace.`
                        : result.failedSummaries[0] ?? 'Done.';
                } else if (result.failedSummaries.length > 0) {
                  finalText = `${finalText}\n\n${result.failedSummaries.join('\n')}`;
                }
              }

              if (confirmRequired.length > 0) {
                proposedEdits = confirmRequired;
                if (!finalText) {
                  const hasDestructive = confirmRequired.some(
                    (item) => item.destructive || item.action.startsWith('delete_'),
                  );
                  finalText = hasDestructive
                    ? 'Please review and explicitly confirm any sensitive changes below.'
                    : 'Please review the proposed additions below, uncheck anything you do not want, and click Approve Selected.';
                }
              }

              finalAssistantText = finalText;
              updateMessage((message) => ({
                ...message,
                text: finalText,
                appliedActions,
                actionLinks,
              }));
            }
          }
          if (event.truncated) {
            setNotice('The reply reached its token limit. Ask Pip to continue from where it stopped.');
          }
          break;
        }
      }
      if (status !== 'complete') {
        errorMessage = 'The connection ended before Pip finished replying.';
      }
    } catch (error) {
      if (control.signal.aborted) {
        status = 'stopped';
        setNotice('Reply stopped. The provider may still count part of this request.');
      } else {
        errorMessage =
          error instanceof Error && !(error instanceof TypeError)
            ? error.message
            : 'Could not reach the assistant. Check your connection and try again.';
      }
    } finally {
      if (status === 'complete' || status === 'error') setGeminiHealth(status === 'complete' ? 'responded' : 'failed');
      if (status === 'error') {
        // Remove BOTH the failed user prompt and failed assistant bubble from the chat thread
        // and surface them in the dismissible recovery tray above the composer.
        updateChat((chat) => {
          if (regenerate) {
            return { ...chat, messages: chat.messages.map(message => message.id === assistantId ? regenerate.message : message) };
          }
          const remaining = chat.messages.filter(
            (msg) => msg.id !== userTurnId && msg.id !== assistantId,
          );
          return {
            ...chat,
            title: remaining.length === 0 ? 'New chat' : previousTitle,
            titleSource: remaining.length === 0 ? 'default' : previousTitleSource,
            messages: remaining,
          };
        });
        recordFailedAttempt(errorMessage || 'Message failed to send. Please try again.');
      } else {
        updateMessage((message) => ({
          ...message,
          tokens,
          errorMessage,
          state: status,
          edit: proposedEdits?.[0],
          pendingEdits: proposedEdits,
          savePending: unsavedResults.current.has(assistantId),
          appliedActions: appliedActions ?? regenerate?.message.appliedActions,
          actionLinks: actionLinks ?? regenerate?.message.actionLinks,
        }));
        if (status === 'complete' && shouldAutoTitle && !isTauri()) {
          void generateAiChatTitle(targetChatId, prompt, finalAssistantText || responseText, provider, model, key);
        }
      }

      const updated = mergeUsage([
        ...records,
        {
          id: assistantId,
          at: started.getTime(),
          day: localDay(started),
          provider,
          model,
          tokens,
          status,
          ...(errorStatus !== undefined ? { errorStatus } : {}),
        },
      ]);
      if (desktopUsage) {
        setUsage(updated);
        void desktopUsage.save(updated).catch((error) => setNotice(`Could not save AI usage. ${String(error)}`));
      } else {
        setUsage(writeUsage(updated));
      }
      activeRequest.current = null;
      setBusy(false);
    }
  }

  function dismissFailedAttempt(id: string) {
    setFailedAttempts((items) => items.filter((item) => item.id !== id));
  }

  function retryFailedAttempt(id: string) {
    if (busy || activeRequest.current || cooldownUntil > Date.now()) return;
    const target = failedAttempts.find((item) => item.id === id);
    if (!target) return;
    setFailedAttempts((items) => items.filter((item) => item.id !== id));
    void send(false, target.prompt, { overrideAttachments: target.attachments, readOnly: target.readOnly, regenerating: target.regenerating });
  }

  function editFailedAttempt(id: string) {
    const target = failedAttempts.find((item) => item.id === id);
    if (!target) return;
    setFailedAttempts((items) => items.filter((item) => item.id !== id));
    setDraft(target.prompt);
    setAttachments(target.attachments);
  }

  function editAndResendMessage(messageId: string, nextPrompt: string) {
    const clean = nextPrompt.trim();
    if (!clean || busy || activeRequest.current) return;
    const currentChat = conversationsRef.current.find((c) => c.id === active.id);
    if (!currentChat) return;
    const idx = currentChat.messages.findIndex((m) => m.id === messageId && m.role === 'user');
    if (idx < 0) return;
    const baseMessages = currentChat.messages.slice(0, idx);
    const original = currentChat.messages[idx];
    const files = filesFor(original);
    if (original.attachment && !files.length) { setDraft(clean); setNotice('Attach the original file again to edit this request.'); return; }
    const completed = Boolean(original.writeLocked || currentChat.messages[idx + 1]?.savePending || currentChat.messages[idx + 1]?.appliedActions?.length);
    void send(false, clean, { baseMessages, overrideAttachments: files, readOnly: completed });
  }

  function filesFor(turn: ChatMessage) {
    const original = turnFiles.current.get(turn.id);
    if (original) return original;
    const expected = turn.attachments?.map(item => item.name) ?? (turn.attachment ? [turn.attachment] : []);
    if (expected.length && expected.length === attachments.length && expected.every((name, i) => name === attachments[i].name)) {
      return attachments;
    }
    return [];
  }

  function regenerateMessage(messageId: string) {
    if (busy || activeRequest.current) return;
    const currentChat = conversationsRef.current.find((c) => c.id === active.id);
    if (!currentChat) return;
    const idx = currentChat.messages.findIndex((m) => m.id === messageId && m.role === 'assistant');
    if (idx <= 0 || currentChat.messages[idx].savePending || currentChat.messages[idx].id.startsWith('pip/')) return;
    let userIdx = idx - 1;
    while (userIdx >= 0 && currentChat.messages[userIdx].role !== 'user') {
      userIdx--;
    }
    if (userIdx < 0) return;
    const userMsg = currentChat.messages[userIdx];
    const baseMessages = currentChat.messages.slice(0, userIdx);
    const files = filesFor(userMsg);
    if (userMsg.attachment && !files.length) { setNotice('Attach the original file again to regenerate this reply.'); return; }
    void send(false, userMsg.text, { baseMessages, overrideAttachments: files, readOnly: true,
      regenerating: { message: currentChat.messages[idx], user: userMsg } });
  }

  const markCompanionThreadRead = useCallback(() => {
    const { now } = getEffectiveClock(settings.timezone);
    setCompanionThread((prev) => markCompanionRead(prev, now));
  }, [settings.timezone]);

  const openCompanionMessage = useCallback(
    (messageId?: string, options?: { inFloating?: boolean }) => {
      setPipTab('companion');
      if (options?.inFloating && currentApp.current.route !== 'assistant') {
        setPetOpen(true);
      } else {
        setPetOpen(false);
        currentApp.current.setRoute('assistant');
      }
      if (messageId) {
        setHighlightedCompanionMessageId(messageId);
      }
      const { now } = getEffectiveClock(settings.timezone);
      setCompanionThread((prev) => markCompanionRead(prev, now));
    },
    [settings.timezone],
  );

  // Mark Companion read automatically when the user is actively viewing the Companion tab
  useEffect(() => {
    const viewingCompanion =
      pipTab === 'companion' && (app.route === 'assistant' || petOpen);
    if (viewingCompanion && companionUnreadCount > 0) {
      markCompanionThreadRead();
    }
  }, [pipTab, app.route, petOpen, companionUnreadCount, markCompanionThreadRead]);

  // Clear highlight ring after a short visual focus window
  useEffect(() => {
    if (!highlightedCompanionMessageId) return;
    const timer = window.setTimeout(() => setHighlightedCompanionMessageId(null), 3200);
    return () => window.clearTimeout(timer);
  }, [highlightedCompanionMessageId]);

  async function sendCompanionMessage(overrideText?: string) {
    const typed = (overrideText ?? companionDraft).trim();
    if (!typed || companionBusy || companionRequest.current || !available) return;
    if (cooldownUntil > Date.now()) {
      setCompanionNotice(`Pip is cooling down. Try again in ${Math.ceil((cooldownUntil - Date.now()) / 1000)}s.`);
      return;
    }

    const { provider } = settings;
    const key = keys.current[provider];
    const failRecoverably = (message: string) => {
      setCompanionFailedReply({
        id: createId(),
        text: typed,
        errorMessage: message,
        createdAt: getEffectiveClock(settings.timezone).now,
      });
      setCompanionNotice('');
    };

    if (keyStorage === 'loading') {
      setCompanionNotice('Pip is checking for saved API keys. Try again in a moment.');
      return;
    }

    let isProviderConfigured = configured.includes(provider);
    if (!isProviderConfigured && !isTauri() && provider === 'gemini') {
      const liveStatus = await fetchAssistantStatus();
      if (liveStatus.geminiConfigured) {
        isProviderConfigured = true;
        setServerStatus('connected');
        setConfigured((prev) => (prev.includes('gemini') ? prev : [...prev, 'gemini']));
      } else {
        setServerStatus('unconfigured');
      }
    }

    if (!isProviderConfigured && !keyStorageError) {
      if (overrideText === undefined) setCompanionDraft('');
      failRecoverably(
        isTauri()
          ? `Add a ${PROVIDERS[provider].label} API key in AI Settings to chat with Pip.`
          : 'Add your Gemini API key in AI Settings, or configure the local server key.',
      );
      return;
    }

    const { now, clock } = getEffectiveClock(settings.timezone);
    const priorMessages = companionThreadRef.current.messages.filter((m) => m.state !== 'error');
    const detailRequested = isDetailedStudyRequest(typed);
    const reference = resolveContextualReference(typed, priorMessages);
    const workspace = currentApp.current;

    const systemInstructions = buildCompanionSystemInstructions({
      clock,
      language: settings.language,
      casualMixLanguage: settings.casualMixLanguage,
      detailRequested,
      memory: workspace.preferences.pipMemory,
      reference,
    });

    const scopedContext = buildCompanionContext(
      {
        subjects: workspace.subjects,
        tasks: workspace.tasks,
        sessions: workspace.sessions,
        goals: workspace.goals,
        notes: workspace.notes,
        focusHistory: workspace.focusHistory,
        pipMemory: workspace.preferences.pipMemory,
      },
      priorMessages,
      typed,
      clock,
    );

    const historyTurns = priorMessages
      .filter((m) => m.text.trim().length > 0 && (m.role === 'user' || m.state === 'complete'))
      .slice(-8)
      .map(({ role, text }) => ({ role, text }));

    const request: ChatRequest = {
      prompt: typed,
      provider,
      model,
      maxOutput: settings.maxOutput,
      workspaceActions: false,
      allowedTools: [],
      context: scopedContext,
      clientContext: systemInstructions,
      history: historyTurns,
    };

    const userMsgId = `cmp-user-${createId()}`;
    const replyBatchId = `cmp-reply-${createId()}`;
    const streamingId = `${replyBatchId}:0`;

    const userMessage: CompanionMessage = {
      id: userMsgId,
      role: 'user',
      text: typed,
      createdAt: now,
      timeLabel: clock.time,
      date: clock.date,
      kind: 'chat',
      read: true,
      state: 'complete',
    };
    const streamingPlaceholder: CompanionMessage = {
      id: streamingId,
      batchId: replyBatchId,
      role: 'assistant',
      text: '',
      createdAt: now + 1,
      timeLabel: clock.time,
      date: clock.date,
      kind: 'chat',
      read: true,
      state: 'streaming',
    };

    const control = new AbortController();
    companionRequest.current = control;
    setCompanionBusy(true);
    setCompanionNotice('');
    setCompanionFailedReply(null);
    if (overrideText === undefined) setCompanionDraft('');

    // Mark any prior unsolicited outreach as answered now that the user replied
    if (workspace.companionOutreachLedger.lastUnsolicitedBatchId && !workspace.companionOutreachLedger.lastUnsolicitedAnswered) {
      workspace.updateCompanionOutreachLedger((prev) => ({
        ...prev,
        lastUnsolicitedAnswered: true,
      }));
    }

    // Detect if the user agreed to a pending follow-up offer or directly asked Pip to check in later
    const userFollowUp = detectUserFollowUpRequest({
      userText: typed,
      recentMessages: priorMessages,
      clock,
      now,
      sessions: workspace.sessions,
      subjects: workspace.subjects,
      timezone: settings.timezone,
    });
    if (userFollowUp.followUp) {
      workspace.addCompanionFollowUp(userFollowUp.followUp);
    }

    setCompanionThread((prev) => {
      const readPrev = markCompanionRead(prev, now);
      const updatedMessages = userFollowUp.acceptedOfferMessageId
        ? readPrev.messages.map((m) =>
            m.id === userFollowUp.acceptedOfferMessageId && m.followUpOffer
              ? { ...m, followUpOffer: { ...m.followUpOffer, accepted: true } }
              : m,
          )
        : readPrev.messages;
      return {
        ...readPrev,
        updatedAt: now,
        messages: [...updatedMessages, userMessage, streamingPlaceholder],
      };
    });

    const records = mergeUsage(usage, desktopUsage ? [] : readUsage());
    const started = new Date(now);
    let responseText = '';
    let tokens: TokenUsage | undefined;
    let errorMessage: string | undefined;
    let errorStatus: number | undefined;
    let status: UsageEntryStatus = 'error';

    try {
      for await (const event of sendChat(request, key, control.signal)) {
        if (event.type === 'text') {
          responseText += event.text;
          setCompanionThread((prev) => ({
            ...prev,
            messages: prev.messages.map((m) => (m.id === streamingId ? { ...m, text: responseText } : m)),
          }));
        }
        if (event.type === 'usage') tokens = event.usage;
        if (event.type === 'retry') setCompanionNotice(`Provider unavailable. Retrying in ${event.seconds}s…`);
        if (event.type === 'error') {
          errorStatus = event.status;
          throw providerFailure(provider, event);
        }
        if (event.type === 'done') {
          status = 'complete';
          setCompanionNotice('');
          break;
        }
      }
      if (status !== 'complete') {
        errorMessage = 'The connection ended before Pip finished replying.';
      }
    } catch (error) {
      if (control.signal.aborted) {
        status = 'stopped';
        setCompanionNotice('Reply stopped.');
      } else {
        errorMessage =
          error instanceof Error && !(error instanceof TypeError)
            ? error.message
            : 'Could not reach Gemini. Your message is saved below so you can retry.';
      }
    } finally {
      if (status === 'complete' || status === 'error') {
        setGeminiHealth(status === 'complete' ? 'responded' : 'failed');
      }

      if (status === 'error') {
        setCompanionThread((prev) => ({
          ...prev,
          messages: prev.messages.filter((m) => m.id !== userMsgId && m.id !== streamingId),
        }));
        failRecoverably(errorMessage || 'Could not send right now. Retry when Gemini is available.');
      } else {
        const doneClock = getEffectiveClock(settings.timezone);
        const parsedOffer = parseFollowUpOfferFromReply(
          responseText,
          doneClock.clock,
          doneClock.now,
          currentApp.current.sessions,
          currentApp.current.subjects,
          settings.timezone,
        );
        const bubbles = splitCompanionBubbles(parsedOffer.cleanedText);
        const finalBubbles: CompanionMessage[] = (bubbles.length ? bubbles : [parsedOffer.cleanedText.trim() || 'Got it.']).map(
          (bubbleText, index, arr) => ({
            id: `${replyBatchId}:${index}`,
            batchId: replyBatchId,
            role: 'assistant',
            text: bubbleText,
            createdAt: doneClock.now + index,
            timeLabel: doneClock.clock.time,
            date: doneClock.clock.date,
            kind: 'chat',
            read: true,
            followUpOffer: index === arr.length - 1 ? parsedOffer.offer : undefined,
            tokens: index === 0 ? tokens : undefined,
            state: status === 'stopped' ? 'stopped' : 'complete',
          }),
        );

        setCompanionThread((prev) => ({
          ...prev,
          updatedAt: doneClock.now,
          lastReadAt: Math.max(prev.lastReadAt, doneClock.now),
          messages: [...prev.messages.filter((m) => m.id !== streamingId), ...finalBubbles],
        }));
      }

      const updated = mergeUsage([
        ...records,
        {
          id: streamingId,
          at: started.getTime(),
          day: localDay(started),
          provider,
          model,
          tokens,
          status,
          ...(errorStatus !== undefined ? { errorStatus } : {}),
        },
      ]);
      if (desktopUsage) {
        setUsage(updated);
        void desktopUsage.save(updated).catch((error) => setNotice(`Could not save AI usage. ${String(error)}`));
      } else {
        setUsage(writeUsage(updated));
      }

      companionRequest.current = null;
      setCompanionBusy(false);
    }
  }

  function dismissCompanionFailedReply() {
    setCompanionFailedReply(null);
  }

  function retryCompanionFailedReply() {
    if (!companionFailedReply || companionBusy || companionRequest.current) return;
    const text = companionFailedReply.text;
    setCompanionFailedReply(null);
    void sendCompanionMessage(text);
  }

  function editCompanionFailedReply() {
    if (!companionFailedReply) return;
    const text = companionFailedReply.text;
    setCompanionFailedReply(null);
    setCompanionDraft(text);
  }

  function acceptCompanionSuggestion(
    message: CompanionMessage,
    suggestion: CompanionSuggestion,
    actionOverride?: 'focus' | 'note',
  ) {
    const state = currentApp.current;
    const targetKind = actionOverride ?? suggestion.kind;
    if (targetKind === 'note' && suggestion.noteId) {
      state.setSelectedNoteId(suggestion.noteId);
      state.setRoute('notes');
      setPetOpen(false);
    } else if (targetKind === 'focus') {
      const minutes = Math.max(5, Math.min(90, suggestion.minutes ?? 10));
      state.setFocusContext(suggestion.subjectId ?? state.subjects[0]?.id ?? '', suggestion.taskTitle ?? suggestion.label);
      state.setFocusDuration(0, minutes, 'Custom');
      if (!state.focusTimer.running) {
        state.toggleFocusRunning();
      }
      state.setRoute('focus');
      setPetOpen(false);
    } else if (targetKind === 'practice') {
      state.setRoute('practice');
      setPetOpen(false);
    } else if (targetKind === 'flashcards') {
      state.setRoute('flashcards');
      setPetOpen(false);
    } else if (targetKind === 'task') {
      state.setRoute('tasks');
      setPetOpen(false);
    }

    setCompanionThread((prev) => ({
      ...prev,
      messages: prev.messages.map((m) =>
        m.id === message.id && m.suggestion
          ? { ...m, suggestion: { ...m.suggestion, accepted: true } }
          : m,
      ),
    }));
  }

  function dismissCompanionSuggestion(message: CompanionMessage) {
    setCompanionThread((prev) => ({
      ...prev,
      messages: prev.messages.map((m) =>
        m.id === message.id && m.suggestion
          ? { ...m, suggestion: { ...m.suggestion, dismissed: true } }
          : m,
      ),
    }));
  }

  function acceptCompanionFollowUpOffer(message: CompanionMessage) {
    const offer = message.followUpOffer;
    if (!offer || offer.accepted) return;
    const { now } = getEffectiveClock(settings.timezone);
    currentApp.current.addCompanionFollowUp({
      id: `fu-${offer.dueDate}-${offer.dueTime}-${offer.topic.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 24)}`,
      topic: offer.topic,
      dueAt: offer.dueAt,
      dueDate: offer.dueDate,
      dueTime: offer.dueTime,
      status: 'scheduled',
      createdAt: now,
      sourceMessageId: message.id,
    });
    setCompanionThread((prev) => ({
      ...prev,
      messages: prev.messages.map((m) =>
        m.id === message.id && m.followUpOffer
          ? { ...m, followUpOffer: { ...m.followUpOffer, accepted: true } }
          : m,
      ),
    }));
  }

  function dismissCompanionFollowUpOffer(message: CompanionMessage) {
    setCompanionThread((prev) => ({
      ...prev,
      messages: prev.messages.map((m) =>
        m.id === message.id && m.followUpOffer
          ? { ...m, followUpOffer: { ...m.followUpOffer, dismissed: true } }
          : m,
      ),
    }));
  }

  function rescheduleCompanionFollowUp(id: string, dueDate: string, dueTime: string) {
    const existing = currentApp.current.companionFollowUps.find((f) => f.id === id);
    if (!existing) return;
    const { now } = getEffectiveClock(settings.timezone);
    const updated = buildRescheduledFollowUp(existing, dueDate, dueTime, now, settings.timezone);
    currentApp.current.updateCompanionFollowUp(id, {
      dueAt: updated.dueAt,
      dueDate: updated.dueDate,
      dueTime: updated.dueTime,
      status: 'scheduled',
    });
  }

  function cancelCompanionFollowUp(id: string) {
    currentApp.current.cancelCompanionFollowUp(id);
  }

  // Unified local Companion outreach & scheduled follow-up delivery loop (persist-before-notify)
  const draftOutreachWithGemini = useCallback(
    async (draftPrompt: string, verifiedFacts: Record<string, unknown>, clock: ReturnType<typeof requestClock>): Promise<string | null> => {
      if (!available) return null;
      const provider = settings.provider;
      const key = keys.current[provider];
      if (keyStorage === 'loading') return null;

      let isProviderConfigured = configured.includes(provider);
      if (!isProviderConfigured && !isTauri() && provider === 'gemini') {
        const liveStatus = await fetchAssistantStatus().catch(() => ({ geminiConfigured: false }));
        if (liveStatus.geminiConfigured) {
          isProviderConfigured = true;
          setServerStatus('connected');
          setConfigured((prev) => (prev.includes('gemini') ? prev : [...prev, 'gemini']));
        }
      }
      if (!isProviderConfigured) return null;

      const request: ChatRequest = {
        provider,
        model,
        maxOutput: 300,
        workspaceActions: false,
        allowedTools: [],
        context: JSON.stringify(verifiedFacts),
        clientContext: buildOutreachSystemInstructions({
          clock,
          language: settings.language,
          casualMixLanguage: settings.casualMixLanguage,
          memory: currentApp.current.preferences.pipMemory,
        }),
        history: [],
        prompt: draftPrompt,
      };

      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 15_000);
      let drafted = '';
      try {
        for await (const event of sendChat(request, key, controller.signal)) {
          if (event.type === 'text') drafted += event.text;
          if (event.type === 'error') return null;
        }
        const cleaned = drafted.trim().replace(/^["“]|["”]$/g, '').trim();
        return cleaned.length >= 2 ? cleaned : null;
      } catch {
        return null;
      } finally {
        window.clearTimeout(timeout);
      }
    },
    [available, configured, keyStorage, model, settings.casualMixLanguage, settings.language, settings.maxOutput, settings.provider],
  );

  const runCompanionOutreachCheck = useCallback(async () => {
    if (outreachInFlight.current || busy || companionBusy || Date.now() < outreachRetryAfter.current) return;
    const state = currentApp.current;
    const { now, clock } = getEffectiveClock(settings.timezone);

    const completed = new Set(
      state.goals.flatMap((g) => g.milestones.filter((m) => m.done).map((m) => `milestone/${g.id}/${m.id}`)),
    );
    const previous = pastMilestones.current ?? completed;
    pastMilestones.current = completed;
    const newMilestones = new Set([...completed].filter((key) => !previous.has(key)));

    outreachInFlight.current = true;
    try {
      // 1. Check user-agreed one-time follow-ups first (marks stale ones skipped instead of bursting)
      const evaluateFollowUps = (workspace: typeof state, timestamp: number, time: string) => findDueFollowUp({
        followUps: workspace.companionFollowUps,
        now: timestamp,
        time,
        running: workspace.focusTimer.running,
        settings: workspace.preferences.pipCheckIns ?? {},
        pipMemory: workspace.preferences.pipMemory,
      });
      const { due: dueFollowUp, staleIds } = evaluateFollowUps(state, now, clock.time);

      if (staleIds.length > 0) {
        for (const staleId of staleIds) {
          state.updateCompanionFollowUp(staleId, { status: 'skipped' });
        }
      }

      if (dueFollowUp) {
        const batchId = `companion/followup/${dueFollowUp.id}`;
        const firstId = `${batchId}:0`;
        const alreadySent =
          companionThreadRef.current.messages.some((m) => m.batchId === batchId || m.id === firstId) ||
          state.notifications.some((n) => n.id === batchId);

        if (alreadySent) {
          state.updateCompanionFollowUp(dueFollowUp.id, { status: 'delivered' });
        } else {
          const drafted = await draftOutreachWithGemini(
            `Draft one short, warm follow-up checking in on "${dueFollowUp.topic}" as the student asked you to earlier. One short sentence, casual and friendly.`,
            { type: 'agreed_followup', topic: dueFollowUp.topic, scheduledFor: `${dueFollowUp.dueDate} ${dueFollowUp.dueTime}` },
            clock,
          );
          if (!drafted) {
            outreachRetryAfter.current = Date.now() + 5 * 60_000;
            return;
          }
          const current = getEffectiveClock(settings.timezone);
          const stillDue = evaluateFollowUps(currentApp.current, current.now, current.clock.time).due;
          if (companionRequest.current || stillDue?.id !== dueFollowUp.id || stillDue.dueAt !== dueFollowUp.dueAt) {
            return;
          }
          const bubbles = splitCompanionBubbles(drafted);
          if (!bubbles.length) return;
          const viewingCompanionNow = pipTab === 'companion' && (currentApp.current.route === 'assistant' || petOpen);
          const newMessages: CompanionMessage[] = bubbles.map((text, index) => ({
            id: `${batchId}:${index}`,
            batchId,
            role: 'assistant',
            text,
            createdAt: now + index,
            timeLabel: clock.time,
            date: clock.date,
            kind: 'followup',
            read: viewingCompanionNow,
            triggerKey: `followup/${dueFollowUp.id}`,
            state: 'complete',
          }));

          // Persist BEFORE notifying
          const nextThread: CompanionThreadState = {
            ...companionThreadRef.current,
            updatedAt: now,
            messages: [...companionThreadRef.current.messages, ...newMessages],
          };
          await persistCompanionSnapshot(nextThread);
          flushSync(() => {
            setCompanionThread(prev => ({
              ...prev,
              updatedAt: Math.max(prev.updatedAt, now),
              messages: [...prev.messages, ...newMessages],
            }));
            currentApp.current.updateCompanionFollowUp(dueFollowUp.id, { status: 'delivered' });
          });
          await currentApp.current.saveWorkspace();

          // Send at most ONE notification for the batch, deep-linked to the first bubble
          const firstBubble = newMessages[0];
          if (firstBubble) {
            currentApp.current.addPipNotification({
              id: batchId,
              title: 'Pip',
              detail: firstBubble.text,
              time: clock.time,
              read: viewingCompanionNow,
              route: 'assistant',
              companionMessageId: firstBubble.id,
            });
          }
          return;
        }
      }

      // 2. Evaluate unsolicited Companion outreach under the shared 1/day local cap
      const evaluation = evaluateCompanionOutreach({
        settings: state.preferences.pipCheckIns ?? {},
        date: clock.date,
        time: clock.time,
        now,
        running: state.focusTimer.running,
        notifications: state.notifications,
        ledger: state.companionOutreachLedger,
        companionMessages: companionThreadRef.current.messages,
        subjects: state.subjects,
        sessions: state.sessions,
        focusHistory: state.focusHistory,
        goals: state.goals,
        newMilestones,
        tasks: state.tasks,
        notes: state.notes,
        pipMemory: state.preferences.pipMemory,
      });

      const candidate = evaluation.candidate;
      if (!candidate) return;
      const drafted = await draftOutreachWithGemini(candidate.draftPrompt, candidate.verifiedFacts, clock);
      if (!drafted) {
        outreachRetryAfter.current = Date.now() + 5 * 60_000;
        return;
      }

      // Re-verify idempotency & eligibility right before persisting
      const latest = currentApp.current;
      const current = getEffectiveClock(settings.timezone);
      const refreshed = evaluateCompanionOutreach({
        settings: latest.preferences.pipCheckIns ?? {},
        date: current.clock.date,
        time: current.clock.time,
        now: current.now,
        running: latest.focusTimer.running,
        notifications: latest.notifications,
        ledger: latest.companionOutreachLedger,
        companionMessages: companionThreadRef.current.messages,
        subjects: latest.subjects,
        sessions: latest.sessions,
        focusHistory: latest.focusHistory,
        goals: latest.goals,
        newMilestones,
        tasks: latest.tasks,
        notes: latest.notes,
        pipMemory: latest.preferences.pipMemory,
      });
      if (companionRequest.current || refreshed.candidate?.batchId !== candidate.batchId) return;

      const bubbles = splitCompanionBubbles(drafted);
      if (!bubbles.length) return;
      const viewingCompanionNow = pipTab === 'companion' && (latest.route === 'assistant' || petOpen);
      const newMessages: CompanionMessage[] = bubbles.map((text, index) => ({
        id: `${candidate.batchId}:${index}`,
        batchId: candidate.batchId,
        role: 'assistant',
        text,
        createdAt: now + index,
        timeLabel: clock.time,
        date: clock.date,
        kind: candidate.kind,
        read: viewingCompanionNow,
        triggerKey: candidate.triggerKey,
        suggestion: index === bubbles.length - 1 ? candidate.suggestion : undefined,
        state: 'complete',
      }));

      // Persist Companion thread + ledger BEFORE notifying
      const nextThread: CompanionThreadState = {
        ...companionThreadRef.current,
        updatedAt: now,
        messages: [...companionThreadRef.current.messages, ...newMessages],
      };
      await persistCompanionSnapshot(nextThread);

      const phone = isTauri() && Boolean(latest.preferences.pipCheckIns?.phoneDelivery);
      flushSync(() => {
        setCompanionThread(prev => ({
          ...prev,
          updatedAt: Math.max(prev.updatedAt, now),
          messages: [...prev.messages, ...newMessages],
        }));
        latest.updateCompanionOutreachLedger((prev) => ({
          ...prev,
          lastUnsolicitedDate: clock.date,
          lastUnsolicitedBatchId: candidate.batchId,
          lastUnsolicitedAt: now,
          lastUnsolicitedAnswered: false,
          deliveredKeys: [...prev.deliveredKeys, candidate.triggerKey],
          deliveredBatchIds: [...prev.deliveredBatchIds, candidate.batchId],
        }));
      });
      await currentApp.current.saveWorkspace();

      // Emit at most ONE notification for the whole batch, pointing to the exact first bubble
      const firstBubble = newMessages[0];
      if (firstBubble) {
        flushSync(() => {
          currentApp.current.addPipNotification({
            id: candidate.batchId,
            title: 'Pip',
            detail: firstBubble.text,
            time: clock.time,
            read: Boolean(phone || viewingCompanionNow),
            route: 'assistant',
            companionMessageId: firstBubble.id,
          });
        });
      }

      if (phone) {
        const legacyShape: CheckIn = { key: candidate.triggerKey, text: firstBubble?.text ?? drafted };
        relayWork.current = relayWork.current
          .then(async () => {
            const state = currentApp.current;
            if (state.focusTimer.running || !state.preferences.pipCheckIns?.enabled || !state.preferences.pipCheckIns.phoneDelivery) return;
            const observedAt = getEffectiveClock(settings.timezone).now;
            const timeNow = requestClock(settings.timezone, new Date(observedAt));
            if (timeNow.date !== clock.date || timeNow.time !== clock.time) return;
            const toMinute = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
            const nowMinute = toMinute(timeNow.time);
            const quietStart = toMinute(currentApp.current.preferences.pipCheckIns?.quietFrom ?? '21:30');
            const remaining = Math.min(20, 1440 - nowMinute, (1440 + quietStart - nowMinute) % 1440 || 1440);
            const fingerprint = Array.from(
              new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(legacyShape.key))),
              (byte) => byte.toString(16).padStart(2, '0'),
            ).join('');
            await invoke('pip_relay', {
              action: 'enqueue',
              body: {
                day: clock.date,
                fingerprint,
                kind: legacyShape.key.split('/')[0],
                observedAt,
                expiresAt: Math.floor(observedAt / 60000) * 60000 + remaining * 60000,
              },
            });
          })
          .catch(() => {
            setNotice('Pip could not queue this check-in. Check the relay pairing in AI Settings.');
          });
      }
    } catch {
      outreachRetryAfter.current = Date.now() + 5 * 60_000;
      setCompanionNotice('Pip could not save the Companion update on this device.');
    } finally {
      outreachInFlight.current = false;
    }
  }, [busy, companionBusy, draftOutreachWithGemini, persistCompanionSnapshot, petOpen, pipTab, settings.timezone]);

  useEffect(() => {
    const first = window.setTimeout(() => {
      void runCompanionOutreachCheck();
    }, 0);
    const timer = window.setInterval(() => {
      void runCompanionOutreachCheck();
    }, 30_000);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(timer);
    };
  }, [runCompanionOutreachCheck, app.goals, app.preferences.pipCheckIns, app.companionFollowUps]);

  // Handle queued askPip triggers cleanly once UI switches
  useEffect(() => {
    if (!pendingAskPrompt.current || busy) return;
    const prompt = pendingAskPrompt.current;
    pendingAskPrompt.current = null;
    void send(false, prompt);
  });

  const askPip = useCallback(
    (prompt: string, options?: { openFullPage?: boolean; openFloating?: boolean; draftOnly?: boolean; excerptOnly?: boolean }) => {
      const clean = prompt.trim();
      if (!clean) return;
      if (options?.openFullPage) {
        setPetOpen(false);
        currentApp.current.setRoute('assistant');
      } else if (options?.openFloating !== false && currentApp.current.route !== 'assistant') {
        setPetOpen(true);
      }
      if (options?.excerptOnly) setIncludeContext(false);
      if (options?.draftOnly) {
        pendingAskPrompt.current = null;
        setDraft(previous => previous.trim() ? `${previous.trim()}\n\n${clean}` : clean);
        return;
      }
      if (busy || activeRequest.current) {
        setDraft(clean);
        return;
      }
      pendingAskPrompt.current = clean;
      setDraft('');
    },
    [busy],
  );

  const refreshDashboardOverview = useCallback(async () => {
    if (dashboardOverviewLoading) return;
    setDashboardOverviewLoading(true);
    setDashboardOverviewError('');
    try {
      const clock = requestClock(settings.timezone);
      const [h, m] = clock.time.split(':').map(Number);
      const currentHour = (Number.isFinite(h) ? h : 9) + (Number.isFinite(m) ? m : 0) / 60;
      const a = currentApp.current;
      const diag = computeWorkspaceDiagnostics(
        {
          subjects: a.subjects,
          tasks: a.tasks,
          sessions: a.sessions,
          exams: a.exams,
          goals: a.goals,
          notes: a.notes,
          decks: a.decks,
          flashcards: a.flashcards,
          quizzes: a.quizzes,
          focusHistory: a.focusHistory,
          dailyGoalHours: a.preferences.dailyGoalHours,
          weeklyGoalHours: a.preferences.weeklyGoalHours,
        },
        clock.date,
        currentHour,
      );
      const diagnosticsJson = buildOverviewPayloadText(diag);
      const geminiModel = settings.models.gemini || PROVIDERS.gemini.model;
      const result = await fetchDashboardOverview(
        { diagnosticsJson, clockLabel: clock.label, model: geminiModel },
        keys.current.gemini,
      );
      setDashboardOverview(result.overview);
      try {
        sessionStorage.setItem(overviewCacheKey, JSON.stringify(result.overview));
      } catch {
        // Ignore sessionStorage quota issues
      }
      if (result.usage) {
        const entry: UsageEntry = {
          id: createId(),
          at: Date.now(),
          day: localDay(),
          provider: 'gemini',
          model: geminiModel,
          tokens: result.usage,
          status: 'complete',
        };
        const records = mergeUsage(usage, [entry]);
        if (desktopUsage) {
          await desktopUsage.save(records);
          setUsage(records);
        } else {
          setUsage(writeUsage(records));
        }
      }
    } catch (err) {
      setDashboardOverviewError(
        err instanceof Error ? err.message : 'Could not analyze your workspace right now.',
      );
    } finally {
      setDashboardOverviewLoading(false);
    }
  }, [dashboardOverviewLoading, desktopUsage, settings.models.gemini, settings.timezone, usage]);

  async function generate(kind: StudyGenerationKind, prompt: string, source: string): Promise<unknown> {
    const provider = settings.provider;
    const key = keys.current[provider];
    if (keyStorage === 'loading') throw new Error('Pip is checking for saved API keys. Try again in a moment.');
    let isProviderConfigured = configured.includes(provider);
    if (!isProviderConfigured && !isTauri() && provider === 'gemini') {
      const liveStatus = await fetchAssistantStatus();
      if (liveStatus.geminiConfigured) {
        isProviderConfigured = true;
        setServerStatus('connected');
        setConfigured((prev) => (prev.includes('gemini') ? prev : [...prev, 'gemini']));
      } else {
        setServerStatus('unconfigured');
      }
    }
    if (!isProviderConfigured && !keyStorageError) {
      throw new Error(
        isTauri()
          ? 'Add your ' + PROVIDERS[provider].label + ' API key in Settings.'
          : 'Add your Gemini API key in AI Settings, or configure the local server key.',
      );
    }
    if (cooldownUntil > Date.now()) {
      throw new Error('The AI provider is cooling down. Try again when the countdown ends.');
    }
    if (activeRequest.current) {
      throw new Error('Pip is already working on a request. Try again when it finishes.');
    }
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
      for await (const event of sendChat(
        {
          provider,
          model,
          prompt,
          context: source,
          history: [],
          maxOutput: 0,
          studyGeneration: kind,
          clientContext: `Current local date and time: ${clock.label}. Default response language: ${settings.language ?? 'match the source'}.`,
        },
        key,
        control.signal,
      )) {
        if (event.type === 'text') body += event.text;
        if (event.type === 'error') throw providerFailure(provider, event);
        if (event.type === 'usage') tokens = event.usage;
        if (event.type === 'done') complete = !event.truncated;
      }
      if (!complete) throw new Error('Incomplete provider response. Try a shorter selection.');
      let result: unknown;
      try {
        result = JSON.parse(body.trim().replace(/^```(?:json)?\s*|\s*```$/gi, ''));
      } catch {
        /* The provider did not return JSON. */
      }
      const items = Array.isArray(result) ? result : (result as { items?: unknown } | undefined)?.items;
      if (!Array.isArray(items) || !items.length) {
        throw new Error('Pip did not receive usable study items. Retry with a shorter section or choose a different model.');
      }
      valid = true;
      return items;
    } finally {
      activeRequest.current = null;
      setBusy(false);
      const entry: UsageEntry = {
        id: createId(),
        at: Date.now(),
        day: localDay(),
        provider,
        model,
        tokens,
        status: valid ? 'complete' : 'error',
      };
      const records = mergeUsage(usage, [entry]);
      if (desktopUsage) {
        await desktopUsage.save(records);
        setUsage(records);
      } else {
        setUsage(writeUsage(records));
      }
    }
  }

  async function generateStructured<T>(kind: StudyGenerationKind, prompt: string, source: string): Promise<T> {
    const provider = settings.provider;
    const key = keys.current[provider];
    if (keyStorage === 'loading') throw new Error('Pip is checking for saved API keys. Try again in a moment.');
    let isProviderConfigured = configured.includes(provider);
    if (!isProviderConfigured && !isTauri() && provider === 'gemini') {
      const liveStatus = await fetchAssistantStatus();
      if (liveStatus.geminiConfigured) {
        isProviderConfigured = true;
        setServerStatus('connected');
        setConfigured((prev) => (prev.includes('gemini') ? prev : [...prev, 'gemini']));
      } else {
        setServerStatus('unconfigured');
      }
    }
    if (!isProviderConfigured && !keyStorageError) {
      throw new Error(
        isTauri()
          ? 'Add your ' + PROVIDERS[provider].label + ' API key in Settings.'
          : 'Add your Gemini API key in AI Settings, or configure the local server key.',
      );
    }
    if (cooldownUntil > Date.now()) {
      throw new Error('The AI provider is cooling down. Try again when the countdown ends.');
    }
    if (activeRequest.current) {
      throw new Error('Pip is already working on a request. Try again when it finishes.');
    }
    if (!source.trim()) throw new Error('Provide text or upload a file first.');
    const trimmedSource = source;
    let body = '';
    let complete = false;
    let valid = false;
    let tokens: TokenUsage | undefined;
    const control = new AbortController();
    activeRequest.current = control;
    setBusy(true);
    try {
      const clock = requestClock(settings.timezone);
      for await (const event of sendChat(
        {
          provider,
          model,
          prompt,
          context: trimmedSource,
          history: [],
          maxOutput: 0,
          studyGeneration: kind,
          clientContext: `Current local date and time: ${clock.label}. Default response language: ${settings.language ?? 'match the source'}.`,
        },
        key,
        control.signal,
      )) {
        if (event.type === 'text') body += event.text;
        if (event.type === 'error') throw providerFailure(provider, event);
        if (event.type === 'usage') tokens = event.usage;
        if (event.type === 'done') complete = !event.truncated;
      }
      if (!complete) throw new Error('Incomplete provider response. Try a shorter document.');
      let parsed: unknown;
      try {
        parsed = JSON.parse(body.trim().replace(/^```(?:json)?\s*|\s*```$/gi, ''));
      } catch {
        throw new Error('Pip returned malformed structured data. Retry with a shorter section.');
      }
      if (!parsed || typeof parsed !== 'object') {
        throw new Error('Pip did not return structured study data.');
      }
      valid = true;
      return parsed as T;
    } finally {
      activeRequest.current = null;
      setBusy(false);
      const entry: UsageEntry = {
        id: createId(),
        at: Date.now(),
        day: localDay(),
        provider,
        model,
        tokens,
        status: valid ? 'complete' : 'error',
      };
      const records = mergeUsage(usage, [entry]);
      if (desktopUsage) {
        await desktopUsage.save(records);
        setUsage(records);
      } else {
        setUsage(writeUsage(records));
      }
    }
  }

  async function generateText(prompt: string, contextText = ''): Promise<string> {
    const provider = settings.provider;
    const key = keys.current[provider];
    if (keyStorage === 'loading') throw new Error('Pip is checking for saved API keys. Try again in a moment.');
    let isProviderConfigured = configured.includes(provider);
    if (!isProviderConfigured && !isTauri() && provider === 'gemini') {
      const liveStatus = await fetchAssistantStatus();
      if (liveStatus.geminiConfigured) {
        isProviderConfigured = true;
        setServerStatus('connected');
        setConfigured((prev) => (prev.includes('gemini') ? prev : [...prev, 'gemini']));
      }
    }
    if (!isProviderConfigured && !keyStorageError) {
      throw new Error('Pip is not configured yet. Check your API settings.');
    }
    if (cooldownUntil > Date.now()) {
      throw new Error('The AI provider is cooling down. Try again shortly.');
    }
    if (activeRequest.current) {
      throw new Error('Pip is already working on a request. Wait for it to finish.');
    }
    let body = '';
    let valid = false;
    let tokens: TokenUsage | undefined;
    const control = new AbortController();
    activeRequest.current = control;
    setBusy(true);
    try {
      const clock = requestClock(settings.timezone);
      for await (const event of sendChat(
        {
          provider,
          model,
          prompt,
          context: contextText,
          history: [],
          maxOutput: 0,
          workspaceActions: false,
          clientContext: `Current local date and time: ${clock.label}.`,
        },
        key,
        control.signal,
      )) {
        if (event.type === 'text') body += event.text;
        if (event.type === 'error') throw providerFailure(provider, event);
        if (event.type === 'usage') tokens = event.usage;
      }
      if (!body.trim()) throw new Error('Pip returned an empty response.');
      valid = true;
      return body.trim();
    } finally {
      activeRequest.current = null;
      setBusy(false);
      const entry: UsageEntry = {
        id: createId(),
        at: Date.now(),
        day: localDay(),
        provider,
        model,
        tokens,
        status: valid ? 'complete' : 'error',
      };
      const records = mergeUsage(usage, [entry]);
      if (desktopUsage) {
        await desktopUsage.save(records);
        setUsage(records);
      } else {
        setUsage(writeUsage(records));
      }
    }
  }

  async function restructureMarkdown(
    source: string,
    options?: {
      instructions?: string;
      normalizeLanguage?: boolean;
      targetLanguage?: string;
      filterUnwantedImages?: boolean;
      figures?: PdfFigure[];
      onStream?: (partial: string) => void;
      onMeta?: (meta: { detectedLanguage?: string; removedFigures: string[]; keptFigures: string[] }) => void;
    },
  ): Promise<{ markdown: string; detectedLanguage?: string; removedFigures: string[]; keptFigures: string[] }> {
    const provider: Provider = 'gemini';
    const geminiModel = settings.models.gemini || PROVIDERS.gemini.model;
    const key = keys.current.gemini;
    if (keyStorage === 'loading') throw new Error('Pip is checking for saved API keys. Try again in a moment.');
    if (cooldownUntil > Date.now()) {
      throw new Error('Gemini is cooling down. Try again when the countdown ends.');
    }
    if (activeRequest.current) {
      throw new Error('AI is already working on a request. Try again when it finishes.');
    }
    const trimmedSource = source.trim();
    if (!trimmedSource) throw new Error('There is no text to restructure.');
    if (trimmedSource.length > CHAT_LIMITS.context) {
      throw new Error('This document exceeds the AI context limit. Try restructuring a single page or shorter section.');
    }

    const rawFigures = (options?.figures ?? []).filter((fig) => trimmedSource.includes(fig.id));
    const positionSignatureCounts = new Map<string, number>();
    for (const fig of rawFigures) {
      const sig = `${Math.round((fig.top ?? 0) / 12)}-${Math.round((fig.width ?? 0) / 12)}-${Math.round((fig.height ?? 0) / 12)}`;
      positionSignatureCounts.set(sig, (positionSignatureCounts.get(sig) ?? 0) + 1);
    }

    const encodedFigures: ClientRestructureFigure[] = [];
    for (const fig of rawFigures.slice(0, 12)) {
      const match = fig.image.match(/^data:(image\/(?:webp|png|jpeg));base64,([A-Za-z0-9+/=]+)$/);
      if (!match) continue;
      const sig = `${Math.round((fig.top ?? 0) / 12)}-${Math.round((fig.width ?? 0) / 12)}-${Math.round((fig.height ?? 0) / 12)}`;
      encodedFigures.push({
        id: fig.id,
        mimeType: match[1] as ClientRestructureFigure['mimeType'],
        base64: match[2],
        positionHint: fig.positionHint,
        width: fig.width,
        height: fig.height,
        pageNumber: fig.pageNumber,
        repeatCount: positionSignatureCounts.get(sig) ?? 1,
      });
    }

    let body = '';
    let valid = false;
    let tokens: TokenUsage | undefined;
    let errorStatus: number | undefined;
    let latestMeta: { detectedLanguage?: string; removedFigures: string[]; keptFigures: string[] } = {
      removedFigures: [],
      keptFigures: encodedFigures.map((f) => f.id),
    };
    const control = new AbortController();
    activeRequest.current = control;
    setBusy(true);
    try {
      if (!isTauri()) {
        for await (const event of streamNotesRestructureClient(
          {
            markdown: trimmedSource,
            instructions: options?.instructions,
            normalizeLanguage: options?.normalizeLanguage,
            targetLanguage: options?.targetLanguage ?? 'auto',
            filterUnwantedImages: options?.filterUnwantedImages !== false,
            figures: encodedFigures,
            model: geminiModel,
          },
          key,
          control.signal,
        )) {
          if (event.type === 'meta') {
            latestMeta = {
              detectedLanguage: event.detectedLanguage ?? latestMeta.detectedLanguage,
              removedFigures: event.removedFigures,
              keptFigures: event.keptFigures,
            };
            options?.onMeta?.(latestMeta);
          }
          if (event.type === 'text') {
            body += event.text;
            options?.onStream?.(stripOuterMarkdownFence(body));
          }
          if (event.type === 'error') {
            errorStatus = event.status;
            throw providerFailure(provider, { type: 'error', message: event.message, status: event.status });
          }
          if (event.type === 'usage') tokens = event.usage;
        }
      } else {
        const langRule = options?.normalizeLanguage
          ? options.targetLanguage && options.targetLanguage !== 'auto'
            ? `Detect the source Unicode/font language and convert into clean, proper ${options.targetLanguage}.`
            : 'Detect the source language (including Unicode or legacy font encoding) and repair/normalize it into clean, proper Unicode in that exact detected language.'
          : 'Preserve the exact original language, script, and Unicode characters verbatim.';
        const imageRule =
          options?.filterUnwantedImages !== false
            ? 'Remove unwanted header/footer/logo/watermark figure tags while keeping meaningful study diagrams, charts, and illustrations.'
            : 'Keep all existing figure tags intact.';
        const prompt = [
          'Restructure and properly order the provided extracted Markdown into clean study notes.',
          'Convert all tabular data into valid GFM Markdown tables (blank lines before and after, column 0, valid | --- | divider).',
          'Write simple chemical formulas using clean Unicode subscripts/superscripts (e.g. Na₂CO₃, KIO₃, K₂Cr₂O₇, Fe²⁺, →, ⇌) instead of verbose LaTeX; use standard KaTeX $...$ / $$...$$ only for real math equations.',
          langRule,
          imageRule,
          options?.instructions?.trim() ? `Extra instruction: ${options.instructions.trim()}` : '',
          'Return ONLY the clean restructured Markdown directly with no outer code fence.',
        ]
          .filter(Boolean)
          .join('\n');

        const clock = requestClock(settings.timezone);
        for await (const event of sendChat(
          {
            provider,
            model: geminiModel,
            prompt,
            context: trimmedSource,
            history: [],
            maxOutput: 0,
            clientContext: `Current local date and time: ${clock.label}.`,
          },
          key,
          control.signal,
        )) {
          if (event.type === 'text') {
            body += event.text;
            options?.onStream?.(stripOuterMarkdownFence(body));
          }
          if (event.type === 'error') {
            errorStatus = event.status;
            throw providerFailure(provider, event);
          }
          if (event.type === 'usage') tokens = event.usage;
        }
        if (encodedFigures.length) {
          latestMeta = {
            removedFigures: encodedFigures.filter((f) => !body.includes(f.id)).map((f) => f.id),
            keptFigures: encodedFigures.filter((f) => body.includes(f.id)).map((f) => f.id),
          };
          options?.onMeta?.(latestMeta);
        }
      }

      const cleaned = normalizeMarkdownForDisplay(body);
      if (!cleaned) {
        throw new Error('Gemini returned empty Markdown. Try again or use the original conversion.');
      }
      valid = true;
      return {
        markdown: cleaned,
        detectedLanguage: latestMeta.detectedLanguage,
        removedFigures: latestMeta.removedFigures,
        keptFigures: latestMeta.keptFigures,
      };
    } catch (err) {
      if (control.signal.aborted) {
        throw new Error('AI restructuring was stopped.');
      }
      throw err;
    } finally {
      activeRequest.current = null;
      setBusy(false);
      const entry: UsageEntry = {
        id: createId(),
        at: Date.now(),
        day: localDay(),
        provider,
        model: geminiModel,
        tokens,
        status: valid ? 'complete' : 'error',
        ...(errorStatus !== undefined ? { errorStatus } : {}),
      };
      const records = mergeUsage(usage, [entry]);
      if (desktopUsage) {
        await desktopUsage.save(records);
        setUsage(records);
      } else {
        setUsage(writeUsage(records));
      }
    }
  }

  return {
    saveWorkspaceFromView: () => currentApp.current.saveWorkspace(),
    async retryWorkspaceSave(id: string) {
      const pending = unsavedResults.current.get(id);
      if (!pending || busy || activeRequest.current) return;
      setBusy(true);
      try {
        await currentApp.current.saveWorkspace();
        unsavedResults.current.delete(id);
        setNotice('');
        setConversations(items => items.map(chat => ({ ...chat, messages: chat.messages.map(message =>
          message.id === id ? { ...message, text: pending.summaries.join('\n'), appliedActions: pending.summaries,
            actionLinks: pending.links, savePending: false } : message) })));
      } catch {
        setNotice('StudyFlow still couldn’t save these changes.');
      } finally { setBusy(false); }
    },
    async applyEdit(message: ChatMessage, selection?: Record<number, string[] | boolean>) {
      const edits = message.pendingEdits?.length ? message.pendingEdits : message.edit ? [message.edit] : [];
      if (!edits.length || busy || activeRequest.current) return;
      setBusy(true);
      setNotice('');
      try {
        const result = await applyWorkspaceEdits(edits, message.id, selection);
        if (result.appliedSummaries.length || unsavedResults.current.has(message.id)) {
          setConversations(items => items.map(chat => {
            const replyIndex = chat.messages.findIndex(item => item.id === message.id);
            if (replyIndex < 1) return chat;
            let userIndex = replyIndex - 1;
            while (userIndex >= 0 && chat.messages[userIndex].role !== 'user') userIndex--;
            return { ...chat, messages: chat.messages.map((item, i) => i === userIndex ? { ...item, writeLocked: true } : item) };
          }));
        }
        if (result.failedSummaries.length > 0) {
          setNotice(result.failedSummaries.join(' '));
        }
        setConversations((items) =>
          items.map((chat) => ({
            ...chat,
            messages: chat.messages.map((item) => {
              if (item.id !== message.id) return item;
              const mergedLinks = [...(item.actionLinks ?? [])];
              for (const link of result.links) {
                if (!mergedLinks.some((existing) => existing.route === link.route)) {
                  mergedLinks.push(link);
                }
              }
              return {
                ...item,
                text: result.temporary ? 'Applied in this temporary preview.' : [...result.appliedSummaries, ...result.failedSummaries].join('\n') || 'No changes selected.',
                appliedActions: [...(item.appliedActions ?? []), ...(result.saved ? result.appliedSummaries : [])],
                actionLinks: mergedLinks,
                savePending: unsavedResults.current.has(message.id),
                edit: undefined,
                pendingEdits: undefined,
                state: 'complete' as const,
              };
            }),
          })),
        );
      } finally {
        setBusy(false);
      }
    },
    cancelEdit(id: string) {
      setConversations((items) =>
        items.map((chat) => ({
          ...chat,
          messages: chat.messages.map((item) =>
            item.id === id
              ? {
                  ...item,
                  text: item.text
                    ? `${item.text}\n\n_Cancelled — no changes were made._`
                    : 'Cancelled — no changes were made.',
                  edit: undefined,
                  pendingEdits: undefined,
                }
              : item,
          ),
        })),
      );
    },
    generate,
    generateStructured,
    generateText,
    restructureMarkdown,
    askPip,
    dashboardOverview,
    dashboardOverviewLoading,
    dashboardOverviewError,
    refreshDashboardOverview,
    available,
    cooldown,
    settings,
    updateSettings,
    usage,
    configured,
    serverStatus,
    geminiHealth,
    online,
    setKey,
    keyStorage,
    keyStorageError,
    model,
    active,
    activeId,
    conversations,
    pipTab,
    setPipTab,
    companionThread,
    companionUnreadCount,
    companionDraft,
    setCompanionDraft,
    companionBusy,
    companionNotice,
    setCompanionNotice,
    companionFailedReply,
    sendCompanionMessage,
    stopCompanion: () => companionRequest.current?.abort(),
    retryCompanionFailedReply,
    editCompanionFailedReply,
    dismissCompanionFailedReply,
    markCompanionThreadRead,
    openCompanionMessage,
    highlightedCompanionMessageId,
    runCompanionOutreachCheck,
    acceptCompanionSuggestion,
    dismissCompanionSuggestion,
    acceptCompanionFollowUpOffer,
    dismissCompanionFollowUpOffer,
    rescheduleCompanionFollowUp,
    cancelCompanionFollowUp,
    switchChat,
    newChat,
    renameChat,
    removeChat,
    petOpen,
    setPetOpen,
    settingsRequested,
    setSettingsRequested,
    openSettings,
    openFullChat: () => app.setRoute('assistant'),
    context,
    includeContext,
    setIncludeContext,
    draft,
    setDraft,
    attachments,
    setAttachments,
    addAttachment: (item: PipAttachment) =>
      setAttachments((current) => {
        if (item.kind === 'image') {
          const withoutPrevImage = current.filter((existing) => existing.kind !== 'image');
          return [...withoutPrevImage, item].slice(0, CHAT_LIMITS.maxDocuments + 1);
        }
        const docs = current.filter((existing) => existing.kind !== 'image');
        if (docs.length >= CHAT_LIMITS.maxDocuments) return current;
        return [...current, item];
      }),
    removeAttachment: (id: string) =>
      setAttachments((current) => current.filter((item) => item.id !== id)),
    clearAttachments: () => setAttachments([]),
    previousAttachments,
    reusePreviousAttachments: () => setAttachments(previousAttachments),
    detail,
    setDetail,
    busy,
    notice,
    setNotice,
    failedAttempts,
    dismissFailedAttempt,
    retryFailedAttempt,
    editFailedAttempt,
    editAndResendMessage,
    regenerateMessage,
    send,
    stop: () => activeRequest.current?.abort(),
  };
}

type UsageEntryStatus = 'complete' | 'stopped' | 'error';
const AssistantContext = createContext<ReturnType<typeof useAssistantController> | null>(null);

export function AssistantProvider({
  children,
  desktopUsage,
  desktopHistory,
}: {
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
