'use client';

import { useState, useEffect, useCallback } from 'react';
import { MessageSquare, Instagram, Megaphone, RefreshCw, Flame, UserPlus, Send, Sparkles, Circle, CheckCheck } from 'lucide-react';

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

export default function SocialTab() {
  const [subTab, setSubTab] = useState<'whatsapp' | 'instagram' | 'adleads'>('whatsapp');
  const [messages, setMessages] = useState<SocialMessage[]>([]);
  const [adLeads, setAdLeads] = useState<AdLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('all');
  const [activeThread, setActiveThread] = useState<string | null>(null);
  const [threadMessages, setThreadMessages] = useState<SocialMessage[]>([]);
  const [threadLoading, setThreadLoading] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [suggesting, setSuggesting] = useState(false);
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [msgRes, adRes] = await Promise.all([
      fetch('/api/social/messages?platform=all'),
      fetch('/api/social/ad-leads'),
    ]);
    const [msgData, adData] = await Promise.all([msgRes.json(), adRes.json()]);
    setMessages(Array.isArray(msgData) ? (msgData as SocialMessage[]) : []);
    setAdLeads(Array.isArray(adData) ? (adData as AdLead[]) : []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Load full thread (inbound + outbound) when a thread is expanded
  const openThread = useCallback(async (threadId: string) => {
    if (activeThread === threadId) {
      setActiveThread(null);
      setThreadMessages([]);
      return;
    }
    setActiveThread(threadId);
    setThreadMessages([]);
    setReplyText('');
    setThreadLoading(true);
    try {
      const res = await fetch(`/api/social/messages?thread_id=${encodeURIComponent(threadId)}`);
      const data = await res.json() as SocialMessage[];
      setThreadMessages(Array.isArray(data) ? data : []);
      // Mark thread as read
      fetch('/api/social/messages', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ thread_id: threadId }),
      }).catch(() => {});
    } catch {
      setThreadMessages([]);
    }
    setThreadLoading(false);
  }, [activeThread]);

  // Group inbound messages into thread previews
  const platformMessages = messages.filter(m =>
    subTab === 'whatsapp' ? m.platform === 'whatsapp' : m.platform === 'instagram'
  );

  const threadMap = new Map<string, Thread>();
  platformMessages.forEach(m => {
    const existing = threadMap.get(m.thread_id);
    if (!existing) {
      threadMap.set(m.thread_id, {
        thread_id: m.thread_id,
        sender_name: m.sender_name,
        sender_phone: m.sender_phone,
        last_message: m.message,
        last_time: m.created_at,
        unread: m.is_read ? 0 : 1,
        is_hot: m.is_hot,
        lead_id: m.lead_id,
        messages: [m],
      });
    } else {
      existing.messages.push(m);
      if (new Date(m.created_at) > new Date(existing.last_time)) {
        existing.last_message = m.message;
        existing.last_time = m.created_at;
      }
      if (!m.is_read) existing.unread++;
      if (m.is_hot) existing.is_hot = true;
      if (m.lead_id) existing.lead_id = m.lead_id;
    }
  });

  let threads = Array.from(threadMap.values()).sort(
    (a, b) => new Date(b.last_time).getTime() - new Date(a.last_time).getTime()
  );

  if (filter === 'unread') threads = threads.filter(t => t.unread > 0);
  if (filter === 'hot') threads = threads.filter(t => t.is_hot);

  const waUnread = messages.filter(m => m.platform === 'whatsapp' && !m.is_read).length;
  const hotCount = messages.filter(m => m.is_hot && !m.is_read).length;
  const activeThreadData = threads.find(t => t.thread_id === activeThread);

  const suggestReply = async () => {
    if (!activeThreadData) return;
    setSuggesting(true);
    const lastInbound = [...(threadMessages.length ? threadMessages : activeThreadData.messages)]
      .reverse()
      .find(m => m.direction === 'inbound');
    const res = await fetch('/api/social/suggest-reply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        channel: subTab === 'whatsapp' ? 'whatsapp' : 'instagram',
        senderName: activeThreadData.sender_name,
        messageText: lastInbound?.message ?? '',
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
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: activeThreadData.sender_phone || activeThreadData.thread_id, message: replyText }),
    }).catch(() => {});
    setReplyText('');
    setSending(false);
    // Reload full thread after sending
    if (activeThread) {
      const res = await fetch(`/api/social/messages?thread_id=${encodeURIComponent(activeThread)}`);
      const data = await res.json() as SocialMessage[];
      setThreadMessages(Array.isArray(data) ? data : []);
    }
    load();
  };

  const importAsLead = async (thread: Thread) => {
    await fetch('/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: thread.sender_name,
        phone: thread.sender_phone ?? '',
        source: subTab === 'whatsapp' ? 'WhatsApp Inbound' : 'Instagram DM',
        status: 'new',
        type: 'Homeowner',
        area: 'South Florida',
      }),
    });
    load();
  };

  const displayMessages = threadMessages.length ? threadMessages : (activeThreadData?.messages ?? []);

  return (
    <div className="space-y-4">
      {/* Sub-tabs */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex border-b border-slate-100">
          {[
            { id: 'whatsapp' as const, label: 'WhatsApp', icon: MessageSquare, badge: waUnread },
            { id: 'instagram' as const, label: 'Instagram', icon: Instagram },
            { id: 'adleads' as const, label: 'Ad Leads', icon: Megaphone, badge: adLeads.length },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => { setSubTab(t.id); setActiveThread(null); setThreadMessages([]); }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-semibold transition-colors relative ${subTab === t.id ? 'text-brand-700 border-b-2 border-brand-700 bg-brand-50/50' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <t.icon size={14} />
              {t.label}
              {!!t.badge && t.badge > 0 && (
                <span className="absolute top-1.5 right-2 bg-red-500 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                  {t.badge > 9 ? '9+' : t.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Filter bar */}
        {subTab !== 'adleads' && (
          <div className="flex gap-1 px-3 py-2 border-b border-slate-50">
            {(['all', 'unread', 'hot'] as FilterType[]).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${filter === f ? 'bg-brand-700 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
              >
                {f === 'hot' ? (
                  <span className="flex items-center gap-1">
                    <Flame size={10} className="text-red-400" />
                    Hot{hotCount > 0 && ` (${hotCount})`}
                  </span>
                ) : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
            <button onClick={load} className="ml-auto text-slate-400 hover:text-slate-600">
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        )}
      </div>

      {/* Ad Leads sub-tab */}
      {subTab === 'adleads' && (
        <div className="space-y-3">
          {loading && <div className="text-center text-slate-400 py-8 text-sm">Loading…</div>}
          {!loading && adLeads.length === 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-400">
              <Megaphone size={32} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium">No ad leads yet</p>
              <p className="text-xs mt-1">Leads from Facebook/Instagram ads will appear here</p>
            </div>
          )}
          {adLeads.map(al => (
            <div key={al.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-slate-800 text-sm">{al.leads?.name ?? 'Unknown'}</p>
                  {al.ad_name && <p className="text-xs text-slate-500 mt-0.5">📢 {al.ad_name}</p>}
                  {al.campaign_name && <p className="text-xs text-slate-400">🎯 {al.campaign_name}</p>}
                </div>
                <div className="text-right">
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">In CRM</span>
                  <p className="text-xs text-slate-400 mt-1">{new Date(al.created_at).toLocaleDateString()}</p>
                </div>
              </div>
              {al.leads && (
                <div className="flex gap-3 mt-2 text-xs text-slate-500">
                  {al.leads.phone && <span>📞 {al.leads.phone}</span>}
                  {al.leads.email && <span>✉️ {al.leads.email}</span>}
                  <span className="ml-auto capitalize px-2 py-0.5 bg-slate-100 rounded-full">{al.leads.status}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* WhatsApp / Instagram threads */}
      {subTab !== 'adleads' && (
        <>
          {loading && <div className="text-center text-slate-400 py-8 text-sm">Loading…</div>}
          {!loading && threads.length === 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-400">
              <MessageSquare size={32} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium">No {subTab === 'whatsapp' ? 'WhatsApp' : 'Instagram'} messages yet</p>
              <p className="text-xs mt-1">Messages will appear here when customers reach out</p>
            </div>
          )}
          <div className="space-y-2">
            {threads.map(thread => (
              <div key={thread.thread_id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                {/* Thread header */}
                <button
                  className="w-full flex items-center gap-3 p-4 text-left hover:bg-slate-50 transition-colors"
                  onClick={() => openThread(thread.thread_id)}
                >
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-bold text-sm shrink-0 relative">
                    {thread.sender_name.charAt(0).toUpperCase()}
                    {thread.is_hot && (
                      <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                        <Flame size={9} className="text-white" />
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-slate-800 truncate">{thread.sender_name}</span>
                      {thread.lead_id && (
                        <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-medium shrink-0">In CRM</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 truncate mt-0.5">{thread.last_message}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-slate-400">
                      {formatTime(thread.last_time)}
                    </p>
                    {thread.unread > 0 ? (
                      <span className="inline-flex items-center justify-center w-5 h-5 bg-brand-700 text-white text-[10px] font-bold rounded-full mt-1">
                        {thread.unread > 9 ? '9+' : thread.unread}
                      </span>
                    ) : (
                      <CheckCheck size={13} className="text-slate-300 mt-1 ml-auto" />
                    )}
                  </div>
                </button>

                {/* Expanded conversation */}
                {activeThread === thread.thread_id && (
                  <div className="border-t border-slate-100">
                    {/* Messages */}
                    <div className="p-3 space-y-2 max-h-72 overflow-y-auto bg-slate-50/50">
                      {threadLoading && (
                        <p className="text-center text-xs text-slate-400 py-4">Loading conversation…</p>
                      )}
                      {!threadLoading && [...displayMessages]
                        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
                        .map(msg => (
                          <div key={msg.id} className={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm ${
                              msg.direction === 'outbound'
                                ? 'bg-brand-700 text-white rounded-tr-sm'
                                : 'bg-white border border-slate-200 text-slate-700 rounded-tl-sm'
                            }`}>
                              {msg.message}
                              {msg.is_hot && <span className="ml-1 text-xs">🔥</span>}
                              <p className={`text-[10px] mt-1 ${msg.direction === 'outbound' ? 'text-white/60' : 'text-slate-400'}`}>
                                {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                          </div>
                        ))}
                    </div>

                    {/* Actions */}
                    <div className="p-3 border-t border-slate-100 space-y-2">
                      {!thread.lead_id && (
                        <button
                          onClick={() => importAsLead(thread)}
                          className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-green-50 text-green-700 text-xs font-semibold border border-green-200 hover:bg-green-100 transition-colors"
                        >
                          <UserPlus size={13} /> Import as Lead
                        </button>
                      )}
                      <div className="flex gap-2">
                        <textarea
                          value={replyText}
                          onChange={e => setReplyText(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendReply(); }
                          }}
                          placeholder="Type a reply… (Enter to send)"
                          rows={2}
                          className="flex-1 text-sm border border-slate-200 rounded-xl px-3 py-2 resize-none focus:outline-none focus:border-brand-700"
                        />
                        <div className="flex flex-col gap-1.5">
                          <button
                            onClick={suggestReply}
                            disabled={suggesting}
                            className="p-2 rounded-xl bg-purple-50 text-purple-600 hover:bg-purple-100 transition-colors"
                            title="Suggest reply with AI"
                          >
                            {suggesting ? <Circle size={14} className="animate-pulse" /> : <Sparkles size={14} />}
                          </button>
                          <button
                            onClick={sendReply}
                            disabled={sending || !replyText.trim()}
                            className="p-2 rounded-xl bg-brand-700 text-white hover:bg-brand-800 transition-colors disabled:opacity-50"
                            title="Send reply"
                          >
                            <Send size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffH = (now.getTime() - d.getTime()) / 3600000;
  if (diffH < 24) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (diffH < 48 * 24) return d.toLocaleDateString([], { weekday: 'short' });
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}
