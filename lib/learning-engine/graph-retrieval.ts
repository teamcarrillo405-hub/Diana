import {alignPassageToSkills,getSkill,type CurriculumGraph,type GraphSource,type SkillAlignment} from "./curriculum-graph";
import {adaptLegacyCurriculum,coursePrerequisites} from "./course-framework";
import {queryTerms} from "./retrieval";
import type {LearningDomain} from "./course-domains";

export type GraphPassage={id:string;text:string;source:GraphSource;scope:"assignment"|"reference";chapter?:number;subject?:LearningDomain;lexicalScore?:number};
export type GraphRankedPassage=GraphPassage&{score:number;graph:{alignment:SkillAlignment;relation:"target"|"prerequisite"|"none";boost:number;targetSkillId:string|null}};
/** Only breaks lexical ties between passages containing query words. Graph membership never creates or outweighs source relevance. */
export function rerankGraphPassages(graph:CurriculumGraph,query:string,passages:GraphPassage[],options:{selectedSkillId?:string;chapter?:number}={}):GraphRankedPassage[]{
  const selected=options.selectedSkillId?getSkill(graph,options.selectedSkillId):null;
  if(options.selectedSkillId&&!selected)throw new Error("Unknown selected skill.");
  if(selected&&options.chapter!==undefined&&!selected.chapters.includes(options.chapter))throw new Error("Selected skill is outside the chosen chapter.");
  const terms=queryTerms(query);if(!terms.length)return [];
  // An unreviewed query-to-skill guess can displace the correct book chapter.
  // Use explicit skill selection, or a chapter-bound guess that cannot cross
  // the student's selected chapter, as the teaching-context tie breaker.
  const queryAlignment=options.chapter===undefined?null:alignPassageToSkills(graph,{text:query,chapter:options.chapter});
  const target=options.selectedSkillId??(queryAlignment?.status==="matched"?queryAlignment.candidates[0].skillId:null);
  const prerequisites=new Set(target?coursePrerequisites(adaptLegacyCurriculum(graph),target).map(skill=>skill.id):[]);
  const ids=new Set<string>();
  const originalOrder=new Map<string,number>();
  return passages.filter((passage,index)=>{
    if(options.chapter!==undefined&&passage.scope==="reference"&&passage.chapter!==options.chapter)return false;
    const words=new Set(passage.text.toLowerCase().match(/[\p{L}\p{N}]+/gu)??[]);
    if(!terms.some(term=>words.has(term))||ids.has(passage.id))return false;
    ids.add(passage.id);originalOrder.set(passage.id,index);return true;
  }).map(passage=>{
    const words=new Set(passage.text.toLowerCase().match(/[\p{L}\p{N}]+/gu)??[]);
    const lexical=passage.lexicalScore??terms.filter(term=>words.has(term)).length;
    if(!Number.isFinite(lexical)||lexical<0)throw new Error("Invalid lexical relevance score.");
    const alignment=alignPassageToSkills(graph,{text:passage.text,chapter:passage.chapter,subject:passage.subject,source:passage.source});
    const aligned=alignment.status==="matched"?alignment.candidates[0].skillId:null;
    const relation=target&&aligned===target?"target":aligned&&prerequisites.has(aligned)?"prerequisite":"none";
    const boost=relation==="target"?0.75:relation==="prerequisite"?0.25:0;
    return {...passage,score:lexical,graph:{alignment,relation,boost,targetSkillId:target}} satisfies GraphRankedPassage;
  }).sort((a,b)=>Number(b.scope==="assignment")-Number(a.scope==="assignment")||b.score-a.score||b.graph.boost-a.graph.boost||(originalOrder.get(a.id)??0)-(originalOrder.get(b.id)??0));
}
