/**
 * Client-side PDF conversion utilities using pdfjs-dist.
 * Runs entirely in the browser — no server dependency.
 *
 * pdfjs-dist is lazily loaded to avoid SSR issues (DOMMatrix etc).
 */

import type {
  PDFDocumentProxy,
  PDFPageProxy,
} from "pdfjs-dist/types/src/display/api";
import JSZip from "jszip";

// Lazy-load pdfjs-dist (browser-only)
let pdfjsLib: typeof import("pdfjs-dist") | null = null;

async function getPdfjsLib() {
  if (pdfjsLib) return pdfjsLib;
  pdfjsLib = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.mjs",
    import.meta.url
  ).toString();
  return pdfjsLib;
}


/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

async function loadPdf(file: File): Promise<PDFDocumentProxy> {
  const pdfjs = await getPdfjsLib();
  const arrayBuffer = await file.arrayBuffer();
  return pdfjs.getDocument({ data: arrayBuffer }).promise;
}

export async function getPdfPageCount(file: File): Promise<number> {
  const pdf = await loadPdf(file);
  return pdf.numPages;
}

/**
 * Resolve which pages to convert:
 * - undefined / empty → all pages [1..numPages]
 * - otherwise use provided list
 */
function resolvePages(numPages: number, pages?: number[]): number[] {
  if (!pages || pages.length === 0) {
    return Array.from({ length: numPages }, (_, i) => i + 1);
  }
  return pages.filter((p) => p >= 1 && p <= numPages);
}

/* ------------------------------------------------------------------ */
/*  PDF → PNG (client-side canvas rendering)                           */
/* ------------------------------------------------------------------ */

async function renderPageToPng(
  page: PDFPageProxy,
  dpi: number
): Promise<Blob> {
  const scale = dpi / 72; // PDF native is 72 DPI
  const viewport = page.getViewport({ scale });

  const canvas = document.createElement("canvas");
  canvas.width = viewport.width;
  canvas.height = viewport.height;

  const ctx = canvas.getContext("2d")!;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await page.render({ canvasContext: ctx, viewport, canvas } as any).promise;

  // Remove white background → transparent
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const pixels = imageData.data;
  const THRESHOLD = 250;

  for (let i = 0; i < pixels.length; i += 4) {
    if (
      pixels[i] >= THRESHOLD &&
      pixels[i + 1] >= THRESHOLD &&
      pixels[i + 2] >= THRESHOLD
    ) {
      pixels[i + 3] = 0; // Make transparent
    }
  }

  ctx.putImageData(imageData, 0, 0);

  return new Promise<Blob>((resolve) => {
    canvas.toBlob(
      (blob) => resolve(blob!),
      "image/png"
    );
  });
}

export async function pdfToCanvasPng(
  file: File,
  dpi: number = 300,
  pages?: number[],
  onProgress?: (current: number, total: number) => void
): Promise<{ blob: Blob; filename: string }> {
  const pdf = await loadPdf(file);
  const pageList = resolvePages(pdf.numPages, pages);
  const baseName = file.name.replace(/\.pdf$/i, "").trim() || "converted";

  if (pageList.length === 1) {
    const page = await pdf.getPage(pageList[0]);
    onProgress?.(1, 1);
    const blob = await renderPageToPng(page, dpi);
    return {
      blob,
      filename: `${baseName}_page${pageList[0]}_${dpi}dpi.png`,
    };
  }

  // Multiple pages → ZIP
  const zip = new JSZip();

  for (let i = 0; i < pageList.length; i++) {
    const page = await pdf.getPage(pageList[i]);
    const blob = await renderPageToPng(page, dpi);
    zip.file(
      `${baseName}_page${pageList[i]}_${dpi}dpi.png`,
      blob
    );
    onProgress?.(i + 1, pageList.length);
  }

  const zipBlob = await zip.generateAsync({ type: "blob" });
  return {
    blob: zipBlob,
    filename: `${baseName}_${dpi}dpi_pages.zip`,
  };
}

/* ------------------------------------------------------------------ */
/*  PDF → SVG (client-side canvas → embedded raster SVG)               */
/* ------------------------------------------------------------------ */

async function renderPageToSvg(
  page: PDFPageProxy,
  dpi: number = 150
): Promise<string> {
  const scale = dpi / 72;
  const viewport = page.getViewport({ scale });

  const canvas = document.createElement("canvas");
  canvas.width = viewport.width;
  canvas.height = viewport.height;

  const ctx = canvas.getContext("2d")!;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await page.render({ canvasContext: ctx, viewport, canvas } as any).promise;

  // Convert canvas to data URL
  const dataUrl = canvas.toDataURL("image/png");

  // Build proper SVG with embedded raster image
  // Use the PDF's original points-based dimensions for the SVG viewBox
  const origViewport = page.getViewport({ scale: 1 });
  const svgWidth = origViewport.width;
  const svgHeight = origViewport.height;

  return `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<svg xmlns="http://www.w3.org/2000/svg"
     xmlns:xlink="http://www.w3.org/1999/xlink"
     width="${svgWidth}" height="${svgHeight}"
     viewBox="0 0 ${svgWidth} ${svgHeight}">
  <image width="${svgWidth}" height="${svgHeight}"
         xlink:href="${dataUrl}"
         preserveAspectRatio="none" />
</svg>`;
}

export async function pdfToSvg(
  file: File,
  pages?: number[],
  onProgress?: (current: number, total: number) => void
): Promise<{ blob: Blob; filename: string }> {
  const pdf = await loadPdf(file);
  const pageList = resolvePages(pdf.numPages, pages);
  const baseName = file.name.replace(/\.pdf$/i, "").trim() || "converted";

  if (pageList.length === 1) {
    const page = await pdf.getPage(pageList[0]);
    onProgress?.(1, 1);
    const svgContent = await renderPageToSvg(page);
    const blob = new Blob([svgContent], { type: "image/svg+xml" });
    return {
      blob,
      filename: `${baseName}_page${pageList[0]}.svg`,
    };
  }

  // Multiple pages → ZIP
  const zip = new JSZip();

  for (let i = 0; i < pageList.length; i++) {
    const page = await pdf.getPage(pageList[i]);
    const svgContent = await renderPageToSvg(page);
    zip.file(`${baseName}_page${pageList[i]}.svg`, svgContent);
    onProgress?.(i + 1, pageList.length);
  }

  const zipBlob = await zip.generateAsync({ type: "blob" });
  return {
    blob: zipBlob,
    filename: `${baseName}_svg_pages.zip`,
  };
}
