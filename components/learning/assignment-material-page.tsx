import Link from "next/link";
import {notFound,redirect} from "next/navigation";
import {StudentShell} from "@/components/student-shell/student-shell";
import styles from "@/components/student-shell/collection.module.css";
import {createLearningClient,learningAccess} from "@/lib/learning-engine/server";
import {loadProfile} from "@/lib/profile";
import {LearningMaterial} from "@/components/learning/learning-material";
import {z} from "zod";
import {materialDestination} from "@/lib/learning-engine/material-navigation";
import {OriginalMaterialReader} from "./original-material-reader";
import {practiceSubjectForClass} from "@/lib/learning-engine/course-domains";

export async function AssignmentMaterialPage({assignmentId,classId,sourceId,versionId,page}:{assignmentId:string;classId?:string;sourceId?:string;versionId?:string;page?:number}){
  if(!z.string().uuid().safeParse(assignmentId).success)notFound();
  const client=await createLearningClient();
  const {data:{user}}=await client.auth.getUser();
  if(!user)redirect("/login");
  const enhanced=await learningAccess("retrieval",user.id);
  const [assignment,sources,profile,problems]=await Promise.all([
    client.from("assignments").select("id,title,class_id,kind,description,rubric_text").eq("id",assignmentId).eq("owner_id",user.id).maybeSingle(),
    client.from("assignment_sources").select("id,title,source_type,import_status,mime_type,extracted_text").eq("assignment_id",assignmentId).eq("owner_id",user.id).order("created_at"),
    loadProfile(),
    client.from("assignment_problems").select("id",{count:"exact",head:true}).eq("assignment_id",assignmentId).eq("owner_id",user.id),
  ]);
  if(!assignment.data)notFound();
  if(classId&&assignment.data.class_id!==classId)notFound();
  if(!classId&&assignment.data.class_id)redirect(materialDestination(assignmentId,assignment.data.class_id,sourceId));
  const classRecord=classId?await client.from("classes").select("name,subject_category").eq("id",classId).eq("owner_id",user.id).maybeSingle():null;
  if(classId&&!classRecord?.data)notFound();
  const materialSources=[
    ...(problems.count?[{id:"assignment-problems",title:"Worksheet questions",source_type:"instructions",import_status:"imported"}]:[]),
    ...(assignment.data.description?[{id:"assignment-directions",title:"Assignment directions",source_type:"instructions",import_status:"imported"}]:[]),
    ...(assignment.data.rubric_text?[{id:"assignment-rubric",title:"Rubric",source_type:"rubric",import_status:"imported"}]:[]),
    ...(sources.data??[]),
  ];
  return <StudentShell active={classId?"Classes":"Work"} profile={{displayName:profile?.display_name,photoUrl:profile?.photo_url}}>
    <main id="main-content" className={styles.main}>
      {classId&&<Link href={`/classes/${classId}?materials=1`}>{classRecord?.data?.name} / Materials</Link>}
      <header className={styles.heading}><h1>Materials</h1><Link href={"/assignments/"+assignmentId+"/workspace"}>Open assignment</Link></header>
      {enhanced
        ? <LearningMaterial assignmentId={assignmentId} classId={classId} title={assignment.data.title} sources={materialSources} initialSourceId={sourceId} initialVersionId={versionId} initialPage={page} initialSubject={classRecord?.data?practiceSubjectForClass(classRecord.data.subject_category,classRecord.data.name):/\b(math|algebra|equations?|geometry|polynomial)\b/i.test(assignment.data.title)?"math":"reading"}/>
        : <OriginalMaterialReader assignmentId={assignmentId} title={assignment.data.title} sources={sources.data??[]} initialSourceId={sourceId} directions={assignment.data.description} rubric={assignment.data.rubric_text}/>}
    </main>
  </StudentShell>;
}
