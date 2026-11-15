import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { LogoMaskHero } from "./logo-mask-hero";

export const metadata: Metadata = {
  title: "Diana Logo Mask Hero",
  description: "A calm cloud-scroll logo mask prototype for Diana.",
};

export default function DianaLogoMaskHeroPage() {
  if (process.env.NODE_ENV !== "development") notFound();

  return <LogoMaskHero />;
}
