import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MoreMenu } from "@/components/student-shell/more-menu";
import { MORE_SECTIONS } from "@/components/student-shell/more-destinations";

export default async function MorePage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const query = await searchParams;
  const requested = Array.isArray(query?.section) ? query.section[0] : query?.section;
  const initialMode = MORE_SECTIONS.find(section => section.id === requested)?.id ?? "study";
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("display_name, photo_url, photo_offset_x, photo_offset_y, school_name").eq("user_id", user.id).maybeSingle();
  return <MoreMenu schoolName={profile?.school_name} initialMode={initialMode} profile={{ displayName: profile?.display_name, photoUrl: profile?.photo_url, photoOffsetX: profile?.photo_offset_x, photoOffsetY: profile?.photo_offset_y }} />;
}
