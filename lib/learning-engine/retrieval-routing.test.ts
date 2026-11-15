import {beforeEach,describe,expect,it,vi} from "vitest";
import {structureDocument} from "./curriculum";
import {EMBEDDING_DIMENSIONS,type CurriculumChunk} from "./contracts";
import {retrieveForAssignment,curriculumPromptContext,tutorLearningContext} from "./server";
import {PRECALCULUS_BOOK,PUBLIC_TEXTBOOK_SCOPE} from "./textbook-catalog";
import {checkEquationValue} from "./algebra";

const mocks=vi.hoisted(()=>({from:vi.fn(),rpc:vi.fn(),invoke:vi.fn(),referenceLoad:vi.fn()}));
vi.mock("server-only",()=>({}));
vi.mock("@supabase/ssr",()=>({createServerClient:()=>({...mocks,functions:{invoke:mocks.invoke}})}));
vi.mock("next/headers",()=>({cookies:async()=>({getAll:()=>[],set:vi.fn()})}));
vi.mock("./textbook-server",()=>({loadReferenceTextbookChapters:mocks.referenceLoad}));

const owner="00000000-0000-4000-8000-000000000001";
const assignment="00000000-0000-4000-8000-000000000002";
const other="00000000-0000-4000-8000-000000000003";
const input={ownerId:owner,assignmentId:assignment,classId:null,query:"rectangle area"};
const metadata={ownerId:owner,assignmentId:assignment,classId:null,documentId:"source",title:"Algebra",edition:"1",subject:"math" as const,instructionRights:"owner_provided" as const};
type Document=Awaited<ReturnType<typeof structureDocument>>;
function query(data:unknown,error:unknown=null){
  const builder:{[key:string]:unknown}={then:(resolve:(value:unknown)=>unknown)=>Promise.resolve({data,error}).then(resolve)};
  for(const method of ["select","eq","in","order","limit"])builder[method]=vi.fn(()=>builder);
  builder.maybeSingle=vi.fn(async()=>({data,error}));
  return builder;
}
function install(document:Document,exact:CurriculumChunk[]=[]){
  mocks.from.mockImplementation((table:string)=>query(table==="learning_documents"
    ?[{id:document.version.id,document_id:document.version.documentId,owner_id:owner,assignment_id:assignment,metadata:document.version,pages:document.pages}]
    :table==="learning_blocks"?document.blocks.map(payload=>({payload}))
    :table==="learning_chunks"?exact.map(payload=>({payload})):table==="assignments"?{id:assignment,class_id:null}:[]));
}
function row(payload:CurriculumChunk,semantic=false){return {payload,lexical_rank:semantic?null:1,semantic_rank:semantic?1:null};}

describe("assignment retrieval provider routing",()=>{
  beforeEach(()=>{vi.clearAllMocks();mocks.invoke.mockResolvedValue({data:{ok:true,embedding:Array(EMBEDDING_DIMENSIONS).fill(0)}});mocks.referenceLoad.mockResolvedValue([]);});
  it("returns validated keyword evidence without an embedding request",async()=>{
    const document=await structureDocument(metadata,[{page:1,pageLabel:"1",text:"Rectangle area is length times width.",interpretation:"original"}]);
    install(document);mocks.rpc.mockResolvedValue({data:[row(document.chunks[0])],error:null});
    const result=await retrieveForAssignment(input);
    expect(result).toMatchObject({status:"matched",method:"keyword"});
    expect(result.chunks[0].id).toBe(document.chunks[0].id);
    expect(mocks.invoke).not.toHaveBeenCalled();
    expect(mocks.referenceLoad).not.toHaveBeenCalled();
    expect(mocks.rpc).toHaveBeenCalledExactlyOnceWith("learning_search",{p_assignment:assignment,p_versions:[document.version.id],p_query:input.query});
  });
  it("returns exact problem evidence without a provider even when keyword search is empty",async()=>{
    const document=await structureDocument(metadata,[{page:1,pageLabel:"1",text:"1. Solve 3x+5=20.",interpretation:"original"}]);
    install(document,document.chunks);mocks.rpc.mockResolvedValue({data:[],error:null});
    const result=await retrieveForAssignment({...input,query:"Help with problem 1"});
    expect(result).toMatchObject({status:"matched",method:"keyword"});expect(result.chunks[0].problemNumber).toBe("1");
    expect(mocks.invoke).not.toHaveBeenCalled();
  });
  it("requests semantic search only after local search has no validated evidence",async()=>{
    const document=await structureDocument(metadata,[{page:1,pageLabel:"1",text:"Rectangle area is length times width.",interpretation:"original"}]);
    install(document);mocks.rpc.mockResolvedValueOnce({data:[],error:null}).mockResolvedValueOnce({data:[row(document.chunks[0],true)],error:null});
    const result=await retrieveForAssignment({...input,query:"How much surface is covered?"});
    expect(result).toMatchObject({status:"matched",method:"hybrid"});
    expect(mocks.invoke).toHaveBeenCalledExactlyOnceWith("learning-embed",{body:expect.objectContaining({assignmentId:assignment,operation:"query",query:"How much surface is covered?"})});
    expect(mocks.rpc.mock.invocationCallOrder[0]).toBeLessThan(mocks.invoke.mock.invocationCallOrder[0]);
    expect(mocks.rpc.mock.calls[1][1]).toHaveProperty("p_embedding");
  });
  it("honors an explicit local-only search even when no passage matches",async()=>{
    const document=await structureDocument(metadata,[{page:1,pageLabel:"1",text:"Rectangle area is length times width.",interpretation:"original"}]);
    install(document);mocks.rpc.mockResolvedValue({data:[],error:null});
    expect(await retrieveForAssignment({...input,allowSemanticFallback:false})).toMatchObject({status:"no_evidence",chunks:[]});
    expect(mocks.invoke).not.toHaveBeenCalled();expect(mocks.rpc).toHaveBeenCalledTimes(1);
  });
  it("continues with an honest no-evidence result when the provider is unavailable",async()=>{
    const document=await structureDocument(metadata,[{page:1,pageLabel:"1",text:"Rectangle area is length times width.",interpretation:"original"}]);
    install(document);mocks.rpc.mockResolvedValue({data:[],error:null});mocks.invoke.mockRejectedValue(new Error("No API key"));
    expect(await retrieveForAssignment(input)).toMatchObject({status:"no_evidence",method:"keyword",chunks:[]});
    expect(mocks.rpc).toHaveBeenCalledTimes(1);
  });
  it("rejects foreign owners, assignments, versions and fabricated anchors in either path",async()=>{
    const document=await structureDocument(metadata,[{page:1,pageLabel:"1",text:"Rectangle area is length times width.",interpretation:"original"}]);
    const source=document.chunks[0];
    const invalid:CurriculumChunk[]=[
      {...source,id:"1".repeat(64),ownerId:other},
      {...source,id:"2".repeat(64),assignmentId:other},
      {...source,id:"3".repeat(64),versionId:"3".repeat(64)},
      {...source,id:"4".repeat(64),anchors:source.anchors.map(anchor=>({...anchor,exactText:"Fabricated source quotation"}))},
    ];
    install(document);mocks.rpc.mockResolvedValueOnce({data:invalid.map(item=>row(item)),error:null})
      .mockResolvedValueOnce({data:invalid.map(item=>row(item,true)),error:null});
    expect(await retrieveForAssignment(input)).toMatchObject({status:"no_evidence",chunks:[]});
    expect(mocks.invoke).toHaveBeenCalledTimes(1);
  });
  it("refuses to silently mix two pinned editions of the same source",async()=>{
    const first=await structureDocument(metadata,[{page:1,pageLabel:"1",text:"Rectangle area is length times width.",interpretation:"original"}]);
    const second=await structureDocument({...metadata,edition:"2"},[{page:1,pageLabel:"1",text:"A revised edition has a different example.",interpretation:"original"}]);
    mocks.from.mockImplementation((table:string)=>query(table==="learning_documents"?[
      {id:first.version.id,document_id:first.version.documentId,metadata:first.version,pages:first.pages},
      {id:second.version.id,document_id:second.version.documentId,metadata:second.version,pages:second.pages},
    ]:[]));
    const result=await retrieveForAssignment({...input,versionIds:[first.version.id,second.version.id]});
    expect(result).toMatchObject({status:"source_conflict",chunks:[]});
    expect(mocks.rpc).not.toHaveBeenCalled();
    expect(mocks.invoke).not.toHaveBeenCalled();
  });
  it("does not call the model to conceal unavailable source storage",async()=>{
    const document=await structureDocument(metadata,[{page:1,pageLabel:"1",text:"Rectangle area is length times width.",interpretation:"original"}]);
    install(document);mocks.rpc.mockResolvedValue({data:null,error:{message:"database unavailable"}});
    expect(await retrieveForAssignment(input)).toMatchObject({status:"index_unavailable",chunks:[]});
    expect(mocks.invoke).not.toHaveBeenCalled();
  });
  it("uses a selected public reference without embeddings even when no private index exists",async()=>{
    const reference=await structureDocument({...metadata,...PUBLIC_TEXTBOOK_SCOPE,documentId:PRECALCULUS_BOOK.id+"-chapter-2",instructionRights:"licensed",sourceAssetHash:"f".repeat(64)},[{page:1,pageLabel:"101",text:"Rectangle area is length times width in this public reference.",interpretation:"original"}]);
    mocks.referenceLoad.mockResolvedValue([{chapter:2,version:reference.version,chunks:reference.chunks}]);
    mocks.from.mockImplementation((table:string)=>query(table==="assignments"?{id:assignment,class_id:null}:[]));
    const result=await retrieveForAssignment({...input,referenceBook:{bookId:PRECALCULUS_BOOK.id,chapter:2}});
    expect(result).toMatchObject({status:"matched",chunks:[],references:{status:"matched",bookId:PRECALCULUS_BOOK.id}});
    expect(result.references?.passages[0]).toMatchObject({versionId:reference.version.id,contentHash:reference.version.contentHash,assetHash:"f".repeat(64)});
    expect(mocks.invoke).not.toHaveBeenCalled();expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("places assignment anchors before the selected attributed public reference",async()=>{
    const document=await structureDocument(metadata,[{page:1,pageLabel:"1",text:"Rectangle area assignment instructions.",interpretation:"original"}]);
    const reference=await structureDocument({...metadata,...PUBLIC_TEXTBOOK_SCOPE,documentId:PRECALCULUS_BOOK.id+"-chapter-2",instructionRights:"licensed",sourceAssetHash:"f".repeat(64)},[{page:1,pageLabel:"101",text:"Rectangle area in the public textbook.",interpretation:"original"}]);
    install(document);mocks.rpc.mockResolvedValue({data:[row(document.chunks[0])],error:null});
    mocks.referenceLoad.mockResolvedValue([{chapter:2,version:reference.version,chunks:reference.chunks}]);
    const result=await retrieveForAssignment({...input,referenceBook:{bookId:PRECALCULUS_BOOK.id}});
    expect(result.chunks).toHaveLength(1);expect(result.references?.status).toBe("matched");
    const prompt=curriculumPromptContext(result);
    expect(prompt.indexOf("Rectangle area assignment instructions.")).toBeLessThan(prompt.indexOf("Rectangle area in the public textbook."));
    expect(prompt).toContain(PRECALCULUS_BOOK.authors);expect(prompt).toContain("CC BY-SA 4.0");
    expect(mocks.invoke).not.toHaveBeenCalled();
  });
  it("rejects unavailable assignments and a mismatched class before reading the public reference",async()=>{
    for(const value of [null,{id:assignment,class_id:other}]){
      mocks.from.mockImplementation(()=>query(value));
      expect(await retrieveForAssignment({...input,referenceBook:{bookId:PRECALCULUS_BOOK.id}})).toMatchObject({status:"index_unavailable",chunks:[]});
    }
    expect(mocks.referenceLoad).not.toHaveBeenCalled();expect(mocks.invoke).not.toHaveBeenCalled();
  });
});

describe("problem-scoped tutor feedback",()=>{
  beforeEach(()=>{vi.clearAllMocks();});
  const event=(problemId:string)=>({payload:{id:owner,assignmentId:assignment,problemId,skillId:"math.linear_equations",revision:1,
    subject:"math",input:"2",assistance:"independent",modality:"typed",confirmed:true,documentVersionIds:[]},assessment:checkEquationValue("x=2","2"),created_at:"2026-09-25T10:00:00Z"});
  it("does not tell the current student to move on because a different problem was supported",async()=>{
    mocks.from.mockImplementation(()=>query([event("other-problem")]));
    const result=await tutorLearningContext({ownerId:owner,assignmentId:assignment,hasEvidence:true,priorSupport:9});
    expect(result).toMatchObject({supportScope:"assignment_context",support:{action:"orient"}});
  });
  it("uses feedback only from the explicitly selected problem's owned stored attempt",async()=>{
    mocks.from.mockImplementation(()=>query([event("other-problem"),event("selected-problem")]));
    const selected=await tutorLearningContext({ownerId:owner,assignmentId:assignment,hasEvidence:true,priorSupport:1,problemId:"selected-problem"});
    expect(selected).toMatchObject({supportScope:"active_problem",support:{action:"independent_attempt"}});
    const missing=await tutorLearningContext({ownerId:owner,assignmentId:assignment,hasEvidence:true,priorSupport:8,problemId:"never-attempted"});
    expect(missing).toMatchObject({supportScope:"assignment_context",support:{action:"orient"}});
  });
});
