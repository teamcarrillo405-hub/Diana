import {mkdir,writeFile} from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
import {loadChapterPractice} from "../../lib/learning-engine/chapter-practice";
import {runChapterSession,startChapterSession} from "../../lib/learning-engine/chapter-session";
import {loadReferenceTextbookChapters} from "../../lib/learning-engine/textbook-server";
import {rankGraphTextbookPassages} from "../../lib/learning-engine/textbook-graph";
import {rankTextbookPassages} from "../../lib/learning-engine/textbook-search";
import {loadCurriculumGraph} from "../../lib/learning-engine/curriculum-graph";

async function main(){
  const originalFetch=globalThis.fetch;let networkAttempts=0;
  globalThis.fetch=async()=>{networkAttempts++;throw new Error("Local gate disables network access.");};
  try{
    const graph=await loadCurriculumGraph(),chapters=await loadReferenceTextbookChapters();
    const answers=[["19","all real numbers"],["3"],["2,-3"],["8","3"],["1/2"],["2","2*pi/3"],["1"],["12"],["2,-3","3,4"]];
    const queries=["function domain","slope intercept","polynomial rational","exponential logarithmic","unit circle","amplitude period","trigonometric identities","vectors dot product","ellipse center"];
    const checks=[],retrieval=[];
    for(let chapter=1;chapter<=9;chapter++){
      const exercises=await loadChapterPractice(chapter,0);
      for(let index=0;index<exercises.length;index++){
        const exercise=exercises[index],state=await startChapterSession(crypto.randomUUID(),"00000000-0000-4000-8000-000000000002",exercise.id);
        const started=performance.now();
        const answer=await runChapterSession(state,{expectedRevision:1,mode:"check",response:answers[chapter-1][index],confirmed:true,modality:"typed"});
        const hint=await runChapterSession(state,{expectedRevision:1,mode:"hint",response:"",confirmed:true,modality:"typed"});
        assert.equal(answer.feedback.assessment?.outcome,"supported",exercise.prompt);
        assert.equal(hint.feedback.action,"hint");assert.equal(answer.feedback.provider.called,false);assert.equal(answer.feedback.eligibleForKnowledge,false);
        checks.push({chapter,exerciseId:exercise.id,versionId:exercise.versionId,outcome:answer.feedback.assessment?.outcome,hintAvailable:!!hint.feedback.guidance,elapsedMs:Math.round((performance.now()-started)*100)/100});
      }
      const source=chapters.find(item=>item.chapter===chapter)!;
      const scope=[{number:chapter,versionId:source.version.id,chunks:source.chunks}],query=queries[chapter-1];
      const baseline=rankTextbookPassages(query,scope),started=performance.now(),ranked=await rankGraphTextbookPassages(query,scope,{chapter});
      assert.ok(ranked.length>0,"No source for chapter "+chapter);
      assert.ok(ranked.every(item=>item.anchor.contentHash===source.version.contentHash&&item.chapter===chapter));
      retrieval.push({chapter,query,results:ranked.length,baselineTop:baseline[0]?.anchor.blockId,graphTop:ranked[0]?.anchor.blockId,graphRelations:ranked.map(item=>item.graph.relation),elapsedMs:Math.round((performance.now()-started)*100)/100});
    }
    assert.equal(networkAttempts,0);
    const report={version:"diana-local-engine-gate-v1",createdAt:new Date().toISOString(),status:"passed",graphVersion:graph.version,graphDigest:graph.contentDigest,skills:graph.skills.length,
      chapterCount:chapters.length,networkAttempts,checks,retrieval,qualification:"engineering_integration_only",humanReviewed:false,learningGainsEstablished:false,modelComparisonPerformed:false};
    const directory=path.resolve("artifacts/learning-engine/research/local-gate");await mkdir(directory,{recursive:true});
    const file=path.join(directory,`gate-${Date.now()}.json`);await writeFile(file,JSON.stringify(report,null,2)+"\n");
    console.log(JSON.stringify({status:report.status,chapters:chapters.length,checks:checks.length,skills:graph.skills.length,networkAttempts,artifact:file}));
  }finally{globalThis.fetch=originalFetch;}
}
main().catch(error=>{console.error(error instanceof Error?error.message:String(error));process.exitCode=1;});
