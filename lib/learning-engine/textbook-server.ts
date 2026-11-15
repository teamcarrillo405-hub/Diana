import "server-only";
import {readFile} from "node:fs/promises";
import path from "node:path";
import {gunzipSync} from "node:zlib";
import {createHash} from "node:crypto";
import {z} from "zod";
import {chunkSchema,documentVersionSchema} from "./contracts";
import {PRECALCULUS_BOOK as book} from "./textbook-catalog";
import {rankGraphTextbookPassages} from "./textbook-graph";

const root=path.join(process.cwd(),"content/textbooks",book.assetDirectory);
const chapterSchema=z.object({number:z.number().int().min(1).max(9),title:z.string(),pages:z.number().int().positive(),assetHash:z.string().regex(/^[a-f0-9]{64}$/),indexHash:z.string().regex(/^[a-f0-9]{64}$/)});
const manifestSchema=z.object({bookId:z.literal(book.id),chapters:z.array(chapterSchema).length(9),allChaptersIndexed:z.literal(true),pages:z.number().int().positive()});
const indexSchema=z.object({bookId:z.literal(book.id),chapter:z.number().int().min(1).max(9),version:documentVersionSchema,chunks:z.array(chunkSchema).max(10000)});
export type TextbookChapterSummary=z.infer<typeof chapterSchema>;

export async function textbookManifest(){
  const manifest=manifestSchema.parse(JSON.parse(await readFile(path.join(root,"manifest.json"),"utf8")));
  if(new Set(manifest.chapters.map(chapter=>chapter.number)).size!==9)throw new Error("Textbook manifest repeats a chapter.");
  return manifest;
}
const cached=new Map<string,Promise<z.infer<typeof indexSchema>>>();
async function chapterIndex(chapter:TextbookChapterSummary){
  const key=chapter.indexHash;
  let result=cached.get(key);
  if(!result){
    result=(async()=>{
      const bytes=await readFile(path.join(root,`chapter-${chapter.number}.json.gz`));
      if(createHash("sha256").update(bytes).digest("hex")!==chapter.indexHash)throw new Error("Textbook index changed.");
      const index=indexSchema.parse(JSON.parse(gunzipSync(bytes,{maxOutputLength:24_000_000}).toString("utf8")));
      if(index.chapter!==chapter.number||index.version.sourceAssetHash!==chapter.assetHash||index.chunks.some(chunk=>chunk.versionId!==index.version.id))throw new Error("Textbook version mismatch.");
      return index;
    })();
    cached.set(key,result);result.catch(()=>cached.delete(key));
  }
  return result;
}
/** No provider call, embeddings or private student index are needed for this public reference. */
export async function loadReferenceTextbookChapters(chapterNumber?:number){
  if(chapterNumber!==undefined&&(!Number.isInteger(chapterNumber)||chapterNumber<1||chapterNumber>9))throw new Error("Choose a chapter from this book.");
  const manifest=await textbookManifest();
  const chapters=manifest.chapters.filter(chapter=>chapterNumber===undefined||chapter.number===chapterNumber);
  return Promise.all(chapters.map(chapterIndex));
}
export async function searchReferenceTextbook(query:string,chapterNumber?:number){
  const indexes=await loadReferenceTextbookChapters(chapterNumber);
  const matches=await rankGraphTextbookPassages(query,indexes.map(index=>({number:index.chapter,versionId:index.version.id,chunks:index.chunks})),{chapter:chapterNumber});
  return matches.map(({chapter,anchor})=>({id:anchor.versionId+":"+anchor.blockId,chapter,page:anchor.location.page,pageLabel:anchor.location.pageLabel,quote:anchor.exactText}));
}
