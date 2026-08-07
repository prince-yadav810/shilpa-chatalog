import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth";

/**
 * Verifies the session *signature*, not merely that a cookie exists.
 *
 * This redirects browsers away from admin pages; it is not the security
 * boundary for the API. Every mutating route handler calls requireAdmin()
 * independently.
 */
export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  if (pathname === "/admin/login") {
    // Already signed in? Skip the form.
    const session = await verifySessionToken(req.cookies.get(SESSION_COOKIE)?.value);
    if (session) return NextResponse.redirect(new URL("/admin", req.url));
    return NextResponse.next();
  }

  const session = await verifySessionToken(req.cookies.get(SESSION_COOKIE)?.value);
  if (session) return NextResponse.next();

  const loginUrl = new URL("/admin/login", req.url);
  loginUrl.searchParams.set("next", pathname + search);
  const response = NextResponse.redirect(loginUrl);
  // Clear a stale or forged cookie so the browser stops sending it.
  response.cookies.delete(SESSION_COOKIE);
  return response;
}

export const config = {
  matcher: ["/admin/:path*"],
};
