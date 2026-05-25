import { NextResponse } from "next/server";

export function isJwtSessionError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return (
    error.name === "JWTSessionError" ||
    error.message.includes("JWTSessionError") ||
    error.message.includes("no matching decryption secret")
  );
}

const SESSION_COOKIE_NAMES = [
  "authjs.session-token",
  "__Secure-authjs.session-token",
  "next-auth.session-token",
  "__Secure-next-auth.session-token",
];

export function clearAuthCookies(response: NextResponse) {
  for (const name of SESSION_COOKIE_NAMES) {
    response.cookies.delete(name);
  }
}
