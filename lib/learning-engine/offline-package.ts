import { z } from "zod";
import { chunkSchema } from "./contracts";
import { sha256 } from "./curriculum";
import { checkEquationValue,checkEquivalentExpressions } from "./algebra";
import { retrieveCurriculum } from "./retrieval";

export const offlineExerciseSchema=z.object({
  label:z.string().min(1).max(120).optional(),
  id:z.string().min(1).max(200),prompt:z.string().min(1).max(1000),skillId:z.string().min(1).max(100),
  check:z.discriminatedUnion("kind",[
    z.object({kind:z.literal("equation_value"),reference:z.string().max(2000)}).strict(),
    z.object({kind:z.literal("equivalent_expression"),reference:z.string().max(1000)}).strict(),
    z.object({kind:z.literal("reading"),rubric:z.array(z.string().max(500)).max(10)}).strict(),
  ]),
}).strict();
export const offlinePackageSchema=z.object({
  version:z.literal("offline-learning-v1"),id:z.string().uuid(),ownerId:z.string().uuid(),
  deviceId:z.string().uuid(),assignmentId:z.string().uuid(),classId:z.string().uuid().nullable(),
  title:z.string().min(1).max(300),createdAt:z.string().datetime(),expiresAt:z.string().datetime(),
  chunks:z.array(chunkSchema).min(1).max(60),exercises:z.array(offlineExerciseSchema).max(30),
  hash:z.string().regex(/^[a-f0-9]{64}$/),
}).strict();
export type OfflinePackage=z.infer<typeof offlinePackageSchema>;
export async function packageHash(bundle:Omit<OfflinePackage,"hash">):Promise<string>{
  return sha256(JSON.stringify(bundle));
}
export async function validateOfflinePackage(value:unknown,ownerId:string,deviceId:string,now=Date.now()):Promise<OfflinePackage|null>{
  const parsed=offlinePackageSchema.safeParse(value);
  if(!parsed.success) return null;
  const bundle=parsed.data;
  if(bundle.ownerId!==ownerId || bundle.deviceId!==deviceId || Date.parse(bundle.expiresAt)<=now
    || Date.parse(bundle.createdAt)>now+60000 || Date.parse(bundle.expiresAt)-Date.parse(bundle.createdAt)>14*86400000
    || bundle.chunks.some(chunk=>chunk.ownerId!==ownerId || chunk.assignmentId!==bundle.assignmentId)
    || new TextEncoder().encode(JSON.stringify(bundle)).length>2_000_000) return null;
  const {hash,...content}=bundle;
  return hash===await packageHash(content)?bundle:null;
}
export function offlineSearch(bundle:OfflinePackage,query:string){
  return retrieveCurriculum(query,bundle.chunks,{
    ownerId:bundle.ownerId,assignmentId:bundle.assignmentId,classId:bundle.classId,
    versionIds:[...new Set(bundle.chunks.map(chunk=>chunk.versionId))],
    problemNumber:/\bproblem\s+(\d+[a-z]?)/i.exec(query)?.[1]??null,
  });
}
export function checkOfflineExercise(exercise:z.infer<typeof offlineExerciseSchema>,response:string){
  if(exercise.check.kind==="reading") return {status:"inconclusive" as const,outcome:"unknown" as const,
    observations:exercise.check.rubric,limitations:["Save your reading response and reconnect for feedback."],eligibleForKnowledge:false};
  const result=exercise.check.kind==="equation_value"?checkEquationValue(exercise.check.reference,response):checkEquivalentExpressions(exercise.check.reference,response);
  return {...result,eligibleForKnowledge:false,limitations:[...result.limitations,"Offline practice is not an independently observed mastery assessment."]};
}
