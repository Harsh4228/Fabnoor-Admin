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

// Tick icon for message status
const StatusTick = ({ status }) => {
  if (status === "read") {
    return <span style={{ color: "#53bdeb", fontSize: 11 }}>✓✓</span>;
  }
  if (status === "delivered") {
    return <span style={{ color: "#8696a0", fontSize: 11 }}>✓✓</span>;
  }
  if (status === "sent") {
    return <span style={{ color: "#8696a0", fontSize: 11 }}>✓</span>;
  }
  if (status === "failed") {
    return <span style={{ color: "#f00", fontSize: 11 }}>⚠</span>;
  }
  return <span style={{ color: "#8696a0", fontSize: 11 }}>✓</span>;
};

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

  /* ── Socket.io ── */
  useEffect(() => {
    const socket = io(backendUrl, { transports: ["websocket", "polling"] });
    socketRef.current = socket;

    socket.on("whatsapp:new-message", ({ mobile, message }) => {
      if (selectedMobileRef.current === mobile) {
        setMessages((prev) =>
          prev.some((m) => m._id === message._id) ? prev : [...prev, message]
        );
      }
      loadConversations();
    });

    socket.on("whatsapp:status-update", ({ waMessageId, status }) => {
      setMessages((prev) =>
        prev.map((m) => (m.waMessageId === waMessageId ? { ...m, status } : m))
      );
    });

    return () => socket.disconnect();
  }, [loadConversations]);

  /* ── Auto-scroll ── */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  /* ── Open conversation ── */
  const openConversation = async (mobile) => {
    setSelectedMobile(mobile);
    setMsgLoading(true);
    setMessages([]);
    try {
      const res = await fetch(
        `${backendUrl}/api/whatsapp/conversations/${mobile}/messages`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();
      if (data.success) {
        setMessages(data.messages);
        setSelectedConv(data.conversation);
      }
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

  /* ── Send ── */
  const handleSend = async () => {
    const body = draft.trim();
    if (!body || !selectedMobile || sending) return;
    setSending(true);
    try {
      const res = await fetch(
        `${backendUrl}/api/whatsapp/conversations/${selectedMobile}/send`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ body }),
        }
      );
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

  /* ── Derived ── */
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

  /* ─────────────────────────────────────────────────────────────────────
     LAYOUT STRATEGY
     ─ The admin layout has: top navbar ~64px + left sidebar ~220px
     ─ The page content area is the remaining space
     ─ We use fixed pixel offsets via inline style so the chat always
       fills exactly the visible area regardless of parent CSS
  ──────────────────────────────────────────────────────────────────── */

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "calc(100vh - 64px)", // subtract top navbar height
        overflow: "hidden",
      }}
    >
      {/* ── Page header (hidden on mobile when chat is open) ── */}
      <div
        style={{
          display: selectedMobile ? undefined : "flex",
          alignItems: "center",
          gap: 12,
          padding: "0 0 12px 0",
          flexShrink: 0,
        }}
        className={selectedMobile ? "hidden md:flex" : ""}
      >
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            background: "#16a34a",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            flexShrink: 0,
          }}
        >
          {WA_SVG("w-5 h-5")}
        </div>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: "#1e293b", margin: 0 }}>
            WhatsApp Chat
          </h1>
          <p style={{ fontSize: 13, color: "#64748b", margin: 0 }}>
            View customer replies and respond in real time
          </p>
        </div>
      </div>

      {/* ── Main chat panel ── */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          borderRadius: 16,
          border: "1px solid #e2e8f0",
          overflow: "hidden",
          background: "#fff",
        }}
      >
        {/* ════════════════════════════════
            SIDEBAR — conversation list
        ════════════════════════════════ */}
        <div
          style={{
            width: 300,
            minWidth: 300,
            flexShrink: 0,
            borderRight: "1px solid #e2e8f0",
            display: "flex",
            flexDirection: "column",
            minHeight: 0,
          }}
          className={selectedMobile ? "hidden md:flex" : ""}
        // On mobile: show sidebar only when no conversation selected
        >
          {/* Search */}
          <div style={{ padding: "10px 12px", borderBottom: "1px solid #f1f5f9", flexShrink: 0 }}>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name or mobile..."
              style={{
                width: "100%",
                padding: "8px 12px",
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: 8,
                fontSize: 13,
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>

          {/* List */}
          <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
            {convLoading ? (
              <div style={{ display: "flex", justifyContent: "center", padding: 40 }}>
                <Spinner cls="w-5 h-5 text-slate-400" />
              </div>
            ) : filteredConversations.length === 0 ? (
              <p style={{ textAlign: "center", color: "#94a3b8", fontSize: 13, padding: "40px 16px" }}>
                No conversations yet — they'll appear here once a customer replies.
              </p>
            ) : (
              filteredConversations.map((c) => {
                const isActive = c.mobile === selectedMobile;
                return (
                  <button
                    key={c.mobile}
                    onClick={() => openConversation(c.mobile)}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 10,
                      padding: "12px 16px",
                      textAlign: "left",
                      borderBottom: "1px solid #f8fafc",
                      background: isActive ? "#eff6ff" : "transparent",
                      cursor: "pointer",
                      border: "none",
                      borderBottom: "1px solid #f1f5f9",
                      transition: "background 0.15s",
                    }}
                    onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = "#f8fafc"; }}
                    onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
                  >
                    {/* Avatar */}
                    <div style={{
                      width: 40,
                      height: 40,
                      borderRadius: "50%",
                      background: "#e2e8f0",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 15,
                      fontWeight: 700,
                      color: "#475569",
                      flexShrink: 0,
                    }}>
                      {(c.name || c.mobile).charAt(0).toUpperCase()}
                    </div>

                    {/* Info */}
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6 }}>
                        <span style={{
                          fontSize: 14,
                          fontWeight: 600,
                          color: "#334155",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          flex: 1,
                        }}>
                          {c.name || c.mobile}
                        </span>
                        <span style={{ fontSize: 11, color: "#94a3b8", whiteSpace: "nowrap", flexShrink: 0 }}>
                          {c.lastMessageAt ? timeLabel(c.lastMessageAt) : ""}
                        </span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 2 }}>
                        <span style={{
                          fontSize: 12,
                          color: "#94a3b8",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          flex: 1,
                        }}>
                          {c.lastDirection === "out" ? "You: " : ""}
                          {c.lastMessage || "—"}
                        </span>
                        {c.unreadCount > 0 && (
                          <span style={{
                            flexShrink: 0,
                            background: "#22c55e",
                            color: "#fff",
                            fontSize: 11,
                            fontWeight: 700,
                            borderRadius: "50%",
                            width: 20,
                            height: 20,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            marginLeft: 6,
                          }}>
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

        {/* ════════════════════════════════
            THREAD — message view
        ════════════════════════════════ */}
        <div
          style={{
            flex: 1,
            minWidth: 0,
            display: selectedMobile ? "flex" : "none",
            flexDirection: "column",
            minHeight: 0,
            background: "#ece5dd",
          }}
          // show thread on desktop always
          className="md:!flex"
        >
          {!selectedMobile ? (
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <p style={{ fontSize: 14, color: "#64748b" }}>Select a conversation to view messages</p>
            </div>
          ) : (
            <>
              {/* ── Thread header ── */}
              <div style={{
                background: "#fff",
                borderBottom: "1px solid #e2e8f0",
                padding: "10px 16px",
                display: "flex",
                alignItems: "center",
                gap: 10,
                flexShrink: 0,
              }}>
                {/* Back button — mobile only */}
                <button
                  onClick={() => { setSelectedMobile(null); setSelectedConv(null); setMessages([]); }}
                  className="md:hidden"
                  style={{
                    padding: 4,
                    marginLeft: -4,
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "#64748b",
                    display: "flex",
                    alignItems: "center",
                  }}
                  aria-label="Back"
                >
                  <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.3} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>

                {/* Avatar */}
                <div style={{
                  width: 38,
                  height: 38,
                  borderRadius: "50%",
                  background: "#e2e8f0",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 14,
                  fontWeight: 700,
                  color: "#475569",
                  flexShrink: 0,
                }}>
                  {(selectedConv?.name || selectedMobile).charAt(0).toUpperCase()}
                </div>

                {/* Name + number */}
                <div style={{ minWidth: 0, flex: 1 }}>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#1e293b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {selectedConv?.name || "Customer"}
                  </p>
                  <p style={{ margin: 0, fontSize: 12, color: "#94a3b8", fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {selectedMobile}
                  </p>
                </div>

                {/* WA icon */}
                <div style={{ color: "#16a34a", flexShrink: 0 }}>
                  {WA_SVG("w-5 h-5")}
                </div>
              </div>

              {/* ── Messages ── */}
              <div
                style={{
                  flex: 1,
                  overflowY: "auto",
                  minHeight: 0,
                  padding: "12px 20px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 2,
                }}
              >
                {msgLoading ? (
                  <div style={{ display: "flex", justifyContent: "center", padding: 40 }}>
                    <Spinner cls="w-5 h-5 text-slate-400" />
                  </div>
                ) : messages.length === 0 ? (
                  <p style={{ textAlign: "center", color: "#94a3b8", fontSize: 13, marginTop: 40 }}>
                    No messages yet
                  </p>
                ) : (
                  messages.map((m, i) => {
                    const showDay =
                      i === 0 ||
                      dayLabel(m.timestamp) !== dayLabel(messages[i - 1].timestamp);
                    const isOut = m.direction === "out";

                    return (
                      <React.Fragment key={m._id || i}>
                        {showDay && (
                          <div style={{ display: "flex", justifyContent: "center", margin: "8px 0" }}>
                            <span style={{
                              fontSize: 12,
                              background: "rgba(255,255,255,0.75)",
                              color: "#475569",
                              padding: "3px 12px",
                              borderRadius: 999,
                              fontWeight: 500,
                            }}>
                              {dayLabel(m.timestamp)}
                            </span>
                          </div>
                        )}

                        <div style={{
                          display: "flex",
                          justifyContent: isOut ? "flex-end" : "flex-start",
                          marginBottom: 2,
                        }}>
                          <div style={{
                            maxWidth: "65%",
                            background: isOut ? "#dcf8c6" : "#fff",
                            borderRadius: isOut ? "12px 12px 4px 12px" : "12px 12px 12px 4px",
                            padding: "7px 12px 5px",
                            boxShadow: "0 1px 2px rgba(0,0,0,0.1)",
                            wordBreak: "break-word",
                          }}>
                            <p style={{
                              margin: 0,
                              fontSize: 13.5,
                              color: "#1e293b",
                              lineHeight: 1.45,
                              whiteSpace: "pre-wrap",
                            }}>
                              {m.body}
                            </p>
                            <div style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "flex-end",
                              gap: 3,
                              marginTop: 3,
                            }}>
                              <span style={{ fontSize: 11, color: "#8696a0" }}>
                                {timeLabel(m.timestamp)}
                              </span>
                              {isOut && <StatusTick status={m.status} />}
                            </div>
                          </div>
                        </div>
                      </React.Fragment>
                    );
                  })
                )}
                <div ref={bottomRef} />
              </div>

              {/* ── Session expired banner ── */}
              {!withinWindow && (
                <div style={{
                  padding: "8px 20px",
                  background: "#fffbeb",
                  borderTop: "1px solid #fde68a",
                  color: "#b45309",
                  fontSize: 12,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  flexShrink: 0,
                }}>
                  <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  24-hour reply window has closed. Use WhatsApp Broadcast to send a template message instead.
                </div>
              )}

              {/* ── Composer ── */}
              <div style={{
                background: "#f0f2f5",
                borderTop: "1px solid #e2e8f0",
                padding: "10px 16px",
                display: "flex",
                alignItems: "flex-end",
                gap: 10,
                flexShrink: 0,
              }}>
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={!withinWindow || sending}
                  rows={1}
                  placeholder={withinWindow ? "Type a message..." : "Reply window closed — use Broadcast to send a template"}
                  style={{
                    flex: 1,
                    minWidth: 0,
                    padding: "10px 14px",
                    background: "#fff",
                    border: "1px solid #e2e8f0",
                    borderRadius: 24,
                    fontSize: 13.5,
                    color: "#1e293b",
                    outline: "none",
                    resize: "none",
                    lineHeight: 1.4,
                    opacity: (!withinWindow || sending) ? 0.6 : 1,
                    fontFamily: "inherit",
                  }}
                />
                <button
                  onClick={handleSend}
                  disabled={!withinWindow || sending || !draft.trim()}
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: "50%",
                    background: (!withinWindow || sending || !draft.trim()) ? "#94a3b8" : "#16a34a",
                    border: "none",
                    cursor: (!withinWindow || sending || !draft.trim()) ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    transition: "background 0.2s",
                  }}
                  aria-label="Send"
                >
                  {sending ? (
                    <Spinner cls="w-4 h-4" />
                  ) : (
                    <svg width="20" height="20" fill="none" stroke="#fff" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  )}
                </button>
              </div>
            </>
          )}
        </div>

        {/* Desktop: show placeholder when no convo selected */}
        {!selectedMobile && (
          <div
            className="hidden md:flex"
            style={{
              flex: 1,
              alignItems: "center",
              justifyContent: "center",
              background: "#ece5dd",
              flexDirection: "column",
              gap: 12,
            }}
          >
            <div style={{ color: "#16a34a", opacity: 0.4 }}>{WA_SVG("w-16 h-16")}</div>
            <p style={{ fontSize: 15, color: "#64748b" }}>Select a conversation to start chatting</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default WhatsAppChat;