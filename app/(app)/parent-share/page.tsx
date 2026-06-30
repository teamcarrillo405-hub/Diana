import { redirect } from "next/navigation";

// /parent-share merged into the tabbed /sharing surface (Parent tab).
export default function ParentShareRedirect() {
  redirect("/sharing?tab=parent");
}
