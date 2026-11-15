import {
  Accessibility, ClipboardCheck, FolderCheck, Goal, HeartPulse, Layers, NotebookPen, Settings2,
  Share2, type LucideIcon,
} from "lucide-react";


type Destination = { label: string; href: string; Icon: LucideIcon };
type MoreSection = { id: string; title: string; links: readonly Destination[] };

export const MORE_SECTIONS = [
  {
    id: "study", title: "Study tools",
    links: [
      { label: "Notes", href: "/notes", Icon: NotebookPen },
      { label: "Quiz", href: "/study", Icon: Layers },
    ],
  },
  {
    id: "record", title: "Record",
    links: [
      { label: "Completed work", href: "/proof", Icon: FolderCheck },
      { label: "Saved practice", href: "/study?view=saved", Icon: ClipboardCheck },
    ],
  },
  {
    id: "wellness", title: "Wellness",
    links: [
      { label: "Check-in history", href: "/wellness", Icon: HeartPulse },
      { label: "Goals", href: "/settings?section=goals", Icon: Goal },
      { label: "Learning supports", href: "/settings?section=learning", Icon: Accessibility },
    ],
  },
  {
    id: "account", title: "Account",
    links: [
      { label: "Settings", href: "/settings", Icon: Settings2 },
      { label: "Sharing", href: "/sharing", Icon: Share2 },
    ],
  },
] as const satisfies readonly MoreSection[];

export type MoreMode = typeof MORE_SECTIONS[number]["id"];
