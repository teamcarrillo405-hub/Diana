import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

import { syncLmsAssignments } from "./sync";
import type { NormalizedAssignment } from "./types";

type StoredAssignment = Record<string, unknown> & {
  id: string;
  owner_id: string;
  external_source: string;
  external_id: string;
};

function syncClientDouble() {
  const assignments = new Map<string, StoredAssignment>();
  const upsertConflicts: string[] = [];
  let sequence = 0;

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

    if (table === "assignments") {
      return {
        select: vi.fn(() => {
          const filters = new Map<string, unknown>();
          const execute = () => ({
            data: [...assignments.values()].filter((row) =>
              [...filters].every(([name, value]) => row[name] === value)),
            error: null,
          });
          const query = {
            eq: vi.fn((name: string, value: unknown) => {
              filters.set(name, value);
              return query;
            }),
            in: vi.fn(async (name: string, values: unknown[]) => {
              const allowed = new Set(values);
              const result = execute();
              return {
                ...result,
                data: result.data.filter((row) => allowed.has(row[name])),
              };
            }),
            then: (
              resolve: (value: ReturnType<typeof execute>) => unknown,
              reject: (reason: unknown) => unknown,
            ) => Promise.resolve(execute()).then(resolve, reject),
          };
          return query;
        }),
        update: vi.fn((changes: Record<string, unknown>) => {
          const equals = new Map<string, unknown>();
          let idSet: Set<unknown> | null = null;
          const query = {
            eq: vi.fn((name: string, value: unknown) => {
              equals.set(name, value);
              return query;
            }),
            in: vi.fn((name: string, values: unknown[]) => {
              if (name === "id") idSet = new Set(values);
              return query;
            }),
            is: vi.fn(async (name: string, value: unknown) => {
              for (const [key, row] of assignments) {
                const matchesEquals = [...equals].every(
                  ([field, expected]) => row[field] === expected,
                );
                const matchesIds = idSet === null || idSet.has(row.id);
                if (matchesEquals && matchesIds && row[name] === value) {
                  assignments.set(key, { ...row, ...changes });
                }
              }
              return { error: null };
            }),
          };
          return query;
        }),
        upsert: vi.fn(async (
          values: Array<Record<string, unknown>>,
          options: { onConflict: string },
        ) => {
          upsertConflicts.push(options.onConflict);
          for (const value of values) {
            const key = `${String(value.owner_id)}:${String(value.external_source)}:${String(value.external_id)}`;
            const current = assignments.get(key);
            assignments.set(key, {
              ...value,
              id: current?.id ?? `assignment-${++sequence}`,
              owner_id: String(value.owner_id),
              external_source: String(value.external_source),
              external_id: String(value.external_id),
            });
          }
          return { error: null };
        }),
      };
    }

    throw new Error(`unexpected sync table: ${table}`);
  });

  return {
    assignments,
    client: { from } as unknown as SupabaseClient,
    from,
    upsertConflicts,
  };
}

describe("provider canary sync fixtures", () => {
  it("upserts a replay by stable identity and preserves provider-missing local work", async () => {
    const fixture = syncClientDouble();
    const original: NormalizedAssignment = {
      external_id: "course-201:work-601",
      provider_assignment_id: "work-601",
      title: "Original title",
      description: null,
      due_at: null,
      external_source: "google_classroom",
      external_course_id: "course-201",
      external_course_name: "Canary Biology",
    };

    const first = await syncLmsAssignments(
      fixture.client,
      "owner-1",
      "google_classroom",
      [original],
    );
    const replay = await syncLmsAssignments(
      fixture.client,
      "owner-1",
      "google_classroom",
      [{ ...original, title: "Updated title" }],
    );
    const removal = await syncLmsAssignments(
      fixture.client,
      "owner-1",
      "google_classroom",
      [],
    );

    expect(first.imported).toBe(1);
    expect(replay.imported).toBe(1);
    expect(fixture.assignments.size).toBe(1);
    expect([...fixture.assignments.values()][0].title).toBe("Updated title");
    expect(fixture.upsertConflicts).toEqual([
      "owner_id,external_source,external_id",
      "owner_id,external_source,external_id",
    ]);
    expect(removal).toMatchObject({
      removed: 1,
      reconciliation: { providerMissing: 1, preserved: 1, deleted: 0 },
    });
    expect(fixture.assignments.size).toBe(1);
    expect([...fixture.assignments.values()][0].provider_missing_at).toEqual(expect.any(String));
    expect(fixture.from).not.toHaveBeenCalledWith("assignment_sources");
  });
});
