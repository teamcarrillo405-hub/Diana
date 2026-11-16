"use client";
import {useCallback,useEffect,useState,useRef,useMemo} from "react";
import Link from "next/link";
import {z} from "zod";
import {documentVersionSchema,assessmentSchema,type AssessmentResult} from "@/lib/learning-engine/contracts";
import {learningDeviceId,saveOfflinePackage} from "@/lib/learning-engine/offline-client";
import styles from "./learning-material.module.css";
import {sourcePageSchema} from "@/lib/learning-engine/source-layout";
import {RegionReview} from "./region-review";
import {LocalExerciseHelp} from "./local-exercise-help";
import {domainSchema,type LearningDomain} from "@/lib/learning-engine/course-domains";
import {PreparationStatus} from "./preparation-status";
import {extractionQuality} from "@/lib/learning-engine/source-layout";
import { isOriginalMaterialType, originalMaterialUrl } from "@/lib/learning-engine/material-navigation";

const documentsSchema=z.object({documents:z.array(z.object({
  id:z.string(),metadata:documentVersionSchema,pages:z.array(sourcePageSchema),created_at:z.string(),
}))});
type Document=z.infer<typeof documentsSchema>["documents"][number];
const exerciseSchema=z.object({id:z.string(),version_id:z.string(),skill_id:z.string(),prompt:z.string(),label:z.string(),pageNumber:z.number(),reviewed:z.boolean(),next_revision:z.number().int().positive()}).passthrough();
type Exercise=z.infer<typeof exerciseSchema>;
async function post(url:string,body:unknown):Promise<unknown>{
  const response=await fetch(url,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
  const data:unknown=await response.json();
  if(!response.ok){
    const parsed=z.object({error:z.string()}).safeParse(data);
    throw new Error(parsed.success?parsed.data.error:"This action is unavailable right now.");
  }
  return data;
}

export function LearningMaterial({assignmentId,classId,title,sources,initialSubject,initialSourceId,initialVersionId,initialPage=1}:{
  assignmentId:string;title:string;sources:Array<{id:string;title:string|null;source_type:string;import_status:string;mime_type?:string|null;extracted_text?:string|null}>;
  initialSubject:LearningDomain;
  initialSourceId?:string;
  classId?:string;initialVersionId?:string;initialPage?:number;
}){
  const [subject,setSubject]=useState(initialSubject);
  const [sourceId,setSourceId]=useState(sources.find(source=>source.id===initialSourceId)?.id??sources[0]?.id??"");
  const [documents,setDocuments]=useState<Document[]>([]);
  const [versionId,setVersionId]=useState("");
  const [pageNumber,setPageNumber]=useState(initialPage);
  const [transcription,setTranscription]=useState("");
  const [busy,setBusy]=useState(false);
  const [notice,setNotice]=useState<string|null>(null);
  const [query,setQuery]=useState("");
  const [matches,setMatches]=useState<Array<{text:string;pageLabel:string}>>([]);
  const [exercises,setExercises]=useState<Exercise[]>([]);
  const [exerciseId,setExerciseId]=useState("");
  const [answer,setAnswer]=useState("");
  const [assessment,setAssessment]=useState<AssessmentResult|null>(null);
  const pendingAttempt=useRef<{key:string;id:string}|null>(null);
  const [indexRemaining,setIndexRemaining]=useState<number|null>(null);
  const [session,setSession]=useState<{id:string;problemId:string}|null>(null);
  const [reviewRegions,setReviewRegions]=useState(false);
  const document=documents.find(item=>item.id===versionId);
  const quality=useMemo(()=>document?extractionQuality(document.pages):null,[document]);
  const sourceVersions=documents.filter(item=>item.metadata.documentId===sourceId);
  const source = sources.find(item => item.id === sourceId);
  const page=document?.pages.find(item=>item.page===pageNumber)??document?.pages[0];
  const exercise=exercises.find(item=>item.id===exerciseId);
  const refresh=useCallback(async()=>{
    const response=await fetch("/api/learning/documents?assignmentId="+assignmentId+(initialVersionId?"&versionId="+initialVersionId:""),{cache:"no-store"});
    if(!response.ok)throw new Error("Material could not load.");
    const value=documentsSchema.parse(await response.json());
    setDocuments(value.documents);
    return value.documents;
  },[assignmentId,initialVersionId]);
  useEffect(()=>{
    let active=true;
    void refresh().then(rows=>{if(active){const pinned=initialVersionId&&sourceId===initialSourceId;const found=rows.find(item=>item.metadata.documentId===sourceId&&(!pinned||item.id===initialVersionId));setVersionId(found?.id??"");if(pinned&&!found)setNotice("This saved source version is unavailable.");}}).catch(error=>{if(active)setNotice(error.message);});
    return()=>{active=false;};
  },[refresh,sourceId,initialVersionId,initialSourceId]);
  useEffect(()=>{setTranscription(page?.text??"");},[page]);
  useEffect(()=>{if(document)setSubject(document.metadata.subject);},[document]);
  useEffect(()=>{
    setIndexRemaining(null);
    if(!versionId)return;
    const controller=new AbortController();
    void fetch("/api/learning/index?assignmentId="+assignmentId+"&versionId="+versionId,{signal:controller.signal})
      .then(response=>response.ok?response.json():null).then(value=>{if(value&&Number.isInteger(value.remaining))setIndexRemaining(value.remaining);}).catch(()=>{});
    return()=>controller.abort();
  },[assignmentId,versionId]);
  async function run(action:()=>Promise<void>){
    setBusy(true);setNotice(null);
    try{await action();}catch(error){setNotice(error instanceof Error?error.message:"Try again when you are ready.");}
    finally{setBusy(false);}
  }
  async function index(selectedSource=sourceId,selectedSubject=subject){
    const started=z.object({versionId:z.string().optional(),status:z.string(),jobId:z.string().optional()}).parse(await post("/api/learning/ingest",{assignmentId,sourceId:selectedSource,subject:selectedSubject}));
    let result=started;
    if(started.jobId){
      for(let batch=0;batch<152;batch++){
        const progress=z.object({versionId:z.string().nullable(),status:z.string(),pageCount:z.number(),totalPages:z.number().nullable(),busy:z.boolean()})
          .parse(await post("/api/learning/jobs",{jobId:started.jobId}));
        if(progress.busy)throw new Error("This PDF is already being prepared. Return shortly and choose Prepare material to resume.");
        setNotice("Preparing pages: "+progress.pageCount+(progress.totalPages?" of "+progress.totalPages:""));
        if(progress.versionId){result={versionId:progress.versionId,status:progress.status};break;}
        if(progress.status==="error")throw new Error("Preparation paused. Choose Prepare material to resume.");
      }
    }
    if(!result.versionId)throw new Error("Preparation paused. Choose Prepare material to resume.");
    await refresh();setVersionId(result.versionId);setPageNumber(1);setExercises([]);
    setNotice(result.status==="ready"?"Material is ready.":"Review the extracted text before using it.");
  }
  async function confirm(){
    if(!page||!document)return;
    const result=z.object({versionId:z.string()}).parse(await post("/api/learning/documents",{versionId:document.id,pages:[{page:page.page,text:transcription}]}));
    await refresh();setVersionId(result.versionId);setExercises([]);setNotice("Confirmed text saved as a new version.");
  }
  async function search(){
    const response=z.object({chunks:z.array(z.object({text:z.string(),anchors:z.array(z.object({location:z.object({pageLabel:z.string()})}))}))})
      .parse(await post("/api/learning/retrieve",{assignmentId,query,versionIds:versionId?[versionId]:undefined}));
    setMatches(response.chunks.map(chunk=>({text:chunk.text,pageLabel:chunk.anchors[0]?.location.pageLabel??"Source"})));
    if(!response.chunks.length)setNotice("No matching passage was found in this material.");
  }
  async function prepare(){
    const response=z.object({exercises:z.array(exerciseSchema),coverage:z.object({exerciseLimitReached:z.boolean(),exerciseLimit:z.number()}).optional()}).parse(await post("/api/learning/exercises",{assignmentId,versionId}));
    setExercises(response.exercises);setExerciseId(response.exercises.find(item=>item.pageNumber===pageNumber)?.id??response.exercises[0]?.id??"");setAssessment(null);
    if(!response.exercises.length)setNotice("This source needs a reviewed practice question.");
    else if(response.coverage?.exerciseLimitReached)setNotice(`Showing up to ${response.coverage.exerciseLimit} supported questions from this material.`);
  }
  async function check(){
    if(!exercise)return;
    const key=JSON.stringify([exercise.id,exercise.next_revision,answer]);
    if(pendingAttempt.current?.key!==key)pendingAttempt.current={key,id:crypto.randomUUID()};
    const result=z.object({assessment:assessmentSchema}).parse(await post("/api/learning/attempts",{
      id:pendingAttempt.current.id,assignmentId,problemId:exercise.id,skillId:exercise.skill_id,revision:exercise.next_revision,
      subject:exercise.skill_id.startsWith("math.")?"math":"reading",input:answer,assistance:session?.problemId===exercise.id?"independent":"unverified",modality:"typed",confirmed:true,
      ...(session?.problemId===exercise.id?{sessionId:session.id}:{}),
      documentVersionIds:[exercise.version_id],
    }));
    pendingAttempt.current=null;
    setSession(null);
    setAssessment(result.assessment);setExercises(items=>items.map(item=>item.id===exercise.id?{...item,next_revision:item.next_revision+1}:item));
  }
  async function savePack(){
    const result=z.object({package:z.unknown()}).parse(await post("/api/learning/offline-package",{
      assignmentId,deviceId:learningDeviceId(),versionIds:[versionId],
    }));
    await saveOfflinePackage(result.package);setNotice("Study pack saved on this device.");
  }
  return <div className={styles.layout}>
    <aside className={styles.sources} aria-label="Assignment sources">
      {sources.map(source=><button key={source.id} className={styles.source} disabled={busy} aria-pressed={sourceId===source.id} onClick={()=>{setSourceId(source.id);setVersionId(documents.find(item=>item.metadata.documentId===source.id)?.id??"");setPageNumber(1);setExercises([]);setAssessment(null);setMatches([]);}}>{source.title||"Assignment source"}</button>)}
      {!sources.length&&<p>Add source material in <Link href={"/assignments/"+assignmentId+"/workspace"}>your workspace</Link>.</p>}
    </aside>
    <div className={styles.body}>
      <PreparationStatus assignmentId={assignmentId} sources={sources} disabled={busy} onResume={async(id,category)=>{const next=domainSchema.parse(category);setSourceId(id);setSubject(next);await run(()=>index(id,next));}}/>
      <section className={styles.section} aria-label="Material">
        <h2>{title}</h2>
        {isOriginalMaterialType(source?.mime_type) ? <a className={styles.originalLink} href={originalMaterialUrl(assignmentId,sourceId)} target="_blank" rel="noreferrer">Open original file</a> : null}
        {!page && source?.extracted_text ? <div className={styles.passage}>{source.extracted_text}</div> : null}
        <div className={styles.toolbar}>
          <label className={styles.field}>Subject<select value={subject} onChange={event=>setSubject(domainSchema.parse(event.target.value))}>{domainSchema.options.map(value=><option key={value} value={value}>{value[0].toUpperCase()+value.slice(1)}</option>)}</select></label>
          <button className={styles.button} disabled={busy||!sourceId} onClick={()=>void run(index)}>Prepare material</button>
        </div>
        {sourceVersions.length>0&&<label className={styles.field}>Source version<select value={versionId} onChange={event=>{setVersionId(event.target.value);setPageNumber(1);setExercises([]);setAssessment(null);}}>
          {sourceVersions.map(item=><option key={item.id} value={item.id}>{item.metadata.title} · {new Date(item.created_at).toLocaleString()}</option>)}
        </select></label>}
        {indexRemaining!==null&&indexRemaining>0&&<button className={styles.button+" "+styles.secondary} disabled={busy} onClick={()=>void run(async()=>{
          const result=z.object({remaining:z.number().int().nonnegative()}).parse(await post("/api/learning/index",{assignmentId,versionId,requestId:crypto.randomUUID()}));
          setIndexRemaining(result.remaining);setNotice(result.remaining?"Search indexing paused. Continue when ready.":"Search index is ready.");
        })} title="Optional: find related wording using AI.">Expand search</button>}
        {page&&<>
          <label className={styles.field}>Page<select value={page.page} onChange={event=>setPageNumber(Number(event.target.value))}>{document?.pages.map(item=><option key={item.page} value={item.page}>{item.pageLabel}</option>)}</select></label>
          {!!page.regions?.length&&<details onToggle={event=>setReviewRegions(event.currentTarget.open)}><summary>Review page regions</summary>{reviewRegions&&<RegionReview key={versionId+":"+page.page} page={page} versionId={versionId} busy={busy} onConfirm={(id,text)=>void run(async()=>{
            const result=z.object({versionId:z.string()}).parse(await post("/api/learning/documents",{versionId,region:{page:page.page,id,text}}));
            await refresh();setVersionId(result.versionId);setExercises([]);setNotice("Region saved as a new source version.");
          })}/>}</details>}
          {page.interpretation==="model_extraction"?<><label className={styles.field}>Check the text against your source<textarea value={transcription} onChange={event=>setTranscription(event.target.value)}/></label><button className={styles.button} disabled={busy||!transcription.trim()} onClick={()=>void run(confirm)}>Confirm text</button></>
            :<div className={styles.passage}>{page.text}</div>}
          {document&&quality&&<details><summary>Text preparation quality</summary><p>{quality.reviewPages} of {document.pages.length} pages have a review signal. These signals identify sparse text, replacement characters or unconfirmed extraction; they do not measure recognition accuracy.</p>{quality.pages.filter(item=>item.reviewRequired).slice(0,50).map(item=><p key={item.page}>Page {item.page}: {item.reasons.map(reason=>reason.replaceAll("_"," ")).join(", ")}</p>)}</details>}
          <div className={styles.toolbar}>{classId&&document?.metadata.subject!=="math"&&<Link className={styles.button} href={`/classes/${classId}/materials/${assignmentId}/practice?version=${versionId}&page=${page.page}`}>Practice with passages</Link>}{document&&(document.metadata.subject==="math"||document.metadata.subject==="reading")&&<button className={styles.button+" "+styles.secondary} disabled={busy} onClick={()=>void run(prepare)}>{document.metadata.subject==="math"?"Practice source questions":"Source questions"}</button>}{document?.metadata.subject==="math"&&<Link href={`/assignments/${assignmentId}/workspace`}>Open in Work</Link>}<button className={styles.button+" "+styles.secondary} disabled={busy} onClick={()=>void run(savePack)}>Save for offline</button><Link href="/offline">Saved study packs</Link></div>
        </>}
      </section>
      {versionId&&<section className={styles.section} aria-label="Find evidence"><label className={styles.field}>Find a passage<input value={query} onChange={event=>setQuery(event.target.value)} maxLength={1000}/></label><button className={styles.button} disabled={busy||!query.trim()} onClick={()=>void run(search)}>Search material</button>
        {matches.map((item,index)=><blockquote className={styles.passage} key={index}><span className={styles.label}>{item.pageLabel}</span><p>{item.text}</p></blockquote>)}
      </section>}
      {exercise&&<section className={styles.section} aria-label="Practice">
        {exercise.reviewed&&exercise.next_revision===1&&exercise.skill_id.startsWith("math.")&&session?.problemId!==exercise.id&&<button className={styles.button+" "+styles.secondary} disabled={busy} onClick={()=>void run(async()=>{
          const result=z.object({session:z.object({id:z.string().uuid()})}).parse(await post("/api/learning/session",{assignmentId,problemId:exercise.id}));
          setSession({id:result.session.id,problemId:exercise.id});setAnswer("");setNotice("Try this one on your own. You can still ask for help.");
        })}>Try independently</button>}
        <h2>Practice</h2><label className={styles.field}>Question<select value={exerciseId} onChange={event=>{setExerciseId(event.target.value);setAnswer("");setAssessment(null);}}>{exercises.map(item=><option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
        <p>{exercise.prompt}</p><label className={styles.field}>Your response<textarea value={answer} onChange={event=>setAnswer(event.target.value)} maxLength={4000}/></label>
        <button className={styles.button} disabled={busy||!answer.trim()} onClick={()=>void run(check)}>Check my work</button>
        <LocalExerciseHelp key={exercise.id} assignmentId={assignmentId} exerciseId={exercise.id} versionId={exercise.version_id} response={answer} disabled={busy} onHelp={()=>setSession(null)} restoreResponse={setAnswer}/>
        {assessment&&<div className={styles.feedback} role="status"><strong>{assessment.outcome==="supported"?"The calculation checks out":assessment.outcome==="revise"?"Take another look":"Guidance"}</strong>{assessment.observations.map((text,index)=><p key={index}>{text}</p>)}{assessment.limitations.length>0&&<details><summary>How this was checked</summary>{assessment.limitations.map((text,index)=><p className={styles.label} key={index}>{text}</p>)}</details>}</div>}
      </section>}
      {busy&&<p role="status" className={styles.label}>Working on it…</p>}
      {notice&&<p role="status" className={styles.notice}>{notice}</p>}
    </div>
  </div>;
}
