import type { AuthTokenType } from "@/generated/prisma/client";

export function appUrl(path = ""): string {
  const base = (process.env.NEXTAUTH_URL ?? process.env.APP_URL ?? "http://localhost:3001").replace(
    /\/$/,
    "",
  );
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

export async function sendEmail(input: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<{ ok: boolean; devMode?: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM ?? "TigerParent <onboarding@resend.dev>";

  if (!apiKey) {
    console.log("\n--- Email (dev mode — no RESEND_API_KEY) ---");
    console.log(`To: ${input.to}`);
    console.log(`Subject: ${input.subject}`);
    console.log(input.text);
    console.log("---\n");
    return { ok: true, devMode: true };
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [input.to],
      subject: input.subject,
      html: input.html,
      text: input.text,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error("[email] Resend error:", res.status, body);

    let error = "Could not send email.";
    try {
      const parsed = JSON.parse(body) as { message?: string };
      if (parsed.message?.includes("only send testing emails to your own email address")) {
        error =
          "Resend test mode only delivers to the email you used to sign up for Resend. Use that address, or verify a domain at resend.com/domains.";
      } else if (parsed.message) {
        error = parsed.message;
      }
    } catch {
      // keep default
    }

    return { ok: false, error };
  }

  return { ok: true };
}

export function authEmailTemplate(input: {
  title: string;
  body: string;
  actionLabel: string;
  actionUrl: string;
}) {
  const html = `
    <div style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto;padding:24px">
      <p style="font-size:28px;margin:0 0 8px">🐯 TigerParent</p>
      <h1 style="font-size:22px;margin:0 0 16px;color:#312e81">${input.title}</h1>
      <p style="color:#334155;line-height:1.6">${input.body}</p>
      <p style="margin:28px 0">
        <a href="${input.actionUrl}" style="background:#4f46e5;color:#fff;padding:14px 24px;border-radius:12px;text-decoration:none;font-weight:600;display:inline-block">
          ${input.actionLabel}
        </a>
      </p>
      <p style="color:#94a3b8;font-size:12px;line-height:1.5">If the button doesn't work, copy this link:<br>${input.actionUrl}</p>
    </div>
  `;

  const text = `${input.title}\n\n${input.body}\n\n${input.actionLabel}: ${input.actionUrl}`;

  return { html, text };
}

export async function sendAuthEmail(input: {
  to: string;
  subject: string;
  title: string;
  body: string;
  actionLabel: string;
  actionUrl: string;
}) {
  const { html, text } = authEmailTemplate(input);
  return sendEmail({ to: input.to, subject: input.subject, html, text });
}

export type { AuthTokenType };
