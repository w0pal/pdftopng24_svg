/**
 * GET /api/auth/logout
 *
 * Clears the session and redirects to login.
 */

import { NextResponse, NextRequest } from "next/server";
import { clearSessionCookie } from "@/lib/cookies";

export async function GET(request: NextRequest) {
  await clearSessionCookie();
  return NextResponse.redirect(new URL("/", request.url));
}
