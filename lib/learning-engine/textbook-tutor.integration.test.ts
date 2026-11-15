import {describe,it,expect,vi} from "vitest";
vi.mock("server-only",()=>({}));
import {PRECALCULUS_BOOK as book} from "./textbook-catalog";
import {retrieveTextbookForTutor} from "./textbook-tutor";
describe("all-chapter tutor reference integration",()=>{
  it("retrieves actual locally pinned chapters with no provider network calls",async()=>{
    const request=vi.spyOn(globalThis,"fetch").mockRejectedValue(new Error("No provider allowed"));
    try{
      for(const chapter of book.chapters){
        const result=await retrieveTextbookForTutor(chapter.queries[0],{bookId:book.id,chapter:chapter.number});
        expect(result.status,"chapter "+chapter.number).toBe("matched");
        expect(result.passages.every(passage=>passage.chapter===chapter.number)).toBe(true);
        for(const passage of result.passages){
          expect(passage.versionId).toMatch(/^[a-f0-9]{64}$/);expect(passage.assetHash).toMatch(/^[a-f0-9]{64}$/);
          expect(passage.location.endOffset-passage.location.startOffset).toBe(passage.exactText.length);
        }
      }
      expect(request).not.toHaveBeenCalled();
    }finally{request.mockRestore();}
  },30000);
});
