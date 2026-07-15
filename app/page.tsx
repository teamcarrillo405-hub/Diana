import type { Metadata } from "next";
import { QuietCommandLanding } from "@/components/landing/quiet-command-landing";

export const metadata: Metadata = {
  title: "Diana | Your next five minutes, made obvious",
  description:
    "A private ADHD and dyslexia-aware learning companion that turns schoolwork into one clear next move.",
  openGraph: {
    title: "Diana | Your next five minutes, made obvious",
    description:
      "A private learning companion that turns the pile into one clear, student-owned next move.",
    type: "website",
  },
};

export default function LandingPage() {
  return <QuietCommandLanding />;
}
