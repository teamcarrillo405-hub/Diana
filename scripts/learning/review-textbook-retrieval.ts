import { randomBytes } from "node:crypto";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { PRECALCULUS_BOOK, PUBLIC_TEXTBOOK_SCOPE, textbookAssetPath } from "../../lib/learning-engine/textbook-catalog";
import { rankTextbookPassages } from "../../lib/learning-engine/textbook-search";
import { rankGraphTextbookPassages } from "../../lib/learning-engine/textbook-graph";
import { loadReferenceTextbookChapters } from "../../lib/learning-engine/textbook-server";
import { textbookRetrievalProbes } from "../../lib/learning-engine/textbook-retrieval-probes";
import { buildBlindedRetrievalReview, evaluateRetrievalReviews } from "../../lib/learning-engine/retrieval-review";

async function readJson(filename:string){
  if((await stat(filename)).size>20_000_000)throw new Error("Retrieval review input exceeds 20 MB.");
  return JSON.parse(await readFile(filename,"utf8"));
}
async function writeOnce(filename:string,value:unknown){await writeFile(filename,JSON.stringify(value,null,2)+"\n",{flag:"wx"});}
async function reviewQueries(directory:string){
  const filename=path.join(directory,"review-queries.json");
  let raw:unknown;
  try{raw=await readJson(filename);}catch(error){if((error as NodeJS.ErrnoException).code==="ENOENT")return {
    origin:"visible_engineering_probe" as const,probes:textbookRetrievalProbes.map(({id,query})=>({id,query}))};throw error;}
  const probes=z.array(z.object({id:z.string().min(1).max(160),query:z.string().trim().min(1).max(1000)}).strict()).min(1).max(100).parse(raw);
  if(new Set(probes.map(value=>value.id)).size!==probes.length)throw new Error("Review queries must have distinct IDs.");
  return {origin:"operator_supplied" as const,probes};
}

async function main(){
  const command=process.argv[2],directory=path.resolve(process.argv[3]??"artifacts/learning-engine/research/retrieval-review");
  if(command==="packets"){
    let fetchAttempts=0;const originalFetch=globalThis.fetch;
    globalThis.fetch=async()=>{fetchAttempts++;throw new Error("Network request forbidden during retrieval packet creation.");};
    try{
      const indexes=await loadReferenceTextbookChapters();
      if(indexes.length!==9||indexes.some(index=>index.version.ownerId!==PUBLIC_TEXTBOOK_SCOPE.ownerId||
        index.version.assignmentId!==PUBLIC_TEXTBOOK_SCOPE.assignmentId||index.version.classId!==null||
        index.version.instructionRights!=="licensed"||index.version.trainingPermission!=="excluded"||
        !index.version.sourceAssetHash))throw new Error("Only all nine licensed public chapters may enter this review pool.");
      const chapters=indexes.map(index=>({number:index.chapter,versionId:index.version.id,chunks:index.chunks}));
      const sources=indexes.map(index=>({chapter:index.chapter,versionId:index.version.id,contentHash:index.version.contentHash,
        assetHash:index.version.sourceAssetHash!}));
      const selectedQueries=await reviewQueries(directory);
      const secret=randomBytes(32).toString("hex"),packets=[],mappings=[];
      for(const probe of selectedQueries.probes){
        const lexical=rankTextbookPassages(probe.query,chapters),graph=await rankGraphTextbookPassages(probe.query,chapters);
        const pooled=[...new Map([...lexical,...graph].map(match=>[match.anchor.versionId+":"+match.anchor.blockId,match])).values()];
        const candidates=pooled.map(match=>{
          const source=sources.find(item=>item.chapter===match.chapter)!;
          if(match.chunk.versionId!==source.versionId||match.anchor.versionId!==source.versionId||
            match.anchor.contentHash!==source.contentHash||!match.chunk.text.includes(match.anchor.exactText)||
            match.anchor.location.endOffset-match.anchor.location.startOffset!==match.anchor.exactText.length){
            throw new Error("A review candidate is inconsistent with its pinned index.");
          }
          return {id:match.anchor.versionId+":"+match.anchor.blockId,chapter:match.chapter,page:match.anchor.location.page,
            versionId:match.anchor.versionId,contentHash:match.anchor.contentHash,assetHash:source.assetHash,
            startOffset:match.anchor.location.startOffset,endOffset:match.anchor.location.endOffset,
            quote:match.anchor.exactText,readerUrl:textbookAssetPath(match.chapter)+"#page="+match.anchor.location.page};
        });
        const built=await buildBlindedRetrievalReview({bookId:PRECALCULUS_BOOK.id,edition:PRECALCULUS_BOOK.edition,
          license:PRECALCULUS_BOOK.license,queryId:probe.id,query:probe.query,queryOrigin:selectedQueries.origin,sources,candidates,
          conditions:{lexical:lexical.map(match=>match.anchor.versionId+":"+match.anchor.blockId),
            curriculumGraph:graph.map(match=>match.anchor.versionId+":"+match.anchor.blockId)},blindSecret:secret});
        packets.push(built.packet);mappings.push(built.mapping);
      }
      if(fetchAttempts)throw new Error("A retrieval review packet attempted a network request.");
      await mkdir(directory,{recursive:true});
      const output=path.join(directory,"packets");await mkdir(output);
      await writeOnce(path.join(output,"reviewer-packets.json"),packets);
      await writeOnce(path.join(output,"operator-mappings.json"),mappings);
      await writeOnce(path.join(output,"assessment-template.json"),packets.map(packet=>({id:"",packetId:packet.id,
        packetHash:packet.contentHash,reviewerId:"",qualificationReference:"",role:"rater",reviewedAt:"",
        conflictOfInterest:false,resolves:[],originalPagesChecked:false,questionStatus:"not_answerable_from_candidates",
        rationale:"",ratings:packet.candidates.map(candidate=>({candidateId:candidate.id,relevance:0,supportsAnswer:false}))})));
      console.log(`Prepared ${packets.length} blinded public-textbook retrieval packets from ${selectedQueries.origin}. No educator judgments were added.`);
      return;
    }finally{globalThis.fetch=originalFetch;}
  }
  if(command==="report"){
    const result=await evaluateRetrievalReviews(await readJson(path.join(directory,"packets/reviewer-packets.json")),
      await readJson(path.join(directory,"packets/operator-mappings.json")),
      await readJson(path.join(directory,"assessments.json")),await readJson(path.join(directory,"reviewers.json")));
    await writeOnce(path.join(directory,`retrieval-review-report-${Date.now()}.json`),result);
    console.log(result.status);if(result.status!=="review_complete")process.exitCode=1;return;
  }
  throw new Error("Use packets or report with the private retrieval review directory.");
}

main().catch(error=>{console.error(error instanceof Error?error.message:"Retrieval review could not complete.");process.exitCode=1;});
