"use client";

import {useEffect,useLayoutEffect,useRef,useState} from "react";
import {z} from "zod";
import {browserModelCached,browserRecognitionModels,removeBrowserModel,runBrowserRecognition,supportsBrowserRecognition} from "@/lib/learning-engine/browser-recognition";
import styles from "./learning-material.module.css";
import {HandwritingLineCrop} from "./handwriting-line-crop";

const draftSchema=z.object({
  version:z.literal("recognition-draft-v1"),text:z.string().min(1).max(4000),confirmedHash:z.null(),
  recognition:z.object({kind:z.enum(["speech","handwriting_line"]),modelId:z.string(),revision:z.string(),confidence:z.null(),networkUsed:z.literal(false)}),
});
type Kind="speech"|"handwriting_line";
type CaptureProps={kind:Kind;disabled:boolean;contextKey:string;onDraft:(text:string,proof:string|null)=>void};

/** Optional on-device-server path. The student must check the text before the answer is used. */
export function LocalRecognitionCapture(props:CaptureProps){
  // A saved revision, exercise or format change starts a new capture session.
  // Remounting also clears the native file input, which React state cannot do.
  return <CaptureSession key={JSON.stringify([props.contextKey,props.kind])} {...props}/>;
}

function CaptureSession({kind,disabled,onDraft}:CaptureProps){
  const [available,setAvailable]=useState(false),[file,setFile]=useState<File|null>(null),[busy,setBusy]=useState(false),[status,setStatus]=useState("");
  const [handwritingSource,setHandwritingSource]=useState<File|null>(null),[sourceRevision,setSourceRevision]=useState(0);
  const [browserAvailable,setBrowserAvailable]=useState(false),[browserReady,setBrowserReady]=useState(false);
  const post=useRef<AbortController|null>(null);
  const mounted=useRef(false);
  // Invalidate during commit, before deferred promises can run ahead of passive
  // effect cleanup after a context switch or unmount.
  useLayoutEffect(()=>{mounted.current=true;return()=>{mounted.current=false;post.current?.abort();post.current=null;};},[]);
  // Saving/checking the parent response also invalidates an outstanding draft.
  // Re-enabling the control must never revive that canceled request.
  useLayoutEffect(()=>{if(disabled){post.current?.abort();post.current=null;setBusy(false);setStatus("");}},[disabled]);
  useEffect(()=>{
    const controller=new AbortController();
    if(supportsBrowserRecognition()){
      setBrowserAvailable(true);
      void browserModelCached(kind).then(ready=>{if(mounted.current&&!controller.signal.aborted)setBrowserReady(ready);}).catch(()=>{if(mounted.current&&!controller.signal.aborted)setBrowserAvailable(false);});
    }
    void fetch("/api/learning/local-recognition",{cache:"no-store",signal:controller.signal})
      .then(async response=>response.ok?response.json():null)
      .then(value=>{if(mounted.current&&!controller.signal.aborted)setAvailable(Boolean(value&&(kind==="speech"?value.speech:value.handwritingLine)));})
      .catch(()=>{if(mounted.current&&!controller.signal.aborted)setAvailable(false);});
    return()=>{controller.abort();post.current?.abort();post.current=null;};
  },[kind]);
  if(!available&&!browserAvailable)return null;
  const isSpeech=kind==="speech";
  async function prepare(){
    if(disabled||post.current)return;
    const controller=new AbortController();post.current=controller;
    const current=()=>mounted.current&&post.current===controller&&!controller.signal.aborted;
    setBusy(true);setStatus("Preparing this device…");
    try{
      await runBrowserRecognition({kind,operation:"prepare",signal:controller.signal,onProgress:percent=>{if(current())setStatus(`Downloading and verifying model: ${percent}%.`);}});
      if(current()){setBrowserReady(true);setStatus("Ready on this browser. You can now read a file without sending it to a server.");}
    }catch{if(current())setStatus("The download could not finish. Check your connection or enter the text yourself.");}
    finally{if(current()){post.current=null;setBusy(false);}}
  }
  async function recognize(){
    if(!file||disabled||post.current)return;
    const controller=new AbortController();post.current=controller;
    const current=()=>mounted.current&&post.current===controller&&!controller.signal.aborted;
    setBusy(true);setStatus("");
    try{
      if(!file.size||file.size>5_000_000)throw new Error("Choose a file under 5 MB.");
      const expected=isSpeech?["audio/wav"]:["image/png","image/jpeg"];
      if(!expected.includes(file.type))throw new Error(isSpeech?"Choose a PCM WAV recording.":"Choose a PNG or JPEG crop of one handwritten line.");
      if(!available){
        if(!browserReady)throw new Error("Download the model before reading a file.");
        const text=await runBrowserRecognition({kind,operation:"recognize",file,signal:controller.signal});
        if(!current())return;
        if(!text)throw new Error("No usable transcription. Enter the text yourself.");
        // Browser output has no server attestation. Save only as the student's
        // explicitly checked transcription, never as verified machine evidence.
        onDraft(text,null);
        setStatus("Check every word and symbol against your original, then confirm the transcription below. Browser recognition is unverified.");
        return;
      }
      const body=new FormData();body.set("kind",kind);body.set("asset",file);
      const response=await fetch("/api/learning/local-recognition",{method:"POST",body,signal:controller.signal});
      if(!current())return;
      const value=await response.json();
      if(!current())return;
      if(!response.ok)throw new Error("Offline recognition is unavailable. Enter the text yourself.");
      const draft=draftSchema.parse(value.draft);
      if(draft.recognition.kind!==kind)throw new Error("Recognition returned another format.");
      const proof=z.string().min(1).max(2000).parse(value.proof);
      onDraft(draft.text,proof);
      setStatus("Check every word and symbol against your original, then confirm the transcription below. Accuracy has not been established.");
    }catch(error){if(current())setStatus(error instanceof Error?error.message:"Offline recognition is unavailable. Enter the text yourself.");}
    finally{if(current()){post.current=null;setBusy(false);}}
  }
  return <div className={styles.recognitionCapture}>
    {!available&&<div>
      {!browserReady&&<><p className={styles.label}>Download {browserRecognitionModels[kind].label.toLowerCase()} recognition ({Math.ceil(browserRecognitionModels[kind].bytes/1_000_000)} MB, plus up to 34 MB runtime). Downloads come from Hugging Face. Your file stays on this device. English only.</p>
        <button className={styles.button+" "+styles.secondary} type="button" disabled={disabled||busy} onClick={()=>void prepare()}>Download for offline use</button></>}
      {browserReady&&<><p className={styles.label}>Model saved in this browser. Offline reading works while this page is open; saving your response still needs a connection.</p><button className={styles.button+" "+styles.secondary} type="button" disabled={disabled||busy} onClick={()=>void removeBrowserModel(kind).then(()=>{if(mounted.current){setBrowserReady(false);setStatus("Model removed from this browser.");}}).catch(()=>{if(mounted.current)setStatus("Could not remove the model. Try again.");})}>Remove downloaded model</button></>}
    </div>}
    <label className={styles.field}>{isSpeech?"Optional offline speech file":"Optional offline handwriting line"}
      <input type="file" accept={isSpeech?".wav,audio/wav":".png,.jpg,.jpeg,image/png,image/jpeg"} disabled={disabled||busy} onChange={event=>{
        const chosen=event.target.files?.[0]??null;setFile(isSpeech?chosen:null);setHandwritingSource(isSpeech?null:chosen);setSourceRevision(value=>value+1);setStatus("");
      }}/>
    </label>
    {!isSpeech&&handwritingSource&&<HandwritingLineCrop key={sourceRevision} file={handwritingSource} disabled={disabled||busy} onSelection={setFile}/>}
    <button className={styles.button+" "+styles.secondary} type="button" disabled={disabled||busy||!file||(!available&&!browserReady)} onClick={()=>void recognize()}>{busy?"Reading locally…":"Read into response"}</button>
    {busy&&<button className={styles.button+" "+styles.secondary} type="button" onClick={()=>{post.current?.abort();post.current=null;setBusy(false);setStatus("Canceled. You can enter the text yourself.");}}>Cancel reading</button>}
    <p className={styles.label}>{isSpeech?"16 kHz mono PCM WAV, up to 2 minutes.":"Cropped prose on one line only. Equations and diagrams need manual entry."} {available?"The file is processed by the configured local runtime.":"Review the draft before using it. Accuracy varies with the recording or handwriting."}</p>
    {status&&<p role="status" className={styles.notice}>{status}</p>}
  </div>;
}
