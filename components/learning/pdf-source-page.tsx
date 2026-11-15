"use client";
import {useEffect,useRef,useState} from "react";
import type {PDFDocumentProxy,RenderTask} from "pdfjs-dist";
import styles from "./learning-material.module.css";
export function PdfSourcePage({url,pageNumber,onReady,onPageCount}:{url:string;pageNumber:number;onReady:()=>void;onPageCount?:(count:number)=>void}){
  const canvas=useRef<HTMLCanvasElement>(null);
  const [notice,setNotice]=useState("Loading original page…");
  const [loaded,setLoaded]=useState<{url:string;document:PDFDocumentProxy}|null>(null);
  const ready=useRef(onReady),pageCount=useRef(onPageCount);
  ready.current=onReady;pageCount.current=onPageCount;
  useEffect(()=>{
    const controller=new AbortController();
    let disposed=false,dispose:(()=>void)|undefined;
    setNotice("Loading original page…");
    void (async()=>{
      const pdf=await import("pdfjs-dist/legacy/build/pdf.mjs");
      pdf.GlobalWorkerOptions.workerSrc="/assets/learning/pdf-worker-6.3.289.min.mjs";
      const response=await fetch(url,{signal:controller.signal,cache:"no-store"});
      if(!response.ok)throw new Error("Original page is unavailable.");
      const task=pdf.getDocument({data:await response.arrayBuffer()});
      dispose=()=>{void task.destroy();};
      const document=await task.promise;
      if(disposed)return;
      pageCount.current?.(document.numPages);
      setLoaded({url,document});
    })().catch(()=>{if(!disposed)setNotice("Original page is unavailable. Reopen this review to try again.");});
    return()=>{disposed=true;controller.abort();dispose?.();};
  },[url]);
  useEffect(()=>{
    if(!loaded||loaded.url!==url)return;
    let disposed=false,render:RenderTask|undefined;
    setNotice("Loading original page…");
    void (async()=>{
      const page=await loaded.document.getPage(pageNumber);
      if(disposed||!canvas.current)return;
      const viewport=page.getViewport({scale:1.5});
      // Bound canvas allocation even for malformed page dimensions.
      if(viewport.width*viewport.height>8_000_000)throw new Error("Open the original file to review this large page.");
      canvas.current.width=viewport.width;canvas.current.height=viewport.height;
      render=page.render({canvas:canvas.current,viewport});
      await render.promise;
      if(!disposed){setNotice("");ready.current();}
    })().catch(()=>{if(!disposed)setNotice("Original page is unavailable. Reopen this review to try again.");});
    return()=>{disposed=true;render?.cancel();};
  },[loaded,url,pageNumber]);
  return <div className={styles.pdfPage}><canvas ref={canvas} aria-label={"Original PDF page "+pageNumber}/>{notice&&<p role="status">{notice}</p>}</div>;
}
