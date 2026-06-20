import React, { useState, useRef, useEffect, useCallback } from "react";
import { io } from "socket.io-client";
import { backendUrl } from "../constants";
import { toast } from "react-toastify";

const WA_SVG = (cls = "w-5 h-5") => (
  <svg className={cls} fill="currentColor" viewBox="0 0 24 24">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.02-.956-.263-.089-.454-.134-.644.15-.19.283-.735.956-.9 1.144-.165.188-.331.21-.628.061-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.644-1.554-.882-2.126-.231-.555-.465-.48-.644-.488-.166-.008-.356-.01-.546-.01-.19 0-.5-.072-.761.21-.261.282-1.001.978-1.001 2.388 0 1.41 1.026 2.774 1.17 2.962.143.188 2.019 3.084 4.889 4.326.682.296 1.214.473 1.629.605.685.217 1.307.186 1.802.113.551-.082 1.758-.719 2.007-1.413.25-.694.25-1.289.175-1.413-.075-.124-.271-.197-.568-.346z" />
    <path d="M12.004 0C5.378 0 0 5.378 0 12.004c0 2.112.547 4.178 1.585 6.002L0 24l6.166-1.618a11.94 11.94 0 005.838 1.518c6.626 0 12.004-5.378 12.004-12.004S18.63 0 12.004 0zm0 21.944a9.9 9.9 0 01-5.056-1.388l-.362-.216-3.758.985 1.002-3.663-.238-.378a9.904 9.904 0 01-1.521-5.28c0-5.478 4.456-9.934 9.934-9.934 5.478 0 9.934 4.456 9.934 9.934 0 5.478-4.456 9.934-9.934 9.934z" />
  </svg>
);

const Spinner = ({ cls = "w-5 h-5" }) => (
  <svg className={`animate-spin ${cls}`} fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
  </svg>
);

const timeLabel = (date) =>
  new Date(date).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });

const dayLabel = (date) =>
  new Date(date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });

const WhatsAppChat = ({ token }) => {
  const [conversations, setConversations] = useState([]);
  const [convLoading, setConvLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [selectedMobile, setSelectedMobile] = useState(null);
  const [selectedConv, setSelectedConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [msgLoading, setMsgLoading] = useState(false);

  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  const socketRef = useRef(null);
  const bottomRef = useRef(null);
  const selectedMobileRef = useRef(null);
  selectedMobileRef.current = selectedMobile;

  /* ── Fetch conversation list ──────────────────────────── */
  const loadConversations = useCallback(async () => {
    try {
      const res = await fetch(`${backendUrl}/api/whatsapp/conversations`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) setConversations(data.conversations);
    } catch {
      toast.error("Failed to load conversations");
    } finally {
      setConvLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  /* ── Socket.io — live push for new messages / status updates ── */
  useEffect(() => {
    const socket = io(backendUrl, { transports: ["websocket", "polling"] });
    socketRef.current = socket;

    socket.on("whatsapp:new-message", ({ mobile, message }) => {
      // Keep the open thread in sync
      if (selectedMobileRef.current === mobile) {
        setMessages((prev) =>
          prev.some((m) => m._id === message._id) ? prev : [...prev, message]
        );
      }
      // Refresh the sidebar (unread counts, ordering, last message preview)
      loadConversations();
    });

    socket.on("whatsapp:status-update", ({ waMessageId, status }) => {
      setMessages((prev) =>
        prev.map((m) => (m.waMessageId === waMessageId ? { ...m, status } : m))
      );
    });

    return () => socket.disconnect();
  }, [loadConversations]);

  /* ── Auto-scroll to latest message ────────────────────── */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  /* ── Select a conversation ────────────────────────────── */
  const openConversation = async (mobile) => {
    setSelectedMobile(mobile);
    setMsgLoading(true);
    setMessages([]);
    try {
      const res = await fetch(`${backendUrl}/api/whatsapp/conversations/${mobile}/messages`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setMessages(data.messages);
        setSelectedConv(data.conversation);
      }
      // Mark read — fire and forget
      fetch(`${backendUrl}/api/whatsapp/conversations/${mobile}/read`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      }).then(() =>
        setConversations((prev) =>
          prev.map((c) => (c.mobile === mobile ? { ...c, unreadCount: 0 } : c))
        )
      );
    } catch {
      toast.error("Failed to load messages");
    } finally {
      setMsgLoading(false);
    }
  };

  /* ── Send a reply ──────────────────────────────────────── */
  const handleSend = async () => {
    const body = draft.trim();
    if (!body || !selectedMobile || sending) return;

    setSending(true);
    try {
      const res = await fetch(`${backendUrl}/api/whatsapp/conversations/${selectedMobile}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ body }),
      });
      const data = await res.json();
      if (data.success) {
        setMessages((prev) =>
          prev.some((m) => m._id === data.message._id) ? prev : [...prev, data.message]
        );
        setDraft("");
        loadConversations();
      } else if (data.sessionExpired) {
        toast.error("24-hour reply window has closed. Send a template via Broadcast instead.");
      } else {
        toast.error(data.message || "Failed to send message");
      }
    } catch {
      toast.error("Server error while sending");
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  /* ── Derived state ─────────────────────────────────────── */
  const filteredConversations = conversations.filter(
    (c) =>
      !search ||
      (c.name || "").toLowerCase().includes(search.toLowerCase()) ||
      c.mobile.includes(search)
  );

  const sessionExpiresAt = selectedConv?.sessionExpiresAt
    ? new Date(selectedConv.sessionExpiresAt)
    : null;
  const withinWindow = sessionExpiresAt && sessionExpiresAt > new Date();

  /* ──────────────────────────────────────────────────────── */
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-green-600 flex items-center justify-center flex-shrink-0 text-white">
          {WA_SVG()}
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-800">WhatsApp Chat</h1>
          <p className="text-sm text-slate-500">View customer replies and respond in real time</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden flex h-[calc(100vh-220px)] min-h-[480px]">
        {/* ── Sidebar: conversation list ── */}
        <div className="w-[300px] flex-shrink-0 border-r border-slate-200 flex flex-col">
          <div className="p-3 border-b border-slate-100">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name or mobile..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex-1 overflow-y-auto">
            {convLoading ? (
              <div className="flex items-center justify-center py-10">
                <Spinner cls="w-5 h-5 text-slate-400" />
              </div>
            ) : filteredConversations.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-10 px-4">
                No conversations yet — they'll appear here once a customer replies.
              </p>
            ) : (
              filteredConversations.map((c) => {
                const isActive = c.mobile === selectedMobile;
                return (
                  <button
                    key={c.mobile}
                    onClick={() => openConversation(c.mobile)}
                    className={`w-full flex items-start gap-3 px-4 py-3 text-left border-b border-slate-50 transition-all ${
                      isActive ? "bg-blue-50" : "hover:bg-slate-50"
                    }`}
                  >
                    <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-sm font-bold text-slate-500 flex-shrink-0">
                      {(c.name || c.mobile).charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-slate-700 truncate">
                          {c.name || c.mobile}
                        </p>
                        <span className="text-[10px] text-slate-400 whitespace-nowrap">
                          {c.lastMessageAt ? timeLabel(c.lastMessageAt) : ""}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2 mt-0.5">
                        <p className="text-xs text-slate-400 truncate">
                          {c.lastDirection === "out" ? "You: " : ""}
                          {c.lastMessage || "—"}
                        </p>
                        {c.unreadCount > 0 && (
                          <span className="flex-shrink-0 bg-green-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                            {c.unreadCount > 9 ? "9+" : c.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* ── Thread ── */}
        <div className="flex-1 flex flex-col bg-[#ece5dd]">
          {!selectedMobile ? (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-sm text-slate-500">Select a conversation to view messages</p>
            </div>
          ) : (
            <>
              {/* Thread header */}
              <div className="bg-white border-b border-slate-200 px-5 py-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-sm font-bold text-slate-500">
                  {(selectedConv?.name || selectedMobile).charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-700">
                    {selectedConv?.name || "Customer"}
                  </p>
                  <p className="text-xs text-slate-400 font-mono">{selectedMobile}</p>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2">
                {msgLoading ? (
                  <div className="flex items-center justify-center py-10">
                    <Spinner cls="w-5 h-5 text-slate-400" />
                  </div>
                ) : messages.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-10">No messages yet</p>
                ) : (
                  messages.map((m, i) => {
                    const showDay =
                      i === 0 || dayLabel(m.timestamp) !== dayLabel(messages[i - 1].timestamp);
                    return (
                      <React.Fragment key={m._id || i}>
                        {showDay && (
                          <div className="flex justify-center my-2">
                            <span className="text-[11px] bg-white/70 text-slate-500 px-3 py-1 rounded-full font-medium">
                              {dayLabel(m.timestamp)}
                            </span>
                          </div>
                        )}
                        <div className={`flex ${m.direction === "out" ? "justify-end" : "justify-start"}`}>
                          <div
                            className={`max-w-[65%] rounded-xl px-3 py-2 shadow-sm ${
                              m.direction === "out" ? "bg-[#dcf8c6]" : "bg-white"
                            }`}
                          >
                            <p className="text-[13.5px] text-slate-800 whitespace-pre-wrap break-words">
                              {m.body}
                            </p>
                            <div className="flex items-center justify-end gap-1 mt-1">
                              <span className="text-[10px] text-slate-400">{timeLabel(m.timestamp)}</span>
                              {m.direction === "out" && (
                                <span className="text-[10px] text-slate-400">
                                  {m.status === "read" ? "✓✓" : m.status === "delivered" ? "✓✓" : m.status === "failed" ? "⚠" : "✓"}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </React.Fragment>
                    );
                  })
                )}
                <div ref={bottomRef} />
              </div>

              {/* Session window banner */}
              {!withinWindow && (
                <div className="px-5 py-2 bg-amber-50 border-t border-amber-200 text-amber-700 text-xs flex items-center gap-2">
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  24-hour reply window has closed. Use WhatsApp Broadcast to send a template message instead.
                </div>
              )}

              {/* Composer */}
              <div className="bg-white border-t border-slate-200 p-3 flex items-end gap-2">
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={!withinWindow || sending}
                  rows={1}
                  placeholder={withinWindow ? "Type a message..." : "Reply window closed"}
                  className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 resize-none disabled:opacity-50"
                />
                <button
                  onClick={handleSend}
                  disabled={!withinWindow || sending || !draft.trim()}
                  className="px-4 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl text-sm transition-all flex items-center gap-2"
                >
                  {sending ? <Spinner cls="w-4 h-4" /> : "Send"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default WhatsAppChat;
