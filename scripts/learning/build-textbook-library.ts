import {mkdir,readFile,writeFile} from "node:fs/promises";
import path from "node:path";
import {createHash} from "node:crypto";
import {gzipSync} from "node:zlib";
import {extractPdfBatch} from "../../lib/learning-engine/pdf";
import {structureDocument,validateDocumentAnchor} from "../../lib/learning-engine/curriculum";
import {retrieveCurriculum} from "../../lib/learning-engine/retrieval";
import {PRECALCULUS_BOOK as book,PUBLIC_TEXTBOOK_SCOPE as scope,textbookChapterUrl} from "../../lib/learning-engine/textbook-catalog";

const hash=(bytes:Uint8Array)=>createHash("sha256").update(bytes).digest("hex");
async function main(){
  const assets=path.resolve("public/assets/textbooks",book.assetDirectory);
  const indexes=path.resolve("content/textbooks",book.assetDirectory);
  const evidence=path.resolve("artifacts/learning-engine/research/open-textbook");
  await Promise.all([mkdir(assets,{recursive:true}),mkdir(indexes,{recursive:true}),mkdir(evidence,{recursive:true})]);
  const chapters=[];
  for(const chapter of book.chapters){
    const pdfPath=path.join(assets,`chapter-${chapter.number}.pdf`);
    let bytes:Buffer;
    try{bytes=await readFile(pdfPath);}catch{
      const response=await fetch(textbookChapterUrl(chapter.number),{signal:AbortSignal.timeout(60000)});
      const destination=new URL(response.url);
      if(!response.ok||destination.protocol!=="https:"||destination.hostname!=="www.opentextbookstore.com"||!destination.pathname.startsWith("/precalc/"))throw new Error("Publisher download unavailable.");
      if(Number(response.headers.get("content-length"))>30_000_000)throw new Error("Chapter exceeds PDF size limit.");
      bytes=Buffer.from(await response.arrayBuffer());
      if(bytes.length>30_000_000||bytes.subarray(0,5).toString()!=="%PDF-")throw new Error("Unexpected chapter file.");
      await writeFile(pdfPath,bytes);
    }
    const digest=hash(bytes);
    // Mutable publisher URLs must not silently change a previously pinned edition.
    const lockPath=path.join(indexes,`chapter-${chapter.number}.source.json`);
    let old:{assetHash:string}|null=null;
    try{old=JSON.parse(await readFile(lockPath,"utf8"));}catch(error){if((error as NodeJS.ErrnoException).code!=="ENOENT")throw error;}
    if(old&&old.assetHash!==digest)throw new Error(`Chapter ${chapter.number} changed; review the edition before replacing its lock.`);
    const pages=[];let total=1;
    for(let start=1;start<=total;start+=10){
      const batch=await extractPdfBatch(bytes,start,10);total=batch.totalPages;pages.push(...batch.pages);
    }
    const document=await structureDocument({documentId:`${book.id}-chapter-${chapter.number}`,...scope,title:chapter.title,edition:`${book.edition}, chapter ${chapter.number}`,subject:"math",instructionRights:"licensed",sourceAssetHash:digest},pages);
    if(!document.chunks.length||!document.chunks.every(chunk=>chunk.anchors.every(anchor=>validateDocumentAnchor(anchor,document))))throw new Error(`Chapter ${chapter.number} has invalid source anchors.`);
    const retrieval=chapter.queries.map(query=>{
      const result=retrieveCurriculum(query,document.chunks,{...scope,versionIds:[document.version.id]});
      return {query,matches:result.chunks.length,pages:result.chunks.map(chunk=>chunk.anchors[0].location.page),anchorsValid:result.chunks.every(chunk=>chunk.anchors.every(anchor=>validateDocumentAnchor(anchor,document)))};
    });
    // Only the compact search index is shipped to the server. Original PDFs remain the reading authority.
    const index={bookId:book.id,chapter:chapter.number,version:document.version,chunks:document.chunks};
    const compressed=gzipSync(JSON.stringify(index));
    await writeFile(path.join(indexes,`chapter-${chapter.number}.json.gz`),compressed);
    const row={number:chapter.number,title:chapter.title,pages:total,blocks:document.blocks.length,chunks:document.chunks.length,assetHash:digest,indexHash:hash(compressed),pdfBytes:bytes.length,indexBytes:compressed.length,source:textbookChapterUrl(chapter.number),retrieval};
    await writeFile(lockPath,JSON.stringify(row,null,2)+"\n");
    chapters.push(row);console.log(`Chapter ${chapter.number}: ${total} pages, ${document.chunks.length} chunks, all anchors checked`);
  }
  const report={bookId:book.id,edition:book.edition,authors:book.authors,license:book.license,licenseUrl:book.licenseUrl,publisher:book.publisherUrl,checkedAt:"2026-09-25",chapters,pages:chapters.reduce((sum,chapter)=>sum+chapter.pages,0),chunks:chapters.reduce((sum,chapter)=>sum+chapter.chunks,0),modelCalls:0,allChaptersIndexed:chapters.length===book.chapters.length,educatorReviewed:false,automatedExerciseCoverage:"bounded subset only; chapter availability is not assessment coverage",qualityScope:"Native text extraction and source-anchor integrity. No diagram, equation-layout or expert relevance certification.",trainingPermission:"excluded"};
  await writeFile(path.join(indexes,"manifest.json"),JSON.stringify(report,null,2)+"\n");
  await writeFile(path.join(evidence,"full-book-check.json"),JSON.stringify(report,null,2)+"\n");
  const attribution=`# ${book.title}\n\nDavid Lippman and Melonie Rasmussen. Second edition ${book.edition}. Copyright Lippman & Rasmussen 2020.\n\nPublisher: ${book.publisherUrl}\n\nLicense: ${book.license} (${book.licenseUrl}). Original chapter PDFs are unchanged. Diana generated extracted search indexes; these adaptations are shared under CC BY-SA 4.0 with this attribution. The separate noncommercial detailed solutions manual is excluded. The authors do not endorse Diana. Downloaded September 25, 2026. Source and index hashes are recorded in content/textbooks/${book.assetDirectory}/manifest.json. No model training or model upload was performed.\n`;
  await Promise.all([writeFile(path.join(indexes,"ATTRIBUTION.md"),attribution),writeFile(path.join(assets,"ATTRIBUTION.md"),attribution)]);
  console.log(JSON.stringify({chapters:chapters.length,pages:report.pages,chunks:report.chunks,modelCalls:0}));
}
main().catch(error=>{console.error(error instanceof Error?error.message:"Textbook preparation could not complete.");process.exitCode=1;});
