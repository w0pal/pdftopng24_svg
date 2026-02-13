import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CanvaX — Export Canva Designs as PNG-24 & SVG",
  description:
    "Export your Canva designs as transparent PNG-24 and vector SVG for free. High-quality exports up to 600 DPI.",
  keywords: ["Canva", "PNG-24", "SVG", "transparent", "export", "vector"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <div className="bg-grid bg-radial-glow min-h-screen">{children}</div>
      </body>
    </html>
  );
}
