import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  expect,
  test as base,
  type BrowserContext,
  type Page,
  type TestInfo,
} from "@playwright/test";

import {
  SCREEN_DESIGN_CANONICAL_SCREEN_IDS,
  SCREEN_DESIGN_FIXED_CLOCK,
  SCREEN_DESIGN_FIXTURE_SCENARIOS,
  type ScreenDesignFixtureScenario,
  type ScreenDesignScreenId,
} from "@/lib/qa/screendesign-fixtures";
import {
  SCREEN_DESIGN_SCREEN_BY_ID,
  SCREEN_DESIGN_SCREENS,
  type ScreenDesignScreen,
} from "@/lib/screendesign/screens";

const UUID_PATTERN =
  /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/giu;
const TOKEN_PATTERN = /\bsdqa-[a-f0-9]{32}\b/giu;
const REVIEW_RUN_PATTERN = /^[a-z0-9][a-z0-9._-]*$/iu;
const DEFAULT_SCENARIO_BY_SCREEN = new Map(
  SCREEN_DESIGN_FIXTURE_SCENARIOS.filter((scenario) => scenario.isDefault).map(
    (scenario) => [scenario.screenId, scenario] as const,
  ),
);

export interface ScreenDesignConsoleEvidence {
  readonly consoleErrors: readonly string[];
  readonly pageErrors: readonly string[];
  readonly dispose: () => void;
}

export interface PreparedScreenDesignScenario {
  readonly scenario: ScreenDesignFixtureScenario;
  readonly screen: ScreenDesignScreen;
  readonly route: string;
  readonly storageStatePath: string | null;
}

export interface ScreenDesignHarness {
  readonly scenarios: readonly ScreenDesignFixtureScenario[];
  readonly prepare: (
    scenario: ScreenDesignFixtureScenario,
  ) => Promise<PreparedScreenDesignScenario>;
  readonly consoleEvidence: () => ScreenDesignConsoleEvidence;
}

type ScreenDesignFixtures = {
  screenDesign: ScreenDesignHarness;
};

const parseScreenIds = (): readonly ScreenDesignScreenId[] => {
  const requested = process.env.SCREEN_IDS;
  if (!requested?.trim()) return SCREEN_DESIGN_CANONICAL_SCREEN_IDS;

  const ids = requested
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  if (ids.length === 0) {
    throw new Error("SCREEN_IDS must contain at least one canonical screen id.");
  }
  if (new Set(ids).size !== ids.length) {
    throw new Error("SCREEN_IDS must not contain duplicate screen ids.");
  }

  const canonical = new Set<string>(SCREEN_DESIGN_CANONICAL_SCREEN_IDS);
  const unknown = ids.filter((id) => !canonical.has(id));
  if (unknown.length > 0) {
    throw new Error(`SCREEN_IDS contains unknown ids: ${unknown.join(", ")}`);
  }
  return ids as ScreenDesignScreenId[];
};

export const SELECTED_SCREEN_DESIGN_IDS = parseScreenIds();

export const SELECTED_SCREEN_DESIGN_SCREENS: readonly ScreenDesignScreen[] =
  Object.freeze(
    SELECTED_SCREEN_DESIGN_IDS.map((id) => {
      const screen = SCREEN_DESIGN_SCREEN_BY_ID.get(id);
      if (!screen) throw new Error(`Missing canonical screen registry entry: ${id}`);
      return screen;
    }),
  );

export const SELECTED_SCREEN_DESIGN_SCENARIOS: readonly ScreenDesignFixtureScenario[] =
  Object.freeze(
    SELECTED_SCREEN_DESIGN_IDS.map((id) => {
      const scenario = DEFAULT_SCENARIO_BY_SCREEN.get(id);
      if (!scenario) {
        throw new Error(`Canonical screen ${id} has no typed default fixture scenario.`);
      }
      if (scenario.guardedStates.length === 0) {
        throw new Error(`Fixture scenario ${scenario.id} has no declared guarded state.`);
      }
      return scenario;
    }),
  );

if (
  SCREEN_DESIGN_SCREENS.length !== SCREEN_DESIGN_CANONICAL_SCREEN_IDS.length ||
  DEFAULT_SCENARIO_BY_SCREEN.size !== SCREEN_DESIGN_CANONICAL_SCREEN_IDS.length
) {
  throw new Error(
    "ScreenDesign Playwright setup requires exactly one default typed scenario for each canonical screen.",
  );
}

const stableUuid = (ownerId: string, scenarioId: string, alias: string): string => {
  const hex = createHash("sha256")
    .update(`${ownerId}:${scenarioId}:${alias}`)
    .digest("hex")
    .slice(0, 32)
    .split("");
  hex[12] = "4";
  hex[16] = ["8", "9", "a", "b"][Number.parseInt(hex[16] ?? "0", 16) % 4] ?? "8";
  const value = hex.join("");
  return `${value.slice(0, 8)}-${value.slice(8, 12)}-${value.slice(12, 16)}-${value.slice(16, 20)}-${value.slice(20)}`;
};

const decodeBase64Url = (value: string): string =>
  Buffer.from(value, "base64url").toString("utf8");

const findAccessToken = (value: unknown): string | null => {
  if (!value || typeof value !== "object") return null;
  if (
    "access_token" in value &&
    typeof (value as { access_token?: unknown }).access_token === "string"
  ) {
    return (value as { access_token: string }).access_token;
  }
  for (const child of Object.values(value)) {
    const token = findAccessToken(child);
    if (token) return token;
  }
  return null;
};

const syntheticOwnerIdFromContext = async (
  context: BrowserContext,
): Promise<string> => {
  const cookies = (await context.cookies())
    .filter((cookie) => /sb-.+-auth-token(?:\.\d+)?$/u.test(cookie.name))
    .sort((left, right) => left.name.localeCompare(right.name));
  if (cookies.length === 0) {
    throw new Error("The ScreenDesign QA bootstrap did not create a Supabase auth cookie.");
  }

  const encoded = decodeURIComponent(cookies.map((cookie) => cookie.value).join(""));
  const sessionJson = encoded.startsWith("base64-")
    ? decodeBase64Url(encoded.slice("base64-".length))
    : encoded;
  let accessToken: string | null = null;
  try {
    accessToken = findAccessToken(JSON.parse(sessionJson) as unknown);
  } catch {
    accessToken = sessionJson.split(".").length === 3 ? sessionJson : null;
  }
  if (!accessToken) {
    throw new Error("The ScreenDesign QA auth cookie did not contain an access token.");
  }

  const payloadPart = accessToken.split(".")[1];
  if (!payloadPart) throw new Error("The ScreenDesign QA access token was malformed.");
  const payload = JSON.parse(decodeBase64Url(payloadPart)) as { sub?: unknown };
  if (typeof payload.sub !== "string" || !UUID_PATTERN.test(payload.sub)) {
    throw new Error("The ScreenDesign QA access token did not identify a synthetic owner.");
  }
  UUID_PATTERN.lastIndex = 0;
  return payload.sub;
};

const shareTokenFor = (
  scenario: ScreenDesignFixtureScenario,
  ownerId: string,
  tokenAlias: string,
): string => {
  const factory = scenario.records.find(
    (record) =>
      record.kind === "share-token" && record.values?.tokenAlias === tokenAlias,
  );
  if (!factory) {
    throw new Error(`Scenario ${scenario.id} has no share token alias ${tokenAlias}.`);
  }
  return `sdqa-${createHash("sha256")
    .update(`${ownerId}:${scenario.id}:${factory.alias}`)
    .digest("hex")
    .slice(0, 32)}`;
};

const resolveScenarioRoute = (
  scenario: ScreenDesignFixtureScenario,
  ownerId: string,
): string => {
  const pathname =
    scenario.route.pathname === "/(app)"
      ? "/dashboard"
      : Object.entries(scenario.route.params).reduce(
          (route, [param, alias]) => {
            const value =
              param === "token"
                ? shareTokenFor(scenario, ownerId, alias)
                : stableUuid(ownerId, scenario.id, alias);
            return route.replace(`[${param}]`, encodeURIComponent(value));
          },
          scenario.route.pathname as string,
        );

  if (/\[[^\]]+\]/u.test(pathname)) {
    throw new Error(`Scenario ${scenario.id} did not resolve every route parameter.`);
  }
  const query = new URLSearchParams({
    sdScenario: scenario.id,
    ...(scenario.route.stateSelector
      ? { sdState: scenario.route.stateSelector }
      : {}),
  });
  return `${pathname}?${query.toString()}`;
};

const assertSafeSeedResponse = (body: unknown): void => {
  const serialized = JSON.stringify(body);
  const blockedKeys = /"(?:password|access_token|refresh_token|service_role|userId|ownerId)"\s*:/iu;
  if (blockedKeys.test(serialized) || UUID_PATTERN.test(serialized) || TOKEN_PATTERN.test(serialized)) {
    UUID_PATTERN.lastIndex = 0;
    TOKEN_PATTERN.lastIndex = 0;
    throw new Error("ScreenDesign QA seed response exposed identity or credential material.");
  }
  UUID_PATTERN.lastIndex = 0;
  TOKEN_PATTERN.lastIndex = 0;
};

export const scrubGeneratedIdentifiers = (value: string): string =>
  value.replace(UUID_PATTERN, "[synthetic-id]").replace(TOKEN_PATTERN, "[share-token]");

export const installScreenDesignConsoleEvidence = (
  page: Page,
): ScreenDesignConsoleEvidence => {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const onConsole = (message: import("@playwright/test").ConsoleMessage) => {
    if (message.type() === "error") consoleErrors.push(scrubGeneratedIdentifiers(message.text()));
  };
  const onPageError = (error: Error) =>
    pageErrors.push(scrubGeneratedIdentifiers(error.message));
  page.on("console", onConsole);
  page.on("pageerror", onPageError);
  return {
    get consoleErrors() {
      return Object.freeze([...consoleErrors]);
    },
    get pageErrors() {
      return Object.freeze([...pageErrors]);
    },
    dispose: () => {
      page.off("console", onConsole);
      page.off("pageerror", onPageError);
    },
  };
};

export const freezeAndStabilizeScreenDesignPage = async (
  page: Page,
): Promise<void> => {
  await page.clock.setFixedTime(new Date(SCREEN_DESIGN_FIXED_CLOCK));
  await page.emulateMedia({ reducedMotion: "reduce", colorScheme: "dark" });
};

export const waitForScreenDesignReady = async (page: Page): Promise<void> => {
  await page.waitForLoadState("domcontentloaded");
  await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => undefined);
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(
      Array.from(document.images).map(async (image) => {
        if (image.complete) return image.decode().catch(() => undefined);
        await new Promise<void>((resolve) => {
          image.addEventListener("load", () => resolve(), { once: true });
          image.addEventListener("error", () => resolve(), { once: true });
        });
        return image.decode().catch(() => undefined);
      }),
    );
  });
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation-delay: 0s !important;
        animation-duration: 0s !important;
        caret-color: transparent !important;
        scroll-behavior: auto !important;
        transition-delay: 0s !important;
        transition-duration: 0s !important;
      }
    `,
  });
};

const reviewArtifactPath = (
  kind: "source" | "app" | "actions",
  screenId: string,
  extension: "png" | "json",
): string | null => {
  const root = process.env.SCREENDESIGN_REVIEW_DIR;
  const runId = process.env.SCREENDESIGN_REVIEW_RUN_ID;
  if (!root && !runId) return null;
  if (!root || !runId || !REVIEW_RUN_PATTERN.test(runId)) {
    throw new Error(
      "SCREENDESIGN_REVIEW_DIR and a safe SCREENDESIGN_REVIEW_RUN_ID are both required.",
    );
  }
  return path.join(path.resolve(root), runId, kind, `${screenId}.${extension}`);
};

export const emitScreenDesignReviewImage = async (
  page: Page,
  kind: "source" | "app",
  screenId: string,
): Promise<string | null> => {
  const output = reviewArtifactPath(kind, screenId, "png");
  if (!output) return null;
  await mkdir(path.dirname(output), { recursive: true });
  await page.screenshot({ path: output, fullPage: false, animations: "disabled" });
  return output;
};

export const emitScreenDesignActionEvidence = async (
  screenId: string,
  evidence: Readonly<Record<string, unknown>>,
): Promise<string | null> => {
  const output = reviewArtifactPath("actions", screenId, "json");
  if (!output) return null;
  const serialized = scrubGeneratedIdentifiers(JSON.stringify(evidence, null, 2));
  await mkdir(path.dirname(output), { recursive: true });
  await writeFile(output, `${serialized}\n`, { encoding: "utf8", flag: "wx" });
  return output;
};

const prepareScenario = async (
  page: Page,
  scenario: ScreenDesignFixtureScenario,
  testInfo: TestInfo,
): Promise<PreparedScreenDesignScenario> => {
  const screen = SCREEN_DESIGN_SCREEN_BY_ID.get(scenario.screenId);
  if (!screen) throw new Error(`Unknown ScreenDesign screen ${scenario.screenId}.`);
  await freezeAndStabilizeScreenDesignPage(page);

  const seedResponse = await page.goto(
    `/api/qa/anonymous-session?scenario=${encodeURIComponent(scenario.id)}`,
    { waitUntil: "networkidle" },
  );
  expect(seedResponse?.ok(), `Synthetic seed should succeed for ${scenario.id}`).toBe(true);
  const seedBody = (await seedResponse?.json()) as unknown;
  assertSafeSeedResponse(seedBody);
  const ownerId = await syntheticOwnerIdFromContext(page.context());
  const route = resolveScenarioRoute(scenario, ownerId);

  let storageStatePath: string | null = null;
  if (scenario.authClass === "authenticated") {
    storageStatePath = testInfo.outputPath("auth-storage-state.json");
    await page.context().storageState({ path: storageStatePath });
  } else {
    await page.context().clearCookies();
    await page.goto("about:blank");
  }
  return Object.freeze({ scenario, screen, route, storageStatePath });
};

export const screenDesignTest = base.extend<ScreenDesignFixtures>({
  screenDesign: async ({ page }, use, testInfo) => {
    await use({
      scenarios: SELECTED_SCREEN_DESIGN_SCENARIOS,
      prepare: (scenario) => prepareScenario(page, scenario, testInfo),
      consoleEvidence: () => installScreenDesignConsoleEvidence(page),
    });
  },
});

export { expect };
