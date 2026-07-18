import type { Metadata } from "next";

import {
  ResponsiveProofGallery,
  type ResponsiveProofScreen,
} from "@/components/screen-design/responsive-proof-gallery";
import { SCREEN_DESIGN_SCREENS } from "@/lib/screendesign/screens";

export const metadata: Metadata = {
  title: "Responsive design proof | Diana",
  description: "Side-by-side mobile and desktop proof for Diana's ScreenDesign implementation.",
  robots: { index: false, follow: false },
};

const titleCase = (id: string) =>
  id
    .split("-")
    .map((word) => `${word.slice(0, 1).toUpperCase()}${word.slice(1)}`)
    .join(" ");

const screens: readonly ResponsiveProofScreen[] = SCREEN_DESIGN_SCREENS.map(
  (screen) => ({ id: screen.id, label: titleCase(screen.id) }),
);

export default function ResponsiveDesignProofPage() {
  return <ResponsiveProofGallery screens={screens} />;
}
