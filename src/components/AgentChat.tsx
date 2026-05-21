'use client';
import { useState, useRef, useEffect } from 'react';
import { Bot, X, Send, Loader2, ChevronDown } from 'lucide-react';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  ts: number;
}

const STARTERS = [
  'How many leads do we have this week?',
  'What is the system health status?',
  'Which agents ran today?',
  'Show me pending tasks',
];

export default function AgentChat() {
  const [open, setOpen]       = useState(false);
  const [input, setInput]     = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role:    'assistant',
      content: 'שלום! I\'m your Boss Agent 🤖 Ask me anything about your leads, campaigns, system health, or tasks.',
      ts:      Date.now(),
    },
  ]);

  const bottomRef  = useRef<HTMLDivElement>(null);
  const inputRef   = useRef<HTMLInputElement>(null);
  const hasUnread  = useRef(false);
  const [unreadDot, setUnreadDot] = useState(false);

  // Auto-scroll to bottom on new message
  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
      setUnreadDot(false);
      hasUnread.current = false;
    }
  }, [open]);

  const send = async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;
    setInput('');

    const userMsg: ChatMessage = { role: 'user', content: msg, ts: Date.now() };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const history = messages.map(({ role, content }) => ({ role, content }));
      const res = await fetch('/api/agents/boss/chat', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ message: msg, history }),
      });
      const data = await res.json() as { reply?: string; error?: string };
      const reply = data.reply ?? data.error ?? 'Sorry, something went wrong.';

      const botMsg: ChatMessage = { role: 'assistant', content: reply, ts: Date.now() };
      setMessages((prev) => [...prev, botMsg]);

      if (!open) {
        hasUnread.current = true;
        setUnreadDot(true);
      }
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Network error — please try again.', ts: Date.now() }]);
    } finally {
      setLoading(false);
    }
  };

  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-brand-700 text-white shadow-2xl flex items-center justify-center hover:scale-105 transition-transform"
        aria-label="Open Boss Agent chat"
      >
        {open ? <X size={22} /> : <Bot size={22} />}
        {!open && unreadDot && (
          <span className="absolute top-1 right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white" />
        )}
      </button>

      {/* Chat Panel */}
      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-80 sm:w-96 flex flex-col bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
             style={{ maxHeight: '70vh' }}>
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-amber-500 to-brand-700 text-white">
            <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
              <Bot size={17} />
            </div>
            <div className="flex-1">
              <div className="text-sm font-bold">Boss Agent</div>
              <div className="text-[10px] opacity-80">AI Business Assistant</div>
            </div>
            <button onClick={() => setOpen(false)} className="p-1 rounded hover:bg-white/10 transition-colors">
              <ChevronDown size={16} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 min-h-0" style={{ maxHeight: '45vh' }}>
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'assistant' && (
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-amber-400 to-brand-700 flex items-center justify-center text-white shrink-0 mt-0.5 mr-1.5">
                    <Bot size={12} />
                  </div>
                )}
                <div className={`max-w-[78%] px-3 py-2 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                  msg.role === 'user'
                    ? 'bg-brand-700 text-white rounded-br-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-bl-sm'
                }`}>
                  {msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-amber-400 to-brand-700 flex items-center justify-center text-white shrink-0 mt-0.5 mr-1.5">
                  <Bot size={12} />
                </div>
                <div className="bg-slate-100 dark:bg-slate-800 rounded-2xl rounded-bl-sm px-3 py-2">
                  <Loader2 size={14} className="text-slate-400 animate-spin" />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Starter prompts (only before user sends anything) */}
          {messages.length === 1 && (
            <div className="px-3 pb-2 flex flex-wrap gap-1.5">
              {STARTERS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="text-[11px] px-2.5 py-1 rounded-full border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="flex items-center gap-2 px-3 py-2.5 border-t border-slate-100 dark:border-slate-800">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKey}
              placeholder="Ask anything…"
              disabled={loading}
              className="flex-1 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-brand-700/30 disabled:opacity-50"
            />
            <button
              onClick={() => send()}
              disabled={!input.trim() || loading}
              className="p-2 rounded-xl bg-brand-700 text-white hover:bg-brand-600 disabled:opacity-40 transition-colors"
            >
              <Send size={14} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
