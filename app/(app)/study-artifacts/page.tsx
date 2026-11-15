import { redirect } from "next/navigation";

export default async function StudyArtifactsPage({ searchParams }: { searchParams: Promise<{ source?: string; notice?: string }> }) {
  const params = await searchParams;
  const query = new URLSearchParams();
  if (params.source) query.set("source", params.source);
  else query.set("view", "saved");
  if (params.notice) query.set("notice", params.notice);
  redirect(`/study?${query}`);
}
