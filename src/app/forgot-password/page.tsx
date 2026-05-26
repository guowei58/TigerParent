"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import {
  AuthField,
  AuthInlineLink,
  AuthLinkRow,
  AuthMessage,
  AuthShell,
} from "@/components/auth/AuthShell";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setInfo("");

    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Could not send reset email.");
      return;
    }

    setInfo(data.message ?? "Check your email for reset instructions.");
  };

  return (
    <AuthShell
      title="Reset password"
      subtitle="We'll email you a secure link"
      footer={
        <AuthLinkRow>
          <AuthInlineLink href="/login">Back to sign in</AuthInlineLink>
        </AuthLinkRow>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <AuthField
          label="Email"
          type="email"
          value={email}
          onChange={setEmail}
          autoComplete="email"
          required
        />
        {error && <AuthMessage tone="error">{error}</AuthMessage>}
        {info && <AuthMessage tone="success">{info}</AuthMessage>}
        <Button type="submit" size="lg" className="w-full" disabled={loading}>
          {loading ? "Sending..." : "Send reset link"}
        </Button>
      </form>
    </AuthShell>
  );
}
