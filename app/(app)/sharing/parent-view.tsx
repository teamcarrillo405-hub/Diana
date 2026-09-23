import { loadProfile } from "@/lib/profile";

import { ParentDigestForm } from "../parent-share/parent-digest-form";

export async function ParentSharingView() {
  const profile = await loadProfile();
  const prefs = (profile?.notification_preferences ?? {}) as {
    parentDigest?: { email?: string; enabled?: boolean };
  };

  return (
    <div>
      <ParentDigestForm
        initialEmail={prefs.parentDigest?.email ?? ""}
        initialEnabled={Boolean(prefs.parentDigest?.enabled)}
      />
    </div>
  );
}
