import {queryTerms} from "./retrieval";
import type {CurriculumChunk,EvidenceAnchor} from "./contracts";
import {PUBLIC_TEXTBOOK_SCOPE as scope} from "./textbook-catalog";

export type TextbookMatch={id:string;chapter:number;page:number;pageLabel:string;quote:string};
type TextbookChapter={number:number;versionId:string;chunks:CurriculumChunk[]};
const QUESTION_WORDS=new Set("a an are be by did do does explain find give in is it its me my of on or show tell to was were which who why you your".split(" "));
function textbookTerms(query:string){return queryTerms(query).filter(term=>!QUESTION_WORDS.has(term));}
/** Rank the quoted passage itself, not a neighboring block or a broad skill tag. */
export function rankTextbookPassages(query:string,chapters:TextbookChapter[],limit=6){
  if(!Number.isInteger(limit)||limit<1||limit>48)throw new Error("Choose a bounded passage count.");
  const terms=textbookTerms(query);
  if(!terms.length)return [];
  // A generic word in a question is not enough to call a textbook excerpt
  // relevant. Multi-term queries require most of their content words together
  // in the exact quoted passage. A one-term topic query remains searchable.
  const minimumOverlap=Math.max(1,Math.ceil(terms.length*0.6));
  const candidates:Array<{chapter:number;chunk:CurriculumChunk;anchor:EvidenceAnchor;words:Set<string>}>=[];
  const seen=new Set<string>();
  for(const chapter of chapters)for(const chunk of chapter.chunks){
    if(chunk.versionId!==chapter.versionId||chunk.ownerId!==scope.ownerId||chunk.assignmentId!==scope.assignmentId||chunk.classId!==scope.classId)continue;
    for(const anchor of chunk.anchors){
      const key=anchor.versionId+":"+anchor.blockId;
      if(anchor.versionId!==chunk.versionId||seen.has(key))continue;
      seen.add(key);
      const words=new Set(anchor.exactText.toLowerCase().match(/[\p{L}\p{N}]+/gu)??[]);
      if(terms.filter(term=>words.has(term)).length>=minimumOverlap)candidates.push({chapter:chapter.number,chunk,anchor,words});
    }
  }
  const frequency=new Map(terms.map(term=>[term,candidates.filter(item=>item.words.has(term)).length]));
  const ranked=candidates.map(item=>({...item,score:terms.reduce((score,term)=>score+(item.words.has(term)?1+Math.log(1+candidates.length/(frequency.get(term)||1)):0),0)
    +(terms.length>1&&item.anchor.exactText.toLowerCase().replace(/\s+/g," ").includes(terms.join(" "))?terms.length:0)}))
    .sort((a,b)=>b.score-a.score||a.chapter-b.chapter||a.anchor.location.page-b.anchor.location.page||a.anchor.location.startOffset-b.anchor.location.startOffset);
  const pageCounts=new Map<string,number>();
  return ranked.filter(item=>{
    const key=item.chapter+":"+item.anchor.location.page,count=pageCounts.get(key)??0;
    if(count>=2)return false;
    pageCounts.set(key,count+1);return true;
  }).slice(0,limit).map(({chapter,chunk,anchor,score})=>({chapter,chunk,anchor,score}));
}
export function searchTextbookChapters(query:string,chapters:TextbookChapter[]):TextbookMatch[]{
  return rankTextbookPassages(query,chapters).map(({chapter,anchor})=>({id:anchor.versionId+":"+anchor.blockId,chapter,page:anchor.location.page,pageLabel:anchor.location.pageLabel,quote:anchor.exactText}));
}
