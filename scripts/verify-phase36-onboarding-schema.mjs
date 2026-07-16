import { randomUUID } from "node:crypto";
import { existsSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const MIGRATION_VERSION = "20260715050000";
const EXPECTED_VALUES = Object.freeze({
  learning_hurdle: Object.freeze([
    "complex_concepts",
    "exam_stress",
    "staying_consistent",
    "time_management",
  ]),
  study_schedule_preference: Object.freeze([
    "after_practice",
    "late_night",
    "morning",
  ]),
});

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const REPO_ROOT = resolve(SCRIPT_PATH, "..", "..");
const NPX = process.platform === "win32" ? "npx.cmd" : "npx";
const PSQL = process.platform === "win32" ? "psql.exe" : "psql";

function fail(message) {
  throw new Error(`Phase 36 onboarding schema verification stopped: ${message}`);
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: REPO_ROOT,
    encoding: "utf8",
    windowsHide: true,
    maxBuffer: 32 * 1024 * 1024,
    ...options,
  });

  if (result.error || result.status !== 0) {
    const label = options.label ?? basename(command);
    fail(`${label} did not complete (exit ${result.status ?? "unavailable"}).`);
  }

  return result.stdout ?? "";
}

function parseJsonOutput(output, label) {
  const start = output.indexOf("{");
  const end = output.lastIndexOf("}");
  if (start < 0 || end < start) fail(`${label} did not return JSON.`);

  try {
    return JSON.parse(output.slice(start, end + 1));
  } catch {
    fail(`${label} returned unreadable JSON.`);
  }
}

function parseEnvFile(contents) {
  const env = {};
  for (const line of contents.split(/\r?\n/u)) {
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/u);
    if (!match) continue;
    let value = match[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[match[1]] = value.replaceAll("\\n", "\n");
  }
  return env;
}

export function parseSupabaseProjectRef(value) {
  const match = String(value ?? "").match(
    /^https:\/\/([a-z]{20})\.supabase\.co\/?$/iu,
  );
  if (!match) fail("NEXT_PUBLIC_SUPABASE_URL does not contain a valid project ref.");
  return match[1].toLowerCase();
}

export function assertProjectIdentity({
  linkedRef,
  localAppRef,
  previewAppRef,
  cliLinkedRefs,
}) {
  const normalized = [linkedRef, localAppRef, previewAppRef].map((value) =>
    String(value ?? "").trim().toLowerCase(),
  );
  const linkedCli = [...new Set(cliLinkedRefs.map((value) => value.toLowerCase()))];

  if (
    normalized.some((value) => !/^[a-z]{20}$/u.test(value)) ||
    new Set(normalized).size !== 1 ||
    linkedCli.length !== 1 ||
    linkedCli[0] !== normalized[0]
  ) {
    fail("Supabase project identity mismatch across CLI link, local app, and Vercel preview.");
  }

  return normalized[0];
}

export function assertMigrationHistory(migrations) {
  const migration = migrations.find(
    (entry) => String(entry.local ?? "") === MIGRATION_VERSION,
  );
  if (!migration || String(migration.remote ?? "") !== MIGRATION_VERSION) {
    fail(`linked migration ${MIGRATION_VERSION} is not present in remote history.`);
  }
  return true;
}

function extractAllowedValues(definition) {
  return [...definition.matchAll(/'((?:''|[^'])*)'(?:::[^,\]\)\s]+)?/gu)]
    .map((match) => match[1].replaceAll("''", "'"))
    .sort();
}

function assertExactValues(column, values) {
  const expected = EXPECTED_VALUES[column];
  if (
    values.length !== expected.length ||
    values.some((value, index) => value !== expected[index])
  ) {
    fail(`${column} does not have the exact allowed values.`);
  }
}

function assertSqlSchema(schema) {
  const table = schema.match(
    /CREATE TABLE(?: IF NOT EXISTS)?\s+"public"\."profiles"\s*\(([\s\S]*?)\n\);/iu,
  )?.[1];
  if (!table) fail("public.profiles is absent from the linked schema dump.");

  const verified = {};
  for (const column of Object.keys(EXPECTED_VALUES)) {
    const escapedColumn = column.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
    const columnMatch = table.match(
      new RegExp(
        `^\\s*"${escapedColumn}"\\s+(?:"text"|text)([^,\\n]*)(?:,|$)`,
        "imu",
      ),
    );
    if (!columnMatch) fail(`${column} is not a text column.`);
    if (/NOT\s+NULL/iu.test(columnMatch[1])) fail(`${column} must remain nullable.`);

    const constraintName = `profiles_${column}_check`;
    const constraint = schema.match(
      new RegExp(
        `ADD CONSTRAINT "${constraintName}" CHECK \\(([^;]+)\\);`,
        "iu",
      ),
    )?.[1];
    if (!constraint || !constraint.includes(`"${column}"`)) {
      fail(`${constraintName} is absent from the linked schema dump.`);
    }
    const values = extractAllowedValues(constraint);
    assertExactValues(column, values);
    verified[column] = values;
  }
  return verified;
}

function assertJsonSchema(snapshot) {
  if (snapshot?.schema !== "public" || snapshot?.table !== "profiles") {
    fail("public.profiles is absent from the linked schema dump.");
  }

  const verified = {};
  for (const column of Object.keys(EXPECTED_VALUES)) {
    const metadata = snapshot.columns?.find((entry) => entry.name === column);
    if (!metadata || metadata.data_type !== "text") {
      fail(`${column} is not a text column.`);
    }
    if (metadata.is_nullable !== "YES") fail(`${column} must remain nullable.`);

    const constraintName = `profiles_${column}_check`;
    const constraint = snapshot.constraints?.find(
      (entry) => entry.name === constraintName,
    );
    if (!constraint || !String(constraint.definition).includes(column)) {
      fail(`${constraintName} is absent from the linked schema dump.`);
    }
    const values = extractAllowedValues(String(constraint.definition));
    assertExactValues(column, values);
    verified[column] = values;
  }
  return verified;
}

export function assertProfilesOnboardingSchema(schemaDump) {
  if (typeof schemaDump === "string") {
    const trimmed = schemaDump.trim();
    if (trimmed.startsWith("{")) {
      try {
        return assertJsonSchema(JSON.parse(trimmed));
      } catch (error) {
        if (error instanceof Error && error.message.startsWith("Phase 36")) throw error;
        fail("linked schema JSON is unreadable.");
      }
    }
    return assertSqlSchema(schemaDump);
  }
  return assertJsonSchema(schemaDump);
}

function readLinkedProjectRef() {
  const path = join(REPO_ROOT, "supabase", ".temp", "project-ref");
  if (!existsSync(path)) fail("Supabase CLI project link is missing.");
  return readFileSync(path, "utf8").trim();
}

function readLocalAppProjectRef() {
  const path = join(REPO_ROOT, ".env.local");
  if (!existsSync(path)) fail("local app environment is missing.");
  const env = parseEnvFile(readFileSync(path, "utf8"));
  return parseSupabaseProjectRef(env.NEXT_PUBLIC_SUPABASE_URL);
}

function pullPreviewProjectRef(tempFiles) {
  const path = join(tmpdir(), `diana-phase36-preview-${randomUUID()}.env`);
  tempFiles.add(path);
  run(
    NPX,
    [
      "vercel",
      "env",
      "pull",
      path,
      "--environment=preview",
      "--yes",
      "--no-color",
    ],
    { label: "Vercel preview environment lookup" },
  );
  const env = parseEnvFile(readFileSync(path, "utf8"));
  return parseSupabaseProjectRef(env.NEXT_PUBLIC_SUPABASE_URL);
}

function readCliProjectState() {
  const output = run(
    NPX,
    ["supabase", "projects", "list", "--output", "json"],
    { label: "Supabase project identity lookup" },
  );
  const payload = parseJsonOutput(output, "Supabase project identity lookup");
  const projects = Array.isArray(payload) ? payload : payload.projects;
  if (!Array.isArray(projects)) fail("Supabase project identity list is missing.");
  return projects;
}

function readMigrationHistory() {
  const output = run(
    NPX,
    ["supabase", "migration", "list", "--linked", "--output", "json"],
    { label: "Supabase linked migration lookup" },
  );
  const payload = parseJsonOutput(output, "Supabase linked migration lookup");
  if (!Array.isArray(payload.migrations)) fail("linked migration history is missing.");
  return payload.migrations;
}

function parseEphemeralConnection(script) {
  const names = ["PGHOST", "PGPORT", "PGUSER", "PGPASSWORD", "PGDATABASE"];
  const connection = {};
  for (const name of names) {
    const match = script.match(new RegExp(`^export ${name}="([^"]+)"$`, "mu"));
    if (!match) fail("Supabase CLI could not issue a temporary linked database login.");
    connection[name] = match[1];
  }
  return connection;
}

function dumpLiveSchema(tempFiles) {
  const dumpPath = join(tmpdir(), `diana-phase36-schema-${randomUUID()}.json`);
  tempFiles.add(dumpPath);

  // The CLI's normal schema dump requires Docker. This read-only fallback asks
  // the authenticated CLI for an ephemeral linked login, keeps it in memory,
  // and uses local psql to dump only public.profiles metadata.
  const dryRun = run(
    NPX,
    ["supabase", "db", "dump", "--linked", "--schema", "public", "--dry-run"],
    { label: "Supabase temporary linked database login" },
  );
  const connection = parseEphemeralConnection(dryRun);
  const sql = `
select json_build_object(
  'schema', 'public',
  'table', 'profiles',
  'columns', (
    select coalesce(json_agg(json_build_object(
      'name', column_name,
      'data_type', data_type,
      'is_nullable', is_nullable
    ) order by ordinal_position), '[]'::json)
    from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles'
  ),
  'constraints', (
    select coalesce(json_agg(json_build_object(
      'name', constraint_row.conname,
      'definition', pg_get_constraintdef(constraint_row.oid, true)
    ) order by constraint_row.conname), '[]'::json)
    from pg_constraint constraint_row
    join pg_class table_row on table_row.oid = constraint_row.conrelid
    join pg_namespace schema_row on schema_row.oid = table_row.relnamespace
    where schema_row.nspname = 'public'
      and table_row.relname = 'profiles'
      and constraint_row.contype = 'c'
  )
)::text;
`;
  const snapshot = run(
    PSQL,
    [
      "--no-password",
      "--no-psqlrc",
      "--tuples-only",
      "--no-align",
      "--set",
      "ON_ERROR_STOP=1",
      "--command",
      sql,
    ],
    {
      label: "read-only linked public schema dump",
      env: { ...process.env, ...connection },
    },
  ).trim();
  writeFileSync(dumpPath, `${snapshot}\n`, { encoding: "utf8", mode: 0o600 });
  return readFileSync(dumpPath, "utf8");
}

function cleanupTempFiles(tempFiles) {
  for (const path of tempFiles) {
    if (existsSync(path)) unlinkSync(path);
  }
}

export function verifyLinkedOnboardingSchema() {
  const tempFiles = new Set();
  try {
    const linkedRef = readLinkedProjectRef();
    const localAppRef = readLocalAppProjectRef();
    const previewAppRef = pullPreviewProjectRef(tempFiles);
    const projects = readCliProjectState();
    const cliLinkedRefs = projects
      .filter((project) => project.linked === true)
      .map((project) => String(project.ref ?? project.id ?? ""));
    const projectRef = assertProjectIdentity({
      linkedRef,
      localAppRef,
      previewAppRef,
      cliLinkedRefs,
    });

    assertMigrationHistory(readMigrationHistory());
    const schema = assertProfilesOnboardingSchema(dumpLiveSchema(tempFiles));

    console.log("Phase 36 onboarding schema verification passed.");
    console.log(`Project ref: ${projectRef}`);
    console.log(`Migration ${MIGRATION_VERSION}: present in linked history`);
    console.log(
      `profiles.learning_hurdle: nullable text, ${schema.learning_hurdle.length} exact values`,
    );
    console.log(
      `profiles.study_schedule_preference: nullable text, ${schema.study_schedule_preference.length} exact values`,
    );
    console.log("Temporary preview and schema files: removed");
  } finally {
    cleanupTempFiles(tempFiles);
  }
}

const isDirectRun =
  process.argv[1] && resolve(process.argv[1]) === resolve(SCRIPT_PATH);

if (isDirectRun) {
  if (!process.argv.includes("--linked")) {
    fail("pass --linked to verify the application-linked project.");
  }
  verifyLinkedOnboardingSchema();
}
