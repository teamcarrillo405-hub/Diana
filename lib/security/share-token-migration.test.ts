import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const sql = readFileSync(
  join(process.cwd(), "supabase/migrations/20260731134000_share_token_digests.sql"),
  "utf8",
).toLowerCase();

describe("share token digest migration", () => {
  it("backfills digests and mirrors writes from old instances", () => {
    expect(sql).toContain("add column if not exists token_digest");
    expect(sql).toContain("update public.share_links");
    expect(sql).toContain("create trigger share_links_sync_token_digest");
    expect(sql).toContain("before insert or update of token");
    expect(sql).toContain("alter column token_digest set not null");
  });

  it("defers removal of the legacy token and index", () => {
    expect(sql).not.toMatch(/drop\s+column\s+token/iu);
    expect(sql).not.toContain("drop index if exists public.share_links_token_idx");
    expect(sql).toContain("later release");
  });
});
