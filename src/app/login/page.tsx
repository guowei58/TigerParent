"use client";

import Link from "next/link";
import { signIn, signOut } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";
import { isDeprecatedParentPortalPath, portalPath } from "@/lib/auth-routes";
import { Button } from "@/components/ui/Button";
import {
  AuthField,
  AuthInlineLink,
  AuthMessage,
  AuthShell,
  DevAuthLink,
} from "@/components/auth/AuthShell";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/";
  const verified = searchParams.get("verified") === "1";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState(verified ? "Email verified! Sign in to continue." : "");
  const [devLink, setDevLink] = useState("");
  const [loading, setLoading] = useState(false);
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
    const role = session?.user?.role ?? "";

    if (role !== "ADMIN" && role !== "STUDENT") {
      await signOut({ redirect: false });
      setError("Invalid email or password.");
      setLoading(false);
      return;
    }

    const destination =
      callbackUrl === "/" || isDeprecatedParentPortalPath(callbackUrl)
        ? portalPath(role)
        : callbackUrl;

    router.push(destination);
    router.refresh();
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
    <AuthShell title="TigerParent" subtitle="Sign in with your email">
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
            disabled={loading || resendLoading}
            onClick={handleResendVerification}
          >
            {resendLoading ? "Sending..." : "Resend verification email"}
          </Button>
        )}

        <Button type="submit" size="lg" className="w-full" disabled={loading || resendLoading}>
          {loading ? "Signing in..." : "Sign In"}
        </Button>

        <Link href="/signup" className="block">
          <Button type="button" variant="secondary" size="lg" className="w-full">
            Sign up
          </Button>
        </Link>
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
