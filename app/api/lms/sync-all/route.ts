export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { fetchCanvasAssignments } from "@/lib/lms/canvas";
import { fetchIcsAssignments } from "@/lib/lms/ics";
import { syncLmsAssignments } from "@/lib/lms/sync";
import type { LmsProvider, NormalizedAssignment, SyncResult } from "@/lib/lms/types";
import { createClient } from "@/lib/supabase/server";

type Connection = {
  id: string;
  provider: LmsProvider;
  config: Record<string, unknown>;
};

type ClassroomDate = { year: number; month: number; day: number };
type ClassroomTime = { hours?: number; minutes?: number };
type Course = { id: string; name: string };
type CourseWork = {
  id: string;
  title: string;
  description?: string;
  dueDate?: ClassroomDate;
  dueTime?: ClassroomTime;
  alternateLink?: string;
};
type Announcement = {
  id: string;
  text?: string;
  alternateLink?: string;
};

function reconstructDueIso(d?: ClassroomDate, t?: ClassroomTime): string | null {
  if (!d) return null;
  return new Date(Date.UTC(d.year, d.month - 1, d.day, t?.hours ?? 23, t?.minutes ?? 59)).toISOString();
}

async function fetchJson<T>(url: string, token: string): Promise<T> {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`Classroom request to ${url} returned ${res.status}`);
  return (await res.json()) as T;
}

async function fetchClassroomAssignments(
  token: string,
  ownerId: string,
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<{ items: NormalizedAssignment[]; skipped: number }> {
  const coursesResp = await fetchJson<{ courses?: Course[] }>(
    "https://classroom.googleapis.com/v1/courses?courseStates=ACTIVE",
    token,
  );
  const courses = coursesResp.courses ?? [];
  const items: NormalizedAssignment[] = [];
  let skipped = 0;

  for (const course of courses) {
    const workResp = await fetchJson<{ courseWork?: CourseWork[] }>(
      `https://classroom.googleapis.com/v1/courses/${course.id}/courseWork`,
      token,
    );
    for (const work of workResp.courseWork ?? []) {
      const due = reconstructDueIso(work.dueDate, work.dueTime);
      if (!due) {
        skipped += 1;
        continue;
      }
      items.push({
        external_id: work.id,
        title: work.title,
        description: work.description ?? null,
        due_at: due,
        external_source: "google_classroom",
        external_url: work.alternateLink ?? null,
      });
    }

    const announcementsResp = await fetchJson<{ announcements?: Announcement[] }>(
      `https://classroom.googleapis.com/v1/courses/${course.id}/announcements`,
      token,
    ).catch(() => ({ announcements: [] }));
    const announcements = (announcementsResp.announcements ?? [])
      .filter((announcement) => announcement.text?.trim())
      .slice(0, 10);
    if (announcements.length > 0) {
      await supabase.from("inbox_items").insert(announcements.map((announcement) => ({
        owner_id: ownerId,
        raw: [
          `Google Classroom announcement from ${course.name}`,
          announcement.text,
          announcement.alternateLink ? `Link: ${announcement.alternateLink}` : "",
        ].filter(Boolean).join("\n"),
        capture_mode: "text",
        status: "unclassified",
      })));
    }
  }

  return { items, skipped };
}

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to sync" }, { status: 401 });

  const { data: { session } } = await supabase.auth.getSession();
  const { data: rows, error } = await supabase
    .from("lms_connections")
    .select("id, provider, config")
    .in("provider", ["canvas", "google_classroom", "ics"]);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const connections = (rows ?? []) as Connection[];
  const results: Array<(SyncResult & { connectionId: string }) | { connectionId: string; source: LmsProvider; error: string }> = [];

  for (const connection of connections) {
    try {
      let fetched: { items: NormalizedAssignment[]; skipped: number };
      if (connection.provider === "canvas") {
        const cfg = connection.config as { base_url?: string; token?: string };
        if (!cfg.base_url || !cfg.token) throw new Error("Canvas connection is missing credentials");
        fetched = await fetchCanvasAssignments({ base_url: cfg.base_url, token: cfg.token });
      } else if (connection.provider === "ics") {
        const cfg = connection.config as { url?: string };
        if (!cfg.url) throw new Error("Calendar connection is missing its URL");
        fetched = await fetchIcsAssignments(cfg.url);
      } else if (connection.provider === "google_classroom") {
        if (!session?.provider_token) throw new Error("Google Classroom session needs to be refreshed");
        fetched = await fetchClassroomAssignments(session.provider_token, user.id, supabase);
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
        .eq("id", connection.id);
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
