import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { syncLmsAssignments } from "@/lib/lms/sync";
import type { NormalizedAssignment } from "@/lib/lms/types";

type ClassroomDate = { year: number; month: number; day: number };
type ClassroomTime = { hours?: number; minutes?: number };
type CourseWork = {
  id: string;
  title: string;
  description?: string;
  dueDate?: ClassroomDate;
  dueTime?: ClassroomTime;
  alternateLink?: string;
};
type Course = { id: string; name: string };
type Announcement = {
  id: string;
  text?: string;
  alternateLink?: string;
  updateTime?: string;
};

function reconstructDueIso(d?: ClassroomDate, t?: ClassroomTime): string | null {
  if (!d) return null;
  const hours = t?.hours ?? 23;
  const minutes = t?.minutes ?? 59;
  return new Date(Date.UTC(d.year, d.month - 1, d.day, hours, minutes)).toISOString();
}

async function fetchJson<T>(url: string, token: string): Promise<T> {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`Classroom request to ${url} returned ${res.status}`);
  return (await res.json()) as T;
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to sync" }, { status: 401 });

  const { data: { session } } = await supabase.auth.getSession();
  const providerToken = session?.provider_token;
  if (!providerToken) {
    return NextResponse.json(
      { error: "Reconnect Google Classroom — your sign-in session needs to be refreshed" },
      { status: 401 },
    );
  }

  const { connectionId } = (await req.json()) as { connectionId: string };
  if (!connectionId) {
    return NextResponse.json({ error: "Missing connectionId" }, { status: 400 });
  }

  // Verify the connection exists and belongs to this user. RLS also enforces this; defense in depth.
  const { data: conn, error: connErr } = await supabase
    .from("lms_connections")
    .select("id, owner_id, provider")
    .eq("id", connectionId)
    .eq("provider", "google_classroom")
    .single();
  if (connErr || !conn) {
    return NextResponse.json({ error: "Connection not found" }, { status: 404 });
  }

  try {
    const coursesResp = await fetchJson<{ courses?: Course[] }>(
      "https://classroom.googleapis.com/v1/courses?courseStates=ACTIVE",
      providerToken,
    );
    const courses = coursesResp.courses ?? [];

    let skipped = 0;
    const items: NormalizedAssignment[] = [];

    for (const course of courses) {
      const workResp = await fetchJson<{ courseWork?: CourseWork[] }>(
        `https://classroom.googleapis.com/v1/courses/${course.id}/courseWork`,
        providerToken,
      );
      const work = workResp.courseWork ?? [];
      for (const w of work) {
        const due = reconstructDueIso(w.dueDate, w.dueTime);
        if (!due) { skipped += 1; continue; }
        items.push({
          external_id: w.id,
          title: w.title,
          description: w.description ?? null,
          due_at: due,
          external_source: "google_classroom",
          external_url: w.alternateLink ?? null,
        });
      }

      const announcementsResp = await fetchJson<{ announcements?: Announcement[] }>(
        `https://classroom.googleapis.com/v1/courses/${course.id}/announcements`,
        providerToken,
      ).catch(() => ({ announcements: [] }));
      const announcements = (announcementsResp.announcements ?? [])
        .filter((announcement) => announcement.text?.trim())
        .slice(0, 10);
      if (announcements.length > 0) {
        await supabase.from("inbox_items").insert(announcements.map((announcement) => ({
          owner_id: user.id,
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

    const result = await syncLmsAssignments(supabase, user.id, "google_classroom", items, skipped);

    await supabase
      .from("lms_connections")
      .update({ last_synced_at: new Date().toISOString() })
      .eq("id", connectionId);

    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Classroom import had a problem";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
