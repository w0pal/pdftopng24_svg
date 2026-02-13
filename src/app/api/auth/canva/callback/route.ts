/**
 * GET /api/auth/canva/callback
 *
 * Handles the OAuth callback from Canva.
 * Exchanges the authorization code for tokens and stores them in a session cookie.
 */

import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForTokens } from "@/lib/canva";
import { setSessionCookie } from "@/lib/cookies";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error) {
    console.error("Canva OAuth error:", error);
    return NextResponse.redirect(
      new URL("/?error=auth_failed", request.url)
    );
  }

  if (!code) {
    return NextResponse.redirect(
      new URL("/?error=no_code", request.url)
    );
  }

  try {
    const tokens = await exchangeCodeForTokens(code);
    await setSessionCookie(tokens);
    return NextResponse.redirect(new URL("/dashboard", request.url));
  } catch (err) {
    console.error("Token exchange error:", err);
    return NextResponse.redirect(
      new URL("/?error=token_exchange_failed", request.url)
    );
  }
}
