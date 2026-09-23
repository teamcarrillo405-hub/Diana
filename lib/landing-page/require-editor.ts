import "server-only";

import { isLandingPageEditor } from "@/lib/landing-page/access";
import { createClient } from "@/lib/supabase/server";

export async function requireLandingPageEditorUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isLandingPageEditor(user)) {
    throw new Error("Landing page editor access is not available.");
  }

  return user;
}
