import {describe,it,expect,vi} from "vitest";
vi.mock("next/navigation",()=>({redirect:(destination:string)=>{throw new Error(`REDIRECT:${destination}`);}}));
import Page from "../app/landing-3d/test-prep-concept-review/page";
describe("Promoted test preparation",()=>{it("opens the unified Quiz",()=>{expect(()=>Page()).toThrow("REDIRECT:/study");});});
