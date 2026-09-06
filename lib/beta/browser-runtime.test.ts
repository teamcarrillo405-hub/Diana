import { describe, expect, it } from "vitest";

import {
  isIsolatedBetaBrowserRuntime,
  isQaSessionBootstrapEnabled,
} from "./browser-runtime";

describe("isIsolatedBetaBrowserRuntime", () => {
  it("enables the isolated browser behavior only for the explicit QA value", () => {
    expect(isIsolatedBetaBrowserRuntime("true")).toBe(true);
    expect(isIsolatedBetaBrowserRuntime("false")).toBe(false);
    expect(isIsolatedBetaBrowserRuntime("1")).toBe(false);
    expect(isIsolatedBetaBrowserRuntime("TRUE")).toBe(false);
  });
});

describe("isQaSessionBootstrapEnabled", () => {
  const productionEnvironment = {
    NODE_ENV: "production",
    QA_CREATE_USER: "true",
    QA_SERVER_MODE: "production",
    QA_LOCAL_BROWSER_GATE: "true",
    NEXT_PUBLIC_DIANA_BETA_BROWSER_QA: "true",
    QA_BROWSER_SESSION_TOKEN: "local-only-beta-bootstrap-token-12345",
    QA_BASE_URL: "http://127.0.0.1:4317",
    NEXT_PUBLIC_APP_URL: "http://127.0.0.1:4317",
    NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
  };

  it("permits only the signed isolated loopback production runtime", () => {
    const request = new Request("http://127.0.0.1:4317/api/qa/anonymous-session", {
      headers: {
        "x-diana-beta-qa-session": productionEnvironment.QA_BROWSER_SESSION_TOKEN,
      },
    });

    expect(isQaSessionBootstrapEnabled(request, productionEnvironment)).toBe(true);
  });

  it("keeps a production deployment closed when the host or one-run token is not valid", () => {
    const publicRequest = new Request("https://diana.example/api/qa/anonymous-session", {
      headers: {
        "x-diana-beta-qa-session": productionEnvironment.QA_BROWSER_SESSION_TOKEN,
      },
    });
    const missingToken = new Request("http://127.0.0.1:4317/api/qa/anonymous-session");

    expect(isQaSessionBootstrapEnabled(publicRequest, productionEnvironment)).toBe(false);
    expect(isQaSessionBootstrapEnabled(missingToken, productionEnvironment)).toBe(false);
  });

  it("retains the existing development-only QA workflow when explicitly enabled", () => {
    expect(
      isQaSessionBootstrapEnabled(
        new Request("http://diana.test/api/qa/anonymous-session"),
        { NODE_ENV: "development", QA_CREATE_USER: "true" },
      ),
    ).toBe(true);
  });
});
