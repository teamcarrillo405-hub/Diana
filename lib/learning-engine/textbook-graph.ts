import type {CurriculumChunk} from "./contracts";
import {listChapterSkills,loadCurriculumGraph} from "./curriculum-graph";
import {rerankGraphPassages} from "./graph-retrieval";
import {rankTextbookPassages} from "./textbook-search";

export type GraphTextbookChapter={number:number;versionId:string;chunks:CurriculumChunk[]};
export type GraphTextbookOptions={chapter?:number;selectedSkillId?:string};

/**
 * Local curriculum reranking of already indexed public references. Authorization and
 * document/anchor integrity checks remain the caller's responsibility. The underlying
 * lexical ranker also rejects chunks outside the public textbook scope.
 */
export async function rankGraphTextbookPassages(query:string,chapters:GraphTextbookChapter[],options:GraphTextbookOptions={}){
  const graph=await loadCurriculumGraph();
  if(options.chapter!==undefined)listChapterSkills(graph,options.chapter);
  const selectedChapters=options.chapter===undefined?chapters:chapters.filter(chapter=>chapter.number===options.chapter);
  const candidates=rankTextbookPassages(query,selectedChapters,24);
  const originals=new Map(candidates.map(candidate=>[candidate.anchor.versionId+":"+candidate.anchor.blockId,candidate]));
  const ranked=rerankGraphPassages(graph,query,candidates.map(candidate=>({
    id:candidate.anchor.versionId+":"+candidate.anchor.blockId,
    text:candidate.anchor.exactText,
    source:{versionId:candidate.anchor.versionId,contentHash:candidate.anchor.contentHash,page:candidate.anchor.location.page,blockId:candidate.anchor.blockId},
    scope:"reference" as const,chapter:candidate.chapter,subject:candidate.chunk.subject,lexicalScore:candidate.score,
  })),options);
  // Preserve the lexical score and original exact chunk/anchor objects. An
  // explicit graph boost only breaks lexical ties and is recorded separately.
  return ranked.slice(0,6).map(candidate=>({...originals.get(candidate.id)!,graph:{...candidate.graph,score:candidate.score}}));
}
