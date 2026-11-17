import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);

describe("installed file matcher security", () => {
  it("finishes repeated wildcard attacks in an isolated process", () => {
    const program = `
      const assert = require('node:assert/strict');
      const matcher = require(process.argv[1]);
      const attacks = [
        ['+(*a)', 'a'.repeat(1000) + '!'],
        ['*(*a)', 'a'.repeat(1000) + '!'],
        ['+(*)c', 'a'.repeat(1000) + '!'],
        ['+(a*)b', 'a'.repeat(1000) + '!'],
        ['+(**a)', 'a'.repeat(1000) + '!'],
        ['+(*[a])', 'a'.repeat(1000) + '!'],
        ['+(?*a)', 'a'.repeat(1000) + '!'],
        ['+(a*b)c', 'ab'.repeat(500) + '!'],
        ['x+(*a)y', 'x' + 'a'.repeat(1000) + '!'],
        ['*(a*)b', 'a'.repeat(1000) + '!'],
      ];
      const modes = [
        {}, { capture: true }, { dot: true }, { windows: true },
        { bash: true }, { nocase: true }, { windows: true, capture: true },
      ];
      for (const options of modes) {
        for (const [pattern, input] of attacks) {
          assert.equal(matcher.isMatch(input, pattern, options), false);
        }
      }
    `;

    expect(() => execFileSync(process.execPath, ["-e", program, require.resolve("picomatch")], {
      timeout: 3_000,
      windowsHide: true,
      stdio: "pipe",
    })).not.toThrow();
  });

  it("preserves the file matching used by styles, tests, and file watchers", () => {
    const micromatch = require("micromatch");
    const anymatch = require("anymatch");
    const matcher = require("picomatch");
    const files = [
      "app/(app)/classes/page.tsx",
      "components/course-insight.tsx",
      "components/course-insight.test.tsx",
      "lib/scoring/next-five-minutes.ts",
      "public/assets/classes/academic-hall-4k.webp",
    ];

    expect(micromatch(files, ["**/*.{ts,tsx}", "!**/*.test.*"])).toEqual([
      files[0], files[1], files[3],
    ]);
    expect(anymatch(["**/*.ts", "!**/*.test.ts"], files[3])).toBe(true);
    expect(anymatch(["**/*.ts", "!**/*.test.ts"], "lib/scoring/next-five-minutes.test.ts")).toBe(false);
    expect(matcher.isMatch(files[4], "public/assets/**/+(academic-hall|college-classroom)-*.webp")).toBe(true);
    expect(matcher.scan("app/**/classes/*.tsx").isGlob).toBe(true);
  });

  it("discovers the real Classes files through the build tool's glob library", () => {
    const { globSync } = require("tinyglobby");
    const files = globSync(["app/**/classes/*.tsx", "components/course-insight.tsx"], {
      cwd: process.cwd(),
      ignore: ["**/*.test.tsx"],
    });

    expect(files).toContain("app/(app)/classes/page.tsx");
    expect(files).toContain("app/(app)/classes/my-classes-grid.tsx");
    expect(files).toContain("components/course-insight.tsx");
    expect(files.some((file: string) => file.endsWith(".test.tsx"))).toBe(false);
  });
});
