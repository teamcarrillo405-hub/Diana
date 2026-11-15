import { get,set,keys } from "idb-keyval";
import { offlineOwner,queueOfflineNoteSave,registerOfflineSync } from "@/lib/offline/store";
import {z} from "zod";
import { validateOfflinePackage,type OfflinePackage } from "./offline-package";

const DEVICE_KEY="diana-learning-device-id";
export function learningDeviceId():string{
  let id=localStorage.getItem(DEVICE_KEY);
  if(!id || !/^[a-f0-9-]{36}$/i.test(id)){id=crypto.randomUUID();localStorage.setItem(DEVICE_KEY,id);}
  return id;
}
export async function saveOfflinePackage(value:unknown):Promise<void>{
  const owner=await offlineOwner();
  const bundle=owner?await validateOfflinePackage(value,owner,learningDeviceId()):null;
  if(!bundle) throw new Error("This study pack could not be checked for your account.");
  await set("diana-offline:v2:"+owner+":learning-package:"+bundle.id,bundle);
}
export async function listOfflinePackages():Promise<OfflinePackage[]>{
  const owner=await offlineOwner(); if(!owner)return [];
  const prefix="diana-offline:v2:"+owner+":learning-package:";
  const values=await Promise.all((await keys()).filter((key):key is string=>typeof key==="string"&&key.startsWith(prefix)).map(key=>get(key)));
  const packages=await Promise.all(values.map(value=>validateOfflinePackage(value,owner,learningDeviceId())));
  return packages.filter((value):value is OfflinePackage=>value!==null);
}

const draftSchema=z.object({answer:z.string().max(4000),updatedAt:z.string().datetime()}).strict();
export async function loadPracticeDraft(bundle:OfflinePackage,exerciseId:string){
  if(await offlineOwner()!==bundle.ownerId)return null;
  const parsed=draftSchema.safeParse(await get("diana-offline:v2:"+bundle.ownerId+":learning-draft:"+bundle.id+":"+exerciseId));
  return parsed.success?parsed.data:null;
}
export async function savePracticeDraft(bundle:OfflinePackage,exerciseId:string,answer:string){
  if(await offlineOwner()!==bundle.ownerId)throw new Error("Sign in to the account that saved this pack.");
  const exercise=bundle.exercises.find(item=>item.id===exerciseId);
  if(!exercise)throw new Error("Choose a question from this pack.");
  const draft=draftSchema.parse({answer,updatedAt:new Date().toISOString()});
  await set("diana-offline:v2:"+bundle.ownerId+":learning-draft:"+bundle.id+":"+exerciseId,draft);
  // Sync a labeled practice note, never a mastery event or assignment status.
  await queueOfflineNoteSave({tempId:"practice:"+bundle.id+":"+exerciseId,noteId:null,title:("Practice: "+bundle.title).slice(0,200),
    bodyText:exercise.prompt+"\n\n"+answer,classId:null,assignmentId:bundle.assignmentId,source:"manual",updatedAt:draft.updatedAt},bundle.ownerId);
  window.dispatchEvent(new Event("diana-request-offline-sync"));
  void registerOfflineSync();
  return draft;
}
