/**
 * Simple token management using HTTP-only cookies.
 *
 * Tokens are stored as a JSON string in a single cookie.
 * In production you'd encrypt these — here we use base64 for simplicity.
 */

import { cookies } from "next/headers";

const COOKIE_NAME = "canvax_session";

export interface SessionTokens {
  access_token: string;
  refresh_token: string;
  expires_at: number; // Unix timestamp in ms
}

export async function setSessionCookie(tokens: {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}) {
  const session: SessionTokens = {
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_at: Date.now() + tokens.expires_in * 1000,
  };

  const encoded = Buffer.from(JSON.stringify(session)).toString("base64");

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, encoded, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
}

export async function getSessionTokens(): Promise<SessionTokens | null> {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(COOKIE_NAME);
  if (!cookie?.value) return null;

  try {
    const decoded = Buffer.from(cookie.value, "base64").toString("utf-8");
    return JSON.parse(decoded) as SessionTokens;
  } catch {
    return null;
  }
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function getAccessToken(): Promise<string | null> {
  const session = await getSessionTokens();
  if (!session) return null;
  return session.access_token;
}
