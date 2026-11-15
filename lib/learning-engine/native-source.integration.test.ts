import {describe,it,expect,vi} from "vitest";
import {PDFDocument,StandardFonts} from "pdf-lib";
vi.mock("server-only",()=>({}));
import {extractNativeAssignmentSource} from "./native-source";

describe("native assignment PDF worker integration",()=>{
  it("reads an actual text PDF without network calls while preserving the review boundary",async()=>{
    const document=await PDFDocument.create();
    const font=await document.embedFont(StandardFonts.Helvetica);
    document.addPage().drawText("Read this paragraph and describe the main idea in your own words.",{font});
    const request=vi.spyOn(globalThis,"fetch").mockRejectedValue(new Error("No provider network allowed"));
    try{
      const result=await extractNativeAssignmentSource(await document.save());
      expect(result).toMatchObject({status:"extracted",pageCount:1,reviewRequired:true,text:expect.stringContaining("describe the main idea")});
      expect(request).not.toHaveBeenCalled();
    }finally{request.mockRestore();}
  },30000);
  it("does not invent source text for a real blank scanned page",async()=>{
    const document=await PDFDocument.create();document.addPage();
    expect(await extractNativeAssignmentSource(await document.save())).toMatchObject({status:"provider_required",reason:"sparse"});
  },30000);
});
