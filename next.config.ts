import type { NextConfig } from "next";

const projectRoot = process.cwd();

function resolveDistDir() {
  if (process.env.NEXT_DIST_DIR) return process.env.NEXT_DIST_DIR;

  const isDevelopment =
    process.env.NODE_ENV === "development" || process.argv.includes("dev");
  if (!isDevelopment) return ".next";

  const portFlagIndex = process.argv.findIndex(
    (argument) => argument === "-p" || argument === "--port",
  );
  const inlinePort = process.argv
    .find((argument) => argument.startsWith("--port="))
    ?.slice("--port=".length);
  const port =
    inlinePort ||
    (portFlagIndex >= 0 ? process.argv[portFlagIndex + 1] : undefined) ||
    process.env.PORT ||
    "3000";

  return `.next-dev-${port}`;
}

function resolveTypeScriptConfigPath() {
  const configuredPath = process.env.NEXT_TYPESCRIPT_CONFIG;
  if (!configuredPath) return "tsconfig.json";
  if (!/^\.tsconfig-beta-[a-f0-9]{12}\.json$/u.test(configuredPath)) {
    throw new Error("NEXT_TYPESCRIPT_CONFIG must name a generated beta TypeScript config.");
  }
  return configuredPath;
}

const config: NextConfig = {
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  // Keep disposable QA/build servers isolated from the developer's live
  // `.next` directory so browser verification cannot corrupt an open session.
  distDir: resolveDistDir(),
  typescript: {
    tsconfigPath: resolveTypeScriptConfigPath(),
  },
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
    { source: "/trust.html", destination: "/privacy.html#privacy", permanent: true },
    ];
  },
};

export default config;
