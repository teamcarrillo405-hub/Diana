import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ count: 0 }, { status: 401 });

  const now = new Date();
  const soon = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
  const { data } = await supabase
    .from("assignments")
    .select("id, title, due_at")
    .eq("owner_id", user.id)
    .not("due_at", "is", null)
    .lte("due_at", soon)
    .not("status", "in", "(submitted,graded,abandoned)")
    .order("due_at", { ascending: true })
    .limit(5);

  return NextResponse.json({
    count: data?.length ?? 0,
    nextTitle: data?.[0]?.title ?? null,
    nextDueAt: data?.[0]?.due_at ?? null,
  });
}
