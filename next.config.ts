import type { NextConfig } from "next";

const config: NextConfig = {
  // node-ical uses BigInt internally — exclude from webpack bundling
  serverExternalPackages: ["node-ical"],
};

export default config;
