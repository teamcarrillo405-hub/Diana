import {NextResponse} from "next/server";
import path from "node:path";
import {createHmac,randomBytes} from "node:crypto";
import {readFile,readdir,realpath,stat} from "node:fs/promises";
import {z} from "zod";
import {createLearningClient,learningAccess} from "@/lib/learning-engine/server";
import {runLocalRecognition} from "@/lib/learning-engine/local-recognition-runner";
import {recognitionAvailability,recognitionModelSchema} from "@/lib/learning-engine/recognition";
import {recognitionProofKey,signRecognitionDraft} from "@/lib/learning-engine/recognition-provenance";

export const runtime="nodejs";
export const dynamic="force-dynamic";

let running=false;
const MAX_BODY=5_100_000;
const localHosts=new Set(["localhost","127.0.0.1","[::1]"]);
const noStore={"Cache-Control":"private, no-store"};
const unavailable=()=>NextResponse.json({available:false,error:"Local recognition is unavailable. Enter your text manually."},{status:503,headers:noStore});

function localConfiguration(request:Request){
  const url=new URL(request.url);
  if(process.env.DIANA_LOCAL_RECOGNITION_ENABLED!=="1"||process.env.VERCEL||!localHosts.has(url.hostname))return false;
  const origin=request.headers.get("origin");
  return request.method==="GET"?!origin||origin===url.origin:origin===url.origin;
}

async function access(request:Request):Promise<{response:NextResponse}|{user:{id:string}}>{
  if(!localConfiguration(request))return {response:unavailable()};
  const key=recognitionProofKey(process.env.DIANA_RECOGNITION_PROVENANCE_KEY);
  if(!key)return {response:unavailable()};
  const client=await createLearningClient(),{data:{user}}=await client.auth.getUser();
  if(!user)return {response:NextResponse.json({error:"Sign in to use local recognition."},{status:401,headers:noStore})};
  if(!await learningAccess("assessment",user.id,client))return {response:unavailable()};
  const challenge=randomBytes(16).toString("hex");
  const signature=createHmac("sha256",key).update(challenge,"utf8").digest("hex");
  const ready=await client.rpc("learning_recognition_provenance_ready",{p_challenge:challenge,p_signature:signature});
  if(ready.error||ready.data!==true)return {response:unavailable()};
  return {user};
}

function configured(kind:"speech"|"handwriting_line"){
  const python=process.env.DIANA_RECOGNITION_PYTHON;
  const manifestPath=kind==="speech"?process.env.DIANA_RECOGNITION_SPEECH_MANIFEST:process.env.DIANA_RECOGNITION_HANDWRITING_MANIFEST;
  if(!python||!path.isAbsolute(python)||!manifestPath||!path.isAbsolute(manifestPath))return null;
  return {python,manifestPath};
}

async function ready(kind:"speech"|"handwriting_line"){
  const settings=configured(kind);if(!settings)return false;
  try{
    if(!(await stat(settings.python)).isFile()||(await stat(settings.manifestPath)).size>100_000)return false;
    const manifest=z.object({model:recognitionModelSchema,directory:z.string(),files:z.record(z.string(),z.string())}).strict()
      .parse(JSON.parse(await readFile(settings.manifestPath,"utf8")));
    if(!path.isAbsolute(manifest.directory)||!recognitionAvailability(manifest.model,kind).available||
      !(await stat(manifest.directory)).isDirectory()||!Object.keys(manifest.files).length)return false;
    const directory=await realpath(manifest.directory),names=Object.keys(manifest.files);
    if(directory.split(/[\\/]/).some(part=>part.toLowerCase()==="public")||
      (await readdir(directory)).some(name=>!names.includes(name)))return false;
    for(const name of Object.keys(manifest.files)){
      const filePath=path.join(directory,name);
      if(name==="."||name===".."||!/^[A-Za-z0-9_.-]+$/.test(name)||!/^[a-f0-9]{64}$/.test(manifest.files[name])||
        path.dirname(await realpath(filePath))!==directory||!(await stat(filePath)).isFile())return false;
    }
    return true;
  }catch{return false;}
}

/** Checks local files without loading model weights or disclosing private paths. */
export async function GET(request:Request){
  const authorized=await access(request);if("response" in authorized)return authorized.response;
  const [speech,handwritingLine]=await Promise.all([ready("speech"),ready("handwriting_line")]);
  return NextResponse.json({available:speech||handwritingLine,speech,handwritingLine},{headers:noStore});
}

/** Bounded multipart parser: reject oversized streams before FormData buffers them. */
async function boundedFormData(request:Request){
  if(!request.headers.get("content-type")?.startsWith("multipart/form-data;"))throw new Error("input_format");
  const reported=Number(request.headers.get("content-length"));
  if(Number.isFinite(reported)&&reported>MAX_BODY)throw new Error("input_bound");
  if(!request.body)throw new Error("input_missing");
  const reader=request.body.getReader(),chunks:Uint8Array[]=[];let size=0;
  try{
    while(true){const {value,done}=await reader.read();if(done)break;size+=value.byteLength;if(size>MAX_BODY)throw new Error("input_bound");chunks.push(value);}
  }finally{reader.releaseLock();}
  const buffered=new Request(request.url,{method:"POST",headers:{"Content-Type":request.headers.get("content-type")!},body:Buffer.concat(chunks.map(item=>Buffer.from(item)))});
  return buffered.formData();
}

export async function POST(request:Request){
  const authorized=await access(request);if("response" in authorized)return authorized.response;
  if(running)return NextResponse.json({error:"Local recognition is busy. Enter your text or try again shortly."},{status:429,headers:noStore});
  running=true;
  try{
    const form=await boundedFormData(request),kind=form.get("kind"),file=form.get("asset");
    if((kind!=="speech"&&kind!=="handwriting_line")||!(file instanceof File)||file.size<1||file.size>5_000_000){
      return NextResponse.json({error:"Choose a supported image or WAV recording under 5 MB."},{status:400,headers:noStore});
    }
    const settings=configured(kind);
    if(!settings)return unavailable();
    const draft=await runLocalRecognition({...settings,asset:new Uint8Array(await file.arrayBuffer()),mime:file.type});
    const key=recognitionProofKey(process.env.DIANA_RECOGNITION_PROVENANCE_KEY);
    if(!key)return unavailable();
    return NextResponse.json({draft,proof:signRecognitionDraft(draft,authorized.user.id,key)},{headers:noStore});
  }catch{
    return unavailable();
  }finally{running=false;}
}
