import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migrationsDirectory = join(process.cwd(), "supabase/migrations");
const historicalMigrationNames = [
  "20260811103918_assignment_problem_progress.sql",
  "20260811120000_assignment_problem_progress.sql",
] as const;
const historicalContentHashes = {
  "20260811103918_assignment_problem_progress.sql":
    "5539306f55be4c8621cc6124d40fb19d317146cb288769c37ec00636ed0a6fa6",
  "20260811120000_assignment_problem_progress.sql":
    "34eefacb6a7e61b65401e14fc109b38ded7f8145c6b1df7fcd348b6967e5d23e",
} as const;
const correctiveMigrationName =
  "20260831110000_assignment_problem_progress_contract.sql";
const stagingHead = "20260925172424";
const releaseHead = "20260925172424";
// The historical beta gate remains pinned to its release head. Later forward
// migrations are tracked here, regardless of whether staging has applied them.
const expectedPostReleaseVersions: readonly string[] = [
  "20260925201612",
  "20260925202654",
  "20260925203216",
  "20260926035237",
  "20260926051828",
  "20260926052006",
  "20260926071222",
  "20260926072354",
  "20260926110000",
  "20260926113000",
  "20260926120000",
  "20260928043131",
  "20260928043147",
  "20260929003416",
  "20260929034718",
  "20260929035711",
  "20260929135915",
  "20260929141355",
  "20261115203000",
  "20261116011830",
];
const sequentialTypeMigrations = [
  "20260901200000_assignment_provider_missing_tombstone.sql",
  "20260901210000_authoritative_lms_transition_service_boundary.sql",
  "20260901220000_lms_success_transition_guards.sql",
  "20260901230000_lms_grade_student_identity_binding.sql",
] as const;
const legacyUnterminatedMigrations = [
  "0017_share_links.sql",
  "20260731134000_share_token_digests.sql",
  "20260731140000_integration_credential_vault.sql",
];

function readMigration(name: string) {
  return readFileSync(join(migrationsDirectory, name), "utf8").replaceAll(
    "\r\n",
    "\n",
  );
}

function contentHash(sql: string) {
  return createHash("sha256").update(sql, "utf8").digest("hex");
}

function normalizedSemantics(sql: string) {
  return sql
    .replace(/^\s*begin;\s*$/gimu, "")
    .replace(/^\s*commit;\s*$/gimu, "")
    .replace(/;+/gu, ";")
    .replace(/\s+/gu, " ")
    .trim();
}

function generatedTypeBlock(source: string, name: string): string {
  const start = source.indexOf(`      ${name}: {`);
  expect(start, `missing generated type block ${name}`).toBeGreaterThanOrEqual(0);
  const next = source.slice(start + 1).search(/^      [a-z0-9_]+: \{$/mu);
  return next === -1
    ? source.slice(start)
    : source.slice(start, start + 1 + next);
}

function generatedShape(block: string, shape: "Row" | "Insert" | "Update"): string {
  const match = block.match(new RegExp(`        ${shape}: \\{([\\s\\S]*?)\\n        \\}`, "u"));
  expect(match, `missing generated ${shape} shape`).not.toBeNull();
  return match?.[1] ?? "";
}

function expectOrdered(source: string, values: readonly string[]): void {
  let previous = -1;
  for (const value of values) {
    const index = source.indexOf(value, previous + 1);
    expect(index, `missing ${value}`).toBeGreaterThan(previous);
    previous = index;
  }
}

function compactWhitespace(source: string): string {
  return source.replace(/\s+/gu, " ").trim();
}

describe("beta migration release", () => {
  it("keeps every migration readable, uniquely versioned, and terminated", () => {
    const migrationNames = readdirSync(migrationsDirectory)
      .filter((name) => name.endsWith(".sql"))
      .sort((left, right) => left.localeCompare(right));
    const unterminatedMigrations: string[] = [];
    const versions = migrationNames.map((name) => {
      expect(name).toMatch(/^\d+_[a-z0-9_]+\.sql$/u);
      const sql = readMigration(name);
      expect(sql.trim().length, `${name} is empty`).toBeGreaterThan(0);
      expect(sql.includes("\0"), `${name} contains a NUL byte`).toBe(false);
      if (!sql.trimEnd().endsWith(";")) {
        unterminatedMigrations.push(name);
      }

      const hasOuterBegin = /^\s*begin;\s*$/imu.test(sql);
      const hasOuterCommit = /^\s*commit;\s*$/imu.test(sql);
      expect(hasOuterBegin, `${name} has an unmatched transaction wrapper`).toBe(
        hasOuterCommit,
      );

      return name.split("_", 1)[0];
    });

    expect(new Set(versions).size).toBe(versions.length);
    expect(versions).toEqual([...versions].sort((left, right) =>
      left.localeCompare(right)));
    expect(unterminatedMigrations).toEqual(legacyUnterminatedMigrations);
  });

  it("pins both applied assignment-progress migrations as immutable history", () => {
    for (const name of historicalMigrationNames) {
      expect(contentHash(readMigration(name))).toBe(historicalContentHashes[name]);
    }
  });

  it("recognizes the historical pair as the only semantic duplicate", () => {
    const migrationNames = readdirSync(migrationsDirectory)
      .filter((name) => name.endsWith(".sql"))
      .sort((left, right) => left.localeCompare(right));
    const bySemantics = new Map<string, string[]>();

    for (const name of migrationNames) {
      const semantics = normalizedSemantics(readMigration(name));
      bySemantics.set(semantics, [...(bySemantics.get(semantics) ?? []), name]);
    }

    expect(
      [...bySemantics.values()].filter((names) => names.length > 1),
    ).toEqual([[...historicalMigrationNames]]);
  });

  it("uses a forward-only migration to make the final RPC ACL explicit", () => {
    const migration = readMigration(correctiveMigrationName).toLowerCase();

    expect(migration).toContain(
      "alter function public.merge_assignment_problem_work(uuid, jsonb)\n  security invoker;",
    );
    expect(migration).toContain("set search_path = public, pg_temp;");
    expect(migration).toContain("from public, anon;");
    expect(migration).toContain("to authenticated, service_role;");
    expect(migration).not.toMatch(/^\s*(begin|commit);\s*$/gimu);
    expect(migration).not.toMatch(/\b(create|alter|drop)\s+table\b/iu);
    expect(migration).not.toMatch(/\b(insert|update|delete|truncate)\b/iu);
  });

  it("pins the historical release head and later forward migration set", () => {
    const migrationVersions = readdirSync(migrationsDirectory)
      .filter((name) => name.endsWith(".sql"))
      .map((name) => name.split("_", 1)[0])
      .filter((version) => BigInt(version) > BigInt(stagingHead))
      .sort((left, right) => left.localeCompare(right));
    const releaseGate = readFileSync(
      join(
        process.cwd(),
        "supabase/tests/scripts/beta-migration-release.ps1",
      ),
      "utf8",
    );

    expect(migrationVersions).toEqual(expectedPostReleaseVersions);
    expect(
      readdirSync(migrationsDirectory).some((name) => name.startsWith(`${releaseHead}_`)),
    ).toBe(true);
    expect(releaseGate).toContain(`$stagingHead = "${stagingHead}"`);
    expect(releaseGate).toContain(`$releaseHead = "${releaseHead}"`);
  });

  it("tracks the opt-in, owner-isolated daily support schema and generated shapes", () => {
    const migration = compactWhitespace(readMigration("20261115203000_student_daily_support_preferences.sql").toLowerCase());
    const generatedTypes = readFileSync(join(process.cwd(), "lib/supabase/types.ts"), "utf8");
    const support = generatedTypeBlock(generatedTypes, "student_daily_support_needs");
    const profiles = generatedTypeBlock(generatedTypes, "profiles");

    expect(migration).toContain("tutor_personalization_enabled boolean not null default false");
    expect(migration).toContain("owner_id uuid primary key references auth.users(id) on delete cascade");
    expect(migration).toContain("need text not null check (need in ('food', 'water', 'break'))");
    expect(migration).toContain("new.updated_at := now();");
    expect(migration).toContain("new.expires_at := now() + interval '24 hours';");
    expect(migration).toContain("before insert or update on public.student_daily_support_needs");
    expect(migration).toContain("alter table public.student_daily_support_needs enable row level security");
    for (const operation of ["select", "insert", "update", "delete"]) {
      expect(migration).toContain(`create policy student_daily_support_${operation}`);
      expect(migration).toContain(`for ${operation} to authenticated`);
    }
    expect(migration.match(/owner_id = \(select auth\.uid\(\)\)/gu)).toHaveLength(5);
    expect(migration).toContain("revoke all on public.student_daily_support_needs from public, anon");
    expect(migration).toContain("grant select, insert, update, delete on public.student_daily_support_needs to authenticated");
    for (const field of ["owner_id: string", "need: string", "updated_at: string", "expires_at: string"]) {
      expect(generatedShape(support, "Row")).toContain(field);
    }
    expect(generatedShape(profiles, "Row")).toContain("tutor_personalization_enabled: boolean");
    expect(generatedShape(profiles, "Insert")).toContain("tutor_personalization_enabled?: boolean");
    expect(generatedShape(profiles, "Update")).toContain("tutor_personalization_enabled?: boolean");
  });

  it("represents migrations 200000 through 230000 in sequential schema order", () => {
    const generatedTypes = readFileSync(
      join(process.cwd(), "lib/supabase/types.ts"),
      "utf8",
    );
    const migrationNames = readdirSync(migrationsDirectory)
      .filter((name) => sequentialTypeMigrations.includes(
        name as (typeof sequentialTypeMigrations)[number],
      ))
      .sort((left, right) => left.localeCompare(right));
    const assignments = generatedTypeBlock(generatedTypes, "assignments");

    expect(migrationNames).toEqual(sequentialTypeMigrations);
    for (const shape of ["Row", "Insert", "Update"] as const) {
      expectOrdered(generatedShape(assignments, shape), [
        "provider_assignment_id",
        "provider_missing_at",
        "reading_load",
      ]);
    }

    expect(generatedTypes).toContain("progress_status: string");
    expect(generatedTypes).toContain("reviewed_at: string | null");
    expect(generatedTypes).toContain("completed_at: string | null");
    expectOrdered(generatedTypes, [
      "      course_mode_lms_links: {",
      "      course_mode_lms_student_links: {",
      "      course_mode_units: {",
    ]);
    expect(generatedTypes).toContain("merge_assignment_problem_work: {");
    expect(generatedTypes).toContain(
      "Args: { p_patch: Json; p_problem_id: string }",
    );
    expect(compactWhitespace(
      generatedTypeBlock(generatedTypes, "claim_lms_grade_sync_receipt"),
    )).toContain("Args: { p_attempt_id: string; p_provider: string }");
  });

  it("keeps full replay local, disposable, and ledger-exact", () => {
    const releaseGate = readFileSync(
      join(
        process.cwd(),
        "supabase/tests/scripts/beta-migration-release.ps1",
      ),
      "utf8",
    );

    expect(releaseGate).toContain("-ConfirmDisposable");
    expect(releaseGate).toContain(
      '$databaseUri.Host -notin @("localhost", "127.0.0.1", "::1")',
    );
    expect(releaseGate).toContain(
      "Disposable database already contains project migration history.",
    );
    expect(releaseGate).toContain("migration up --include-all");
    expect(releaseGate).toContain('select version from supabase_migrations.schema_migrations order by version;');
    expect(releaseGate).toContain("-Label \"Disposable replay ledger\"");
    expect(releaseGate).toContain("workspace_rls_contract");
    expect(releaseGate).toContain(
      "assignment message cross-assignment write was accepted",
    );
    expect(releaseGate).toContain(
      "workspace preference cross-assignment write was accepted",
    );
    expect(releaseGate).not.toContain("db push");
  });
});
