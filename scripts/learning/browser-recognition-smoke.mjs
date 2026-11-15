// Real Chromium/WASM execution on original synthetic fixtures, never student data.
import {createServer} from "node:http";
import {readFile,writeFile} from "node:fs/promises";
import path from "node:path";
import {chromium} from "@playwright/test";
const root=process.cwd(),publicRoot=path.join(root,"public"),out=path.join(root,"artifacts/learning-engine/research/browser-recognition");
const html="<!doctype html><html><body><p>Local browser recognition engineering smoke.</p></body></html>";
const server=createServer(async(req,res)=>{
  try{
    res.setHeader("Content-Security-Policy","default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; worker-src 'self' blob:; connect-src 'self' https://huggingface.co https://cas-bridge.xethub.hf.co https://cdn-lfs.hf.co https://us.aws.cdn.hf.co; img-src 'self' blob: data:; object-src 'none'");
    const url=new URL(req.url,"http://localhost");
    if(url.pathname==="/"||url.pathname==="/offline"){res.setHeader("Content-Type","text/html");res.end(html);return;}
    const target=path.resolve(publicRoot,"."+url.pathname);
    if(!target.startsWith(publicRoot+path.sep)||!(url.pathname.startsWith("/vendor/diana-recognition/")||url.pathname==="/sw.js")){res.writeHead(404);res.end();return;}
    res.setHeader("Content-Type",target.endsWith(".wasm")?"application/wasm":target.endsWith(".json")?"application/json":"text/javascript");
    res.setHeader("Cache-Control","public,max-age=86400");const body=await readFile(target);
    res.end(body);
  }catch{res.writeHead(404);res.end();}
});
await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true});
try{
  const context=await browser.newContext(),page=await context.newPage();const requests=[];
  page.on("request",req=>requests.push({method:req.method(),origin:new URL(req.url()).origin,runtimePath:new URL(req.url()).pathname.startsWith("/vendor/diana-recognition/")?new URL(req.url()).pathname:undefined}));
  page.on("requestfailed",req=>console.error("Request unavailable:",new URL(req.url()).origin,new URL(req.url()).pathname,req.failure()?.errorText));
  page.on("console",msg=>{if(msg.type()==="error")console.error("Browser error:",msg.text().slice(0,400));});
  await page.goto(origin);await page.evaluate(async()=>{await navigator.serviceWorker.register("/sw.js");await navigator.serviceWorker.ready;});await page.reload();
  async function execute(operation,kind,asset,mime){
    const base64=asset?(await readFile(asset)).toString("base64"):undefined;
    return page.evaluate(({operation,kind,base64,mime})=>new Promise((resolve,reject)=>{
      const worker=new Worker("/vendor/diana-recognition/worker.js",{type:"module"});const start=performance.now();
      const timer=setTimeout(()=>{worker.terminate();reject(new Error("Browser smoke deadline"));},600000);
      worker.onerror=event=>{clearTimeout(timer);worker.terminate();reject(new Error(event.message));};
      worker.onmessage=event=>{if(event.data.type==="progress")return;clearTimeout(timer);worker.terminate();resolve({...event.data,wallMs:Math.round(performance.now()-start)});};
      const bytes=base64?Uint8Array.from(atob(base64),char=>char.charCodeAt(0)).buffer:undefined;
      worker.postMessage({operation,kind,bytes,mime},bytes?[bytes]:[]);
    }),{operation,kind,base64,mime});
  }
  const preparation=[];
  for(const kind of ["speech","handwriting_line"]){const result=await execute("prepare",kind);console.log(JSON.stringify({phase:"prepare",kind,...result}));preparation.push({kind,...result});if(result.type!=="ready")throw new Error("Browser model preparation did not complete");}
  const requestsBeforeOffline=requests.length;await context.setOffline(true);
  const speech=await execute("recognize","speech",path.join(root,"artifacts/learning-engine/research/local-speech-execution/biology-zira.wav"),"audio/wav");console.log(JSON.stringify({phase:"offline",kind:"speech",...speech}));
  const handwriting=await execute("recognize","handwriting_line",path.join(root,"artifacts/learning-engine/research/local-handwriting-execution/synthetic-line.png"),"image/png");console.log(JSON.stringify({phase:"offline",kind:"handwriting_line",...handwriting}));
  if(speech.type!=="result"||handwriting.type!=="result")throw new Error("Offline recognition did not return real results");
  const report={version:"browser-recognition-synthetic-smoke-v1",at:new Date().toISOString(),browser:browser.version(),preparation,speech,handwriting,productionEquivalentWorkerCsp:true,networkOfflineDuringInference:true,requestsBeforeOffline,requestsAfterOffline:requests.length,requestOrigins:[...new Set(requests.map(r=>r.origin))],runtimePaths:[...new Set(requests.map(r=>r.runtimePath).filter(Boolean))],nonGetRequests:requests.filter(r=>r.method!=="GET").length,studentCases:0,humanReviewedCases:0,qualification:"Original Windows TTS and font-rendered line. Real Chromium WASM execution and cached offline use only; no student accuracy or educational benefit claim."};
  await writeFile(path.join(out,`smoke-${Date.now()}.json`),JSON.stringify(report,null,2)+"\n",{flag:"wx"});
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}

