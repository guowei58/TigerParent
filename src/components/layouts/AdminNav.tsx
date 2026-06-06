"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LayoutDashboard, ClipboardList, LogOut } from "lucide-react";
import { signOut } from "next-auth/react";

const links: { href: string; label: string; icon: typeof LayoutDashboard; exact?: boolean }[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/pdf-imports", label: "PDF Imports", icon: ClipboardList },
];

function isActive(pathname: string, href: string, exact?: boolean) {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

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
      <div className="mx-auto flex max-w-6xl gap-2 px-4 pb-3">
        {links.map(({ href, label, icon: Icon, exact }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium whitespace-nowrap",
              isActive(pathname, href, exact)
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
