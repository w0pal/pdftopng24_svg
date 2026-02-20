"use client";

/**
 * /merge — Merge multiple files (PDF, PNG, JPG) into a single PDF.
 * Client-side processing using pdf-lib.
 */

import { useState, useRef, useCallback } from "react";
import {
  Upload,
  FileUp,
  Download,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ArrowLeft,
  X,
  GripVertical,
  Plus,
  Layers,
} from "lucide-react";
import ProgressBar from "@/components/ProgressBar";
import { PDFDocument } from "pdf-lib";

type MergeStatus = "idle" | "processing" | "done" | "error";

const ACCEPTED_EXTENSIONS = [".pdf", ".png", ".jpg", ".jpeg", ".heic", ".heif", ".webp"];

interface MergeFile {
  id: string;
  file: File;
  type: "pdf" | "image";
  name: string;
  size: number;
}

function generateId() {
  return Math.random().toString(36).slice(2, 11);
}

function getFileType(file: File): "pdf" | "image" | null {
  if (
    file.type === "application/pdf" ||
    file.name.toLowerCase().endsWith(".pdf")
  ) {
    return "pdf";
  }
  if (
    file.type.startsWith("image/") ||
    ACCEPTED_EXTENSIONS.some(
      (ext) => ext !== ".pdf" && file.name.toLowerCase().endsWith(ext)
    )
  ) {
    return "image";
  }
  return null;
}

/**
 * Convert any image file to PNG bytes via canvas.
 * Handles HEIC, WebP, and other formats.
 * HEIC is first converted via heic2any since browsers don't natively decode it.
 */
async function imageFileToPng(file: File): Promise<Uint8Array> {
  let imageFile = file;

  // Convert HEIC/HEIF to PNG first using heic2any
  const name = file.name.toLowerCase();
  if (
    name.endsWith(".heic") ||
    name.endsWith(".heif") ||
    file.type === "image/heic" ||
    file.type === "image/heif"
  ) {
    const { default: heic2any } = await import("heic2any");
    const converted = await heic2any({
      blob: file,
      toType: "image/png",
      quality: 1,
    });
    imageFile = Array.isArray(converted) ? converted[0] as File : converted as File;
  }

  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(imageFile);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("Failed to convert image"));
            return;
          }
          blob.arrayBuffer().then((buf) => {
            resolve(new Uint8Array(buf));
          });
        },
        "image/png"
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`Failed to load image: ${file.name}`));
    };
    img.src = url;
  });
}

export default function MergePage() {
  const [files, setFiles] = useState<MergeFile[]>([]);
  const [status, setStatus] = useState<MergeStatus>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [outputName, setOutputName] = useState("merged_document");

  const addFiles = useCallback((fileList: FileList | File[]) => {
    const newFiles: MergeFile[] = [];
    for (const file of Array.from(fileList)) {
      const type = getFileType(file);
      if (type) {
        newFiles.push({
          id: generateId(),
          file,
          type,
          name: file.name,
          size: file.size,
        });
      }
    }
    if (newFiles.length > 0) {
      setFiles((prev) => [...prev, ...newFiles]);
      setStatus("idle");
      setErrorMsg("");
    }
  }, []);

  function removeFile(id: string) {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files);
    }
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
    if (e.target.files) {
      addFiles(e.target.files);
      e.target.value = "";
    }
  }

  // Drag to reorder handlers
  function handleItemDragStart(index: number) {
    setDragIndex(index);
  }

  function handleItemDragOver(e: React.DragEvent, index: number) {
    e.preventDefault();
    setDragOverIndex(index);
  }

  function handleItemDrop(index: number) {
    if (dragIndex !== null && dragIndex !== index) {
      setFiles((prev) => {
        const newList = [...prev];
        const [removed] = newList.splice(dragIndex, 1);
        newList.splice(index, 0, removed);
        return newList;
      });
    }
    setDragIndex(null);
    setDragOverIndex(null);
  }

  function handleItemDragEnd() {
    setDragIndex(null);
    setDragOverIndex(null);
  }

  async function handleMerge() {
    if (files.length < 1) return;

    setStatus("processing");
    setErrorMsg("");
    setProgress(0);
    setProgressLabel("Starting merge…");

    try {
      const mergedPdf = await PDFDocument.create();

      for (let i = 0; i < files.length; i++) {
        const mergeFile = files[i];
        setProgress(Math.round(((i) / files.length) * 90));
        setProgressLabel(
          `Processing ${mergeFile.name} (${i + 1}/${files.length})…`
        );

        const arrayBuffer = await mergeFile.file.arrayBuffer();

        if (mergeFile.type === "pdf") {
          // Load and copy all pages from source PDF
          const sourcePdf = await PDFDocument.load(arrayBuffer);
          const pages = await mergedPdf.copyPages(
            sourcePdf,
            sourcePdf.getPageIndices()
          );
          pages.forEach((page) => mergedPdf.addPage(page));
        } else {
          // Convert image through canvas to ensure valid format
          // (handles HEIC, WebP, and other formats mobile browsers may report as jpeg)
          const pngBytes = await imageFileToPng(mergeFile.file);
          const image = await mergedPdf.embedPng(pngBytes);

          // Create page sized to image (at 72 DPI)
          const page = mergedPdf.addPage([image.width, image.height]);
          page.drawImage(image, {
            x: 0,
            y: 0,
            width: image.width,
            height: image.height,
          });
        }
      }

      setProgress(95);
      setProgressLabel("Generating PDF…");

      const mergedBytes = await mergedPdf.save();
      const blob = new Blob([mergedBytes.buffer as ArrayBuffer], { type: "application/pdf" });

      // Download
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const safeName = outputName.trim().replace(/\.pdf$/i, "") || "merged_document";
      a.download = `${safeName}.pdf`;
      a.href = url;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setProgress(100);
      setProgressLabel("Merge complete!");
      setStatus("done");
    } catch (err) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Merge failed");
    }
  }

  const isProcessing = status === "processing";

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
            Merge Files to PDF
          </h1>
          <p className="text-muted">
            Combine multiple PDFs, PNGs, and JPGs into a single PDF — processed
            entirely in your browser.
          </p>
        </div>

        <div className="glass-strong rounded-3xl p-8 space-y-6">
          {/* Drop zone */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => inputRef.current?.click()}
            className={`relative flex flex-col items-center justify-center gap-4 p-8 rounded-2xl border-2 border-dashed cursor-pointer transition-all duration-200 ${
              isDragging
                ? "border-accent bg-accent/10 scale-[1.01]"
                : files.length > 0
                ? "border-success/40 bg-success/5"
                : "border-card-border hover:border-accent-light/40 hover:bg-white/[0.02]"
            }`}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.heic,.heif,.webp"
              multiple
              onChange={handleInputChange}
              className="hidden"
            />

            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                files.length > 0 ? "bg-success/15" : "bg-accent/15"
              }`}
            >
              {files.length > 0 ? (
                <Plus className="w-6 h-6 text-success" />
              ) : (
                <Upload className="w-6 h-6 text-accent-light" />
              )}
            </div>
            <div className="text-center">
              <p className="font-semibold text-sm">
                {files.length > 0 ? (
                  <>
                    Add more files or{" "}
                    <span className="text-accent-light">browse</span>
                  </>
                ) : (
                  <>
                    Drop files here or{" "}
                    <span className="text-accent-light">browse</span>
                  </>
                )}
              </p>
              <p className="text-xs text-muted mt-1">
                PDF, PNG, JPG, HEIC, WebP accepted
              </p>
            </div>
          </div>

          {/* File list */}
          {files.length > 0 && (
            <div className="space-y-2 animate-fade-in">
              <div className="flex items-center gap-2 mb-3">
                <Layers className="w-4 h-4 text-accent-light" />
                <span className="text-sm font-medium">
                  {files.length} file{files.length !== 1 ? "s" : ""} — drag to
                  reorder
                </span>
              </div>

              {files.map((f, index) => (
                <div
                  key={f.id}
                  draggable={!isProcessing}
                  onDragStart={() => handleItemDragStart(index)}
                  onDragOver={(e) => handleItemDragOver(e, index)}
                  onDrop={() => handleItemDrop(index)}
                  onDragEnd={handleItemDragEnd}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                    dragIndex === index
                      ? "opacity-30"
                      : dragOverIndex === index
                      ? "bg-accent/10 ring-2 ring-accent/30"
                      : "glass hover:bg-white/[0.06]"
                  } ${isProcessing ? "pointer-events-none" : "cursor-grab active:cursor-grabbing"}`}
                >
                  <GripVertical className="w-4 h-4 text-muted flex-shrink-0" />
                  <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                    {f.type === "pdf" ? (
                      <FileUp className="w-4 h-4 text-accent-light" />
                    ) : (
                      <Upload className="w-4 h-4 text-accent-light" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{f.name}</p>
                    <p className="text-xs text-muted">
                      {f.type.toUpperCase()} ·{" "}
                      {(f.size / 1024).toFixed(0)} KB
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFile(f.id);
                    }}
                    disabled={isProcessing}
                    className="p-1.5 rounded-lg hover:bg-white/[0.06] text-muted hover:text-foreground transition-colors disabled:opacity-50"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
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

          {/* Output filename */}
          {files.length > 0 && (
            <div className="space-y-2 animate-fade-in">
              <label htmlFor="outputName" className="text-sm font-medium text-muted">
                Output filename
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="outputName"
                  type="text"
                  value={outputName}
                  onChange={(e) => setOutputName(e.target.value)}
                  disabled={isProcessing}
                  placeholder="merged_document"
                  className="flex-1 px-4 py-2.5 rounded-xl glass border border-card-border bg-transparent text-sm text-foreground placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-accent/40 transition-all disabled:opacity-50"
                />
                <span className="text-sm text-muted">.pdf</span>
              </div>
            </div>
          )}

          {/* Merge button */}
          <button
            onClick={handleMerge}
            disabled={files.length < 1 || isProcessing}
            className="flex items-center justify-center gap-2 w-full py-3.5 px-6 rounded-2xl bg-accent hover:bg-accent/90 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold transition-all duration-200 glow-accent hover:scale-[1.01] active:scale-[0.99]"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Merging…
              </>
            ) : status === "done" ? (
              <>
                <Download className="w-5 h-5" />
                Merge Again
              </>
            ) : (
              <>
                <Layers className="w-5 h-5" />
                Merge to PDF
              </>
            )}
          </button>
        </div>

        <p className="text-center text-muted/60 text-xs mt-8">
          All processing happens in your browser. Your files are never uploaded
          to any server.
        </p>
      </main>
    </div>
  );
}
