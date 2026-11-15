import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MoreMenu } from "@/components/student-shell/more-menu";

export default async function MorePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("display_name, photo_url, photo_offset_x, photo_offset_y").eq("user_id", user.id).maybeSingle();
  return <MoreMenu profile={{ displayName: profile?.display_name, photoUrl: profile?.photo_url, photoOffsetX: profile?.photo_offset_x, photoOffsetY: profile?.photo_offset_y }} />;
}
