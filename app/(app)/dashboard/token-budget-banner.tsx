// AI-SAFETY-01: Calm reminder when a student is near or at their daily AI quota.
// Amber only — never red. No exclamation marks. No shame language.
import type { ProfilePrefs } from "@/lib/profile";

interface TokenBudgetBannerProps {
  profile: Pick<ProfilePrefs, "daily_token_budget" | "tokens_used_today">;
}

export function TokenBudgetBanner({ profile }: TokenBudgetBannerProps) {
  const budget = profile.daily_token_budget;
  const used = profile.tokens_used_today;
  if (budget <= 0) return null;
  const ratio = used / budget;
  if (ratio < 0.9) return null;

  const atLimit = ratio >= 1;
  const message = atLimit
    ? "You've used your AI quota for today — resets at midnight."
    : "You're close to your AI quota for today.";

  return (
    <div
      role="status"
      className="rounded-xl border border-amber-500/40 bg-amber-50 px-4 py-3 text-sm text-amber-900"
    >
      <p className="font-medium">{message}</p>
      <p className="mt-1 text-xs text-amber-900/80">
        {atLimit
          ? "You can still use Diana — note-taking, flashcards, and the dashboard work as usual."
          : `Used ${used.toLocaleString()} of ${budget.toLocaleString()} tokens today.`}
      </p>
    </div>
  );
}
