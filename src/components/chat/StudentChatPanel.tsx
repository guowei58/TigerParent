"use client";

import { cn } from "@/lib/utils";
import { MessageCircle, X } from "lucide-react";
import { useStudentChat } from "./StudentChatContext";
import { ChatApp } from "./ChatApp";

export function StudentChatPanel() {
  const { isOpen, close, unreadCount, toggle, refreshUnread } = useStudentChat();

  return (
    <>
      {/* Edge launcher when panel is closed */}
      {!isOpen && (
        <button
          type="button"
          onClick={toggle}
          className="fixed right-0 top-1/2 z-40 flex -translate-y-1/2 items-center gap-2 rounded-l-2xl border border-r-0 border-indigo-200 bg-gradient-to-r from-indigo-600 to-violet-600 py-3 pl-3 pr-2 text-white shadow-lg touch-manipulation hover:from-indigo-500 md:py-4 md:pl-4 md:pr-3"
          aria-label="Open chat"
        >
          <MessageCircle className="h-5 w-5 shrink-0" />
          <span className="hidden text-xs font-bold sm:inline">Chat</span>
          {unreadCount > 0 && (
            <span className="absolute -left-1.5 top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      )}

      {/* Slide-out panel */}
      <aside
        className={cn(
          "fixed top-0 right-0 z-50 flex h-[100dvh] w-[min(100vw,400px)] flex-col",
          "border-l border-indigo-200/60 bg-white/98 shadow-2xl backdrop-blur-md",
          "transition-transform duration-300 ease-out",
          "pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)]",
          isOpen ? "translate-x-0" : "translate-x-full pointer-events-none",
        )}
        aria-hidden={!isOpen}
      >
        <header className="flex shrink-0 items-center justify-between gap-2 border-b border-indigo-100 bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-3 text-white">
          <div>
            <p className="text-xs uppercase tracking-wide text-indigo-200">
              Tiger Chat
            </p>
            <p className="font-bold">Messages</p>
          </div>
          <button
            type="button"
            onClick={close}
            className="rounded-xl p-2 hover:bg-white/15 touch-manipulation"
            aria-label="Close chat"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-3 py-3">
          {isOpen && (
            <ChatApp
              embedded
              onActivity={refreshUnread}
            />
          )}
        </div>
      </aside>
    </>
  );
}
