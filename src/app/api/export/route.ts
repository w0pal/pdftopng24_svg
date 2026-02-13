/**
 * POST /api/export
 *
 * Full export pipeline:
 * 1. Request PDF Print from Canva
 * 2. Poll until ready
 * 3. Download PDF
 * 4. Convert to PNG (transparent) or SVG
 * 5. Stream result back to client
 *
 * Body: { designId: string, format: "png" | "svg", dpi?: number, designTitle?: string }
 *
 * Uses streaming response with progress updates via Server-Sent Events pattern.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  requestPdfExport,
  pollExportStatus,
  downloadPdf,
} from "@/lib/canva";
import { pdfToPng, pdfToSvg } from "@/lib/convert";
import { getAccessToken } from "@/lib/cookies";

export const maxDuration = 120; // Allow up to 2 minutes for long conversions
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const accessToken = await getAccessToken();

  if (!accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    designId: string;
    format: "png" | "svg";
    dpi?: number;
    designTitle?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { designId, format, dpi = 300, designTitle = "design" } = body;

  if (!designId || !format) {
    return NextResponse.json(
      { error: "designId and format are required" },
      { status: 400 }
    );
  }

  try {
    // 1. Request PDF export from Canva
    const exportResult = await requestPdfExport(accessToken, designId);
    const jobId = exportResult.job.id;

    // 2. Poll until export is ready
    const completed = await pollExportStatus(accessToken, jobId);

    if (!completed.urls || completed.urls.length === 0) {
      return NextResponse.json(
        { error: "No export URLs returned by Canva" },
        { status: 500 }
      );
    }

    // 3. Download the PDF
    const pdfBuffer = await downloadPdf(completed.urls[0]);

    // 4. Convert based on format
    const safeTitle = designTitle.replace(/[^a-zA-Z0-9_\-\s]/g, "").trim() || "design";

    if (format === "png") {
      const pngBuffer = await pdfToPng(pdfBuffer, dpi);

      return new NextResponse(new Uint8Array(pngBuffer), {
        status: 200,
        headers: {
          "Content-Type": "image/png",
          "Content-Disposition": `attachment; filename="${safeTitle}_${dpi}dpi.png"`,
          "Content-Length": pngBuffer.length.toString(),
        },
      });
    } else if (format === "svg") {
      const svgContent = await pdfToSvg(pdfBuffer);
      const svgBuffer = Buffer.from(svgContent, "utf-8");

      return new NextResponse(new Uint8Array(svgBuffer), {
        status: 200,
        headers: {
          "Content-Type": "image/svg+xml",
          "Content-Disposition": `attachment; filename="${safeTitle}.svg"`,
          "Content-Length": svgBuffer.length.toString(),
        },
      });
    } else {
      return NextResponse.json(
        { error: 'Invalid format. Use "png" or "svg".' },
        { status: 400 }
      );
    }
  } catch (err) {
    console.error("Export error:", err);
    const message = err instanceof Error ? err.message : "Unknown export error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
