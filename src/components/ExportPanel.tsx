"use client";

/**
 * ExportPanel — slide-in panel for configuring and triggering design exports.
 *
 * Contains DPI slider, format selector, and export/download button.
 */

import { useState } from "react";
import {
  X,
  Download,
  Image as ImageIcon,
  FileType,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import type { Design } from "./DesignGrid";
import ProgressBar from "./ProgressBar";

interface ExportPanelProps {
  design: Design;
  onClose: () => void;
}

type ExportFormat = "png" | "svg";

type ExportStatus =
  | "idle"
  | "requesting"
  | "polling"
  | "converting"
  | "downloading"
  | "done"
  | "error";

const STATUS_LABELS: Record<ExportStatus, string> = {
  idle: "",
  requesting: "Requesting PDF from Canva…",
  polling: "Waiting for Canva to generate PDF…",
  converting: "Converting file…",
  downloading: "Preparing download…",
  done: "Export complete!",
  error: "Export failed",
};

const STATUS_PROGRESS: Record<ExportStatus, number> = {
  idle: 0,
  requesting: 15,
  polling: 40,
  converting: 70,
  downloading: 90,
  done: 100,
  error: 0,
};

export default function ExportPanel({ design, onClose }: ExportPanelProps) {
  const [dpi, setDpi] = useState(300);
  const [format, setFormat] = useState<ExportFormat>("png");
  const [status, setStatus] = useState<ExportStatus>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleExport() {
    setStatus("requesting");
    setErrorMsg("");

    try {
      // Simulate progress stages
      setStatus("polling");

      const res = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          designId: design.id,
          format,
          dpi,
          designTitle: design.title,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(data.error || `Export failed: ${res.status}`);
      }

      setStatus("downloading");

      // Download the file
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");

      const safeTitle =
        design.title?.replace(/[^a-zA-Z0-9_\-\s]/g, "").trim() || "design";
      const ext = format === "png" ? `_${dpi}dpi.png` : ".svg";
      a.download = `${safeTitle}${ext}`;
      a.href = url;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setStatus("done");
    } catch (err) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Unknown error");
    }
  }

  const isProcessing =
    status === "requesting" ||
    status === "polling" ||
    status === "converting" ||
    status === "downloading";

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-md z-50 animate-slide-in-right">
        <div className="h-full glass-strong flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-card-border">
            <div className="min-w-0">
              <h2 className="text-lg font-semibold truncate">
                {design.title || "Untitled"}
              </h2>
              <p className="text-sm text-muted">Export Settings</p>
            </div>
            <button
              onClick={onClose}
              className="flex-shrink-0 p-2 rounded-xl hover:bg-white/[0.06] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8">
            {/* Preview */}
            {design.thumbnail?.url && (
              <div className="rounded-2xl overflow-hidden ring-1 ring-card-border">
                <img
                  src={design.thumbnail.url}
                  alt={design.title}
                  className="w-full object-contain max-h-48"
                />
              </div>
            )}

            {/* Format selector */}
            <div>
              <label className="block text-sm font-medium mb-3">
                Export Format
              </label>
              <div className="grid grid-cols-2 gap-3">
                <FormatOption
                  icon={<ImageIcon className="w-5 h-5" />}
                  label="PNG-24"
                  description="Transparent"
                  selected={format === "png"}
                  onClick={() => setFormat("png")}
                  disabled={isProcessing}
                />
                <FormatOption
                  icon={<FileType className="w-5 h-5" />}
                  label="SVG"
                  description="Vector"
                  selected={format === "svg"}
                  onClick={() => setFormat("svg")}
                  disabled={isProcessing}
                />
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

            {/* Progress */}
            {status !== "idle" && (
              <div className="space-y-3 animate-fade-in">
                <ProgressBar
                  progress={STATUS_PROGRESS[status]}
                  label={STATUS_LABELS[status]}
                  indeterminate={isProcessing}
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
          </div>

          {/* Footer */}
          <div className="px-6 py-5 border-t border-card-border">
            <button
              onClick={handleExport}
              disabled={isProcessing}
              className="flex items-center justify-center gap-2 w-full py-3.5 px-6 rounded-2xl bg-accent hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold transition-all duration-200 glow-accent hover:scale-[1.01] active:scale-[0.99]"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Processing…
                </>
              ) : status === "done" ? (
                <>
                  <Download className="w-5 h-5" />
                  Export Again
                </>
              ) : (
                <>
                  <Download className="w-5 h-5" />
                  Export {format.toUpperCase()}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

function FormatOption({
  icon,
  label,
  description,
  selected,
  onClick,
  disabled,
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
  selected: boolean;
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex flex-col items-center gap-2 p-4 rounded-2xl transition-all duration-200 ${
        selected
          ? "bg-accent/15 ring-2 ring-accent text-accent-light"
          : "glass hover:bg-white/[0.06] text-muted"
      } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
    >
      {icon}
      <div className="text-center">
        <p className="font-semibold text-sm">{label}</p>
        <p className="text-xs opacity-70">{description}</p>
      </div>
    </button>
  );
}
