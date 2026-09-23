import type { NextConfig } from "next";

const projectRoot = process.cwd();

const config: NextConfig = {
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  // Keep disposable QA/build servers isolated from the developer's live
  // `.next` directory so browser verification cannot corrupt an open session.
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  // node-ical uses BigInt internally — exclude from webpack bundling
  serverExternalPackages: ["node-ical"],
  outputFileTracingRoot: projectRoot,
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  turbopack: {
    root: projectRoot,
  },
  async redirects() {
    return [
      // Design reference app (public/design) — /design lands on the Student Lobby.
      { source: "/design", destination: "/design/Student%20Lobby.dc.html", permanent: false },
    ];
  },
};

export default config;
