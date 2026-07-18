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
  masteryConcepts: { name: string; level: number }[];
  progressNotes: { authorName: string; noteText: string; createdAt: string }[];
  weekStartIso: string;
  expiresAt: string;
};

export type ExternalScoutPortfolioItem = {
  id: string;
  title: string;
  reflectionText: string | null;
};

export type ExternalScoutPortfolio = {
  title: string;
  description: string | null;
  items: ExternalScoutPortfolioItem[];
  expiresAt: string;
};
