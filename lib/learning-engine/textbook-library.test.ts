import {afterEach,expect,it,vi} from "vitest";
import {readFile} from "node:fs/promises";
import {createHash} from "node:crypto";
import path from "node:path";
import {PRECALCULUS_BOOK as book,textbookAssetPath,textbookChapterUrl} from "./textbook-catalog";
vi.mock("server-only",()=>({}));
import {searchReferenceTextbook,textbookManifest} from "./textbook-server";

afterEach(()=>vi.restoreAllMocks());
it("ships all nine original chapters with pinned file hashes",async()=>{
  const manifest=await textbookManifest();
  expect(manifest.chapters.map(chapter=>chapter.number)).toEqual([1,2,3,4,5,6,7,8,9]);
  expect(manifest.pages).toBe(640);
  for(const chapter of manifest.chapters){
    const bytes=await readFile(path.join(process.cwd(),"public",textbookAssetPath(chapter.number)));
    expect(bytes.subarray(0,5).toString()).toBe("%PDF-");
    expect(createHash("sha256").update(bytes).digest("hex")).toBe(chapter.assetHash);
  }
  expect(()=>textbookChapterUrl(10)).toThrow();expect(()=>textbookAssetPath(-1)).toThrow();
});
it("finds source passages in every chapter with no network or model calls",async()=>{
  const fetch=vi.spyOn(globalThis,"fetch").mockRejectedValue(new Error("No model or network allowed"));
  for(const chapter of book.chapters){
    const matches=await searchReferenceTextbook(chapter.queries[0],chapter.number);
    expect(matches.length).toBeGreaterThan(0);
    expect(matches.every(match=>match.chapter===chapter.number&&match.page>=1&&match.quote.length>0)).toBe(true);
  }
  expect(await searchReferenceTextbook("qzxvnotaword" )).toEqual([]);
  const logarithms=await searchReferenceTextbook("logarithmic properties");
  expect(logarithms[0].chapter).toBe(4);
  expect(logarithms[0].quote.toLowerCase()).toContain("logarithmic");
  expect(logarithms[0].quote.toLowerCase()).toContain("properties");
  expect(new Set(logarithms.map(match=>match.id)).size).toBe(logarithms.length);
  expect(fetch).not.toHaveBeenCalled();
});
