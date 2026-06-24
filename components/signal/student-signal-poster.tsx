import { BookOpenCheck, Clock3, ShieldCheck, Sparkles } from "lucide-react";

export function StudentSignalPoster({
  name = "Diana QA Student",
  title = "Today, I start with one move.",
  className = "",
}: {
  name?: string;
  title?: string;
  className?: string;
}) {
  return (
    <aside className={`student-signal-poster ${className}`} data-screenshot-moment="student-signal-poster">
      <div className="poster-ring" aria-hidden="true" />
      <div className="poster-header">
        <span><Sparkles size={15} /> Diana Signal</span>
        <span>private</span>
      </div>
      <p className="poster-owner">{name}</p>
      <h2>{title}</h2>
      <div className="poster-metrics">
        <PosterMetric icon={Clock3} label="First move" value="9 min" />
        <PosterMetric icon={BookOpenCheck} label="Source" value="linked" />
        <PosterMetric icon={ShieldCheck} label="Control" value="yours" />
      </div>
      <p className="poster-footer">
        Diana shows the step, the source, and the boundary. The work stays yours.
      </p>
    </aside>
  );
}

function PosterMetric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Clock3;
  label: string;
  value: string;
}) {
  return (
    <div>
      <Icon size={15} />
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
