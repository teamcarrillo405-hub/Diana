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
  serverExternalPackages: ["node-ical", "pdfjs-dist"],
  // Public assets are served by Next/Vercel's static layer. Keep the private
  // policy check from pulling the public media tree into functions. The root
  // cinematic landing deliberately retains only its HTML, CSS, and JS sources
  // in its trace during postbuild so its server render can parse them.
  outputFileTracingExcludes: {
    "/*": ["./public/**/*"],
  },
  outputFileTracingIncludes: {
    "/api/learning/ingest": ["./lib/learning-engine/pdf-worker.mjs", "./node_modules/pdfjs-dist/**/*"],
    "/assignments/*/workspace": ["./lib/learning-engine/pdf-worker.mjs", "./node_modules/pdfjs-dist/**/*"],
    "/api/materials/textbook": ["./content/textbooks/**/*"],
    "/api/diana/study-buddy": ["./content/textbooks/**/*"],
    "/classes/*/reference/*": ["./content/textbooks/**/*"],
  },
  outputFileTracingRoot: projectRoot,
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  turbopack: {
    root: projectRoot,
  },
  async headers() {
    return [
      {
        source: "/assets/today-now/:asset([a-z0-9-]+\\.[a-f0-9]{12}\\.(?:webp|webm))",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
      {
        source: "/assets/landing-cinematic-v3/:asset*",
        headers: [{ key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" }],
      },
    ];
  },
  async redirects() {
    return [
    { source: "/terms.html", destination: "/privacy.html#terms", permanent: true },
    { source: "/trust.html", destination: "/privacy.html#privacy", permanent: true },
    ];
  },
};

export default config;
