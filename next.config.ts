import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow Canva CDN images
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.canva.com",
      },
    ],
  },

  // Sharp requires native bindings — ensure it's not bundled for the browser
  serverExternalPackages: ["sharp"],

  // Increase body size limit for API routes handling large PDFs
  experimental: {
    serverActions: {
      bodySizeLimit: "50mb",
    },
  },
};

export default nextConfig;
