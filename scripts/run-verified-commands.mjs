import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { constants as osConstants } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ENVIRONMENT_KEY = /^[A-Za-z_][A-Za-z0-9_]*$/;

const USAGE = `Usage:
  node scripts/run-verified-commands.mjs [environment options] -- command [args...] [--next command [args...]]

Environment options:
  --env KEY=VALUE          Set a child environment value
  --env-copy TARGET=SOURCE Copy an existing child environment value
  --unset KEY              Remove a child environment value`;

function assertEnvironmentKey(value, context) {
  if (!ENVIRONMENT_KEY.test(value)) {
    throw new Error(`${context} must be a valid environment variable name.`);
  }
}

function splitAssignment(value, option) {
  const equalsIndex = value.indexOf("=");
  if (equalsIndex <= 0) {
    throw new Error(`${option} requires KEY=VALUE.`);
  }

  const key = value.slice(0, equalsIndex);
  const assignedValue = value.slice(equalsIndex + 1);
  assertEnvironmentKey(key, `${option} target`);
  return [key, assignedValue];
}

function parseCommandGroups(tokens) {
  if (tokens.length === 0) {
    throw new Error("At least one command is required after --.");
  }

  const commands = [];
  let command = [];

  for (const token of tokens) {
    if (token === "--next") {
      if (command.length === 0) {
        throw new Error("Command groups separated by --next cannot be empty.");
      }
      commands.push(command);
      command = [];
      continue;
    }

    command.push(token);
  }

  if (command.length === 0) {
    throw new Error("Command groups separated by --next cannot be empty.");
  }

  commands.push(command);
  return commands;
}

export function parseRunnerArguments(argv, baseEnvironment = process.env) {
  const commandSeparator = argv.indexOf("--");
  if (commandSeparator === -1) {
    throw new Error("A -- separator is required before native commands.");
  }

  const environment = { ...baseEnvironment };
  const optionTokens = argv.slice(0, commandSeparator);

  for (let index = 0; index < optionTokens.length; ) {
    const option = optionTokens[index];
    const value = optionTokens[index + 1];
    if (value === undefined) {
      throw new Error(`${option} requires a value.`);
    }

    if (option === "--env") {
      const [target, assignedValue] = splitAssignment(value, option);
      environment[target] = assignedValue;
      index += 2;
      continue;
    }

    if (option === "--env-copy") {
      const [target, source] = splitAssignment(value, option);
      assertEnvironmentKey(source, `${option} source`);
      if (environment[source] === undefined) {
        throw new Error(
          `${option} source ${source} is missing from the child environment.`,
        );
      }
      environment[target] = environment[source];
      index += 2;
      continue;
    }

    if (option === "--unset") {
      assertEnvironmentKey(value, option);
      delete environment[value];
      index += 2;
      continue;
    }

    throw new Error(`Unknown option: ${option}`);
  }

  return {
    commands: parseCommandGroups(argv.slice(commandSeparator + 1)),
    environment,
  };
}

export function resolveExecutable(command, platform = process.platform) {
  if (platform !== "win32") return command;

  const normalized = command.toLowerCase();
  if (normalized === "npm" || normalized === "npx") {
    return `${command}.cmd`;
  }

  return command;
}

function environmentPath(environment, platform) {
  if (platform !== "win32") return environment.PATH;

  const pathKey = Object.keys(environment).find(
    (key) => key.toLowerCase() === "path",
  );
  return pathKey ? environment[pathKey] : undefined;
}

function findExecutableOnPath(executable, environment, platform, exists) {
  const searchPath = environmentPath(environment, platform);
  if (!searchPath) return null;

  const pathApi = platform === "win32" ? path.win32 : path;
  const delimiter = platform === "win32" ? ";" : path.delimiter;

  for (const rawDirectory of searchPath.split(delimiter)) {
    const directory = rawDirectory.replace(/^"|"$/g, "");
    if (!directory) continue;
    const candidate = pathApi.join(directory, executable);
    if (exists(candidate)) return candidate;
  }

  return null;
}

export function resolveSpawnInvocation(
  command,
  args,
  {
    platform = process.platform,
    environment = process.env,
    exists = existsSync,
    execPath = process.execPath,
  } = {},
) {
  const executable = resolveExecutable(command, platform);
  const normalized = executable.toLowerCase();

  if (
    platform === "win32" &&
    (normalized === "npm.cmd" || normalized === "npx.cmd")
  ) {
    const shimPath = findExecutableOnPath(
      executable,
      environment,
      platform,
      exists,
    );

    if (shimPath) {
      const cliName = normalized === "npm.cmd" ? "npm-cli.js" : "npx-cli.js";
      const cliPath = path.win32.join(
        path.win32.dirname(shimPath),
        "node_modules",
        "npm",
        "bin",
        cliName,
      );

      if (exists(cliPath)) {
        return {
          file: execPath,
          args: [cliPath, ...args],
          displayFile: executable,
        };
      }
    }
  }

  return { file: executable, args, displayFile: executable };
}

function signalExitCode(signal) {
  const signalNumber = osConstants.signals[signal];
  return typeof signalNumber === "number" ? 128 + signalNumber : 1;
}

export function runVerifiedCommands(
  { commands, environment },
  {
    platform = process.platform,
    spawn = spawnSync,
    stderr = (message) => console.error(message),
    exists = existsSync,
    execPath = process.execPath,
  } = {},
) {
  for (const [command, ...args] of commands) {
    const invocation = resolveSpawnInvocation(command, args, {
      platform,
      environment,
      exists,
      execPath,
    });

    let result;
    try {
      result = spawn(invocation.file, invocation.args, {
        env: environment,
        shell: false,
        stdio: "inherit",
        windowsHide: true,
      });
    } catch (error) {
      stderr(
        `Unable to start ${invocation.displayFile}: ${error instanceof Error ? error.message : String(error)}`,
      );
      return 1;
    }

    if (result.error) {
      const code = result.error.code ? `${result.error.code}: ` : "";
      stderr(
        `Unable to start ${invocation.displayFile}: ${code}${result.error.message}`,
      );
      return 1;
    }

    if (result.signal) {
      const status = signalExitCode(result.signal);
      stderr(
        `${invocation.displayFile} ended from ${result.signal} (exit ${status}).`,
      );
      return status;
    }

    if (typeof result.status !== "number") {
      stderr(`${invocation.displayFile} ended without an exit status.`);
      return 1;
    }

    if (result.status !== 0) return result.status;
  }

  return 0;
}

export function main(argv = process.argv.slice(2)) {
  try {
    return runVerifiedCommands(parseRunnerArguments(argv));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    console.error(USAGE);
    return 2;
  }
}

const isDirectExecution =
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isDirectExecution) {
  process.exitCode = main();
}
