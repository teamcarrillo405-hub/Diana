import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

function candidatePaths(): string[] {
  const extension = process.platform === "win32" ? ".exe" : "";
  const envRoot = process.env.GSTACK_ROOT;
  return [
    envRoot ? join(envRoot, "browse", "dist", `browse${extension}`) : "",
    join(process.cwd(), ".agents", "skills", "gstack", "browse", "dist", `browse${extension}`),
    join(homedir(), ".agents", "skills", "gstack", "browse", "dist", `browse${extension}`),
    join(homedir(), ".codex", "skills", "gstack", "browse", "dist", `browse${extension}`),
    join(homedir(), ".claude", "skills", "gstack", "browse", "dist", `browse${extension}`),
  ].filter(Boolean);
}

function resolveBrowseBinary(): string {
  const match = candidatePaths().find((path) => existsSync(path));
  if (!match) {
    throw new Error(
      [
        "No runnable gstack browse binary was found.",
        "Set GSTACK_ROOT to a full gstack install, or run the gstack setup command for this machine.",
      ].join(" "),
    );
  }
  return resolve(match);
}

const browseBinary = resolveBrowseBinary();
const args = process.argv.slice(2);
if (args.length === 0 || args.includes("--where")) {
  console.log(browseBinary);
  if (args.length === 0) process.exit(0);
}

const forwardedArgs = args.filter((arg) => arg !== "--where");
if (forwardedArgs.length === 0) process.exit(0);

const result = spawnSync(browseBinary, forwardedArgs, {
  cwd: process.cwd(),
  encoding: "utf8",
  stdio: "inherit",
  windowsHide: true,
});

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}
process.exit(result.status ?? 1);
