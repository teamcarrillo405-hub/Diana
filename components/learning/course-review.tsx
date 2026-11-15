"use client";
import { useEffect, useState } from "react";
import { z } from "zod";
import { courseModuleSchema, REVIEW_CRITERIA, type CourseModule } from "@/lib/learning-engine/course-publication";
import { responseRubric } from "@/lib/learning-engine/response-rubric";
import { CourseResponseReviewInvitations } from "./course-response-review-invitations";
import { CourseResponseReviewRater } from "./course-response-review-rater";
import styles from "./course-review.module.css";
const dataSchema=z.object({profile:z.object({roles:z.array(z.string()),subjects:z.array(z.string())}),courses:z.array(z.object({id:z.string(),title:z.string(),contentHash:z.string()})),modules:z.array(z.object({id:z.string(),course_id:z.string(),content_hash:z.string(),status:z.string(),compatible:z.boolean(),payload:z.unknown()})),reviews:z.array(z.object({id:z.string(),module_id:z.string(),decision:z.string(),notes:z.string()})),publications:z.array(z.object({course_id:z.string(),content_hash:z.string(),status:z.string()}))});
type ReviewData=z.infer<typeof dataSchema>;
const names:Record<typeof REVIEW_CRITERIA[number],string>={accuracy:"Content and checking method are accurate",sourceRights:"Sources and instructional rights are verified",instruction:"Prompts, hints and examples support the objective",accessibility:"Language and presentation suit the stated course",safety:"Boundaries and student protections are appropriate"};
export function CourseReview(){
  const [data,setData]=useState<ReviewData|null>(null),[selected,setSelected]=useState(""),[notice,setNotice]=useState(""),[busy,setBusy]=useState(false);
  const [notes,setNotes]=useState(""),[conflict,setConflict]=useState(false),[checks,setChecks]=useState<Record<string,boolean>>({});
  async function refresh(){const response=await fetch("/api/learning/course-review",{cache:"no-store"}),body=await response.json();if(!response.ok)throw new Error(body.error);const next=dataSchema.parse(body);setData(next);return next;}
  useEffect(()=>{refresh().catch(error=>setNotice(error.message));},[]);
  const snapshot=data?.modules.find(row=>row.id===selected),parsed=courseModuleSchema.safeParse(snapshot?.payload),payload:CourseModule|null=parsed.success?parsed.data:null;
  const status=snapshot?(data?.publications.find(row=>row.course_id===snapshot.course_id&&row.content_hash===snapshot.content_hash)?.status??snapshot.status):"";
  async function action(input:unknown){setBusy(true);setNotice("");try{const response=await fetch("/api/learning/course-review",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(input)}),body=await response.json();if(!response.ok)throw new Error(body.error);await refresh();if(body.id&&typeof input==="object"&&input&&"action" in input&&input.action==="register")setSelected(body.id);setNotes("");setChecks({});setConflict(false);setNotice("Saved.");}catch(error){setNotice(error instanceof Error?error.message:"Please try again.");}finally{setBusy(false);}}
  return <section className={styles.root} aria-label="Course review">
    <h1>Course review</h1><p>Review the complete course version before publication.</p>
    {notice&&<p role="status">{notice}</p>}
    {!data?(!notice&&<p>Loading course review…</p>):<>
      {data.profile.roles.includes("reviewer") && <><CourseResponseReviewInvitations/><CourseResponseReviewRater/></>}
      {data.profile.roles.includes("operator")&&<details><summary>Submit a current course</summary><div>{data.courses.map(course=><p key={course.id}>{course.title} <button disabled={busy} onClick={()=>action({action:"register",courseId:course.id})}>Submit for review</button></p>)}</div></details>}
      <label>Course version<select value={selected} disabled={busy} onChange={event=>{setSelected(event.target.value);setNotes("");setChecks({});setConflict(false);setNotice("");}}><option value="">Choose a version</option>{data.modules.map(row=><option key={row.id} value={row.id}>{data.courses.find(course=>course.id===row.course_id)?.title??row.course_id} · {row.content_hash.slice(0,8)} · {row.status}</option>)}</select></label>
      {snapshot&&<><p>Status: {status}. {!snapshot.compatible&&"This version no longer matches the current course."}</p>
        {payload&&<><h2>{payload.framework.courses[0].title}</h2>{payload.activities.map(activity=><details key={activity.id}><summary>{activity.title}</summary><p>{activity.prompt}</p>{activity.sources.map(source=><blockquote key={source.id}><strong>{source.title}</strong><p>{source.text}</p></blockquote>)}{responseRubric(activity)&&<><h3>Response rubric</h3>{responseRubric(activity)!.criteria.map(criterion=><div key={criterion.id}><h4>{criterion.title}</h4><ol start={0}>{criterion.descriptors.map(descriptor=><li key={descriptor}>{descriptor}</li>)}</ol></div>)}</>}<h3>Checking specification</h3><pre style={{whiteSpace:"pre-wrap",overflowWrap:"anywhere"}}>{JSON.stringify(activity.method,null,2)}</pre><h3>Hints</h3><ol>{activity.hints.map(hint=><li key={hint}>{hint}</li>)}</ol><h3>Different example</h3><p>{activity.example.prompt}</p><ol>{activity.example.steps.map(step=><li key={step}>{step}</li>)}</ol></details>)}</>}
        {data.reviews.filter(row=>row.module_id===snapshot.id).map(review=><p key={review.id}>{review.decision==="approve"?"Approved":"Revision requested"}: {review.notes}</p>)}
        <label>Review or publication notes<textarea value={notes} onChange={event=>setNotes(event.target.value)} maxLength={4000} disabled={busy}/></label>
        {data.profile.roles.includes("reviewer")&&status==="draft"&&snapshot.compatible&&<fieldset disabled={busy}><legend>Your independent review</legend>{REVIEW_CRITERIA.map(key=><label key={key}><input type="checkbox" checked={checks[key]??false} onChange={event=>setChecks({...checks,[key]:event.target.checked})}/>{names[key]}</label>)}<label><input type="checkbox" checked={conflict} onChange={event=>setConflict(event.target.checked)}/>I reviewed this version independently and have no conflict of interest.</label><p>Unchecked criteria request a revision. A submitted review is permanent.</p><button disabled={!conflict||notes.trim().length<20} onClick={()=>action({action:"review",moduleId:snapshot.id,checks:Object.fromEntries(REVIEW_CRITERIA.map(key=>[key,checks[key]??false])),notes,noConflict:conflict})}>Record my review</button></fieldset>}
        {data.profile.roles.includes("operator")&&<div><button disabled={busy||!snapshot.compatible||status==="withdrawn"||notes.trim().length<3} onClick={()=>action({action:"publish",moduleId:snapshot.id,reason:notes})}>Publish reviewed version</button> <button disabled={busy||status==="withdrawn"||notes.trim().length<3} onClick={()=>action({action:"withdraw",moduleId:snapshot.id,reason:notes})}>Withdraw this version</button><p>Publication requires two current, independent educator approvals. Withdrawing stops new instruction and retains saved student work.</p></div>}
      </>}
    </>}
  </section>;
}
