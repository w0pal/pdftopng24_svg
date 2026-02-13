/**
 * GET /api/designs
 *
 * Fetches the authenticated user's designs from Canva.
 */

import { NextRequest, NextResponse } from "next/server";
import { fetchDesigns } from "@/lib/canva";
import { getAccessToken } from "@/lib/cookies";

export async function GET(request: NextRequest) {
  const accessToken = await getAccessToken();

  if (!accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const continuation = searchParams.get("continuation") || undefined;
    const data = await fetchDesigns(accessToken, continuation);

    return NextResponse.json(data);
  } catch (err) {
    console.error("Failed to fetch designs:", err);
    return NextResponse.json(
      { error: "Failed to fetch designs" },
      { status: 500 }
    );
  }
}
