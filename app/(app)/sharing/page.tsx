import { redirect } from "next/navigation";
import { StudentBottomNav } from "@/components/screen-design/student-bottom-nav";
import { StudentDesktopNav } from "@/components/screen-design/student-desktop-nav";
import { createClient } from "@/lib/supabase/server";
import { DianaWordmark } from "@/components/screen-design/primitives";
import { ParentSharingView } from "./parent-view";

export default async function SharingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, photo_url, photo_offset_x, photo_offset_y")
    .eq("user_id", user.id)
    .maybeSingle();

  return (
    <>
      <StudentDesktopNav
        active="More"
        displayName={profile?.display_name}
        photoUrl={profile?.photo_url}
        photoOffsetX={profile?.photo_offset_x}
        photoOffsetY={profile?.photo_offset_y}
      />
      <div className="sd-support-screen sd-sharing-screen">
        <header className="sd-support-header sd-sharing-page-header">
          <div className="sd-sharing-mobile-brand"><DianaWordmark /></div>
          <h1>Sharing</h1>
        </header>
        <ParentSharingView />
      </div>
      <StudentBottomNav />
    </>
  );
}
