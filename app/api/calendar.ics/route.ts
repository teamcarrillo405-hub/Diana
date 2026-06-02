import { buildAssignmentsIcs } from "@/lib/lms/export-ics";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response("Sign in to export your calendar", { status: 401 });

  const { data, error } = await supabase
    .from("assignments")
    .select("id, title, description, due_at, classes(name)")
    .not("due_at", "is", null)
    .order("due_at", { ascending: true });

  if (error) return new Response("Calendar export had a problem", { status: 500 });

  const ics = buildAssignmentsIcs((data ?? []) as never);
  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="diana-due-dates-${user.id}.ics"`,
      "Cache-Control": "private, no-store",
    },
  });
}
