import {mkdir,copyFile} from "node:fs/promises";
import {createRequire} from "node:module";
import path from "node:path";
const require=createRequire(import.meta.url);
const pdfRoot=path.dirname(require.resolve("pdfjs-dist/package.json"));
const target=path.resolve("public/assets/learning");
await mkdir(target,{recursive:true});
await copyFile(path.join(pdfRoot,"legacy/build/pdf.worker.min.mjs"),path.join(target,"pdf-worker-6.3.289.min.mjs"));
