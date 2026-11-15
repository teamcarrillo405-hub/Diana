"use client";
import {useCallback,useRef,useState,type FormEvent} from "react";
import Link from "next/link";
import {PdfSourcePage} from "./pdf-source-page";
import {ChapterPractice} from "./chapter-practice";
import {PRECALCULUS_BOOK as book,textbookAssetPath} from "@/lib/learning-engine/textbook-catalog";
import type {TextbookMatch} from "@/lib/learning-engine/textbook-search";
import styles from "./learning-material.module.css";

export function ReferenceTextbook({chapters,classId,initialChapter=1,initialPage=1}:{chapters:Array<{number:number;pages:number}>;classId:string;initialChapter?:number;initialPage?:number}){
  const [chapter,setChapter]=useState(initialChapter),[page,setPage]=useState(initialPage);
  const [query,setQuery]=useState(""),[matches,setMatches]=useState<TextbookMatch[]|null>(null);
  const [notice,setNotice]=useState(""),[busy,setBusy]=useState(false);
  const requestId=useRef(0);
  const ready=useCallback(()=>{},[]);
  const total=chapters.find(item=>item.number===chapter)?.pages??1;
  async function search(event:FormEvent){
    event.preventDefault();const current=++requestId.current;setBusy(true);setNotice("");
    try{
      const response=await fetch(`/api/materials/textbook?bookId=${book.id}&q=${encodeURIComponent(query.trim())}`,{cache:"no-store"});
      const result=await response.json();
      if(current!==requestId.current)return;
      if(!response.ok)throw new Error(result.error||"Book search is unavailable.");
      setMatches(result.matches);
      if(!result.matches.length)setNotice("No matching passage. Try a topic or term from your class.");
    }catch(error){if(current===requestId.current)setNotice(error instanceof Error?error.message:"Book search is unavailable.");}
    finally{if(current===requestId.current)setBusy(false);}
  }
  function openPage(nextChapter:number,nextPage:number){setChapter(nextChapter);setPage(nextPage);}
  return <section className={styles.section}>
    <form className={styles.bookSearch} onSubmit={search}>
      <label className={styles.field}>Search all chapters<input value={query} onChange={event=>setQuery(event.target.value)} maxLength={300} placeholder="Topic or term" type="search"/></label>
      <button className={styles.button} disabled={busy||query.trim().length<2}>{busy?"Searching…":"Find passage"}</button>
    </form>
    {notice&&<p className={styles.notice} role="status">{notice}</p>}
    {!!matches?.length&&<section aria-label="Matching passages" className={styles.bookMatches}>
      {matches.map(match=><article key={match.id}>
        <button className={`${styles.button} ${styles.secondary}`} onClick={()=>{openPage(match.chapter,match.page);setMatches(null);}}>Chapter {match.chapter} · PDF page {match.page}</button>
        <p className={styles.bookQuote}>{match.quote}</p>
      </article>)}
      <button className={`${styles.button} ${styles.secondary}`} onClick={()=>setMatches(null)}>Close results</button>
    </section>}
    <div className={styles.bookControls}>
      <label className={styles.field}>Chapter<select value={chapter} onChange={event=>openPage(Number(event.target.value),1)}>{book.chapters.map(item=><option key={item.number} value={item.number}>{item.number}. {item.title}</option>)}</select></label>
      <label className={styles.field}>PDF page<input aria-label="PDF page" type="number" min={1} max={total} value={page} onChange={event=>{const value=Number(event.target.value);if(Number.isInteger(value)&&value>=1&&value<=total)setPage(value);}}/></label>
      <div className={styles.toolbar}>
        <button className={`${styles.button} ${styles.secondary}`} disabled={page<=1} onClick={()=>setPage(value=>value-1)}>Previous</button>
        <span>{page} / {total}</span>
        <button className={`${styles.button} ${styles.secondary}`} disabled={page>=total} onClick={()=>setPage(value=>value+1)}>Next</button>
      </div>
    </div>
    <ChapterPractice classId={classId} chapter={chapter}/>
    <Link className={styles.button+" "+styles.secondary} href={`/classes/${encodeURIComponent(classId)}/reference/${book.id}/ask?chapter=${chapter}`}>Ask Diana about this chapter</Link>
    <p className={styles.label}>Search text may simplify equations. Use the original page below.</p>
    <PdfSourcePage url={textbookAssetPath(chapter)} pageNumber={page} onReady={ready}/>
    <p className={styles.label}>{book.authors} · Edition {book.edition} · <a href={book.licenseUrl} target="_blank" rel="noreferrer">{book.license}</a>. Original chapters unchanged; search text extracted by Diana. <a href={book.publisherUrl} target="_blank" rel="noreferrer">Publisher</a></p>
  </section>;
}
