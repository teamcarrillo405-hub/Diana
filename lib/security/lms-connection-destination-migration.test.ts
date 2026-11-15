import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migrationPath = join(
  process.cwd(),
  "supabase",
  "migrations",
  "20260731180000_lms_connection_destination_immutability.sql",
);
const sql = readFileSync(migrationPath, "utf8").toLowerCase();

describe("LMS connection destination immutability migration", () => {
  it("terminates the trigger function body before the dollar quote", () => {
    expect(sql).toContain("end;\n$$;");
    expect(sql).not.toMatch(/\bend\s*\n\$\$;/u);
  });

  it("guards authenticated updates with a row trigger", () => {
    expect(sql).toContain("if auth.role() = 'authenticated'");
    expect(sql).toContain("before update on public.lms_connections");
    expect(sql).toContain("for each row execute function public.protect_lms_connection_destination()");
  });

  it("prevents ownership, provider, and Canvas origin changes", () => {
    expect(sql).toContain("new.owner_id is distinct from old.owner_id");
    expect(sql).toContain("new.provider is distinct from old.provider");
    expect(sql).toContain("new.config ->> 'base_url' is distinct from old.config ->> 'base_url'");
  });

  it("allows only a one-way legacy institution ID backfill", () => {
    expect(sql).toContain("nullif(old.config ->> 'institution_id', '') is not null");
    expect(sql).toContain("new.config ->> 'institution_id' is distinct from old.config ->> 'institution_id'");
  });

  it("does not expose the trigger function as an authenticated RPC", () => {
    expect(sql).toContain("security invoker");
    expect(sql).toContain("revoke all on function public.protect_lms_connection_destination() from authenticated");
  });
});
