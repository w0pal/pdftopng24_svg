"use client";

/**
 * Dashboard page — displays the user's Canva designs in a grid.
 * Selecting a design opens the ExportPanel.
 */

import { useState } from "react";
import { LogOut, Sparkles } from "lucide-react";
import DesignGrid, { type Design } from "@/components/DesignGrid";
import ExportPanel from "@/components/ExportPanel";

export default function DashboardPage() {
  const [selectedDesign, setSelectedDesign] = useState<Design | null>(null);

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-30 glass border-b border-card-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-accent/20 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-accent-light" />
              </div>
              <span className="text-xl font-bold tracking-tight">
                Canva<span className="text-accent-light">X</span>
              </span>
            </div>

            {/* Actions */}
            <a
              href="/api/auth/logout"
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm text-muted hover:text-foreground hover:bg-white/[0.06] transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Sign out
            </a>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Title */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Your Designs</h1>
          <p className="text-muted mt-1">
            Select a design to export as PNG-24 or SVG
          </p>
        </div>

        {/* Grid */}
        <DesignGrid
          onSelectDesign={setSelectedDesign}
          selectedDesignId={selectedDesign?.id}
        />
      </main>

      {/* Export Panel */}
      {selectedDesign && (
        <ExportPanel
          design={selectedDesign}
          onClose={() => setSelectedDesign(null)}
        />
      )}
    </div>
  );
}
