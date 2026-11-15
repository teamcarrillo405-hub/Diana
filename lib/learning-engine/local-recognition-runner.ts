import {spawn} from "node:child_process";
import {createHash} from "node:crypto";
import {readFile,stat} from "node:fs/promises";
import path from "node:path";
import {z} from "zod";
import {recognitionAvailability,recognitionModelSchema,prepareRecognitionDraft,type RecognitionDraft} from "./recognition";

const manifestSchema=z.object({model:recognitionModelSchema,directory:z.string(),files:z.record(z.string(),z.string())}).strict();
const allowedMime={speech:new Set(["audio/wav"]),handwriting_line:new Set(["image/png","image/jpeg"])};
const pythonScript=path.resolve(process.cwd(),"scripts/learning/recognize_local.py");

/** Windows getpass (used by Torch's cache setup) needs USERNAME. Keep identity
 * separate from application secrets; no provider or Supabase keys are inherited. */
export function recognitionChildEnvironment(env:NodeJS.ProcessEnv=process.env):NodeJS.ProcessEnv{
  return {...Object.fromEntries(Object.entries(env).filter(([key])=>/^(PATH|PATHEXT|SYSTEMROOT|WINDIR|TEMP|TMP|USERPROFILE|USERNAME|LOCALAPPDATA|APPDATA|PYTHONUTF8)$/i.test(key))),
    NODE_ENV:env.NODE_ENV??"production",PYTHONUTF8:"1",HF_HUB_OFFLINE:"1",TRANSFORMERS_OFFLINE:"1"};
}

/** Only a fixed layout code crosses the process boundary; never expose stderr. */
export function recognitionProcessError(output:string):Error{
  try{
    const parsed=z.object({error:z.literal("recognition_unsupported_layout"),manualEntryAvailable:z.literal(true)}).strict().safeParse(JSON.parse(output));
    if(parsed.success)return new Error("recognition_unsupported_layout");
  }catch{/* Untrusted or incomplete process output stays unavailable. */}
  return new Error("recognition_runtime_unavailable");
}

/** One bounded offline invocation. Neither the asset nor its transcript is logged. */
export async function runLocalRecognition(input:{manifestPath:string;asset:Uint8Array;mime:string;python:string}):Promise<RecognitionDraft>{
  const {manifestPath,asset,mime,python}=input;
  if(!path.isAbsolute(manifestPath)||!path.isAbsolute(python))throw new Error("recognition_configuration_unavailable");
  if(!asset.length||asset.length>5_000_000)throw new Error("recognition_input_bound");
  if((await stat(manifestPath)).size>100_000)throw new Error("recognition_manifest_bound");
  const manifestText=await readFile(manifestPath,"utf8"),manifest=manifestSchema.parse(JSON.parse(manifestText));
  if(!recognitionAvailability(manifest.model,manifest.model.kind).available)throw new Error("recognition_model_unavailable");
  if(!allowedMime[manifest.model.kind].has(mime))throw new Error("recognition_format_unavailable");
  const assetHash=createHash("sha256").update(asset).digest("hex");
  const request={kind:manifest.model.kind,mime,assetBase64:Buffer.from(asset).toString("base64"),assetHash};
  const raw=await new Promise<unknown>((resolve,reject)=>{
    const child=spawn(python,[pythonScript,"--manifest",manifestPath],{
      shell:false,windowsHide:true,stdio:["pipe","pipe","pipe"],
      env:recognitionChildEnvironment(),
    });
    let output="",settled=false;
    const finish=(error?:Error,value?:unknown)=>{
      if(settled)return;
      settled=true;clearTimeout(timer);
      if(error){child.kill();reject(error);}else resolve(value);
    };
    const timer=setTimeout(()=>finish(new Error("recognition_timeout")),120_000);
    child.stdout.on("data",(chunk:Buffer)=>{output+=chunk.toString("utf8");if(Buffer.byteLength(output)>100_000)finish(new Error("recognition_output_bound"));});
    child.stderr.resume();
    child.on("error",()=>finish(new Error("recognition_runtime_unavailable")));
    child.stdin.on("error",()=>finish(new Error("recognition_input_unavailable")));
    child.on("close",code=>{
      if(code!==0)return finish(recognitionProcessError(output));
      try{finish(undefined,JSON.parse(output));}catch{finish(new Error("recognition_output_unavailable"));}
    });
    child.stdin.end(JSON.stringify(request));
  });
  // A revoked manifest cannot release a transcript from an earlier process.
  if(await readFile(manifestPath,"utf8")!==manifestText)throw new Error("recognition_model_changed");
  return prepareRecognitionDraft(raw,manifest.model,assetHash);
}
