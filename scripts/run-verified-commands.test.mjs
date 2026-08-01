import assert from "node:assert/strict";
import test from "node:test";

import {
  parseRunnerArguments,
  resolveExecutable,
  resolveSpawnInvocation,
  runVerifiedCommands,
} from "./run-verified-commands.mjs";

test("parses native argv groups and applies one explicit child environment", () => {
  const parsed = parseRunnerArguments(
    [
      "--env",
      "SET=value=with=equals",
      "--env-copy",
      "COPIED=SOURCE",
      "--unset",
      "REMOVE",
      "--",
      "node",
      "first.mjs",
      "--next",
      "npm",
      "test",
    ],
    { KEEP: "yes", SOURCE: "from-source", REMOVE: "drop-me" },
  );

  assert.deepEqual(parsed.commands, [
    ["node", "first.mjs"],
    ["npm", "test"],
  ]);
  assert.deepEqual(parsed.environment, {
    KEEP: "yes",
    SOURCE: "from-source",
    SET: "value=with=equals",
    COPIED: "from-source",
  });
});

test("runs commands in order with shell disabled", () => {
  const calls = [];
  const spawn = (file, args, options) => {
    calls.push({ file, args, options });
    return { status: 0, signal: null, error: undefined };
  };

  const status = runVerifiedCommands(
    {
      commands: [
        ["node", "one.mjs"],
        ["tool", "two"],
      ],
      environment: { CONTRACT_ENV: "present" },
    },
    { platform: "linux", spawn },
  );

  assert.equal(status, 0);
  assert.deepEqual(
    calls.map(({ file, args }) => [file, ...args]),
    [
      ["node", "one.mjs"],
      ["tool", "two"],
    ],
  );
  for (const call of calls) {
    assert.equal(call.options.shell, false);
    assert.equal(call.options.stdio, "inherit");
    assert.deepEqual(call.options.env, { CONTRACT_ENV: "present" });
  }
});

test("returns the first nonzero status exactly and skips later commands", () => {
  const calls = [];
  const statuses = [0, 17, 0];
  const spawn = (file) => {
    calls.push(file);
    return {
      status: statuses[calls.length - 1],
      signal: null,
      error: undefined,
    };
  };

  const status = runVerifiedCommands(
    {
      commands: [["first"], ["second"], ["never"]],
      environment: {},
    },
    { platform: "linux", spawn },
  );

  assert.equal(status, 17);
  assert.deepEqual(calls, ["first", "second"]);
});

test("stops on a spawn error", () => {
  const calls = [];
  const messages = [];
  const status = runVerifiedCommands(
    {
      commands: [["missing"], ["never"]],
      environment: {},
    },
    {
      platform: "linux",
      spawn(file) {
        calls.push(file);
        return {
          status: null,
          signal: null,
          error: Object.assign(new Error("not found"), { code: "ENOENT" }),
        };
      },
      stderr(message) {
        messages.push(message);
      },
    },
  );

  assert.equal(status, 1);
  assert.deepEqual(calls, ["missing"]);
  assert.match(messages.join("\n"), /ENOENT|not found/);
});

test("maps a terminating signal to its conventional exit status", () => {
  const calls = [];
  const status = runVerifiedCommands(
    {
      commands: [["signaled"], ["never"]],
      environment: {},
    },
    {
      platform: "linux",
      spawn(file) {
        calls.push(file);
        return { status: null, signal: "SIGTERM", error: undefined };
      },
      stderr() {},
    },
  );

  assert.equal(status, 143);
  assert.deepEqual(calls, ["signaled"]);
});

test("rejects malformed options and empty command groups", () => {
  const invalidCases = [
    [],
    ["node", "test.mjs"],
    ["--env", "NOT-VALID=value", "--", "node"],
    ["--env", "MISSING_VALUE", "--", "node"],
    ["--env-copy", "TARGET=ABSENT", "--", "node"],
    ["--env-copy", "TARGET=BAD-SOURCE", "--", "node"],
    ["--unset", "BAD-NAME", "--", "node"],
    ["--unknown", "value", "--", "node"],
    ["--", "--next", "node"],
    ["--", "node", "--next"],
  ];

  for (const argv of invalidCases) {
    assert.throws(() => parseRunnerArguments(argv, {}));
  }
});

test("resolves npm and npx to Windows command shims only on Windows", () => {
  assert.equal(resolveExecutable("npm", "win32"), "npm.cmd");
  assert.equal(resolveExecutable("npx", "win32"), "npx.cmd");
  assert.equal(resolveExecutable("node", "win32"), "node");
  assert.equal(resolveExecutable("custom-tool", "win32"), "custom-tool");
  assert.equal(resolveExecutable("npm", "linux"), "npm");
});

test("executes Windows npm shims through their Node CLI without a shell", () => {
  const invocation = resolveSpawnInvocation("npx", ["vitest", "run"], {
    platform: "win32",
    environment: { Path: "C:\\Program Files\\nodejs" },
    execPath: "C:\\Program Files\\nodejs\\node.exe",
    exists(file) {
      return [
        "C:\\Program Files\\nodejs\\npx.cmd",
        "C:\\Program Files\\nodejs\\node_modules\\npm\\bin\\npx-cli.js",
      ].includes(file);
    },
  });

  assert.deepEqual(invocation, {
    file: "C:\\Program Files\\nodejs\\node.exe",
    args: [
      "C:\\Program Files\\nodejs\\node_modules\\npm\\bin\\npx-cli.js",
      "vitest",
      "run",
    ],
    displayFile: "npx.cmd",
  });
});
