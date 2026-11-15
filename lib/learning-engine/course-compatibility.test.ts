import {describe,it,expect} from "vitest";
import baseline from "@/content/curriculum/course-practice-v2-baseline.json";
import {loadCourseCatalog} from "./course-catalog";
describe("saved course compatibility",()=>{
  it("keeps all original twenty activity versions when new course modules are added",async()=>{
    const {activities}=await loadCourseCatalog();
    expect(baseline).toHaveLength(20);
    for(const original of baseline)expect(activities.find(item=>item.id===original.activityId)?.versionId).toBe(original.versionId);
  });
});
