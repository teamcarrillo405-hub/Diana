import assert from "node:assert/strict";
import test from "node:test";

import {
  buildBackupArguments,
  buildRestorePlan,
  connectionEnvironment,
  parseArguments,
  parseDatabaseUrl,
  runWorkflow,
  summarizeArchiveListing,
} from "./supabase-recovery-verify.mjs";

const SOURCE_URL = "postgresql://backup_user:p%40ss@db.example.test:5432/postgres?sslmode=require";
const LOCAL_TARGET_URL = "postgresql://postgres:local@127.0.0.1:5432/diana_recovery_verify";
const ARCHIVE_LISTING = `;
; Archive created at 2026-07-31 10:00:00 UTC
;
1; 2615 2200 SCHEMA - public postgres
2; 1259 100 TABLE public assignments postgres
3; 0 100 TABLE DATA public assignments postgres
4; 1255 101 FUNCTION public claim_job() postgres
5; 1259 102 INDEX public assignments_pkey postgres
6; 2606 103 CONSTRAINT public assignments assignments_pkey postgres
`;

test("backup mode requires an explicit confirmation and output", () => {
  assert.throws(
    () => parseArguments(["backup", "--source=staging", "--output=backup.dump"]),
    /confirm-create-backup/,
  );
  assert.throws(
    () => parseArguments(["backup", "--source=staging", "--confirm-create-backup"]),
    /--output/,
  );

  const parsed = parseArguments([
    "backup",
    "--source=staging",
    "--output=backup.dump",
    "--confirm-create-backup",
  ]);
  assert.equal(parsed.mode, "backup");
  assert.equal(parsed.confirmCreateBackup, true);
});

test("database credentials stay out of arguments and evidence fields", () => {
  const connection = parseDatabaseUrl(SOURCE_URL);
  assert.equal(connection.password, "p@ss");

  const args = buildBackupArguments(connection, "C:\\evidence\\backup.dump");
  assert.equal(args.some((arg) => arg.includes("p@ss")), false);
  assert.equal(args.some((arg) => arg.includes(SOURCE_URL)), false);

  const childEnvironment = connectionEnvironment(connection, { KEEP: "yes" });
  assert.equal(childEnvironment.PGPASSWORD, "p@ss");
  assert.equal(childEnvironment.PGSSLMODE, "require");
  assert.equal(childEnvironment.KEEP, "yes");
});

test("dry-run targets must be clearly disposable localhost databases", () => {
  assert.throws(
    () => parseDatabaseUrl(SOURCE_URL, { disposable: true }),
    /localhost/,
  );
  assert.throws(
    () => parseDatabaseUrl("postgresql://postgres:x@localhost:5432/postgres", { disposable: true }),
    /must contain recovery/,
  );

  const target = parseDatabaseUrl(LOCAL_TARGET_URL, { disposable: true });
  assert.equal(target.local, true);
  assert.equal(target.database, "diana_recovery_verify");

  const ipv6Target = parseDatabaseUrl(
    "postgresql://postgres:x@[::1]:5432/diana_restore_verify",
    { disposable: true },
  );
  assert.equal(ipv6Target.host, "::1");
});

test("restore plans omit destructive flags and never claim execution", () => {
  const target = parseDatabaseUrl(LOCAL_TARGET_URL, { disposable: true });
  const plan = buildRestorePlan(target, "C:\\evidence\\backup.dump", "TARGET_URL");

  assert.equal(plan.executesRestore, false);
  assert.equal(plan.args.includes("--clean"), false);
  assert.equal(plan.args.includes("--create"), false);
  assert.equal(plan.args.includes("--single-transaction"), true);
  assert.equal(plan.args.some((arg) => arg.includes("local")), false);
});

test("archive inventory reports useful structural evidence", () => {
  assert.deepEqual(summarizeArchiveListing(ARCHIVE_LISTING), {
    itemCount: 6,
    schemas: 1,
    tables: 1,
    tableData: 1,
    sequences: 0,
    functions: 1,
    indexes: 1,
    constraints: 1,
  });
});

test("preflight validates tools and URL without connecting", async () => {
  const calls = [];
  const report = await runWorkflow(
    parseArguments(["preflight", "--source=staging"]),
    { DIANA_RECOVERY_DB_URL: SOURCE_URL },
    {
      now: () => "2026-07-31T10:00:00.000Z",
      runCommand(executable, args) {
        calls.push([executable, ...args]);
        return { status: 0, stdout: `${executable} (PostgreSQL) 16.13`, stderr: "" };
      },
    },
  );

  assert.deepEqual(calls, [
    ["pg_dump", "--version"],
    ["pg_restore", "--version"],
  ]);
  assert.equal(report.status, "pass");
  assert.equal(report.databaseConnectionAttempted, false);
  assert.equal(JSON.stringify(report).includes("p@ss"), false);
});

test("dry-run inventories the archive but never invokes a restore", async () => {
  const calls = [];
  const report = await runWorkflow(
    parseArguments(["dry-run", "--backup=fixture.dump"]),
    { DIANA_RECOVERY_TARGET_DB_URL: LOCAL_TARGET_URL },
    {
      now: () => "2026-07-31T10:00:00.000Z",
      stat: () => ({ isFile: () => true, size: 4096 }),
      hashFile: async () => "abc123",
      runCommand(executable, args) {
        calls.push([executable, ...args]);
        if (args[0] === "--version") {
          return { status: 0, stdout: "pg_restore (PostgreSQL) 16.13", stderr: "" };
        }
        if (args[0] === "--list") {
          return { status: 0, stdout: ARCHIVE_LISTING, stderr: "" };
        }
        throw new Error("Unexpected command");
      },
    },
  );

  assert.deepEqual(calls.map((call) => call.slice(0, 2)), [
    ["pg_restore", "--version"],
    ["pg_restore", "--list"],
  ]);
  assert.equal(report.noRestoreExecuted, true);
  assert.equal(report.restorePlan.executesRestore, false);
  assert.equal(report.backup.inventory.tables, 1);
});

test("backup refuses an existing output before pg_dump", async () => {
  const calls = [];
  await assert.rejects(
    runWorkflow(
      parseArguments([
        "backup",
        "--source=production",
        "--output=existing.dump",
        "--confirm-create-backup",
      ]),
      { DIANA_RECOVERY_DB_URL: SOURCE_URL },
      {
        exists: () => true,
        runCommand(executable, args) {
          calls.push([executable, ...args]);
          return { status: 0, stdout: `${executable} version`, stderr: "" };
        },
      },
    ),
    /Refusing to overwrite/,
  );

  assert.equal(calls.some(([executable, arg]) => executable === "pg_dump" && arg !== "--version"), false);
});

test("backup creation is immediately followed by archive verification", async () => {
  const calls = [];
  let outputExists = false;
  const report = await runWorkflow(
    parseArguments([
      "backup",
      "--source=staging",
      "--output=new.dump",
      "--confirm-create-backup",
    ]),
    { DIANA_RECOVERY_DB_URL: SOURCE_URL },
    {
      exists: () => outputExists,
      mkdir: () => {},
      stat: () => ({ isFile: () => true, size: 8192 }),
      hashFile: async () => "verified-sha256",
      runCommand(executable, args, options) {
        calls.push({ executable, args, options });
        if (args[0] === "--version") {
          return { status: 0, stdout: `${executable} (PostgreSQL) 16.13`, stderr: "" };
        }
        if (executable === "pg_dump") {
          outputExists = true;
          assert.equal(options.env.PGPASSWORD, "p@ss");
          return { status: 0, stdout: "", stderr: "" };
        }
        if (args[0] === "--list") {
          return { status: 0, stdout: ARCHIVE_LISTING, stderr: "" };
        }
        throw new Error("Unexpected command");
      },
    },
  );

  assert.deepEqual(calls.map(({ executable, args }) => [executable, args[0]]), [
    ["pg_dump", "--version"],
    ["pg_restore", "--version"],
    ["pg_dump", "--host=db.example.test"],
    ["pg_restore", "--list"],
  ]);
  assert.equal(report.backup.sha256, "verified-sha256");
  assert.equal(report.noRestoreExecuted, true);
  assert.equal(JSON.stringify(report).includes("p@ss"), false);
});

test("a failed backup removes only the newly created partial output", async () => {
  let outputExists = false;
  const removed = [];

  await assert.rejects(
    runWorkflow(
      parseArguments([
        "backup",
        "--source=staging",
        "--output=partial.dump",
        "--confirm-create-backup",
      ]),
      { DIANA_RECOVERY_DB_URL: SOURCE_URL },
      {
        exists: () => outputExists,
        mkdir: () => {},
        remove(filePath) {
          removed.push(filePath);
          outputExists = false;
        },
        runCommand(executable, args) {
          if (args[0] === "--version") {
            return { status: 0, stdout: `${executable} version`, stderr: "" };
          }
          outputExists = true;
          return { status: 2, stdout: "", stderr: "connection unavailable" };
        },
      },
    ),
    /pg_dump exited 2/,
  );

  assert.equal(removed.length, 1);
  assert.match(removed[0], /partial\.dump$/);
});
