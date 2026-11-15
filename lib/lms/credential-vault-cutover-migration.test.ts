import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(resolve(
  process.cwd(),
  "supabase/migrations/20260901190000_lms_credential_vault_cutover.sql",
), "utf8").replaceAll("\r\n", "\n").toLowerCase();

function statementStartingAt(fragment: string): string {
  const start = migration.indexOf(fragment);
  expect(start, `missing SQL fragment: ${fragment}`).toBeGreaterThanOrEqual(0);
  const end = migration.indexOf(";", start);
  expect(end, `unterminated SQL fragment: ${fragment}`).toBeGreaterThan(start);
  return migration.slice(start, end + 1);
}

describe("LMS credential-vault cutover migration", () => {
  it("runs the complete cutover in one locked transaction", () => {
    expect(migration.trimStart().startsWith("begin;\n")).toBe(true);
    expect(migration.trimEnd().endsWith("commit;")).toBe(true);
    expect(migration.match(/^begin;$/gmu)).toHaveLength(1);
    expect(migration.match(/^commit;$/gmu)).toHaveLength(1);

    const connectionLock = migration.indexOf(
      "lock table public.lms_connections in share row exclusive mode",
    );
    const vaultLock = migration.indexOf(
      "lock table public.integration_credentials in share row exclusive mode",
    );
    const backfill = migration.indexOf("with legacy_credentials as");
    expect(connectionLock).toBeGreaterThan(-1);
    expect(vaultLock).toBeGreaterThan(connectionLock);
    expect(backfill).toBeGreaterThan(vaultLock);
  });

  it("backfills Canvas and Classroom tokens with existing vault identities", () => {
    const backfill = migration.slice(
      migration.indexOf("with legacy_credentials as"),
      migration.indexOf("-- compare in-database"),
    );

    expect(backfill).toContain("where connection.provider in ('canvas', 'google_classroom')");
    expect(backfill).toContain("connection.config ->> 'token'");
    expect(backfill).toContain("connection.config ->> 'access_token'");
    expect(backfill).toContain("connection.config ->> 'refresh_token'");
    expect(backfill).toContain("legacy.connection_id::text");
    expect(backfill).toContain("legacy.connection_id,");
    expect(backfill).toContain(
      "on conflict (owner_id, provider, credential_key) do update",
    );
    expect(backfill).toContain(
      "access_token = coalesce(excluded.access_token, credential.access_token)",
    );
    expect(backfill).toContain(
      "refresh_token = coalesce(excluded.refresh_token, credential.refresh_token)",
    );
    expect(migration).toContain(
      "lms credential vault cutover found conflicting access token fields",
    );
    expect(migration).toContain(
      "nullif(btrim(connection.config ->> 'token'), '') is distinct from",
    );
  });

  it("verifies copied values before stripping any owner-readable secret", () => {
    const backfill = migration.indexOf("insert into public.integration_credentials as credential");
    const verification = migration.indexOf(
      "lms credential vault cutover did not preserve every legacy credential",
    );
    const strip = migration.indexOf("update public.lms_connections\nset config = config");

    expect(backfill).toBeGreaterThan(-1);
    expect(verification).toBeGreaterThan(backfill);
    expect(strip).toBeGreaterThan(verification);

    const verificationBlock = migration.slice(backfill, strip);
    expect(verificationBlock).toContain(
      "credential.access_token is distinct from legacy.access_token",
    );
    expect(verificationBlock).toContain(
      "credential.refresh_token is distinct from legacy.refresh_token",
    );
    expect(verificationBlock).toContain(
      "credential.lms_connection_id is distinct from legacy.connection_id",
    );
    expect(migration).not.toContain("raise notice");
    expect(migration).not.toContain("raise log");
  });

  it("removes compatibility writes and makes the service vault authoritative", () => {
    expect(migration).toContain(
      "drop trigger if exists lms_connections_sync_credential\n  on public.lms_connections",
    );
    expect(migration).toContain(
      "drop function if exists public.sync_lms_connection_credential()",
    );
    expect(migration).not.toContain("create trigger lms_connections_sync_credential");

    const rpcStart = migration.indexOf(
      "create or replace function public.upsert_integration_connection",
    );
    const rpcEnd = migration.indexOf(
      "revoke all on function public.upsert_integration_connection",
      rpcStart,
    );
    const rpc = migration.slice(rpcStart, rpcEnd);
    const connectionWrite = rpc.indexOf("insert into public.lms_connections");
    const vaultWrite = rpc.indexOf("insert into public.integration_credentials as credential");

    expect(rpc).toContain("upsert_integration_connection requires service_role");
    expect(rpc).toContain("credential.refresh_token");
    expect(rpc).not.toMatch(
      /config\s*->>\s*'(?:access_token|token|refresh_token|client_secret)'/u,
    );
    expect(rpc).not.toMatch(/jsonb_build_object\s*\(\s*'(?:access_token|token|refresh_token|client_secret)'/u);
    expect(connectionWrite).toBeGreaterThan(-1);
    expect(vaultWrite).toBeGreaterThan(connectionWrite);
    expect(rpc).toContain("access_token = excluded.access_token");
    expect(migration).toContain("from public, anon, authenticated");
    expect(migration).toContain("to service_role");
  });

  it("preserves provider metadata while removing and forbidding all four secret keys", () => {
    const strip = statementStartingAt("update public.lms_connections\nset config = config");
    const secretKeys = ["access_token", "token", "refresh_token", "client_secret"];

    for (const key of secretKeys) {
      expect(strip).toContain(`- '${key}'`);
    }
    expect(strip).toContain("where provider in ('canvas', 'google_classroom')");
    expect(strip).not.toContain("set config = '{}'::jsonb");

    expect(migration).toContain("lms_connections_public_config_no_credentials");
    expect(migration).toContain("from pg_catalog.pg_constraint constraint_row");
    expect(migration).toContain("provider not in ('canvas', 'google_classroom')");
    expect(migration).toContain("config ?| array[");
    expect(migration).toContain(") not valid");
    expect(migration).toContain(
      "validate constraint lms_connections_public_config_no_credentials",
    );
    expect(migration).toContain(
      "lms owner-readable config still contains a credential field",
    );
  });

  it("is safe to reapply without recreating compatibility behavior", () => {
    expect(migration).toContain("on conflict (owner_id, provider, credential_key) do update");
    expect(migration).toContain("drop trigger if exists");
    expect(migration).toContain("drop function if exists");
    expect(migration).toContain("if not exists (");
    expect(migration).toContain("create or replace function public.upsert_integration_connection");
  });
});
