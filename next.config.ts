import type { NextConfig } from "next";

const projectRoot = process.cwd();

const config: NextConfig = {
  // node-ical uses BigInt internally — exclude from webpack bundling
  serverExternalPackages: ["node-ical"],
  outputFileTracingRoot: projectRoot,
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
