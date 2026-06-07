"use client";

import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import { useStudentChat } from "./StudentChatContext";
import { ChatApp } from "./ChatApp";

export function StudentChatPanel() {
  const { isOpen, close, refreshUnread } = useStudentChat();

  return (
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
  );
}
