"use client";

/**
 * /convert — Direct PDF upload & conversion page.
 * All conversion happens client-side using pdfjs-dist.
 */

import { useState, useRef, useCallback, useEffect } from "react";
import {
  Upload,
  FileUp,
  Image as ImageIcon,
  FileType,
  Download,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ArrowLeft,
  X,
  Layers,
} from "lucide-react";
import ProgressBar from "@/components/ProgressBar";
import {
  getPdfPageCount,
  pdfToCanvasPng,
  pdfToSvg,
} from "@/lib/clientConvert";

type ExportFormat = "png" | "svg";
type ConvertStatus = "idle" | "uploading" | "converting" | "done" | "error";
type PageMode = "all" | "select";

export default function ConvertPage() {
  const [file, setFile] = useState<File | null>(null);
  const [dpi, setDpi] = useState(300);
  const [format, setFormat] = useState<ExportFormat>("png");
  const [status, setStatus] = useState<ConvertStatus>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Page selection
  const [pageCount, setPageCount] = useState(0);
  const [pageMode, setPageMode] = useState<PageMode>("all");
  const [selectedPages, setSelectedPages] = useState<Set<number>>(new Set());

  const handleFile = useCallback(async (f: File) => {
    if (
      f.type === "application/pdf" ||
      f.name.toLowerCase().endsWith(".pdf")
    ) {
      setFile(f);
      setStatus("idle");
      setErrorMsg("");
      setPageMode("all");
      setSelectedPages(new Set());

      // Get page count
      try {
        const count = await getPdfPageCount(f);
        setPageCount(count);
        // Select all pages by default
        setSelectedPages(new Set(Array.from({ length: count }, (_, i) => i + 1)));
      } catch {
        setPageCount(0);
      }
    } else {
      setErrorMsg("Please upload a PDF file.");
      setStatus("error");
    }
  }, []);

  // Update selected pages when mode changes
  useEffect(() => {
    if (pageMode === "all" && pageCount > 0) {
      setSelectedPages(new Set(Array.from({ length: pageCount }, (_, i) => i + 1)));
    }
  }, [pageMode, pageCount]);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
  }

  function togglePage(page: number) {
    setSelectedPages((prev) => {
      const next = new Set(prev);
      if (next.has(page)) {
        next.delete(page);
      } else {
        next.add(page);
      }
      return next;
    });
  }

  async function handleConvert() {
    if (!file) return;

    const pages = pageMode === "all"
      ? undefined
      : Array.from(selectedPages).sort((a, b) => a - b);

    if (pageMode === "select" && (!pages || pages.length === 0)) {
      setErrorMsg("Please select at least one page.");
      setStatus("error");
      return;
    }

    setStatus("converting");
    setErrorMsg("");
    setProgress(0);
    setProgressLabel("Preparing conversion…");

    try {
      const onProgress = (current: number, total: number) => {
        const pct = Math.round((current / total) * 100);
        setProgress(pct);
        setProgressLabel(`Converting page ${current} of ${total}…`);
      };

      let result: { blob: Blob; filename: string };

      if (format === "png") {
        result = await pdfToCanvasPng(file, dpi, pages, onProgress);
      } else {
        result = await pdfToSvg(file, pages, onProgress);
      }

      // Download the result
      const url = URL.createObjectURL(result.blob);
      const a = document.createElement("a");
      a.download = result.filename;
      a.href = url;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setProgress(100);
      setProgressLabel("Conversion complete!");
      setStatus("done");
    } catch (err) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Unknown error");
    }
  }

  const isProcessing = status === "converting";

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-30 glass border-b border-card-border">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-accent/20 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-accent-light" />
              </div>
              <span className="text-xl font-bold tracking-tight">
                Canva<span className="text-accent-light">X</span>
              </span>
            </div>
            <a
              href="/"
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm text-muted hover:text-foreground hover:bg-white/[0.06] transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </a>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-12">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold tracking-tight mb-2">
            Convert PDF to PNG-24 / SVG
          </h1>
          <p className="text-muted">
            Upload your PDF file and get transparent PNG or vector SVG — processed
            entirely in your browser, no upload needed.
          </p>
        </div>

        <div className="glass-strong rounded-3xl p-8 space-y-8">
          {/* Drop zone */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => inputRef.current?.click()}
            className={`relative flex flex-col items-center justify-center gap-4 p-10 rounded-2xl border-2 border-dashed cursor-pointer transition-all duration-200 ${
              isDragging
                ? "border-accent bg-accent/10 scale-[1.01]"
                : file
                ? "border-success/40 bg-success/5"
                : "border-card-border hover:border-accent-light/40 hover:bg-white/[0.02]"
            }`}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,application/pdf"
              onChange={handleInputChange}
              className="hidden"
            />

            {file ? (
              <>
                <div className="w-14 h-14 rounded-2xl bg-success/15 flex items-center justify-center">
                  <FileUp className="w-7 h-7 text-success" />
                </div>
                <div className="text-center">
                  <p className="font-semibold">{file.name}</p>
                  <p className="text-sm text-muted mt-1">
                    {(file.size / (1024 * 1024)).toFixed(2)} MB
                    {pageCount > 0 && ` · ${pageCount} page${pageCount > 1 ? "s" : ""}`}
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setFile(null);
                    setStatus("idle");
                    setPageCount(0);
                    setSelectedPages(new Set());
                  }}
                  className="absolute top-3 right-3 p-1.5 rounded-lg hover:bg-white/[0.06] text-muted hover:text-foreground transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </>
            ) : (
              <>
                <div className="w-14 h-14 rounded-2xl bg-accent/15 flex items-center justify-center">
                  <Upload className="w-7 h-7 text-accent-light" />
                </div>
                <div className="text-center">
                  <p className="font-semibold">
                    Drop your PDF here or{" "}
                    <span className="text-accent-light">browse</span>
                  </p>
                  <p className="text-sm text-muted mt-1">
                    Maximum file size: 50 MB
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Format selector */}
          <div>
            <label className="block text-sm font-medium mb-3">
              Output Format
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setFormat("png")}
                disabled={isProcessing}
                className={`flex flex-col items-center gap-2 p-4 rounded-2xl transition-all duration-200 ${
                  format === "png"
                    ? "bg-accent/15 ring-2 ring-accent text-accent-light"
                    : "glass hover:bg-white/[0.06] text-muted"
                } ${isProcessing ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <ImageIcon className="w-5 h-5" />
                <div className="text-center">
                  <p className="font-semibold text-sm">PNG-24</p>
                  <p className="text-xs opacity-70">Transparent</p>
                </div>
              </button>

              <button
                onClick={() => setFormat("svg")}
                disabled={isProcessing}
                className={`flex flex-col items-center gap-2 p-4 rounded-2xl transition-all duration-200 ${
                  format === "svg"
                    ? "bg-accent/15 ring-2 ring-accent text-accent-light"
                    : "glass hover:bg-white/[0.06] text-muted"
                } ${isProcessing ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <FileType className="w-5 h-5" />
                <div className="text-center">
                  <p className="font-semibold text-sm">SVG</p>
                  <p className="text-xs opacity-70">Vector</p>
                </div>
              </button>
            </div>
          </div>

          {/* DPI slider (PNG only) */}
          {format === "png" && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium">Resolution</label>
                <span className="text-sm font-mono text-accent-light px-3 py-1 rounded-lg bg-accent/10">
                  {dpi} DPI
                </span>
              </div>
              <input
                type="range"
                min={72}
                max={600}
                step={1}
                value={dpi}
                onChange={(e) => setDpi(Number(e.target.value))}
                disabled={isProcessing}
              />
              <div className="flex justify-between text-xs text-muted mt-2">
                <span>72 (Screen)</span>
                <span>300 (Print)</span>
                <span>600 (Ultra)</span>
              </div>
            </div>
          )}

          {/* Page selector */}
          {file && pageCount > 0 && (
            <div className="animate-fade-in">
              <div className="flex items-center gap-2 mb-3">
                <Layers className="w-4 h-4 text-accent-light" />
                <label className="text-sm font-medium">Pages</label>
              </div>

              <div className="flex gap-2 mb-3">
                <button
                  onClick={() => setPageMode("all")}
                  disabled={isProcessing}
                  className={`flex-1 py-2 px-4 rounded-xl text-sm font-medium transition-all duration-200 ${
                    pageMode === "all"
                      ? "bg-accent/15 ring-2 ring-accent text-accent-light"
                      : "glass hover:bg-white/[0.06] text-muted"
                  } ${isProcessing ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  All Pages ({pageCount})
                </button>
                <button
                  onClick={() => setPageMode("select")}
                  disabled={isProcessing}
                  className={`flex-1 py-2 px-4 rounded-xl text-sm font-medium transition-all duration-200 ${
                    pageMode === "select"
                      ? "bg-accent/15 ring-2 ring-accent text-accent-light"
                      : "glass hover:bg-white/[0.06] text-muted"
                  } ${isProcessing ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  Select Pages
                </button>
              </div>

              {pageMode === "select" && (
                <div className="flex flex-wrap gap-2 animate-fade-in">
                  {Array.from({ length: pageCount }, (_, i) => i + 1).map(
                    (page) => (
                      <button
                        key={page}
                        onClick={() => togglePage(page)}
                        disabled={isProcessing}
                        className={`w-10 h-10 rounded-xl text-sm font-medium transition-all duration-200 ${
                          selectedPages.has(page)
                            ? "bg-accent text-white glow-accent"
                            : "glass text-muted hover:bg-white/[0.06] hover:text-foreground"
                        } ${isProcessing ? "opacity-50 cursor-not-allowed" : ""}`}
                      >
                        {page}
                      </button>
                    )
                  )}
                  {pageMode === "select" && (
                    <div className="w-full mt-1">
                      <p className="text-xs text-muted">
                        {selectedPages.size} of {pageCount} pages selected
                        {selectedPages.size > 1 &&
                          " · Will be downloaded as ZIP"}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Progress */}
          {status !== "idle" && (
            <div className="space-y-3 animate-fade-in">
              <ProgressBar
                progress={progress}
                label={progressLabel}
                indeterminate={isProcessing && progress === 0}
              />

              {status === "done" && (
                <div className="flex items-center gap-2 text-success text-sm">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>File downloaded successfully!</span>
                </div>
              )}

              {status === "error" && (
                <div className="flex items-start gap-2 text-danger text-sm">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}
            </div>
          )}

          {/* Convert button */}
          <button
            onClick={handleConvert}
            disabled={!file || isProcessing}
            className="flex items-center justify-center gap-2 w-full py-3.5 px-6 rounded-2xl bg-accent hover:bg-accent/90 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold transition-all duration-200 glow-accent hover:scale-[1.01] active:scale-[0.99]"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Processing…
              </>
            ) : status === "done" ? (
              <>
                <Download className="w-5 h-5" />
                Convert Again
              </>
            ) : (
              <>
                <Download className="w-5 h-5" />
                Convert to {format.toUpperCase()}
              </>
            )}
          </button>
        </div>

        <p className="text-center text-muted/60 text-xs mt-8">
          All conversion happens in your browser. Your files are never uploaded
          to any server.
        </p>
      </main>
    </div>
  );
}
