import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { AssignmentWorldGate } from "@/components/canonical-public-landing/landing-10k/assignment-world-gate"

export const metadata: Metadata = {
  title: "Assignment World Preview",
  robots: {
    index: false,
    follow: false,
  },
}

export default function AssignmentWorldPreviewPage() {
  if (process.env.NODE_ENV !== "development") notFound()

  return <AssignmentWorldGate />
}
