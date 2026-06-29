import { AudioLines, BookOpenCheck, Check, FileText, Images, LockKeyhole, ShieldCheck } from "lucide-react";
import type { CSSProperties } from "react";
import { SpotlightSurface } from "./spotlight-surface";

export function ProofReceiptVisual({
  receipts,
  artifacts,
  portfolioItems,
}: {
  receipts: number;
  artifacts: number;
  portfolioItems: number;
}) {
  const rows = [
    { label: "Student ideas", body: "Voice, notes, rough starts", icon: AudioLines },
    { label: "Diana help", body: "Structure and questions", icon: FileText },
    { label: "Source checks", body: "Rubrics and anchors", icon: BookOpenCheck },
    { label: "Student choice", body: "Final wording stays owned", icon: LockKeyhole },
  ];

  return (
    <SpotlightSurface className="proof-receipt-visual">
      <div className="proof-receipt-top">
        <span>
          <ShieldCheck size={17} />
          Authorship receipt
        </span>
        <strong>Diana</strong>
      </div>

      <div className="proof-receipt-paper">
        {rows.map(({ label, body, icon: Icon }) => (
          <div key={label} className="proof-receipt-row">
            <Icon size={17} />
            <div>
              <p>{label}</p>
              <small>{body}</small>
            </div>
            <Check size={15} />
          </div>
        ))}
      </div>

      <div className="proof-receipt-counts" aria-label="Proof folder counts">
        <span>
          <strong>{receipts}</strong>
          Receipts
        </span>
        <span>
          <strong>{artifacts}</strong>
          Sources
        </span>
        <span>
          <strong>{portfolioItems}</strong>
          Samples
        </span>
      </div>
    </SpotlightSurface>
  );
}

export function ProofConstellation({ points }: { points: number }) {
  const visible = Math.max(4, Math.min(11, points + 4));

  return (
    <div className="proof-constellation" aria-label={`${points} saved proof points`}>
      {Array.from({ length: visible }).map((_, index) => (
        <span
          key={index}
          className={index < points ? "is-saved" : ""}
          style={{ "--proof-node": index } as CSSProperties}
        />
      ))}
      <Images size={19} />
    </div>
  );
}
