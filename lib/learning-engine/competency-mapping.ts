import { blockSchema, documentVersionSchema, type EvidenceAnchor, type SourcePage } from "./contracts";
import { validateDocumentAnchor } from "./curriculum";
import { frameworkSchema, courseContentHash } from "./course-framework";

const ignored=new Set("about after again also between before being both could declared different explicitly find first from have into only other result same should sides stated such that their them then there these they this through using what when where which with would your".split(" "));
function terms(text:string){return new Set((text.normalize("NFKC").toLowerCase().match(/[a-z][a-z0-9]{3,}/gu)??[]).filter(term=>!ignored.has(term)));}
export type CompetencySuggestion={skillId:string;title:string;matchedTerms:string[];score:number;status:"proposed";anchor:EvidenceAnchor;mappingHash:string};
/** Lexical candidates only. A suggestion cannot authorize grading or establish standards alignment. */
export async function suggestSourceCompetencies(rawFramework:unknown,rawVersion:unknown,rawBlocks:unknown[],pages:SourcePage[]){
  const framework=frameworkSchema.parse(rawFramework),version=documentVersionSchema.parse(rawVersion);
  if(rawBlocks.length>100)throw new Error("mapping_batch_exceeds_limit");
  const blocks=rawBlocks.map(item=>blockSchema.parse(item)),suggestions:CompetencySuggestion[]=[];
  for(const block of blocks){
    if(block.versionId!==version.id||block.needsConfirmation||block.interpretation==="model_extraction"||pages.find(page=>page.page===block.location.page)?.interpretation==="model_extraction"||["diagram","table","heading"].includes(block.kind))continue;
    const anchor:EvidenceAnchor={versionId:version.id,blockId:block.id,contentHash:version.contentHash,location:block.location,exactText:block.text};
    if(!validateDocumentAnchor(anchor,{version,pages,blocks,chunks:[]}))continue;
    const sourceTerms=terms(block.text+" "+(block.section??""));
    const candidates=framework.competencies.filter(skill=>skill.subject===version.subject||(version.subject==="english"&&skill.subject==="reading"));
    for(const skill of candidates){
      const vocabulary=terms(skill.title+" "+skill.objective),matched=[...vocabulary].filter(term=>sourceTerms.has(term)).sort();
      if(matched.length<2)continue;
      const score=matched.length/Math.sqrt(vocabulary.size*Math.max(sourceTerms.size,1));
      suggestions.push({skillId:skill.id,title:skill.title,matchedTerms:matched,score,status:"proposed",anchor,mappingHash:await courseContentHash({version:"competency-suggestion-v2",anchor,skill,matched})});
    }
  }
  return {version:"competency-suggestion-v2" as const,suggestions:suggestions.sort((a,b)=>b.score-a.score||a.skillId.localeCompare(b.skillId)||a.anchor.blockId.localeCompare(b.anchor.blockId)).slice(0,12),blocksInspected:blocks.length,automaticallyApproved:false as const,providerCalled:false as const,limitation:"Keyword suggestions require educator review. They do not certify grade level, standards alignment or the meaning of a passage."};
}
