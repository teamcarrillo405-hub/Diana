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
});
