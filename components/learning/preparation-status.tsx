"use client";
import {useState} from "react";
import {z} from "zod";
import styles from "./learning-material.module.css";
const schema=z.object({jobs:z.array(z.object({id:z.string(),source_id:z.string(),subject:z.string(),state:z.string(),cursor:z.number(),total_pages:z.number().nullable(),version_id:z.string().nullable(),error_code:z.string().nullable(),lease_until:z.string().nullable(),updated_at:z.string()}))});
export function PreparationStatus({assignmentId,sources,onResume,disabled}:{assignmentId:string;sources:Array<{id:string;title:string|null}>;onResume:(sourceId:string,subject:string)=>Promise<void>;disabled:boolean}){
  const [data,setData]=useState<z.infer<typeof schema>|null>(null),[notice,setNotice]=useState(""),[busy,setBusy]=useState(false);
  async function refresh(){setBusy(true);try{const response=await fetch("/api/learning/jobs?assignmentId="+assignmentId,{cache:"no-store"}),body=await response.json();if(!response.ok)throw new Error(body.error);setData(schema.parse(body));setNotice("");}catch(error){setNotice(error instanceof Error?error.message:"Preparation could not load.");}finally{setBusy(false);}}
  return <details onToggle={event=>{if(event.currentTarget.open&&!data&&!busy)void refresh();}}><summary>Preparation progress</summary>
    <div className={styles.section}><button className={styles.button+" "+styles.secondary} disabled={busy||disabled} onClick={()=>void refresh()}>Refresh progress</button>
      {data?.jobs.length===0&&<p>No PDF preparation jobs yet.</p>}
      {data?.jobs.map(job=><article key={job.id}><h3>{sources.find(source=>source.id===job.source_id)?.title??"Saved source"}</h3><p>{job.state==="error"?"Preparation paused":job.state==="needs_confirmation"?"Ready for text review":job.state==="ready"?"Ready":"Preparing"} · {job.cursor}{job.total_pages?" of "+job.total_pages:""} pages · {job.subject}</p>
        {!["ready","needs_confirmation"].includes(job.state)&&<><p>{job.error_code==="source_changed"?"The source changed. Preparation will create a version from the current file.":job.lease_until&&Date.parse(job.lease_until)>Date.now()?"A page batch is being processed. Refresh shortly.":"Resume from the last saved page batch."}</p><button className={styles.button} disabled={busy||disabled||!!job.lease_until&&Date.parse(job.lease_until)>Date.now()} onClick={()=>void onResume(job.source_id,job.subject).then(refresh).catch(()=>{})}>Resume preparation</button></>}
      </article>)}{notice&&<p role="status" className={styles.notice}>{notice}</p>}
    </div>
  </details>;
}
