import {env,pipeline,RawImage} from "@huggingface/transformers";
import {prepareBrowserAssets,modelAssetUrl,verifyModelBytes} from "./browser-recognition-assets";
import {browserRecognitionModels,type BrowserRecognitionKind} from "./browser-recognition-models";
import {imageDimensions,readPcm16Wav} from "./browser-recognition-input";

// Bundled same-origin code and WASM only. Model bytes come exclusively from the
// verified custom cache. No inference fallback may fetch a model or student file.
env.allowLocalModels=true;env.allowRemoteModels=false;env.useBrowserCache=false;env.useFSCache=false;env.useCustomCache=true;
env.backends.onnx.wasm!.wasmPaths="/vendor/diana-recognition/";
env.backends.onnx.wasm!.numThreads=1;env.backends.onnx.wasm!.proxy=false;
let busy=false;
self.onmessage=async(event:MessageEvent<{operation:"prepare"|"recognize";kind:BrowserRecognitionKind;bytes?:ArrayBuffer;mime?:string}>)=>{
  if(busy)return;busy=true;
  try{
    const {operation,kind,bytes,mime}=event.data;
    if(!Object.hasOwn(browserRecognitionModels,kind)||!["prepare","recognize"].includes(operation))throw new Error("Unsupported recognition task.");
    const model=browserRecognitionModels[kind];
    const cache=await prepareBrowserAssets(kind,operation==="prepare",percent=>self.postMessage({type:"progress",percent}));
    const runtimeFetch=globalThis.fetch.bind(globalThis);
    globalThis.fetch=async(request,options)=>{
      const url=new URL(typeof request==="string"?request:request instanceof URL?request.href:request.url,self.location.href);
      const method=options?.method??(request instanceof Request?request.method:"GET");
      const allowed=new Set(["ort-wasm-simd-threaded.mjs","ort-wasm-simd-threaded.wasm","ort-wasm-simd-threaded.jsep.mjs","ort-wasm-simd-threaded.jsep.wasm"]);
      if(method!=="GET"||url.origin!==self.location.origin||url.search||!url.pathname.startsWith("/vendor/diana-recognition/")||!allowed.has(url.pathname.slice("/vendor/diana-recognition/".length)))return new Response(null,{status:404});
      return runtimeFetch(request,{...options,credentials:"omit",referrerPolicy:"no-referrer"});
    };
    env.customCache={
      match:async(request:Request|string|URL)=>{
        const url=typeof request==="string"?request:request instanceof URL?request.href:request.url;
        const name=Object.keys(model.files).find(name=>modelAssetUrl(kind,name)===url);if(!name)return undefined;
        const response=await cache.match(url);if(!response)return undefined;
        const buffer=await response.arrayBuffer();await verifyModelBytes(buffer,model.files[name as keyof typeof model.files]);return new Response(buffer);
      },put:async()=>{throw new Error("Unexpected model cache write.");},
    };
    const engine=await pipeline(kind==="speech"?"automatic-speech-recognition":"image-to-text",model.id,{revision:model.revision,dtype:"q8",device:"wasm",local_files_only:true});
    if(operation==="prepare"){await engine.dispose();self.postMessage({type:"ready"});return;}
    if(!bytes||!bytes.byteLength||bytes.byteLength>5_000_000)throw new Error("Choose a file under 5 MB.");
    let output:unknown;
    if(kind==="speech"){
      if(mime!=="audio/wav")throw new Error("Choose a PCM WAV recording.");
      const audio=readPcm16Wav(bytes);
      // Pipeline types are an overloaded union; the task-specific input is
      // validated above before crossing this library boundary.
      output=await (engine as (input:Float32Array,options:object)=>Promise<unknown>)(audio,{max_new_tokens:256,chunk_length_s:25,stride_length_s:4,do_sample:false});
    }else{
      if(mime!=="image/png"&&mime!=="image/jpeg")throw new Error("Choose a cropped handwritten line.");
      const dimensions=imageDimensions(bytes,mime);
      const image=await RawImage.fromBlob(new Blob([bytes],{type:mime}));
      if(image.width!==dimensions.width||image.height!==dimensions.height||image.width*image.height>4_000_000)throw new Error("The image dimensions changed while decoding.");
      output=await (engine as (input:RawImage,options:object)=>Promise<unknown>)(image,{max_new_tokens:128,do_sample:false});
    }
    await engine.dispose();
    const text=kind==="speech"?(output as {text?:string}).text:(output as {generated_text?:string}[])?.[0]?.generated_text;
    if(typeof text!=="string"||!text.trim()||text.length>4000)throw new Error("No usable transcription. Enter the text yourself.");
    self.postMessage({type:"result",text:text.trim(),kind,modelId:model.id,revision:model.revision,confirmed:false,provenance:"browser_draft_unverified"});
  }catch{self.postMessage({type:"error",message:"Recognition could not finish on this device. Check the download and file format, or enter the text yourself."});}
  finally{busy=false;}
};
