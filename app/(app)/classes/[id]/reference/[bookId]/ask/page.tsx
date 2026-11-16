import Link from "next/link";
import {notFound,redirect} from "next/navigation";
import {z} from "zod";
import {createClient} from "@/lib/supabase/server";
import {loadProfile} from "@/lib/profile";
import {PRECALCULUS_BOOK} from "@/lib/learning-engine/textbook-catalog";
import {StudentShell} from "@/components/student-shell/student-shell";
import styles from "@/components/student-shell/collection.module.css";
import {StudyBuddyClient} from "@/app/(app)/study-buddy/study-buddy-client";

export default async function ReferenceTutorPage({params,searchParams}:{params:Promise<{id:string;bookId:string}>;searchParams:Promise<{chapter?:string|string[]}>}){
  const [{id,bookId},query]=await Promise.all([params,searchParams]);
  if(bookId!==PRECALCULUS_BOOK.id)notFound();
  const classId=z.string().uuid().safeParse(id);
  if(!classId.success)notFound();
  const chapter=query.chapter===undefined?undefined:typeof query.chapter==="string"?Number(query.chapter):NaN;
  if(chapter!==undefined&&!PRECALCULUS_BOOK.chapters.some(item=>item.number===chapter))notFound();
  const client=await createClient();
  const {data:{user}}=await client.auth.getUser();
  if(!user)redirect("/login");
  const course=await client.from("classes").select("name").eq("id",classId.data).eq("owner_id",user.id).maybeSingle();
  if(!course.data)notFound();
  const profile=await loadProfile();
  return <StudentShell active="Classes" campus profile={{displayName:profile?.display_name,photoUrl:profile?.photo_url}}>
    <main id="main-content" className={styles.main}>
      <Link className={styles.back} href={`/classes/${classId.data}?materials=1`}>{course.data.name} / Materials</Link>
      <header className={styles.heading}><h1>Ask Diana</h1></header>
      <StudyBuddyClient layout="class" classId={classId.data} initialReferenceBook={{bookId:PRECALCULUS_BOOK.id,...(chapter===undefined?{}:{chapter})}} initialQuestion="" tutorName="Diana" tutorStyle={profile?.tutor_style} complexity={profile?.tutor_complexity}/>
    </main>
  </StudentShell>;
}
