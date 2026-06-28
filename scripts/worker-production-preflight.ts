import { loadEnvConfig } from "@next/env";
import { createServiceClient } from "../lib/supabase/service";

loadEnvConfig(process.cwd());

type Check = { name: string; ok: boolean; detail: string };

function argValue(name: string): string | null {
  const prefix = `--${name}=`;
  const match = process.argv.find((arg) => arg.startsWith(prefix));
  return match ? match.slice(prefix.length) : null;
}

async function main() {
  const baseUrl = argValue("base-url") ?? process.env.DIANA_WORKER_BASE_URL;
  const expectedAppSha = argValue("expected-app-sha") ?? process.env.DIANA_EXPECTED_APP_SHA;
  const token = process.env.WORKER_API_TOKEN;
  const checks: Check[] = [];

  checks.push({
    name: "DIANA_WORKER_BASE_URL",
    ok: Boolean(baseUrl),
    detail: baseUrl ? "configured" : "missing",
  });
  checks.push({
    name: "WORKER_API_TOKEN",
    ok: Boolean(token),
    detail: token ? "configured" : "missing",
  });

  if (baseUrl) {
    checks.push(await checkLogin(baseUrl));
    checks.push(await checkDianaStatusRequiresAuth(baseUrl));
    checks.push(await checkWorkerPostRequiresAuth(baseUrl, "/api/workers/claim", "Worker claim requires bearer auth"));
    checks.push(await checkWorkerPostRequiresAuth(baseUrl, "/api/workers/complete", "Worker complete requires bearer auth"));
    checks.push(await checkMetricsRequiresAuth(baseUrl));
    checks.push(await checkPrometheusMetricsRequiresAuth(baseUrl));
    checks.push(await checkWorkerVersionRequiresAuth(baseUrl));
  }

  if (baseUrl && token) {
    checks.push(await checkWorkerClaimAuthorizedValidation(baseUrl, token));
    checks.push(await checkWorkerCompleteAuthorizedValidation(baseUrl, token));
    checks.push(await checkMetricsAuthorized(baseUrl, token));
    checks.push(await checkPrometheusMetricsAuthorized(baseUrl, token));
    checks.push(await checkWorkerVersionAuthorized(baseUrl, token, expectedAppSha));
  }

  checks.push(...await checkWorkerDatabaseReadiness());

  const ok = checks.every((check) => check.ok);
  console.log(JSON.stringify({ ok, checks }, null, 2));
  if (!ok) process.exit(1);
}

async function checkLogin(baseUrl: string) {
  try {
    const response = await fetch(new URL("/login?next=%2Fvoice", baseUrl));
    return {
      name: "Diana app reachable",
      ok: response.status === 200,
      detail: `status ${response.status}`,
    };
  } catch (error) {
    return {
      name: "Diana app reachable",
      ok: false,
      detail: error instanceof Error ? error.message : String(error),
    };
  }
}

async function checkDianaStatusRequiresAuth(baseUrl: string) {
  try {
    const url = new URL("/api/diana/voice-candidate/status", baseUrl);
    url.searchParams.set("traceId", "preflight-trace");
    const response = await fetch(url);
    return {
      name: "Diana voice status requires student auth",
      ok: response.status === 401,
      detail: `status ${response.status}`,
    };
  } catch (error) {
    return {
      name: "Diana voice status requires student auth",
      ok: false,
      detail: error instanceof Error ? error.message : String(error),
    };
  }
}

async function checkMetricsRequiresAuth(baseUrl: string) {
  try {
    const response = await fetch(new URL("/api/workers/metrics", baseUrl));
    return {
      name: "Worker metrics require bearer auth",
      ok: response.status === 401,
      detail: `status ${response.status}`,
    };
  } catch (error) {
    return {
      name: "Worker metrics require bearer auth",
      ok: false,
      detail: error instanceof Error ? error.message : String(error),
    };
  }
}

async function checkWorkerPostRequiresAuth(baseUrl: string, path: string, name: string) {
  try {
    const response = await fetch(new URL(path, baseUrl), {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: "{}",
    });
    return {
      name,
      ok: response.status === 401,
      detail: `status ${response.status}`,
    };
  } catch (error) {
    return {
      name,
      ok: false,
      detail: error instanceof Error ? error.message : String(error),
    };
  }
}

async function checkWorkerClaimAuthorizedValidation(baseUrl: string, token: string) {
  try {
    const response = await fetch(new URL("/api/workers/claim", baseUrl), {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: "{}",
    });
    const json = await response.json().catch(() => null) as { error?: string } | null;
    return {
      name: "Worker claim bearer auth reaches validation",
      ok: response.status === 400 && json?.error === "Worker id is required.",
      detail: `status ${response.status}`,
    };
  } catch (error) {
    return {
      name: "Worker claim bearer auth reaches validation",
      ok: false,
      detail: error instanceof Error ? error.message : String(error),
    };
  }
}

async function checkWorkerCompleteAuthorizedValidation(baseUrl: string, token: string) {
  try {
    const response = await fetch(new URL("/api/workers/complete", baseUrl), {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: "{}",
    });
    const json = await response.json().catch(() => null) as { error?: string } | null;
    return {
      name: "Worker complete bearer auth reaches validation",
      ok: response.status === 400 && json?.error === "Trace id is required.",
      detail: `status ${response.status}`,
    };
  } catch (error) {
    return {
      name: "Worker complete bearer auth reaches validation",
      ok: false,
      detail: error instanceof Error ? error.message : String(error),
    };
  }
}

async function checkMetricsAuthorized(baseUrl: string, token: string) {
  try {
    const response = await fetch(new URL("/api/workers/metrics?windowMinutes=5", baseUrl), {
      headers: {
        authorization: `Bearer ${token}`,
      },
    });
    const json = await response.json().catch(() => null) as { ok?: boolean } | null;
    return {
      name: "Worker metrics authorized",
      ok: response.status === 200 && json?.ok === true,
      detail: `status ${response.status}`,
    };
  } catch (error) {
    return {
      name: "Worker metrics authorized",
      ok: false,
      detail: error instanceof Error ? error.message : String(error),
    };
  }
}

async function checkPrometheusMetricsRequiresAuth(baseUrl: string) {
  try {
    const response = await fetch(new URL("/api/workers/metrics/prometheus", baseUrl));
    return {
      name: "Worker prometheus metrics require bearer auth",
      ok: response.status === 401,
      detail: `status ${response.status}`,
    };
  } catch (error) {
    return {
      name: "Worker prometheus metrics require bearer auth",
      ok: false,
      detail: error instanceof Error ? error.message : String(error),
    };
  }
}

async function checkPrometheusMetricsAuthorized(baseUrl: string, token: string) {
  try {
    const response = await fetch(new URL("/api/workers/metrics/prometheus?windowMinutes=5", baseUrl), {
      headers: {
        authorization: `Bearer ${token}`,
      },
    });
    const text = await response.text().catch(() => "");
    return {
      name: "Worker prometheus metrics authorized",
      ok: response.status === 200 && text.includes("diana_worker_jobs_total"),
      detail: `status ${response.status}`,
    };
  } catch (error) {
    return {
      name: "Worker prometheus metrics authorized",
      ok: false,
      detail: error instanceof Error ? error.message : String(error),
    };
  }
}

async function checkWorkerVersionRequiresAuth(baseUrl: string) {
  try {
    const response = await fetch(new URL("/api/workers/version", baseUrl));
    return {
      name: "Worker version requires bearer auth",
      ok: response.status === 401,
      detail: `status ${response.status}`,
    };
  } catch (error) {
    return {
      name: "Worker version requires bearer auth",
      ok: false,
      detail: error instanceof Error ? error.message : String(error),
    };
  }
}

async function checkWorkerVersionAuthorized(baseUrl: string, token: string, expectedAppSha: string | undefined | null) {
  try {
    const response = await fetch(new URL("/api/workers/version", baseUrl), {
      headers: {
        authorization: `Bearer ${token}`,
      },
    });
    const json = await response.json().catch(() => null) as {
      ok?: boolean;
      app?: { sha?: unknown; source?: unknown };
    } | null;
    const actualSha = typeof json?.app?.sha === "string" ? json.app.sha : "";
    const source = typeof json?.app?.source === "string" ? json.app.source : "unknown";
    const expected = expectedAppSha?.trim();
    const matchesExpected = !expected || actualSha === expected;
    return {
      name: "Worker version authorized",
      ok: response.status === 200 && json?.ok === true && Boolean(actualSha) && matchesExpected,
      detail: expected
        ? `status ${response.status}; appSha ${actualSha || "missing"}; expected ${expected}; source ${source}`
        : `status ${response.status}; appSha ${actualSha || "missing"}; source ${source}`,
    };
  } catch (error) {
    return {
      name: "Worker version authorized",
      ok: false,
      detail: error instanceof Error ? error.message : String(error),
    };
  }
}

async function checkWorkerDatabaseReadiness(): Promise<Check[]> {
  const admin = createServiceClient();
  if (!admin) {
    return [
      {
        name: "Worker database schema reachable",
        ok: true,
        detail: "skipped-service-credentials-missing",
      },
      {
        name: "Worker database RPCs reachable",
        ok: true,
        detail: "skipped-service-credentials-missing",
      },
    ];
  }

  const checks: Check[] = [];

  try {
    const jobs = await admin
      .from("worker_jobs")
      .select("id,tenant_id,queue_name,status,payload,constraints,locked_until,locked_by", { count: "exact", head: true })
      .limit(1);
    if (jobs.error) {
      checks.push({
        name: "Worker database schema reachable",
        ok: false,
        detail: `worker_jobs: ${jobs.error.message}`,
      });
      return checks;
    }

    const limits = await admin
      .from("worker_rate_limits")
      .select("id,tenant_id,owner_id,feature,scope,window_start,count,updated_at", { count: "exact", head: true })
      .limit(1);
    if (limits.error) {
      checks.push({
        name: "Worker database schema reachable",
        ok: false,
        detail: `worker_rate_limits: ${limits.error.message}`,
      });
      return checks;
    }

    checks.push({
      name: "Worker database schema reachable",
      ok: true,
      detail: "worker_jobs-and-worker_rate_limits-readable",
    });
  } catch (error) {
    checks.push({
      name: "Worker database schema reachable",
      ok: false,
      detail: error instanceof Error ? error.message : String(error),
    });
    return checks;
  }

  checks.push(await checkWorkerDatabaseRpcs(admin));
  return checks;
}

async function checkWorkerDatabaseRpcs(admin: NonNullable<ReturnType<typeof createServiceClient>>): Promise<Check> {
  try {
    const claim = await admin.rpc("claim_worker_job", {
      requested_queue_name: "__diana_worker_preflight_empty_queue__",
      worker_id: "production-preflight",
      lease_seconds: 1,
    });
    if (claim.error) {
      return {
        name: "Worker database RPCs reachable",
        ok: false,
        detail: `claim_worker_job: ${claim.error.message}`,
      };
    }

    const rateLimit = await admin.rpc("reserve_worker_rate_limit", {
      requested_tenant_id: "preflight:non-mutating",
      requested_owner_id: "00000000-0000-0000-0000-000000000000",
      requested_feature: "diana.voice_candidate",
      requested_scope: "student",
      window_seconds: 0,
      max_count: 1,
    });
    if (!rateLimit.error) {
      return {
        name: "Worker database RPCs reachable",
        ok: false,
        detail: "reserve_worker_rate_limit accepted a non-positive window",
      };
    }
    if (!rateLimit.error.message.includes("window_seconds must be positive")) {
      return {
        name: "Worker database RPCs reachable",
        ok: false,
        detail: `reserve_worker_rate_limit: ${rateLimit.error.message}`,
      };
    }

    return {
      name: "Worker database RPCs reachable",
      ok: true,
      detail: "claim_worker_job-and-reserve_worker_rate_limit-callable",
    };
  } catch (error) {
    return {
      name: "Worker database RPCs reachable",
      ok: false,
      detail: error instanceof Error ? error.message : String(error),
    };
  }
}

main().catch((error) => {
  console.error(JSON.stringify({
    ok: false,
    error: error instanceof Error ? error.message : String(error),
  }));
  process.exit(1);
});
