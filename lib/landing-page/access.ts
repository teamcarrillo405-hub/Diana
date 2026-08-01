import type { User } from "@supabase/supabase-js";

function configuredEditorEmails(): Set<string> {
  return new Set(
    (process.env.DIANA_LANDING_EDITOR_EMAILS ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function isLandingPageEditor(user: User | null): boolean {
  if (!user) return false;
  if (process.env.NODE_ENV !== "production") return true;

  const appRole =
    typeof user.app_metadata?.role === "string"
      ? user.app_metadata.role.toLowerCase()
      : "";
  const explicitlyAllowed =
    user.app_metadata?.landing_editor === true
    || ["admin", "owner", "designer"].includes(appRole);
  const emailAllowed =
    typeof user.email === "string"
    && configuredEditorEmails().has(user.email.toLowerCase());

  return explicitlyAllowed || emailAllowed;
}
