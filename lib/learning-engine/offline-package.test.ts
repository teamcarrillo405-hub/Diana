import {describe,it,expect} from "vitest";
import {structureDocument} from "./curriculum";
import {packageHash,validateOfflinePackage,offlineSearch} from "./offline-package";

describe("offline packages",()=>{
  it("checks account, device, expiration and content integrity",async()=>{
    const owner="00000000-0000-4000-8000-000000000001";
    const assignment="00000000-0000-4000-8000-000000000002";
    const device="00000000-0000-4000-8000-000000000003";
    const document=await structureDocument({ownerId:owner,assignmentId:assignment,classId:null,documentId:"book",
      title:"Geometry",edition:"1",subject:"math",instructionRights:"owner_provided"},
      [{page:1,pageLabel:"p1",text:"The area of a rectangle equals length times width.",interpretation:"original"}]);
    const base={version:"offline-learning-v1" as const,id:crypto.randomUUID(),ownerId:owner,deviceId:device,
      assignmentId:assignment,classId:null,title:"Geometry",createdAt:new Date().toISOString(),
      expiresAt:new Date(Date.now()+86400000).toISOString(),chunks:document.chunks,exercises:[]};
    const bundle={...base,hash:await packageHash(base)};
    expect(await validateOfflinePackage(bundle,owner,device)).not.toBeNull();
    expect(await validateOfflinePackage(bundle,assignment,device)).toBeNull();
    expect(await validateOfflinePackage(bundle,owner,assignment)).toBeNull();
    expect(await validateOfflinePackage({...bundle,title:"Changed"},owner,device)).toBeNull();
    expect(await validateOfflinePackage(bundle,owner,device,Date.now()+2*86400000)).toBeNull();
    expect(offlineSearch(bundle,"rectangle area").status).toBe("matched");
  });
});
