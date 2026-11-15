import { requireStudentContext } from "./student-auth.ts";
import { loadStudentSupportPersonalization } from "./student-support-context.ts";

/** Called only after withStudentSecurity has enforced the full resource policy. */
export async function loadStudentSupportFromRequest(request: Request, ownerId: string): Promise<string | null> {
  try {
    const auth = await requireStudentContext(request, { suppliedOwnerId: ownerId });
    if (auth instanceof Response) return null;
    return await loadStudentSupportPersonalization(auth.userClient, auth.ownerId);
  } catch {
    return null;
  }
}
