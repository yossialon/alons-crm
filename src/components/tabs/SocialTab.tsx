'use client';
import { useState, useEffect, useCallback } from 'react';
import { SocialConnection, SocialMessage, SocialPlatform } from '@/types';
import {
  getSocialConnections, deleteSocialConnection,
  getSocialMessages, getThreadMessages,
  markThreadRead, replySocialMessage, syncSocial,
} from '@/lib/api';
import {
  MessageCircle, RefreshCw, Send, Trash2, Unlink,
  CheckCircle2, AlertCircle, ExternalLink,
} from 'lucide-react';

// ── Platform config ───────────────────────────────────────────────────────────

const PLATFORMS: {
  id: string;
  platform: SocialPlatform | 'meta';
  label: string;
  color: string;
  bg: string;
  border: string;
  icon: string;
  note: string;
  authPath: string;
}[] = [
  {
    id: 'meta', platform: 'meta', authPath: '/api/social/auth/meta',
    label: 'Facebook Pages', icon: '📘', color: 'text-blue-700',
    bg: 'bg-blue-50', border: 'border-blue-200',
    note: 'Full DMs via Meta Graph API',
  },
  {
    id: 'instagram', platform: 'instagram', authPath: '/api/social/auth/meta',
    label: 'Instagram', icon: '📸', color: 'text-pink-700',
    bg: 'bg-pink-50', border: 'border-pink-200',
    note: 'Connected via same Meta App as Facebook',
  },
  {
    id: 'whatsapp', platform: 'whatsapp', authPath: '/api/social/auth/meta',
    label: 'WhatsApp Business', icon: '💬', color: 'text-emerald-700',
    bg: 'bg-emerald-50', border: 'border-emerald-200',
    note: 'Requires Meta Business Verification',
  },
  {
    id: 'linkedin', platform: 'linkedin', authPath: '/api/social/auth/linkedin',
    label: 'LinkedIn', icon: '💼', color: 'text-sky-700',
    bg: 'bg-sky-50', border: 'border-sky-200',
    note: 'Company page comments (DMs require Partner access)',
  },
  {
    id: 'tiktok', platform: 'tiktok', authPath: '/api/social/auth/tiktok',
    label: 'TikTok', icon: '🎵', color: 'text-slate-700',
    bg: 'bg-slate-50', border: 'border-slate-200',
    note: 'Video comments (DMs not available via public API)',
  },
];

const PLATFORM_ICONS: Record<string, string> = {
  facebook: '📘', instagram: '📸', whatsapp: '💬', linkedin: '💼', tiktok: '🎵',
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000)      return 'now';
  if (diff < 3_600_000)   return `${Math.floor(diff / 60_000)}m`;
  if (diff < 86_400_000)  return `${Math.floor(diff / 3_600_000)}h`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// Group messages into threads (by thread_id), keeping only the latest per thread
function toThreads(messages: SocialMessage[]): SocialMessage[] {
  const map = new Map<string, SocialMessage>();
  for (const m of messages) {
    const existing = map.get(m.thread_id);
    if (!existing || new Date(m.created_at) > new Date(existing.created_at)) {
      map.set(m.thread_id, m);
    }
  }
  return [...map.values()].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

// ── Sub-components ────────────────────────────────────────────────────────────

function PlatformCard({
  config,
  connection,
  onConnect,
  onDisconnect,
}: {
  config: typeof PLATFORMS[0];
  connection?: SocialConnection;
  onConnect: (path: string) => void;
  onDisconnect: (id: string) => void;
}) {
  const isConnected = !!connection;
  const isExpired   = connection?.token_expiry
    ? new Date(connection.token_expiry) < new Date()
    : false;

  return (
    <div className={`rounded-2xl border ${config.border} ${config.bg} p-4`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{config.icon}</span>
          <div>
            <p className={`font-bold text-sm ${config.color}`}>{config.label}</p>
            <p className="text-xs text-slate-500 mt-0.5">{config.note}</p>
          </div>
        </div>
        <div className="shrink-0">
          {isConnected ? (
            <div className="flex items-center gap-2">
              {isExpired ? (
                <span className="flex items-center gap-1 text-xs text-amber-600 font-semibold">
                  <AlertCircle size={12} /> Expired
                </span>
              ) : (
                <span className="flex items-center gap-1 text-xs text-emerald-600 font-semibold">
                  <CheckCircle2 size={12} /> Connected
                </span>
              )}
              <button
                onClick={() => onDisconnect(connection.id)}
                className="flex items-center gap-1 text-xs text-slate-400 hover:text-red-500 transition-colors px-2 py-1 rounded-lg hover:bg-red-50"
              >
                <Unlink size={11} /> Disconnect
              </button>
            </div>
          ) : (
            <button
              onClick={() => onConnect(config.authPath)}
              className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl bg-white border border-slate-200 shadow-sm hover:shadow transition-all"
            >
              <ExternalLink size={11} /> Connect
            </button>
          )}
        </div>
      </div>
      {isConnected && (
        <p className="text-[10px] text-slate-400 mt-2">
          {connection.account_name || connection.page_name || connection.account_id}
          {connection.token_expiry && !isExpired && (
            <> · expires {new Date(connection.token_expiry).toLocaleDateString()}</>
          )}
        </p>
      )}
    </div>
  );
}

function ThreadItem({
  message,
  isActive,
  onClick,
}: {
  message: SocialMessage;
  isActive: boolean;
  onClick: () => void;
}) {
  const unread = !message.read_at;
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-3 border-b border-slate-100 hover:bg-slate-50 transition-colors ${
        isActive ? 'bg-amber-50 border-l-2 border-l-amber-400' : ''
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center text-sm font-bold text-slate-600 shrink-0">
          {(message.sender_name || message.sender_id).charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-0.5">
            <span className={`text-sm truncate ${unread ? 'font-bold text-slate-800' : 'font-medium text-slate-700'}`}>
              {message.sender_name || message.sender_id}
            </span>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-base leading-none">{PLATFORM_ICONS[message.platform] ?? '💬'}</span>
              <span className="text-[10px] text-slate-400">{timeAgo(message.created_at)}</span>
            </div>
          </div>
          <p className={`text-xs truncate ${unread ? 'text-slate-600' : 'text-slate-400'}`}>
            {message.content || '(attachment)'}
          </p>
          {unread && (
            <span className="inline-block mt-1 w-2 h-2 rounded-full bg-amber-400" />
          )}
        </div>
      </div>
    </button>
  );
}

function MessageBubble({ message }: { message: SocialMessage }) {
  const isOutbound = message.direction === 'outbound';
  return (
    <div className={`flex ${isOutbound ? 'justify-end' : 'justify-start'} mb-3`}>
      {!isOutbound && (
        <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600 mr-2 shrink-0 mt-auto">
          {(message.sender_name || message.sender_id).charAt(0).toUpperCase()}
        </div>
      )}
      <div className={`max-w-[70%] ${isOutbound ? 'items-end' : 'items-start'} flex flex-col`}>
        {!isOutbound && (
          <span className="text-[10px] text-slate-400 mb-1 ml-1">{message.sender_name || message.sender_id}</span>
        )}
        <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
          isOutbound
            ? 'bg-amber-600 text-white rounded-br-sm'
            : 'bg-white border border-slate-200 text-slate-800 rounded-bl-sm shadow-sm'
        }`}>
          {message.content || <span className="italic text-sm opacity-60">(attachment)</span>}
        </div>
        <span className="text-[10px] text-slate-400 mt-1 mx-1">{timeAgo(message.created_at)}</span>
      </div>
    </div>
  );
}

// ── Main tab ──────────────────────────────────────────────────────────────────

export default function SocialTab() {
  const [connections,   setConnections]   = useState<SocialConnection[]>([]);
  const [messages,      setMessages]      = useState<SocialMessage[]>([]);
  const [threadMsgs,    setThreadMsgs]    = useState<SocialMessage[]>([]);
  const [activeThread,  setActiveThread]  = useState<string | null>(null);
  const [activePlatform, setActivePlatform] = useState<string>('all');
  const [replyText,     setReplyText]     = useState('');
  const [activeReplyId, setActiveReplyId] = useState<string | null>(null); // id of inbound msg to reply to
  const [loading,       setLoading]       = useState(true);
  const [syncing,       setSyncing]       = useState(false);
  const [sending,       setSending]       = useState(false);
  const [showSetup,     setShowSetup]     = useState(false);
  const [flashMsg,      setFlashMsg]      = useState<string | null>(null);

  const flash = (msg: string) => {
    setFlashMsg(msg);
    setTimeout(() => setFlashMsg(null), 3500);
  };

  const loadConnections = useCallback(async () => {
    try { setConnections((await getSocialConnections()) as SocialConnection[]); } catch {}
  }, []);

  const loadMessages = useCallback(async () => {
    setLoading(true);
    try {
      const data = (await getSocialMessages(activePlatform)) as SocialMessage[];
      setMessages(data);
    } catch {
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, [activePlatform]);

  useEffect(() => { loadConnections(); }, [loadConnections]);
  useEffect(() => { loadMessages(); }, [loadMessages]);

  // Handle OAuth redirect query params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const connected = params.get('social_connected');
    const error     = params.get('social_error');
    if (connected) {
      flash(`✅ ${connected} connected successfully`);
      loadConnections();
      window.history.replaceState({}, '', window.location.pathname);
    } else if (error) {
      flash(`❌ Connection failed: ${decodeURIComponent(error)}`);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [loadConnections]);

  const openThread = async (threadId: string, latestInboundId: string) => {
    setActiveThread(threadId);
    setActiveReplyId(latestInboundId);
    setReplyText('');
    try {
      const data = (await getThreadMessages(threadId)) as SocialMessage[];
      setThreadMsgs(data.reverse()); // oldest first for chat view
      await markThreadRead(threadId);
      setMessages((prev) => prev.map((m) => m.thread_id === threadId ? { ...m, read_at: new Date().toISOString() } : m));
    } catch {}
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const result = await syncSocial() as { synced?: number };
      flash(`Synced ${result.synced ?? 0} new messages`);
      await loadMessages();
    } catch {
      flash('Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  const handleDisconnect = async (id: string) => {
    if (!confirm('Disconnect this account? All cached messages will be removed.')) return;
    try {
      await deleteSocialConnection(id);
      await loadConnections();
      flash('Account disconnected');
    } catch { flash('Failed to disconnect'); }
  };

  const handleSend = async () => {
    if (!replyText.trim() || !activeReplyId || sending) return;
    setSending(true);
    try {
      await replySocialMessage(activeReplyId, replyText.trim());
      setReplyText('');
      // Refresh thread
      if (activeThread) {
        const data = (await getThreadMessages(activeThread)) as SocialMessage[];
        setThreadMsgs(data.reverse());
      }
    } catch { flash('Failed to send reply'); }
    finally { setSending(false); }
  };

  const connectedPlatforms = new Set(connections.map((c) => c.platform));
  const threads = toThreads(messages);
  const unreadCount = threads.filter((t) => !t.read_at).length;

  const platformFilter = [
    { id: 'all', label: 'All', icon: '💬' },
    { id: 'facebook', label: 'Facebook', icon: '📘' },
    { id: 'instagram', label: 'Instagram', icon: '📸' },
    { id: 'whatsapp', label: 'WhatsApp', icon: '💬' },
    { id: 'linkedin', label: 'LinkedIn', icon: '💼' },
    { id: 'tiktok', label: 'TikTok', icon: '🎵' },
  ];

  return (
    <div className="space-y-4">
      {/* Flash message */}
      {flashMsg && (
        <div className="bg-slate-800 text-white text-sm px-4 py-3 rounded-xl shadow-lg">
          {flashMsg}
        </div>
      )}

      {/* Header row */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold text-slate-800">Social Inbox</h2>
          {unreadCount > 0 && (
            <span className="bg-amber-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
              {unreadCount} unread
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSetup((p) => !p)}
            className="text-xs font-semibold px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors"
          >
            {showSetup ? 'Hide Setup' : '⚙ Connections'}
          </button>
          <button
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl bg-brand-700 text-white hover:bg-brand-600 disabled:opacity-50 transition-all"
          >
            <RefreshCw size={12} className={syncing ? 'animate-spin' : ''} />
            {syncing ? 'Syncing…' : 'Sync'}
          </button>
        </div>
      </div>

      {/* Setup panel */}
      {showSetup && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <p className="font-bold text-sm text-slate-800 mb-1">Platform Connections</p>
          <p className="text-xs text-slate-400 mb-4">
            Connect your accounts to receive messages in this unified inbox. Meta credentials go in{' '}
            <code className="bg-slate-100 px-1 rounded">.env.local</code>
          </p>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {PLATFORMS.map((p) => {
              const conn = connections.find((c) => c.platform === p.platform && p.id !== 'instagram' && p.id !== 'whatsapp')
                ?? connections.find((c) => c.platform === p.id as SocialPlatform);
              return (
                <PlatformCard
                  key={p.id}
                  config={p}
                  connection={conn}
                  onConnect={(path) => window.location.href = path}
                  onDisconnect={handleDisconnect}
                />
              );
            })}
          </div>
          <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="text-xs font-bold text-amber-800 mb-1">Required .env.local keys</p>
            <pre className="text-[11px] text-amber-700 leading-relaxed">
{`NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
META_APP_ID=your_meta_app_id
META_APP_SECRET=your_meta_app_secret
META_WEBHOOK_VERIFY_TOKEN=any_random_string
LINKEDIN_CLIENT_ID=your_linkedin_client_id
LINKEDIN_CLIENT_SECRET=your_linkedin_client_secret
TIKTOK_CLIENT_KEY=your_tiktok_client_key
TIKTOK_CLIENT_SECRET=your_tiktok_client_secret`}
            </pre>
            <p className="text-[10px] text-amber-600 mt-2">
              Meta Webhook URL (add in Meta App Dashboard → Webhooks):{' '}
              <code className="bg-amber-100 px-1 rounded">{typeof window !== 'undefined' ? window.location.origin : ''}/api/social/webhooks/meta</code>
            </p>
          </div>
        </div>
      )}

      {/* No connections empty state */}
      {connections.length === 0 && !showSetup && (
        <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 py-16 text-center">
          <div className="text-5xl mb-4">📱</div>
          <p className="font-bold text-base text-slate-700 mb-2">No social accounts connected</p>
          <p className="text-sm text-slate-400 max-w-sm mx-auto mb-6">
            Connect Facebook, Instagram, WhatsApp, LinkedIn, or TikTok to receive messages directly in this inbox.
          </p>
          <button
            onClick={() => setShowSetup(true)}
            className="px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-brand-700 hover:bg-brand-600 transition-all"
          >
            Set Up Connections
          </button>
        </div>
      )}

      {/* Inbox — only show when there are connections */}
      {connections.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Platform filter tabs */}
          <div className="flex gap-0.5 p-2 border-b border-slate-100 overflow-x-auto">
            {platformFilter.map((f) => (
              <button
                key={f.id}
                onClick={() => { setActivePlatform(f.id); setActiveThread(null); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  activePlatform === f.id
                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span>{f.icon}</span>
                <span className="hidden sm:inline">{f.label}</span>
              </button>
            ))}
          </div>

          <div className="flex" style={{ minHeight: '460px', maxHeight: '68vh' }}>
            {/* Thread list */}
            <div className="w-full sm:w-72 shrink-0 border-r border-slate-100 overflow-y-auto">
              {loading ? (
                <div className="p-6 text-center text-sm text-slate-400">Loading…</div>
              ) : threads.length === 0 ? (
                <div className="p-8 text-center">
                  <MessageCircle size={32} className="text-slate-200 mx-auto mb-2" />
                  <p className="text-sm text-slate-400">No messages yet</p>
                  <p className="text-xs text-slate-300 mt-1">Messages arrive via webhooks or sync</p>
                </div>
              ) : (
                threads.map((m) => (
                  <ThreadItem
                    key={m.thread_id}
                    message={m}
                    isActive={activeThread === m.thread_id}
                    onClick={() => openThread(m.thread_id, m.id)}
                  />
                ))
              )}
            </div>

            {/* Conversation pane */}
            <div className="flex-1 flex flex-col min-w-0">
              {!activeThread ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
                  <MessageCircle size={40} className="text-slate-200 mb-3" />
                  <p className="text-sm font-semibold text-slate-600 mb-1">Select a conversation</p>
                  <p className="text-xs text-slate-400">Click any thread on the left to read and reply</p>
                </div>
              ) : (
                <>
                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto px-5 py-4 space-y-1">
                    {threadMsgs.length === 0 ? (
                      <p className="text-sm text-slate-400 text-center py-8">Loading thread…</p>
                    ) : (
                      threadMsgs.map((m) => <MessageBubble key={m.id} message={m} />)
                    )}
                  </div>

                  {/* Reply box */}
                  <div className="border-t border-slate-100 p-4">
                    <div className="flex gap-2">
                      <textarea
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                        placeholder="Write a reply… (Enter to send)"
                        rows={2}
                        className="flex-1 text-sm px-3 py-2 border border-slate-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-amber-300/50 focus:border-amber-400 transition-all"
                      />
                      <button
                        onClick={handleSend}
                        disabled={sending || !replyText.trim()}
                        className="self-end px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white disabled:opacity-40 transition-all flex items-center gap-1.5 text-sm font-semibold"
                      >
                        <Send size={14} />
                        {sending ? 'Sending…' : 'Send'}
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1.5">
                      Replies are sent via the platform API and stored here. LinkedIn/TikTok replies are stored locally only.
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
