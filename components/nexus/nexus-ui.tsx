import type {
  ButtonHTMLAttributes,
  HTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  TextareaHTMLAttributes,
} from "react";

type NexusTone = "cyan" | "pink" | "gold" | "blue" | "purple";
type NexusPanelVariant = "default" | "dense" | "hero";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function NexusPageShell({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cx("nexus-page-shell", className)} {...props}>
      {children}
    </div>
  );
}

export function NexusPanel({
  children,
  className,
  variant = "default",
  tone = "cyan",
  ...props
}: HTMLAttributes<HTMLElement> & {
  variant?: NexusPanelVariant;
  tone?: NexusTone;
}) {
  return (
    <section className={cx("nexus-panel", `nexus-tone-${tone}`, `nexus-panel-${variant}`, className)} {...props}>
      {children}
    </section>
  );
}

export function NexusPageHeader({
  eyebrow,
  title,
  description,
  actions,
  visual,
  tone = "cyan",
  className,
}: {
  eyebrow: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  visual?: ReactNode;
  tone?: NexusTone;
  className?: string;
}) {
  return (
    <NexusPanel className={cx("nexus-page-hero", className)} variant="hero" tone={tone}>
      <div className="nexus-page-hero-copy">
        <NexusKicker tone={tone}>{eyebrow}</NexusKicker>
        <h1>{title}</h1>
        {description ? <p>{description}</p> : null}
        {actions ? <div className="nexus-page-hero-actions">{actions}</div> : null}
      </div>
      {visual ? <div className="nexus-page-hero-visual">{visual}</div> : null}
    </NexusPanel>
  );
}

export function NexusGrid({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cx("nexus-grid", className)} {...props}>
      {children}
    </div>
  );
}

export function NexusList({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cx("nexus-list", className)} {...props}>
      {children}
    </div>
  );
}

export function NexusEmptyState({
  eyebrow,
  title,
  children,
  action,
  className,
}: HTMLAttributes<HTMLDivElement> & {
  eyebrow?: ReactNode;
  title: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className={cx("nexus-empty-state", className)}>
      {eyebrow ? <NexusKicker tone="gold">{eyebrow}</NexusKicker> : null}
      <h2>{title}</h2>
      {children ? <div className="nexus-empty-state-copy">{children}</div> : null}
      {action ? <div className="nexus-empty-state-action">{action}</div> : null}
    </div>
  );
}

export function NexusKicker({
  children,
  className,
  tone = "cyan",
  ...props
}: HTMLAttributes<HTMLParagraphElement> & { tone?: NexusTone }) {
  return (
    <p className={cx("nexus-kicker", `nexus-tone-${tone}`, className)} {...props}>
      {children}
    </p>
  );
}

export function NexusButton({
  children,
  className,
  variant = "primary",
  tone = "cyan",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
  tone?: NexusTone;
}) {
  return (
    <button className={cx("nexus-button", `nexus-button-${variant}`, `nexus-tone-${tone}`, className)} {...props}>
      {children}
    </button>
  );
}

export function NexusInput({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cx("nexus-input", className)} {...props} />;
}

export function NexusTextarea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cx("nexus-input", className)} {...props} />;
}

export function NexusMetric({
  label,
  value,
  detail,
  tone = "cyan",
  className,
}: {
  label: string;
  value: ReactNode;
  detail?: ReactNode;
  tone?: NexusTone;
  className?: string;
}) {
  return (
    <div className={cx("nexus-metric", `nexus-tone-${tone}`, className)}>
      <span>{label}</span>
      <strong>{value}</strong>
      {detail ? <small>{detail}</small> : null}
    </div>
  );
}

export function NexusStatusMeter({
  label,
  value,
  tone = "cyan",
}: {
  label: string;
  value: number;
  tone?: NexusTone;
}) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className={cx("nexus-status-meter", `nexus-tone-${tone}`)}>
      <div className="nexus-status-meter-top">
        <span>{label}</span>
        <strong>{clamped}%</strong>
      </div>
      <div className="nexus-status-meter-track" aria-hidden="true">
        <span style={{ width: `${clamped}%` }} />
      </div>
    </div>
  );
}

export function NexusArcadeScene({ className }: { className?: string }) {
  return (
    <div className={cx("nexus-arcade-scene", className)} aria-hidden="true">
      <div className="nexus-core-glow" />
      <div className="nexus-core-ring nexus-core-ring-one" />
      <div className="nexus-core-ring nexus-core-ring-two" />
      <div className="nexus-core-ring nexus-core-ring-three" />
      <div className="nexus-cube-scene">
        <div className="nexus-cube">
          <span className="nexus-cube-face nexus-cube-front" />
          <span className="nexus-cube-face nexus-cube-back" />
          <span className="nexus-cube-face nexus-cube-right" />
          <span className="nexus-cube-face nexus-cube-left" />
          <span className="nexus-cube-face nexus-cube-top" />
          <span className="nexus-cube-face nexus-cube-bottom" />
        </div>
      </div>
      <span className="nexus-core-chip nexus-core-chip-input">input</span>
      <span className="nexus-core-chip nexus-core-chip-remix">remix</span>
      <span className="nexus-core-chip nexus-core-chip-proof">proof</span>
      <span className="nexus-core-chip nexus-core-chip-output">next</span>
    </div>
  );
}
