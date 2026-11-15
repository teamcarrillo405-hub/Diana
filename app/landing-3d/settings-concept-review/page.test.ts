import {describe,it,expect,vi} from "vitest";
vi.mock("next/navigation",()=>({redirect:(destination:string)=>{throw new Error(`REDIRECT:${destination}`);}}));
import Page from "./page";
describe("Promoted settings-concept-review",()=>{
 it("opens the current application screen without preview fixtures",()=>{expect(()=>Page()).toThrow("REDIRECT:/settings");});
});
