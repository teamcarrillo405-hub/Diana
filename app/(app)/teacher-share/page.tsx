import { redirect } from "next/navigation";

// /teacher-share merged into the tabbed /sharing surface (Teacher tab).
export default function TeacherShareRedirect() {
  redirect("/sharing?tab=teacher");
}
