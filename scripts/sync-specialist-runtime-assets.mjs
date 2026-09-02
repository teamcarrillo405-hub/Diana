import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const sourceRoot = join(projectRoot, "node_modules", "pyodide");
const destinationRoot = join(projectRoot, "public", "vendor", "pyodide");
const runtimeFiles = [
  "pyodide.mjs",
  "pyodide.asm.mjs",
  "pyodide.asm.wasm",
  "python_stdlib.zip",
  "pyodide-lock.json",
];

const packageManifest = JSON.parse(
  await readFile(join(sourceRoot, "package.json"), "utf8"),
);

await mkdir(destinationRoot, { recursive: true });
await Promise.all(runtimeFiles.map((fileName) =>
  copyFile(join(sourceRoot, fileName), join(destinationRoot, fileName))
));
await writeFile(
  join(destinationRoot, "runtime-manifest.json"),
  `${JSON.stringify({
    package: "pyodide",
    version: packageManifest.version,
    files: runtimeFiles,
  }, null, 2)}\n`,
  "utf8",
);
