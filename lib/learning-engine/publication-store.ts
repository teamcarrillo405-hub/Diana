import "server-only";
import { buildCourseModule, catalogPublicationStates } from "./course-publication";
import { loadCourseCatalog } from "./course-catalog";
import type { createLearningClient } from "./server";
import type {Json} from "@/lib/supabase/types";
export async function loadCoursePublications(client: Awaited<ReturnType<typeof createLearningClient>>) {
  const catalog = await loadCourseCatalog();
  const expected = await Promise.all([...new Set(catalog.activities.map(item=>item.courseId))].map(async courseId=>{
    const snapshot=await buildCourseModule(catalog.framework,catalog.activities,courseId);
    return {courseId,contentHash:snapshot.contentHash,payload:snapshot.payload};
  }));
  const { data, error } = await client.rpc("learning_course_publications", {p_expected:expected as unknown as Json});
  if (error || !Array.isArray(data)) throw new Error("publication_store_unavailable");
  return catalogPublicationStates(catalog.framework, catalog.activities, data);
}
