import {z} from "zod";
import {regionSchema} from "./source-layout";
const digest=z.string().regex(/^[a-f0-9]{64}$/);
export const mediaCaseSchema=z.object({id:z.string().min(1).max(100),documentFamily:z.string().min(1),split:z.enum(["train","development","test"]),
  assetPath:z.string().min(1).max(500),assetHash:digest,mime:z.enum(["image/png","image/jpeg","application/pdf","audio/wav"]),
  provenance:z.enum(["authored_synthetic","licensed","consented"]),rightsReceipt:z.string().min(1),
  humanReview:z.enum(["pending","approved"]),reviewerIds:z.array(z.string().min(1)).max(3),
  expectedText:z.string().max(12000),regions:z.array(regionSchema).max(100),
}).strict();
export type MediaCase=z.infer<typeof mediaCaseSchema>;
const boxSchema=z.object({x:z.number().finite().min(0).max(1),y:z.number().finite().min(0).max(1),width:z.number().finite().positive().max(1),height:z.number().finite().positive().max(1)})
  .strict().refine(box=>box.x+box.width<=1.000001&&box.y+box.height<=1.000001,"Region exceeds page");
export const mediaObservationSchema=z.object({caseId:z.string().min(1),assetHash:digest,engineVersion:z.string().min(1),observedText:z.string().max(12000),
  confidence:z.number().finite().min(0).max(1).nullable(),regions:z.array(boxSchema).max(4000)}).strict();
export type MediaObservation=z.infer<typeof mediaObservationSchema>;
export function regionOverlap(a:z.infer<typeof boxSchema>,b:z.infer<typeof boxSchema>){
  const intersection=Math.max(0,Math.min(a.x+a.width,b.x+b.width)-Math.max(a.x,b.x))*Math.max(0,Math.min(a.y+a.height,b.y+b.height)-Math.max(a.y,b.y));
  return intersection/(a.width*a.height+b.width*b.height-intersection);
}
function regionMatches(expected:Array<z.infer<typeof boxSchema>>,observed:Array<z.infer<typeof boxSchema>>){
  const assigned=new Map<number,number>();
  const visit=(target:number,seen:Set<number>):boolean=>{
    for(let i=0;i<observed.length;i++)if(!seen.has(i)&&regionOverlap(expected[target],observed[i])>=0.5){
      seen.add(i);
      if(!assigned.has(i)||visit(assigned.get(i)!,seen)){assigned.set(i,target);return true;}
    }
    return false;
  };
  expected.forEach((_,index)=>visit(index,new Set()));
  return assigned.size;
}
/** Bounded edit distance; source text is never normalized to conceal extraction errors. */
function editDistance(a:string,b:string){
  if(a.length>12000||b.length>12000||a.length*b.length>4_000_000)throw new Error("Extraction comparison exceeds the local evaluation bound.");
  let previous=Array.from({length:b.length+1},(_,index)=>index);
  for(let i=1;i<=a.length;i++){
    const current=[i];
    for(let j=1;j<=b.length;j++)current[j]=Math.min(current[j-1]+1,previous[j]+1,previous[j-1]+(a[i-1]===b[j-1]?0:1));
    previous=current;
  }
  return previous[b.length];
}
export function scoreMedia(cases:MediaCase[],observations:MediaObservation[]){
  const errors:string[]=[];const seen=new Set<string>();
  cases=cases.map(item=>mediaCaseSchema.parse(item));
  if(new Set(cases.map(item=>item.id)).size!==cases.length)errors.push("Duplicate media case");
  const rows=observations.map(raw=>{
    const parsed=mediaObservationSchema.safeParse(raw);
    if(!parsed.success){errors.push("Invalid media observation");return null;}
    const observation=parsed.data;
    const item=cases.find(value=>value.id===observation.caseId);
    if(!item||item.assetHash!==observation.assetHash||seen.has(observation.caseId)||!observation.engineVersion||
      (observation.confidence!==null&&(!Number.isFinite(observation.confidence)||observation.confidence<0||observation.confidence>1))){errors.push("Invalid media evidence: "+observation.caseId);return null;}
    seen.add(observation.caseId);
    const distance=editDistance(item.expectedText,observation.observedText);
    const reviewed=item.humanReview==="approved"&&new Set(item.reviewerIds).size>=2;
    const matches=regionMatches(item.regions.map(region=>region.box),observation.regions);
    return {caseId:item.id,reviewed,characterErrorRate:distance/Math.max(1,item.expectedText.length),exactText:distance===0,
      whitespaceNormalizedExact:item.expectedText.replace(/\s+/g," ").trim()===observation.observedText.replace(/\s+/g," ").trim(),
      confidence:observation.confidence,regionsExpected:item.regions.length,regionsObserved:observation.regions.length,
      regionPrecision:item.regions.length&&observation.regions.length?matches/observation.regions.length:null,
      regionRecall:item.regions.length?matches/item.regions.length:null};
  }).filter((row):row is NonNullable<typeof row>=>row!==null);
  const calibrated=rows.filter(row=>row.reviewed&&row.confidence!==null);
  const calibrationBins=Array.from({length:5},(_,index)=>{
    const bucket=calibrated.filter(row=>Math.min(4,Math.floor(row.confidence!*5))===index);
    return {lower:index/5,upper:(index+1)/5,count:bucket.length,meanConfidence:bucket.length?bucket.reduce((sum,row)=>sum+row.confidence!,0)/bucket.length:null,
      exactRate:bucket.length?bucket.filter(row=>row.exactText).length/bucket.length:null};
  });
  return {status:errors.length?"invalid":!cases.length||rows.length!==cases.length?"incomplete":"engineering_complete",errors,rows,calibrationBins,
    calibrationEstablished:false,qualification:"Counts and error rates do not establish handwriting, diagram reasoning or model calibration."};
}
