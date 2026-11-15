import {browserRecognitionModels,type BrowserRecognitionKind} from "./browser-recognition-models";
export {browserRecognitionModels} from "./browser-recognition-models";
export {browserModelCached,removeBrowserModel} from "./browser-recognition-assets";

export function supportsBrowserRecognition(){return typeof window!=="undefined"&&window.isSecureContext&&typeof Worker!=="undefined"&&typeof WebAssembly!=="undefined"&&typeof caches!=="undefined"&&!!globalThis.crypto?.subtle&&(!("deviceMemory" in navigator)||(navigator as Navigator&{deviceMemory:number}).deviceMemory>=4);}
let active=false;
export async function runBrowserRecognition(input:{kind:BrowserRecognitionKind;operation:"prepare"|"recognize";file?:File;signal:AbortSignal;onProgress?:(percent:number)=>void}):Promise<string|null>{
  if(!supportsBrowserRecognition())throw new Error("Offline recognition is unavailable on this browser. Enter the text yourself.");
  if(active)throw new Error("Another local reading is finishing. Please try again.");
  if(input.signal.aborted)throw new DOMException("Canceled","AbortError");
  if(input.operation==="recognize"&&(!input.file||!input.file.size||input.file.size>5_000_000))throw new Error("Choose a file under 5 MB.");
  active=true;
  try{
    const bytes=input.file?await input.file.arrayBuffer():undefined;
    if(input.signal.aborted)throw new DOMException("Canceled","AbortError");
    return await new Promise((resolve,reject)=>{
      const worker=new Worker("/vendor/diana-recognition/worker.js",{type:"module"});let settled=false;
      const finish=(error?:Error,value:string|null=null)=>{if(settled)return;settled=true;clearTimeout(timer);input.signal.removeEventListener("abort",abort);worker.terminate();if(error)reject(error);else resolve(value);};
      const abort=()=>finish(new DOMException("Canceled","AbortError"));
      const timer=setTimeout(()=>finish(new Error("Local reading reached its time limit. Try a shorter file or enter the text yourself.")),input.operation==="prepare"?600_000:120_000);
      input.signal.addEventListener("abort",abort,{once:true});
      worker.onerror=()=>finish(new Error("Local reading could not start on this browser. Enter the text yourself."));
      worker.onmessage=event=>{
        const value=event.data;
        if(value?.type==="progress"&&Number.isFinite(value.percent))input.onProgress?.(Math.max(0,Math.min(100,value.percent)));
        else if(value?.type==="ready"&&input.operation==="prepare")finish();
        else if(value?.type==="result"&&input.operation==="recognize"&&value.kind===input.kind&&value.modelId===browserRecognitionModels[input.kind].id&&value.revision===browserRecognitionModels[input.kind].revision&&value.confirmed===false&&typeof value.text==="string"&&value.text.trim()&&value.text.length<=4000)finish(undefined,value.text);
        else if(value?.type==="error")finish(new Error("Local reading could not finish. Check the download and file format, or enter the text yourself."));
      };
      try{worker.postMessage({operation:input.operation,kind:input.kind,bytes,mime:input.file?.type},bytes?[bytes]:[]);}
      catch{finish(new Error("Local reading could not accept this file. Enter the text yourself."));}
    });
  }finally{active=false;}
}
