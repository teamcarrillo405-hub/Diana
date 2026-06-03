import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { HelpCircle, ShieldCheck, Sparkles } from "lucide-react";
import { subjectTheme, type SubjectThemeId } from "@/lib/ui/subject-themes";
import type { StudyHelperShellContext } from "@/lib/study-helper/modes";
import { HelpOwnershipMeter } from "@/components/help-ownership-meter";
import { buildHelpOwnershipMeter, type HelpOwnershipMeter as HelpOwnershipMeterValue } from "@/lib/student-state/model";

export function SubjectToolShell({
  theme,
  title,
  eyebrow,
  subtitle,
  icon,
  actions,
  studyContext,
  ownershipMeter,
  children,
  className = "",
}: {
  theme: SubjectThemeId;
  title: string;
  eyebrow: string;
  subtitle?: string;
  icon?: LucideIcon;
  actions?: ReactNode;
  studyContext?: StudyHelperShellContext;
  ownershipMeter?: HelpOwnershipMeterValue;
  children: ReactNode;
  className?: string;
}) {
  const subject = subjectTheme(theme);
  const Icon = icon ?? subject.icon;
  const meter = ownershipMeter ?? (studyContext
    ? buildHelpOwnershipMeter({
        aiPolicy: studyContext.aiPolicyLabel.includes("no content")
          ? "red"
          : studyContext.aiPolicyLabel.includes("scaffolding")
            ? "yellow"
            : "green",
        supportIntensity: "guided",
      })
    : null);

  return (
    <section
      className={`space-y-4 rounded-2xl border ${subject.borderClass} bg-surface-raised p-4 shadow-sm sm:p-5 ${className}`}
    >
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className={`flex size-10 shrink-0 items-center justify-center rounded-2xl ${subject.iconClass}`}>
            <Icon size={18} />
          </span>
          <div className="min-w-0">
            <p className={`text-xs font-medium uppercase tracking-wider ${subject.textClass}`}>{eyebrow}</p>
            <h2 className="mt-0.5 text-base font-semibold leading-tight">{title}</h2>
            {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
          </div>
        </div>
        {actions && <div className="shrink-0">{actions}</div>}
      </div>
      {studyContext && (
        <div className="grid gap-2 rounded-2xl border border-border bg-background/70 p-3 text-xs sm:grid-cols-3">
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 font-medium text-muted">
              <Sparkles size={12} />
              Mode
            </p>
            <p className="mt-1 font-semibold">{studyContext.modeLabel}</p>
          </div>
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 font-medium text-muted">
              <ShieldCheck size={12} />
              Policy
            </p>
            <p className="mt-1">{studyContext.aiPolicyLabel}</p>
          </div>
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 font-medium text-muted">
              <HelpCircle size={12} />
              Stuck path
            </p>
            <p className="mt-1">{studyContext.escapeValve}</p>
          </div>
          <div className="min-w-0 sm:col-span-3">
            <p className="font-medium">{studyContext.nextStep}</p>
            <p className="mt-1 text-muted">{studyContext.trustNote}</p>
          </div>
        </div>
      )}
      {meter && <HelpOwnershipMeter meter={meter} compact />}
      <div className={`rounded-2xl border ${subject.borderClass} ${subject.surfaceClass} p-3 sm:p-4`}>
        {children}
      </div>
    </section>
  );
}
