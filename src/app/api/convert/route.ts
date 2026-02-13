/**
 * POST /api/convert
 *
 * Direct PDF upload conversion — no Canva auth needed.
 * Accepts a multipart form with a PDF file and converts to PNG or SVG.
 *
 * FormData fields:
 *   - file: PDF file
 *   - format: "png" | "svg"
 *   - dpi: number (72–600, default 300)
 */

import { NextRequest, NextResponse } from "next/server";
import { pdfToPng, pdfToSvg } from "@/lib/convert";

export const maxDuration = 120;
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const format = (formData.get("format") as string) || "png";
    const dpi = parseInt((formData.get("dpi") as string) || "300", 10);

    if (!file) {
      return NextResponse.json(
        { error: "No file uploaded" },
        { status: 400 }
      );
    }

    // Validate file type
    if (
      file.type !== "application/pdf" &&
      !file.name.toLowerCase().endsWith(".pdf")
    ) {
      return NextResponse.json(
        { error: "Only PDF files are allowed" },
        { status: 400 }
      );
    }

    // Validate file size (max 50MB)
    const MAX_SIZE = 50 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 50MB." },
        { status: 400 }
      );
    }

    // Read file into Buffer
    const arrayBuffer = await file.arrayBuffer();
    const pdfBuffer = Buffer.from(arrayBuffer);

    // Get the original filename without extension
    const baseName =
      file.name
        .replace(/\.pdf$/i, "")
        .replace(/[^a-zA-Z0-9_\-\s]/g, "")
        .trim() || "converted";

    if (format === "png") {
      const clampedDpi = Math.max(72, Math.min(600, dpi));
      const pngBuffer = await pdfToPng(pdfBuffer, clampedDpi);

      return new NextResponse(new Uint8Array(pngBuffer), {
        status: 200,
        headers: {
          "Content-Type": "image/png",
          "Content-Disposition": `attachment; filename="${baseName}_${clampedDpi}dpi.png"`,
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
          "Content-Disposition": `attachment; filename="${baseName}.svg"`,
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
    console.error("Convert error:", err);
    const message =
      err instanceof Error ? err.message : "Unknown conversion error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
