"use client";

import { signIn, signOut } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardTitle } from "@/components/ui/Card";
import { AuthBackground } from "@/components/layouts/AuthBackground";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    await signOut({ redirect: false });

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      if (result.error.includes("DatabaseConnection")) {
        setError(
          "Cannot reach the database. Run: npm run db:setup:render — then restart the dev server.",
        );
      } else {
        setError(
          "Invalid email or password. Use demo1234, or run npm run db:setup:render if this is a fresh database.",
        );
      }
      setLoading(false);
      return;
    }

    router.push(callbackUrl);
    router.refresh();
  };

  return (
    <AuthBackground layout="split-right">
      <Card className="w-full max-w-md space-y-6 border-white/20 bg-white/95 shadow-2xl backdrop-blur-md">
        <div className="text-center">
          <p className="text-4xl mb-2">🐯</p>
          <CardTitle className="text-2xl">TigerParent</CardTitle>
          <p className="text-slate-500 mt-1">Sign in to continue</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-base focus:border-indigo-500 focus:outline-none"
              autoComplete="email"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-base focus:border-indigo-500 focus:outline-none"
              autoComplete="current-password"
              required
            />
          </div>
          {error && <p className="text-rose-600 text-sm">{error}</p>}
          <Button type="submit" size="lg" className="w-full" disabled={loading}>
            {loading ? "Signing in..." : "Sign In"}
          </Button>
        </form>

        <div className="rounded-xl bg-slate-50/90 p-4 text-xs text-slate-500 space-y-1">
          <p className="font-semibold text-slate-700">Demo accounts (password: demo1234)</p>
          <p>Student A (4th): studenta@tigerparent.local</p>
          <p>Student B (6th): studentb@tigerparent.local</p>
          <p className="text-slate-400 pt-1">
            Parents: use the Parents tab after signing in as your child.
          </p>
        </div>
      </Card>
    </AuthBackground>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
