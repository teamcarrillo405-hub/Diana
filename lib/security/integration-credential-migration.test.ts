import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migrationPath = join(
  process.cwd(),
  "supabase",
  "migrations",
  "20260731140000_integration_credential_vault.sql",
);
const sql = readFileSync(migrationPath, "utf8").toLowerCase();
const releaseContract = readFileSync(
  join(process.cwd(), "supabase/tests/scripts/database-release-blockers.ps1"),
  "utf8",
).toLowerCase();
const ciWorkflow = readFileSync(
  join(process.cwd(), ".github/workflows/ci.yml"),
  "utf8",
).toLowerCase();
const connectionWriters = [
  "app/api/lms/canvas-oauth/callback/route.ts",
  "app/api/lms/google-oauth/callback/route.ts",
  "app/api/canva/callback/route.ts",
  "app/(app)/settings/lms-actions.ts",
].map((path) => readFileSync(join(process.cwd(), path), "utf8"));

describe("integration credential migration", () => {
  it("terminates every PL/pgSQL block before the dollar quote", () => {
    expect(sql).not.toMatch(/\bend\s*\n\$\$;/u);
  });

  it("makes the credential table service-role-only", () => {
    expect(sql).toContain("alter table public.integration_credentials enable row level security");
    expect(sql).toContain("alter table public.integration_credentials force row level security");
    expect(sql).toContain("revoke all on table public.integration_credentials from anon");
    expect(sql).toContain("revoke all on table public.integration_credentials from authenticated");
    expect(sql).toContain("grant select, insert, update, delete on table public.integration_credentials to service_role");
    expect(sql).not.toMatch(/create policy[^;]+integration_credentials/su);
  });

  it("deduplicates only vault-supported providers and backfills secrets", () => {
    const lmsCopy = sql.indexOf("insert into public.integration_credentials");
    const verification = sql.indexOf("integration credential migration did not copy every lms credential");

    expect(sql).toContain("create temporary table lms_connection_dedupe_plan on commit drop");
    expect(sql).toContain("where connection.provider in ('canvas', 'google_classroom')");
    expect(sql).toContain("nullif(btrim(connection.config ->> 'token'), '') is not null");
    expect(sql).toContain("nullif(btrim(connection.config ->> 'access_token'), '') is not null");
    expect(sql).toContain("nullif(btrim(connection.config ->> 'refresh_token'), '') is not null");
    expect(sql).toContain(
      "(normalized.access_token is not null or normalized.refresh_token is not null) desc",
    );
    expect(sql).toContain("filter (where normalized.access_token is not null)");
    expect(sql).toContain("filter (where normalized.refresh_token is not null)");
    expect(sql).toContain("update public.lms_connections connection");
    expect(sql).toContain("delete from public.lms_connections connection");
    expect(sql).toContain("lms credential dedupe did not preserve newest nonblank credentials");
    expect(sql).toContain("lms_connections_owner_provider_unique");
    expect(sql).toContain("where provider in ('canvas', 'google_classroom')");
    expect(sql).toContain("jsonb_object_agg(");
    expect(sql).toContain("max(normalized.last_synced_at) as last_synced_at");
    expect(sql).toContain("canvas credential dedupe found conflicting destination metadata");
    expect(sql).toContain("integration_credentials_tokens_normalized");
    expect(sql).toContain("nullif(btrim(access_token), '')");
    expect(sql).toContain("nullif(btrim(refresh_token), '')");
    expect(lmsCopy).toBeGreaterThan(-1);
    expect(verification).toBeGreaterThan(lmsCopy);
  });

  it("preflights validator-equivalent link semantics and restores the exact trigger state", () => {
    expect(sql).toContain("link.created_by is distinct from kept_connection.owner_id");
    expect(sql).toContain("link.provider is distinct from kept_connection.provider");
    expect(sql).toContain("kept_connection.config ->> 'connection_mode' is distinct from 'teacher'");
    expect(sql).toContain("membership.user_id = link.created_by");
    expect(sql).toContain("membership.verification_status = 'verified'");
    expect(sql).toContain("membership.role in ('district_admin', 'school_admin', 'teacher')");
    expect(sql).toContain("lms credential dedupe would invalidate a course mode link");
    expect(sql.indexOf("lms credential dedupe would invalidate a course mode link"))
      .toBeLessThan(sql.indexOf("disable trigger course_mode_lms_link_validate"));
    expect(sql).toContain("disable trigger course_mode_lms_link_validate");
    expect(sql).toContain("enable trigger course_mode_lms_link_validate");
    expect(sql).toContain("enable replica trigger course_mode_lms_link_validate");
    expect(sql).toContain("enable always trigger course_mode_lms_link_validate");
    expect(sql).not.toContain("disable trigger all");
    expect(sql).not.toContain("session_replication_role");
  });

  it("has an exact ledger-driven PostgreSQL regression for merge and linked repoint", () => {
    expect(releaseContract).toContain("supabase@2.111.0 migration up");
    expect(releaseContract).toContain("supabase_migrations.schema_migrations");
    expect(releaseContract).toContain("get-migrationledgerdifference");
    expect(releaseContract).toContain("where-object { -not $expectedset.contains($_) }");
    expect(releaseContract).toContain("syntheticolderextraversion");
    expect(releaseContract).toContain(
      "exact migration ledger comparison did not reject a synthetic older extra version",
    );
    expect(releaseContract).toContain("older-valid-access");
    expect(releaseContract).toContain("newest-valid-refresh");
    expect(releaseContract).toContain("gitlab-alpha-token");
    expect(releaseContract).toContain("gitlab-beta-token");
    expect(releaseContract).toContain("unsupported gitlab connections or provider-specific config were changed");
    expect(releaseContract).toContain("google classroom credentials or metadata were not reconciled");
    expect(releaseContract).toContain("canvas credentials, teacher mode, or metadata were not reconciled");
    expect(releaseContract).toContain("invoke-contractsqlexpectfailure");
    expect(releaseContract).toContain(
      "canvas credential dedupe found conflicting destination metadata",
    );
    expect(releaseContract).toContain("base-url-institution-conflict");
    expect(releaseContract).toContain("get-credentialrollbacksnapshot");
    expect(releaseContract).toContain("$conflictrollbacksnapshotbefore");
    expect(releaseContract).toContain("$conflictrollbacksnapshotafter");
    expect(releaseContract).toContain(
      "conflicting canvas destination failure changed an original row, token",
    );
    expect(releaseContract).toContain("invalid link preflight deleted a duplicate before aborting");
    expect(releaseContract).toContain("linked duplicate connection was not repointed");
    expect(releaseContract).not.toContain("disable trigger all");
    expect(releaseContract).not.toContain("session_replication_role");
  });

  it("keeps old instances compatible and mirrors their writes into the vault", () => {
    expect(sql).toContain("create trigger lms_connections_sync_credential");
    expect(sql).toContain("create trigger canva_connections_sync_credential");
    expect(sql).toContain(
      "revoke all on function public.sync_lms_connection_credential()\n  from public, anon, authenticated",
    );
    expect(sql).toContain(
      "revoke all on function public.sync_canva_connection_credential()\n  from public, anon, authenticated",
    );
    expect(sql.match(/grant execute on function public\.sync_[a-z_]+\(\)\n  to service_role/gu)).toHaveLength(2);
    expect(sql).toContain(
      "next_refresh_token := nullif(btrim(new.config ->> 'refresh_token'), '')",
    );
    expect(sql).toContain("next_access_token := nullif(btrim(new.access_token), '')");
    expect(sql).toContain("next_refresh_token := nullif(btrim(new.refresh_token), '')");
    expect(sql).not.toContain("set config = config - 'token' - 'access_token' - 'refresh_token'");
    expect(sql).not.toMatch(/alter table public\.canva_connections\s+drop column/iu);
  });

  it("executes compatibility whitespace regressions and every trigger restoration state", () => {
    for (const state of ["o", "d", "r", "a"]) {
      expect(releaseContract).toContain(`code = "${state}"`);
    }
    expect(releaseContract).toContain("$credentialmigrationsql");
    expect(releaseContract).toContain("system.text.utf8encoding");
    expect(releaseContract).toContain("[io.file]::writealltext");
    expect(releaseContract).toContain("unexpectedly contains a utf-8 bom");
    expect(releaseContract).not.toContain("-f -");
    expect(releaseContract).toContain("`nrollback;");
    expect(releaseContract).toContain(
      "lms compatibility whitespace write replaced a valid vaulted credential",
    );
    expect(releaseContract).toContain(
      "canva compatibility whitespace write replaced a valid vaulted credential",
    );
  });

  it("pins the disposable database contract toolchain", () => {
    expect(ciWorkflow).toContain("postgresql-client-17");
    expect(ciWorkflow).toContain("major_version = 17");
    expect(ciWorkflow.match(/supabase@2\.111\.0/gu)).toHaveLength(3);
    expect(releaseContract).toContain("supabase@2.111.0 migration up");
  });

  it("exposes only a service-role transactional connection RPC", () => {
    expect(sql).toContain("create or replace function public.upsert_integration_connection");
    expect(sql).toContain("upsert_integration_connection requires service_role");
    expect(sql).toContain(
      "on conflict (owner_id, provider)\n    where provider in ('canvas', 'google_classroom')\n  do update",
    );
    expect(sql).toContain("normalized_access_token := nullif(btrim(p_access_token), '')");
    expect(sql).toContain("normalized_refresh_token := nullif(btrim(p_refresh_token), '')");
    expect(sql).toContain("- 'token'\n    - 'access_token'\n    - 'refresh_token'");
    expect(sql).toContain("grant execute on function public.upsert_integration_connection");
    expect(sql).toContain("to service_role");
    expect(sql).toContain("from public, anon, authenticated");
  });

  it("does not emit credential values during migration", () => {
    expect(sql).not.toContain("raise notice");
    expect(sql).not.toContain("raise log");
  });

  it("routes OAuth and manual Canvas writes through atomic compatibility helpers", () => {
    expect(connectionWriters[0]).toContain("saveLmsConnectionWithCredential");
    expect(connectionWriters[1]).toContain("saveLmsConnectionWithCredential");
    expect(connectionWriters[2]).toContain("saveCanvaConnectionWithCredential");
    expect(connectionWriters[3]).toContain("saveLmsConnectionWithCredential");
    for (const source of connectionWriters) {
      expect(source).not.toContain("storeLmsCredential");
      expect(source).not.toContain("storeCanvaCredential");
    }
  });
});
