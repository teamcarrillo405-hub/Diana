import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import {
  createPaperclipGstackDashboardQaRequest,
  formatWorkRequestForPaperclip,
} from "../lib/integrations/command-center-handoff";

function argValue(name: string): string | null {
  const prefix = `--${name}=`;
  const match = process.argv.find((arg) => arg.startsWith(prefix));
  return match ? match.slice(prefix.length) : null;
}

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function main() {
  const id = argValue("id") ?? `diana-dashboard-qa-${new Date().toISOString().slice(0, 10)}`;
  const goalId = argValue("goal") ?? "goal-diana-command-center";
  const writePath = argValue("write");
  const request = createPaperclipGstackDashboardQaRequest({
    id,
    goalId,
    readOnly: !hasFlag("allow-edits"),
  });
  const payload = formatWorkRequestForPaperclip(request);

  if (writePath) {
    const output = join(process.cwd(), writePath);
    mkdirSync(dirname(output), { recursive: true });
    writeFileSync(output, payload);
    console.log(`command-center handoff written: ${writePath}`);
    return;
  }

  process.stdout.write(payload);
}

main();
