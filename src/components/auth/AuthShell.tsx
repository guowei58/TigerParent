"use client";

import Link from "next/link";
import { AuthBackground } from "@/components/layouts/AuthBackground";
import { Card, CardTitle } from "@/components/ui/Card";

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <AuthBackground layout="split-right">
      <Card className="w-full max-w-md space-y-6 border-white/20 bg-white/95 shadow-2xl backdrop-blur-md">
        <div className="text-center">
          <p className="text-4xl mb-2">🐯</p>
          <CardTitle className="text-2xl">{title}</CardTitle>
          <p className="text-slate-500 mt-1">{subtitle}</p>
        </div>
        {children}
        {footer}
      </Card>
    </AuthBackground>
  );
}

export function AuthField({
  label,
  type = "text",
  value,
  onChange,
  autoComplete,
  required,
  minLength,
}: {
  label: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete?: string;
  required?: boolean;
  minLength?: number;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-slate-200 px-4 py-3 text-base focus:border-indigo-500 focus:outline-none"
        autoComplete={autoComplete}
        required={required}
        minLength={minLength}
      />
    </div>
  );
}

export function AuthMessage({ tone, children }: { tone: "error" | "success"; children: string }) {
  return (
    <p
      className={`text-sm rounded-xl px-3 py-2 ${
        tone === "error" ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700"
      }`}
    >
      {children}
    </p>
  );
}

export function AuthLinkRow({ children }: { children: React.ReactNode }) {
  return <div className="text-center text-sm text-slate-500 space-y-2">{children}</div>;
}

export function AuthInlineLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="text-indigo-600 font-medium hover:underline">
      {children}
    </Link>
  );
}

export function DevAuthLink({ label, url }: { label: string; url: string }) {
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 space-y-2">
      <p>{label}</p>
      <a href={url} className="break-all font-medium text-indigo-700 underline">
        {url}
      </a>
    </div>
  );
}
