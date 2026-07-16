export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { fetchCanvasAssignments, getValidCanvasToken } from "@/lib/lms/canvas";
import { fetchGitLabAssignments } from "@/lib/lms/gitlab";
import { fetchIcsAssignments } from "@/lib/lms/ics";
import { getValidGoogleToken, fetchClassroomAssignments, type GoogleClassroomConfig } from "@/lib/lms/google";
import { syncLmsAssignments } from "@/lib/lms/sync";
import type { LmsProvider, NormalizedAssignment, SyncResult } from "@/lib/lms/types";
import { createClient } from "@/lib/supabase/server";

type Connection = {
  id: string;
  provider: LmsProvider;
  config: Record<string, unknown>;
};

type Course = { id: string; name: string };
type Announcement = { id: string; text?: string; alternateLink?: string };

async function classroomGet<T>(url: string, token: string): Promise<T> {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } });
  if (!res.ok) throw new Error(`Classroom request to ${url} returned ${res.status}`);
  return (await res.json()) as T;
}

async function importClassroomAnnouncements(
  courses: Course[],
  token: string,
  ownerId: string,
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<void> {
  for (const course of courses) {
    const resp = await classroomGet<{ announcements?: Announcement[] }>(
      `https://classroom.googleapis.com/v1/courses/${course.id}/announcements`,
      token,
    ).catch(() => ({ announcements: [] }));
    const announcements = (resp.announcements ?? []).filter((a) => a.text?.trim()).slice(0, 10);
    if (announcements.length > 0) {
      await supabase.from("inbox_items").insert(announcements.map((a) => ({
        owner_id: ownerId,
        raw: [
          `Google Classroom announcement from ${course.name}`,
          a.text,
          a.alternateLink ? `Link: ${a.alternateLink}` : "",
        ].filter(Boolean).join("\n"),
        capture_mode: "text",
        status: "unclassified",
      })));
    }
  }
}

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to sync" }, { status: 401 });

  const { data: { session } } = await supabase.auth.getSession();
  const { data: rows, error } = await supabase
    .from("lms_connections")
    .select("id, provider, config")
    .eq("owner_id", user.id)
    .in("provider", ["canvas", "google_classroom", "ics", "gitlab"]);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const connections = (rows ?? []) as Connection[];
  const results: Array<(SyncResult & { connectionId: string }) | { connectionId: string; source: LmsProvider; error: string }> = [];

  for (const connection of connections) {
    try {
      let fetched: { items: NormalizedAssignment[]; skipped: number };
      if (connection.provider === "canvas") {
        const cfg = connection.config as { base_url?: string; token?: string; oauth?: boolean; refresh_token?: string | null; expires_at?: string | null };
        if (!cfg.base_url || !cfg.token) throw new Error("Canvas connection is missing credentials");
        const valid = await getValidCanvasToken({
          base_url: cfg.base_url,
          token: cfg.token,
          oauth: cfg.oauth,
          refresh_token: cfg.refresh_token,
          expires_at: cfg.expires_at,
        });
        if (valid.refreshed) {
          await supabase
            .from("lms_connections")
            .update({ config: { ...cfg, token: valid.refreshed.token, expires_at: valid.refreshed.expires_at } })
            .eq("id", connection.id)
            .eq("owner_id", user.id);
        }
        fetched = await fetchCanvasAssignments({ base_url: cfg.base_url, token: valid.token });
      } else if (connection.provider === "ics") {
        const cfg = connection.config as { url?: string };
        if (!cfg.url) throw new Error("Calendar connection is missing its URL");
        fetched = await fetchIcsAssignments(cfg.url);
      } else if (connection.provider === "google_classroom") {
        const cfg = connection.config as GoogleClassroomConfig;
        let token: string | null = null;
        const valid = await getValidGoogleToken(cfg);
        if (valid) {
          token = valid.token;
          if (valid.refreshed) {
            await supabase
              .from("lms_connections")
              .update({ config: { ...cfg, ...valid.refreshed } })
              .eq("id", connection.id)
              .eq("owner_id", user.id);
          }
        } else {
          token = session?.provider_token ?? null;
        }
        if (!token) throw new Error("Google Classroom session needs to be refreshed");
        const gc = await fetchClassroomAssignments(token);
        fetched = { items: gc.items, skipped: gc.skipped };
        await importClassroomAnnouncements(gc.courses, token, user.id, supabase);
      } else if (connection.provider === "gitlab") {
        fetched = await fetchGitLabAssignments(connection.config as {
          project: string;
          token: string;
          base_url?: string;
          labels?: string;
        });
      } else {
        continue;
      }

      const result = await syncLmsAssignments(
        supabase,
        user.id,
        connection.provider,
        fetched.items,
        fetched.skipped,
      );
      await supabase
        .from("lms_connections")
        .update({ last_synced_at: new Date().toISOString() })
        .eq("id", connection.id)
        .eq("owner_id", user.id);
      results.push({ ...result, connectionId: connection.id });
    } catch (err) {
      results.push({
        connectionId: connection.id,
        source: connection.provider,
        error: err instanceof Error ? err.message : "Sync had a problem",
      });
    }
  }

  const imported = results.reduce((sum, result) => sum + ("imported" in result ? result.imported : 0), 0);
  const skipped = results.reduce((sum, result) => sum + ("skipped" in result ? result.skipped : 0), 0);
  return NextResponse.json({ imported, skipped, results });
}
