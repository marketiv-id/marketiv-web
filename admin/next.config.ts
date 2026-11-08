import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Kunci root ke folder admin. Tanpa ini Next.js memilih root repo (ada dua
  // lockfile) lalu ikut memuat src/instrumentation.ts milik app user, yang butuh
  // @sentry/nextjs dari node_modules root. Di Netlify (base directory `admin`) dan
  // CI, node_modules root tidak di-install, jadi build admin gagal.
  turbopack: { root: __dirname },
  outputFileTracingRoot: __dirname,
  images: {
    qualities: [75, 85, 90],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "sgp.cloud.appwrite.io",
      },
      {
        protocol: "https",
        hostname: "api.marketiv.id",
      },
    ],
  },
};

export default nextConfig;
