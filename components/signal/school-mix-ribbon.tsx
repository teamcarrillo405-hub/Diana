import { AudioLines, BookOpenCheck, Clock3, ShieldCheck } from "lucide-react";

const DEFAULT_ITEMS = [
  { label: "Energy", value: "steady", icon: AudioLines },
  { label: "Next move", value: "visible", icon: Clock3 },
  { label: "Source", value: "linked", icon: BookOpenCheck },
  { label: "Work", value: "yours", icon: ShieldCheck },
] as const;

export function SchoolMixRibbon({
  items = DEFAULT_ITEMS,
  className = "",
}: {
  items?: typeof DEFAULT_ITEMS;
  className?: string;
}) {
  return (
    <div className={`school-mix-ribbon ${className}`}>
      {items.map(({ label, value, icon: Icon }) => (
        <div key={label} className="school-mix-item">
          <Icon size={16} />
          <span>{label}</span>
          <strong>{value}</strong>
        </div>
      ))}
    </div>
  );
}
