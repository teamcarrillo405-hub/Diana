import {NextResponse} from "next/server";
import {z} from "zod";
import {createClient} from "@/lib/supabase/server";
import {PRECALCULUS_BOOK} from "@/lib/learning-engine/textbook-catalog";
import {searchReferenceTextbook} from "@/lib/learning-engine/textbook-server";

const querySchema=z.object({bookId:z.literal(PRECALCULUS_BOOK.id),q:z.string().trim().min(2).max(300),chapter:z.coerce.number().int().min(1).max(9).optional()}).strict();
export async function GET(request:Request){
  const client=await createClient();
  const {data:{user}}=await client.auth.getUser();
  if(!user)return NextResponse.json({error:"Sign in to search your reference book."},{status:401});
  const query=querySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if(!query.success)return NextResponse.json({error:"Choose a book and add a search."},{status:400});
  try{
    const matches=await searchReferenceTextbook(query.data.q,query.data.chapter);
    return NextResponse.json({matches,method:"keyword",modelCalls:0},{headers:{"Cache-Control":"private, no-store"}});
  }catch{
    return NextResponse.json({error:"Book search is unavailable. You can still read the original chapters."},{status:503});
  }
}
