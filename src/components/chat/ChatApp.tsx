"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardTitle } from "@/components/ui/Card";
import { gradeLabel } from "@/lib/utils";

type Friend = {
  id: string;
  displayName: string;
  schoolGrade: number;
  streakDays?: number;
};

type FriendRequestItem = {
  requestId: string;
  student: Friend;
  createdAt: string;
};

type ConversationSummary = {
  id: string;
  type: string;
  title: string;
  memberCount: number;
  lastMessage: {
    content: string;
    senderId: string;
    createdAt: string;
  } | null;
  unread: boolean;
  updatedAt: string;
};

type ChatMessage = {
  id: string;
  content: string;
  senderId: string;
  senderName: string;
  createdAt: string;
  isMine: boolean;
};

type SearchStudent = Friend & { isFriend: boolean; hasPending: boolean };

export function ChatApp({
  embedded = false,
  onActivity,
  initialConversations = [],
  initialFriends = [],
  initialIncoming = [],
  initialOutgoing = [],
}: {
  embedded?: boolean;
  onActivity?: () => void;
  initialConversations?: ConversationSummary[];
  initialFriends?: Friend[];
  initialIncoming?: FriendRequestItem[];
  initialOutgoing?: FriendRequestItem[];
}) {
  const [tab, setTab] = useState<"chats" | "friends">("chats");
  const [conversations, setConversations] = useState(initialConversations);
  const [friends, setFriends] = useState(initialFriends);
  const [incoming, setIncoming] = useState(initialIncoming);
  const [outgoing, setOutgoing] = useState(initialOutgoing);
  const [loaded, setLoaded] = useState(
    initialConversations.length > 0 || initialFriends.length > 0,
  );
  const [activeConversationId, setActiveConversationId] = useState<string | null>(
    null,
  );
  const [conversationTitle, setConversationTitle] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [studentDirectory, setStudentDirectory] = useState<SearchStudent[]>([]);
  const [groupName, setGroupName] = useState("");
  const [groupMemberIds, setGroupMemberIds] = useState<string[]>([]);
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const messagesScrollRef = useRef<HTMLDivElement>(null);

  const scrollMessagesToBottom = useCallback(() => {
    const el = messagesScrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, []);

  const refreshStudentDirectory = useCallback(async () => {
    const res = await fetch("/api/student/students/search");
    if (!res.ok) return;
    const data = await res.json();
    setStudentDirectory(data.students ?? []);
  }, []);

  const refreshFriends = useCallback(async () => {
    const res = await fetch("/api/student/friends");
    if (!res.ok) return;
    const data = await res.json();
    setFriends(data.friends);
    setIncoming(data.incoming);
    setOutgoing(data.outgoing);
    onActivity?.();
    await refreshStudentDirectory();
  }, [onActivity, refreshStudentDirectory]);

  const refreshConversations = useCallback(async () => {
    const res = await fetch("/api/student/chat/conversations");
    if (!res.ok) return;
    const data = await res.json();
    setConversations(data.conversations);
    onActivity?.();
  }, [onActivity]);

  useEffect(() => {
    if (loaded) return;
    let cancelled = false;
    (async () => {
      const [friendsRes, convRes, directoryRes] = await Promise.all([
        fetch("/api/student/friends"),
        fetch("/api/student/chat/conversations"),
        fetch("/api/student/students/search"),
      ]);
      if (cancelled) return;
      if (friendsRes.ok) {
        const data = await friendsRes.json();
        setFriends(data.friends);
        setIncoming(data.incoming);
        setOutgoing(data.outgoing);
      }
      if (convRes.ok) {
        const data = await convRes.json();
        setConversations(data.conversations);
      }
      if (directoryRes.ok) {
        const data = await directoryRes.json();
        setStudentDirectory(data.students ?? []);
      }
      setLoaded(true);
      onActivity?.();
    })();
    return () => {
      cancelled = true;
    };
  }, [loaded, onActivity]);

  const loadMessages = useCallback(
    async (conversationId: string, since?: string) => {
      const url = since
        ? `/api/student/chat/conversations/${conversationId}?since=${encodeURIComponent(since)}`
        : `/api/student/chat/conversations/${conversationId}`;
      const res = await fetch(url);
      if (!res.ok) return;
      const data = await res.json();
      if (!since) {
        setConversationTitle(data.conversation.title);
        setMessages(data.messages);
      } else if (data.messages.length) {
        setMessages((prev) => {
          const ids = new Set(prev.map((m) => m.id));
          const merged = [...prev];
          for (const m of data.messages) {
            if (!ids.has(m.id)) merged.push(m);
          }
          return merged;
        });
        onActivity?.();
      }
    },
    [onActivity],
  );

  useEffect(() => {
    if (!embedded || activeConversationId) return;
    void refreshConversations();
    const interval = setInterval(refreshConversations, 4000);
    return () => clearInterval(interval);
  }, [embedded, activeConversationId, refreshConversations]);

  const openConversation = async (conversationId: string) => {
    setActiveConversationId(conversationId);
    setTab("chats");
    setError("");
    await loadMessages(conversationId);
    await refreshConversations();
  };

  const startDirectChat = async (friendId: string) => {
    setLoading(true);
    setError("");
    const res = await fetch("/api/student/chat/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "direct", friendId }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Could not start chat");
      return;
    }
    await refreshConversations();
    await openConversation(data.conversation.id);
  };

  const createGroup = async () => {
    if (!groupName.trim() || groupMemberIds.length === 0) {
      setError("Pick a name and at least one friend");
      return;
    }
    setLoading(true);
    setError("");
    const res = await fetch("/api/student/chat/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "group",
        name: groupName,
        memberIds: groupMemberIds,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Could not create group");
      return;
    }
    setShowGroupForm(false);
    setGroupName("");
    setGroupMemberIds([]);
    await refreshConversations();
    await openConversation(data.conversation.id);
  };

  const sendMessage = async () => {
    if (!activeConversationId || !draft.trim()) return;
    const content = draft.trim();
    setDraft("");
    setError("");
    const res = await fetch(
      `/api/student/chat/conversations/${activeConversationId}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      },
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setDraft(content);
      setError(data.error ?? "Send failed");
      return;
    }
    setMessages((prev) => [...prev, data.message]);
    await refreshConversations();
  };

  const friendAction = async (
    action: string,
    payload: Record<string, string>,
  ) => {
    setLoading(true);
    setError("");
    const res = await fetch("/api/student/friends", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...payload }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Action failed");
      return;
    }
    await refreshFriends();
    await refreshConversations();
  };

  const directoryFilter = searchQuery.trim().toLowerCase();
  const visibleStudents = studentDirectory.filter(
    (s) =>
      !directoryFilter ||
      s.displayName.toLowerCase().includes(directoryFilter),
  );

  useEffect(() => {
    if (!activeConversationId) return;
    const last = messages[messages.length - 1];
    const interval = setInterval(() => {
      loadMessages(
        activeConversationId,
        last?.createdAt ?? new Date(0).toISOString(),
      );
    }, 4000);
    return () => clearInterval(interval);
  }, [activeConversationId, loadMessages, messages]);

  useLayoutEffect(() => {
    if (!activeConversationId || messages.length === 0) return;
    scrollMessagesToBottom();
  }, [activeConversationId, messages, scrollMessagesToBottom]);

  if (activeConversationId) {
    return (
      <div
        className={
          embedded
            ? "flex min-h-0 flex-1 flex-col"
            : "flex min-h-[calc(100dvh-8rem)] max-h-[calc(100dvh-8rem)] flex-col"
        }
      >
        <div className="flex items-center gap-2 mb-3">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              setActiveConversationId(null);
              refreshConversations();
            }}
          >
            ← Back
          </Button>
          <h2 className="font-bold text-lg truncate">{conversationTitle}</h2>
        </div>

        <div
          ref={messagesScrollRef}
          className="flex-1 overflow-y-auto rounded-2xl bg-white/90 border border-slate-200 p-3 space-y-2"
        >
          {messages.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-8">
              Say hello! 👋
            </p>
          ) : (
            messages.map((m) => (
              <div
                key={m.id}
                className={`flex ${m.isMine ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                    m.isMine
                      ? "bg-indigo-600 text-white"
                      : "bg-slate-100 text-slate-900"
                  }`}
                >
                  {!m.isMine && (
                    <p className="text-xs font-semibold opacity-70 mb-0.5">
                      {m.senderName}
                    </p>
                  )}
                  <p className="whitespace-pre-wrap break-words">{m.content}</p>
                  <p
                    className={`text-[10px] mt-1 ${
                      m.isMine ? "text-indigo-200" : "text-slate-400"
                    }`}
                  >
                    {new Date(m.createdAt).toLocaleTimeString([], {
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>

        {error && <p className="text-sm text-rose-600 mt-2">{error}</p>}

        <div className="mt-3 flex gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            placeholder="Type a message…"
            className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-base"
          />
          <Button onClick={sendMessage} disabled={!draft.trim()}>
            Send
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={embedded ? "flex min-h-0 flex-1 flex-col space-y-3 overflow-y-auto" : "space-y-4"}>
      {!embedded && (
        <Card>
          <CardTitle>Chat 💬</CardTitle>
          <p className="text-sm text-slate-500 mt-1">
            Add friends, send DMs, and create study group chats with classmates.
          </p>
        </Card>
      )}

      {!loaded && embedded && (
        <p className="text-sm text-slate-500 text-center py-6">Loading chat…</p>
      )}

      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant={tab === "chats" ? "primary" : "secondary"}
          onClick={() => setTab("chats")}
        >
          Chats
        </Button>
        <Button
          size="sm"
          variant={tab === "friends" ? "primary" : "secondary"}
          onClick={() => setTab("friends")}
        >
          Friends
        </Button>
        {tab === "chats" && (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              setShowGroupForm((v) => !v);
              setError("");
            }}
          >
            {showGroupForm ? "Cancel group" : "+ New group chat"}
          </Button>
        )}
      </div>

      {error && (
        <p className="text-sm text-rose-600 bg-rose-50 rounded-xl px-3 py-2">
          {error}
        </p>
      )}

      {tab === "chats" && (
        <div className="space-y-3">
          {showGroupForm && (
            <Card className="space-y-3">
              <CardTitle className="text-base">Create group</CardTitle>
              <input
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="Group name (e.g. Math study squad)"
                className="w-full rounded-xl border border-slate-200 px-4 py-2"
              />
              <p className="text-sm text-slate-500">Add friends:</p>
              <div className="flex flex-wrap gap-2">
                {friends.map((f) => {
                  const selected = groupMemberIds.includes(f.id);
                  return (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() =>
                        setGroupMemberIds((ids) =>
                          selected
                            ? ids.filter((id) => id !== f.id)
                            : [...ids, f.id],
                        )
                      }
                      className={`rounded-full px-3 py-1 text-sm border ${
                        selected
                          ? "bg-indigo-600 text-white border-indigo-600"
                          : "bg-white border-slate-200"
                      }`}
                    >
                      {f.displayName}
                    </button>
                  );
                })}
              </div>
              {friends.length === 0 && (
                <p className="text-sm text-slate-500">Add friends first.</p>
              )}
              <Button onClick={createGroup} disabled={loading}>
                Create group
              </Button>
            </Card>
          )}

          {conversations.length === 0 ? (
            <Card>
              <p className="text-slate-500 text-sm">
                No chats yet. Add friends and start a conversation!
              </p>
            </Card>
          ) : (
            conversations.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => openConversation(c.id)}
                className="w-full text-left rounded-2xl bg-white/90 border border-slate-200 p-4 hover:border-indigo-300 transition"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">
                      {c.title}
                      {c.type === "GROUP" && (
                        <span className="text-slate-400 font-normal text-sm">
                          {" "}
                          · {c.memberCount} members
                        </span>
                      )}
                    </p>
                    {c.lastMessage && (
                      <p className="text-sm text-slate-500 mt-1 truncate">
                        {c.lastMessage.content}
                      </p>
                    )}
                  </div>
                  {c.unread && (
                    <span className="shrink-0 h-2.5 w-2.5 rounded-full bg-rose-500" />
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      )}

      {tab === "friends" && (
        <div className="space-y-4">
          <Card className="space-y-3">
            <CardTitle className="text-base">Find students</CardTitle>
            <p className="text-xs text-slate-500">
              Everyone on TigerParent — tap Add friend to connect.
            </p>
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter by name…"
              className="w-full rounded-xl border border-slate-200 px-4 py-3"
            />
            {visibleStudents.length === 0 ? (
              <p className="text-sm text-slate-500">
                {studentDirectory.length === 0
                  ? "No other students yet."
                  : "No names match your filter."}
              </p>
            ) : (
              visibleStudents.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between gap-2 rounded-xl bg-slate-50 p-3"
              >
                <div>
                  <p className="font-medium">{s.displayName}</p>
                  <p className="text-xs text-slate-500">
                    {gradeLabel(s.schoolGrade)}
                  </p>
                </div>
                {s.isFriend ? (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => startDirectChat(s.id)}
                  >
                    Message
                  </Button>
                ) : s.hasPending ? (
                  <span className="text-xs text-slate-400">Pending</span>
                ) : (
                  <Button
                    size="sm"
                    disabled={loading}
                    onClick={() =>
                      friendAction("request", { studentId: s.id })
                    }
                  >
                    Add friend
                  </Button>
                )}
              </div>
            ))
            )}
          </Card>

          {incoming.length > 0 && (
            <Card>
              <CardTitle className="text-base">Friend requests</CardTitle>
              <div className="mt-3 space-y-2">
                {incoming.map((r) => (
                  <div
                    key={r.requestId}
                    className="flex items-center justify-between gap-2 rounded-xl bg-indigo-50 p-3"
                  >
                    <div>
                      <p className="font-medium">{r.student.displayName}</p>
                      <p className="text-xs text-slate-500">
                        {gradeLabel(r.student.schoolGrade)}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() =>
                          friendAction("accept", { requestId: r.requestId })
                        }
                      >
                        Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() =>
                          friendAction("decline", { requestId: r.requestId })
                        }
                      >
                        Decline
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {outgoing.length > 0 && (
            <Card>
              <CardTitle className="text-base">Sent requests</CardTitle>
              <div className="mt-3 space-y-2">
                {outgoing.map((r) => (
                  <p key={r.requestId} className="text-sm text-slate-600">
                    Waiting on {r.student.displayName}…
                  </p>
                ))}
              </div>
            </Card>
          )}

          <Card>
            <CardTitle className="text-base">Your friends ({friends.length})</CardTitle>
            {friends.length === 0 ? (
              <p className="text-slate-500 text-sm mt-2">
                Search above to add classmates.
              </p>
            ) : (
              <div className="mt-3 space-y-2">
                {friends.map((f) => (
                  <div
                    key={f.id}
                    className="flex items-center justify-between gap-2 rounded-xl bg-slate-50 p-3"
                  >
                    <div>
                      <p className="font-medium">{f.displayName}</p>
                      <p className="text-xs text-slate-500">
                        {gradeLabel(f.schoolGrade)}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => startDirectChat(f.id)}
                      >
                        Message
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() =>
                          friendAction("remove", { studentId: f.id })
                        }
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
