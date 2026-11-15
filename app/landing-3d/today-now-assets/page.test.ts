import {describe,it,expect,vi} from "vitest";
vi.mock("next/navigation",()=>({redirect:(destination:string)=>{throw new Error(`REDIRECT:${destination}`);}}));
import Page from "./page";
describe("Promoted today-now-assets",()=>{
 it("opens the current application screen without preview fixtures",()=>{expect(()=>Page()).toThrow("REDIRECT:/dashboard");});
});
