import Link from "next/link";
import { StudentShell } from "@/components/student-shell/student-shell";
import styles from "@/components/student-shell/collection.module.css";
import support from "@/components/student-shell/support.module.css";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
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

  return <StudentShell active="More" scene="services" mode="header" version="13" profile={{displayName:profile?.display_name,photoUrl:profile?.photo_url,photoOffsetX:profile?.photo_offset_x,photoOffsetY:profile?.photo_offset_y}}>
    <main id="main-content" className={styles.main}>
      <header className={styles.heading}><h1>Sharing</h1><Link href="/more">Back to More</Link></header>
      <section className={support.panel}><ParentSharingView /></section>
    </main>
  </StudentShell>;
}
