"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

type StudentChatContextValue = {
  isOpen: boolean;
  unreadCount: number;
  open: () => void;
  close: () => void;
  toggle: () => void;
  refreshUnread: () => Promise<void>;
};

const StudentChatContext = createContext<StudentChatContextValue>({
  isOpen: false,
  unreadCount: 0,
  open: () => {},
  close: () => {},
  toggle: () => {},
  refreshUnread: async () => {},
});

export function StudentChatProvider({
  children,
  enabled = true,
}: {
  children: React.ReactNode;
  enabled?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const refreshUnread = useCallback(async () => {
    if (!enabled) return;
    const res = await fetch("/api/student/chat/conversations");
    if (!res.ok) return;
    const data = await res.json();
    const count = (data.conversations ?? []).filter(
      (c: { unread: boolean }) => c.unread,
    ).length;
    setUnreadCount(count);
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    refreshUnread();
    const interval = setInterval(refreshUnread, isOpen ? 8000 : 20000);
    return () => clearInterval(interval);
  }, [enabled, isOpen, refreshUnread]);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((v) => !v), []);

  return (
    <StudentChatContext.Provider
      value={{
        isOpen: enabled && isOpen,
        unreadCount,
        open: enabled ? open : () => {},
        close,
        toggle: enabled ? toggle : () => {},
        refreshUnread,
      }}
    >
      {children}
    </StudentChatContext.Provider>
  );
}

export function useStudentChat() {
  return useContext(StudentChatContext);
}
