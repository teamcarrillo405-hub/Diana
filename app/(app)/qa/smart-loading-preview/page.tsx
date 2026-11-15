import { notFound } from "next/navigation";

import { SmartLoading } from "@/components/screen-design/smart-loading";

export default function SmartLoadingPreviewPage() {
  if (process.env.QA_CREATE_USER !== "true") notFound();

  return <SmartLoading label="Getting your next view ready" />;
}
