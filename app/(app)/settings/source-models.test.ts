import { describe, expect, it } from "vitest";

import {
  csvCell,
  mergeAiHistoryEntries,
  sanitizeLmsConnections,
} from "./source-models";

describe("ScreenDesign settings source models", () => {
  it("merges AI interaction and authorship evidence without exposing payload data", () => {
    const rows = mergeAiHistoryEntries(
      [
        {
          id: "11111111-1111-4111-8111-111111111111",
          created_at: "2026-09-14T16:30:00.000Z",
          feature: "writing_aid",
          assignment_id: null,
          assignment_title: null,
          model: "claude-sonnet-4-6",
          prompt_summary: "Strengthen the explanation",
          tokens_used: 120,
        },
      ],
      [
        {
          id: "22222222-2222-4222-8222-222222222222",
          created_at: "2026-09-14T16:31:00.000Z",
          actor: "student",
          event_type: "student_revision",
          assignment_id: null,
          assignment_title: null,
        },
      ],
    );

    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      kind: "authorship",
      actor: "student",
      workOwnerLabel: "Student work",
    });
    expect(rows[1]).toMatchObject({
      kind: "interaction",
      actor: "diana",
      workOwnerLabel: "Diana work",
    });
    expect(JSON.stringify(rows)).not.toContain("payload");
  });

  it("prevents spreadsheet formulas in CSV exports", () => {
    expect(csvCell("=HYPERLINK(\"https://example.com\")")).toBe(
      '"\'=HYPERLINK(""https://example.com"")"',
    );
  });

  it("strips credentials and derives LMS state only from persisted evidence", () => {
    const views = sanitizeLmsConnections([
      {
        id: "33333333-3333-4333-8333-333333333333",
        provider: "canvas",
        config: {
          token: "private-token",
          refresh_token: "private-refresh",
          status: "error",
          lastSyncError: "Authorization needs attention",
        },
        last_synced_at: null,
      },
    ]);

    expect(views).toEqual([
      {
        id: "33333333-3333-4333-8333-333333333333",
        provider: "canvas",
        lastSyncedAt: null,
        state: "attention",
        message: "Authorization needs attention",
        schoolManaged: false,
      },
    ]);
    expect(JSON.stringify(views)).not.toContain("private-token");
    expect(JSON.stringify(views)).not.toContain("refresh_token");
  });
});
