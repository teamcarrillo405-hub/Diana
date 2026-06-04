import type { NextConfig } from "next";

const projectRoot = process.cwd();

const config: NextConfig = {
  // node-ical uses BigInt internally — exclude from webpack bundling
  serverExternalPackages: ["node-ical"],
  outputFileTracingRoot: projectRoot,
  turbopack: {
    root: projectRoot,
  },
};

export default config;
