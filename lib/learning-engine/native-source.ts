import "server-only";
import {extractPdfBatch} from "./pdf";

const MAX_NATIVE_PAGES=50;
const MAX_NATIVE_TEXT=50_000;
export type NativeAssignmentSource =
  | {status:"extracted";text:string;pageCount:number;reviewRequired:true}
  | {status:"provider_required";reason:"unreadable"|"sparse"|"page_limit"|"text_limit"};

/** Copies the native text layer only. It never certifies visual meaning or creates exercises. */
export async function extractNativeAssignmentSource(bytes:Uint8Array):Promise<NativeAssignmentSource>{
  try{
    const result=await extractPdfBatch(bytes,1,MAX_NATIVE_PAGES);
    if(result.totalPages>MAX_NATIVE_PAGES||result.pages.length!==result.totalPages)return {status:"provider_required",reason:"page_limit"};
    if(result.pages.some(page=>page.interpretation!=="original"||page.text.trim().length<40||/\uFFFD/.test(page.text)))return {status:"provider_required",reason:"sparse"};
    const text=result.pages.map(page=>`[Page ${page.page}]\n${page.text.trim()}`).join("\n\n");
    if(text.length>MAX_NATIVE_TEXT)return {status:"provider_required",reason:"text_limit"};
    if(!text.trim())return {status:"provider_required",reason:"unreadable"};
    return {status:"extracted",text,pageCount:result.totalPages,reviewRequired:true};
  }catch{return {status:"provider_required",reason:"unreadable"};}
}
