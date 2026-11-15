import {readFile} from "node:fs/promises";
import path from "node:path";
const root=path.resolve("supabase/functions");
const start=path.resolve(root,process.argv[2]??"learning-embed/index.ts");
const files=[];
const seen=new Set();
async function visit(filename){
  if(!filename.startsWith(root+path.sep))throw new Error("Edge dependency escaped the function directory.");
  if(seen.has(filename))return;
  seen.add(filename);
  const content=await readFile(filename,"utf8");
  files.push({name:path.relative(path.dirname(root),filename).replaceAll("\\","/"),content});
  for(const match of content.matchAll(/(?:from\s+|import\s*\(\s*|import\s+)["'](\.[^"']+)["']/g)){
    await visit(path.resolve(path.dirname(filename),match[1]));
  }
}
await visit(start);
process.stdout.write(JSON.stringify({entrypoint_path:path.relative(path.dirname(root),start).replaceAll("\\","/"),files}));
