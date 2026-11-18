import Link from "next/link";
import { redirect } from "next/navigation";
import { StudentShell } from "@/components/student-shell/student-shell";
import { SectionTabs } from "@/components/student-shell/section-tabs";
import { SelectionCollection } from "@/components/student-shell/selection-collection";
import styles from "@/components/student-shell/collection.module.css";
import noteStyles from "@/components/student-shell/notes.module.css";
import { subjectArtwork } from "@/lib/assignment-navigation";
import { snippetForQuery } from "@/lib/notes/related";
import { loadProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import { NoteSynthesisPanel } from "./note-synthesis-panel";

export default async function NotesPage({searchParams}:{searchParams:Promise<{q?:string;tag?:string;classId?:string}>}) {
  const params=await searchParams;
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)redirect("/login");
  const queryText=params.q?.trim() ?? "";
  const tag=params.tag?.trim() ?? "";
  const general=params.classId === "general";
  const classId=params.classId && !general ? params.classId : null;
  let query=supabase.from("notes").select("id,title,body_text,transcript_text,updated_at,class_id,source,tags,classes(name)").eq("owner_id",user.id).order("updated_at",{ascending:false});
  if(queryText)query=query.textSearch("search_vector",queryText,{type:"websearch",config:"english"});
  if(tag)query=query.contains("tags",[tag]);
  if(classId)query=query.eq("class_id",classId);else if(general)query=query.is("class_id",null);
  const [notes,classes,profile]=await Promise.all([query,supabase.from("classes").select("id,name").eq("owner_id",user.id).is("archived_at",null).order("name"),loadProfile()]);
  const rows=(notes.data ?? []).filter(note=>!(note.tags ?? []).includes("grayson-demo"));
  const subject=(classes.data ?? []).find(course=>course.id===classId)?.name;
  const createHref=classId ? `/notes/new?class=${classId}` : "/notes/new";
  return <StudentShell active="More" scene="library" mode="scenic" version="13" className={noteStyles.root} profile={{displayName:profile?.display_name,photoUrl:profile?.photo_url,photoOffsetX:profile?.photo_offset_x,photoOffsetY:profile?.photo_offset_y}}><main id="main-content" className={styles.main}>
    <header className={styles.heading}><h1>{subject ? `${subject} notes` : general ? "General notes" : "Notes"}</h1><Link className={styles.primary} href={createHref}>Add note</Link></header>
    <form action="/notes" className={noteStyles.filters}><input type="search" name="q" defaultValue={queryText} aria-label="Search note content" placeholder="Search note content" /><select name="classId" defaultValue={params.classId ?? ""} aria-label="Notes location"><option value="">All notes</option>{(classes.data ?? []).map(course=><option key={course.id} value={course.id}>{course.name}</option>)}<option value="general">General notes</option></select>{tag ? <input type="hidden" name="tag" value={tag} /> : null}<button type="submit">Apply</button>{queryText || tag ? <Link href={classId ? `/notes?classId=${classId}` : general ? "/notes?classId=general" : "/notes"}>Clear search</Link> : null}</form>
    {notes.error || classes.error ? <p className={styles.notice} role="status">Some notes could not load. <Link href="/notes">Try again</Link></p> : null}
    <SectionTabs id="notes" label="Notes sections" sections={[
      {id:"library",label:"Library",content:<SelectionCollection searchable={false} label="Notes" items={rows.map(note=>{const course=note.classes?.name ?? "General"; return {id:note.id,title:note.title || "Untitled note",meta:course,image:subjectArtwork(course),content:<><p className={`${noteStyles.excerpt} reading-view`}>{queryText ? snippetForQuery(note.transcript_text || note.body_text || "",queryText) : (note.transcript_text || note.body_text || "No text yet").slice(0,420)}</p><div className={styles.actions}><Link className={styles.primary} href={`/notes/${note.id}`}>Open note</Link><Link href={`/study?source=note:${note.id}`}>Create quiz</Link></div></>};})} empty={<><h2>{queryText || tag ? "No matching notes" : "No notes yet"}</h2><Link className={styles.primary} href={createHref}>Add note</Link></>} />},
      {id:"diana",label:"Ask Diana",content:<div className={noteStyles.chat}><NoteSynthesisPanel classId={classId} generalOnly={general} scopeLabel={subject ? `${subject} notes` : general ? "general notes" : "all notes"} /></div>},
    ]} />
  </main></StudentShell>;
}
