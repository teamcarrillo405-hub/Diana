import {beforeEach,describe,expect,it,vi} from "vitest";

const mock=vi.hoisted(()=>({user:{id:"owner"} as {id:string}|null,rows:{} as Record<string,unknown>,filters:[] as unknown[][],download:vi.fn()}));
vi.mock("@/lib/supabase/server",()=>({createClient:async()=>({
  auth:{getUser:async()=>({data:{user:mock.user}})},
  from:(table:string)=>{
    const chain={select:()=>chain,eq:(key:string,value:unknown)=>{mock.filters.push([table,key,value]);return chain;},maybeSingle:async()=>({data:mock.rows[table]??null})};
    return chain;
  },
  storage:{from:()=>({download:mock.download})},
})}));
import {GET} from "./route";
const assignmentId="0a56fa43-3e0a-4fc1-9f43-dc65c529f080";
const sourceId="4e743a64-5a1b-462c-a6e5-651a9b87983c";
const request=()=>new Request(`http://localhost/api/materials/source?assignmentId=${assignmentId}&sourceId=${sourceId}`);

beforeEach(()=>{
  mock.user={id:"owner"};mock.filters=[];
  mock.rows={assignments:{class_id:"course"},classes:{id:"course"},assignment_sources:{storage_key:"owner/file.pdf",mime_type:"application/pdf"}};
  mock.download.mockReset().mockResolvedValue({data:new Blob(["%PDF-test"]),error:null});
});
describe("original material access",()=>{
  it("streams an owned file without requiring AI rollout and binds every relationship",async()=>{
    const response=await GET(request());
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(await response.text()).toBe("%PDF-test");
    expect(mock.filters).toEqual(expect.arrayContaining([
      ["assignments","id",assignmentId],["assignments","owner_id","owner"],
      ["classes","id","course"],["classes","owner_id","owner"],
      ["assignment_sources","id",sourceId],["assignment_sources","assignment_id",assignmentId],["assignment_sources","owner_id","owner"],
    ]));
  });
  it("denies unauthenticated reads",async()=>{mock.user=null;expect((await GET(request())).status).toBe(401);expect(mock.download).not.toHaveBeenCalled();});
  it.each(["assignments","classes"])("does not download when the owned %s relationship is missing",async(table)=>{
    mock.rows[table]=null;expect((await GET(request())).status).toBe(404);expect(mock.download).not.toHaveBeenCalled();
  });
  it.each([
    {storage_key:"someone-else/file.pdf",mime_type:"application/pdf"},
    {storage_key:"owner/file.html",mime_type:"text/html"},
  ])("rejects foreign paths and active content",async(source)=>{
    mock.rows.assignment_sources=source;expect((await GET(request())).status).toBe(404);expect(mock.download).not.toHaveBeenCalled();
  });
});
