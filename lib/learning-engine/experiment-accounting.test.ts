import { describe, expect, it } from "vitest";
import { beginExperimentProvider, recordExperimentUsage, recordExperimentOutputState, validateExperimentUsage } from "../../supabase/functions/_shared/learning/experiment-accounting";

const context = {requestId:"a262a6d7-e023-48ea-8d45-7130706445c2",ownerId:"11111111-1111-4111-8111-111111111111",inputHash:"a".repeat(64),model:"test-model",inputRate:25,outputRate:200,priceReviewedAt:"2026-09-26T00:00:00Z"};
const value = {id:"resp_synthetic",model:"test-model-2026",usage:{input_tokens:800,output_tokens:60,total_tokens:860},text:"Consider the evidence in the source."};

function clientFixture(receiptFailure=false) {
  const calls: {name:string;args:Record<string,unknown>}[]=[];
  let moneySettled=false;
  return {calls,get moneySettled(){return moneySettled;},from(){throw new Error("No content tables allowed");},async rpc(name:string,args:Record<string,unknown>){
    calls.push({name,args});
    if(name==="learning_start_experiment_provider")return {data:true,error:null};
    if(name==="learning_record_experiment_usage"){
      if(receiptFailure)return {data:null,error:{message:"write unavailable"}};
      moneySettled=true;return {data:1,error:null};
    }
    if(name==="learning_record_experiment_output_state")return {data:true,error:null};
    if(name==="reserve_ai_token_budget")return {data:[{allowed:true,reservation_id:"token-id",reserved_tokens:1000,remaining_tokens:5000,reservation_status:"active"}],error:null};
    if(name==="mark_ai_budget_provider_started")return {data:[{reservation_id:"token-id",reservation_status:"active",provider_start_status:"started",provider_started_at:"2026-09-26T00:00:00Z"}],error:null};
    if(name==="settle_ai_token_budget")return {data:[{reservation_id:"token-id",reservation_status:"settled",actual_tokens:args.p_actual_tokens,charged_tokens:args.p_actual_tokens}],error:null};
    throw new Error(`Unexpected RPC ${name}`);
  }};
}

describe("experiment generation accounting",()=>{
  it("accounts Responses billing counters when nested cache and reasoning details are present", async()=>{
    const candidate={...value,usage:{...value.usage,input_tokens_details:{cached_tokens:400},output_tokens_details:{reasoning_tokens:10}}};
    const client=clientFixture();
    expect(()=>validateExperimentUsage(candidate)).not.toThrow();
    await expect(recordExperimentUsage(client,context,candidate)).resolves.toBe(1);
    expect(client.calls[0].args).toEqual({p_id:context.requestId,p_owner_id:context.ownerId,p_input_hash:context.inputHash,
      p_provider_response_id:value.id,p_resolved_model:value.model,p_input_tokens:800,p_output_tokens:60,p_total_tokens:860});
    expect(JSON.stringify(client.calls)).not.toContain("cached_tokens");
    expect(JSON.stringify(client.calls)).not.toContain(value.text);
  });
  it.each([null,undefined,[],{}, {...value,id:undefined},{...value,model:123},
    {...value,usage:null},{...value,usage:[]},{...value,usage:{input_tokens:"800",output_tokens:60,total_tokens:860}},
    {...value,usage:{input_tokens:800,output_tokens:60}},{...value,usage:{input_tokens:10_000_001,output_tokens:0,total_tokens:10_000_001}}
  ])("rejects malformed untyped provider values",candidate=>{
    expect(()=>validateExperimentUsage(candidate)).toThrow("Invalid experiment usage receipt.");
  });
  it.each(["blocked","unavailable"])("retains exact usage when output moderation is %s",async outcome=>{
    // Loading through a variable keeps Deno-only environment declarations out of
    // the application's TypeScript compilation while exercising the real guard.
    const guardModule="../../supabase/functions/_shared/safety.ts";
    const {runSafeBudgetedAiCall}=await import(guardModule);
    const client=clientFixture();
    const result=await runSafeBudgetedAiCall({ownerId:context.ownerId,supabase:client,input:"Compare the source evidence.",systemPrompt:"Tutor",maxOutputTokens:100,
      moderator:async ({phase}:{phase:string})=>{
        if(phase==="input")return {safe:true};
        expect(client.moneySettled).toBe(true);
        if(outcome==="unavailable")throw new Error("moderation unavailable");
        return {safe:false,category:"sensitive_data",redirect:"Please remove private details."};
      },invoke:async()=>{
        await beginExperimentProvider(client,context);
        await recordExperimentUsage(client,context,value);
        return value;
      },getTokens:(response:typeof value)=>response.usage.total_tokens,getOutput:(response:typeof value)=>response.text,
    });
    expect(result.ok).toBe(false);
    expect(result.kind).toBe(outcome==="blocked"?"safety":"screening");
    await recordExperimentOutputState(client,context,outcome==="blocked"?"blocked":"screening_unavailable");
    expect(client.calls.find(call=>call.name==="settle_ai_token_budget")?.args.p_actual_tokens).toBe(860);
    const receipt=client.calls.find(call=>call.name==="learning_record_experiment_usage")!.args;
    expect(receipt.p_input_tokens).toBe(800);
    expect(JSON.stringify(receipt)).not.toContain(value.text);
    expect(JSON.stringify(client.calls)).not.toContain("Compare the source evidence");
  });
  it("fails closed when the usage receipt cannot commit",async()=>{
    const client=clientFixture(true);
    await expect(recordExperimentUsage(client,context,value)).rejects.toThrow("reconciliation");
    expect(client.moneySettled).toBe(false);
    expect(client.calls).toHaveLength(1);
  });
  it("does not allow a provider invocation after an ambiguous start",async()=>{
    const client={async rpc(){return {data:false,error:null};}};
    await expect(beginExperimentProvider(client,context)).rejects.toThrow("start was not recorded");
  });
  it.each([
    {...value,usage:{input_tokens:800,output_tokens:60,total_tokens:861}},
    {...value,usage:{input_tokens:-1,output_tokens:60,total_tokens:59}},
    {...value,usage:{input_tokens:0,output_tokens:0,total_tokens:0}},
    {...value,usage:{input_tokens:800.5,output_tokens:60,total_tokens:860.5}},
    {...value,id:"resp with private text"},
  ])("rejects invalid arithmetic or receipt identifiers before persistence",async candidate=>{
    const client=clientFixture();
    expect(()=>validateExperimentUsage(candidate)).toThrow();
    await expect(recordExperimentUsage(client,context,candidate)).rejects.toThrow();
    expect(client.calls).toHaveLength(0);
  });
});
