"use client";
import {useEffect,useRef,useState,type Dispatch,type SetStateAction} from "react";
import {z} from "zod";
import styles from "./learning-material.module.css";
const resultSchema=z.object({state:z.object({revision:z.number().int().positive()}),feedback:z.object({title:z.string(),guidance:z.string(),steps:z.array(z.string()),nextQuestion:z.string(),limitations:z.array(z.string())})});
export function LocalExerciseHelp({assignmentId,exerciseId,versionId,response,disabled,onHelp,restoreResponse}:{assignmentId:string;exerciseId:string;versionId:string;response:string;disabled:boolean;onHelp:()=>void;restoreResponse:Dispatch<SetStateAction<string>>}){
  const [busy,setBusy]=useState(false),[loading,setLoading]=useState(true),[feedback,setFeedback]=useState<z.infer<typeof resultSchema>["feedback"]|null>(null),[notice,setNotice]=useState("");
  const [confirmed,setConfirmed]=useState(false),[modality,setModality]=useState<"typed"|"handwriting"|"voice">("typed");
  const record=useRef<{id:string;revision:number}|null>(null),pending=useRef<{key:string;requestId:string}|null>(null);
  const currentResponse=useRef(response);currentResponse.current=response;
  useEffect(()=>{
    const controller=new AbortController();
    record.current=null;pending.current=null;setLoading(true);setConfirmed(false);setFeedback(null);
    void fetch(`/api/learning/problem-state?assignmentId=${assignmentId}&exerciseId=${encodeURIComponent(exerciseId)}`,{signal:controller.signal,cache:"no-store"})
      .then(async response=>{if(!response.ok)return null;return z.object({state:z.object({id:z.string().uuid(),revision:z.number().int().positive(),exerciseVersionId:z.string().nullable(),observations:z.array(z.object({id:z.string(),text:z.string(),modality:z.string()}))}).nullable()}).parse(await response.json()).state;})
      .then(state=>{if(!controller.signal.aborted&&state?.exerciseVersionId===versionId){
        record.current={id:state.id,revision:state.revision};
        const saved=state.observations.find(item=>item.id==="response");
        if(saved&&!currentResponse.current){restoreResponse(current=>current||saved.text);if(saved.modality==="typed"||saved.modality==="handwriting"||saved.modality==="voice")setModality(saved.modality);}
      }})
      .catch(()=>{}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});
    return()=>controller.abort();
  },[assignmentId,exerciseId,versionId,restoreResponse]);
  useEffect(()=>{if(modality!=="typed")setConfirmed(false);},[response,modality]);
  async function help(mode:"hint"|"related_example"){
    setBusy(true);setNotice("");
    try{
      record.current??={id:crypto.randomUUID(),revision:0};
      const body={recordId:record.current.id,expectedRevision:record.current.revision,assignmentId,exerciseId,versionId,response,mode,confirmed,modality},key=JSON.stringify(body);
      if(pending.current?.key!==key)pending.current={key,requestId:crypto.randomUUID()};
      const result=await fetch("/api/learning/tutor",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...body,requestId:pending.current.requestId})});
      const value=await result.json();if(!result.ok)throw new Error(value.error||"Help could not load.");
      const parsed=resultSchema.parse(value);record.current.revision=parsed.state.revision;pending.current=null;setFeedback(parsed.feedback);onHelp();
    }catch(error){setNotice(error instanceof Error?error.message:"Help could not load.");}finally{setBusy(false);}
  }
  return <div className={styles.section}>
    <label className={styles.confirmation}><input type="checkbox" checked={confirmed} disabled={busy||disabled} onChange={event=>setConfirmed(event.target.checked)}/>The question and symbols match my source.</label>
    <details><summary>Working from handwriting or speech?</summary><label className={styles.field}>Response format<select value={modality} disabled={busy||disabled} onChange={event=>{setModality(event.target.value as typeof modality);setConfirmed(false);}}><option value="typed">Typed work</option><option value="handwriting">Transcribed handwriting</option><option value="voice">Transcribed spoken work</option></select></label><p className={styles.label}>Enter the transcription in Your response, then confirm it matches your work.</p></details>
    <div className={styles.toolbar}><button className={styles.button+" "+styles.secondary} disabled={busy||loading||disabled||!confirmed} onClick={()=>void help("hint")}>Give me a hint</button><button className={styles.button+" "+styles.secondary} disabled={busy||loading||disabled||!confirmed} onClick={()=>void help("related_example")}>Show a similar example</button></div>
    {feedback&&<div className={styles.feedback} role="status"><strong>{feedback.title}</strong><p>{feedback.guidance}</p>{feedback.steps.length>0&&<ol>{feedback.steps.map((step,index)=><li key={index}>{step}</li>)}</ol>}<p>{feedback.nextQuestion}</p><details><summary>About this help</summary>{feedback.limitations.map((item,index)=><p key={index}>{item}</p>)}</details></div>}
    {notice&&<p role="status" className={styles.notice}>{notice}</p>}
  </div>;
}
