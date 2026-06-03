import { Gauge, LockKeyhole, MessageCircle, ShieldCheck, Smartphone, Sparkles } from "lucide-react";
import {
  scoreTeenNativeUx,
  TEEN_NATIVE_UX_SECTIONS,
  type TeenNativeUxEvidence,
  type TeenNativeUxSectionId,
} from "@/lib/teen-testing/ux-scorecard";

const DEMO_EVIDENCE: TeenNativeUxEvidence = {
  landingNextFiveMinutes: true,
  dashboardRightNowCard: true,
  assignmentNextStepEntry: true,
  priorityMobileNav: true,
  responsiveActionRows: true,
  responsiveQaClean: true,
  teenVoicePlan: true,
  noVisiblePressureCopy: true,
  studentControlLanguage: true,
  genericChatComparisonTask: true,
  timeToFirstActionMetric: true,
  oneMoveSupport: true,
  subjectNativeHelpers: true,
  studyArtifactsLoop: true,
  sourceAnchoredStudyOutput: true,
  ownershipMeter: true,
  authorshipProof: true,
  finalWorkProtection: true,
  proofPanelVisible: true,
  liveTeenValidationPassed: false,
};

const iconFor: Record<TeenNativeUxSectionId, typeof Sparkles> = {
  first_screen_clarity: Sparkles,
  mobile_thumb_flow: Smartphone,
  unstuck_speed: Gauge,
  teen_voice_control: MessageCircle,
  embedded_study_loop: LockKeyhole,
  trust_without_takeover: ShieldCheck,
};

export function TeenNativeUxEvidencePanel() {
  const scorecard = scoreTeenNativeUx(DEMO_EVIDENCE, "proof-preview");

  return (
    <section className="space-y-4 rounded-2xl border border-border bg-surface-raised p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-brand-strong dark:text-brand">
            Teen-native UX
          </p>
          <h2 className="mt-1 text-base font-semibold">Beat Quizlet/Gemini on the stuck moment</h2>
          <p className="mt-1 max-w-3xl text-sm text-muted">
            Repo proof is complete when every section shows a clear next move, mobile-native flow, student-owned language, and visible help boundaries.
          </p>
        </div>
        <div className="rounded-2xl border border-brand/20 bg-brand/10 px-4 py-3 text-sm">
          <p className="text-xs font-medium uppercase tracking-wider text-brand-strong dark:text-brand">
            Repo score
          </p>
          <p className="mt-1 text-2xl font-bold text-brand-strong dark:text-brand">{scorecard.repoScore}/10</p>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {scorecard.sections.map((section) => {
          const Icon = iconFor[section.id];
          const source = TEEN_NATIVE_UX_SECTIONS.find((item) => item.id === section.id);
          return (
            <article key={section.id} className="min-w-0 rounded-xl border border-border bg-background p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand">
                    <Icon size={16} />
                  </span>
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-semibold">{section.label}</h3>
                    <p className="text-xs text-muted">Repo proof: {section.score}/10</p>
                  </div>
                </div>
                <span className="shrink-0 rounded-full border border-border px-2 py-0.5 text-xs text-muted">
                  {section.repoComplete ? "Complete" : "Needs proof"}
                </span>
              </div>
              <p className="mt-3 text-sm text-muted">{section.dianaTarget}</p>
              {source && (
                <p className="mt-2 text-xs text-muted">
                  Live gate: {source.liveCriteria.join(" | ")}
                </p>
              )}
            </article>
          );
        })}
      </div>

      <div className="rounded-xl border border-amber-400/30 bg-amber-300/10 p-3 text-sm text-muted">
        Market 10/10 remains gated until live high-school testing passes: 4 of 5 students prefer Diana on stuck tasks, 4 of 5 find proof of help, and 0 confuse support with final work.
      </div>
    </section>
  );
}
