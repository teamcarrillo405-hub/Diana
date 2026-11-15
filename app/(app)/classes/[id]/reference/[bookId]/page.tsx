import Link from "next/link";
import {notFound,redirect} from "next/navigation";
import {createClient} from "@/lib/supabase/server";
import {loadProfile} from "@/lib/profile";
import {PRECALCULUS_BOOK} from "@/lib/learning-engine/textbook-catalog";
import {textbookManifest} from "@/lib/learning-engine/textbook-server";
import {StudentShell} from "@/components/student-shell/student-shell";
import {ReferenceTextbook} from "@/components/learning/reference-textbook";
import styles from "@/components/student-shell/collection.module.css";

export default async function ReferenceBookPage({params,searchParams}:{params:Promise<{id:string;bookId:string}>;searchParams:Promise<{chapter?:string|string[];page?:string|string[]}>}){
  const {id,bookId}=await params;if(bookId!==PRECALCULUS_BOOK.id)notFound();
  const query=await searchParams;
  const initialChapter=query.chapter===undefined?1:typeof query.chapter==="string"?Number(query.chapter):NaN;
  if(!PRECALCULUS_BOOK.chapters.some(chapter=>chapter.number===initialChapter))notFound();
  const client=await createClient();const {data:{user}}=await client.auth.getUser();if(!user)redirect("/login");
  const course=await client.from("classes").select("name").eq("id",id).eq("owner_id",user.id).maybeSingle();if(!course.data)notFound();
  const [profile,manifest]=await Promise.all([loadProfile(),textbookManifest().catch(()=>null)]);
  const initialPage=query.page===undefined?1:typeof query.page==="string"?Number(query.page):NaN;
  if(!Number.isInteger(initialPage)||initialPage<1||(manifest&&initialPage>(manifest.chapters.find(chapter=>chapter.number===initialChapter)?.pages??0)))notFound();
  return <StudentShell active="Classes" profile={{displayName:profile?.display_name,photoUrl:profile?.photo_url}}>
    <main id="main-content" className={styles.main}>
      <Link href={`/classes/${id}?materials=1`}>{course.data.name} / Materials</Link>
      <header className={styles.heading}><h1>Precalculus</h1></header>
      {manifest?<ReferenceTextbook chapters={manifest.chapters} classId={id} initialChapter={initialChapter} initialPage={initialPage}/>:<p>Reference chapters are being prepared. <a href={PRECALCULUS_BOOK.publisherUrl} target="_blank" rel="noreferrer">Open the publisher&apos;s book</a></p>}
    </main>
  </StudentShell>;
}
