"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Home,
  LogOut,
  MessageCircle,
  Settings,
  Users,
  Trophy,
  Target,
} from "lucide-react";
import { signOut } from "next-auth/react";
import { useStudentChat } from "@/components/chat/StudentChatContext";

const links = [
  { href: "/student", label: "Home", icon: Home },
  { href: "/student/concepts", label: "Practice by Topics", icon: Target },
  { href: "/student/leaderboard", label: "Board", icon: Trophy },
  { href: "/student/for-parents", label: "Review Your Kid's Work", icon: Users },
  { href: "/student/settings", label: "Settings", icon: Settings },
];

function isActive(pathname: string, href: string) {
  if (href === "/student") return pathname === "/student";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function StudentNav({ displayName }: { displayName: string }) {
  const pathname = usePathname();
  const { isOpen, toggle, hasUnread } = useStudentChat();

  return (
    <nav className="sticky top-0 z-40 border-b border-indigo-200/30 bg-gradient-to-r from-indigo-600 to-violet-600 pt-[env(safe-area-inset-top,0px)] text-white">
      <div className="mx-auto flex max-w-6xl items-center gap-2 px-3 py-2 md:gap-3 md:px-4 md:py-2.5">
        <p
          className="shrink-0 text-sm font-semibold leading-none md:text-[15px]"
          title={`Hi, ${displayName}!`}
        >
          <span className="hidden min-[420px]:inline">Hi, </span>
          {displayName}
          <span aria-hidden="true"> 🐯</span>
        </p>

        <div className="student-nav-scroll flex min-w-0 flex-1 items-center justify-end gap-0.5 overflow-x-auto">
          <button
            type="button"
            onClick={toggle}
            aria-label={hasUnread ? "Open chat (new messages)" : "Open chat"}
            aria-pressed={isOpen}
            className={cn(
              "relative flex shrink-0 items-center gap-1 rounded-xl px-2.5 py-2 text-[11px] font-semibold touch-manipulation md:gap-1.5 md:px-3 md:text-xs",
              isOpen
                ? "bg-white text-indigo-700 shadow-sm"
                : "bg-white/20 hover:bg-white/30",
            )}
          >
            <MessageCircle className="h-4 w-4 shrink-0" />
            <span className="whitespace-nowrap">Chat</span>
            {hasUnread && !isOpen && (
              <span
                className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full bg-rose-500 ring-2 ring-indigo-600 animate-pulse"
                aria-hidden
              />
            )}
          </button>
          {links.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                title={label}
                aria-label={label}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex shrink-0 items-center gap-1 rounded-xl px-2 py-2 text-[11px] font-medium touch-manipulation md:gap-1.5 md:px-2.5 md:text-xs",
                  active ? "bg-white/25" : "hover:bg-white/10",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="whitespace-nowrap">{label}</span>
              </Link>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex shrink-0 items-center justify-center rounded-xl p-2 touch-manipulation hover:bg-white/10 md:min-h-11 md:min-w-11"
          aria-label="Sign out"
        >
          <LogOut className="h-4 w-4 md:h-[18px] md:w-[18px]" />
        </button>
      </div>
    </nav>
  );
}
