import {describe,it,expect,vi} from "vitest";
import {assessReading} from "@/supabase/functions/_shared/learning/reading";

describe("source-only reading checks",()=>{
  it("checks exact quotes without contacting a provider or grading the interpretation",async()=>{
    const request=vi.spyOn(globalThis,"fetch").mockRejectedValue(new Error("No network allowed"));
    try{
      const result=await assessReading({skillId:"reading.evidence",response:'I think "Light crossed the room" supports my point.',pages:[{page:2,text:"Light crossed the room at dawn.",interpretation:"original"}]});
      expect(result.observations[0]).toContain("Quote found on page 2");
      expect(result.status).toBe("inconclusive");expect(result.eligibleForKnowledge).toBe(false);
      expect(request).not.toHaveBeenCalled();
    }finally{request.mockRestore();}
  });
  it("does not accept invented quotes or unconfirmed extraction",async()=>{
    const result=await assessReading({skillId:"reading.evidence",response:'“A different quote”',pages:[{page:1,text:"Actual source.",interpretation:"confirmed"},{page:2,text:"A different quote",interpretation:"model_extraction"}]});
    expect(result.observations[0]).toContain("does not exactly match");
    const missing=await assessReading({skillId:"reading.evidence",response:'"A different quote"',pages:[{page:2,text:"A different quote",interpretation:"model_extraction"}]});
    expect(missing.claim).toContain("Confirm the source");
  });
  it("keeps comparison guidance within the single passage and the two ideas",async()=>{
    const result=await assessReading({skillId:"reading.comparison",response:'Students wanted expansion; the principal asked for "a maintenance schedule".',
      pages:[{page:1,text:"Students proposed expanding the garden. The principal asked for a maintenance schedule.",interpretation:"original"}]});
    expect(result.observations.at(-1)).toBe("Which detail supports each of the two ideas you are comparing? Explain a similarity or difference.");
    expect(result.observations.join(" ")).not.toContain("each passage");
  });
  it("does not validate an interpretation merely because its quote exists",async()=>{
    const result=await assessReading({skillId:"reading.inference",response:'The principal rejected every garden because "Students measured rainfall".',
      pages:[{page:1,text:"Students measured rainfall. The principal asked for a maintenance schedule.",interpretation:"confirmed"}]});
    expect(result.observations[0]).toContain("Quote found on page 1");
    expect(result).toMatchObject({status:"inconclusive",outcome:"unknown",eligibleForKnowledge:false,verifierVersion:"reading-source-local-v2"});
    expect(result.limitations).toContain("This checks whether quoted words appear in the source. It does not grade your interpretation.");
  });
});
