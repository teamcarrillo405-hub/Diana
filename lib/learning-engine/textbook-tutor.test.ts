import {beforeEach,describe,it,expect,vi} from "vitest";
const mocks=vi.hoisted(()=>({load:vi.fn()}));
vi.mock("server-only",()=>({}));
vi.mock("./textbook-server",()=>({loadReferenceTextbookChapters:mocks.load}));
import {PRECALCULUS_BOOK as book,PUBLIC_TEXTBOOK_SCOPE} from "./textbook-catalog";
import {structureDocument} from "./curriculum";
import {retrieveTextbookForTutor,textbookEvidenceFromChapters,textbookTutorPromptContext,textbookResponseAnchor} from "./textbook-tutor";
async function chapter(number=2){
  const document=await structureDocument({...PUBLIC_TEXTBOOK_SCOPE,documentId:book.id+"-chapter-"+number,title:"Reference",edition:"2.3",subject:"math",instructionRights:"licensed",sourceAssetHash:"f".repeat(64)},
    [{page:1,pageLabel:"101",text:"A slope measures the rate of change of a linear function.",interpretation:"original"}]);
  return {chapter:number,version:document.version,chunks:document.chunks};
}
describe("explicit public textbook tutor evidence",()=>{
  beforeEach(()=>{vi.clearAllMocks();});
  it("preserves versioned exact page quotations and attributes a selected reference",async()=>{
    const source=await chapter();mocks.load.mockResolvedValue([source]);
    const result=await retrieveTextbookForTutor("slope rate change",{bookId:book.id,chapter:2});
    expect(mocks.load).toHaveBeenCalledWith(2);
    expect(result.status).toBe("matched");
    expect(result.passages[0]).toMatchObject({chapter:2,versionId:source.version.id,contentHash:source.version.contentHash,assetHash:"f".repeat(64),exactText:source.chunks[0].anchors[0].exactText});
    expect(result.passages[0].readerUrl).toContain("chapter-2.pdf#page=1");
    expect(textbookTutorPromptContext(result)).toContain("not the teacher's assigned question");
    expect(textbookResponseAnchor(result)).toContain("chapter 2, PDF page 1");
  });
  it("does not confuse a selected chapter with an unrelated chapter or corrupt public scope",async()=>{
    const source=await chapter();
    expect(await textbookEvidenceFromChapters("slope",{bookId:book.id,chapter:3},[source])).toMatchObject({status:"no_evidence",passages:[]});
    const corrupted=[
      {...source,chunks:source.chunks.map(chunk=>({...chunk,ownerId:"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"}))},
      {...source,chunks:source.chunks.map(chunk=>({...chunk,anchors:chunk.anchors.map(anchor=>({...anchor,contentHash:"e".repeat(64)}))}))},
      {...source,chunks:source.chunks.map(chunk=>({...chunk,anchors:chunk.anchors.map(anchor=>({...anchor,exactText:"invented slope quote"}))}))},
      {...source,version:{...source.version,documentId:"another-book"}},
    ];
    for(const item of corrupted)expect(await textbookEvidenceFromChapters("slope",{bookId:book.id},[item])).toMatchObject({status:"no_evidence",passages:[]});
  });
  it("reports unavailable reference content without inventing excerpts",async()=>{
    mocks.load.mockRejectedValue(new Error("Index hash changed"));
    const result=await retrieveTextbookForTutor("slope",{bookId:book.id});
    expect(result).toMatchObject({status:"unavailable",passages:[]});
    expect(textbookTutorPromptContext(result)).toContain("Do not claim a textbook-grounded explanation or invent a page citation");
    expect(textbookTutorPromptContext({...result,status:"no_evidence"})).toContain("No matching passage was found");
    expect(textbookResponseAnchor(result)).toContain("could not be checked");
    expect(textbookResponseAnchor({...result,status:"no_evidence"})).toContain("No matching passage");
  });
});
