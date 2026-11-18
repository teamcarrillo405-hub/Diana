import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loadProfile } from "@/lib/profile";
import { StudentShell } from "@/components/student-shell/student-shell";
import styles from "@/components/student-shell/quiz.module.css";
import { RecallSession } from "./recall-session";
import Link from "next/link";
import { authorizeRecallDisclosure } from "@/lib/learning-engine/recall-assistance";

export default async function RecallPage({ searchParams }: { searchParams: Promise<{source?:string}> }) {
  const supabase = await createClient();
  const {data:{user}} = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const params=await searchParams;
  const nowIso=new Date().toISOString();
  let query=supabase.from("flashcards").select("id,owner_id,front,back,state,stability,difficulty,due_at,reps,lapses,last_review_at,source_anchor,student_required_action,source_assignment_id,source_note_id,source_artifact_id").eq("owner_id",user.id).lte("due_at",nowIso).order("due_at",{ascending:true}).limit(60);
  if (params.source && /^[0-9a-f-]{36}$/i.test(params.source)) query=query.eq("source_artifact_id",params.source);
  const [{data,error},profile]=await Promise.all([query,loadProfile()]);
  if(error) throw new Error("Your recall questions could not load. Please try again.");
  try {
    await authorizeRecallDisclosure(supabase, user.id, data ?? []);
  } catch {
    return <StudentShell active="More" scene="seminar" mode="focus" profile={{displayName:profile?.display_name,photoUrl:profile?.photo_url}}><main id="main-content" className={styles.main}><section className={styles.paper}><h1>Recall is unavailable right now</h1>
      <p>Your saved cards are still here. Try opening them again in a moment.</p>
      <Link href="/study?view=saved">Back to saved practice</Link></section></main></StudentShell>;
  }
  return <RecallSession navigationProfile={{displayName:profile?.display_name,photoUrl:profile?.photo_url,photoOffsetX:profile?.photo_offset_x,photoOffsetY:profile?.photo_offset_y}} queue={data ?? []} ttsProvider={profile?.tts_provider ?? "browser"} ttsSpeed={profile?.tts_speed ?? 1} ttsPitch={profile?.tts_pitch ?? 1} ttsVoice={profile?.tts_voice ?? ""} nowIso={nowIso} />;
}
