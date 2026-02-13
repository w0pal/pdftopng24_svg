/**
 * GET /api/auth/canva
 *
 * Redirects the user to Canva's OAuth authorization page.
 */

import { NextResponse } from "next/server";
import { getCanvaAuthUrl } from "@/lib/canva";
import { v4 as uuidv4 } from "uuid";

export async function GET() {
  const state = uuidv4();

  // In production, store `state` in a cookie for CSRF validation.
  const authUrl = getCanvaAuthUrl(state);

  return NextResponse.redirect(authUrl);
}
