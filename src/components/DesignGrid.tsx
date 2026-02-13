"use client";

/**
 * DesignGrid — renders a responsive grid of Canva design thumbnails.
 */

import { useState, useEffect } from "react";
import { Loader2, ImageOff } from "lucide-react";

export interface Design {
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

interface DesignGridProps {
  onSelectDesign: (design: Design) => void;
  selectedDesignId?: string;
}

export default function DesignGrid({
  onSelectDesign,
  selectedDesignId,
}: DesignGridProps) {
  const [designs, setDesigns] = useState<Design[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDesigns();
  }, []);

  async function fetchDesigns() {
    try {
      setLoading(true);
      const res = await fetch("/api/designs");

      if (res.status === 401) {
        window.location.href = "/";
        return;
      }

      if (!res.ok) throw new Error("Failed to load designs");

      const data = await res.json();
      setDesigns(data.items || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-8 h-8 text-accent-light animate-spin" />
        <span className="ml-3 text-muted">Loading your designs…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <div className="w-16 h-16 rounded-2xl bg-danger/15 flex items-center justify-center mb-4">
          <ImageOff className="w-8 h-8 text-danger" />
        </div>
        <p className="text-danger font-medium mb-2">
          Failed to load designs
        </p>
        <p className="text-muted text-sm mb-4">{error}</p>
        <button
          onClick={fetchDesigns}
          className="px-4 py-2 rounded-xl glass text-sm hover:bg-white/[0.06] transition-colors"
        >
          Try again
        </button>
      </div>
    );
  }

  if (designs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <div className="w-16 h-16 rounded-2xl bg-accent/15 flex items-center justify-center mb-4 animate-float">
          <ImageOff className="w-8 h-8 text-accent-light" />
        </div>
        <p className="text-foreground font-medium mb-1">No designs found</p>
        <p className="text-muted text-sm">
          Create some designs in Canva first, then come back here.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      {designs.map((design, i) => (
        <button
          key={design.id}
          onClick={() => onSelectDesign(design)}
          style={{ animationDelay: `${i * 50}ms` }}
          className={`group relative rounded-2xl overflow-hidden transition-all duration-200 animate-fade-in hover:scale-[1.03] active:scale-[0.98] ${
            selectedDesignId === design.id
              ? "ring-2 ring-accent glow-accent"
              : "ring-1 ring-card-border hover:ring-accent-light/40"
          }`}
        >
          {/* Thumbnail */}
          <div className="aspect-square bg-surface">
            {design.thumbnail?.url ? (
              <img
                src={design.thumbnail.url}
                alt={design.title}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <ImageOff className="w-8 h-8 text-muted/40" />
              </div>
            )}
          </div>

          {/* Title overlay */}
          <div className="absolute inset-x-0 bottom-0 px-3 py-2.5 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
            <p className="text-sm font-medium text-white line-clamp-2 text-left">
              {design.title || "Untitled"}
            </p>
          </div>

          {/* Hover overlay */}
          <div className="absolute inset-0 bg-accent/10 opacity-0 group-hover:opacity-100 transition-opacity" />
        </button>
      ))}
    </div>
  );
}
