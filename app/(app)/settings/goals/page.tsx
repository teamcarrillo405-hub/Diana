import { redirect } from "next/navigation";

export default function StudyGoalsPage() {
  redirect("/settings?section=goals");
}
