"use client";
import {useEffect,useState} from "react";
import {listOfflinePackages,loadPracticeDraft,savePracticeDraft} from "@/lib/learning-engine/offline-client";
import {offlineSearch,checkOfflineExercise,type OfflinePackage} from "@/lib/learning-engine/offline-package";
import {createClient} from "@/lib/supabase/client";
import styles from "./learning-material.module.css";

export function OfflineLearningReader(){
  const [packages,setPackages]=useState<OfflinePackage[]>([]);
  const [selected,setSelected]=useState("");
  const [query,setQuery]=useState("");
  const [answer,setAnswer]=useState("");
  const [exerciseId,setExerciseId]=useState("");
  const [feedback,setFeedback]=useState<string[]>([]);
  const [notice,setNotice]=useState<string|null>(null);
  useEffect(()=>{
    let active=true;
    const refresh=()=>void listOfflinePackages().then(items=>{
      if(active){setPackages(items);setSelected(items[0]?.id??"");setExerciseId(items[0]?.exercises[0]?.id??"");}
    }).catch(()=>{if(active)setNotice("Saved study packs are unavailable on this device.");});
    refresh();
    const {data:{subscription}}=createClient().auth.onAuthStateChange(()=>{
      if(active){setPackages([]);setAnswer("");setFeedback([]);}
      // Outside the auth callback to avoid taking the auth client's lock twice.
      setTimeout(refresh,0);
    });
    return()=>{active=false;subscription.unsubscribe();};
  },[]);
  const bundle=packages.find(item=>item.id===selected);
  const chunks=bundle?(query.trim()?offlineSearch(bundle,query).chunks:bundle.chunks):[];
  const exercise=bundle?.exercises.find(item=>item.id===exerciseId);
  useEffect(()=>{
    let active=true;
    setAnswer("");
    if(bundle&&exerciseId)void loadPracticeDraft(bundle,exerciseId).then(draft=>{if(active&&draft)setAnswer(draft.answer);}).catch(()=>{});
    return()=>{active=false;};
  },[bundle,exerciseId]);
  return <section className={styles.section} style={{maxWidth:960}} aria-label="Saved study packs">
    {!packages.length&&<p>No study packs are saved for this account on this device.</p>}
    {bundle&&<>
      <h2>{bundle.title}</h2>
      {packages.length>1&&<label className={styles.field}>Material<select value={selected} onChange={event=>{setSelected(event.target.value);setAnswer("");setFeedback([]);setExerciseId(packages.find(item=>item.id===event.target.value)?.exercises[0]?.id??"");}}>{packages.map(item=><option key={item.id} value={item.id}>{item.title}</option>)}</select></label>}
      <label className={styles.field}>Find a passage<input value={query} onChange={event=>setQuery(event.target.value)} maxLength={1000}/></label>
      {chunks.map(chunk=><div className={styles.passage} key={chunk.id}><span className={styles.label}>{chunk.anchors[0]?.location.pageLabel}</span><p>{chunk.text}</p></div>)}
      {!chunks.length&&<p>No matching passage in this pack.</p>}
      {exercise&&<><label className={styles.field}>Practice<select value={exerciseId} onChange={event=>{setExerciseId(event.target.value);setAnswer("");setFeedback([]);}}>{bundle.exercises.map(item=><option key={item.id} value={item.id}>{item.label??item.prompt}</option>)}</select></label>
        <p>{exercise.prompt}</p><label className={styles.field}>Your response<textarea value={answer} onChange={event=>setAnswer(event.target.value)} maxLength={4000}/></label>
        <button className={styles.button} disabled={!answer.trim()} onClick={()=>{
          const result=checkOfflineExercise(exercise,answer);
          setFeedback([result.outcome==="supported"?"The calculation checks out.":result.outcome==="revise"?"Take another look at your calculation.":"Reconnect for reading feedback.",...result.observations]);
        }}>{exercise.check.kind==="reading"?"Review the rubric":"Check calculation"}</button>
        <button className={styles.button+" "+styles.secondary} disabled={!answer.trim()} onClick={()=>void savePracticeDraft(bundle,exercise.id,answer)
          .then(()=>setNotice("Draft saved. It will appear in Notes when connected.")).catch(error=>setNotice(error instanceof Error?error.message:"Your draft could not be saved."))}>Save draft</button>
        <div role="status">{feedback.map((text,index)=><p key={index}>{text}</p>)}</div>
      </>}
      <p className={styles.label}>Saved material and practice work offline. Reconnect to chat with Diana.</p>
    </>}
    {notice&&<p role="status">{notice}</p>}
  </section>;
}
