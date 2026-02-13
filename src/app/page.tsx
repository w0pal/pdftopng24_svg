/**
 * Login page — "Connect to Canva" landing.
 */

import {
  Sparkles,
  Image as ImageIcon,
  FileType,
  ArrowRight,
  Zap,
} from "lucide-react";

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-12">
      {/* Decorative blobs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-accent/10 blur-[120px] animate-pulse-glow" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full bg-purple-500/10 blur-[120px] animate-pulse-glow" />
      </div>

      <div className="relative z-10 w-full max-w-lg animate-fade-in">
        {/* Logo / Branding */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-accent/20 glow-accent mb-6 animate-float">
            <Sparkles className="w-10 h-10 text-accent-light" />
          </div>
          <h1 className="text-5xl font-bold tracking-tight mb-3">
            Canva<span className="text-accent-light">X</span>
          </h1>
          <p className="text-muted text-lg max-w-sm mx-auto">
            Export your Canva designs as transparent{" "}
            <span className="text-foreground font-medium">PNG-24</span> and
            vector{" "}
            <span className="text-foreground font-medium">SVG</span> — for
            free.
          </p>
        </div>

        {/* Main card */}
        <div className="glass-strong rounded-3xl p-8">
          {/* Features */}
          <div className="space-y-4 mb-8">
            <Feature
              icon={<ImageIcon className="w-5 h-5" />}
              title="PNG-24 Transparent"
              desc="Crystal-clear exports with automatic white background removal"
            />
            <Feature
              icon={<FileType className="w-5 h-5" />}
              title="Vector SVG"
              desc="True vector output preserving paths, text, and shapes"
            />
            <Feature
              icon={<Zap className="w-5 h-5" />}
              title="Up to 600 DPI"
              desc="Adjustable resolution slider for print-quality exports"
            />
          </div>

          {/* CTAs */}
          <a
            href="/convert"
            className="group flex items-center justify-center gap-3 w-full py-4 px-6 rounded-2xl bg-accent hover:bg-accent/90 text-white font-semibold text-lg transition-all duration-200 glow-accent hover:scale-[1.02] active:scale-[0.98]"
          >
            Upload PDF Directly
            <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
          </a>

          <div className="flex items-center gap-4 my-2">
            <div className="flex-1 h-px bg-card-border" />
            <span className="text-muted text-xs uppercase tracking-wider">or</span>
            <div className="flex-1 h-px bg-card-border" />
          </div>

          <a
            href="/api/auth/canva"
            className="group flex items-center justify-center gap-3 w-full py-3.5 px-6 rounded-2xl glass hover:bg-white/[0.06] text-foreground font-medium transition-all duration-200 hover:scale-[1.01] active:scale-[0.99]"
          >
            Connect to Canva
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1 text-muted" />
          </a>

          <p className="text-center text-muted text-xs mt-4">
            Upload a PDF to convert instantly, or connect to Canva to export
            designs directly.
          </p>
        </div>

        {/* Footer */}
        <p className="text-center text-muted/60 text-xs mt-8">
          Built with Next.js, Sharp &amp; Inkscape · Not affiliated with Canva
        </p>
      </div>
    </main>
  );
}

function Feature({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="flex items-start gap-4 p-3 rounded-xl hover:bg-white/[0.03] transition-colors">
      <div className="flex-shrink-0 mt-0.5 w-10 h-10 rounded-xl bg-accent/15 flex items-center justify-center text-accent-light">
        {icon}
      </div>
      <div>
        <h3 className="font-semibold text-sm">{title}</h3>
        <p className="text-muted text-sm">{desc}</p>
      </div>
    </div>
  );
}
