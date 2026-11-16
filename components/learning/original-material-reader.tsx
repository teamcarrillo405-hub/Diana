"use client";

import {useCallback,useState} from "react";
import {PdfSourcePage} from "./pdf-source-page";
import styles from "./learning-material.module.css";
import { isOriginalMaterialType, originalMaterialUrl } from "@/lib/learning-engine/material-navigation";

type Source={id:string;title:string|null;mime_type:string|null;source_type:string;extracted_text:string|null};

/** Original materials remain available independently of experimental AI enrollment. */
export function OriginalMaterialReader({assignmentId,title,sources,initialSourceId,directions,rubric}:{
  assignmentId:string;title:string;sources:Source[];initialSourceId?:string;directions:string|null;rubric:string|null;
}){
  const entries=[
    ...(directions?[{id:"directions",title:"Assignment directions",mime_type:null,source_type:"instructions",extracted_text:directions}]:[]),
    ...(rubric?[{id:"rubric",title:"Rubric",mime_type:null,source_type:"rubric",extracted_text:rubric}]:[]),
    ...sources,
  ];
  const [selected,setSelected]=useState(entries.some(entry=>entry.id===initialSourceId)?initialSourceId:entries[0]?.id);
  const [page,setPage]=useState(1);
  const [pageCount,setPageCount]=useState(1);
  const ready=useCallback(()=>{},[]);
  const source=entries.find(entry=>entry.id===selected);
  const url=source?originalMaterialUrl(assignmentId,source.id):"";
  const textSource=source&&(source.extracted_text || ["instructions","rubric","extracted_text"].includes(source.source_type));

  return <div className={styles.layout}>
    <nav className={styles.sources} aria-label="Material files">
      {entries.map(entry=><button key={entry.id} className={styles.source} aria-pressed={selected===entry.id} onClick={()=>{setSelected(entry.id);setPage(1);setPageCount(1);}}>{entry.title||"Attached file"}</button>)}
    </nav>
    <section className={styles.section} aria-label={title}>
      <h2>{source?.title||title}</h2>
      {!source&&<p>Add a file from this assignment to see it here.</p>}
      {source?.mime_type==="application/pdf"?<>
        <div className={styles.toolbar}>
          <button className={`${styles.button} ${styles.secondary}`} disabled={page<=1} onClick={()=>setPage(value=>value-1)}>Previous page</button>
          <span aria-live="polite">Page {page} of {pageCount}</span>
          <button className={`${styles.button} ${styles.secondary}`} disabled={page>=pageCount} onClick={()=>setPage(value=>value+1)}>Next page</button>
        </div>
        <PdfSourcePage url={url} pageNumber={page} onReady={ready} onPageCount={setPageCount}/>
      </>:isOriginalMaterialType(source?.mime_type)?<div className={styles.regionImage}>
        {/* The authenticated same-origin endpoint streams the original upload. */}
        <img src={url} alt={source?.title||"Assignment material"}/>
      </div>:textSource?<p className={styles.passage}>{source.extracted_text||"No text is attached yet."}</p>:source?<p>Open the assignment to review this attachment.</p>:null}
    </section>
  </div>;
}
