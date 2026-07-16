import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

type QueryCall = {
  table: string;
  method: string;
  args: readonly unknown[];
};

type QueryResult = {
  data?: unknown;
  count?: number | null;
  error?: unknown;
};

let queryCalls: QueryCall[] = [];
let resultsByTable = new Map<string, QueryResult>();

function queryFor(table: string) {
  const builder = {
    select: (...args: unknown[]) => {
      queryCalls.push({ table, method: "select", args });
      return builder;
    },
    eq: (...args: unknown[]) => {
      queryCalls.push({ table, method: "eq", args });
      return builder;
    },
    is: (...args: unknown[]) => {
      queryCalls.push({ table, method: "is", args });
      return builder;
    },
    gt: (...args: unknown[]) => {
      queryCalls.push({ table, method: "gt", args });
      return builder;
    },
    gte: (...args: unknown[]) => {
      queryCalls.push({ table, method: "gte", args });
      return builder;
    },
    lte: (...args: unknown[]) => {
      queryCalls.push({ table, method: "lte", args });
      return builder;
    },
    not: (...args: unknown[]) => {
      queryCalls.push({ table, method: "not", args });
      return builder;
    },
    order: (...args: unknown[]) => {
      queryCalls.push({ table, method: "order", args });
      return builder;
    },
    limit: (...args: unknown[]) => {
      queryCalls.push({ table, method: "limit", args });
      return builder;
    },
    maybeSingle: async () => {
      queryCalls.push({ table, method: "maybeSingle", args: [] });
      return resultsByTable.get(table) ?? { data: null, error: null };
    },
    then: (
      resolve: (result: QueryResult) => unknown,
      reject?: (reason: unknown) => unknown,
    ) =>
      Promise.resolve(resultsByTable.get(table) ?? { data: [], error: null }).then(
        resolve,
        reject,
      ),
  };
  return builder;
}

const fakeServiceClient = {
  from(table: string) {
    queryCalls.push({ table, method: "from", args: [] });
    return queryFor(table);
  },
};

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: () => fakeServiceClient,
}));

import SharePage from "./page";

const activeLink = (shareType: "parent_summary" | "teacher_snapshot") => ({
  id: "11111111-1111-4111-8111-111111111111",
  token: "exact-active-token",
  owner_id: "22222222-2222-4222-8222-222222222222",
  share_type: shareType,
  expires_at: "2026-10-14T16:30:00.000Z",
  revoked_at: null,
  created_at: "2026-09-01T16:30:00.000Z",
});

const renderShare = async (token = "exact-active-token") =>
  renderToStaticMarkup(
    await SharePage({ params: Promise.resolve({ token }) }),
  );

const callsFor = (table: string, method: string) =>
  queryCalls.filter((call) => call.table === table && call.method === method);

describe("public ScreenDesign share boundary", () => {
  beforeEach(() => {
    queryCalls = [];
    resultsByTable = new Map();
  });

  it("renders only token-scoped portfolio evidence for the external scout state", async () => {
    resultsByTable.set("share_links", {
      data: activeLink("teacher_snapshot"),
      error: null,
    });
    resultsByTable.set("portfolios", {
      data: [
        {
          id: "33333333-3333-4333-8333-333333333333",
          title: "Freshman portfolio",
          description: null,
          portfolio_items: [
            {
              id: "44444444-4444-4444-8444-444444444444",
              title: "Identity quote response",
              reflection_text: "I revised the explanation.",
              position: 0,
              created_at: "2026-09-11T16:30:00.000Z",
            },
          ],
        },
      ],
      error: null,
    });

    const html = await renderShare();

    expect(html).toContain("Verified student share");
    expect(html).toContain("Freshman portfolio");
    expect(html).toContain("Identity quote response");
    expect(html).toContain("Open shared evidence");
    expect(html).not.toContain("GPA");
    expect(html).not.toContain("diagnos");
    expect(html).not.toContain("general student profile");
    expect(callsFor("portfolios", "eq")).toContainEqual(
      expect.objectContaining({ args: ["owner_id", activeLink("teacher_snapshot").owner_id] }),
    );
  });

  it("keeps the report state minimized and source-faithful", async () => {
    resultsByTable.set("share_links", {
      data: activeLink("parent_summary"),
      error: null,
    });
    resultsByTable.set("task_signals", { count: 8, data: null, error: null });
    resultsByTable.set("assignments", { count: 2, data: null, error: null });
    resultsByTable.set("assignment_time_log", {
      data: [
        {
          started_at: "2026-09-14T15:00:00.000Z",
          ended_at: "2026-09-14T15:45:00.000Z",
        },
      ],
      error: null,
    });
    resultsByTable.set("mastery_concepts", {
      data: [{ name: "Claim evidence reasoning", mastery_level: 2 }],
      error: null,
    });
    resultsByTable.set("teacher_progress_notes", {
      data: [
        {
          author_name: "Teacher",
          note_text: "The student is revising explanations consistently.",
          created_at: "2026-09-13T16:30:00.000Z",
        },
      ],
      error: null,
    });

    const html = await renderShare();

    expect(html).toContain("Academic report");
    expect(html).toContain("Sessions");
    expect(html).toContain("Study time");
    expect(html).toContain("Tutor insights");
    expect(html).toContain("Open shared report section");
    expect(html).toContain("Print report");
    expect(html).not.toContain("assignment name");
    expect(html).not.toContain("private note");
  });

  it("requires an exact active token before reading owner data", async () => {
    resultsByTable.set("share_links", { data: null, error: null });

    const html = await renderShare("expired-or-revoked-token");

    expect(html).toContain("Shared link unavailable");
    expect(html).not.toContain("Freshman portfolio");
    expect(queryCalls.filter((call) => call.method === "from")).toHaveLength(1);
    expect(callsFor("share_links", "eq")).toContainEqual(
      expect.objectContaining({ args: ["token", "expired-or-revoked-token"] }),
    );
    expect(callsFor("share_links", "is")).toContainEqual(
      expect.objectContaining({ args: ["revoked_at", null] }),
    );
    expect(callsFor("share_links", "gt")).toContainEqual(
      expect.objectContaining({ args: ["expires_at", expect.any(String)] }),
    );
  });
});
