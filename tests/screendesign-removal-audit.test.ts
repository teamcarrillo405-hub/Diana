import { describe, expect, it } from "vitest";

import { scanTextForProhibitedPresentation } from "../scripts/verify-screendesign-removal";

describe("ScreenDesign removal audit", () => {
  it("rejects deleted presentation imports, selectors, remote media, and copy", () => {
    const source = `
      import { PageShell } from "@/app/(app)/page-shell";
      import "@/app/(app)/quiet-command.module.css";
      import { QuietCommandLanding } from "@/components/landing/quiet-command-landing";
      import "@/styles/quiet-command.css";
      const remote = "https://media.screensdesign.com/legacy/coach.png";
      export function Legacy() {
        return <main className="pm-dashboard qc-page student-today-command">Mission Control</main>;
      }
    `;

    const findings = scanTextForProhibitedPresentation(source, "fixture.tsx");
    const ruleIds = findings.map((finding) => finding.ruleId);

    expect(ruleIds).toContain("deleted-module");
    expect(ruleIds).toContain("legacy-selector");
    expect(ruleIds).toContain("remote-media-host");
    expect(ruleIds).toContain("legacy-copy");
  });

  it("allows canonical ScreenDesign primitives and local assets", () => {
    const source = `
      import { StudentBottomNav } from "@/components/screen-design/student-bottom-nav";
      const localAsset = "/screendesign/assets/coach-diana.webp";
      export function Canonical() {
        return <main className="sd-source-viewport"><StudentBottomNav /></main>;
      }
    `;

    expect(scanTextForProhibitedPresentation(source, "canonical.tsx")).toEqual([]);
  });
});
