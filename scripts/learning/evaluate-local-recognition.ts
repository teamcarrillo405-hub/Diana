/** Private held-out recognition evaluation. No model downloads or student uploads. */
import {createHash} from "node:crypto";
import {readFile,writeFile} from "node:fs/promises";
import path from "node:path";
import {mediaCaseSchema,scoreMedia,type MediaObservation} from "../../lib/learning-engine/media-evaluation";
import {runLocalRecognition} from "../../lib/learning-engine/local-recognition-runner";

function distance(a:string[],b:string[]){
  if(a.length*b.length>4_000_000)throw new Error("Recognition comparison exceeds the evaluation bound.");
  let last=Array.from({length:b.length+1},(_,index)=>index);
  for(let i=1;i<=a.length;i++){
    const row=[i];
    for(let j=1;j<=b.length;j++)row[j]=Math.min(row[j-1]+1,last[j]+1,last[j-1]+(a[i-1]===b[j-1]?0:1));
    last=row;
  }
  return last[b.length];
}
const words=(text:string)=>text.trim()?text.trim().split(/\s+/):[];
const symbols=(text:string)=>[...text].filter(char=>/[=+\-×÷/%<>]/.test(char));

async function main(){
  const [casesPath,manifestPath,outputPath]=process.argv.slice(2),python=process.env.DIANA_RECOGNITION_PYTHON;
  if(!casesPath||!manifestPath||!outputPath||!python||!path.isAbsolute(python))throw new Error("Supply private cases, approved model manifest and new report path with an absolute Python runtime.");
  const rows=(await readFile(casesPath,"utf8")).split(/\r?\n/).filter(Boolean).map(line=>mediaCaseSchema.parse(JSON.parse(line)));
  if(!rows.length||rows.length>500||new Set(rows.map(item=>item.id)).size!==rows.length)throw new Error("Use 1 to 500 distinct reviewed cases.");
  const directory=path.dirname(path.resolve(casesPath)),observations:MediaObservation[]=[],details:Array<{caseId:string;elapsedMs:number;wordErrorRate:number;criticalSymbolExact:boolean}>=[];
  for(const item of rows){
    if(item.split!=="test"||item.humanReview!=="approved"||new Set(item.reviewerIds).size<2||
      !["audio/wav","image/png","image/jpeg"].includes(item.mime))throw new Error("All cases need held-out split, independent review and a supported medium.");
    const assetPath=path.resolve(directory,item.assetPath);
    if(!assetPath.startsWith(directory+path.sep))throw new Error("An evaluation asset is outside its private case directory.");
    const asset=await readFile(assetPath);
    if(!asset.length||asset.length>5_000_000||createHash("sha256").update(asset).digest("hex")!==item.assetHash)throw new Error("An evaluation asset does not match its recorded bytes.");
    const draft=await runLocalRecognition({manifestPath:path.resolve(manifestPath),asset,mime:item.mime,python});
    const expectedWords=words(item.expectedText),actualWords=words(draft.text);
    details.push({caseId:item.id,elapsedMs:draft.recognition.elapsedMs,
      wordErrorRate:distance(expectedWords,actualWords)/Math.max(1,expectedWords.length),
      criticalSymbolExact:JSON.stringify(symbols(item.expectedText))===JSON.stringify(symbols(draft.text))});
    observations.push({caseId:item.id,assetHash:item.assetHash,engineVersion:draft.recognition.modelId+"@"+draft.recognition.revision,
      observedText:draft.text,confidence:null,regions:[]});
  }
  const result=scoreMedia(rows,observations);
  if(result.status!=="engineering_complete")throw new Error("Media evaluation was incomplete.");
  // Report contains error metrics and model identity, never raw student audio, images or transcripts.
  await writeFile(outputPath,JSON.stringify({version:"local-recognition-evaluation-v1",status:"measured_unreviewed_performance",
    caseCount:rows.length,engineVersion:observations[0].engineVersion,details,rows:result.rows,
    qualification:"Held-out local measurements need educational, demographic and device review before activation. Model confidence is uncalibrated."},null,2)+"\n",{flag:"wx"});
  console.log("Saved private offline recognition metrics for "+rows.length+" reviewed test cases. Release review remains open.");
}
main().catch(error=>{console.error(error instanceof Error?error.message:"Offline evaluation could not complete.");process.exitCode=1;});
