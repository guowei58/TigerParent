"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import {
  AuthField,
  AuthInlineLink,
  AuthLinkRow,
  AuthMessage,
  AuthShell,
  DevAuthLink,
} from "@/components/auth/AuthShell";

export default function SignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [devLink, setDevLink] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setInfo("");
    setDevLink("");

    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Could not create account.");
      return;
    }

    setInfo(data.message ?? "Check your email to verify your account.");
    if (data.verificationUrl) {
      setDevLink(data.verificationUrl);
    }
  };

  return (
    <AuthShell
      title="Create parent account"
      subtitle="Manage your kids' learning"
      footer={
        <AuthLinkRow>
          <p>
            Already have an account? <AuthInlineLink href="/login">Sign in</AuthInlineLink>
          </p>
        </AuthLinkRow>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <AuthField label="Your name" value={name} onChange={setName} autoComplete="name" required />
        <AuthField
          label="Email"
          type="email"
          value={email}
          onChange={setEmail}
          autoComplete="email"
          required
        />
        <AuthField
          label="Password"
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
        <p className="text-xs text-slate-500">Use at least 8 characters.</p>

        {error && <AuthMessage tone="error">{error}</AuthMessage>}
        {info && <AuthMessage tone="success">{info}</AuthMessage>}
        {devLink && <DevAuthLink label="Dev mode — click to verify:" url={devLink} />}

        <Button type="submit" size="lg" className="w-full" disabled={loading}>
          {loading ? "Creating account..." : "Create account"}
        </Button>
      </form>
    </AuthShell>
  );
}
