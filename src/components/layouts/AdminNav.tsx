"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LayoutDashboard, BookOpen, HelpCircle, Video, LogOut, ShieldCheck, ClipboardList } from "lucide-react";
import { signOut } from "next-auth/react";

const links = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/subjects", label: "Subjects", icon: BookOpen },
  { href: "/admin/curriculum", label: "Curriculum", icon: BookOpen },
  { href: "/admin/problems", label: "Problems", icon: HelpCircle },
  { href: "/admin/problem-review", label: "Review Queue", icon: ShieldCheck },
  { href: "/admin/sources", label: "Sources", icon: BookOpen },
  { href: "/admin/benchmark-bank", label: "Benchmarks", icon: ShieldCheck },
  { href: "/admin/homework-builder", label: "Homework", icon: ClipboardList },
  { href: "/admin/test-builder", label: "Tests", icon: ClipboardList },
  { href: "/admin/question-bank", label: "Q Bank", icon: HelpCircle },
  { href: "/admin/import-content", label: "Import", icon: BookOpen },
  { href: "/admin/import-review", label: "Import Review", icon: ShieldCheck },
  { href: "/admin/content-rights-audit", label: "Rights Audit", icon: ClipboardList },
  { href: "/admin/content-audit", label: "Content Audit", icon: ClipboardList },
  { href: "/admin/videos", label: "Videos", icon: Video },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="border-b border-slate-200 bg-slate-900 text-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-400">TigerParent</p>
          <p className="font-bold text-lg">Admin Portal</p>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="rounded-xl p-2 hover:bg-slate-800"
          aria-label="Sign out"
        >
          <LogOut className="h-5 w-5" />
        </button>
      </div>
      <div className="mx-auto flex max-w-6xl gap-2 overflow-x-auto px-4 pb-3">
        {links.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium whitespace-nowrap",
              pathname === href || pathname.startsWith(href + "/")
                ? "bg-indigo-600"
                : "text-slate-300 hover:bg-slate-800",
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
