import {describe,it,expect} from "vitest";
import {structureDocument,validateDocumentAnchor} from "./curriculum";
import {sourcePageSchema,extractionQuality} from "./source-layout";
const meta={ownerId:"00000000-0000-4000-8000-000000000001",assignmentId:"00000000-0000-4000-8000-000000000002",documentId:"structured-book",classId:null,title:"Book",edition:"1",subject:"math" as const,instructionRights:"owner_provided" as const};
describe("textbook layout and region evidence",()=>{
  it("retains hierarchy, table cells and exact anchors across pages",async()=>{
    const document=await structureDocument(meta,[
      {page:1,pageLabel:"1",text:"# Chapter 1\n## Measurements\n| Shape | Area |\n| square | 9 |\n\n1. Find the rectangle area.",interpretation:"original"},
      {page:2,pageLabel:"2",text:"Continued: width is 4 cm.\n\n2. Solve x + 3 = 9.",interpretation:"original"},
    ]);
    const table=document.blocks.find(block=>block.kind==="table")!;
    expect(table.structure?.headingPath).toHaveLength(2);
    expect(table.structure?.table?.[1][1].text).toBe("9");
    expect(document.chunks.some(chunk=>new Set(chunk.anchors.map(anchor=>anchor.location.page)).size===2)).toBe(true);
    for(const chunk of document.chunks)for(const anchor of chunk.anchors)expect(validateDocumentAnchor(anchor,document)).toBe(true);
    for(const row of table.structure!.table!)for(const cell of row)expect(document.pages[0].text.slice(cell.startOffset,cell.endOffset)).toBe(cell.text);
  });
  it("excludes unconfirmed model regions even on an original page",async()=>{
    const page=sourcePageSchema.parse({page:1,pageLabel:"1",text:"A diagram of a triangle with measurements.",interpretation:"original",
      regions:[{id:"diagram",kind:"diagram",box:{x:0.1,y:0.1,width:0.5,height:0.5},startOffset:0,endOffset:40,provenance:"model_extraction",confirmed:false}]});
    const document=await structureDocument(meta,[page]);
    expect(document.chunks).toEqual([]);
    expect(extractionQuality([page]).pages[0].reasons).toContain("unconfirmed_region");
    expect(sourcePageSchema.safeParse({...page,regions:[{...page.regions![0],endOffset:400}]}).success).toBe(false);
  });
  it("does not join adjacent pages without explicit continuation",async()=>{
    const document=await structureDocument(meta,[{page:1,pageLabel:"1",text:"1. Solve x + 3 = 9.",interpretation:"original"},{page:2,pageLabel:"2",text:"x = 6",interpretation:"original"}]);
    expect(document.chunks.every(chunk=>chunk.anchors.length===1)).toBe(true);
  });
  it("unlocks only text fully covered by a confirmed region",async()=>{
    const text="1. Solve x=2.\n\n2. Solve x=3.";
    const document=await structureDocument(meta,[{page:1,pageLabel:"1",text,interpretation:"model_extraction",regions:[{id:"first",kind:"handwriting",box:{x:0,y:0,width:1,height:0.2},startOffset:0,endOffset:13,provenance:"manual",confirmed:true}]}]);
    expect(document.chunks.map(chunk=>chunk.problemNumber)).toEqual(["1"]);
    expect(document.blocks.find(block=>block.problemNumber==="2")?.needsConfirmation).toBe(true);
  });
});
