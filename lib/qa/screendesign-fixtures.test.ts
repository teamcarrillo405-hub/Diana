import { describe, expect, it } from "vitest";

import { SCREEN_DESIGN_SCREENS } from "@/lib/screendesign/screens";
import {
  buildScreenDesignSeedPlan,
  resetScreenDesignOwnerWithStore,
  seedScreenDesignScenarioWithStore,
  type ScreenDesignPreparedSeedRow,
  type ScreenDesignSeedStore,
  type ScreenDesignSeedTable,
  type ScreenDesignOwnerColumn,
} from "./grayson-demo";
import {
  SCREEN_DESIGN_FIXED_CLOCK,
  SCREEN_DESIGN_FIXTURE_SCENARIOS,
  SCREEN_DESIGN_GUARDED_STATES,
  SCREEN_DESIGN_OWNER_ALIASES,
  SCREEN_DESIGN_RECORD_KINDS,
} from "./screendesign-fixtures";

const PRIMARY_OWNER_ID = "11111111-1111-4111-8111-111111111111";
const SECONDARY_OWNER_ID = "22222222-2222-4222-8222-222222222222";

class MemoryScreenDesignSeedStore implements ScreenDesignSeedStore {
  rows: ScreenDesignPreparedSeedRow[] = [];

  async clearOwned(
    table: ScreenDesignSeedTable,
    ownerColumn: ScreenDesignOwnerColumn,
    ownerId: string,
  ) {
    this.rows = this.rows.filter(
      (row) =>
        !(
          row.table === table &&
          row.ownerColumn === ownerColumn &&
          row.ownerId === ownerId
        ),
    );
  }

  async insert(row: ScreenDesignPreparedSeedRow) {
    expect(row.values[row.ownerColumn]).toBe(row.ownerId);
    this.rows.push(row);
  }

  rowsFor(ownerId: string) {
    return this.rows.filter((row) => row.ownerId === ownerId);
  }
}

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

describe("ScreenDesign owner-scoped seed contract", () => {
  it("builds real table rows for every declared factory with the selected owner on every row", () => {
    for (const scenario of SCREEN_DESIGN_FIXTURE_SCENARIOS) {
      const rows = buildScreenDesignSeedPlan(scenario, PRIMARY_OWNER_ID);
      expect(rows.length, scenario.id).toBeGreaterThanOrEqual(
        scenario.records.length,
      );

      for (const row of rows) {
        expect(row.ownerId, `${scenario.id}:${row.alias}`).toBe(PRIMARY_OWNER_ID);
        expect(row.values[row.ownerColumn], `${scenario.id}:${row.alias}`).toBe(
          PRIMARY_OWNER_ID,
        );
        expect(JSON.stringify(row.values), `${scenario.id}:${row.alias}`).not.toMatch(
          /password|service[_-]?role|secret|bearer|@[a-z0-9.-]+\.[a-z]{2,}/i,
        );
      }
    }
  });

  it("normalizes seeded rows to live database constraints and required relationships", () => {
    const allowedSignals = new Set([
      "energy",
      "completed",
      "dismissed",
      "started",
      "context_switch",
      "overwhelmed",
      "mood_checkin",
      "activity_log",
      "sleep_log",
    ]);
    const allowedLmsProviders = new Set([
      "canvas",
      "google_classroom",
      "ics",
      "clever",
    ]);
    const relationByTable: Partial<Record<ScreenDesignSeedTable, string>> = {
      assignments: "class_id",
      class_syllabi: "class_id",
      assignment_steps: "assignment_id",
      assignment_checklists: "assignment_id",
      submission_checklist: "assignment_id",
      task_signals: "assignment_id",
      assignment_time_log: "assignment_id",
      flashcard_reviews: "card_id",
      study_artifacts: "source_id",
      mastery_concepts: "class_id",
      mastery_events: "concept_id",
      ap_practice_attempts: "plan_id",
      portfolio_items: "portfolio_id",
      study_group_members: "group_id",
      study_group_sessions: "group_id",
    };

    for (const scenario of SCREEN_DESIGN_FIXTURE_SCENARIOS) {
      for (const row of buildScreenDesignSeedPlan(scenario, PRIMARY_OWNER_ID)) {
        const relation = relationByTable[row.table];
        if (relation) expect(row.values[relation], `${scenario.id}:${row.alias}`).toBeTruthy();
        if (row.table === "assignments") {
          expect(["canvas", "google_classroom", "ics", "clever"]).toContain(
            row.values.external_source,
          );
        }
        if (row.table === "task_signals") {
          expect(allowedSignals).toContain(row.values.kind);
        }
        if (row.table === "lms_connections") {
          expect(allowedLmsProviders).toContain(row.values.provider);
        }
        if (row.table === "sleep_logs") {
          expect(["rested", "ok", "rough"]).toContain(row.values.sleep_quality);
        }
        if (row.table === "study_group_sessions") {
          expect(["planned", "active", "done"]).toContain(row.values.status);
        }
      }
    }
  });

  it("is idempotent for one owner and returns aliases without auth ids or secrets", async () => {
    const store = new MemoryScreenDesignSeedStore();
    const first = await seedScreenDesignScenarioWithStore(
      store,
      PRIMARY_OWNER_ID,
      "qa-primary",
      "assignment-detail:default",
    );
    const firstCount = store.rowsFor(PRIMARY_OWNER_ID).length;
    const second = await seedScreenDesignScenarioWithStore(
      store,
      PRIMARY_OWNER_ID,
      "qa-primary",
      "assignment-detail:default",
    );

    expect(store.rowsFor(PRIMARY_OWNER_ID)).toHaveLength(firstCount);
    expect(second).toEqual(first);
    expect(second.aliases.map((record) => record.alias)).toContain(
      "assignment-main",
    );
    expect(JSON.stringify(second)).not.toContain(PRIMARY_OWNER_ID);
    expect(JSON.stringify(second)).not.toMatch(
      /password|email|service[_-]?role|secret|bearer/i,
    );
  });

  it("seeds assignment dependencies after their parent assignment rows", async () => {
    const store = new MemoryScreenDesignSeedStore();
    await seedScreenDesignScenarioWithStore(
      store,
      PRIMARY_OWNER_ID,
      "qa-primary",
      "focus-session-immersive:default",
    );

    const assignmentIndex = store.rows.findIndex(
      (row) => row.table === "assignments",
    );
    const timeLogIndex = store.rows.findIndex(
      (row) => row.table === "assignment_time_log",
    );

    expect(assignmentIndex).toBeGreaterThanOrEqual(0);
    expect(timeLogIndex).toBeGreaterThan(assignmentIndex);
  });

  it("cannot observe or reset a second synthetic owner's rows", async () => {
    const store = new MemoryScreenDesignSeedStore();
    await seedScreenDesignScenarioWithStore(
      store,
      PRIMARY_OWNER_ID,
      "qa-primary",
      "assignment-detail:default",
    );
    await seedScreenDesignScenarioWithStore(
      store,
      SECONDARY_OWNER_ID,
      "qa-secondary",
      "assignment-detail:default",
    );
    const secondaryRows = [...store.rowsFor(SECONDARY_OWNER_ID)];

    await resetScreenDesignOwnerWithStore(
      store,
      PRIMARY_OWNER_ID,
      "qa-primary",
    );

    expect(store.rowsFor(PRIMARY_OWNER_ID)).toHaveLength(0);
    expect(store.rowsFor(SECONDARY_OWNER_ID)).toEqual(secondaryRows);
    expect(
      store.rowsFor(SECONDARY_OWNER_ID).every((row) =>
        Object.values(row.values).every((value) => value !== PRIMARY_OWNER_ID),
      ),
    ).toBe(true);
  });

  it("rejects unknown scenarios, non-synthetic owner ids, and mismatched public owner aliases", async () => {
    const store = new MemoryScreenDesignSeedStore();

    await expect(
      seedScreenDesignScenarioWithStore(
        store,
        PRIMARY_OWNER_ID,
        "qa-primary",
        "not-a-screen:default",
      ),
    ).rejects.toThrow("Unknown ScreenDesign fixture scenario");
    await expect(
      seedScreenDesignScenarioWithStore(
        store,
        "production-user",
        "qa-primary",
        "assignment-detail:default",
      ),
    ).rejects.toThrow("synthetic auth UUID");
    await expect(
      seedScreenDesignScenarioWithStore(
        store,
        PRIMARY_OWNER_ID,
        "qa-primary",
        "external-scout-view:default",
      ),
    ).rejects.toThrow("not assigned to this QA owner alias");
  });
});
