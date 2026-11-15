import {describe,it,expect} from "vitest";
import {loadCourseCatalog} from "./course-catalog";
import {buildCourseModule,catalogPublicationStates,validateCourseModule,courseIsAvailable} from "./course-publication";
describe("course publication content binding",()=>{
  it("includes prerequisites and answers in an immutable review snapshot",async()=>{
    const catalog=await loadCourseCatalog(),snapshot=await buildCourseModule(catalog.framework,catalog.activities,"english-middle-school");
    expect(snapshot.payload.framework.competencies.some(skill=>skill.id==="reading.comparison")).toBe(true);
    expect((await validateCourseModule(JSON.parse(JSON.stringify(snapshot.payload)))).contentHash).toBe(snapshot.contentHash);
    const changed=structuredClone(snapshot.payload);changed.activities[0].hints[0]+=" A new instruction.";
    expect((await validateCourseModule(changed)).contentHash).not.toBe(snapshot.contentHash);
  });
  it("does not carry approval to a changed version, and rejects duplicate states",async()=>{
    const catalog=await loadCourseCatalog(),snapshot=await buildCourseModule(catalog.framework,catalog.activities,"math-middle-school");
    const publication={course_id:snapshot.payload.courseId,content_hash:snapshot.contentHash,status:"published"};
    expect((await catalogPublicationStates(catalog.framework,catalog.activities,[publication])).get(publication.course_id)).toBe("published");
    expect((await catalogPublicationStates(catalog.framework,catalog.activities,[{...publication,content_hash:"a".repeat(64)}])).get(publication.course_id)).toBe("draft");
    await expect(catalogPublicationStates(catalog.framework,catalog.activities,[publication,publication])).rejects.toThrow("duplicate");
    expect(courseIsAvailable("withdrawn")).toBe(false);expect(courseIsAvailable("suspended")).toBe(false);
  });
  it("rejects course mismatches and claimed review flags",async()=>{
    const catalog=await loadCourseCatalog(),snapshot=await buildCourseModule(catalog.framework,catalog.activities,"science-middle-school");
    const changed=structuredClone(snapshot.payload);changed.activities[0].courseId="math-middle-school";
    await expect(validateCourseModule(changed)).rejects.toThrow("module_course_mismatch");
    await expect(validateCourseModule({...snapshot.payload,reviewed:true})).rejects.toThrow();
  });
});
