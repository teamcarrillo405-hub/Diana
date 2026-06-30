import { redirect } from "next/navigation";

// /templates was folded into the new-assignment flow (its "Start from a template"
// picker). Redirect the old URL instead of 404ing, matching the other merged
// routes (/parent-share, /teacher-share, /body-double).
export default function TemplatesRedirect() {
  redirect("/assignments/new");
}
