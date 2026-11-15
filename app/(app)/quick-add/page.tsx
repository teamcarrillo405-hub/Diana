import Link from "next/link";
import { redirect } from "next/navigation";
import { StudentShell } from "@/components/student-shell/student-shell";
import styles from "@/components/student-shell/capture.module.css";
import { loadProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import { AssignmentUploadForm } from "./assignment-upload-form";

export default async function QuickAddPage({searchParams}:{searchParams:Promise<{class?:string;classId?:string}>}) {
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)redirect("/login");
  const [profile,{data:classes,error},params]=await Promise.all([loadProfile(),supabase.from("classes").select("id,name,color").eq("owner_id",user.id).is("archived_at",null).order("name",{ascending:true}),searchParams]);
  return <StudentShell active="Work" version="12" className={styles.root} profile={{displayName:profile?.display_name,photoUrl:profile?.photo_url,photoOffsetX:profile?.photo_offset_x,photoOffsetY:profile?.photo_offset_y}}>
    <main id="main-content" className={styles.main} tabIndex={-1}><Link href="/assignments" className={styles.back}>Back to Work</Link><header className={styles.heading}><h1>Add assignment</h1></header>
      {error ? <p role="status">Classes could not load. <Link href="/quick-add">Try again</Link></p> : classes?.length ? <AssignmentUploadForm classes={classes} initialClassId={params.classId ?? params.class} /> : <section><h2>Add a class first</h2><Link className={styles.primary} href="/classes?create=1">Add class</Link></section>}
    </main>
  </StudentShell>;
}
