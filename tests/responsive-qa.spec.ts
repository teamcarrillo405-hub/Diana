import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";

const baseUrl = process.env.QA_BASE_URL ?? "http://localhost:3000";
const runName = process.env.QA_RUN_NAME ?? `local-${new Date().toISOString().replace(/[:.]/g, "-")}`;
const outDir = join(process.cwd(), ".planning", "qa-screenshots", runName);

const viewports = [
  { label: "375x812", width: 375, height: 812 },
  { label: "390x844", width: 390, height: 844 },
  { label: "768x1024", width: 768, height: 1024 },
  { label: "1024x768", width: 1024, height: 768 },
  { label: "1440x1000", width: 1440, height: 1000 },
] as const;

const requiredRoutes = [
  "/",
  "/login",
  "/signup",
  "/proof",
  "/dashboard",
  "/assignments",
  "/notes",
  "/flashcards",
  "/settings/ai-history",
  "/teacher-share",
] as const;

const extraRoutes = [
  "/focus",
  "/study-buddy",
  "/break-down",
  "/reminders",
  "/imports",
  "/templates",
  "/accessibility",
  "/recap",
  "/shame-mode",
] as const;

const bannedVisibleTerms = [
  "past due",
  "overdue",
  "failed",
  "missed",
  "wrong",
  "incorrect",
  "you're behind",
] as const;

const authenticatedRoutes = new Set([
  "/proof",
  "/dashboard",
  "/assignments",
  "/notes",
  "/flashcards",
  "/settings/ai-history",
  "/teacher-share",
  ...extraRoutes,
]);

const qaEmail = process.env.QA_USER_EMAIL;
const qaPassword = process.env.QA_USER_PASSWORD;
const createQaUser = process.env.QA_CREATE_USER === "true";
const generatedQaEmail = `diana-qa-${Date.now()}@example.com`;
const generatedQaPassword = `DianaQa!${Date.now()}`;

type ResultRow = {
  route: string;
  viewport: string;
  screenshot: string;
  hasHorizontalOverflow: boolean;
  bannedVisible: string[];
  statusText: string;
  authState: "public" | "authenticated" | "login-redirect";
};

const rows: ResultRow[] = [];
let generatedQaAccountCreated = false;
mkdirSync(outDir, { recursive: true });

for (const viewport of viewports) {
  for (const route of [...requiredRoutes, ...extraRoutes]) {
    test(`${viewport.label} ${route}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      const needsAuth = authenticatedRoutes.has(route);
      if (needsAuth) {
        await ensureSignedInForQa(page);
      }
      const response = await page.goto(new URL(route, baseUrl).toString(), {
        waitUntil: "domcontentloaded",
        timeout: 15_000,
      });
      await page.waitForLoadState("networkidle", { timeout: 5_000 }).catch(() => undefined);

      const text = (await page.locator("body").innerText({ timeout: 5_000 }).catch(() => "")).toLowerCase();
      const hasHorizontalOverflow = await page.evaluate(() => {
        const doc = document.documentElement;
        const body = document.body;
        return Math.max(doc.scrollWidth, body?.scrollWidth ?? 0) > doc.clientWidth + 2;
      });
      const bannedVisible = bannedVisibleTerms.filter((term) => text.includes(term));
      const statusText =
        (response?.status() ?? 200) >= 500 || text.includes("internal server error")
          ? "internal-server-error"
          : "ok";
      const authState = !needsAuth
        ? "public"
        : isLoginRedirect(text)
          ? "login-redirect"
          : "authenticated";
      const fileRoute = route === "/" ? "landing" : route.replace(/^\//, "").replace(/\//g, "-");
      const screenshot = join(outDir, `${viewport.label}-${fileRoute}.png`);

      await page.screenshot({ path: screenshot, fullPage: true });
      rows.push({ route, viewport: viewport.label, screenshot, hasHorizontalOverflow, bannedVisible, statusText, authState });
      expect(statusText, `${viewport.label} ${route} should render without an internal server page`).toBe("ok");
      if (needsAuth) {
        expect(authState, `${viewport.label} ${route} should render signed-in app UI; set QA_USER_EMAIL and QA_USER_PASSWORD for authenticated QA`).toBe("authenticated");
      }
      expect(hasHorizontalOverflow, `${viewport.label} ${route} should not horizontally overflow`).toBe(false);
      expect(bannedVisible, `${viewport.label} ${route} should not show blocked pressure copy`).toEqual([]);
    });
  }
}

test.afterAll(() => {
  writeFileSync(join(outDir, "qa-results.json"), `${JSON.stringify(rows, null, 2)}\n`);
});

async function ensureSignedInForQa(page: import("@playwright/test").Page) {
  if (qaEmail && qaPassword) {
    await signInForQa(page, qaEmail, qaPassword);
    return;
  }

  if (createQaUser) {
    if (generatedQaAccountCreated) {
      await signInForQa(page, generatedQaEmail, generatedQaPassword);
      await expectAuthenticatedForQa(page, "generated QA sign-in");
      return;
    }

    const anonymousSessionCreated = await createAnonymousQaSession(page);
    if (!anonymousSessionCreated) {
      await signUpAndOnboardForQa(page);
    }
    generatedQaAccountCreated = true;
    await expectAuthenticatedForQa(page, "generated QA session");
  }
}

async function signInForQa(page: import("@playwright/test").Page, email: string, password: string) {
  await page.goto(new URL("/login", baseUrl).toString(), {
    waitUntil: "domcontentloaded",
    timeout: 15_000,
  });
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForLoadState("networkidle", { timeout: 7_000 }).catch(() => undefined);
}

async function createAnonymousQaSession(page: import("@playwright/test").Page) {
  const response = await page.goto(new URL("/api/qa/anonymous-session", baseUrl).toString(), {
    waitUntil: "networkidle",
    timeout: 15_000,
  }).catch(() => null);
  return response?.ok() ?? false;
}

async function signUpAndOnboardForQa(page: import("@playwright/test").Page) {
  await page.goto(new URL("/signup", baseUrl).toString(), {
    waitUntil: "domcontentloaded",
    timeout: 15_000,
  });
  await page.getByLabel("Email").fill(generatedQaEmail);
  await page.getByLabel("Password").fill(generatedQaPassword);
  await page.getByLabel("Name").fill("Diana QA Student");
  await page.getByLabel("Date of birth").fill("2009-09-01");
  await page.getByRole("button", { name: /create account/i }).click();
  await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => undefined);

  if (page.url().includes("/onboarding")) {
    await page.getByRole("button", { name: /skip/i }).click();
    await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => undefined);
  }
}

async function expectAuthenticatedForQa(page: import("@playwright/test").Page, source: string) {
  await page.goto(new URL("/dashboard", baseUrl).toString(), {
    waitUntil: "domcontentloaded",
    timeout: 15_000,
  });
  await page.waitForLoadState("networkidle", { timeout: 7_000 }).catch(() => undefined);
  const text = (await page.locator("body").innerText({ timeout: 5_000 }).catch(() => "")).toLowerCase();
  const url = page.url();
  if (url.includes("/login") || isLoginRedirect(text)) {
    throw new Error(
      `${source} did not create an authenticated Diana session. ` +
        "Set QA_USER_EMAIL and QA_USER_PASSWORD for an already-onboarded test student, " +
        "or run the dev server with QA_CREATE_USER=true and Supabase anonymous auth enabled.",
    );
  }
}

function isLoginRedirect(text: string): boolean {
  return text.includes("welcome back") &&
    text.includes("email") &&
    text.includes("password") &&
    text.includes("sign in");
}
