import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Paperclip,
  Copy,
  RefreshCw,
  Plus,
  BookOpen,
  CalendarRange,
  FileText,
  Layers,
  ClipboardCheck,
  AlertCircle,
  Repeat,
  BarChart3,
  MessageSquare,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { AiToolId } from '../../types/studyflow';

const AI_TOOLS: {
  id: AiToolId;
  label: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
  samplePrompt: string;
  simulatedResponse: { content: string; equation?: string };
}[] = [
  {
    id: 'chat',
    label: 'Study Chat',
    desc: 'Conversational Q&A with course context',
    icon: MessageSquare,
    samplePrompt: 'Explain how to choose between kinetic and thermodynamic enolates.',
    simulatedResponse: {
      content: `### Kinetic vs Thermodynamic Enolate Selection
- **Kinetic enolate**: Use **LDA** in **THF at −78 °C**. Steric bulk removes the least hindered α-proton irreversibly.
- **Thermodynamic enolate**: Use **NaOEt in EtOH at 25 °C**. Reversible protonation allows equilibration to the more substituted, more stable alkene.`,
    },
  },
  {
    id: 'explain',
    label: 'Explain a Concept',
    desc: 'Intuitive intuition, formal definitions & examples',
    icon: BookOpen,
    samplePrompt: 'Explain the intuition behind Max-Flow Min-Cut duality.',
    simulatedResponse: {
      content: `### Max-Flow Min-Cut Intuition
1. **Bottleneck bound**: No matter how you route flow from $s$ to $t$, every unit must cross any partition $(S, T)$ separating $s$ from $t$. Thus $|f| \\le c(S, T)$.
2. **Tightness at termination**: When Ford-Fulkerson stops, no augmenting path exists in the residual graph $G_f$. Letting $S$ be all vertices still reachable from $s$ in $G_f$ forces every forward edge leaving $S$ to be saturated and every backward edge entering $S$ to carry zero flow.`,
      equation: 'max |f| = min c(S, T)  over all s–t cuts (S, T)',
    },
  },
  {
    id: 'study_plan',
    label: 'Generate Study Plan',
    desc: 'Exam-backward schedule aligned to your workload',
    icon: CalendarRange,
    samplePrompt: 'Build a 7-day study plan leading into MATH 241 Midterm III.',
    simulatedResponse: {
      content: `### 7-Day MATH 241 Midterm III Plan (Nov 22 – Nov 28)
- **Sun Nov 22**: 90m Stokes' Theorem curl-flux drills (Stewart 16.8 #1–12)
- **Mon Nov 23**: 75m Gauss Divergence Theorem closed-surface problems
- **Tue Nov 24**: 60m Jacobian spherical/cylindrical coordinate review
- **Wed Nov 25**: 90m Timed Practice Midterm A (closed-notes)
- **Thu Nov 26**: 45m Error log review + targeted orientation flashcards
- **Fri Nov 27**: 90m Timed Practice Midterm B + theorem sheet consolidation
- **Sat Nov 28**: 30m Light recall & early rest`,
    },
  },
  {
    id: 'summarize',
    label: 'Summarize Notes',
    desc: 'Distill lecture notes into exam-ready cheat sheets',
    icon: FileText,
    samplePrompt: 'Summarize my CS 340 NP-Completeness note into 4 exam rules.',
    simulatedResponse: {
      content: `### Executive Summary — NP-Completeness Proof Template
1. **Verify $B \\in \\text{NP}$**: Describe a polynomial-size certificate and a polynomial-time checker.
2. **Pick a known NP-complete source $A$**: Usually 3-SAT, Independent Set, or Vertex Cover.
3. **Construct reduction $f: A \\le_p B$**: Prove construction runs in polynomial time.
4. **Prove biconditional**: Show $x \\in A \\iff f(x) \\in B$ in both directions.`,
    },
  },
  {
    id: 'flashcards',
    label: 'Generate Flashcards',
    desc: 'Extract active-recall Q&A cards from topics',
    icon: Layers,
    samplePrompt: 'Generate 3 high-yield flashcards on Hippocampal LTP.',
    simulatedResponse: {
      content: `### Generated Active-Recall Cards (NEUR 302)
- **Card 1 — Q:** Which extracellular ion physically blocks the NMDA channel pore at resting membrane potential?  
  **A:** $\\text{Mg}^{2+}$ (expelled upon postsynaptic AMPA-mediated depolarization).
- **Card 2 — Q:** What kinase links high $\\text{Ca}^{2+}$ influx to AMPA receptor insertion during early LTP?  
  **A:** CaMKII (Calcium/calmodulin-dependent protein kinase II).
- **Card 3 — Q:** Contrast $\\text{Ca}^{2+}$ dynamics triggering LTP vs LTD.  
  **A:** Rapid, high-amplitude $\\text{Ca}^{2+}$ triggers LTP; modest, prolonged $\\text{Ca}^{2+}$ activates calcineurin causing LTD.`,
    },
  },
  {
    id: 'quiz',
    label: 'Create Practice Quiz',
    desc: 'Custom MCQ & proof check questions by topic',
    icon: ClipboardCheck,
    samplePrompt: 'Draft a 2-question diagnostic quiz on Robinson Annulation.',
    simulatedResponse: {
      content: `### Diagnostic Quiz — CHEM 210 Carbonyl Condensations
1. **Question 1 (MCQ):** Which two reactions occur sequentially in a Robinson Annulation?  
   *A) Friedel-Crafts + Claisen* · **B) Michael Addition + Intramolecular Aldol** · *C) Wittig + Diels-Alder*
2. **Question 2 (Short Answer):** What ring size is formed in the classic cyclohexenone Robinson Annulation product?  
   *Expected answer:* 6-membered ring.`,
    },
  },
  {
    id: 'weak_topics',
    label: 'Identify Weak Topics',
    desc: 'Scan confidence ratings & quiz misses',
    icon: AlertCircle,
    samplePrompt: 'Identify my top 3 weak topics across all Fall courses.',
    simulatedResponse: {
      content: `### Priority Weak-Topic Radar
1. **CS 340 — Polynomial-Time Reductions (Confidence 2/5)**: Last quiz missed reduction direction; schedule 90m gadget drills.
2. **CHEM 210 — Claisen & Robinson Annulation (Confidence 2/5)**: Only 64% exam readiness; 22 flashcards pending.
3. **MATH 241 — Gauss Divergence Theorem (Confidence 2/5)**: Not yet started in syllabus; exam is 7 days away.`,
    },
  },
  {
    id: 'revision',
    label: 'Suggest Revision Schedule',
    desc: 'Optimize spaced repetition cadence before finals',
    icon: Repeat,
    samplePrompt: 'Suggest an optimal spaced-repetition cadence for my 4 finals.',
    simulatedResponse: {
      content: `### Recommended Spaced-Repetition Cadence
- **Days −14 to −8**: 25 min/day clearing due cards across CHEM 210 and CS 340.
- **Days −7 to −3**: Shift to 40 min/day interleaved recall mixing Vector Calculus identities and NP reductions.
- **Days −2 to −1**: Review only cards with ease factor < 2.2 ("Hard" / "Again" bucket).`,
    },
  },
  {
    id: 'analyze',
    label: 'Analyze Study Performance',
    desc: 'Correlate focus blocks with exam score gains',
    icon: BarChart3,
    samplePrompt: 'Analyze my study performance trends for November.',
    simulatedResponse: {
      content: `### November Performance Analysis
- **Adherence**: 94.2% planned-to-actual ratio (+4.1% over October).
- **Optimal Block Length**: Sessions between 45–50 minutes deliver a 92% average focus rating vs 78% for sessions > 85 minutes.
- **Projected Exam Impact**: Sustaining 30h/wk keeps MATH 241 and CS 340 comfortably in the **A (92%+)** trajectory.`,
    },
  },
];

export const AiAssistantView: React.FC = () => {
  const { conversations, setConversations, subjects, notes, pushToast } = useApp();

  const [activeConvId, setActiveConvId] = useState<string>(conversations[0]?.id ?? '');
  const [activeTool, setActiveTool] = useState<AiToolId>('chat');
  const [contextSubjectId, setContextSubjectId] = useState<string>('cs340');
  const [attachedNoteId, setAttachedNoteId] = useState<string>('');
  const [inputText, setInputText] = useState('');
  const [streamingText, setStreamingText] = useState<string | null>(null);
  const streamTimerRef = useRef<number | null>(null);

  const activeConv = conversations.find((c) => c.id === activeConvId) ?? conversations[0];
  const toolDef = AI_TOOLS.find((t) => t.id === activeTool) ?? AI_TOOLS[0];

  useEffect(() => {
    return () => {
      if (streamTimerRef.current) window.clearInterval(streamTimerRef.current);
    };
  }, []);

  const sendMessage = (promptOverride?: string, toolOverride?: AiToolId) => {
    const chosenTool = AI_TOOLS.find((t) => t.id === (toolOverride ?? activeTool)) ?? toolDef;
    const text = (promptOverride ?? inputText).trim();
    if (!text || streamingText !== null || !activeConv) return;

    const attachedNote = notes.find((n) => n.id === attachedNoteId);
    const userMsg = {
      id: `msg-${Date.now()}`,
      role: 'user' as const,
      content: text,
      timestamp: 'Just now',
      attachmentName: attachedNote?.title,
    };

    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeConv.id
          ? { ...c, updatedAt: 'Just now', messages: [...c.messages, userMsg] }
          : c
      )
    );
    setInputText('');

    const fullReply = chosenTool.simulatedResponse.content;
    const equation = chosenTool.simulatedResponse.equation;
    let cursor = 0;
    setStreamingText('');

    streamTimerRef.current = window.setInterval(() => {
      cursor += 18;
      if (cursor >= fullReply.length) {
        if (streamTimerRef.current) window.clearInterval(streamTimerRef.current);
        streamTimerRef.current = null;
        setStreamingText(null);
        setConversations((prev) =>
          prev.map((c) =>
            c.id === activeConv.id
              ? {
                  ...c,
                  messages: [
                    ...c.messages,
                    {
                      id: `msg-${Date.now()}-ai`,
                      role: 'assistant',
                      content: fullReply,
                      equation,
                      timestamp: 'Just now',
                    },
                  ],
                }
              : c
          )
        );
      } else {
        setStreamingText(fullReply.slice(0, cursor));
      }
    }, 22);
  };

  const handleNewConversation = () => {
    const id = `conv-${Date.now()}`;
    const sub = subjects.find((s) => s.id === contextSubjectId);
    setConversations((prev) => [
      {
        id,
        title: `${sub?.code ?? 'Study'} Session`,
        subjectId: contextSubjectId,
        updatedAt: 'Just now',
        messages: [],
      },
      ...prev,
    ]);
    setActiveConvId(id);
  };

  const renderMarkdownBlock = (content: string) => {
    return content.split('\n').map((line, i) => {
      if (line.startsWith('### ')) {
        return (
          <h3 key={i} className="font-display text-[14px] font-semibold text-[var(--text-primary)] mt-2 mb-1">
            {line.replace('### ', '')}
          </h3>
        );
      }
      if (line.startsWith('- ') || /^\d+\.\s/.test(line)) {
        const clean = line.replace(/^-\s/, '').replace(/^\d+\.\s/, '');
        const parts = clean.split(/(\*\*[^*]+\*\*)/g);
        return (
          <div key={i} className="pl-3 flex gap-2 text-[13px] leading-relaxed my-0.5">
            <span className="text-[var(--accent)]">•</span>
            <span>
              {parts.map((part, idx) =>
                part.startsWith('**') && part.endsWith('**') ? (
                  <strong key={idx} className="font-semibold text-[var(--text-primary)]">
                    {part.slice(2, -2)}
                  </strong>
                ) : (
                  part
                )
              )}
            </span>
          </div>
        );
      }
      if (!line.trim()) return <div key={i} className="h-1.5" />;
      const parts = line.split(/(\*\*[^*]+\*\*)/g);
      return (
        <p key={i} className="text-[13px] leading-relaxed">
          {parts.map((part, idx) =>
            part.startsWith('**') && part.endsWith('**') ? (
              <strong key={idx} className="font-semibold text-[var(--text-primary)]">
                {part.slice(2, -2)}
              </strong>
            ) : (
              part
            )
          )}
        </p>
      );
    });
  };

  return (
    <div
      className="rounded-xl overflow-hidden flex flex-col lg:flex-row h-[calc(100vh-88px)] min-h-[600px]"
      style={{
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--border-subtle)',
      }}
    >
      {/* Left Sidebar: Conversations + Dedicated AI Tools */}
      <div
        className="w-full lg:w-68 shrink-0 flex flex-col max-h-64 lg:max-h-none"
        style={{
          backgroundColor: 'var(--bg-sidebar)',
          borderRight: '1px solid var(--border-subtle)',
        }}
      >
        <div className="p-3 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <span className="font-display text-[14.5px] font-semibold text-[var(--text-primary)]">
            AI Study Assistant
          </span>
          <button
            type="button"
            onClick={handleNewConversation}
            aria-label="New conversation"
            className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11.5px] font-medium"
            style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' }}
          >
            <Plus className="w-3 h-3" /> New
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2.5 space-y-4">
          {/* Study Tools List */}
          <div>
            <div className="px-2 pb-1.5 text-[11px] font-medium text-[var(--text-muted)]">
              Dedicated Study Tools
            </div>
            <div className="space-y-0.5">
              {AI_TOOLS.map((tool) => {
                const Icon = tool.icon;
                const active = activeTool === tool.id;
                return (
                  <button
                    key={tool.id}
                    type="button"
                    onClick={() => setActiveTool(tool.id)}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-[12.5px] text-left transition-colors"
                    style={{
                      backgroundColor: active ? 'var(--accent-soft)' : 'transparent',
                      color: active ? 'var(--accent)' : 'var(--text-secondary)',
                    }}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate font-medium">{tool.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Conversation History */}
          <div className="pt-2" style={{ borderTop: '1px solid var(--border-subtle)' }}>
            <div className="px-2 pb-1.5 text-[11px] font-medium text-[var(--text-muted)]">
              Recent Conversations
            </div>
            <div className="space-y-0.5">
              {conversations.map((conv) => (
                <button
                  key={conv.id}
                  type="button"
                  onClick={() => setActiveConvId(conv.id)}
                  className="w-full px-2 py-1.5 rounded-lg text-left hover:bg-[var(--bg-surface-hover)] transition-colors"
                  style={{
                    backgroundColor: activeConv?.id === conv.id ? 'var(--bg-surface)' : 'transparent',
                  }}
                >
                  <div className="text-[12px] font-medium text-[var(--text-primary)] truncate">
                    {conv.title}
                  </div>
                  <div className="text-[11px] text-[var(--text-muted)]">{conv.updatedAt}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Chat & Tool Workspace */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Context Selector Bar */}
        <div
          className="px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 shrink-0"
          style={{ borderBottom: '1px solid var(--border-subtle)' }}
        >
          <div>
            <div className="text-[13.5px] font-semibold text-[var(--text-primary)]">
              {toolDef.label}
            </div>
            <div className="text-[11.5px] text-[var(--text-muted)]">{toolDef.desc}</div>
          </div>

          <div className="flex items-center gap-2">
            <select
              aria-label="Select course context"
              value={contextSubjectId}
              onChange={(e) => setContextSubjectId(e.target.value)}
              className="h-8 px-2.5 rounded-lg text-[12px]"
              style={{
                backgroundColor: 'var(--bg-surface-subtle)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-primary)',
              }}
            >
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>Context: {s.code}</option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => sendMessage(toolDef.samplePrompt, toolDef.id)}
              disabled={streamingText !== null}
              className="h-8 px-3 rounded-lg text-[12px] font-medium whitespace-nowrap disabled:opacity-50"
              style={{ backgroundColor: 'var(--accent-soft)', color: 'var(--accent)' }}
            >
              Run {toolDef.label}
            </button>
          </div>
        </div>

        {/* Messages Stream */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {activeConv && activeConv.messages.length === 0 && streamingText === null && (
            <div className="py-8 max-w-lg mx-auto text-center space-y-4">
              <h2 className="font-display text-[17px] font-semibold text-[var(--text-primary)]">
                How can StudyFlow help with {subjects.find((s) => s.id === contextSubjectId)?.code}?
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-left">
                {AI_TOOLS.slice(1, 5).map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      setActiveTool(t.id);
                      sendMessage(t.samplePrompt, t.id);
                    }}
                    className="p-3 rounded-xl text-[12px] hover:border-[var(--border-strong)] transition-colors"
                    style={{ backgroundColor: 'var(--bg-surface-subtle)', border: '1px solid var(--border-subtle)' }}
                  >
                    <div className="font-semibold text-[var(--text-primary)]">{t.label}</div>
                    <div className="text-[var(--text-muted)] mt-0.5 line-clamp-2">{t.samplePrompt}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {activeConv?.messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className="max-w-[85%] rounded-2xl px-4 py-3 space-y-2"
                style={
                  msg.role === 'user'
                    ? { backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' }
                    : {
                        backgroundColor: 'var(--bg-surface-subtle)',
                        border: '1px solid var(--border-subtle)',
                        color: 'var(--text-secondary)',
                      }
                }
              >
                {msg.attachmentName && (
                  <div className="text-[11px] opacity-80 flex items-center gap-1">
                    <Paperclip className="w-3 h-3" /> Attached: {msg.attachmentName}
                  </div>
                )}

                {msg.role === 'user' ? (
                  <p className="text-[13.5px] leading-relaxed">{msg.content}</p>
                ) : (
                  <div>{renderMarkdownBlock(msg.content)}</div>
                )}

                {msg.equation && (
                  <div
                    className="px-3.5 py-2.5 rounded-lg font-mono text-[12.5px] text-center overflow-x-auto"
                    style={{
                      backgroundColor: 'var(--bg-surface)',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--text-primary)',
                    }}
                  >
                    {msg.equation}
                  </div>
                )}

                <div className="flex items-center justify-between gap-4 pt-1 text-[10.5px] opacity-75">
                  <span>{msg.timestamp}</span>
                  {msg.role === 'assistant' && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard?.writeText(msg.content).catch(() => {});
                          pushToast('Response copied to clipboard');
                        }}
                        aria-label="Copy response"
                        className="inline-flex items-center gap-1 hover:opacity-100"
                      >
                        <Copy className="w-3 h-3" /> Copy
                      </button>
                      <button
                        type="button"
                        onClick={() => sendMessage(toolDef.samplePrompt, activeTool)}
                        aria-label="Regenerate response"
                        className="inline-flex items-center gap-1 hover:opacity-100"
                      >
                        <RefreshCw className="w-3 h-3" /> Regenerate
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}

          {/* Streaming Response Animation */}
          {streamingText !== null && (
            <div className="flex justify-start">
              <div
                className="max-w-[85%] rounded-2xl px-4 py-3 space-y-1"
                style={{
                  backgroundColor: 'var(--bg-surface-subtle)',
                  border: '1px solid var(--accent-border)',
                  color: 'var(--text-secondary)',
                }}
              >
                {renderMarkdownBlock(streamingText)}
                <span className="inline-block w-1.5 h-3.5 align-middle animate-pulse" style={{ backgroundColor: 'var(--accent)' }} />
              </div>
            </div>
          )}
        </div>

        {/* Suggested Prompts + Input Composer */}
        <div className="p-3.5 space-y-2.5 shrink-0" style={{ borderTop: '1px solid var(--border-subtle)' }}>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
            {['Explain Stokes orientation trick', 'Build 7-day exam plan', 'Find my weak topics'].map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => sendMessage(prompt)}
                className="px-2.5 py-1 rounded-lg text-[11.5px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] whitespace-nowrap shrink-0"
                style={{ backgroundColor: 'var(--bg-surface-subtle)', border: '1px solid var(--border-subtle)' }}
              >
                {prompt}
              </button>
            ))}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage();
            }}
            className="flex items-center gap-2"
          >
            <select
              aria-label="Attach study note"
              value={attachedNoteId}
              onChange={(e) => setAttachedNoteId(e.target.value)}
              className="h-9 px-2 rounded-lg text-[12px] max-w-[140px]"
              style={{
                backgroundColor: 'var(--bg-surface-subtle)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-secondary)',
              }}
            >
              <option value="">Attach note...</option>
              {notes.map((n) => (
                <option key={n.id} value={n.id}>{n.title}</option>
              ))}
            </select>

            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={`Ask ${toolDef.label} anything about your courses...`}
              aria-label="Ask AI Study Assistant"
              className="flex-1 h-9 px-3 rounded-lg text-[13px]"
              style={{
                backgroundColor: 'var(--bg-surface-subtle)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-primary)',
              }}
            />

            <button
              type="submit"
              disabled={!inputText.trim() || streamingText !== null}
              aria-label="Send message"
              className="h-9 px-3.5 rounded-lg inline-flex items-center gap-1.5 text-[12.5px] font-medium disabled:opacity-45"
              style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' }}
            >
              <Send className="w-3.5 h-3.5" /> Send
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
