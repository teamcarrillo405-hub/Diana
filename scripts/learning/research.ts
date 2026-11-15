import {readFile,writeFile,mkdir} from "node:fs/promises";
import {createHash,randomBytes} from "node:crypto";
import path from "node:path";
import {highSchoolLearningCorpus} from "../../lib/learning-engine/evaluation-corpus";
import {buildReviewPackets,adjudicatePackets,type ReviewPacket} from "../../lib/learning-engine/research-review";
import {mediaCaseSchema,scoreMedia,type MediaObservation} from "../../lib/learning-engine/media-evaluation";
import {allocateStudy,summarizeStudy,studyProtocolSchema,studyParticipantSchema,type StudyAllocation} from "../../lib/learning-engine/study-protocol";
async function jsonl(filename:string):Promise<unknown[]>{return (await readFile(filename,"utf8")).split(/\r?\n/).filter(Boolean).map(line=>JSON.parse(line));}
async function save(filename:string,value:unknown){await writeFile(filename,JSON.stringify(value,null,2)+"\n");}
async function main(){
  const command=process.argv[2],directory=path.resolve(process.argv[3]??"artifacts/learning-engine/research");
  if(command==="study-allocate"||command==="study-report"){
    const protocol=studyProtocolSchema.parse(JSON.parse(await readFile(path.join(directory,"protocol.json"),"utf8")));
    const participants=(await jsonl(path.join(directory,"participants.jsonl"))).map(value=>studyParticipantSchema.parse(value));
    if(command==="study-allocate"){
      const secret=process.env.DIANA_STUDY_ALLOCATION_SEED;
      if(!secret)throw new Error("Set the committed study allocation seed locally.");
      const result=await allocateStudy(protocol,participants,secret);
      await writeFile(path.join(directory,"allocation.json"),JSON.stringify(result,null,2)+"\n",{flag:"wx"});
      console.log("Frozen study allocation saved. No participant was contacted or enrolled by this command.");return;
    }
    const stored=JSON.parse(await readFile(path.join(directory,"allocation.json"),"utf8")) as {allocation:StudyAllocation[]};
    const result=await summarizeStudy(protocol,stored.allocation,participants,await jsonl(path.join(directory,"outcomes.jsonl")));
    await save(path.join(directory,"study-report.json"),result);console.log(result.status);if(result.status!=="ready_for_statistical_review")process.exitCode=1;return;
  }
  if(command==="packet"){
    const outputs=(await jsonl(path.join(directory,"outputs.jsonl"))) as Parameters<typeof buildReviewPackets>[1];
    const result=await buildReviewPackets(highSchoolLearningCorpus(),outputs,randomBytes(32).toString("hex"));
    // Never replace an already distributed packet or its mapping.
    await mkdir(directory,{recursive:true});
    await writeFile(path.join(directory,"reviewer-packets.json"),JSON.stringify(result.packets,null,2)+"\n",{flag:"wx"});
    await writeFile(path.join(directory,"operator-mapping.json"),JSON.stringify(result.operatorMapping,null,2)+"\n",{flag:"wx"});
    console.log("Prepared "+result.packets.length+" blinded outputs. Educator reviews are pending.");return;
  }
  if(command==="adjudicate"){
    const packets=JSON.parse(await readFile(path.join(directory,"reviewer-packets.json"),"utf8")) as ReviewPacket[];
    const reviews=await jsonl(path.join(directory,"reviews.jsonl"));
    const result=adjudicatePackets(packets,reviews);
    await save(path.join(directory,"adjudication.json"),result);
    console.log(result.status);if(result.status!=="review_complete")process.exitCode=1;return;
  }
  if(command==="media"){
    const cases=(await jsonl(path.join(directory,"media-cases.jsonl"))).map(value=>mediaCaseSchema.parse(value));
    const families=new Map<string,string>();
    for(const item of cases){
      const filename=path.resolve(directory,item.assetPath);
      if(!filename.startsWith(directory+path.sep))throw new Error("Media asset must be inside the evaluation directory.");
      const bytes=await readFile(filename);
      if(bytes.length>30_000_000||createHash("sha256").update(bytes).digest("hex")!==item.assetHash)throw new Error("Media byte evidence mismatch: "+item.id);
      if(families.has(item.documentFamily)&&families.get(item.documentFamily)!==item.split)throw new Error("Media document family crosses splits.");
      families.set(item.documentFamily,item.split);
    }
    const observations=await jsonl(path.join(directory,"media-observations.jsonl")) as MediaObservation[];
    const result=scoreMedia(cases,observations);await save(path.join(directory,"media-report.json"),result);console.log(result.status);if(result.status!=="engineering_complete")process.exitCode=1;return;
  }
  throw new Error("Use packet, adjudicate, media, study-allocate or study-report with an evaluation directory.");
}
main().catch(error=>{console.error(error instanceof Error?error.message:"Research operation could not complete.");process.exitCode=1;});
