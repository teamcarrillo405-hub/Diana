export type CodeLanguage = "javascript" | "python";

export type CodeRunResult = {
  ok: boolean;
  output: string[];
  error: string | null;
};

type Env = Record<string, string | number | boolean>;

export function runPythonLite(code: string): CodeRunResult {
  const output: string[] = [];
  const env: Env = {};
  const lines = code.replace(/\r\n/g, "\n").split("\n");

  for (let i = 0; i < lines.length; i += 1) {
    const raw = lines[i] ?? "";
    if (isBlankOrComment(raw)) continue;

    const trimmed = raw.trim();
    const loop = trimmed.match(/^for\s+([A-Za-z_]\w*)\s+in\s+range\((.+)\):$/);
    if (loop) {
      let count = 0;
      try {
        count = Number(evaluateExpression(loop[2] ?? "", env));
      } catch (err) {
        return errorResult(output, err instanceof Error ? err.message : "Check the range expression.");
      }
      if (!Number.isInteger(count) || count < 0 || count > 100) {
        return errorResult(output, "Use range with a whole number from 0 to 100.");
      }
      const body: string[] = [];
      while (i + 1 < lines.length && /^\s+/.test(lines[i + 1] ?? "")) {
        i += 1;
        const bodyLine = (lines[i] ?? "").trim();
        if (!isBlankOrComment(bodyLine)) body.push(bodyLine);
      }
      for (let n = 0; n < count; n += 1) {
        env[loop[1] ?? "i"] = n;
        for (const bodyLine of body) {
          const step = executePythonLine(bodyLine, env, output);
          if (!step.ok) return step;
        }
      }
      continue;
    }

    const result = executePythonLine(trimmed, env, output);
    if (!result.ok) return result;
  }

  return { ok: true, output, error: null };
}

function executePythonLine(line: string, env: Env, output: string[]): CodeRunResult {
  try {
    const print = line.match(/^print\((.*)\)$/);
    if (print) {
      const args = splitArgs(print[1] ?? "");
      const values = args.map((arg) => String(evaluateExpression(arg, env)));
      output.push(values.join(" "));
      return { ok: true, output, error: null };
    }

    const assignment = line.match(/^([A-Za-z_]\w*)\s*=\s*(.+)$/);
    if (assignment) {
      env[assignment[1] ?? "value"] = evaluateExpression(assignment[2] ?? "", env);
      return { ok: true, output, error: null };
    }
  } catch (err) {
    return errorResult(output, err instanceof Error ? err.message : "Check that line.");
  }

  return errorResult(output, "Python Lite supports print, variables, arithmetic, and for range loops.");
}

function evaluateExpression(expr: string, env: Env): string | number | boolean {
  const trimmed = expr.trim();
  if (/^(['"]).*\1$/.test(trimmed)) return trimmed.slice(1, -1);
  if (trimmed === "True") return true;
  if (trimmed === "False") return false;

  const replaced = trimmed.replace(/\b[A-Za-z_]\w*\b/g, (name) => {
    if (name === "and") return "&&";
    if (name === "or") return "||";
    if (name === "not") return "!";
    if (name in env) return JSON.stringify(env[name]);
    return name;
  });

  if (!/^[0-9+\-*/%().<>=!&| "'\[\],]+$/.test(replaced)) {
    throw new Error("Expression uses syntax Python Lite does not support yet.");
  }

  try {
    return Function(`"use strict"; return (${replaced});`)() as string | number | boolean;
  } catch {
    throw new Error("Expression uses syntax Python Lite does not support yet.");
  }
}

function splitArgs(value: string): string[] {
  const args: string[] = [];
  let current = "";
  let quote: string | null = null;
  for (const char of value) {
    if ((char === "'" || char === '"') && quote === null) quote = char;
    else if (char === quote) quote = null;
    if (char === "," && quote === null) {
      args.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  if (current.trim().length > 0) args.push(current.trim());
  return args;
}

function isBlankOrComment(line: string): boolean {
  const trimmed = line.trim();
  return trimmed.length === 0 || trimmed.startsWith("#");
}

function errorResult(output: string[], error: string): CodeRunResult {
  return { ok: false, output, error };
}
