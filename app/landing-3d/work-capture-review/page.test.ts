import {describe,it,expect,vi} from "vitest";
vi.mock("next/navigation",()=>({redirect:(destination:string)=>{throw new Error(`REDIRECT:${destination}`);}}));
import Page from "./page";
describe("Promoted work-capture-review",()=>{
 it("opens the current application screen without preview fixtures",()=>{expect(()=>Page()).toThrow("REDIRECT:/quick-add");});
});
