import {readFile,writeFile,mkdir,stat} from "node:fs/promises";
import {randomBytes} from "node:crypto";
import path from "node:path";
import {z} from "zod";
import {loadCourseCatalog} from "../../lib/learning-engine/course-catalog";
import {problemStateSchema} from "../../lib/learning-engine/problem-state";
import {buildResponsePacket,evaluateResponseAssessments,responseReviewPermissionSchema} from "../../lib/learning-engine/response-assessment";

async function readJson(filename:string){if((await stat(filename)).size>20_000_000)throw new Error("Assessment input exceeds 20 MB.");return JSON.parse(await readFile(filename,"utf8"));}
async function writeOnce(filename:string,value:unknown){await writeFile(filename,JSON.stringify(value,null,2)+"\n",{flag:"wx"});}
async function main(){
  const command=process.argv[2],directory=path.resolve(process.argv[3]??"artifacts/learning-engine/response-assessment");
  if(command==="packets"){
    const input=z.array(z.object({activityId:z.string(),state:problemStateSchema,permission:responseReviewPermissionSchema}).strict()).min(1).max(5000).parse(await readJson(path.join(directory,"response-inputs.json")));
    const catalog=await loadCourseCatalog(),secret=randomBytes(32).toString("hex");
    const packets=await Promise.all(input.map(item=>{
      const activity=catalog.activities.find(value=>value.id===item.activityId);
      if(!activity)throw new Error("The activity is unavailable in this catalog.");
      return buildResponsePacket(activity,item.state,item.permission,secret);
    }));
    if(new Set(packets.map(value=>value.contentHash)).size!==packets.length)throw new Error("Duplicate response packet.");
    // Exclusive directory prevents a partially written export from replacing a distributed review.
    const output=path.join(directory,"packets");await mkdir(output);
    await writeOnce(path.join(output,"operator-packets.json"),packets);
    await writeOnce(path.join(output,"reviewer-packets.json"),packets.map(({permission:_permission,responseHash:_responseHash,...packet})=>packet));
    await writeOnce(path.join(output,"assessment-template.json"),packets.map(packet=>({id:"",packetId:packet.id,packetHash:packet.contentHash,rubricHash:packet.rubricHash,reviewerId:"",qualificationReference:"",role:"rater",reviewedAt:"",conflictOfInterest:false,resolves:[],criteria:packet.rubric.criteria.map(criterion=>({criterionId:criterion.id,score:null,rationale:"",evidence:[]}))})));
    console.log(`Prepared ${packets.length} response packets. Review, qualification and permission verification remain pending.`);return;
  }
  if(command==="report"){
    const report=await evaluateResponseAssessments(await readJson(path.join(directory,"packets/operator-packets.json")),await readJson(path.join(directory,"assessments.json")),await readJson(path.join(directory,"reviewers.json")),await readJson(path.join(directory,"permissions.json")));
    await writeOnce(path.join(directory,`assessment-report-${Date.now()}.json`),report);
    console.log(report.status);if(report.status!=="review_complete")process.exitCode=1;return;
  }
  throw new Error("Use packets or report with the private assessment directory.");
}
main().catch(error=>{console.error(error instanceof Error?error.message:"Response assessment could not complete.");process.exitCode=1;});
