import {
  configuredDianaOrigins,
  configuredDianaPreviewHostSuffix,
  isAllowedDianaOrigin,
  withStudentCors,
} from "./cors.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

Deno.test("production CORS fails closed without configured origins", async () => {
  const env = (name: string) => name === "DIANA_ENV" ? "production" : undefined;
  assert(configuredDianaOrigins(env).size === 0, "production origins failed open");
  const handler = withStudentCors(() => new Response("ok"), env);
  const response = await handler(new Request("https://functions.example.test/test", { method: "POST" }));
  assert(response.status === 503, "production request did not fail closed");
  assert(response.headers.get("Vary") === "Origin", "Vary: Origin missing");
});

Deno.test("configured CORS reflects only an allowlisted Diana origin", async () => {
  const env = (name: string) => name === "DIANA_ALLOWED_ORIGINS"
    ? "https://diana.example,https://app.diana.example"
    : name === "DIANA_ENV" ? "production" : undefined;
  const handler = withStudentCors(() => new Response("ok"), env);
  const allowed = await handler(new Request("https://functions.example.test/test", {
    method: "POST",
    headers: { Origin: "https://diana.example" },
  }));
  const blocked = await handler(new Request("https://functions.example.test/test", {
    method: "POST",
    headers: { Origin: "https://attacker.example" },
  }));
  assert(allowed.headers.get("Access-Control-Allow-Origin") === "https://diana.example", "allowed origin not reflected");
  assert(allowed.headers.get("Vary") === "Origin", "allowed response missing Vary");
  assert(blocked.status === 403, "unlisted origin allowed");
  assert(!blocked.headers.has("Access-Control-Allow-Origin"), "blocked origin reflected");
});

Deno.test("optional preview suffix allows only HTTPS diana Vercel preview hosts", async () => {
  const env = (name: string) => name === "DIANA_ALLOWED_PREVIEW_HOST_SUFFIX"
    ? "-teamcarrillo405-hubs-projects.vercel.app"
    : name === "DIANA_ENV" ? "production" : undefined;
  const allowedOrigin = "https://diana-canary-git-main-teamcarrillo405-hubs-projects.vercel.app";
  assert(
    configuredDianaPreviewHostSuffix(env) === "-teamcarrillo405-hubs-projects.vercel.app",
    "preview suffix was not configured",
  );
  assert(isAllowedDianaOrigin(allowedOrigin, env), "Diana preview was blocked");

  for (const origin of [
    "http://diana-canary-git-main-teamcarrillo405-hubs-projects.vercel.app",
    "https://diana-canary-git-main-teamcarrillo405-hubs-projects.vercel.app:444",
    "https://user@diana-canary-git-main-teamcarrillo405-hubs-projects.vercel.app",
    "https://other-canary-git-main-teamcarrillo405-hubs-projects.vercel.app",
    "https://diana-canary-git-main-other-team.vercel.app",
    "https://diana-canary-git-main-teamcarrillo405-hubs-projects.vercel.app.attacker.example",
    "https://diana-teamcarrillo405-hubs-projects.vercel.app",
  ]) {
    assert(!isAllowedDianaOrigin(origin, env), `unsafe preview origin was allowed: ${origin}`);
  }

  const handler = withStudentCors(() => new Response("ok"), env);
  const allowed = await handler(new Request("https://functions.example.test/test", {
    method: "POST",
    headers: { Origin: allowedOrigin },
  }));
  assert(allowed.status === 200, "valid Diana preview request was blocked");
  assert(
    allowed.headers.get("Access-Control-Allow-Origin") === allowedOrigin,
    "valid Diana preview origin was not reflected",
  );
});

Deno.test("invalid preview suffix values fail closed without changing exact origins", async () => {
  const invalidSuffix = (name: string) => name === "DIANA_ALLOWED_PREVIEW_HOST_SUFFIX"
    ? ".vercel.app"
    : name === "DIANA_ENV" ? "production" : undefined;
  assert(configuredDianaPreviewHostSuffix(invalidSuffix) === null, "invalid preview suffix was accepted");
  const closed = await withStudentCors(() => new Response("ok"), invalidSuffix)(
    new Request("https://functions.example.test/test", {
      method: "POST",
      headers: { Origin: "https://diana-canary.example.com" },
    }),
  );
  assert(closed.status === 503, "invalid suffix did not fail closed");

  const exactOrigin = (name: string) => name === "DIANA_ALLOWED_ORIGINS"
    ? "https://diana.example"
    : name === "DIANA_ALLOWED_PREVIEW_HOST_SUFFIX" ? ".vercel.app" : undefined;
  assert(isAllowedDianaOrigin("https://diana.example", exactOrigin), "exact origin was overwritten by invalid suffix");
});
