/**
 * Canva Connect API helper functions.
 *
 * Handles OAuth token exchange, design listing, and PDF export requests.
 */

const CANVA_API_BASE = "https://api.canva.com/rest/v1";
const CANVA_AUTH_BASE = "https://www.canva.com/api/oauth/authorize";
const CANVA_TOKEN_URL = "https://api.canva.com/rest/v1/oauth/token";

/* ------------------------------------------------------------------ */
/*  OAuth helpers                                                      */
/* ------------------------------------------------------------------ */

export function getCanvaAuthUrl(state: string): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: process.env.CANVA_CLIENT_ID!,
    redirect_uri: process.env.CANVA_REDIRECT_URI!,
    scope: "design:content:read design:meta:read",
    state,
  });
  return `${CANVA_AUTH_BASE}?${params.toString()}`;
}

export async function exchangeCodeForTokens(code: string) {
  const res = await fetch(CANVA_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(
        `${process.env.CANVA_CLIENT_ID}:${process.env.CANVA_CLIENT_SECRET}`
      ).toString("base64")}`,
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: process.env.CANVA_REDIRECT_URI!,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token exchange failed: ${res.status} ${text}`);
  }

  return res.json() as Promise<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
    token_type: string;
  }>;
}

export async function refreshAccessToken(refreshToken: string) {
  const res = await fetch(CANVA_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(
        `${process.env.CANVA_CLIENT_ID}:${process.env.CANVA_CLIENT_SECRET}`
      ).toString("base64")}`,
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  if (!res.ok) {
    throw new Error(`Token refresh failed: ${res.status}`);
  }

  return res.json() as Promise<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
  }>;
}

/* ------------------------------------------------------------------ */
/*  Design listing                                                     */
/* ------------------------------------------------------------------ */

export interface CanvaDesign {
  id: string;
  title: string;
  thumbnail?: {
    url: string;
    width: number;
    height: number;
  };
  created_at: string;
  updated_at: string;
}

export async function fetchDesigns(
  accessToken: string,
  continuation?: string
): Promise<{ items: CanvaDesign[]; continuation?: string }> {
  const params = new URLSearchParams({ query: "", ownership: "owned" });
  if (continuation) params.set("continuation", continuation);

  const res = await fetch(`${CANVA_API_BASE}/designs?${params.toString()}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch designs: ${res.status}`);
  }

  return res.json();
}

/* ------------------------------------------------------------------ */
/*  PDF Print export                                                   */
/* ------------------------------------------------------------------ */

export async function requestPdfExport(
  accessToken: string,
  designId: string
): Promise<{ job: { id: string; status: string } }> {
  const res = await fetch(`${CANVA_API_BASE}/exports`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      design_id: designId,
      format: { type: "pdf" },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Export request failed: ${res.status} ${text}`);
  }

  return res.json();
}

export async function pollExportStatus(
  accessToken: string,
  jobId: string,
  maxAttempts = 30,
  intervalMs = 2000
): Promise<{ status: string; urls?: string[] }> {
  for (let i = 0; i < maxAttempts; i++) {
    const res = await fetch(`${CANVA_API_BASE}/exports/${jobId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      throw new Error(`Poll export status failed: ${res.status}`);
    }

    const data = await res.json();

    if (data.job.status === "completed" || data.job.status === "success") {
      return {
        status: "completed",
        urls: data.job.urls || (data.job.result ? [data.job.result.url] : []),
      };
    }

    if (data.job.status === "failed") {
      throw new Error("Canva export job failed");
    }

    // Wait before polling again
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error("Export timed out");
}

/**
 * Download the exported PDF as a Buffer.
 */
export async function downloadPdf(url: string): Promise<Buffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`PDF download failed: ${res.status}`);
  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
