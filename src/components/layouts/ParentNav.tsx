"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Home, Users, BarChart3, Settings, LogOut } from "lucide-react";
import { signOut } from "next-auth/react";

const links = [
  { href: "/parent", label: "Dashboard", icon: Home },
  { href: "/parent/students", label: "Students", icon: Users },
  { href: "/parent/reports", label: "Reports", icon: BarChart3 },
  { href: "/parent/settings", label: "Settings", icon: Settings },
];

export function ParentNav() {
  const pathname = usePathname();

  return (
    <nav className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-400">TigerParent</p>
          <p className="font-bold text-lg text-slate-900">Parent Portal</p>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="rounded-xl p-2 text-slate-500 hover:bg-slate-100"
          aria-label="Sign out"
        >
          <LogOut className="h-5 w-5" />
        </button>
      </div>
      <div className="mx-auto flex max-w-6xl gap-2 px-4 pb-3">
        {links.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium",
              pathname === href || pathname.startsWith(href + "/")
                ? "bg-indigo-100 text-indigo-800"
                : "text-slate-600 hover:bg-slate-50",
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
