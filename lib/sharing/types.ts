export type ShareType = "parent_summary" | "teacher_snapshot";

export type ShareLink = {
  id: string;
  token: string;
  owner_id: string;
  share_type: ShareType;
  expires_at: string; // ISO timestamp
  revoked_at: string | null;
  created_at: string;
};

export type ParentSummary = {
  completedThisWeek: number;
  upcomingNext7Days: number;
  studyMinutesThisWeek: number;
  weekStartIso: string;
  expiresAt: string;
};

export type TeacherClassRow = {
  name: string;
  aiMode: "red" | "yellow" | "green";
};

export type TeacherSnapshot = {
  classes: TeacherClassRow[];
  readingFont: string;
  extendedReadingTime: boolean; // derived from disability_flags.dyslexia
  extraTimePct: number;
  expiresAt: string;
};
