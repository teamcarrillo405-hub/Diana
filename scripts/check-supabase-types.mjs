import { readFile } from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";

const CLI_VERSION = "2.111.0";
const GENERATED_TYPES_PATH = path.join(process.cwd(), "lib", "supabase", "types.ts");
const APPLICATION_TYPES_MARKER =
  "// Application-level unions constrained by database checks.";

const cliArgs = [
  "--yes",
  `supabase@${CLI_VERSION}`,
  "gen",
  "types",
  "typescript",
  "--linked",
  "--schema",
  "public",
];
const isWindows = process.platform === "win32";
const command = isWindows ? process.env.ComSpec ?? "cmd.exe" : "npx";
const commandArgs = isWindows
  ? ["/d", "/s", "/c", `npx ${cliArgs.join(" ")}`]
  : cliArgs;
const result = spawnSync(
  command,
  commandArgs,
  {
    cwd: process.cwd(),
    encoding: "utf8",
  },
);

if (result.status !== 0) {
  process.stderr.write(
    result.stderr
      || result.error?.message
      || "Supabase type generation did not complete.\n",
  );
  process.exit(result.status ?? 1);
}

const checkedIn = await readFile(GENERATED_TYPES_PATH, "utf8");
const markerIndex = checkedIn.indexOf(APPLICATION_TYPES_MARKER);
if (markerIndex === -1) {
  throw new Error(`Missing application type marker in ${GENERATED_TYPES_PATH}`);
}

const normalize = (value) => value.replaceAll("\r\n", "\n").trimEnd();
const generated = normalize(result.stdout);
const checkedInGenerated = normalize(checkedIn.slice(0, markerIndex));

if (generated !== checkedInGenerated) {
  const generatedLines = generated.split("\n");
  const checkedInLines = checkedInGenerated.split("\n");
  const mismatch = generatedLines.findIndex(
    (line, index) => line !== checkedInLines[index],
  );
  const lineNumber = mismatch === -1
    ? Math.min(generatedLines.length, checkedInLines.length) + 1
    : mismatch + 1;
  process.stderr.write(
    `Supabase types drifted from linked staging at line ${lineNumber}. Regenerate lib/supabase/types.ts with Supabase CLI ${CLI_VERSION}.\n`,
  );
  process.exit(1);
}

process.stdout.write(
  `Supabase generated types match linked staging (CLI ${CLI_VERSION}).\n`,
);
