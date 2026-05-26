"use client";

import { signIn, signOut } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { AuthMessage, AuthShell, AuthInlineLink, AuthLinkRow } from "@/components/auth/AuthShell";

function VerifyHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const type = searchParams.get("type");
  const [message, setMessage] = useState("Working...");
  const [tone, setTone] = useState<"error" | "success">("success");

  useEffect(() => {
    if (!token || !type) {
      setTone("error");
      setMessage("Invalid verification link.");
      return;
    }

    async function run() {
      if (type === "email-verify") {
        const res = await fetch("/api/auth/verify-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setTone("error");
          setMessage(data.error ?? "Verification failed.");
          return;
        }
        setMessage("Email verified! Redirecting to sign in...");
        setTimeout(() => router.push("/login?verified=1"), 1500);
        return;
      }

      if (type === "magic-link") {
        await signOut({ redirect: false });
        const result = await signIn("magic-link", { token, redirect: false });
        if (result?.error) {
          setTone("error");
          setMessage("This sign-in link is invalid or expired.");
          return;
        }
        setMessage("Signed in! Redirecting...");
        router.push("/");
        router.refresh();
        return;
      }

      setTone("error");
      setMessage("Unknown verification type.");
    }

    void run();
  }, [token, type, router]);

  return (
    <AuthShell title="TigerParent" subtitle="Just a moment...">
      <AuthMessage tone={tone}>{message}</AuthMessage>
      {tone === "error" && (
        <AuthLinkRow>
          <AuthInlineLink href="/login">Back to sign in</AuthInlineLink>
        </AuthLinkRow>
      )}
    </AuthShell>
  );
}

export default function AuthVerifyPage() {
  return (
    <Suspense>
      <VerifyHandler />
    </Suspense>
  );
}
