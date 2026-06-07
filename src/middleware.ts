import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Pass pathname to admin layout for login-page exclusion.
 * Auth runs in Node (admin/layout.tsx + API routes), not here.
 */
export function middleware(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", request.nextUrl.pathname);

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: ["/admin/:path*"],
};
