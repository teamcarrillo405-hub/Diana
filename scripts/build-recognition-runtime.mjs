import {build} from "esbuild";
import {copyFile,mkdir,readFile,writeFile} from "node:fs/promises";
import {createHash} from "node:crypto";
import path from "node:path";
import {createRequire} from "node:module";
const root=process.cwd(),out=path.join(root,"public/vendor/diana-recognition");
const require=createRequire(path.join(root,"node_modules/@huggingface/transformers/package.json"));
const runtime=path.dirname(require.resolve("onnxruntime-web"));
await mkdir(out,{recursive:true});
await build({entryPoints:["lib/learning-engine/browser-recognition.worker.ts"],outfile:path.join(out,"worker.js"),bundle:true,platform:"browser",format:"esm",target:"es2022",minify:true,legalComments:"linked"});
const files=["ort-wasm-simd-threaded.mjs","ort-wasm-simd-threaded.wasm","ort-wasm-simd-threaded.jsep.mjs","ort-wasm-simd-threaded.jsep.wasm"];
for(const name of files)await copyFile(path.join(runtime,name),path.join(out,name));
const manifest={transformers:"3.8.1",files:{}};
for(const name of ["worker.js",...files]){const bytes=await readFile(path.join(out,name));manifest.files[name]={bytes:bytes.length,sha256:createHash("sha256").update(bytes).digest("hex")};}
await writeFile(path.join(out,"runtime-manifest.json"),JSON.stringify(manifest,null,2)+"\n");
console.log("Built same-origin offline recognition worker and WASM. Model weights are downloaded only after consent.");
