"use client";
import {useCallback,useEffect,useState} from "react";
import type {SourcePage} from "@/lib/learning-engine/contracts";
import styles from "./learning-material.module.css";
import {PdfSourcePage} from "./pdf-source-page";

export function RegionReview({page,versionId,busy,onConfirm}:{page:SourcePage;versionId:string;busy:boolean;onConfirm:(id:string,text:string)=>void}){
  const [regionId,setRegionId]=useState(page.regions?.[0]?.id??"");
  const region=page.regions?.find(item=>item.id===regionId)??page.regions?.[0];
  const [text,setText]=useState("");
  const [source,setSource]=useState<{url:string;mime:string}|null>(null);
  const [sourceReady,setSourceReady]=useState(false);
  const [loading,setLoading]=useState(true);
  const loaded=useCallback(()=>setSourceReady(true),[]);
  useEffect(()=>{setText(region?page.text.slice(region.startOffset,region.endOffset):"");},[page,region]);
  useEffect(()=>{
    const controller=new AbortController();setSource(null);setSourceReady(false);setLoading(true);
    void fetch("/api/learning/source?versionId="+versionId,{signal:controller.signal,cache:"no-store"}).then(response=>response.ok?response.json():null)
      .then(value=>{if(value&&typeof value.url==="string"&&typeof value.mime==="string")setSource(value);}).catch(()=>{}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});
    return()=>controller.abort();
  },[versionId]);
  if(!region)return null;
  return <div className={styles.regionReview}>
    {source?.mime==="application/pdf"&&<div className={styles.regionImage}><PdfSourcePage url={source.url} pageNumber={page.page} onReady={loaded}/><span aria-hidden="true" style={{left:region.box.x*100+"%",top:region.box.y*100+"%",width:region.box.width*100+"%",height:region.box.height*100+"%"}}/></div>}
    {source?.mime.startsWith("image/")&&<div className={styles.regionImage}>
      {/* Authenticated, short-lived original upload URL. */}
      <img src={source.url} alt="Original assignment source" onLoad={loaded}/>
      <span aria-hidden="true" style={{left:region.box.x*100+"%",top:region.box.y*100+"%",width:region.box.width*100+"%",height:region.box.height*100+"%"}}/>
    </div>}
    <label className={styles.field}>Text region<select value={region.id} onChange={event=>setRegionId(event.target.value)}>{page.regions?.map((item,index)=><option key={item.id} value={item.id}>Region {index+1}{item.confirmed?" · confirmed":""}</option>)}</select></label>
    <label className={styles.field}>Check against the original<textarea maxLength={12000} value={text} onChange={event=>setText(event.target.value)}/></label>
    <button className={styles.button} disabled={busy||!text.trim()||!sourceReady} onClick={()=>onConfirm(region.id,text)}>Confirm region</button>
    {!source&&<p className={styles.label}>{loading?"Loading original…":"Reopen this review to load the original source."}</p>}
  </div>;
}
