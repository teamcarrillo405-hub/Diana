import {z} from "zod";
import authoredCatalog from "@/content/curriculum/diana-v1.json";
import {LOCAL_SKILL_COVERAGE} from "./problem-specification";

export const CURRICULUM_GRAPH_VERSION="diana-curriculum-v1.0.0";
const digest=z.string().regex(/^[a-f0-9]{64}$/);
const skillId=z.string().regex(/^(?:math|reading)\.[a-z][a-z0-9_]*$/);
const text=z.string().trim().min(3).max(1200);
const checkerSkills:Record<string,string[]>={geometry_measure:["math.geometry_reasoning"]};
const additionalVerifierBounds:Record<string,string>={"math.geometry_reasoning":"Supports numeric triangle-angle checks from stated givens; similarity, congruence and general proofs require reviewed reasoning."};
for(const coverage of LOCAL_SKILL_COVERAGE)for(const checker of coverage.kinds)(checkerSkills[checker]??=[]).push(coverage.skillId);
const reviewReceiptSchema=z.object({
  id:z.string().min(1).max(160),reviewerId:z.string().min(1).max(160),qualificationEvidenceId:z.string().min(1).max(160),
  skillDigest:digest,reviewedAt:z.string().datetime(),
}).strict();
export type CurriculumReviewReceipt=z.infer<typeof reviewReceiptSchema>;
const reviewSchema=z.discriminatedUnion("status",[
  z.object({status:z.literal("pending")}).strict(),
  z.object({status:z.literal("approved"),receipts:z.array(reviewReceiptSchema).min(2).max(10)}).strict(),
]);
const verificationSchema=z.discriminatedUnion("mode",[
  z.object({mode:z.literal("bounded_exact_result"),checker:z.enum(["equation_value","equivalent_expression","solution_set","rational_expression","linear_system","geometry_measure","function_value","polynomial_domain","integer_power","integer_log","special_angle","sinusoid_measure","named_identity","vector_dot","conic_measure"]),limits:text}).strict(),
  z.object({mode:z.literal("source_correspondence_only"),checker:z.literal("exact_quote"),limits:text}).strict(),
  z.object({mode:z.literal("review_required"),limits:text}).strict(),
]);
export const curriculumSkillSchema=z.object({
  id:skillId,revision:z.number().int().positive(),contentDigest:digest,
  previousVersion:z.object({revision:z.number().int().positive(),contentDigest:digest}).strict().nullable(),
  title:z.string().min(3).max(100),subject:z.enum(["math","reading"]),chapters:z.array(z.number().int().min(1).max(9)).max(9),
  aliases:z.array(z.string().trim().min(2).max(80)).min(2).max(15),objective:text,
  prerequisites:z.array(skillId).max(12),
  misconceptions:z.array(z.object({id:z.string().regex(/^[a-z][a-z0-9_.-]*$/),signal:text,checkQuestion:text,response:text,remediationSkillId:skillId}).strict()).min(1).max(8),
  scaffold:z.object({orient:text,studentAction:text,hints:z.array(text).min(2).max(6),independentCheck:text}).strict(),
  example:z.object({authorship:z.literal("original_ai_engineering_example"),prompt:text,steps:z.array(text).min(2).max(8),answer:text}).strict(),
  verification:verificationSchema,authorship:z.literal("ai_engineering_authored"),review:reviewSchema,
}).strict();
const graphBaseSchema=z.object({
  version:z.string().regex(/^diana-curriculum-v\d+\.\d+\.\d+$/),contentDigest:digest,createdAt:z.string().datetime(),
  authorship:z.literal("ai_engineering_authored"),learningGains:z.literal("not_established"),
  skills:z.array(curriculumSkillSchema).min(1).max(500),
}).strict();
export const curriculumGraphSchema=graphBaseSchema.superRefine((graph,context)=>{
  const ids=new Set<string>(),misconceptions=new Set<string>();
  const issue=(message:string)=>context.addIssue({code:z.ZodIssueCode.custom,message});
  for(const skill of graph.skills){
    if(ids.has(skill.id))issue("Duplicate skill ID: "+skill.id);ids.add(skill.id);
    if(!skill.id.startsWith(skill.subject+"."))issue("Skill subject mismatch: "+skill.id);
    if(skill.subject==="math"&&!skill.chapters.length||skill.subject==="reading"&&skill.chapters.length)issue("Chapter scope mismatch: "+skill.id);
    if(new Set(skill.chapters).size!==skill.chapters.length||new Set(skill.prerequisites).size!==skill.prerequisites.length)issue("Duplicate graph link: "+skill.id);
    if(new Set(skill.aliases.map(normalize)).size!==skill.aliases.length)issue("Duplicate alias: "+skill.id);
    if(skill.previousVersion&&skill.previousVersion.revision>=skill.revision)issue("Previous skill revision must be older: "+skill.id);
    if(skill.revision>1&&!skill.previousVersion)issue("An updated skill needs its prior immutable version: "+skill.id);
    if(skill.verification.mode==="bounded_exact_result"&&!checkerSkills[skill.verification.checker]?.includes(skill.id))issue("Unsupported deterministic verification claim: "+skill.id);
    const coverage=LOCAL_SKILL_COVERAGE.find(item=>item.skillId===skill.id);
    const verifierBounds=coverage?.bounds??additionalVerifierBounds[skill.id];
    if(skill.verification.mode==="bounded_exact_result"&&skill.verification.limits!==verifierBounds)issue("Verifier limits must match the bounded capability registry: "+skill.id);
    if(skill.verification.mode==="source_correspondence_only"&&skill.subject!=="reading")issue("Quote correspondence is not a math verifier: "+skill.id);
    for(const item of skill.misconceptions){if(misconceptions.has(item.id))issue("Duplicate misconception ID: "+item.id);misconceptions.add(item.id);}
    if(skill.review.status==="approved"){
      if(new Set(skill.review.receipts.map(receipt=>receipt.reviewerId)).size<2)issue("Independent reviewers are required: "+skill.id);
      if(new Set(skill.review.receipts.map(receipt=>receipt.id)).size!==skill.review.receipts.length)issue("Duplicate review receipt: "+skill.id);
      if(skill.review.receipts.some(receipt=>receipt.skillDigest!==skill.contentDigest))issue("Review does not match this skill version: "+skill.id);
    }
  }
  for(const skill of graph.skills){
    for(const target of [...skill.prerequisites,...skill.misconceptions.map(item=>item.remediationSkillId)])if(!ids.has(target))issue("Broken skill link: "+skill.id+" -> "+target);
  }
  const byId=new Map(graph.skills.map(skill=>[skill.id,skill])),visiting=new Set<string>(),done=new Set<string>();
  const visit=(id:string)=>{
    if(visiting.has(id)){issue("Prerequisite cycle: "+id);return;}if(done.has(id))return;
    visiting.add(id);for(const target of byId.get(id)?.prerequisites??[])visit(target);visiting.delete(id);done.add(id);
  };
  for(const id of ids)visit(id);
});
export type CurriculumSkill=z.infer<typeof curriculumSkillSchema>;
export type CurriculumGraph=z.infer<typeof curriculumGraphSchema>;

function normalize(value:string){return value.normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}]+/gu," ").trim();}
function canonical(value:unknown):string{
  if(Array.isArray(value))return "["+value.map(canonical).join(",")+"]";
  if(value&&typeof value==="object")return "{"+Object.keys(value).sort().map(key=>JSON.stringify(key)+":"+canonical((value as Record<string,unknown>)[key])).join(",")+"}";
  return JSON.stringify(value);
}
async function hash(value:unknown){const bytes=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(canonical(value)));return Array.from(new Uint8Array(bytes),byte=>byte.toString(16).padStart(2,"0")).join("");}
export function skillContentDigest(skill:CurriculumSkill){
  const content={...skill} as Partial<CurriculumSkill>;delete content.contentDigest;delete content.review;
  return hash(content);
}
export function graphContentDigest(graph:CurriculumGraph){const content={...graph} as Partial<CurriculumGraph>;delete content.contentDigest;return hash(content);}
export function parseCurriculumGraph(raw:unknown):CurriculumGraph{return curriculumGraphSchema.parse(raw);}
function freeze<T>(value:T):T{if(value&&typeof value==="object"){for(const child of Object.values(value))freeze(child);Object.freeze(value);}return value;}
/** Receipt records must come from a trusted reviewer store, never from the untrusted graph itself. */
export async function validateCurriculumGraph(raw:unknown,options:{trustedReviewReceipts?:readonly CurriculumReviewReceipt[]}={}):Promise<CurriculumGraph>{
  const graph=parseCurriculumGraph(raw),trusted=new Map<string,string>();
  for(const rawReceipt of options.trustedReviewReceipts??[]){
    const receipt=reviewReceiptSchema.parse(rawReceipt),record=canonical(receipt);
    if(trusted.has(receipt.id)&&trusted.get(receipt.id)!==record)throw new Error("Conflicting trusted educator review receipt.");
    trusted.set(receipt.id,record);
  }
  for(const skill of graph.skills){
    if(await skillContentDigest(skill)!==skill.contentDigest)throw new Error("Skill content digest mismatch: "+skill.id);
    if(skill.review.status==="approved"&&skill.review.receipts.some(receipt=>trusted.get(receipt.id)!==canonical(receipt)))throw new Error("Untrusted educator review receipt: "+skill.id);
  }
  if(await graphContentDigest(graph)!==graph.contentDigest)throw new Error("Curriculum content digest mismatch.");
  return freeze(graph);
}
let catalog:Promise<CurriculumGraph>|undefined;
export function loadCurriculumGraph(){
  catalog??=validateCurriculumGraph(authoredCatalog).then(graph=>{if(graph.version!==CURRICULUM_GRAPH_VERSION)throw new Error("Curriculum version mismatch.");return graph;});
  return catalog;
}
export function getSkill(graph:CurriculumGraph,id:string){return graph.skills.find(skill=>skill.id===id)??null;}
export function listChapterSkills(graph:CurriculumGraph,chapter:number){
  if(!Number.isInteger(chapter)||chapter<1||chapter>9)throw new Error("Choose a chapter from 1 to 9.");
  return graph.skills.filter(skill=>skill.chapters.includes(chapter));
}
/** 'Satisfied' is caller evidence, not a mastery inference made by this graph. */
export function selectPrerequisites(graph:CurriculumGraph,id:string,options:{satisfiedSkillIds?:readonly string[];transitive?:boolean}={}){
  const skill=getSkill(graph,id);if(!skill)throw new Error("Unknown skill: "+id);
  const satisfied=new Set(options.satisfiedSkillIds??[]),selected=new Set<string>(),ordered:CurriculumSkill[]=[];
  for(const target of satisfied)if(!getSkill(graph,target))throw new Error("Unknown prerequisite evidence: "+target);
  const visit=(target:string)=>{if(selected.has(target)||satisfied.has(target))return;selected.add(target);const node=getSkill(graph,target)!;
    if(options.transitive!==false)node.prerequisites.forEach(visit);ordered.push(node);};
  skill.prerequisites.forEach(visit);return ordered;
}
export type GraphSource={versionId:string;contentHash:string;page:number;blockId:string};
export type SkillAlignment={status:"matched"|"ambiguous"|"no_match";candidates:Array<{skillId:string;revision:number;contentDigest:string;score:number;matchedAliases:string[]}>;
  provenance:{method:"lexical_skill_alignment_v1";graphVersion:string;graphDigest:string;source:GraphSource|null;authorship:"ai_engineering_authored";meaningVerified:false}};
export function alignPassageToSkills(graph:CurriculumGraph,input:{text:string;chapter?:number;subject?:import("./course-domains").LearningDomain;source?:GraphSource}):SkillAlignment{
  if(input.source)z.object({versionId:digest,contentHash:digest,page:z.number().int().positive(),blockId:digest}).strict().parse(input.source);
  const value=" "+normalize(input.text.slice(0,16000))+" ";
  const candidates=graph.skills.filter(skill=>(!input.subject||input.subject===skill.subject)&&(input.chapter===undefined||skill.chapters.includes(input.chapter)))
    .map(skill=>{const matchedAliases=skill.aliases.filter(alias=>value.includes(" "+normalize(alias)+" "));
      return {skillId:skill.id,revision:skill.revision,contentDigest:skill.contentDigest,score:matchedAliases.reduce((total,alias)=>total+1+normalize(alias).split(" ").length,0),matchedAliases};})
    .filter(item=>item.score>0).sort((a,b)=>b.score-a.score||a.skillId.localeCompare(b.skillId)).slice(0,4);
  const ambiguous=candidates.length>1&&candidates[1].score>=candidates[0].score*0.75;
  return {status:!candidates.length?"no_match":ambiguous?"ambiguous":"matched",candidates,provenance:{method:"lexical_skill_alignment_v1",graphVersion:graph.version,graphDigest:graph.contentDigest,source:input.source??null,authorship:"ai_engineering_authored",meaningVerified:false}};
}
