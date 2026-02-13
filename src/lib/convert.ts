/**
 * PDF → PNG-24 (transparent) and PDF → SVG conversion utilities.
 *
 * PNG: Uses Sharp to rasterize the first page and remove white backgrounds.
 * SVG: Uses Inkscape CLI for high-fidelity vector conversion.
 */

import sharp from "sharp";
import { execFile } from "child_process";
import { promisify } from "util";
import { writeFile, readFile, unlink, mkdtemp } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";

const execFileAsync = promisify(execFile);

/* ------------------------------------------------------------------ */
/*  PDF → PNG-24 Transparent                                           */
/* ------------------------------------------------------------------ */

/**
 * Rasterize a PDF buffer to a PNG with white background removed.
 *
 * Pipeline:
 *  1. Inkscape CLI rasterizes the PDF to PNG at the requested DPI
 *  2. Sharp reads the PNG and removes white/near-white pixels (→ transparent)
 *
 * @param pdfBuffer  Raw PDF bytes
 * @param dpi        Resolution for rasterization (72–600)
 * @returns          PNG buffer with transparency
 */
export async function pdfToPng(
  pdfBuffer: Buffer,
  dpi: number = 300
): Promise<Buffer> {
  const clampedDpi = Math.max(72, Math.min(600, dpi));

  // Create a temp directory
  const tempDir = await mkdtemp(join(tmpdir(), "canvax-png-"));
  const pdfPath = join(tempDir, "input.pdf");
  const pngPath = join(tempDir, "output.png");

  try {
    // Write the PDF to a temp file
    await writeFile(pdfPath, pdfBuffer);

    // Use Inkscape to rasterize PDF → PNG at the requested DPI
    await execFileAsync("inkscape", [
      pdfPath,
      "--export-type=png",
      `--export-filename=${pngPath}`,
      `--export-dpi=${clampedDpi}`,
    ]);

    // Read the rasterized PNG with Sharp
    const { data, info } = await sharp(pngPath)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    // Remove white background: any pixel that is "close to white" becomes transparent.
    const THRESHOLD = 250; // pixels with R, G, B all >= 250 → transparent
    const pixels = new Uint8Array(data.buffer, data.byteOffset, data.length);

    for (let i = 0; i < pixels.length; i += 4) {
      const r = pixels[i];
      const g = pixels[i + 1];
      const b = pixels[i + 2];

      if (r >= THRESHOLD && g >= THRESHOLD && b >= THRESHOLD) {
        pixels[i + 3] = 0; // Make fully transparent
      }
    }

    // Rebuild from modified raw data → final PNG
    const finalPng = await sharp(Buffer.from(pixels.buffer), {
      raw: {
        width: info.width,
        height: info.height,
        channels: 4,
      },
    })
      .png({ compressionLevel: 6 })
      .toBuffer();

    return finalPng;
  } finally {
    // Clean up temp files
    await unlink(pdfPath).catch(() => {});
    await unlink(pngPath).catch(() => {});
    const { rmdir } = await import("fs/promises");
    await rmdir(tempDir).catch(() => {});
  }
}

/* ------------------------------------------------------------------ */
/*  PDF → SVG                                                          */
/* ------------------------------------------------------------------ */

/**
 * Convert a PDF to SVG using Inkscape CLI.
 *
 * @param pdfBuffer  Raw PDF bytes
 * @returns          SVG string
 */
export async function pdfToSvg(pdfBuffer: Buffer): Promise<string> {
  // Create a temp directory to work in
  const tempDir = await mkdtemp(join(tmpdir(), "canvax-"));
  const pdfPath = join(tempDir, "input.pdf");
  const svgPath = join(tempDir, "input.svg");

  try {
    // Write the PDF to a temp file
    await writeFile(pdfPath, pdfBuffer);

    // Run Inkscape to convert PDF → SVG
    await execFileAsync("inkscape", [
      pdfPath,
      "--export-type=svg",
      `--export-filename=${svgPath}`,
    ]);

    // Read the SVG output
    const svgContent = await readFile(svgPath, "utf-8");
    return svgContent;
  } finally {
    // Clean up temp files
    await unlink(pdfPath).catch(() => {});
    await unlink(svgPath).catch(() => {});
    const { rmdir } = await import("fs/promises");
    await rmdir(tempDir).catch(() => {});
  }
}
