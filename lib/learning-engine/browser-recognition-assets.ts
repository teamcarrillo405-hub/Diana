import {browserRecognitionModels,type BrowserRecognitionKind} from "./browser-recognition-models";

export const RECOGNITION_CACHE="diana-recognition-models-v1";
export const modelAssetUrl=(kind:BrowserRecognitionKind,name:string)=>{
  const model=browserRecognitionModels[kind];
  if(!Object.hasOwn(model.files,name))throw new Error("Unrecognized model asset.");
  return `https://huggingface.co/${model.id}/resolve/${model.revision}/${name}`;
};
export async function verifyModelBytes(bytes:ArrayBuffer,expected:{bytes:number;sha256:string}){
  if(bytes.byteLength!==expected.bytes)throw new Error("Model file size did not match. Download again.");
  const digest=Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",bytes)),n=>n.toString(16).padStart(2,"0")).join("");
  if(digest!==expected.sha256)throw new Error("Model file could not be verified. Download again.");
}
/** Downloads contain only public model URLs. Student files never enter CacheStorage. */
export async function prepareBrowserAssets(kind:BrowserRecognitionKind,download:boolean,onProgress:(percent:number)=>void){
  const cache=await caches.open(RECOGNITION_CACHE),model=browserRecognitionModels[kind];let completed=0;
  for(const [name,expected] of Object.entries(model.files)){
    const url=modelAssetUrl(kind,name);let response=await cache.match(url);let bytes:ArrayBuffer|undefined;
    if(response){
      bytes=await response.arrayBuffer();
      try{await verifyModelBytes(bytes,expected);}catch{await cache.delete(url);bytes=undefined;response=undefined;}
    }
    if(!bytes){
      if(!download)throw new Error("Download this model before reading offline.");
      response=await fetch(url,{credentials:"omit",referrerPolicy:"no-referrer",cache:"no-store",signal:AbortSignal.timeout(120_000)});
      if(!response.ok||!response.body)throw new Error("Model download paused. Check your connection and try again.");
      const reader=response.body.getReader(),chunks:Uint8Array[]=[];let size=0;
      while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>expected.bytes){await reader.cancel();throw new Error("Model download exceeded its expected size.");}chunks.push(value);onProgress(Math.floor(100*(completed+size)/model.bytes));}
      const joined=new Uint8Array(size);let offset=0;for(const chunk of chunks){joined.set(chunk,offset);offset+=chunk.byteLength;}
      bytes=joined.buffer;await verifyModelBytes(bytes,expected);
      await cache.put(url,new Response(bytes,{headers:{"Content-Type":name.endsWith(".json")?"application/json":"application/octet-stream"}}));
    }
    completed+=expected.bytes;onProgress(Math.floor(100*completed/model.bytes));
  }
  return cache;
}

export async function browserModelCached(kind:BrowserRecognitionKind){
  const cache=await caches.open(RECOGNITION_CACHE);
  for(const name of Object.keys(browserRecognitionModels[kind].files))if(!await cache.match(modelAssetUrl(kind,name)))return false;
  return true;
}
export async function removeBrowserModel(kind:BrowserRecognitionKind){
  const cache=await caches.open(RECOGNITION_CACHE);
  await Promise.all(Object.keys(browserRecognitionModels[kind].files).map(name=>cache.delete(modelAssetUrl(kind,name))));
}
