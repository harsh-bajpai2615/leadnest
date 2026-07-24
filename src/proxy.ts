import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/auth/session";

// Next 16's Proxy (formerly "middleware"). This is a UX guard only: it keeps
// signed-out visitors out of the app shell and signed-in ones off the login
// page. It intentionally does a cheap cookie-presence check and does NOT
// enforce authorization — every protected route handler and server component
// independently verifies the signed session via requireUser()/requireRole().
// Never rely on the proxy alone for access control.

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = request.cookies.has(SESSION_COOKIE_NAME);

  if (pathname.startsWith("/app") && !hasSession) {
    const url = new URL("/login", request.url);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (pathname === "/login" && hasSession) {
    return NextResponse.redirect(new URL("/app", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/app/:path*", "/login"],
};
