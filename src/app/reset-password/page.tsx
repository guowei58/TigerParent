"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Button } from "@/components/ui/Button";
import {
  AuthField,
  AuthInlineLink,
  AuthLinkRow,
  AuthMessage,
  AuthShell,
} from "@/components/auth/AuthShell";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const welcome = searchParams.get("welcome") === "1";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    setError("");

    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Could not reset password.");
      return;
    }

    setInfo("Password saved! Redirecting to sign in...");
    setTimeout(() => router.push("/login?verified=1"), 1500);
  };

  if (!token) {
    return (
      <AuthShell title="Invalid link" subtitle="Request a new password reset">
        <AuthMessage tone="error">This reset link is missing or invalid.</AuthMessage>
        <AuthLinkRow>
          <AuthInlineLink href="/forgot-password">Request new link</AuthInlineLink>
        </AuthLinkRow>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title={welcome ? "Set your password" : "Choose a new password"}
      subtitle={welcome ? "Your student account is ready" : "Create a new password"}
      footer={
        <AuthLinkRow>
          <AuthInlineLink href="/login">Back to sign in</AuthInlineLink>
        </AuthLinkRow>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <AuthField
          label="New password"
          type="password"
          value={password}
          onChange={setPassword}
          autoComplete="new-password"
          minLength={8}
          required
        />
        <AuthField
          label="Confirm password"
          type="password"
          value={confirm}
          onChange={setConfirm}
          autoComplete="new-password"
          minLength={8}
          required
        />
        {error && <AuthMessage tone="error">{error}</AuthMessage>}
        {info && <AuthMessage tone="success">{info}</AuthMessage>}
        <Button type="submit" size="lg" className="w-full" disabled={loading}>
          {loading ? "Saving..." : "Save password"}
        </Button>
      </form>
    </AuthShell>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}
