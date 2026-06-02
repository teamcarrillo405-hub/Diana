import type { LucideIcon } from "lucide-react";
import {
  Atom,
  BookOpen,
  Brain,
  Calculator,
  FileText,
  GraduationCap,
  HeartPulse,
  Landmark,
  PenLine,
  Sparkles,
} from "lucide-react";

export type SubjectThemeId =
  | "focus"
  | "math"
  | "writing"
  | "reading"
  | "science"
  | "history"
  | "wellness"
  | "ap"
  | "notes"
  | "study";

export interface SubjectTheme {
  id: SubjectThemeId;
  label: string;
  icon: LucideIcon;
  accentVar: string;
  surfaceClass: string;
  borderClass: string;
  textClass: string;
  iconClass: string;
}

export const SUBJECT_THEMES: Record<SubjectThemeId, SubjectTheme> = {
  focus: {
    id: "focus",
    label: "Focus",
    icon: Sparkles,
    accentVar: "--brand",
    surfaceClass: "bg-brand/10",
    borderClass: "border-brand/25",
    textClass: "text-brand-strong dark:text-brand",
    iconClass: "bg-brand/15 text-brand-strong dark:text-brand",
  },
  math: {
    id: "math",
    label: "Math",
    icon: Calculator,
    accentVar: "--subject-math",
    surfaceClass: "bg-subject-math/10",
    borderClass: "border-subject-math/25",
    textClass: "text-sky-700 dark:text-sky-300",
    iconClass: "bg-subject-math/15 text-sky-700 dark:text-sky-300",
  },
  writing: {
    id: "writing",
    label: "Writing",
    icon: PenLine,
    accentVar: "--subject-writing",
    surfaceClass: "bg-subject-writing/10",
    borderClass: "border-subject-writing/25",
    textClass: "text-violet-700 dark:text-violet-300",
    iconClass: "bg-subject-writing/15 text-violet-700 dark:text-violet-300",
  },
  reading: {
    id: "reading",
    label: "Reading",
    icon: BookOpen,
    accentVar: "--subject-reading",
    surfaceClass: "bg-subject-reading/10",
    borderClass: "border-subject-reading/25",
    textClass: "text-emerald-700 dark:text-emerald-300",
    iconClass: "bg-subject-reading/15 text-emerald-700 dark:text-emerald-300",
  },
  science: {
    id: "science",
    label: "Science",
    icon: Atom,
    accentVar: "--subject-science",
    surfaceClass: "bg-subject-science/10",
    borderClass: "border-subject-science/25",
    textClass: "text-teal-700 dark:text-teal-300",
    iconClass: "bg-subject-science/15 text-teal-700 dark:text-teal-300",
  },
  history: {
    id: "history",
    label: "History",
    icon: Landmark,
    accentVar: "--subject-history",
    surfaceClass: "bg-subject-history/10",
    borderClass: "border-subject-history/25",
    textClass: "text-amber-700 dark:text-amber-300",
    iconClass: "bg-subject-history/15 text-amber-700 dark:text-amber-300",
  },
  wellness: {
    id: "wellness",
    label: "Wellness",
    icon: HeartPulse,
    accentVar: "--subject-wellness",
    surfaceClass: "bg-subject-wellness/10",
    borderClass: "border-subject-wellness/25",
    textClass: "text-pink-700 dark:text-pink-300",
    iconClass: "bg-subject-wellness/15 text-pink-700 dark:text-pink-300",
  },
  ap: {
    id: "ap",
    label: "AP",
    icon: GraduationCap,
    accentVar: "--subject-ap",
    surfaceClass: "bg-subject-ap/10",
    borderClass: "border-subject-ap/25",
    textClass: "text-indigo-700 dark:text-indigo-300",
    iconClass: "bg-subject-ap/15 text-indigo-700 dark:text-indigo-300",
  },
  notes: {
    id: "notes",
    label: "Notes",
    icon: FileText,
    accentVar: "--subject-writing",
    surfaceClass: "bg-subject-writing/10",
    borderClass: "border-subject-writing/25",
    textClass: "text-violet-700 dark:text-violet-300",
    iconClass: "bg-subject-writing/15 text-violet-700 dark:text-violet-300",
  },
  study: {
    id: "study",
    label: "Study",
    icon: Brain,
    accentVar: "--subject-ap",
    surfaceClass: "bg-subject-ap/10",
    borderClass: "border-subject-ap/25",
    textClass: "text-indigo-700 dark:text-indigo-300",
    iconClass: "bg-subject-ap/15 text-indigo-700 dark:text-indigo-300",
  },
};

export function subjectTheme(id: SubjectThemeId): SubjectTheme {
  return SUBJECT_THEMES[id];
}
