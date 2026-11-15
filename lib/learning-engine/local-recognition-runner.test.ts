import {describe,expect,it} from "vitest";
import {recognitionChildEnvironment,recognitionProcessError} from "./local-recognition-runner";

describe("recognition child environment",()=>{
  it("preserves Windows identity required by Torch cache setup without application credentials",()=>{
    const environment=recognitionChildEnvironment({NODE_ENV:"test",USERNAME:"opaque-worker",USERPROFILE:"C:\\Users\\opaque-worker",PATH:"opaque-path",
      SUPABASE_SERVICE_ROLE_KEY:"secret-sentinel",OPENAI_API_KEY:"secret-sentinel",ANTHROPIC_API_KEY:"secret-sentinel",
      DIANA_RECOGNITION_PROVENANCE_KEY:"secret-sentinel",HF_TOKEN:"secret-sentinel",PYTHONPATH:"untrusted-import-path",NODE_OPTIONS:"untrusted-loader"});
    expect(environment.USERNAME).toBe("opaque-worker");
    expect(environment.USERPROFILE).toBe("C:\\Users\\opaque-worker");
    expect(environment.PATH).toBe("opaque-path");
    expect(Object.values(environment)).not.toContain("secret-sentinel");
    expect(environment.PYTHONPATH).toBeUndefined();
    expect(environment.NODE_OPTIONS).toBeUndefined();
  });
  it("overrides inherited online flags and keeps unrelated environment values out",()=>{
    const environment=recognitionChildEnvironment({NODE_ENV:"test",username:"opaque-worker",HF_HUB_OFFLINE:"0",TRANSFORMERS_OFFLINE:"0",PYTHONUTF8:"0",ARBITRARY_SECRET:"sentinel"});
    expect(environment.username).toBe("opaque-worker");
    expect(environment.HF_HUB_OFFLINE).toBe("1");
    expect(environment.TRANSFORMERS_OFFLINE).toBe("1");
    expect(environment.PYTHONUTF8).toBe("1");
    expect(environment.ARBITRARY_SECRET).toBeUndefined();
  });
});

describe("recognition process failures",()=>{
  it("preserves only the explicit unsupported layout code and manual fallback",()=>{
    expect(recognitionProcessError(JSON.stringify({error:"recognition_unsupported_layout",manualEntryAvailable:true})).message).toBe("recognition_unsupported_layout");
  });
  it("does not release arbitrary errors, paths, content or malformed process output",()=>{
    for(const output of ["not-json",JSON.stringify({error:"secret/path/content",manualEntryAvailable:true}),JSON.stringify({error:"recognition_unsupported_layout",manualEntryAvailable:false}),JSON.stringify({error:"recognition_unsupported_layout",manualEntryAvailable:true,privatePath:"secret"})]){
      expect(recognitionProcessError(output).message).toBe("recognition_runtime_unavailable");
    }
  });
});
