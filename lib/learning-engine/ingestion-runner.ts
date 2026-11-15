/** Bounded worker pass. The adapter authenticates one owner and reuses the same lease RPCs as the app. */
export async function drainIngestion(input:{
  authorized:()=>Promise<boolean>;
  pending:()=>Promise<string[]>;
  advance:(id:string)=>Promise<{status:string;busy:boolean}>;
  maxSteps:number;maxDurationMs:number;now?:()=>number;
}){
  if(!Number.isInteger(input.maxSteps)||input.maxSteps<1||input.maxSteps>200||!Number.isFinite(input.maxDurationMs)||input.maxDurationMs<1000||input.maxDurationMs>300_000)throw new Error("ingestion_worker_bound");
  const clock=input.now??Date.now,start=clock(),skipped=new Set<string>();
  const results:Array<{jobId:string;status:string}>=[];
  let steps=0;
  while(steps<input.maxSteps&&clock()-start<input.maxDurationMs){
    if(!await input.authorized())return {status:"authorization_unavailable",steps,results};
    const jobs=await input.pending();
    if(jobs.length>25||new Set(jobs).size!==jobs.length)throw new Error("ingestion_worker_queue_bound");
    if(clock()-start>=input.maxDurationMs)break;
    const id=jobs.find(value=>!skipped.has(value));
    if(!id)return {status:"idle",steps,results};
    // Access is checked immediately before every claim, including after queue retrieval.
    if(!await input.authorized())return {status:"authorization_unavailable",steps,results};
    if(clock()-start>=input.maxDurationMs)break;
    steps++;
    try{
      const result=await input.advance(id);
      results.push({jobId:id,status:result.busy?"busy":result.status});
      if(result.busy||!["queued","indexing"].includes(result.status))skipped.add(id);
    }catch{results.push({jobId:id,status:"paused"});skipped.add(id);}
  }
  return {status:"bounded_pass_complete",steps,results};
}
