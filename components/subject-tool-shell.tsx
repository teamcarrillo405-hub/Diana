import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { subjectTheme, type SubjectThemeId } from "@/lib/ui/subject-themes";

export function SubjectToolShell({
  theme,
  title,
  eyebrow,
  subtitle,
  icon,
  actions,
  children,
  className = "",
}: {
  theme: SubjectThemeId;
  title: string;
  eyebrow: string;
  subtitle?: string;
  icon?: LucideIcon;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const subject = subjectTheme(theme);
  const Icon = icon ?? subject.icon;

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
      <div className={`rounded-2xl border ${subject.borderClass} ${subject.surfaceClass} p-3 sm:p-4`}>
        {children}
      </div>
    </section>
  );
}
