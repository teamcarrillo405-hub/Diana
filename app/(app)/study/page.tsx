import Link from "next/link";
import { redirect } from "next/navigation";
import { StudentShell } from "@/components/student-shell/student-shell";
import { SectionTabs } from "@/components/student-shell/section-tabs";
import { SelectionCollection, type CollectionItem } from "@/components/student-shell/selection-collection";
import { ActionSubmit } from "@/components/student-shell/action-submit";
import styles from "@/components/student-shell/collection.module.css";
import { subjectArtwork } from "@/lib/assignment-navigation";
import { loadProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import { createQuiz } from "./actions";
import { learningAccess } from "@/lib/learning-engine/server";

type Params = { notice?: string; source?: string; assignmentId?: string; classId?: string; view?: string; questionCount?: string };
function className(value: unknown) {
  const row = Array.isArray(value) ? value[0] : value;
  return row && typeof row === "object" && "name" in row && typeof row.name === "string" ? row.name : "Class material";
}
export default async function StudyPage({ searchParams }: { searchParams: Promise<Params> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=%2Fstudy");
  const params = await searchParams;
  let assignmentQuery = supabase.from("assignments").select("id,title,class_id,classes(name)").eq("owner_id",user.id).neq("status","abandoned").order("updated_at",{ascending:false});
  let noteQuery = supabase.from("notes").select("id,title,class_id,tags,classes(name)").eq("owner_id",user.id).order("updated_at",{ascending:false});
  let artifactQuery = supabase.from("study_artifacts").select("id,title,artifact_type,class_id,updated_at,classes(name)").eq("owner_id",user.id).order("updated_at",{ascending:false});
  const classId = /^[0-9a-f-]{36}$/i.test(params.classId ?? "") ? params.classId : undefined;
  if (classId) { assignmentQuery=assignmentQuery.eq("class_id",classId); noteQuery=noteQuery.eq("class_id",classId); artifactQuery=artifactQuery.eq("class_id",classId); }
  const [assignments, notes, artifacts, due, profile] = await Promise.all([
    assignmentQuery, noteQuery, artifactQuery,
    supabase.from("flashcards").select("id",{count:"exact",head:true}).eq("owner_id",user.id).lte("due_at",new Date().toISOString()),
    loadProfile(),
  ]);
  const sources = [
    ...(assignments.data ?? []).map(row=>({id:`assignment:${row.id}`,title:row.title,subject:className(row.classes),kind:"Assignment",href:`/assignments/${row.id}/workspace`})),
    ...(notes.data ?? []).filter(row => !row.tags?.includes("grayson-demo")).map(row=>({id:`note:${row.id}`,title:row.title || "Untitled note",subject:className(row.classes),kind:"Note",href:`/notes/${row.id}`})),
  ];
  const requestedCount = [3,6,10,15,20].includes(Number(params.questionCount)) ? String(params.questionCount) : "6";
  const materialEnabled=await learningAccess("retrieval",user.id);
  const sourceItems: CollectionItem[] = sources.map(source=>({id:source.id,title:source.title,meta:`${source.subject} · ${source.kind}`,image:subjectArtwork(source.subject),content:<form key={source.id} action={createQuiz}>
    <input type="hidden" name="source" value={source.id} />
    {classId ? <input type="hidden" name="classId" value={classId} /> : null}
    {materialEnabled&&source.kind==="Assignment"&&<div className={styles.actions}><Link href={"/study/material/"+source.id.slice("assignment:".length)}>Prepare material</Link></div>}
    <label className={styles.field}>Questions<select name="questionCount" defaultValue={requestedCount}>{[3,6,10,15,20].map(count=><option key={count} value={count}>{count} questions</option>)}</select></label>
    <div className={styles.actions}><ActionSubmit pendingLabel="Creating quiz">Create quiz</ActionSubmit><Link href={source.href}>Open source</Link></div>
  </form>}));
  const classQuery = classId ? `?classId=${encodeURIComponent(classId)}` : "";
  const savedItems: CollectionItem[] = (artifacts.data ?? []).map(row=>({id:row.id,title:row.title,meta:`${className(row.classes)} · ${row.artifact_type === "study_guide" ? "Guide" : "Quiz"}`,image:subjectArtwork(className(row.classes)),content:<div key={row.id} className={styles.actions}><Link className={styles.primary} href={`/study-artifacts/${row.id}${classQuery}`}>{row.artifact_type === "study_guide" ? "Open guide" : "Open quiz"}</Link></div>}));
  const unavailable = assignments.error || notes.error || artifacts.error;
  return <StudentShell active={classId ? "Classes" : "More"} scene={classId ? "classes" : "seminar"} mode="scenic" profile={{displayName:profile?.display_name,photoUrl:profile?.photo_url,photoOffsetX:profile?.photo_offset_x,photoOffsetY:profile?.photo_offset_y}}>
    <main id="main-content" className={styles.main}>
      <header className={styles.heading}><h1>Quiz</h1>{(due.count ?? 0)>0 ? <Link href="/study/recall">Recall · {due.count} ready</Link> : <Link href="/more">Back to More</Link>}</header>
      {classId ? <div className={styles.filters}><Link href={`/classes/${classId}?section=quiz`}>Back to class</Link><Link href="/study">All practice</Link></div> : null}
      {unavailable ? <p role="status" className={styles.notice}>Some material could not load. <Link href="/study">Try again</Link></p> : null}
      {params.notice ? <p role="status" className={styles.notice}>{params.notice === "choose-source" ? "Choose an assignment or note first." : params.notice === "assignment-not-found" ? "That assignment is unavailable." : params.notice.slice(0,240)}</p> : null}
      <SectionTabs id="quiz" label="Quiz sections" initial={params.view === "saved" ? "saved" : "source"} sections={[
        {id:"source",label:"Choose work",content:<SelectionCollection label="Quiz sources" items={sourceItems} initial={params.source ?? (params.assignmentId ? `assignment:${params.assignmentId}` : undefined)} empty={<><h2>Add class material</h2><div className={styles.actions}><Link href="/quick-add" className={styles.primary}>Add assignment</Link><Link href="/notes/new">Add note</Link></div></>} />},
        {id:"saved",label:"Saved practice",content:<SelectionCollection label="Saved practice" items={savedItems} empty={<p className={styles.muted}>No saved practice yet. Choose work to create a quiz.</p>} />},
      ]} />
    </main>
  </StudentShell>;
}
