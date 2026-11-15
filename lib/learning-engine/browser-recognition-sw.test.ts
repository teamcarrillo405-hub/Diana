import {readFileSync} from "node:fs";
import vm from "node:vm";
import {expect,it,vi} from "vitest";
it("caches public recognition runtime while leaving private media and APIs outside the service worker cache",async()=>{
  const handlers=new Map<string,(event:unknown)=>void>();
  const cache={match:vi.fn(async()=>new Response("public runtime")),put:vi.fn()},fetch=vi.fn(async()=>new Response("public runtime"));
  vm.runInNewContext(readFileSync("public/sw.js","utf8"),{self:{addEventListener:(name:string,fn:(event:unknown)=>void)=>handlers.set(name,fn),location:{origin:"https://diana.example"}},URL,Response,fetch,caches:{open:async()=>cache}});
  const respondWith=vi.fn();handlers.get("fetch")!({request:{method:"GET",url:"https://diana.example/vendor/diana-recognition/worker.js",mode:"cors"},respondWith});expect(respondWith).toHaveBeenCalledOnce();await respondWith.mock.calls[0][0];
  for(const [method,url] of [["GET","https://diana.example/api/learning/local-recognition"],["POST","https://diana.example/api/learning/course-practice"],["GET","https://diana.example/classes/private/materials"],["GET","https://huggingface.co/Xenova/model"]]){const respond=vi.fn();handlers.get("fetch")!({request:{method,url,mode:"cors"},respondWith:respond});expect(respond).not.toHaveBeenCalled();}
});
