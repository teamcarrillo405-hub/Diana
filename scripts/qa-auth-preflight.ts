const baseUrl = process.env.QA_BASE_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const qaEmail = process.env.QA_USER_EMAIL;
const qaPassword = process.env.QA_USER_PASSWORD;
const createQaUser = process.env.QA_CREATE_USER === "true";

function fail(message: string): never {
  console.error(`qa-auth-preflight: ${message}`);
  process.exit(1);
}

function pass(message: string) {
  console.log(`qa-auth-preflight: ${message}`);
}

if (qaEmail && qaPassword) {
  pass("QA_USER_EMAIL and QA_USER_PASSWORD are configured. Run npm run qa:responsive against the live app.");
  process.exit(0);
}

if (!createQaUser) {
  fail(
    "No QA credentials are configured. Set QA_USER_EMAIL and QA_USER_PASSWORD for an already-onboarded student, " +
      "or set QA_CREATE_USER=true on both the Next.js dev server and the QA command.",
  );
}

const url = new URL("/api/qa/anonymous-session", baseUrl).toString();

void main();

async function main() {
  try {
    const response = await fetch(url, { redirect: "manual" });
    const text = await response.text();
    const body = tryParseJson(text);

    if (response.ok) {
      pass("dev-only QA session route is available. Run npm run qa:responsive with QA_CREATE_USER=true.");
      process.exit(0);
    }

    if (response.status >= 300 && response.status < 400) {
      fail(
        `QA bootstrap route redirected instead of running. Launch the dev server with QA_CREATE_USER=true. URL: ${url}`,
      );
    }

    const error = typeof body?.error === "string" ? body.error : text || response.statusText;
    fail(`QA bootstrap route is not ready (${response.status}). ${error}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    fail(`Could not reach ${url}. Start the app first, then rerun this preflight. ${message}`);
  }
}

function tryParseJson(value: string): { error?: unknown } | null {
  try {
    return JSON.parse(value) as { error?: unknown };
  } catch {
    return null;
  }
}
