"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { saveArtifactFlashcards } from "@/app/(app)/study-artifacts/actions";
import type { StudyArtifactCard } from "@/lib/study-helper/artifacts";
import styles from "@/components/student-shell/quiz.module.css";

export function ArtifactFlashcards({artifactId,cards,savedCount=0}:{artifactId:string;cards:StudyArtifactCard[];savedCount?:number}) {
  const [drafts,setDrafts]=useState(cards);
  const [index,setIndex]=useState(0);
  const [revealed,setRevealed]=useState(false);
  const [pending,startTransition]=useTransition();
  const [result,setResult]=useState<{count:number}|{error:string}|null>(savedCount ? {count:savedCount} : null);
  const card=drafts[index];
  const saved=Boolean(result && "count" in result);
  function update(field:"front"|"back",value:string){setDrafts(current=>current.map((card,i)=>i===index ? {...card,[field]:value} : card));}
  function save(){startTransition(async()=>{const response=await saveArtifactFlashcards({artifactId,cards:drafts});setResult(response.ok ? {count:response.count} : {error:response.error});});}
  if(!card)return <p>No recall questions in this set yet.</p>;
  return <section className={styles.paper} aria-label="Recall quiz">
    <p className={styles.eyebrow}>Recall · {index+1} of {drafts.length}</p><h2>{card.front}</h2>
    {revealed ? <p>{card.back}</p> : <button className={styles.primary} onClick={()=>setRevealed(true)}>Reveal answer</button>}
    <p className={styles.quiet}>{card.sourceAnchor}</p>
    {!saved ? <details><summary>Edit question</summary><label className={styles.response}>Question<input aria-label={`Card ${index+1} front`} value={card.front} disabled={pending} onChange={event=>update("front",event.target.value)} /></label><label className={styles.response}>Answer<textarea aria-label={`Card ${index+1} back`} value={card.back} rows={3} disabled={pending} onChange={event=>update("back",event.target.value)} /></label></details> : null}
    <div className={styles.actions}><button onClick={()=>{setIndex(index-1);setRevealed(false);}} disabled={index===0 || pending}>Previous</button><button onClick={()=>{setIndex(index+1);setRevealed(false);}} disabled={index===drafts.length-1 || pending}>Next</button></div>
    {saved ? <div><p role="status">{result && "count" in result ? result.count : 0} questions saved for recall.</p><Link className={styles.primary} href={`/study/recall?source=${artifactId}`}>Start recall</Link></div> : <button className={styles.primary} disabled={pending} onClick={save}>{pending ? "Saving" : "Add to Quiz"}</button>}
    {result && "error" in result ? <p role="status">{result.error}</p> : null}
  </section>;
}
