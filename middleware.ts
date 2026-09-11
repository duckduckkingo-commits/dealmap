import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/** Route protection: private routes require session cookie; owner/admin enforced server-side too. */
export function middleware(req: NextRequest) {
  const hasSession = Boolean(req.cookies.get("dealmap_session")?.value);
  const path = req.nextUrl.pathname;
  // NOTE: /watchlist, /alerts and /profile intentionally allow guests:
  // they run in on-device mode (localStorage) and sync after login.
  const privatePrefixes = ["/dashboard", "/purchases", "/warranties", "/owner", "/admin", "/contribute"];
  if (privatePrefixes.some((p) => path === p || path.startsWith(p + "/"))) {
    if (!hasSession) {
      const url = req.nextUrl.clone();
      url.pathname = "/auth/login";
      url.searchParams.set("next", path);
      return NextResponse.redirect(url);
    }
  }
  return NextResponse.next();
}

export const config = { matcher: ["/dashboard/:path*", "/purchases/:path*", "/warranties/:path*", "/owner/:path*", "/admin/:path*", "/contribute/:path*"] };
