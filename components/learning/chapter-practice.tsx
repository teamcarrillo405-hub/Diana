"use client";
import {useEffect,useRef,useState} from "react";
import {z} from "zod";
import {problemStateSchema,type ProblemState} from "@/lib/learning-engine/problem-state";
import {assessmentSchema} from "@/lib/learning-engine/contracts";
import styles from "./learning-material.module.css";

const exerciseSchema=z.object({id:z.string(),prompt:z.string(),skillId:z.string(),title:z.string(),versionId:z.string()});
const chapterSchema=z.object({exercises:z.array(exerciseSchema),session:problemStateSchema.nullable(),resumed:exerciseSchema.nullable(),variantCount:z.number(),skills:z.array(z.object({id:z.string(),title:z.string(),objective:z.string(),prerequisites:z.array(z.object({id:z.string(),title:z.string()}))}))});
const feedbackSchema=z.object({title:z.string(),guidance:z.string(),nextQuestion:z.string(),steps:z.array(z.string()),limitations:z.array(z.string()),assessment:assessmentSchema.nullable()});
type Exercise=z.infer<typeof exerciseSchema>;
async function send(body:unknown){
  const response=await fetch("/api/learning/chapter-practice",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
  const value=await response.json();if(!response.ok)throw new Error(value.error||"Practice could not load.");return value;
}
export function ChapterPractice({classId,chapter}:{classId:string;chapter:number}){
  const [open,setOpen]=useState(false);
  return <section className={styles.section}>
    <button className={styles.button+" "+styles.practiceToggle} aria-expanded={open} aria-controls="chapter-practice-panel" onClick={()=>setOpen(value=>!value)}>{open?"Close practice":"Practice this chapter"}</button>
    {open&&<PracticePanel key={chapter} classId={classId} chapter={chapter}/>}
  </section>;
}
function PracticePanel({classId,chapter}:{classId:string;chapter:number}){
  const [data,setData]=useState<z.infer<typeof chapterSchema>|null>(null),[variant,setVariant]=useState(0);
  const [selected,setSelected]=useState(""),[active,setActive]=useState<Exercise|null>(null),[state,setState]=useState<ProblemState|null>(null);
  const [response,setResponse]=useState(""),[modality,setModality]=useState<"typed"|"handwriting"|"voice">("typed"),[confirmed,setConfirmed]=useState(true);
  const [feedback,setFeedback]=useState<z.infer<typeof feedbackSchema>|null>(null),[notice,setNotice]=useState(""),[busy,setBusy]=useState(false),[loading,setLoading]=useState(true);
  const pending=useRef<{key:string;id:string;requestId:string}|null>(null);
  useEffect(()=>{
    const controller=new AbortController();setLoading(true);setNotice("");
    void fetch(`/api/learning/chapter-practice?classId=${classId}&chapter=${chapter}&variant=${variant}`,{signal:controller.signal,cache:"no-store"})
      .then(async result=>{const value=await result.json();if(!result.ok)throw new Error(value.error||"Practice could not load.");return chapterSchema.parse(value);})
      .then(value=>{
        if(controller.signal.aborted)return;
        setData(value);setSelected(value.exercises[0]?.id??"");
        if(variant===0&&value.session&&value.resumed){
          setState(value.session);setActive(value.resumed);
          const answer=value.session.observations.find(item=>item.id==="response");
          setResponse(answer?.text??"");setModality(answer?.modality==="handwriting"||answer?.modality==="voice"?answer.modality:"typed");setConfirmed(answer?answer.confirmedHash===answer.contentHash:true);
        }
      }).catch(error=>{if(!controller.signal.aborted)setNotice(error.message);}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});
    return()=>controller.abort();
  },[classId,chapter,variant]);
  async function run(work:()=>Promise<void>){setBusy(true);setNotice("");try{await work();}catch(error){setNotice(error instanceof Error?error.message:"Try again when ready.");}finally{setBusy(false);}}
  async function start(){
    const exercise=data?.exercises.find(item=>item.id===selected);if(!exercise)return;
    const key="start:"+selected;
    if(pending.current?.key!==key)pending.current={key,id:crypto.randomUUID(),requestId:crypto.randomUUID()};
    const value=z.object({state:problemStateSchema}).parse(await send({action:"start",id:pending.current.id,requestId:pending.current.requestId,classId,exerciseId:selected}));
    setState(value.state);setActive(exercise);setResponse("");setModality("typed");setConfirmed(true);setFeedback(null);pending.current=null;
  }
  async function respond(mode:"hint"|"check"|"related_example"){
    if(!state)return;
    const fields={action:"respond",id:state.id,expectedRevision:state.revision,mode,response,confirmed,modality},key=JSON.stringify(fields);
    if(pending.current?.key!==key)pending.current={key,id:state.id,requestId:crypto.randomUUID()};
    const value=z.object({state:problemStateSchema,feedback:feedbackSchema}).parse(await send({...fields,requestId:pending.current.requestId}));
    setState(value.state);setFeedback(value.feedback);pending.current=null;
  }
  return <div id="chapter-practice-panel" className={styles.section}>
    <h2>Chapter {chapter} practice</h2>
    {loading&&<p role="status">Opening practice…</p>}
    {data&&<>
      <div className={styles.toolbar}>
        <label className={styles.field}>Question<select value={selected} disabled={busy||loading} onChange={event=>setSelected(event.target.value)}>{data.exercises.map(item=><option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
        <button className={styles.button} disabled={busy||loading} onClick={()=>void run(start)}>Start question</button>
        {data.variantCount>1&&<button className={styles.button+" "+styles.secondary} disabled={busy||loading} onClick={()=>{setActive(null);setState(null);setFeedback(null);setResponse("");setVariant(value=>(value+1)%data.variantCount);}}>Choose another question</button>}
      </div>
      {active&&state&&<>
        <p className={styles.practicePrompt}>{active.prompt}</p>
        <div className={styles.toolbar}><label className={styles.field}>Response format<select value={modality} disabled={busy} onChange={event=>{const next=event.target.value as typeof modality;setModality(next);setConfirmed(next==="typed");setFeedback(null);}}><option value="typed">Typed answer</option><option value="handwriting">From handwriting</option><option value="voice">From spoken work</option></select></label><span className={styles.label}>Saved in this class</span></div>
        <label className={styles.field}>{modality==="typed"?"Your response":modality==="handwriting"?"Type what your handwriting says":"Type what you said"}<textarea value={response} maxLength={4000} disabled={busy} onChange={event=>{setResponse(event.target.value);if(modality!=="typed")setConfirmed(false);setFeedback(null);}}/></label>
        {modality!=="typed"&&<label className={styles.confirmation}><input type="checkbox" checked={confirmed} disabled={busy} onChange={event=>setConfirmed(event.target.checked)}/>This transcription matches my work.</label>}
        <div className={styles.toolbar}>
          <button className={styles.button} disabled={busy||!response.trim()||!confirmed} onClick={()=>void run(()=>respond("check"))}>Check my work</button>
          <button className={styles.button+" "+styles.secondary} disabled={busy} onClick={()=>void run(()=>respond("hint"))}>Give me a hint</button>
          <button className={styles.button+" "+styles.secondary} disabled={busy} onClick={()=>void run(()=>respond("related_example"))}>Show a similar example</button>
        </div>
        {feedback&&<div className={styles.feedback} role="status"><h3>{feedback.title}</h3><p>{feedback.guidance}</p>{feedback.steps.length>0&&<ol>{feedback.steps.map((step,index)=><li key={index}>{step}</li>)}</ol>}<p>{feedback.nextQuestion}</p><details><summary>About this check</summary>{feedback.limitations.map((item,index)=><p key={index}>{item}</p>)}</details></div>}
      </>}
      <details><summary>Chapter skills</summary><ul className={styles.skillList}>{data.skills.map(skill=><li key={skill.id}><strong>{skill.title}</strong><p>{skill.objective}</p>{skill.prerequisites.length>0&&<p className={styles.label}>Builds on {skill.prerequisites.map(item=>item.title).join(", ")}</p>}</li>)}</ul></details>
      <p className={styles.label}>Diana practice · Educator review pending. Checks cover the stated calculation, not a mastery score.</p>
    </>}
    {busy&&<p role="status">Saving your work…</p>}
    {notice&&<p className={styles.notice} role="status">{notice}</p>}
  </div>;
}
