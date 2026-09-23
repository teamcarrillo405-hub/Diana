import { redirect } from "next/navigation";

// Teacher sharing is no longer a student-facing destination.
export default function TeacherShareRedirect() {
  redirect("/sharing");
}
