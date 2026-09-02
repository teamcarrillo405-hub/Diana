import { redirect } from "next/navigation";

export default function VoicePage() {
  redirect("/notes/new?mode=voice");
}
