import type { SupabaseClient } from "@supabase/supabase-js";
import { afterEach, describe, expect, it, vi } from "vitest";
import { syncLmsAssignments } from "./sync";
import type { NormalizedAssignment } from "./types";

type StoredAssignment = Record<string, unknown> & {
  id: string;
  owner_id: string;
  external_source: string;
  external_id: string;
  provider_missing_at: string | null;
};

type UpdateAttempt = {
  values: Record<string, unknown>;
  equalities: Record<string, unknown>;
  inclusions: Record<string, unknown[]>;
  nullChecks: Record<string, unknown>;
};

function assignment(overrides: Partial<StoredAssignment> = {}): StoredAssignment {
  return {
    id: "assignment-1",
    owner_id: "owner-1",
    external_source: "canvas",
    external_id: "canvas-1",
    provider_missing_at: null,
    class_id: "class-1",
    title: "Local title",
    status: "drafting",
    saved_work: { draft: "student work" },
    ...overrides,
  };
}

function syncClientDouble(
  initialAssignments: StoredAssignment[],
  options: { updateError?: string } = {},
) {
  const assignments = new Map(initialAssignments.map((row) => [row.id, { ...row }]));
  const updateAttempts: UpdateAttempt[] = [];
  const upsertConflicts: string[] = [];
  let sequence = initialAssignments.length;

  function matches(
    row: StoredAssignment,
    equalities: Map<string, unknown>,
    inclusions: Map<string, unknown[]>,
    nullChecks: Map<string, unknown>,
  ) {
    return [...equalities].every(([name, value]) => row[name] === value)
      && [...inclusions].every(([name, values]) => values.includes(row[name]))
      && [...nullChecks].every(([name, value]) => row[name] === value);
  }

  const from = vi.fn((table: string) => {
    if (table === "classes") {
      return {
        select: vi.fn(() => {
          const query = {
            eq: vi.fn(() => query),
            maybeSingle: vi.fn(async () => ({ data: { id: "class-1" }, error: null })),
          };
          return query;
        }),
      };
    }

    if (table !== "assignments") throw new Error(`unexpected table: ${table}`);

    return {
      select: vi.fn(() => {
        const equalities = new Map<string, unknown>();
        const inclusions = new Map<string, unknown[]>();
        const nullChecks = new Map<string, unknown>();
        const execute = () => ({
          data: [...assignments.values()].filter((row) =>
            matches(row, equalities, inclusions, nullChecks)),
          error: null,
        });
        const query = {
          eq: vi.fn((name: string, value: unknown) => {
            equalities.set(name, value);
            return query;
          }),
          in: vi.fn((name: string, values: unknown[]) => {
            inclusions.set(name, values);
            return query;
          }),
          is: vi.fn((name: string, value: unknown) => {
            nullChecks.set(name, value);
            return query;
          }),
          then: (
            resolve: (value: ReturnType<typeof execute>) => unknown,
            reject: (reason: unknown) => unknown,
          ) => Promise.resolve(execute()).then(resolve, reject),
        };
        return query;
      }),
      update: vi.fn((values: Record<string, unknown>) => {
        const equalities = new Map<string, unknown>();
        const inclusions = new Map<string, unknown[]>();
        const nullChecks = new Map<string, unknown>();
        const execute = () => {
          updateAttempts.push({
            values,
            equalities: Object.fromEntries(equalities),
            inclusions: Object.fromEntries(inclusions),
            nullChecks: Object.fromEntries(nullChecks),
          });
          if (options.updateError) {
            return { data: null, error: { message: options.updateError } };
          }
          for (const [id, row] of assignments) {
            if (matches(row, equalities, inclusions, nullChecks)) {
              assignments.set(id, { ...row, ...values });
            }
          }
          return { data: null, error: null };
        };
        const query = {
          eq: vi.fn((name: string, value: unknown) => {
            equalities.set(name, value);
            return query;
          }),
          in: vi.fn((name: string, values: unknown[]) => {
            inclusions.set(name, values);
            return query;
          }),
          is: vi.fn((name: string, value: unknown) => {
            nullChecks.set(name, value);
            return query;
          }),
          then: (
            resolve: (value: ReturnType<typeof execute>) => unknown,
            reject: (reason: unknown) => unknown,
          ) => Promise.resolve(execute()).then(resolve, reject),
        };
        return query;
      }),
      upsert: vi.fn(async (
        values: Array<Record<string, unknown>>,
        upsertOptions: { onConflict: string },
      ) => {
        upsertConflicts.push(upsertOptions.onConflict);
        for (const value of values) {
          const current = [...assignments.values()].find((row) =>
            row.owner_id === value.owner_id
            && row.external_source === value.external_source
            && row.external_id === value.external_id);
          const id = current?.id ?? `assignment-${++sequence}`;
          assignments.set(id, {
            ...current,
            ...value,
            id,
            owner_id: String(value.owner_id),
            external_source: String(value.external_source),
            external_id: String(value.external_id),
            provider_missing_at: Object.hasOwn(value, "provider_missing_at")
              ? value.provider_missing_at as string | null
              : current?.provider_missing_at ?? null,
          });
        }
        return { error: null };
      }),
    };
  });

  return {
    assignments,
    client: { from } as unknown as SupabaseClient,
    updateAttempts,
    upsertConflicts,
  };
}

function incomingAssignment(overrides: Partial<NormalizedAssignment> = {}): NormalizedAssignment {
  return {
    external_id: "canvas-1",
    title: "Provider title",
    description: null,
    due_at: null,
    external_source: "canvas",
    external_course_id: "course-1",
    external_course_name: "Biology",
    ...overrides,
  };
}

afterEach(() => {
  vi.useRealTimers();
});

describe("syncLmsAssignments provider-missing persistence", () => {
  it("tombstones provider-missing assignments without changing lifecycle or local work", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-01T18:00:00.000Z"));
    const local = assignment();
    const otherOwner = assignment({
      id: "assignment-other-owner",
      owner_id: "owner-2",
      external_id: "canvas-2",
    });
    const otherProvider = assignment({
      id: "assignment-other-provider",
      external_source: "google_classroom",
      external_id: "course-1:work-1",
    });
    const fixture = syncClientDouble([local, otherOwner, otherProvider]);

    const result = await syncLmsAssignments(
      fixture.client,
      "owner-1",
      "canvas",
      [],
    );

    expect(result).toEqual({
      imported: 0,
      skipped: 0,
      source: "canvas",
      removed: 1,
      reconciliation: { providerMissing: 1, preserved: 1, deleted: 0 },
    });
    expect(fixture.assignments.get(local.id)).toMatchObject({
      status: "drafting",
      saved_work: { draft: "student work" },
      provider_missing_at: "2026-09-01T18:00:00.000Z",
    });
    expect(fixture.assignments.get(otherOwner.id)?.provider_missing_at).toBeNull();
    expect(fixture.assignments.get(otherProvider.id)?.provider_missing_at).toBeNull();
    expect(fixture.updateAttempts).toEqual([{
      values: { provider_missing_at: "2026-09-01T18:00:00.000Z" },
      equalities: { owner_id: "owner-1", external_source: "canvas" },
      inclusions: { id: ["assignment-1"] },
      nullChecks: { provider_missing_at: null },
    }]);
  });

  it("keeps the first tombstone timestamp across duplicate missing syncs", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-01T18:00:00.000Z"));
    const fixture = syncClientDouble([assignment()]);

    await syncLmsAssignments(fixture.client, "owner-1", "canvas", []);
    vi.setSystemTime(new Date("2026-09-01T19:00:00.000Z"));
    await syncLmsAssignments(fixture.client, "owner-1", "canvas", []);

    expect(fixture.assignments.get("assignment-1")?.provider_missing_at)
      .toBe("2026-09-01T18:00:00.000Z");
    expect(fixture.updateAttempts).toHaveLength(2);
  });

  it("restores a reappearing assignment through the stable dedup key and preserves local work", async () => {
    const fixture = syncClientDouble([assignment({
      provider_missing_at: "2026-08-31T18:00:00.000Z",
    })]);

    await syncLmsAssignments(
      fixture.client,
      "owner-1",
      "canvas",
      [incomingAssignment()],
    );
    await syncLmsAssignments(
      fixture.client,
      "owner-1",
      "canvas",
      [incomingAssignment({ title: "Provider title updated" })],
    );

    expect(fixture.assignments.size).toBe(1);
    expect(fixture.assignments.get("assignment-1")).toMatchObject({
      title: "Provider title updated",
      status: "drafting",
      saved_work: { draft: "student work" },
      provider_missing_at: null,
    });
    expect(fixture.upsertConflicts).toEqual([
      "owner_id,external_source,external_id",
      "owner_id,external_source,external_id",
    ]);
  });

  it("fails the sync when a provider-missing tombstone cannot be persisted", async () => {
    const fixture = syncClientDouble([assignment()], { updateError: "write denied" });

    await expect(syncLmsAssignments(
      fixture.client,
      "owner-1",
      "canvas",
      [],
    )).rejects.toThrow("persist provider-missing assignments: write denied");
    expect(fixture.assignments.get("assignment-1")?.provider_missing_at).toBeNull();
  });
});
