import {beforeEach,describe,expect,it,vi} from "vitest";
const mocks=vi.hoisted(()=>({extractPdfBatch:vi.fn()}));
vi.mock("server-only",()=>({}));
vi.mock("./pdf",()=>({extractPdfBatch:mocks.extractPdfBatch}));
import {extractNativeAssignmentSource} from "./native-source";
const bytes=new TextEncoder().encode("%PDF-1.7\n");
const page={page:1,pageLabel:"1",text:"A readable paragraph from an ordinary native text PDF.",interpretation:"original" as const};
describe("bounded native assignment extraction",()=>{
  beforeEach(()=>{vi.clearAllMocks();});
  it("copies complete page text without certifying diagrams or mathematical layout",async()=>{
    mocks.extractPdfBatch.mockResolvedValue({pages:[page],totalPages:1});
    expect(await extractNativeAssignmentSource(bytes)).toEqual({status:"extracted",text:"[Page 1]\n"+page.text,pageCount:1,reviewRequired:true});
    expect(mocks.extractPdfBatch).toHaveBeenCalledWith(bytes,1,50);
  });
  it.each([
    {pages:[{...page,text:"",interpretation:"model_extraction"}],totalPages:1},
    {pages:[{...page,text:page.text+"\uFFFD"}],totalPages:1},
    {pages:[page],totalPages:51},
    {pages:[{...page,text:"word ".repeat(11000)}],totalPages:1},
  ])("does not call incomplete or uncertain extraction a success",async(result)=>{
    mocks.extractPdfBatch.mockResolvedValue(result);
    expect(await extractNativeAssignmentSource(bytes)).toMatchObject({status:"provider_required"});
  });
  it("retains provider fallback for parser errors without inventing text",async()=>{
    mocks.extractPdfBatch.mockRejectedValue(new Error("PDF parser could not read page"));
    expect(await extractNativeAssignmentSource(bytes)).toEqual({status:"provider_required",reason:"unreadable"});
  });
});
