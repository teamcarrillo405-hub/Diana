import { describe, expect, it } from "vitest";

import { SCREEN_DESIGN_SCREENS } from "@/lib/screendesign/screens";
import {
  SCREEN_DESIGN_FIXED_CLOCK,
  SCREEN_DESIGN_FIXTURE_SCENARIOS,
  SCREEN_DESIGN_GUARDED_STATES,
  SCREEN_DESIGN_OWNER_ALIASES,
  SCREEN_DESIGN_RECORD_KINDS,
} from "./screendesign-fixtures";

const REQUIRED_GUARDED_STATES = [
  "honest-empty",
  "ai-yellow",
  "ai-red",
  "billing-unavailable",
  "billing-configured",
  "lms-disconnected",
  "lms-error",
  "lms-connected",
  "share-active",
  "share-expired",
  "share-revoked",
  "group-member",
  "group-nonmember",
  "practice-no-score",
  "onboarding-invalid",
  "onboarding-valid",
  "reduced-motion",
] as const;

describe("SCREEN_DESIGN_FIXTURE_SCENARIOS", () => {
  it("declares one deterministic default scenario for every canonical screen", () => {
    const defaults = SCREEN_DESIGN_FIXTURE_SCENARIOS.filter(
      (scenario) => scenario.isDefault,
    );

    expect(defaults).toHaveLength(47);
    expect(defaults.map((scenario) => scenario.screenId).sort()).toEqual(
      SCREEN_DESIGN_SCREENS.map((screen) => screen.id).sort(),
    );
    expect(new Set(defaults.map((scenario) => scenario.screenId)).size).toBe(47);
  });

  it("uses unique scenario ids and matches registry auth, route, state, and action contracts", () => {
    const registryById = new Map(
      SCREEN_DESIGN_SCREENS.map((screen) => [screen.id, screen]),
    );

    expect(
      new Set(SCREEN_DESIGN_FIXTURE_SCENARIOS.map((scenario) => scenario.id)).size,
    ).toBe(SCREEN_DESIGN_FIXTURE_SCENARIOS.length);

    for (const scenario of SCREEN_DESIGN_FIXTURE_SCENARIOS) {
      const screen = registryById.get(scenario.screenId);
      expect(screen, scenario.id).toBeDefined();
      expect(scenario.authClass, scenario.id).toBe(screen?.authClass);
      expect(scenario.route.pathname, scenario.id).toBe(screen?.route);
      expect(scenario.route.stateSelector, scenario.id).toBe(screen?.stateSelector);
      expect(scenario.expectedPrimaryAction, scenario.id).toEqual({
        label: screen?.primaryAction.label,
        kind: screen?.primaryAction.kind,
      });
    }
  });

  it("pins stable synthetic copy, owner aliases, and a single fixed clock", () => {
    for (const scenario of SCREEN_DESIGN_FIXTURE_SCENARIOS) {
      expect(scenario.fixedClock, scenario.id).toBe(SCREEN_DESIGN_FIXED_CLOCK);
      expect(SCREEN_DESIGN_OWNER_ALIASES, scenario.id).toContain(
        scenario.ownerAlias,
      );
      expect(scenario.displayCopy.studentName, scenario.id).toBe("Grayson");
      expect(scenario.displayCopy.heading.trim(), scenario.id).not.toBe("");
      expect(scenario.displayCopy.primaryActionLabel, scenario.id).toBe(
        scenario.expectedPrimaryAction.label,
      );
      expect(JSON.stringify(scenario), scenario.id).not.toMatch(
        /password|service[_-]?role|secret|bearer|@[a-z0-9.-]+\.[a-z]{2,}/i,
      );
    }
  });

  it("declares every required guarded capability as a named scenario", () => {
    const declared = new Set(
      SCREEN_DESIGN_FIXTURE_SCENARIOS.flatMap(
        (scenario) => scenario.guardedStates,
      ),
    );

    expect([...declared].sort()).toEqual(
      expect.arrayContaining([...REQUIRED_GUARDED_STATES]),
    );
    for (const state of declared) {
      expect(SCREEN_DESIGN_GUARDED_STATES).toContain(state);
    }
  });

  it("uses only supported record factories with stable aliases and declared dependencies", () => {
    for (const scenario of SCREEN_DESIGN_FIXTURE_SCENARIOS) {
      const aliases = scenario.records.map((record) => record.alias);
      expect(new Set(aliases).size, scenario.id).toBe(aliases.length);

      for (const record of scenario.records) {
        expect(SCREEN_DESIGN_RECORD_KINDS, `${scenario.id}:${record.alias}`).toContain(
          record.kind,
        );
        for (const dependency of record.dependsOn ?? []) {
          expect(aliases, `${scenario.id}:${record.alias}`).toContain(dependency);
        }
      }
    }
  });

  it("declares a type-safe observable result for every primary action", () => {
    for (const scenario of SCREEN_DESIGN_FIXTURE_SCENARIOS) {
      const result = scenario.expectedPersistedResult;
      expect(["record", "navigation", "none"], scenario.id).toContain(
        result.kind,
      );

      if (result.kind === "record") {
        expect(SCREEN_DESIGN_RECORD_KINDS, scenario.id).toContain(
          result.recordKind,
        );
        expect(result.alias.trim(), scenario.id).not.toBe("");
        expect(
          scenario.records.some((record) => record.alias === result.alias),
          scenario.id,
        ).toBe(true);
        expect(result.field.trim(), scenario.id).not.toBe("");
      } else if (result.kind === "navigation") {
        expect(result.destination, scenario.id).toMatch(/^\//);
      } else {
        expect(result.reason.trim(), scenario.id).not.toBe("");
      }
    }
  });
});
