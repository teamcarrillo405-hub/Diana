import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

type VercelConfig = { crons: Array<{ path: string; schedule: string }> };

const config = JSON.parse(
  readFileSync(resolve(process.cwd(), "vercel.json"), "utf8"),
) as VercelConfig;

describe("scheduled route observability coverage", () => {
  it("covers every vercel schedule after its authorization gate", () => {
    expect(config.crons.length).toBeGreaterThan(0);

    for (const cron of config.crons) {
      const routeFile = resolve(process.cwd(), `app${cron.path}/route.ts`);
      expect(existsSync(routeFile), `${cron.path} route file`).toBe(true);
      const source = readFileSync(routeFile, "utf8");
      const authIndex = source.indexOf("Authorization required") >= 0
        ? source.indexOf("Authorization required")
        : source.indexOf("Not authorized");
      const observerIndex = source.indexOf("return runObservedCronJob({");

      expect(source, `${cron.path} imports the ledger wrapper`).toContain(
        "@/lib/operations/cron-run",
      );
      expect(source, `${cron.path} declares its exact route name`).toContain(
        `routeName: "${cron.path}"`,
      );
      expect(source, `${cron.path} avoids direct bearer comparison`).not.toMatch(
        /authorization[^\n]*[!=]==?[^\n]*Bearer/i,
      );
      expect(authIndex, `${cron.path} has an authorization rejection`).toBeGreaterThan(-1);
      expect(observerIndex, `${cron.path} invokes observability`).toBeGreaterThan(authIndex);
    }
  });
});
