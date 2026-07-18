import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  SCREEN_DESIGN_NAV_OWNERS,
  STUDENT_NAV_DESTINATIONS,
  getScreenDesignRouteOwnerFile,
  getStudentNavOwner,
  screenDesignStateKey,
} from "@/lib/navigation";
import { SCREEN_DESIGN_FIXTURE_SCENARIOS } from "@/lib/qa/screendesign-fixtures";
import { SCREEN_DESIGN_SCREENS } from "@/lib/screendesign/screens";

const root = process.cwd();

describe("ScreenDesign canonical route and state coverage", () => {
  it("resolves every one of the 47 canonical states to a real App Router owner", () => {
    expect(SCREEN_DESIGN_SCREENS).toHaveLength(47);

    const stateKeys = SCREEN_DESIGN_SCREENS.map(screenDesignStateKey);
    expect(new Set(stateKeys).size).toBe(47);

    for (const screen of SCREEN_DESIGN_SCREENS) {
      const ownerFile = getScreenDesignRouteOwnerFile(screen);
      expect(ownerFile, `${screen.id} should declare a route owner`).toMatch(
        /^app\//u,
      );
      expect(
        existsSync(join(root, ownerFile)),
        `${screen.id} should resolve to ${ownerFile}`,
      ).toBe(true);
    }
  });

  it("assigns every authenticated canonical state to exactly one locked primary destination", () => {
    expect(STUDENT_NAV_DESTINATIONS.map(({ label, href }) => ({ label, href }))).toEqual([
      { label: "Today", href: "/dashboard" },
      { label: "Work", href: "/assignments" },
      { label: "Classes", href: "/classes" },
      { label: "Calendar", href: "/calendar" },
      { label: "More", href: "/settings" },
    ]);

    const authenticated = SCREEN_DESIGN_SCREENS.filter(
      (screen) => screen.authClass === "authenticated",
    );
    expect(SCREEN_DESIGN_NAV_OWNERS.size).toBe(authenticated.length);

    for (const screen of authenticated) {
      const owner = SCREEN_DESIGN_NAV_OWNERS.get(screen.id);
      expect(owner, `${screen.id} should have one primary owner`).toBeDefined();
      expect(STUDENT_NAV_DESTINATIONS.filter(({ label }) => label === owner)).toHaveLength(1);
      expect(getStudentNavOwner(screen.route)).toBe(owner);
    }

    for (const screen of SCREEN_DESIGN_SCREENS.filter(
      (candidate) => candidate.authClass === "public-token",
    )) {
      expect(SCREEN_DESIGN_NAV_OWNERS.has(screen.id)).toBe(false);
    }
  });

  it("keeps canonical route owners free of prohibited legacy presentation entry points", () => {
    const ownerFiles = new Set(
      SCREEN_DESIGN_SCREENS.map(getScreenDesignRouteOwnerFile),
    );

    for (const ownerFile of ownerFiles) {
      const source = readFileSync(join(root, ownerFile), "utf8");
      expect(source, ownerFile).not.toMatch(
        /(?:TodayGamePlan|NexusArcade|Nexus|MissionControl|PageShell|AppTopNav)/u,
      );
    }
  });

  it("pairs every visible primary action with an executable or truthfully guarded fixture contract", () => {
    const defaultScenarios = SCREEN_DESIGN_FIXTURE_SCENARIOS.filter(
      (scenario) => scenario.isDefault,
    );

    expect(defaultScenarios).toHaveLength(47);

    for (const screen of SCREEN_DESIGN_SCREENS) {
      expect(
        screen.primaryAction.label.trim(),
        `${screen.id} should expose a named primary action`,
      ).not.toBe("");
      expect(
        screen.primaryAction.contract.trim(),
        `${screen.id} should document its primary action contract`,
      ).not.toBe("");
      expect(
        screen.primaryAction.contract,
        `${screen.id} should not ship a placeholder action contract`,
      ).not.toMatch(/\b(?:todo|placeholder|prototype only|coming soon)\b/iu);

      const scenario = defaultScenarios.find(
        (candidate) => candidate.screenId === screen.id,
      );
      expect(
        scenario,
        `${screen.id} should have one default executable fixture scenario`,
      ).toBeDefined();
      expect(scenario?.expectedPrimaryAction).toEqual({
        label: screen.primaryAction.label,
        kind: screen.primaryAction.kind,
      });
      expect(
        scenario?.guardedStates.length,
        `${screen.id} should declare at least one guarded state`,
      ).toBeGreaterThan(0);

      if (screen.authClass === "public-token") {
        expect(
          scenario?.ownerAlias,
          `${screen.id} should use the isolated public owner fixture`,
        ).toBe("qa-public-owner");
        expect(
          scenario?.route.params.token,
          `${screen.id} should resolve through a scoped token route`,
        ).toBe("share-active");
      }
    }
  });
});
