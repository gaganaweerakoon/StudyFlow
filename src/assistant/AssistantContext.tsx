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

export interface DesktopUsage {
  records: UsageEntry[];
  save: (records: UsageEntry[]) => Promise<void>;
}

export interface AppliedActionLink {
  route: NavRoute;
  label: string;
}

export interface ChatMessage extends ChatTurn {
  edit?: WorkspaceEdit;
  pendingEdits?: WorkspaceEdit[];
  appliedActions?: string[];
  actionLinks?: AppliedActionLink[];
  id: string;
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
  messages: ChatMessage[];
}

export interface DesktopHistory {
  conversations: Conversation[];
  save: (conversations: Conversation[]) => Promise<void>;
}

const historyKey = 'studyflow.assistant.conversations.v1';
const overviewCacheKey = 'studyflow.assistant.dashboardOverview.v1';
const historyLimit = 20;

function browserHistory(): Conversation[] {
  try {
    const saved = JSON.parse(localStorage.getItem(historyKey) ?? '[]');
    return Array.isArray(saved) ? saved : [];
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
const initial: Conversation = { id: 'first', title: 'New chat', messages: [] };
const createId = () => crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;

function useAssistantController(desktopUsage?: DesktopUsage, desktopHistory?: DesktopHistory) {
  const app = useApp();
  const currentApp = useRef(app);
  currentApp.current = app;
  const cooldowns = useRef<Partial<Record<Provider, number>>>({});
  const [cooldownTick, setCooldownTick] = useState(() => Date.now());
  const [settings, setSettings] = useState(readSettings);
  const [usage, setUsage] = useState(() => mergeUsage(desktopUsage?.records ?? readUsage()));
  const [configured, setConfigured] = useState<Provider[]>([]);
  const [keyStorage, setKeyStorage] = useState<'loading' | 'windows' | 'session'>(() =>
    isTauri() ? 'loading' : 'session',
  );
  const [keyStorageError, setKeyStorageError] = useState('');
  const [conversations, setConversations] = useState(() =>
    [{ ...initial, id: createId() }, ...(desktopHistory?.conversations ?? browserHistory())].slice(0, historyLimit + 1),
  );
  const [activeId, setActiveId] = useState(conversations[0].id);
  const [petOpen, setPetOpen] = useState(false);
  const [settingsRequested, setSettingsRequested] = useState(false);
  const [includeContext, setIncludeContext] = useState(true);
  const [draft, setDraft] = useState('');
  const [attachments, setAttachments] = useState<PipAttachment[]>([]);
  const [previousAttachments, setPreviousAttachments] = useState<PipAttachment[]>([]);
  const [detail, setDetail] = useState<'standard' | 'high'>('standard');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [lastPage, setLastPage] = useState<WorkspacePage>('dashboard');
  const [dashboardOverview, setDashboardOverview] = useState<DashboardAiOverview | null>(readCachedOverview);
  const [dashboardOverviewLoading, setDashboardOverviewLoading] = useState(false);
  const [dashboardOverviewError, setDashboardOverviewError] = useState('');
  const keys = useRef<Partial<Record<Provider, string>>>({});
  const activeRequest = useRef<AbortController | null>(null);
  const pendingAskPrompt = useRef<string | null>(null);

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
        setConfigured((prev) => (prev.includes('gemini') ? prev : [...prev, 'gemini']));
        setSettings((prev) => {
          if (prev.provider !== 'gemini' && !keys.current[prev.provider]) {
            const next = { ...prev, provider: 'gemini' as const };
            writeSettings(next);
            return next;
          }
          return prev;
        });
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
    };
  }, [desktopUsage]);

  useEffect(() => {
    if (busy) return;
    const saved = conversations
      .filter((chat) => chat.messages.length)
      .slice(0, historyLimit)
      .map((chat) => ({
        ...chat,
        // Workspace edit callbacks and images only belong to the current session.
        messages: chat.messages.map(
          ({ edit: _edit, pendingEdits: _pending, generatedImage: _image, ...message }) => ({
            ...message,
            state: message.state === 'streaming' ? ('stopped' as const) : message.state,
          }),
        ),
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
      key ? [...new Set([...items, provider])] : items.filter((item) => item !== provider),
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
    setConversations((chats) => chats.map((chat) => (chat.id === id ? { ...chat, title: name } : chat)));
  }

  function removeChat(id: string) {
    if (busy) return;
    const remaining = conversations.filter((chat) => chat.id !== id);
    const next = remaining.length ? remaining : [{ ...initial, id: createId() }];
    setConversations(next);
    if (activeId === id) switchChat(next[0].id);
  }

  async function applyWorkspaceEdits(edits: WorkspaceEdit[]) {
    const appliedSummaries: string[] = [];
    const failedSummaries: string[] = [];
    const linksMap = new Map<NavRoute, string>();
    try {
      for (const edit of edits) {
        let ok = false;
        flushSync(() => {
          ok = edit.apply(currentApp.current);
        });
        if (ok) {
          appliedSummaries.push(edit.success ?? `Done. ${edit.title}.`);
          if (edit.route && edit.routeLabel && !linksMap.has(edit.route)) {
            linksMap.set(edit.route, edit.routeLabel);
          }
        } else {
          failedSummaries.push(`Could not apply: ${edit.title}`);
        }
      }
      if (appliedSummaries.length > 0) {
        await currentApp.current.saveWorkspace();
      }
      return {
        saved: appliedSummaries.length > 0 && failedSummaries.length === 0,
        appliedSummaries,
        failedSummaries,
        links: Array.from(linksMap.entries()).map(([route, label]) => ({ route, label })),
      };
    } catch {
      return {
        saved: false,
        appliedSummaries,
        failedSummaries: [
          ...failedSummaries,
          appliedSummaries.length > 0
            ? 'Changes are visible in StudyFlow, but saving failed. Use Retry save before closing.'
            : 'StudyFlow could not apply the requested changes.',
        ],
        links: Array.from(linksMap.entries()).map(([route, label]) => ({ route, label })),
      };
    }
  }

  async function send(generateImage = false, overridePrompt?: string) {
    const typed = (overridePrompt ?? draft).trim();
    const currentAttachments = attachments;
    if (cooldownUntil > Date.now()) return;
    if ((!typed && !currentAttachments.length) || activeRequest.current || !available) return;
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
    if (generateImage && (!typed || currentAttachments.length > 0 || provider === 'claude')) return;
    const hasDocs = currentAttachments.some((item) => item.kind !== 'image');
    const prompt = typed || (hasDocs ? documentPrompt : imagePrompt);
    const clock = requestClock(settings.timezone);
    const toolsAllowed = includeContext && !generateImage;
    const attachedImage = currentAttachments.find((item) => item.image)?.image;
    const attachedDocuments: ChatDocument[] = currentAttachments
      .filter((item): item is PipAttachment & { document: ChatDocument } => Boolean(item.document))
      .map((item) => item.document)
      .slice(0, CHAT_LIMITS.maxDocuments);
    const request: ChatRequest = {
      prompt,
      provider,
      model,
      maxOutput: 16384,
      generateImage,
      workspaceActions: toolsAllowed && provider === 'gemini',
      context: toolsAllowed ? workspaceContext(currentApp.current, currentPage, prompt, clock).text : '',
      clientContext: generateImage
        ? undefined
        : `Current local date and time: ${clock.label}. Resolve relative dates and times using this clock. Default response language: ${settings.language ?? 'match the user’s message'}.`,
      image: attachedImage,
      documents: attachedDocuments.length ? attachedDocuments : undefined,
      history: generateImage
        ? []
        : active.messages
            .filter((message) => message.text && (message.role === 'user' || message.state === 'complete'))
            .slice(-CHAT_LIMITS.history)
            .map(({ role, text }) => ({ role, text: text.slice(0, CHAT_LIMITS.historyMessage) })),
    };
    const records = mergeUsage(usage, desktopUsage ? [] : readUsage());
    const control = new AbortController();
    activeRequest.current = control;
    const assistantId = createId();
    const targetChatId = active.id;
    const messageAttachments: ChatMessageAttachmentBadge[] | undefined = currentAttachments.length
      ? currentAttachments.map((item) => ({
          name: item.name,
          kind: item.kind,
          meta: formatAttachmentMeta(item),
        }))
      : undefined;
    const turn: ChatMessage = {
      id: createId(),
      role: 'user',
      text: prompt,
      attachment: currentAttachments[0]?.name,
      attachments: messageAttachments,
    };
    const started = new Date();
    const updateChat = (update: (chat: Conversation) => Conversation) =>
      setConversations((items) => items.map((chat) => (chat.id === targetChatId ? update(chat) : chat)));
    const updateMessage = (update: (message: ChatMessage) => ChatMessage) =>
      updateChat((chat) => ({
        ...chat,
        messages: chat.messages.map((message) => (message.id === assistantId ? update(message) : message)),
      }));

    setBusy(true);
    setNotice('');
    if (!overridePrompt) setDraft('');
    if (currentAttachments.length) setPreviousAttachments(currentAttachments);
    setAttachments([]);
    updateChat((chat) => ({
      ...chat,
      title: chat.messages.length
        ? chat.title
        : (currentAttachments[0] ? `${currentAttachments[0].name} · ${prompt}` : prompt).slice(0, 48),
      messages: [...chat.messages, turn, { id: assistantId, role: 'assistant', text: '', state: 'streaming' }],
    }));

    let responseText = '';
    const actionCalls: string[] = [];
    const seenActions = new Set<string>();
    let proposedEdits: WorkspaceEdit[] | undefined;
    let appliedActions: string[] | undefined;
    let actionLinks: AppliedActionLink[] | undefined;
    let tokens: TokenUsage | undefined;
    let errorMessage: string | undefined;
    let status: UsageEntryStatus = 'error';
    try {
      for await (const event of sendChat(request, key, control.signal)) {
        if (event.type === 'text') {
          responseText += event.text;
          updateMessage((message) => ({ ...message, text: splitWorkspaceResponse(responseText).text }));
        }
        if (event.type === 'action') {
          const serialized = JSON.stringify({ ...event.arguments, action: event.action });
          if (!seenActions.has(serialized)) {
            seenActions.add(serialized);
            actionCalls.push(serialized);
          }
        }
        if (event.type === 'image' && generateImage) {
          responseText = 'Generated image. Download it to keep a copy.';
          updateMessage((message) => ({
            ...message,
            text: responseText,
            generatedImage: { mime: event.mime, base64: event.base64 },
          }));
        }
        if (event.type === 'usage') tokens = event.usage;
        if (event.type === 'retry') setNotice(`Provider unavailable. Retrying in ${event.seconds}s…`);
        if (event.type === 'error') {
          if (event.status === 429 || event.status === 503) {
            setDraft((current) => current || typed);
            setAttachments((current) => (current.length ? current : currentAttachments));
          }
          throw providerFailure(provider, event);
        }
        if (event.type === 'done') {
          status = 'complete';
          setNotice('');
          const { text, commands: legacyCommands } = splitWorkspaceResponse(responseText, true);
          const allRawCommands = actionCalls.length ? actionCalls : legacyCommands;

          if (!allRawCommands.length) {
            updateMessage((message) => ({ ...message, text }));
          } else if (!event.truncated && toolsAllowed) {
            const parsedEdits: WorkspaceEdit[] = [];
            for (const rawCmd of allRawCommands) {
              const parsed = parseWorkspaceEdit(rawCmd, currentApp.current);
              if (parsed) parsedEdits.push(parsed);
            }

            if (!parsedEdits.length) {
              updateMessage((message) => ({
                ...message,
                text: text || 'I couldn’t apply that change automatically. Check the target details and try again.',
              }));
            } else {
              const immediate = parsedEdits.filter((e) => !e.confirmation);
              const confirmRequired = parsedEdits.filter((e) => e.confirmation);

              let finalText = text.trim();
              if (immediate.length > 0) {
                const result = await applyWorkspaceEdits(immediate);
                if (result.appliedSummaries.length > 0) {
                  appliedActions = result.appliedSummaries;
                  actionLinks = result.links;
                }
                if (!finalText) {
                  finalText =
                    result.appliedSummaries.length === 1
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
                  finalText = 'Please review and confirm the requested workspace changes below.';
                }
              }

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
        }
      }
      if (status !== 'complete') setNotice('The connection ended before the assistant finished.');
    } catch (error) {
      if (control.signal.aborted) {
        status = 'stopped';
        setNotice('Reply stopped. The provider may still count part of this request.');
      } else {
        setDraft((current) => current || typed);
        setAttachments((current) => current.length ? current : currentAttachments);
        errorMessage =
          error instanceof Error && !(error instanceof TypeError)
            ? error.message
            : 'Could not reach the local assistant. Check that StudyFlow is running locally.';
        setNotice(errorMessage);
      }
    } finally {
      updateMessage((message) => ({
        ...message,
        tokens,
        errorMessage,
        state: status,
        edit: proposedEdits?.[0],
        pendingEdits: proposedEdits,
        appliedActions,
        actionLinks,
      }));
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

  // Handle queued askPip triggers cleanly once UI switches
  useEffect(() => {
    if (!pendingAskPrompt.current || busy) return;
    const prompt = pendingAskPrompt.current;
    pendingAskPrompt.current = null;
    void send(false, prompt);
  });

  const askPip = useCallback(
    (prompt: string, options?: { openFullPage?: boolean; openFloating?: boolean }) => {
      const clean = prompt.trim();
      if (!clean) return;
      if (options?.openFullPage) {
        setPetOpen(false);
        currentApp.current.setRoute('assistant');
      } else if (options?.openFloating !== false && currentApp.current.route !== 'assistant') {
        setPetOpen(true);
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
    if (!configured.includes(provider) && !keyStorageError) {
      throw new Error('Add your ' + PROVIDERS[provider].label + ' API key in Settings.');
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
          maxOutput: 16384,
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
            maxOutput: 16384,
            clientContext: `Current local date and time: ${clock.label}.`,
          },
          key,
          control.signal,
        )) {
          if (event.type === 'text') {
            body += event.text;
            options?.onStream?.(stripOuterMarkdownFence(body));
          }
          if (event.type === 'error') throw providerFailure(provider, event);
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
    async applyEdit(message: ChatMessage) {
      const edits = message.pendingEdits?.length ? message.pendingEdits : message.edit ? [message.edit] : [];
      if (!edits.length || busy || activeRequest.current) return;
      setBusy(true);
      try {
        const result = await applyWorkspaceEdits(edits);
        setConversations((items) =>
          items.map((chat) => ({
            ...chat,
            messages: chat.messages.map((item) =>
              item.id === message.id
                ? {
                    ...item,
                    text: item.text || result.appliedSummaries.join('\n') || result.failedSummaries.join('\n'),
                    appliedActions: [...(item.appliedActions ?? []), ...result.appliedSummaries],
                    actionLinks: [...(item.actionLinks ?? []), ...result.links],
                    edit: undefined,
                    pendingEdits: undefined,
                    state: result.saved ? 'complete' : 'error',
                  }
                : item,
            ),
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
                  text: item.text ? `${item.text}\n\n_Requested change cancelled._` : 'Change cancelled.',
                  edit: undefined,
                  pendingEdits: undefined,
                }
              : item,
          ),
        })),
      );
    },
    generate,
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
    setKey,
    keyStorage,
    keyStorageError,
    model,
    active,
    activeId,
    conversations,
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
