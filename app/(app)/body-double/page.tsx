import { redirect } from "next/navigation";

// Body-double merged into the Focus session surface (With-others mode).
export default function BodyDoubleRedirect() {
  redirect("/timer?with=others");
}
