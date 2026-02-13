/**
 * Middleware — protects the /dashboard route.
 * Redirects to login if no session cookie is found.
 */

import { NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "canvax_session";

export function middleware(request: NextRequest) {
  const session = request.cookies.get(COOKIE_NAME);

  // Protect /dashboard and sub-routes
  if (request.nextUrl.pathname.startsWith("/dashboard") && !session?.value) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
