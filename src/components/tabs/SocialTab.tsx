'use client';
import { useState, useEffect, useCallback } from 'react';
import {
  MessageSquare, Instagram, Megaphone,
  RefreshCw, Flame, UserPlus, Send, Sparkles, Circle,
} from 'lucide-react';
import { ThreadItem, MessageBubble } from '@/components/ui/Primitives';

/* ── Local types ───────────────────────────────────────────────────────────── */

type SocialMessage = {
  id: string;
  platform: string;
  thread_id: string;
  sender_name: string;
  sender_phone?: string;
  message: string;
  direction: 'inbound' | 'outbound';
  is_read: boolean;
  is_hot: boolean;
  lead_id?: string;
  created_at: string;
};

type AdLead = {
  id: string;
  lead_id: string;
  platform: string;
  ad_name?: string;
  campaign_name?: string;
  created_at: string;
  leads?: { name: string; phone?: string; email?: string; status: string };
};

type Thread = {
  thread_id: string;
  sender_name: string;
  sender_phone?: string;
  last_message: string;
  last_time: string;
  unread: number;
  is_hot: boolean;
  lead_id?: string;
  messages: SocialMessage[];
};

type FilterType = 'all' | 'unread' | 'hot';

/* ── Helpers ───────────────────────────────────────────────────────────────── */

function formatTime(iso: string): string {
  const d    = new Date(iso);
  const diffH = (Date.now() - d.getTime()) / 3_600_000;
  if (diffH < 24)      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (diffH < 48 * 24) return d.toLocaleDateString([], { weekday: 'short' });
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

/* ── Main component ────────────────────────────────────────────────────────── */

export default function SocialTab() {
  const [subTab,         setSubTab]         = useState<'whatsapp' | 'instagram' | 'adleads'>('whatsapp');
  const [messages,       setMessages]       = useState<SocialMessage[]>([]);
  const [adLeads,        setAdLeads]        = useState<AdLead[]>([]);
  const [loading,        setLoading]        = useState(true);
  const [filter,         setFilter]         = useState<FilterType>('all');
  const [activeThread,   setActiveThread]   = useState<string | null>(null);
  const [threadMessages, setThreadMessages] = useState<SocialMessage[]>([]);
  const [threadLoading,  setThreadLoading]  = useState(false);
  const [replyText,      setReplyText]      = useState('');
  const [suggesting,     setSuggesting]     = useState(false);
  const [sending,        setSending]        = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [msgRes, adRes] = await Promise.all([
      fetch('/api/social/messages?platform=all'),
      fetch('/api/social/ad-leads'),
    ]);
    const [msgData, adData] = await Promise.all([msgRes.json(), adRes.json()]);
    setMessages(Array.isArray(msgData) ? (msgData as SocialMessage[]) : []);
    setAdLeads(Array.isArray(adData)   ? (adData  as AdLead[])        : []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const openThread = useCallback(async (threadId: string) => {
    if (activeThread === threadId) { setActiveThread(null); setThreadMessages([]); return; }
    setActiveThread(threadId);
    setThreadMessages([]);
    setReplyText('');
    setThreadLoading(true);
    try {
      const res  = await fetch(`/api/social/messages?thread_id=${encodeURIComponent(threadId)}`);
      const data = await res.json() as SocialMessage[];
      setThreadMessages(Array.isArray(data) ? data : []);
      fetch('/api/social/messages', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ thread_id: threadId }),
      }).catch(() => {});
    } catch { setThreadMessages([]); }
    setThreadLoading(false);
  }, [activeThread]);

  // Build thread list from flat messages
  const platformMessages = messages.filter((m) =>
    subTab === 'whatsapp' ? m.platform === 'whatsapp' : m.platform === 'instagram'
  );
  const threadMap = new Map<string, Thread>();
  platformMessages.forEach((m) => {
    const ex = threadMap.get(m.thread_id);
    if (!ex) {
      threadMap.set(m.thread_id, {
        thread_id: m.thread_id, sender_name: m.sender_name, sender_phone: m.sender_phone,
        last_message: m.message, last_time: m.created_at,
        unread: m.is_read ? 0 : 1, is_hot: m.is_hot, lead_id: m.lead_id, messages: [m],
      });
    } else {
      ex.messages.push(m);
      if (new Date(m.created_at) > new Date(ex.last_time)) { ex.last_message = m.message; ex.last_time = m.created_at; }
      if (!m.is_read) ex.unread++;
      if (m.is_hot) ex.is_hot = true;
      if (m.lead_id) ex.lead_id = m.lead_id;
    }
  });
  let threads = Array.from(threadMap.values()).sort(
    (a, b) => new Date(b.last_time).getTime() - new Date(a.last_time).getTime()
  );
  if (filter === 'unread') threads = threads.filter((t) => t.unread > 0);
  if (filter === 'hot')    threads = threads.filter((t) => t.is_hot);

  const waUnread         = messages.filter((m) => m.platform === 'whatsapp' && !m.is_read).length;
  const hotCount         = messages.filter((m) => m.is_hot && !m.is_read).length;
  const activeThreadData = threads.find((t) => t.thread_id === activeThread);
  const displayMessages  = threadMessages.length ? threadMessages : (activeThreadData?.messages ?? []);

  const suggestReply = async () => {
    if (!activeThreadData) return;
    setSuggesting(true);
    const lastIn = [...displayMessages].reverse().find((m) => m.direction === 'inbound');
    const res    = await fetch('/api/social/suggest-reply', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        channel:        subTab === 'whatsapp' ? 'whatsapp' : 'instagram',
        senderName:     activeThreadData.sender_name,
        messageText:    lastIn?.message ?? '',
        isExistingLead: !!activeThreadData.lead_id,
      }),
    });
    const { reply } = await res.json() as { reply: string };
    setReplyText(reply);
    setSuggesting(false);
  };

  const sendReply = async () => {
    if (!replyText.trim() || !activeThreadData) return;
    setSending(true);
    const endpoint = subTab === 'whatsapp' ? '/api/outreach/whatsapp-send' : '/api/social/instagram-send';
    await fetch(endpoint, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ to: activeThreadData.sender_phone || activeThreadData.thread_id, message: replyText }),
    }).catch(() => {});
    setReplyText('');
    setSending(false);
    if (activeThread) {
      const res  = await fetch(`/api/social/messages?thread_id=${encodeURIComponent(activeThread)}`);
      const data = await res.json() as SocialMessage[];
      setThreadMessages(Array.isArray(data) ? data : []);
    }
    load();
  };

  const importAsLead = async (thread: Thread) => {
    await fetch('/api/leads', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        name:   thread.sender_name,
        phone:  thread.sender_phone ?? '',
        source: subTab === 'whatsapp' ? 'WhatsApp Inbound' : 'Instagram DM',
        status: 'new', type: 'Homeowner', area: 'South Florida',
      }),
    });
    load();
  };

  /* ── render ── */
  return (
    <div className="p-4 sm:p-6 animate-fade-in">
      <div className="flex flex-col lg:flex-row gap-4 h-full">

        {/* ── Left column: thread list ──────────────────────────────────── */}
        <div className="lg:w-[300px] shrink-0 card overflow-hidden flex flex-col">

          {/* Sub-tab bar */}
          <div className="flex border-b border-zinc-100 dark:border-zinc-800">
            {([
              { id: 'whatsapp'  as const, label: 'WhatsApp',  icon: MessageSquare, badge: waUnread       },
              { id: 'instagram' as const, label: 'Instagram', icon: Instagram,     badge: 0              },
              { id: 'adleads'   as const, label: 'Ad Leads',  icon: Megaphone,     badge: adLeads.length },
            ]).map((t) => (
              <button
                key={t.id}
                onClick={() => { setSubTab(t.id); setActiveThread(null); setThreadMessages([]); }}
                className={`flex-1 flex items-center justify-center gap-1 py-3 text-xs font-semibold transition-colors relative ${
                  subTab === t.id
                    ? 'text-brand-700 dark:text-brand-400 border-b-2 border-brand bg-brand-50/50 dark:bg-brand-950/20'
                    : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'
                }`}
              >
                <t.icon size={13} />
                {t.label}
                {t.badge > 0 && (
                  <span className="absolute top-1.5 right-1 bg-coral text-white text-[8px] font-bold rounded-full w-3.5 h-3.5 flex items-center justify-center">
                    {t.badge > 9 ? '9+' : t.badge}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Filter pills */}
          {subTab !== 'adleads' && (
            <div className="flex gap-1.5 px-3 py-2 border-b border-zinc-50 dark:border-zinc-800">
              {(['all', 'unread', 'hot'] as FilterType[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${
                    filter === f
                      ? 'bg-brand text-white'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                  }`}
                >
                  {f === 'hot' ? (
                    <span className="flex items-center gap-1">
                      <Flame size={9} className="text-coral" />
                      Hot{hotCount > 0 && ` (${hotCount})`}
                    </span>
                  ) : f === 'unread' ? `Unread${waUnread > 0 ? ` (${waUnread})` : ''}` : 'All'}
                </button>
              ))}
              <button
                onClick={load}
                className="ml-auto text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
              >
                <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
              </button>
            </div>
          )}

          {/* Thread list */}
          <div className="flex-1 overflow-y-auto">
            {loading && (
              <p className="text-center text-muted py-8 text-sm">Loading…</p>
            )}

            {/* Ad Leads */}
            {!loading && subTab === 'adleads' && adLeads.length === 0 && (
              <div className="p-8 text-center text-muted">
                <Megaphone size={28} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm font-medium">No ad leads yet</p>
                <p className="text-xs mt-1">Leads from Facebook/Instagram ads will appear here</p>
              </div>
            )}
            {!loading && subTab === 'adleads' && adLeads.map((al) => (
              <div key={al.id} className="px-4 py-3 border-b border-zinc-100 dark:border-zinc-800">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-zinc-800 dark:text-zinc-100 text-xs truncate">{al.leads?.name ?? 'Unknown'}</p>
                    {al.ad_name && <p className="text-[11px] text-muted mt-0.5">📢 {al.ad_name}</p>}
                    {al.campaign_name && <p className="text-[11px] text-hint">🎯 {al.campaign_name}</p>}
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[10px] bg-brand-50 dark:bg-brand-950/40 text-brand-700 dark:text-brand-400 px-1.5 py-0.5 rounded-full font-medium">In CRM</span>
                    <p className="text-[10px] text-hint mt-1">{new Date(al.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
            ))}

            {/* WhatsApp / Instagram */}
            {!loading && subTab !== 'adleads' && threads.length === 0 && (
              <div className="p-8 text-center text-muted">
                <MessageSquare size={28} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm font-medium">No messages yet</p>
                <p className="text-xs mt-1">Messages will appear here when customers reach out</p>
              </div>
            )}
            {!loading && subTab !== 'adleads' && threads.map((thread) => (
              <ThreadItem
                key={thread.thread_id}
                name={thread.sender_name}
                preview={thread.last_message}
                time={formatTime(thread.last_time)}
                unread={thread.unread}
                isHot={thread.is_hot}
                platform={subTab}
                active={activeThread === thread.thread_id}
                onClick={() => openThread(thread.thread_id)}
              />
            ))}
          </div>
        </div>

        {/* ── Right column: conversation panel ─────────────────────────── */}
        {activeThread && activeThreadData ? (
          <div className="flex-1 card overflow-hidden flex flex-col">
            {/* Conversation header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-brand-100 dark:bg-brand-900/40 flex items-center justify-center text-brand-700 dark:text-brand-400 font-bold text-xs">
                  {activeThreadData.sender_name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                    {activeThreadData.sender_name}
                    {activeThreadData.is_hot && <span className="ml-1 text-coral">🔥</span>}
                  </p>
                  {activeThreadData.lead_id && (
                    <span className="text-[10px] bg-brand-50 dark:bg-brand-950/40 text-brand-700 dark:text-brand-400 px-1.5 py-0.5 rounded-full font-medium">
                      In CRM
                    </span>
                  )}
                </div>
              </div>

              {!activeThreadData.lead_id && (
                <button
                  onClick={() => importAsLead(activeThreadData)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] bg-brand-50 dark:bg-brand-950/40 text-brand-700 dark:text-brand-400 text-xs font-semibold border border-brand-200 dark:border-brand-800 hover:bg-brand-100 dark:hover:bg-brand-900/40 transition-colors"
                >
                  <UserPlus size={12} /> Import Lead
                </button>
              )}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 bg-zinc-50/50 dark:bg-zinc-950/30">
              {threadLoading && (
                <p className="text-center text-muted text-xs py-6">Loading conversation…</p>
              )}
              {!threadLoading && [...displayMessages]
                .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
                .map((msg) => (
                  <MessageBubble
                    key={msg.id}
                    text={msg.message + (msg.is_hot ? ' 🔥' : '')}
                    time={new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    direction={msg.direction}
                    senderName={msg.direction === 'inbound' ? msg.sender_name : undefined}
                    isRead={msg.is_read}
                  />
                ))}
            </div>

            {/* Reply composer */}
            <div className="px-4 py-3 border-t border-zinc-100 dark:border-zinc-800 space-y-2">
              <div className="flex gap-2">
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendReply(); } }}
                  placeholder="Type a reply… (Enter to send)"
                  rows={2}
                  className="input flex-1 resize-none text-xs"
                />
                <div className="flex flex-col gap-1.5">
                  <button
                    onClick={suggestReply}
                    disabled={suggesting}
                    className="p-2 rounded-[8px] bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-colors"
                    title="Suggest reply with AI"
                  >
                    {suggesting ? <Circle size={14} className="animate-pulse" /> : <Sparkles size={14} />}
                  </button>
                  <button
                    onClick={sendReply}
                    disabled={sending || !replyText.trim()}
                    className="p-2 rounded-[8px] bg-brand text-white hover:bg-brand-700 transition-colors disabled:opacity-50"
                    title="Send reply"
                  >
                    <Send size={14} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Empty state when no thread selected */
          subTab !== 'adleads' && (
            <div className="flex-1 card flex flex-col items-center justify-center py-16 text-center text-muted">
              <MessageSquare size={32} className="opacity-20 mb-3" />
              <p className="text-sm font-medium">Select a conversation</p>
              <p className="text-xs mt-1">Click a thread on the left to open it</p>
            </div>
          )
        )}
      </div>
    </div>
  );
}
