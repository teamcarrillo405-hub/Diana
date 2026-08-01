import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  createReadStream,
  existsSync,
  mkdirSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ENVIRONMENT_KEY = /^[A-Za-z_][A-Za-z0-9_]*$/;
const MODES = new Set(["preflight", "backup", "verify", "dry-run"]);
const SOURCE_KINDS = new Set(["local", "staging", "production"]);
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);
const DISPOSABLE_DATABASE_NAME = /(recovery|restore|disposable|(^|_)dr(_|$))/i;

export const USAGE = `Usage:
  node scripts/supabase-recovery-verify.mjs preflight --source=<local|staging|production>
  node scripts/supabase-recovery-verify.mjs backup --source=<kind> --output=<file.dump> --confirm-create-backup
  node scripts/supabase-recovery-verify.mjs verify --backup=<file.dump>
  node scripts/supabase-recovery-verify.mjs dry-run --backup=<file.dump> [--target-db-url-env=<name>]

Options:
  --db-url-env=<name>         Source URL variable (default: DIANA_RECOVERY_DB_URL)
  --target-db-url-env=<name>  Disposable target URL variable (default: DIANA_RECOVERY_TARGET_DB_URL)
  --evidence=<file.json>      Write the JSON evidence report; existing files are never overwritten
  --confirm-create-backup     Required for backup mode
  --help                      Show this help

Safety:
  preflight does not connect to a database. verify reads an existing archive.
  dry-run validates and prints a restore plan but never executes pg_restore.
  backup is the only mode that connects to a source database.`;

function requireEnvironmentKey(value, option) {
  if (!ENVIRONMENT_KEY.test(value)) {
    throw new Error(`${option} must name a valid environment variable.`);
  }
  return value;
}

function takeOptionValue(argv, index, option) {
  const token = argv[index];
  const equalsPrefix = `${option}=`;
  if (token.startsWith(equalsPrefix)) {
    return { value: token.slice(equalsPrefix.length), consumed: 1 };
  }
  if (token === option && argv[index + 1] !== undefined) {
    return { value: argv[index + 1], consumed: 2 };
  }
  return null;
}

export function parseArguments(argv) {
  if (argv.length === 0 || argv.includes("--help") || argv.includes("-h")) {
    return { help: true };
  }

  const mode = argv[0];
  if (!MODES.has(mode)) {
    throw new Error(`Unknown mode: ${mode || "(missing)"}.`);
  }

  const options = {
    mode,
    source: undefined,
    output: undefined,
    backup: undefined,
    evidence: undefined,
    dbUrlEnv: "DIANA_RECOVERY_DB_URL",
    targetDbUrlEnv: "DIANA_RECOVERY_TARGET_DB_URL",
    confirmCreateBackup: false,
  };

  for (let index = 1; index < argv.length; ) {
    const token = argv[index];
    if (token === "--confirm-create-backup") {
      options.confirmCreateBackup = true;
      index += 1;
      continue;
    }

    let matched = false;
    for (const [option, key] of [
      ["--source", "source"],
      ["--output", "output"],
      ["--backup", "backup"],
      ["--evidence", "evidence"],
      ["--db-url-env", "dbUrlEnv"],
      ["--target-db-url-env", "targetDbUrlEnv"],
    ]) {
      const parsed = takeOptionValue(argv, index, option);
      if (!parsed) continue;
      if (!parsed.value) throw new Error(`${option} requires a value.`);
      options[key] = parsed.value;
      index += parsed.consumed;
      matched = true;
      break;
    }

    if (!matched) throw new Error(`Unknown option: ${token}`);
  }

  requireEnvironmentKey(options.dbUrlEnv, "--db-url-env");
  requireEnvironmentKey(options.targetDbUrlEnv, "--target-db-url-env");

  if (mode === "preflight" || mode === "backup") {
    if (!SOURCE_KINDS.has(options.source)) {
      throw new Error(`${mode} requires --source=local, staging, or production.`);
    }
  }

  if (mode === "backup") {
    if (!options.confirmCreateBackup) {
      throw new Error("backup requires --confirm-create-backup.");
    }
    if (!options.output) throw new Error("backup requires --output=<file.dump>.");
  }

  if ((mode === "verify" || mode === "dry-run") && !options.backup) {
    throw new Error(`${mode} requires --backup=<file.dump>.`);
  }

  return options;
}

function decodeUrlPart(value, label) {
  try {
    return decodeURIComponent(value);
  } catch {
    throw new Error(`Database URL has an invalid encoded ${label}.`);
  }
}

export function parseDatabaseUrl(value, { disposable = false } = {}) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error("Database URL must be a valid postgresql:// URL.");
  }

  if (url.protocol !== "postgresql:" && url.protocol !== "postgres:") {
    throw new Error("Database URL must use postgresql:// or postgres://.");
  }

  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  const database = decodeUrlPart(url.pathname.replace(/^\//, ""), "database name");
  const username = decodeUrlPart(url.username, "username");
  const password = decodeUrlPart(url.password, "password");
  if (!host || !database || !username) {
    throw new Error("Database URL must include host, database, and username.");
  }

  if (disposable) {
    if (!LOCAL_HOSTS.has(host)) {
      throw new Error("Dry-run restore targets must use localhost, 127.0.0.1, or ::1.");
    }
    if (!DISPOSABLE_DATABASE_NAME.test(database)) {
      throw new Error(
        "Dry-run restore database names must contain recovery, restore, disposable, or _dr_.",
      );
    }
    if (["postgres", "template0", "template1"].includes(database.toLowerCase())) {
      throw new Error("Dry-run restore targets cannot use a maintenance database.");
    }
  }

  return {
    host,
    port: url.port || "5432",
    database,
    username,
    password,
    sslmode: url.searchParams.get("sslmode") || undefined,
    local: LOCAL_HOSTS.has(host),
  };
}

export function connectionArguments(connection) {
  return [
    `--host=${connection.host}`,
    `--port=${connection.port}`,
    `--username=${connection.username}`,
    `--dbname=${connection.database}`,
    "--no-password",
  ];
}

export function connectionEnvironment(connection, environment = process.env) {
  const childEnvironment = {
    ...environment,
    PGAPPNAME: "diana-recovery-verifier",
    PGCONNECT_TIMEOUT: environment.PGCONNECT_TIMEOUT || "15",
  };
  if (connection.password) childEnvironment.PGPASSWORD = connection.password;
  if (connection.sslmode) childEnvironment.PGSSLMODE = connection.sslmode;
  else if (!connection.local && !environment.PGSSLMODE) childEnvironment.PGSSLMODE = "require";
  return childEnvironment;
}

export function buildBackupArguments(connection, outputPath) {
  return [
    ...connectionArguments(connection),
    "--format=custom",
    "--compress=6",
    "--no-owner",
    "--no-privileges",
    `--file=${outputPath}`,
  ];
}

export function buildRestorePlan(connection, backupPath, targetDbUrlEnv) {
  return {
    executable: "pg_restore",
    args: [
      ...connectionArguments(connection),
      "--exit-on-error",
      "--single-transaction",
      "--no-owner",
      "--no-privileges",
      backupPath,
    ],
    credentialSource: targetDbUrlEnv,
    executesRestore: false,
  };
}

export function summarizeArchiveListing(listing) {
  const entries = listing
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith(";"));

  const count = (pattern) => entries.filter((line) => pattern.test(line)).length;
  return {
    itemCount: entries.length,
    schemas: count(/\bSCHEMA\b/),
    tables: count(/\bTABLE\b(?! DATA)/),
    tableData: count(/\bTABLE DATA\b/),
    sequences: count(/\bSEQUENCE\b/),
    functions: count(/\bFUNCTION\b/),
    indexes: count(/\bINDEX\b/),
    constraints: count(/\bCONSTRAINT\b/),
  };
}

function defaultRunCommand(executable, args, options = {}) {
  return spawnSync(executable, args, {
    encoding: "utf8",
    env: options.env || process.env,
    maxBuffer: 64 * 1024 * 1024,
    shell: false,
    windowsHide: true,
  });
}

function commandOutput(result, executable) {
  if (result.error) {
    throw new Error(`${executable} could not start: ${result.error.message}`);
  }
  if (result.status !== 0) {
    const detail = String(result.stderr || result.stdout || "").trim();
    throw new Error(`${executable} exited ${result.status}${detail ? `: ${detail}` : "."}`);
  }
  return String(result.stdout || "").trim();
}

async function defaultHashFile(filePath) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(filePath)) hash.update(chunk);
  return hash.digest("hex");
}

function inspectTool(executable, runCommand) {
  const output = commandOutput(runCommand(executable, ["--version"]), executable);
  return output || "version output unavailable";
}

async function inspectArchive(backupPath, dependencies, checks) {
  const resolved = path.resolve(backupPath);
  const file = dependencies.stat(resolved);
  if (!file.isFile() || file.size <= 0) {
    throw new Error(`Backup must be a non-empty regular file: ${resolved}`);
  }
  checks.push({ id: "backup-file", status: "pass", bytes: file.size });

  const listing = commandOutput(
    dependencies.runCommand("pg_restore", ["--list", resolved]),
    "pg_restore --list",
  );
  const inventory = summarizeArchiveListing(listing);
  if (inventory.itemCount === 0) {
    throw new Error("pg_restore returned an empty archive inventory.");
  }
  checks.push({ id: "archive-inventory", status: "pass", ...inventory });

  const sha256 = await dependencies.hashFile(resolved);
  checks.push({ id: "sha256", status: "pass", value: sha256 });
  return { path: resolved, bytes: file.size, sha256, inventory };
}

function requiredUrl(environment, key) {
  const value = environment[key];
  if (!value) throw new Error(`Required environment variable ${key} is not set.`);
  return value;
}

function publicConnection(connection, environmentKey) {
  return {
    environmentKey,
    host: connection.host,
    port: connection.port,
    database: connection.database,
    username: connection.username,
    sslmode: connection.sslmode || (connection.local ? "client-default" : "require"),
    credentialPresent: Boolean(connection.password),
  };
}

function createDependencies(overrides = {}) {
  return {
    runCommand: defaultRunCommand,
    stat: statSync,
    exists: existsSync,
    mkdir: (directory) => mkdirSync(directory, { recursive: true }),
    remove: unlinkSync,
    hashFile: defaultHashFile,
    now: () => new Date().toISOString(),
    ...overrides,
  };
}

export async function runWorkflow(options, environment = process.env, overrides = {}) {
  const dependencies = createDependencies(overrides);
  const checks = [];
  const tools = {};

  const requiredTools = options.mode === "preflight" || options.mode === "backup"
    ? ["pg_dump", "pg_restore"]
    : ["pg_restore"];
  for (const tool of requiredTools) {
    tools[tool] = inspectTool(tool, dependencies.runCommand);
    checks.push({ id: `tool-${tool}`, status: "pass", version: tools[tool] });
  }

  const baseReport = {
    schemaVersion: 1,
    generatedAt: dependencies.now(),
    operation: options.mode,
    status: "pass",
    noRestoreExecuted: true,
    tools,
    checks,
  };

  if (options.mode === "preflight") {
    const connection = parseDatabaseUrl(requiredUrl(environment, options.dbUrlEnv));
    checks.push({ id: "source-environment", status: "pass", source: options.source });
    checks.push({ id: "source-url", status: "pass", environmentKey: options.dbUrlEnv });
    return {
      ...baseReport,
      source: options.source,
      connection: publicConnection(connection, options.dbUrlEnv),
      databaseConnectionAttempted: false,
    };
  }

  if (options.mode === "verify") {
    return { ...baseReport, backup: await inspectArchive(options.backup, dependencies, checks) };
  }

  if (options.mode === "dry-run") {
    const backup = await inspectArchive(options.backup, dependencies, checks);
    const target = parseDatabaseUrl(
      requiredUrl(environment, options.targetDbUrlEnv),
      { disposable: true },
    );
    checks.push({
      id: "disposable-local-target",
      status: "pass",
      host: target.host,
      database: target.database,
    });
    return {
      ...baseReport,
      backup,
      target: publicConnection(target, options.targetDbUrlEnv),
      restorePlan: buildRestorePlan(target, backup.path, options.targetDbUrlEnv),
    };
  }

  const outputPath = path.resolve(options.output);
  if (dependencies.exists(outputPath)) {
    throw new Error(`Refusing to overwrite existing backup: ${outputPath}`);
  }

  const source = parseDatabaseUrl(requiredUrl(environment, options.dbUrlEnv));
  dependencies.mkdir(path.dirname(outputPath));
  checks.push({ id: "create-confirmation", status: "pass", explicit: true });
  checks.push({ id: "source-environment", status: "pass", source: options.source });

  try {
    commandOutput(
      dependencies.runCommand("pg_dump", buildBackupArguments(source, outputPath), {
        env: connectionEnvironment(source, environment),
      }),
      "pg_dump",
    );
    checks.push({ id: "logical-backup-created", status: "pass", path: outputPath });
    const backup = await inspectArchive(outputPath, dependencies, checks);
    return {
      ...baseReport,
      source: options.source,
      connection: publicConnection(source, options.dbUrlEnv),
      backup,
    };
  } catch (error) {
    if (dependencies.exists(outputPath)) dependencies.remove(outputPath);
    throw error;
  }
}

function writeEvidence(filePath, report) {
  const resolved = path.resolve(filePath);
  if (existsSync(resolved)) throw new Error(`Refusing to overwrite evidence: ${resolved}`);
  mkdirSync(path.dirname(resolved), { recursive: true });
  writeFileSync(resolved, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  return resolved;
}

async function main() {
  let options;
  try {
    options = parseArguments(process.argv.slice(2));
    if (options.help) {
      console.log(USAGE);
      return;
    }

    const report = await runWorkflow(options);
    if (options.evidence) report.evidenceFile = writeEvidence(options.evidence, report);
    console.log(JSON.stringify(report, null, 2));
  } catch (error) {
    const report = {
      schemaVersion: 1,
      generatedAt: new Date().toISOString(),
      operation: options?.mode || "argument-validation",
      status: "fail",
      noRestoreExecuted: true,
      error: error instanceof Error ? error.message : String(error),
    };
    console.error(JSON.stringify(report, null, 2));
    process.exitCode = 1;
  }
}

const isDirectExecution = process.argv[1]
  && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (isDirectExecution) await main();
