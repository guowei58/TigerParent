"use client";

import { signIn, signOut } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";
import { isDeprecatedParentPortalPath, portalPath } from "@/lib/auth-routes";
import { Button } from "@/components/ui/Button";
import {
  AuthField,
  AuthInlineLink,
  AuthLinkRow,
  AuthMessage,
  AuthShell,
  DevAuthLink,
} from "@/components/auth/AuthShell";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/";
  const parentPortalNotice = searchParams.get("notice") === "parent-portal-removed";
  const verified = searchParams.get("verified") === "1";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState(verified ? "Email verified! Sign in to continue." : "");
  const [devLink, setDevLink] = useState("");
  const [loading, setLoading] = useState(false);
  const [magicLoading, setMagicLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [needsVerification, setNeedsVerification] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setInfo("");
    setDevLink("");
    setNeedsVerification(false);

    await signOut({ redirect: false });

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      if (result.error === "EmailNotVerified") {
        setNeedsVerification(true);
        setError("Please verify your email before signing in.");
      } else if (result.error.includes("DatabaseConnection")) {
        setError("Cannot reach the server. Try again in a moment.");
      } else {
        setError("Invalid email or password.");
      }
      setLoading(false);
      return;
    }

    const sessionRes = await fetch("/api/auth/session");
    const session = (await sessionRes.json()) as { user?: { role?: string } };
    const role = session?.user?.role ?? "STUDENT";
    const destination =
      callbackUrl === "/" || isDeprecatedParentPortalPath(callbackUrl)
        ? portalPath(role)
        : callbackUrl;

    router.push(destination);
    router.refresh();
  };

  const handleMagicLink = async () => {
    if (!email.trim()) {
      setError("Enter your email address first.");
      return;
    }
    setMagicLoading(true);
    setError("");
    setInfo("");
    setDevLink("");
    setNeedsVerification(false);

    const res = await fetch("/api/auth/magic-link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json().catch(() => ({}));
    setMagicLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Could not send sign-in link.");
      return;
    }

    setInfo(data.message ?? "Check your email for a sign-in link.");
    if (data.signInUrl) {
      setDevLink(data.signInUrl);
    }
  };

  const handleResendVerification = async () => {
    if (!email.trim()) {
      setError("Enter your email address first.");
      return;
    }
    setResendLoading(true);
    setError("");
    setInfo("");
    setDevLink("");

    const res = await fetch("/api/auth/resend-verification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json().catch(() => ({}));
    setResendLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Could not resend verification email.");
      return;
    }

    setInfo(data.message ?? "Check your email for a verification link.");
    if (data.verificationUrl) {
      setDevLink(data.verificationUrl);
    }
  };

  return (
    <AuthShell
      title="TigerParent"
      subtitle="Sign in with your email"
      footer={
        <AuthLinkRow>
          <p className="text-slate-500 text-sm">
            Parents: open the <strong>Parents</strong> tab after signing in as a student.
          </p>
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
        <AuthField
          label="Password"
          type="password"
          value={password}
          onChange={setPassword}
          autoComplete="current-password"
          required
        />

        <div className="flex justify-end">
          <AuthInlineLink href="/forgot-password">Forgot password?</AuthInlineLink>
        </div>

        {error && <AuthMessage tone="error">{error}</AuthMessage>}
        {parentPortalNotice && (
          <AuthMessage tone="success">
            The separate parent portal is no longer used. Sign in with a student account
            (Parents tab is inside the student app) or an admin account.
          </AuthMessage>
        )}
        {info && <AuthMessage tone="success">{info}</AuthMessage>}
        {devLink && (
          <DevAuthLink
            label={needsVerification ? "Dev mode — click to verify:" : "Dev mode — click to sign in:"}
            url={devLink}
          />
        )}

        {needsVerification && (
          <Button
            type="button"
            variant="secondary"
            size="lg"
            className="w-full"
            disabled={loading || magicLoading || resendLoading}
            onClick={handleResendVerification}
          >
            {resendLoading ? "Sending..." : "Resend verification email"}
          </Button>
        )}

        <Button type="submit" size="lg" className="w-full" disabled={loading || magicLoading || resendLoading}>
          {loading ? "Signing in..." : "Sign In"}
        </Button>

        <Button
          type="button"
          variant="secondary"
          size="lg"
          className="w-full"
          disabled={loading || magicLoading || resendLoading}
          onClick={handleMagicLink}
        >
          {magicLoading ? "Sending link..." : "Email me a sign-in link"}
        </Button>
      </form>
    </AuthShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
