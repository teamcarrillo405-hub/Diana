import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, type Request } from "@playwright/test";
import { Buffer } from "node:buffer";

const LOOPBACK_HOSTS = new Set(["127.0.0.1", "localhost", "::1", "[::1]"]);
const EXPECTED_BLOCKED_ASSET_ORIGINS = new Set([
  "https://images.pexels.com",
  "https://images.unsplash.com",
]);
const TRANSPARENT_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64",
);
const HYDRATION_ERROR =
  /hydration|hydrated but some attributes|server rendered html|did not match|expected server html|content does not match/iu;
const ERROR_BOUNDARY = /application error|internal server error/iu;

export const BETA_AUTHENTICATED_VIEWPORTS = [
  { name: "phone", width: 390, height: 844 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "compact-desktop", width: 1024, height: 768 },
  { name: "standard-desktop", width: 1366, height: 768 },
  { name: "wide-desktop", width: 1600, height: 1000 },
] as const;

export const BETA_VIEWPORTS = BETA_AUTHENTICATED_VIEWPORTS;

type BrowserIssueKind =
  | "console-error"
  | "console-warning"
  | "hydration-error"
  | "page-error"
  | "request-error"
  | "same-origin-subresource";

type BrowserIssue = {
  kind: BrowserIssueKind;
  detail: string;
};

type BrowserIssueAllowance = {
  kind: BrowserIssueKind;
  pattern: RegExp;
};

type RequestFailureSnapshot = {
  errorText: string | undefined;
  headers: Record<string, string>;
  method: string;
  resourceType: string;
  url: string;
};

const BROWSER_ISSUE_ALLOWLIST: readonly BrowserIssueAllowance[] = [
  // Next development mode may replace this disposable HMR bundle while the
  // browser moves between independent routes. Production has no HMR.
  {
    kind: "request-error",
    pattern:
      /^net::ERR_ABORTED \[script\] GET http:\/\/(?:127\.0\.0\.1|localhost|\[::1\])(?::\d+)?\/_next\/static\/(?:webpack\/webpack\.[a-f0-9]+\.hot-update\.js|chunks\/_app-pages-browser_node_modules_next_dist_client_dev_noop-turbopack-hmr_js\.js)$/u,
  },
  {
    kind: "console-warning",
    pattern:
      /^The resource http:\/\/(?:127\.0\.0\.1|localhost|\[::1\])(?::\d+)?\/_next\/static\/media\/\S+\.woff2(?:\?\S+)? was preloaded using link preload but not used within a few seconds from the window's load event\. Please make sure it has an appropriate `as` value and it is preloaded intentionally\.$/u,
  },
  // Playwright intentionally blocks service workers for this isolated browser
  // run so a previous local cache cannot affect the student flow under test.
  {
    kind: "console-warning",
    pattern: /^Service Worker registration blocked by Playwright$/u,
  },
  // Chromium's headless screenshot path can emit this after a successful WebGL frame.
  {
    kind: "console-warning",
    pattern:
      /^\[\.WebGL-0x[0-9a-f]+\]GL Driver Message \(OpenGL, Performance, GL_CLOSE_PATH_NV, High\): GPU stall due to ReadPixels(?: \(this message will no longer repeat\))?$/u,
  },
];

export function isBrowserIssueAllowed(kind: BrowserIssueKind, value: string): boolean {
  return BROWSER_ISSUE_ALLOWLIST.some(
    (entry) => entry.kind === kind && entry.pattern.test(value),
  );
}

/**
 * Next's App Router starts same-origin RSC prefetches for visible links. Chromium
 * cancels those speculative requests when a test navigates before they complete.
 * That is expected browser behavior, but only the explicit router-prefetch shape
 * is ignored. All other aborted fetches remain release-blocking evidence.
 */
export function isExpectedNextRouterPrefetchAbort(
  request: RequestFailureSnapshot,
  allowedOrigin: string,
): boolean {
  if (request.errorText !== "net::ERR_ABORTED") return false;
  if (request.resourceType !== "fetch" || request.method !== "GET") return false;

  let target: URL;
  try {
    target = new URL(request.url);
  } catch {
    return false;
  }
  if (target.origin !== allowedOrigin) return false;

  const headers = Object.fromEntries(
    Object.entries(request.headers).map(([key, value]) => [key.toLowerCase(), value]),
  );
  return headers.rsc === "1" && headers["next-router-prefetch"] === "1";
}

export type BrowserIssueMonitor = {
  expectClean(label: string): void;
};

export type BrowserIssueMonitorOptions = {
  allowRequestFailure?(request: Request): boolean;
};

export type LocalNetworkGuard = {
  expectLocalOnly(label: string): void;
};

function requireUrl(value: string | undefined, label: string): URL {
  if (!value) throw new Error(`${label} is required for deterministic beta browser QA.`);
  return new URL(value);
}

function isLoopback(url: URL): boolean {
  return url.protocol === "http:" && LOOPBACK_HOSTS.has(url.hostname);
}

function escapeRegularExpression(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

function browserResourceLabel(value: string): string {
  try {
    const parsed = new URL(value);
    return `${parsed.origin}${parsed.pathname}`;
  } catch {
    return "[unparseable browser URL]";
  }
}

export function expectSafeBetaBrowserEnvironment(baseURL: string | undefined): URL {
  const target = requireUrl(baseURL, "Playwright baseURL");
  const supabaseTarget = requireUrl(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    "NEXT_PUBLIC_SUPABASE_URL",
  );

  expect(target.protocol).toBe("http:");
  expect(target.hostname).toBe("127.0.0.1");
  expect(isLoopback(supabaseTarget), "Supabase must be loopback-only for beta browser QA").toBe(true);
  expect(supabaseTarget.origin, "Supabase must use a dedicated origin").not.toBe(target.origin);
  expect(process.env.QA_CREATE_USER).toBe("true");
  expect(process.env.QA_LOCAL_BROWSER_GATE).toBe("true");
  expect(process.env.QA_BROWSER_SESSION_TOKEN).toMatch(
    /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/u,
  );
  expect(process.env.QA_REUSE_EXISTING_SERVER).toBe("false");
  expect(process.env.QA_USER_EMAIL).toBeUndefined();
  expect(process.env.QA_USER_PASSWORD).toBeUndefined();
  expect(process.env.QA_TEST_EMAIL).toMatch(/^diana-beta-[a-f0-9]{16}@local\.test$/u);
  expect(process.env.QA_TEST_PASSWORD).toBeUndefined();
  expect(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.length ?? 0).toBeGreaterThanOrEqual(20);
  expect(process.env.SUPABASE_SERVICE_ROLE_KEY?.length ?? 0).toBeGreaterThanOrEqual(20);
  expect(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY).not.toBe(
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );

  return target;
}

export async function installLocalNetworkGuard(
  page: Page,
  allowedOrigin: string,
): Promise<LocalNetworkGuard> {
  const blockedOrigins = new Set<string>();
  const allowed = new URL(allowedOrigin);
  const supabase = requireUrl(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    "NEXT_PUBLIC_SUPABASE_URL",
  );
  if (!isLoopback(supabase)) {
    throw new Error("The beta browser network guard requires loopback Supabase.");
  }
  const allowedHosts = [allowed.host, supabase.host]
    .map(escapeRegularExpression)
    .join("|");
  const externalHttpUrl = new RegExp(
    `^https?:\\/\\/(?!(?:${allowedHosts})(?:[/?#]|$))`,
    "iu",
  );
  const optimizedImageUrl = new RegExp(
    `^${escapeRegularExpression(allowedOrigin)}\\/_next\\/image\\?`,
    "iu",
  );

  await page.route(externalHttpUrl, async (route) => {
    const requestUrl = new URL(route.request().url());
    blockedOrigins.add(requestUrl.origin);
    if (EXPECTED_BLOCKED_ASSET_ORIGINS.has(requestUrl.origin)) {
      await route.fulfill({ status: 200, contentType: "image/png", body: TRANSPARENT_PNG });
      return;
    }
    await route.abort("blockedbyclient");
  });

  await page.route(optimizedImageUrl, async (route) => {
    const requestUrl = new URL(route.request().url());
    const imageSource = requestUrl.searchParams.get("url");
    if (imageSource) {
      try {
        const imageUrl = new URL(imageSource, allowedOrigin);
        if (["http:", "https:"].includes(imageUrl.protocol) && imageUrl.origin !== allowedOrigin) {
          blockedOrigins.add(imageUrl.origin);
          if (EXPECTED_BLOCKED_ASSET_ORIGINS.has(imageUrl.origin)) {
            await route.fulfill({ status: 200, contentType: "image/png", body: TRANSPARENT_PNG });
            return;
          }
          await route.abort("blockedbyclient");
          return;
        }
      } catch {
        blockedOrigins.add("invalid-image-source");
        await route.abort("blockedbyclient");
        return;
      }
    }

    if (requestUrl.origin !== allowedOrigin) {
      blockedOrigins.add(requestUrl.origin);
      await route.abort("blockedbyclient");
      return;
    }
    await route.continue();
  });

  return {
    expectLocalOnly(label: string) {
      const unexpectedOrigins = [...blockedOrigins]
        .filter((origin) => !EXPECTED_BLOCKED_ASSET_ORIGINS.has(origin))
        .sort();
      expect(
        unexpectedOrigins,
        `${label} attempted unexpected browser traffic outside ${allowedOrigin}. ` +
          "Known public image assets were blocked without leaving localhost.",
      ).toEqual([]);
    },
  };
}

export function observeBrowserIssues(
  page: Page,
  allowedOrigin: string,
  options: BrowserIssueMonitorOptions = {},
): BrowserIssueMonitor {
  const unexpectedIssues: BrowserIssue[] = [];
  const expectedOrigin = new URL(allowedOrigin).origin;
  const monitoredOrigins = new Set([
    expectedOrigin,
    requireUrl(process.env.NEXT_PUBLIC_SUPABASE_URL, "NEXT_PUBLIC_SUPABASE_URL").origin,
  ]);

  const record = (kind: BrowserIssueKind, detail: string, allowlistValue = detail) => {
    const allowed = isBrowserIssueAllowed(kind, allowlistValue);
    if (!allowed) unexpectedIssues.push({ kind, detail });
  };

  page.on("console", (message) => {
    const text = message.text();
    const sourceUrl = message.location().url;
    let source = "";
    if (sourceUrl) {
      try {
        const parsed = new URL(sourceUrl);
        source = ` [${parsed.origin}${parsed.pathname}]`;
      } catch {
        source = " [unparseable browser source]";
      }
    }
    const detail = `${text}${source}`;
    if (message.type() === "error") record("console-error", detail, text);
    if (message.type() === "warning") record("console-warning", detail, text);
    if (HYDRATION_ERROR.test(text)) record("hydration-error", detail, text);
  });
  page.on("pageerror", (error) => record("page-error", error.message));
  page.on("requestfailed", (request) => {
    if (options.allowRequestFailure?.(request)) return;
    if (isExpectedNextRouterPrefetchAbort({
      errorText: request.failure()?.errorText,
      headers: request.headers(),
      method: request.method(),
      resourceType: request.resourceType(),
      url: request.url(),
    }, expectedOrigin)) return;
    record(
      "request-error",
      `${request.failure()?.errorText ?? "unknown failure"} ` +
        `[${request.resourceType()}] ${request.method()} ${browserResourceLabel(request.url())}`,
    );
  });
  page.on("response", (response) => {
    if (response.status() < 400 || response.request().resourceType() === "document") return;
    const responseUrl = new URL(response.url());
    if (!monitoredOrigins.has(responseUrl.origin)) return;
    record(
      "same-origin-subresource",
      `HTTP ${response.status()} [${response.request().resourceType()}] ` +
        `${response.request().method()} ${browserResourceLabel(response.url())}`,
    );
  });

  return {
    expectClean(label: string) {
      expect(
        unexpectedIssues.map((issue) => `[${issue.kind}] ${issue.detail}`),
        `${label} unexpected browser issues`,
      ).toEqual([]);
    },
  };
}

export async function openHealthyPage(page: Page, route: string, label: string) {
  const response = await page.goto(route, { waitUntil: "domcontentloaded" });
  expect(response, `${label} should return a document response`).not.toBeNull();
  expect(response!.status(), `${label} should not return an HTTP error`).toBeLessThan(400);
  await expect(page.locator("body"), `${label} body`).toBeVisible();
  await expect(page.locator("body"), `${label} error boundary`).not.toContainText(ERROR_BOUNDARY);
  await page.waitForLoadState("load");
  await page.waitForLoadState("networkidle", { timeout: 10_000 });
  return response!;
}

export async function expectNoHorizontalOverflow(page: Page, label: string) {
  const layout = await page.evaluate(() => {
    const documentWidth = Math.max(
      document.documentElement.scrollWidth,
      document.body?.scrollWidth ?? 0,
    );
    const viewportWidth = document.documentElement.clientWidth;
    const offenders = Array.from(document.querySelectorAll<HTMLElement>("body *"))
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          label: [
            element.tagName.toLowerCase(),
            element.id ? `#${element.id}` : "",
            ...Array.from(element.classList).slice(0, 2).map((name) => `.${name}`),
          ].join(""),
          left: Math.round(rect.left),
          right: Math.round(rect.right),
          width: Math.round(rect.width),
        };
      })
      .filter(({ left, right, width }) => width > 0 && (left < -2 || right > viewportWidth + 2))
      .slice(0, 8);

    return { documentWidth, viewportWidth, offenders };
  });

  expect(
    layout.documentWidth,
    `${label} must not scroll sideways. Offenders: ${layout.offenders
      .map((item) => `${item.label} (${item.left}..${item.right}, width ${item.width})`)
      .join(", ") || "unknown"}`,
  ).toBeLessThanOrEqual(layout.viewportWidth + 2);
}

export async function expectNoWcagAaAccessibilityViolations(page: Page, label: string) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();

  expect(
    results.violations.map(
      (violation) =>
        `${violation.id} [${violation.impact ?? "unknown impact"}]: ${violation.help} ` +
        `(${violation.nodes.length} nodes: ${violation.nodes
          .map((node) => node.target.join(" "))
          .join(", ")})`,
    ),
    `WCAG A/AA accessibility violations on ${label}`,
  ).toEqual([]);
}

export type LocalQaStudentSessionOptions = {
  scenario?: string;
  operation?: "seed" | "resume";
};

export async function openLocalQaStudentSession(
  page: Page,
  {
    scenario = "assignment-detail:default",
    operation = "seed",
  }: LocalQaStudentSessionOptions = {},
): Promise<void> {
  expect(process.env.QA_CREATE_USER, "The beta QA auth bootstrap must be enabled").toBe("true");
  const sessionToken = process.env.QA_BROWSER_SESSION_TOKEN;
  expect(sessionToken, "The beta QA auth bootstrap must have a one-run session token").toMatch(
    /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/u,
  );
  const supabaseTarget = requireUrl(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    "NEXT_PUBLIC_SUPABASE_URL",
  );
  expect(isLoopback(supabaseTarget), "The beta QA bootstrap requires loopback Supabase").toBe(true);

  const params = new URLSearchParams({ scenario });
  if (operation === "resume") params.set("operation", operation);
  await page.setExtraHTTPHeaders({ "x-diana-beta-qa-session": sessionToken! });
  let response;
  try {
    response = await page.goto(
      `/api/qa/anonymous-session?${params.toString()}`,
      { waitUntil: "domcontentloaded" },
    );
  } finally {
    await page.setExtraHTTPHeaders({});
  }
  expect(response, "The real local QA session endpoint must respond").not.toBeNull();
  expect(response!.status(), "The real local QA session bootstrap must succeed").toBe(200);
  const payload = (await response!.json()) as { ok?: boolean; resumed?: boolean; scenarioId?: string };
  expect(payload, "The real local QA session must authenticate the requested scenario").toMatchObject({
    ok: true,
    scenarioId: scenario,
  });
  if (operation === "resume") {
    expect(payload.resumed, "The QA recovery session must preserve its existing fixture").toBe(true);
  }

  await openHealthyPage(page, "/assignments", "authenticated assignment index");
  expect(new URL(page.url()).pathname, "The real local session must pass the auth boundary").toBe(
    "/assignments",
  );
}
