"use client";

/**
 * ProgressBar — animated progress indicator with optional label.
 */

interface ProgressBarProps {
  /** 0–100 */
  progress: number;
  label?: string;
  /** Show indeterminate animation instead of a fixed progress */
  indeterminate?: boolean;
}

export default function ProgressBar({
  progress,
  label,
  indeterminate = false,
}: ProgressBarProps) {
  const clampedProgress = Math.max(0, Math.min(100, progress));

  return (
    <div className="w-full">
      {label && (
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-muted">{label}</span>
          {!indeterminate && (
            <span className="text-sm font-mono text-accent-light">
              {Math.round(clampedProgress)}%
            </span>
          )}
        </div>
      )}

      <div className="w-full h-2 rounded-full bg-white/[0.06] overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ease-out ${
            indeterminate
              ? "w-full bg-accent/60 progress-striped"
              : "bg-gradient-to-r from-accent to-accent-light"
          }`}
          style={
            indeterminate ? undefined : { width: `${clampedProgress}%` }
          }
        />
      </div>
    </div>
  );
}
