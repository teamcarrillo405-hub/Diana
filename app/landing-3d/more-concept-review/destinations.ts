import {
  Accessibility, ClipboardCheck, FolderCheck, Goal, HeartPulse, Layers, NotebookPen, Settings2,
  Share2, type LucideIcon,
} from "lucide-react";
import { reviewHref } from "../remaining-concept-review/catalog";

type Destination = { label: string; href: string; Icon: LucideIcon };
type MoreSection = { id: string; title: string; links: readonly Destination[] };

export const MORE_SECTIONS = [
  {
    id: "study", title: "Study tools",
    links: [
      { label: "Notes", href: reviewHref("notes"), Icon: NotebookPen },
      { label: "Quiz", href: reviewHref("study"), Icon: Layers },
    ],
  },
  {
    id: "record", title: "Record",
    links: [
      { label: "Completed work", href: reviewHref("proof"), Icon: FolderCheck },
      { label: "Saved practice", href: reviewHref("study-library"), Icon: ClipboardCheck },
    ],
  },
  {
    id: "wellness", title: "Wellness",
    links: [
      { label: "Check-in history", href: reviewHref("wellness"), Icon: HeartPulse },
      { label: "Goals", href: "/landing-3d/settings-concept-review?section=goals", Icon: Goal },
      { label: "Learning supports", href: "/landing-3d/settings-concept-review?section=connections", Icon: Accessibility },
    ],
  },
  {
    id: "account", title: "Account",
    links: [
      { label: "Settings", href: "/landing-3d/settings-concept-review", Icon: Settings2 },
      { label: "Sharing", href: reviewHref("sharing"), Icon: Share2 },
    ],
  },
] as const satisfies readonly MoreSection[];

export type MoreMode = typeof MORE_SECTIONS[number]["id"];
