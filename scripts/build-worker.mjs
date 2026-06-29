import { existsSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import * as esbuild from "esbuild";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outfile = join(repoRoot, "dist", "worker", "run-diana-worker.cjs");

const rootAliasPlugin = {
  name: "diana-root-alias",
  setup(build) {
    build.onResolve({ filter: /^@\// }, (args) => {
      const resolved = resolveSourcePath(join(repoRoot, args.path.slice(2)));
      if (!resolved) {
        return {
          errors: [{ text: `Could not resolve ${args.path} from ${args.importer}` }],
        };
      }
      return { path: resolved };
    });
  },
};

function resolveSourcePath(basePath) {
  const candidates = [
    basePath,
    `${basePath}.ts`,
    `${basePath}.tsx`,
    `${basePath}.js`,
    `${basePath}.mjs`,
    join(basePath, "index.ts"),
    join(basePath, "index.tsx"),
    join(basePath, "index.js"),
    join(basePath, "index.mjs"),
  ];
  return candidates.find((candidate) => existsSync(candidate)) ?? null;
}

mkdirSync(dirname(outfile), { recursive: true });

await esbuild.build({
  absWorkingDir: repoRoot,
  entryPoints: ["scripts/run-diana-worker.ts"],
  outfile,
  bundle: true,
  platform: "node",
  target: "node22",
  format: "cjs",
  plugins: [rootAliasPlugin],
  sourcemap: false,
  legalComments: "none",
  logLevel: "info",
});

console.log(JSON.stringify({
  ok: true,
  entrypoint: "scripts/run-diana-worker.ts",
  outfile: "dist/worker/run-diana-worker.cjs",
}));
